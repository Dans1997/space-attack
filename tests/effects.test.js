import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createEffects } from '../src/effects.js';
import { createStarfield } from '../src/starfield.js';

test('kill events create bounded explosions and exact point popups with independent lifetimes', () => {
  const config = structuredClone(CONFIG);
  const effects = createEffects();
  effects.add([{ type: 'enemyDestroyed', x: 100, y: 80, points: 250 }], config);
  assert.equal(effects.items.length, 2);
  assert.equal(effects.items.find(item => item.kind === 'score').points, 250);
  effects.update(config.visuals.explosionSec);
  assert.deepEqual(effects.items.map(item => item.kind), ['score']);
  effects.update(config.visuals.scorePopupSec);
  assert.equal(effects.items.length, 0);
  effects.add(Array.from({ length: config.simulation.maxEffects }, () => ({ type: 'enemyDestroyed', points: 100 })), config);
  assert.equal(effects.items.length, config.simulation.maxEffects);
  effects.clear(); assert.equal(effects.items.length, 0);
});

test('hit feedback ends, can be disabled, and reduced motion suppresses flashes and shake', () => {
  const config = structuredClone(CONFIG), effects = createEffects();
  effects.add([{ type: 'playerHit', x: 400, y: 535 }], config);
  assert.equal(effects.feedback(config).flash, config.visuals.hitFlashAlpha);
  assert.equal(effects.feedback(config).y, config.visuals.shakePx);
  assert.deepEqual(effects.feedback(config, true), { flash: 0, x: 0, y: 0 });
  effects.update(Math.max(config.visuals.hitFlashSec, config.visuals.shakeSec));
  assert.deepEqual(effects.feedback(config), { flash: 0, x: 0, y: 0 });
  config.visuals.hitFlashSec = 0; config.visuals.shakeSec = 0;
  effects.add([{ type: 'playerDestroyed' }], config);
  assert.deepEqual(effects.feedback(config), { flash: 0, x: 0, y: 0 });
});

test('firing and wave events create transient feedback at the correct muzzle positions', () => {
  const effects = createEffects();
  effects.add([{ type: 'playerFired', x: 400, y: 515 }, { type: 'enemyFired', x: 100, y: 70, enemyTypeId: 'scout' },
    { type: 'waveStarted', waveIndex: 2 }], CONFIG);
  assert.equal(effects.items[0].y, 515);
  assert.equal(effects.items[1].y, 70 + CONFIG.enemyTypes.scout.sizePx.height / 2);
  assert.equal(effects.items[2].waveIndex, 2);
  effects.update(CONFIG.visuals.muzzleSec);
  assert.deepEqual(effects.items.map(item => item.kind), ['banner']);
});

test('star layers move at separate speeds, respond to the pilot and stay static with reduced motion', () => {
  const config = structuredClone(CONFIG);
  config.visuals.starLayers = config.visuals.starLayers.map(layer => ({ ...layer, count: 1 }));
  const stars = createStarfield();
  const draw = (time, x, reduced = false) => {
    const marks = [];
    stars.draw({ fillRect: (...args) => marks.push(args) }, config, time, x, reduced);
    return marks;
  };
  const start = draw(0, 400), later = draw(1, 400), lateral = draw(0, 500);
  config.visuals.starLayers.forEach((layer, index) => {
    assert.ok(Math.abs(later[index][1] - start[index][1] - layer.speedPxSec) < 1e-9);
    assert.ok(Math.abs(lateral[index][0] - start[index][0] + 100 * layer.parallax) < 1e-9);
  });
  assert.deepEqual(draw(0, 400, true), draw(100, 600, true));
  config.visuals.starLayers[0].count = 2;
  assert.equal(draw(0, 400).length, 4);
});
