export function createAudio(config, onStatus = () => {}) {
  let currentConfig = config;
  let screen = 'title';
  let muted = Boolean(config.audio.startMuted);
  let unlocked = false;
  let destroyed = false;
  let unavailableReported = false;
  let track = null;
  let trackGeneration = 0;
  let audioContext = null;
  const decodedTracks = new Map();
  const effects = [];

  function reportUnavailable() {
    if (unavailableReported) return;
    unavailableReported = true;
    onStatus(currentConfig.ui.audioUnavailable);
  }

  function volume(kind) {
    return Math.max(0, Math.min(1, currentConfig.audio.masterVolume * currentConfig.audio[`${kind}Volume`]));
  }

  function trackPath() {
    return track?.path ?? null;
  }

  function syncVolumes() {
    if (track?.gain) track.gain.gain.value = muted ? 0 : volume('music');
    if (track?.audio) track.audio.volume = muted ? 0 : volume('music');
    for (const effect of effects) effect.volume = muted ? 0 : volume('sfx');
  }

  function stopTrack() {
    const priorTrack = track;
    track = null;
    trackGeneration += 1;
    if (!priorTrack) return;
    if (priorTrack.source) {
      try { priorTrack.source.stop(); } catch { /* A source may have stopped while a screen changed. */ }
      priorTrack.source.disconnect?.();
      priorTrack.gain?.disconnect?.();
    }
    if (priorTrack.audio) {
      priorTrack.audio.pause();
      try { priorTrack.audio.currentTime = 0; } catch { /* Some media implementations reject seeking before metadata. */ }
    }
  }

  function stopEffects() {
    for (const effect of effects) effect.pause();
    effects.length = 0;
  }

  function getAudioContext() {
    if (audioContext) return audioContext;
    const Context = globalThis.AudioContext ?? globalThis.webkitAudioContext;
    if (!Context || !globalThis.fetch) return null;
    try {
      audioContext = new Context();
      return audioContext;
    } catch {
      return null;
    }
  }

  function loadTrack(path, context) {
    if (decodedTracks.has(path)) return decodedTracks.get(path);
    const decoded = globalThis.fetch(path).then((response) => {
      if (!response.ok) throw new Error(`Could not load music: ${path}`);
      return response.arrayBuffer();
    }).then((data) => context.decodeAudioData(data));
    decodedTracks.set(path, decoded);
    decoded.catch(() => decodedTracks.delete(path));
    return decoded;
  }

  async function startWebAudio(candidate, generation, definition, context) {
    const resume = context.resume();
    await resume;
    const buffer = await loadTrack(definition.path, context);
    if (track !== candidate || trackGeneration !== generation || destroyed || muted) return;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = definition.loop !== false;
    if (source.loop) {
      const loopStart = Number(definition.loopStartSec);
      const loopEnd = Number(definition.loopEndSec);
      source.loopStart = Number.isFinite(loopStart) && loopStart >= 0 ? loopStart : 0;
      source.loopEnd = Number.isFinite(loopEnd) && loopEnd > source.loopStart && loopEnd <= buffer.duration
        ? loopEnd
        : buffer.duration;
    }
    gain.gain.value = muted ? 0 : volume('music');
    source.connect(gain);
    gain.connect(context.destination);
    candidate.source = source;
    candidate.gain = gain;
    source.start();
  }

  async function startHtmlAudio(candidate, generation, definition) {
    const AudioConstructor = globalThis.Audio;
    if (!AudioConstructor) throw new Error('Audio is unavailable');
    const audio = new AudioConstructor(definition.path);
    if (track !== candidate || trackGeneration !== generation || destroyed || muted) return;
    candidate.audio = audio;
    audio.loop = definition.loop !== false;
    audio.volume = volume('music');
    await audio.play();
  }

  async function playTrackForScreen() {
    const musicId = currentConfig.audio.tracksByScreen[screen];
    const definition = musicId && currentConfig.assets.music[musicId];
    if (!definition || muted || !unlocked || destroyed) {
      stopTrack();
      return;
    }
    if (track?.path === definition.path) {
      syncVolumes();
      return;
    }
    stopTrack();
    const generation = trackGeneration;
    const candidate = { path: definition.path };
    track = candidate;
    try {
      const context = getAudioContext();
      if (context) {
        await startWebAudio(candidate, generation, definition, context);
      } else {
        await startHtmlAudio(candidate, generation, definition);
      }
    } catch (error) {
      if (track !== candidate || trackGeneration !== generation || destroyed || muted) return;
      if (error?.name === 'AbortError') return;
      if (candidate.source || candidate.gain || candidate.audio) {
        stopTrack();
        reportUnavailable();
        return;
      }
      try {
        await startHtmlAudio(candidate, generation, definition);
      } catch (fallbackError) {
        if (track === candidate && trackGeneration === generation) {
          stopTrack();
          if (fallbackError?.name !== 'AbortError') reportUnavailable();
        }
      }
    }
  }

  async function unlock() {
    if (destroyed) return;
    unlocked = true;
    await playTrackForScreen();
  }

  function setScreen(nextScreen) {
    if (nextScreen !== 'playing') stopEffects();
    screen = nextScreen;
    void playTrackForScreen();
  }

  function setMuted(value) {
    muted = Boolean(value);
    if (muted) {
      stopTrack();
      stopEffects();
    } else {
      void playTrackForScreen();
    }
    syncVolumes();
  }

  function handleEvents(events = []) {
    if (!unlocked || muted || destroyed) return;
    const soundByEvent = currentConfig.audio.events;
    for (const event of events) {
      const name = typeof event === 'string' ? event : event?.type ?? event?.id;
      const soundId = soundByEvent[name] ?? (currentConfig.assets.sounds[name] ? name : null);
      const definition = soundId && currentConfig.assets.sounds[soundId];
      if (!definition) continue;
      effects.splice(0, effects.length, ...effects.filter((effect) => !effect.paused && !effect.ended));
      if (effects.length >= currentConfig.audio.maxConcurrentEffects) continue;
      try {
        const AudioConstructor = globalThis.Audio;
        if (!AudioConstructor) throw new Error('Audio is unavailable');
        const effect = new AudioConstructor(definition.path);
        effect.volume = volume('sfx');
        effects.push(effect);
        effect.addEventListener?.('ended', () => {
          const index = effects.indexOf(effect);
          if (index >= 0) effects.splice(index, 1);
        }, { once: true });
        Promise.resolve(effect.play()).catch(reportUnavailable);
      } catch {
        reportUnavailable();
      }
    }
  }

  function updateConfig(nextConfig) {
    const priorPath = trackPath();
    currentConfig = nextConfig;
    syncVolumes();
    const nextId = currentConfig.audio.tracksByScreen[screen];
    const nextPath = nextId && currentConfig.assets.music[nextId]?.path;
    if (priorPath && priorPath !== nextPath) void playTrackForScreen();
  }

  function destroy() {
    destroyed = true;
    stopTrack();
    stopEffects();
    if (audioContext && audioContext.state !== 'closed') {
      Promise.resolve(audioContext.close()).catch(() => {});
    }
  }

  return { unlock, setScreen, setMuted, isMuted: () => muted, updateConfig, handleEvents, destroy };
}
