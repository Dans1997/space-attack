import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createAudio } from '../src/audio.js';

test('audio stays silent before gesture and chooses tracks by screen', async () => {
  const created = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.paused = true; this.volume = 1; this.currentTime = 0; created.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {}
  }
  const previous = globalThis.Audio;
  globalThis.Audio = FakeAudio;
  try {
    const audio = createAudio(CONFIG);
    audio.setScreen('playing');
    assert.equal(created.length, 0);
    await audio.unlock();
    assert.equal(created[0].src, CONFIG.assets.music.level1.path);
    audio.setScreen('paused');
    assert.equal(created[0].paused, true);
    audio.setScreen('title');
    await Promise.resolve();
    assert.equal(created.at(-1).src, CONFIG.assets.music.title.path);
    audio.setMuted(true);
    assert.equal(audio.isMuted(), true);
    audio.destroy();
  } finally {
    if (previous === undefined) delete globalThis.Audio;
    else globalThis.Audio = previous;
  }
});

test('audio reports rejected playback once without leaking a rejected promise', async () => {
  class FailingAudio {
    constructor(src) { this.src = src; this.paused = true; }
    play() { this.paused = false; return Promise.reject(new Error('blocked')); }
    pause() { this.paused = true; }
  }
  const previous = globalThis.Audio;
  globalThis.Audio = FailingAudio;
  const messages = [];
  try {
    const audio = createAudio(CONFIG, (message) => messages.push(message));
    await audio.unlock();
    await new Promise((resolve) => setImmediate(resolve));
    assert.deepEqual(messages, [CONFIG.ui.audioUnavailable]);
    audio.handleEvents(['enemyDestroyed']);
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(messages.length, 1);
    audio.destroy();
  } finally {
    if (previous === undefined) delete globalThis.Audio;
    else globalThis.Audio = previous;
  }
});

test('stale title track rejection after switching to gameplay keeps the gameplay track', async () => {
  let rejectTitle;
  const instances = [];
  class SwitchingAudio {
    constructor(src) { this.src = src; this.paused = true; instances.push(this); }
    play() {
      this.paused = false;
      if (this.src === CONFIG.assets.music.title.path) {
        return new Promise((_resolve, reject) => { rejectTitle = reject; });
      }
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  const previous = globalThis.Audio;
  globalThis.Audio = SwitchingAudio;
  const messages = [];
  try {
    const audio = createAudio(CONFIG, (message) => messages.push(message));
    audio.setScreen('title');
    void audio.unlock();
    assert.equal(instances.length, 1);
    audio.setScreen('playing');
    await Promise.resolve();
    const gameplayTrack = instances.at(-1);
    assert.equal(gameplayTrack.src, CONFIG.assets.music.level1.path);
    rejectTitle(Object.assign(new Error('interrupted'), { name: 'AbortError' }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(gameplayTrack.paused, false);
    assert.deepEqual(messages, []);
    audio.destroy();
  } finally {
    if (previous === undefined) delete globalThis.Audio;
    else globalThis.Audio = previous;
  }
});

test('Web Audio loops the decoded title buffer and volume changes update its gain', async () => {
  const sources = [];
  const gains = [];
  const contexts = [];
  class FakeSource {
    connect() {}
    start() { this.started = true; }
    stop() { this.stopped = true; }
    disconnect() {}
  }
  class FakeContext {
    constructor() { this.destination = {}; this.state = 'running'; contexts.push(this); }
    resume() { return Promise.resolve(); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 11.3 }); }
    createBufferSource() { const source = new FakeSource(); sources.push(source); return source; }
    createGain() { const gain = { gain: { value: 1 }, connect() {}, disconnect() {} }; gains.push(gain); return gain; }
  }
  const previousContext = globalThis.AudioContext;
  const previousFetch = globalThis.fetch;
  const previousAudio = globalThis.Audio;
  globalThis.AudioContext = FakeContext;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  delete globalThis.Audio;
  try {
    const audio = createAudio(CONFIG);
    await audio.unlock();
    assert.equal(sources.length, 1);
    assert.equal(sources[0].started, true);
    assert.equal(sources[0].loop, true);
    assert.equal(sources[0].loopStart, 0);
    assert.equal(sources[0].loopEnd, 11.3);
    await audio.unlock();
    assert.equal(sources.length, 1, 'repeated gesture unlock must not restart the music');
    const changedConfig = structuredClone(CONFIG);
    changedConfig.audio.musicVolume = 0.5;
    audio.updateConfig(changedConfig);
    assert.equal(gains[0].gain.value, changedConfig.audio.masterVolume * changedConfig.audio.musicVolume);
    audio.setScreen('paused');
    assert.equal(sources[0].stopped, true);
    audio.destroy();
    assert.equal(contexts[0].state, 'closed');
  } finally {
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    globalThis.fetch = previousFetch;
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
  }
});
