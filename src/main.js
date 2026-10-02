import { CONFIG } from './config.js';
import { validateConfig } from './validation.js';
import { loadAssets } from './assets.js';
import { createWorld, updateWorld } from './world.js';
import { createSession } from './session.js';
import { createLoop } from './loop.js';
import { createInput } from './input.js';
import { createEffects } from './effects.js';
import { createRenderer } from './renderer.js';
import { createUi } from './ui.js';
import { createAudio } from './audio.js';
import { createSettings } from './settings.js';
import { createTuningPanel } from './tuning.js';

const settings = createSettings(CONFIG);
const config = () => settings.config;
const canvas = document.getElementById('game');
const ui = createUi(config);
const session = createSession(config, createWorld);
const audio = createAudio(config(), message => ui.notice(message));
const effects = createEffects();
let renderer;
let previousScreen;
let preparing = false;

function refresh() {
  if (previousScreen !== session.screen) {
    previousScreen = session.screen;
    audio.setScreen(session.screen);
    input.clear();
    loop.resetTime();
  }
  ui.update(session, audio.isMuted());
}

function pause() {
  session.pause(); input.clear(); loop.resetTime(); refresh();
}

const tuning = createTuningPanel({
  settings,
  onOpen: pause,
  onClose() { input.clear(); loop.resetTime(); refresh(); },
  onChange() { audio.updateConfig(config()); ui.configure(); refresh(); },
});

function confirm() {
  if (tuning.isOpen()) return;
  void audio.unlock();
  if (session.screen === 'error') { void prepare(); return; }
  if (session.screen === 'paused') session.resume();
  else if (session.start()) effects.clear();
  else return;
  input.clear(); loop.resetTime(); refresh(); canvas.focus({ preventScroll: true });
}

function act(action) {
  if (action === 'confirm') confirm();
  if (action === 'pause' && !tuning.isOpen()) {
    if (session.screen === 'playing') pause();
    else if (session.screen === 'paused') confirm();
  }
  if (action === 'mute') { audio.setMuted(!audio.isMuted()); refresh(); }
  if (action === 'tuning') tuning.toggle();
}

const input = createInput({ target: document, bindings: () => config().controls, onAction: act, canPlay: () => session.screen === 'playing' && !tuning.isOpen() });
const loop = createLoop({
  config,
  isRunning: () => session.screen === 'playing' && !tuning.isOpen(),
  step(dt) {
    updateWorld(session.world, input.read(), dt, config());
    effects.update(dt, config());
    effects.add(session.world.events, config());
    session.finish();
    refresh();
    audio.handleEvents(session.world.events);
  },
  render() { renderer?.draw(session.world, session.screen); ui.update(session, audio.isMuted()); },
});

document.getElementById('screen-action').addEventListener('click', confirm);
document.getElementById('pause-button').addEventListener('click', () => act('pause'));
document.getElementById('mute-button').addEventListener('click', () => act('mute'));
document.getElementById('tuning-button').addEventListener('click', () => act('tuning'));
document.addEventListener('pointerdown', () => void audio.unlock());
document.addEventListener('keydown', () => void audio.unlock());
window.addEventListener('blur', () => { pause(); audio.setScreen('paused'); });
window.addEventListener('focus', () => audio.setScreen(session.screen));
document.addEventListener('visibilitychange', () => {
  if (document.hidden) { pause(); audio.setScreen('paused'); }
  else audio.setScreen(session.screen);
});

async function prepare() {
  if (preparing) return;
  preparing = true;
  try {
    validateConfig(config());
    ui.notice('');
    const assets = await loadAssets(config());
    renderer = createRenderer(canvas, assets, config, effects);
    session.ready(); refresh(); loop.start();
    if (settings.persistError) ui.notice(config().tuning.text.storageError);
  } catch (error) { session.fail(error); refresh(); }
  finally { preparing = false; }
}

refresh();
void prepare();
