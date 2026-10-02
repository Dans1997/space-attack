import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createWorld, updateWorld } from '../src/world.js';
import { firePlayerShot, movePlayer } from '../src/player.js';

const cloneConfig = () => structuredClone(CONFIG);
const fixedRandom = () => 0.5;

test('initialization creates a fresh deterministic wave-one run', () => {
  const config = cloneConfig();
  const a = createWorld(config, fixedRandom), b = createWorld(config, fixedRandom);
  assert.equal(a.score, 0);
  assert.equal(a.waveIndex, 1);
  assert.equal(a.player.health, config.player.maxHealth);
  assert.equal(a.player.ships, config.player.ships);
  assert.equal(a.enemies.length, config.waves.templates[0].rows.flat().length);
  assert.deepEqual(a.enemies, b.enemies);
  assert.deepEqual(a.projectiles, []);
});

test('horizontal movement clamps to arena edges and firing holds at configured cadence', () => {
  const config = cloneConfig();
  const world = createWorld(config, fixedRandom);
  movePlayer(world, { left: true, right: false }, 10, config);
  assert.equal(world.player.x, config.arena.paddingPx + world.player.width / 2);
  firePlayerShot(world, true, 0, config);
  assert.equal(world.projectiles.length, 1);
  assert.deepEqual(world.events.map((event) => event.type), ['playerFired']);
  for (let i = 0; i < 12; i += 1) updateWorld(world, { left: false, right: false, fire: true }, config.player.fireIntervalSec / 2, config, fixedRandom);
  assert.ok(world.projectiles.length >= 2);
});

test('player motion follows elapsed time independently of step size', () => {
  const config = cloneConfig();
  const a = createWorld(config, fixedRandom), b = createWorld(config, fixedRandom);
  movePlayer(a, { right: true }, 0.5, config);
  for (let i = 0; i < 5; i += 1) movePlayer(b, { right: true }, 0.1, config);
  assert.equal(a.player.x, b.player.x);
});
