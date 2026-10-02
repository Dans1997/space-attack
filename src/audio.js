export function createAudio(config, onStatus = () => {}) {
  let currentConfig = config;
  let screen = 'title';
  let muted = Boolean(config.audio.startMuted);
  let unlocked = false;
  let destroyed = false;
  let unavailableReported = false;
  let track = null;
  let outgoingTrack = null;
  let pendingTrack = null;
  let retirementTimer = null;
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

  function fadeDuration() {
    return Number.isFinite(currentConfig.audio.fadeSec) ? Math.max(0, currentConfig.audio.fadeSec) : 0;
  }

  function setGain(voice, target, seconds = 0) {
    if (!voice?.gain) {
      if (voice?.audio) voice.audio.volume = target;
      return;
    }
    const parameter = voice.gain.gain;
    const now = audioContext?.currentTime ?? 0;
    if (parameter.cancelAndHoldAtTime) parameter.cancelAndHoldAtTime(now);
    else {
      parameter.cancelScheduledValues?.(now);
      parameter.setValueAtTime?.(parameter.value, now);
    }
    if (seconds <= 0) {
      if (parameter.setValueAtTime) parameter.setValueAtTime(target, now);
      else parameter.value = target;
      voice.fadeEndTime = now;
      return;
    }
    if (parameter.linearRampToValueAtTime) parameter.linearRampToValueAtTime(target, now + seconds);
    else parameter.value = target;
    voice.fadeEndTime = now + seconds;
  }

  function retargetGain(voice, target) {
    const now = audioContext?.currentTime ?? 0;
    const remaining = voice?.fadeEndTime > now ? voice.fadeEndTime - now : 0;
    setGain(voice, target, remaining);
  }

  function stopVoice(voice) {
    if (!voice) return;
    if (voice.source) {
      try { voice.source.stop(); } catch { /* The source may already be stopped. */ }
      voice.source.disconnect?.();
      voice.gain?.disconnect?.();
    }
    if (voice.audio) {
      voice.audio.pause();
      try { voice.audio.currentTime = 0; } catch { /* Some media implementations reject seeking before metadata. */ }
    }
  }

  function cancelRetirement() {
    if (retirementTimer !== null) globalThis.clearTimeout(retirementTimer);
    retirementTimer = null;
  }

  function discardOutgoing() {
    cancelRetirement();
    stopVoice(outgoingTrack);
    outgoingTrack = null;
  }

  function cancelPending() {
    const pending = pendingTrack;
    pendingTrack = null;
    stopVoice(pending?.voice);
  }

  function stopTracks() {
    const pending = pendingTrack;
    pendingTrack = null;
    cancelRetirement();
    const voices = new Set([track, outgoingTrack, pending?.voice]);
    track = null;
    outgoingTrack = null;
    for (const voice of voices) stopVoice(voice);
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

  function stillWanted(candidate) {
    if (pendingTrack !== candidate || destroyed || muted) return false;
    const musicId = currentConfig.audio.tracksByScreen[screen];
    return currentConfig.assets.music[musicId]?.path === candidate.path;
  }

  async function makeWebAudioVoice(candidate, definition, context) {
    await context.resume();
    const buffer = await loadTrack(definition.path, context);
    if (!stillWanted(candidate)) return null;
    const source = context.createBufferSource();
    const gain = context.createGain();
    const voice = { path: definition.path, source, gain, kind: 'buffer', fadeEndTime: 0 };
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
    gain.gain.value = 0;
    source.connect(gain);
    gain.connect(context.destination);
    candidate.voice = voice;
    source.start();
    return voice;
  }

  async function makeHtmlVoice(candidate, definition) {
    const AudioConstructor = globalThis.Audio;
    if (!AudioConstructor) throw new Error('Audio is unavailable');
    const audio = new AudioConstructor(definition.path);
    if (!stillWanted(candidate)) return null;
    const voice = { path: definition.path, audio, kind: 'html' };
    candidate.voice = voice;
    audio.loop = definition.loop !== false;
    audio.volume = muted ? 0 : volume('music');
    await audio.play();
    return voice;
  }

  function retireAfterFade(voice, seconds) {
    if (!voice) return;
    outgoingTrack = voice;
    if (!voice.gain || seconds <= 0) {
      discardOutgoing();
      return;
    }
    setGain(voice, 0, seconds);
    retirementTimer = globalThis.setTimeout(() => {
      if (outgoingTrack !== voice) return;
      stopVoice(voice);
      outgoingTrack = null;
      retirementTimer = null;
    }, seconds * 1000);
  }

  function crossfadeTo(voice) {
    const seconds = fadeDuration();
    const previous = track;
    if (outgoingTrack && outgoingTrack !== voice) discardOutgoing();
    track = voice;
    if (voice.gain) setGain(voice, muted ? 0 : volume('music'), seconds);
    if (previous && previous !== voice) {
      if (previous.gain && voice.gain && seconds > 0) retireAfterFade(previous, seconds);
      else stopVoice(previous);
    } else if (outgoingTrack && outgoingTrack !== voice) {
      discardOutgoing();
    }
  }

  function fadeOutCurrent() {
    cancelPending();
    if (!track) return;
    if (outgoingTrack) discardOutgoing();
    const prior = track;
    track = null;
    if (prior.gain && fadeDuration() > 0) retireAfterFade(prior, fadeDuration());
    else stopVoice(prior);
  }

  async function prepareVoice(candidate, definition) {
    let voice = null;
    let firstError = null;
    const context = getAudioContext();
    if (context) {
      try {
        voice = await makeWebAudioVoice(candidate, definition, context);
      } catch (error) {
        firstError = error;
        stopVoice(candidate.voice);
      }
    }
    if (!voice && stillWanted(candidate)) {
      try {
        voice = await makeHtmlVoice(candidate, definition);
      } catch (error) {
        firstError ??= error;
        stopVoice(candidate.voice);
        if (pendingTrack === candidate) pendingTrack = null;
        if (error?.name !== 'AbortError' && error?.name !== 'NotAllowedError') reportUnavailable();
        return;
      }
    }
    if (!voice) {
      if (pendingTrack === candidate) {
        pendingTrack = null;
        if (firstError && firstError.name !== 'AbortError' && firstError.name !== 'NotAllowedError') reportUnavailable();
      }
      return;
    }
    if (!stillWanted(candidate)) {
      stopVoice(voice);
      return;
    }
    pendingTrack = null;
    if (!track && outgoingTrack?.path === voice.path) {
      cancelRetirement();
      const prior = outgoingTrack;
      outgoingTrack = null;
      stopVoice(voice);
      track = prior;
      setGain(prior, volume('music'), fadeDuration());
      return;
    }
    crossfadeTo(voice);
  }

  async function playTrackForScreen() {
    const musicId = currentConfig.audio.tracksByScreen[screen];
    const definition = musicId && currentConfig.assets.music[musicId];
    if (!definition || !unlocked || destroyed) {
      fadeOutCurrent();
      return;
    }
    if (muted) {
      stopTracks();
      return;
    }
    if (track?.path === definition.path) {
      if (pendingTrack) cancelPending();
      return;
    }
    if (outgoingTrack?.path === definition.path) {
      if (pendingTrack) cancelPending();
      cancelRetirement();
      const returning = outgoingTrack;
      const previous = track;
      outgoingTrack = null;
      track = returning;
      setGain(returning, volume('music'), fadeDuration());
      if (previous && previous !== returning) retireAfterFade(previous, fadeDuration());
      return;
    }
    if (pendingTrack?.path === definition.path) return;
    if (pendingTrack) cancelPending();
    if (outgoingTrack) discardOutgoing();
    const candidate = { path: definition.path };
    pendingTrack = candidate;
    await prepareVoice(candidate, definition);
  }

  async function unlock() {
    if (destroyed) return;
    unlocked = true;
    const context = getAudioContext();
    if (context && context.state !== 'running') {
      try { await context.resume(); } catch { /* A later user gesture can retry a suspended context. */ }
    }
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
      stopTracks();
      stopEffects();
    } else {
      void playTrackForScreen();
    }
  }

  function handleEvents(events = []) {
    if (!unlocked || muted || destroyed) return;
    const soundByEvent = currentConfig.audio.events;
    const playedSounds = new Set();
    for (const event of events) {
      const name = typeof event === 'string' ? event : event?.type ?? event?.id;
      const soundId = soundByEvent[name] ?? (currentConfig.assets.sounds[name] ? name : null);
      const definition = soundId && currentConfig.assets.sounds[soundId];
      if (!definition || playedSounds.has(soundId)) continue;
      effects.splice(0, effects.length, ...effects.filter((effect) => !effect.paused && !effect.ended));
      if (effects.length >= currentConfig.audio.maxConcurrentEffects) continue;
      try {
        const AudioConstructor = globalThis.Audio;
        if (!AudioConstructor) throw new Error('Audio is unavailable');
        const effect = new AudioConstructor(definition.path);
        playedSounds.add(soundId);
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
    const previousMute = muted;
    currentConfig = nextConfig;
    muted = Boolean(nextConfig.audio.startMuted);
    if (muted && !previousMute) {
      stopTracks();
      stopEffects();
      return;
    }
    if (!muted && previousMute) {
      void playTrackForScreen();
      return;
    }
    if (track?.gain) retargetGain(track, volume('music'));
    if (track?.audio) track.audio.volume = volume('music');
    for (const effect of effects) effect.volume = volume('sfx');
    const musicId = currentConfig.audio.tracksByScreen[screen];
    const desiredPath = musicId && currentConfig.assets.music[musicId]?.path;
    if (track && track.path !== desiredPath) void playTrackForScreen();
  }

  function destroy() {
    destroyed = true;
    stopTracks();
    stopEffects();
    if (audioContext && audioContext.state !== 'closed') {
      Promise.resolve(audioContext.close()).catch(() => {});
    }
  }

  return { unlock, setScreen, setMuted, isMuted: () => muted, updateConfig, handleEvents, destroy };
}
