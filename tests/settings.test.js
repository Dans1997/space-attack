import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createSettings } from '../src/settings.js';

function memoryStorage(initial = null) {
  let value = initial;
  return {
    getItem() { return value; },
    setItem(_key, next) { value = next; },
    stored() { return value; },
  };
}

test('settings clone defaults, validate fields, and persist allowlisted values', () => {
  const storage = memoryStorage();
  const settings = createSettings(CONFIG, storage);
  assert.notEqual(settings.config, CONFIG);
  settings.update('player.speedPxSec', 10000);
  settings.update('player.fireIntervalSec', 0.17);
  settings.update('tuning.theme', 'solar');
  settings.update('tuning.playerShip', 'playerRed');
  settings.update('audio.muted', true);
  settings.update('meta.title', 'changed');
  assert.equal(settings.config.player.speedPxSec, 700);
  assert.equal(settings.config.player.fireIntervalSec, 0.17);
  assert.equal(settings.config.tuning.theme, 'solar');
  assert.equal(settings.config.player.spriteId, 'playerRed');
  assert.equal(settings.config.audio.startMuted, true);
  assert.equal(settings.values.muted, true);
  assert.equal(JSON.parse(storage.stored()).fields['player.speedPxSec'], 700);
  assert.equal(JSON.parse(storage.stored()).meta, undefined);
  assert.equal(JSON.parse(storage.stored()).muted, true);
  assert.equal(JSON.parse(storage.stored()).enemyShipId, undefined);
});

test('settings restore validated values and ignore malformed or obsolete storage', () => {
  const storage = memoryStorage(JSON.stringify({
    version: CONFIG.tuning.version,
    fields: { 'player.speedPxSec': -5, 'player.fireIntervalSec': 'not-a-number' },
    theme: 'not-a-theme', playerShipId: 'missing', enemyShipId: 'player', muted: true,
  }));
  const settings = createSettings(CONFIG, storage);
  assert.equal(settings.config.player.speedPxSec, 120);
  assert.equal(settings.config.player.fireIntervalSec, CONFIG.player.fireIntervalSec);
  assert.equal(settings.values.theme, CONFIG.tuning.defaultTheme);
  assert.equal(settings.values.playerShipId, CONFIG.player.spriteId);
  assert.equal(settings.config.audio.startMuted, true);
  assert.equal(settings.values.muted, true);
  assert.equal(settings.config.tuning.enemyShipOverride, undefined);
  assert.doesNotThrow(() => createSettings(CONFIG, memoryStorage('{')));
  assert.doesNotThrow(() => createSettings(CONFIG, { getItem() { throw Error('blocked'); }, setItem() { throw Error('blocked'); } }));
});

test('reset restores defaults and blocked storage only reports a session warning', () => {
  const settings = createSettings(CONFIG, { getItem() { return null; }, setItem() { throw Error('blocked'); } });
  settings.update('player.speedPxSec', 500);
  assert.equal(settings.persistError, true);
  settings.reset();
  assert.equal(settings.config.player.speedPxSec, CONFIG.player.speedPxSec);
  assert.equal(settings.values.theme, CONFIG.tuning.defaultTheme);
  assert.equal(settings.config.tuning.enemyShipOverride, undefined);
  assert.equal(settings.config.audio.startMuted, CONFIG.audio.startMuted);
  assert.equal(settings.persistError, true);
});

test('typed text and color fields validate, persist, and restore as strings', () => {
  const config = structuredClone(CONFIG);
  config.visuals.brandColor = '#123456';
  config.tuning.fields.push(
    { path: 'ui.scorePrefix', label: 'Score prefix', type: 'text', group: 'Presentation' },
    { path: 'visuals.brandColor', label: 'Brand color', type: 'color', group: 'Presentation' },
  );
  const storage = memoryStorage();
  const settings = createSettings(config, storage);
  settings.update('ui.scorePrefix', 'PTS ');
  settings.update('visuals.brandColor', '#a0b1c2');
  settings.update('visuals.brandColor', '#abc');
  settings.update('ui.scorePrefix', 123);
  assert.equal(settings.config.ui.scorePrefix, 'PTS ');
  assert.equal(settings.config.visuals.brandColor, '#a0b1c2');
  const restored = createSettings(config, storage);
  assert.equal(restored.config.ui.scorePrefix, 'PTS ');
  assert.equal(restored.config.visuals.brandColor, '#a0b1c2');
});
