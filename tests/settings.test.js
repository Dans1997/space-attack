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
  settings.update('tuning.playerShip', 'diver');
  settings.update('tuning.enemyShip', 'armored');
  settings.update('meta.title', 'changed');
  assert.equal(settings.config.player.speedPxSec, 700);
  assert.equal(settings.config.player.fireIntervalSec, 0.17);
  assert.equal(settings.config.tuning.theme, 'solar');
  assert.equal(settings.config.player.spriteId, 'diver');
  assert.equal(settings.config.tuning.enemyShipOverride, 'armored');
  assert.equal(JSON.parse(storage.stored()).fields['player.speedPxSec'], 700);
  assert.equal(JSON.parse(storage.stored()).meta, undefined);
});

test('settings restore validated values and ignore malformed or obsolete storage', () => {
  const storage = memoryStorage(JSON.stringify({
    version: CONFIG.tuning.version,
    fields: { 'player.speedPxSec': -5, 'player.fireIntervalSec': 'not-a-number' },
    theme: 'not-a-theme', playerShipId: 'missing', enemyShipId: 'missing',
  }));
  const settings = createSettings(CONFIG, storage);
  assert.equal(settings.config.player.speedPxSec, 120);
  assert.equal(settings.config.player.fireIntervalSec, CONFIG.player.fireIntervalSec);
  assert.equal(settings.values.theme, CONFIG.tuning.defaultTheme);
  assert.equal(settings.values.playerShipId, CONFIG.player.spriteId);
  assert.equal(settings.values.enemyShipId, 'original');
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
  assert.equal(settings.config.tuning.enemyShipOverride, null);
  assert.equal(settings.persistError, true);
});
