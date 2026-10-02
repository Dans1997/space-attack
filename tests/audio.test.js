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

test('a user gesture resumes the suspended startup context without restarting its music source', async () => {
  const sources = [];
  let resumeCalls = 0;
  class FakeContext {
    constructor() { this.destination = {}; this.state = 'suspended'; }
    resume() {
      resumeCalls += 1;
      if (resumeCalls >= 3) this.state = 'running';
      return Promise.resolve();
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 8 }); }
    createBufferSource() {
      const source = { connect() {}, start() { this.started = true; }, stop() {}, disconnect() {} };
      sources.push(source);
      return source;
    }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  }
  const previousContext = globalThis.AudioContext;
  const previousFetch = globalThis.fetch;
  const previousAudio = globalThis.Audio;
  globalThis.AudioContext = FakeContext;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  delete globalThis.Audio;
  try {
    const audio = createAudio(CONFIG);
    await audio.unlock(); // Root's prepare-time unlock runs before a user gesture.
    assert.equal(sources.length, 1);
    assert.equal(audio.isMuted(), false);
    assert.equal(sources[0].started, true);
    assert.equal(globalThis.AudioContext && resumeCalls, 2);
    await audio.unlock(); // The first real gesture retries context.resume().
    assert.equal(resumeCalls, 3);
    assert.equal(sources.length, 1, 'resume must not restart the existing track');
    assert.equal(audio.isMuted(), false);
    audio.destroy();
  } finally {
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    globalThis.fetch = previousFetch;
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
  }
});

test('pending prepare resume can be completed by a later gesture and starts one source', async () => {
  const sources = [];
  const pendingResumes = [];
  let context;
  class FakeContext {
    constructor() { this.destination = {}; this.state = 'suspended'; context = this; }
    resume() {
      if (this.state === 'running') return Promise.resolve();
      return new Promise((resolve) => pendingResumes.push(resolve));
    }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 9 }); }
    createBufferSource() {
      const source = { connect() {}, start() { this.started = true; }, stop() {}, disconnect() {} };
      sources.push(source);
      return source;
    }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  }
  const previousContext = globalThis.AudioContext;
  const previousFetch = globalThis.fetch;
  const previousAudio = globalThis.Audio;
  globalThis.AudioContext = FakeContext;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  delete globalThis.Audio;
  try {
    const audio = createAudio(CONFIG);
    const prepare = audio.unlock();
    assert.equal(pendingResumes.length, 1);
    const gesture = audio.unlock();
    assert.equal(pendingResumes.length, 2);
    context.state = 'running';
    for (const resolve of pendingResumes.splice(0)) resolve();
    await Promise.all([prepare, gesture]);
    assert.equal(sources.length, 1);
    assert.equal(sources[0].started, true);
    audio.destroy();
  } finally {
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    globalThis.fetch = previousFetch;
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
  }
});

test('screen changes while context resume is pending cannot revive stale title music', async () => {
  const pendingResumes = [];
  let context;
  let sourceCount = 0;
  class FakeContext {
    constructor() { this.destination = {}; this.state = 'suspended'; context = this; }
    resume() { return new Promise((resolve) => pendingResumes.push(resolve)); }
    close() { this.state = 'closed'; return Promise.resolve(); }
    decodeAudioData() { return Promise.resolve({ duration: 9 }); }
    createBufferSource() { sourceCount += 1; return { connect() {}, start() {}, stop() {}, disconnect() {} }; }
    createGain() { return { gain: { value: 1 }, connect() {}, disconnect() {} }; }
  }
  const previousContext = globalThis.AudioContext;
  const previousFetch = globalThis.fetch;
  const previousAudio = globalThis.Audio;
  globalThis.AudioContext = FakeContext;
  globalThis.fetch = async () => ({ ok: true, arrayBuffer: async () => new ArrayBuffer(4) });
  delete globalThis.Audio;
  try {
    const audio = createAudio(CONFIG);
    const prepare = audio.unlock();
    audio.setScreen('paused');
    context.state = 'running';
    for (const resolve of pendingResumes.splice(0)) resolve();
    await prepare;
    assert.equal(sourceCount, 0);
    audio.destroy();
  } finally {
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    globalThis.fetch = previousFetch;
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
  }
});

test('autoplay blocking remains retryable and does not report permanent audio failure', async () => {
  let attempts = 0;
  class GestureAudio {
    constructor() { this.paused = true; }
    play() {
      attempts += 1;
      if (attempts === 1) return Promise.reject(Object.assign(new Error('gesture required'), { name: 'NotAllowedError' }));
      this.paused = false;
      return Promise.resolve();
    }
    pause() { this.paused = true; }
  }
  const previousAudio = globalThis.Audio;
  const previousContext = globalThis.AudioContext;
  const previousWebkit = globalThis.webkitAudioContext;
  const messages = [];
  globalThis.Audio = GestureAudio;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  try {
    const audio = createAudio(CONFIG, (message) => messages.push(message));
    await audio.unlock();
    assert.deepEqual(messages, []);
    await audio.unlock();
    assert.equal(attempts, 2);
    assert.deepEqual(messages, []);
    audio.destroy();
  } finally {
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    if (previousWebkit === undefined) delete globalThis.webkitAudioContext;
    else globalThis.webkitAudioContext = previousWebkit;
  }
});

test('shot events play their configured assets at the effects volume and mute blocks them', async () => {
  const instances = [];
  class FakeAudio {
    constructor(src) { this.src = src; this.paused = true; instances.push(this); }
    play() { this.paused = false; return Promise.resolve(); }
    pause() { this.paused = true; }
    addEventListener() {}
  }
  const previousAudio = globalThis.Audio;
  const previousContext = globalThis.AudioContext;
  const previousWebkit = globalThis.webkitAudioContext;
  globalThis.Audio = FakeAudio;
  delete globalThis.AudioContext;
  delete globalThis.webkitAudioContext;
  try {
    const audio = createAudio(CONFIG);
    await audio.unlock();
    audio.handleEvents(['playerFired', 'enemyFired']);
    const shots = instances.filter((instance) => instance.src === CONFIG.assets.sounds.playerShot.path || instance.src === CONFIG.assets.sounds.enemyShot.path);
    assert.deepEqual(shots.map((instance) => instance.src), [CONFIG.assets.sounds.playerShot.path, CONFIG.assets.sounds.enemyShot.path]);
    assert.ok(shots.every((instance) => instance.volume === CONFIG.audio.masterVolume * CONFIG.audio.sfxVolume));
    audio.setMuted(true);
    const countAfterMute = instances.length;
    audio.handleEvents(['playerFired', 'enemyFired']);
    assert.equal(instances.length, countAfterMute);
    audio.destroy();
  } finally {
    if (previousAudio === undefined) delete globalThis.Audio;
    else globalThis.Audio = previousAudio;
    if (previousContext === undefined) delete globalThis.AudioContext;
    else globalThis.AudioContext = previousContext;
    if (previousWebkit === undefined) delete globalThis.webkitAudioContext;
    else globalThis.webkitAudioContext = previousWebkit;
  }
});
