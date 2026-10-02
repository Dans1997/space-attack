import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createWorld, updateWorld } from '../src/world.js';
import { beginWave, getWaveDifficulty } from '../src/waves.js';
import { damagePlayer, resolveCollisions } from '../src/collisions.js';
import { updateEnemies } from '../src/enemies.js';

const cloneConfig = () => structuredClone(CONFIG);

test('waves one, three and ten follow the templates and capped increasing pressure', () => {
  const config = cloneConfig();
  const one = getWaveDifficulty(config, 1), three = getWaveDifficulty(config, 3), ten = getWaveDifficulty(config, 10);
  assert.equal(one.template.id, config.waves.templates[0].id);
  assert.equal(three.template.id, config.waves.templates[2].id);
  assert.ok(three.formationSpeedPxSec > one.formationSpeedPxSec);
  assert.ok(ten.speedMultiplier <= config.waves.caps.speedMultiplier);
  assert.ok(ten.fireIntervalSec >= config.waves.caps.minFireIntervalSec);
  assert.ok(ten.diveIntervalSec >= config.waves.caps.minDiveIntervalSec);
  assert.ok(ten.maxDivers <= config.waves.caps.maxDivers);
});

test('difficulty pressure remains monotonic when templates repeat', () => {
  const config = cloneConfig();
  const progression = Array.from({ length: 12 }, (_, index) => getWaveDifficulty(config, index + 1));
  for (let index = 1; index < progression.length; index += 1) {
    assert.ok(progression[index].formationSpeedPxSec >= progression[index - 1].formationSpeedPxSec);
    assert.ok(progression[index].fireIntervalSec <= progression[index - 1].fireIntervalSec);
    assert.ok(progression[index].diveIntervalSec <= progression[index - 1].diveIntervalSec);
  }
});

test('formation bounce advances persistent row slots and preserves swept previous positions', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  const initialY = world.enemies.map((enemy) => enemy.y);
  const rightEdge = Math.max(...world.enemies.map((enemy) => enemy.slotX + enemy.width / 2));
  world.formation.offsetX = config.arena.width - config.arena.paddingPx - rightEdge - 0.1;
  world.formation.direction = 1;
  updateEnemies(world, config.simulation.maxFrameSec, config);
  assert.ok(world.enemies.some((enemy, index) => enemy.y === initialY[index] + config.waves.rowStepPx));
  assert.deepEqual(world.enemies.map((enemy) => enemy.prevY), initialY);
});

test('high and malformed wave templates obey entity caps and arena horizontal bounds', () => {
  const config = cloneConfig();
  config.waves.templates[0].rows = [Array(120).fill('armored')];
  config.waves.templates[0].spacingPx.x = 900;
  const world = createWorld(config);
  world.waveIndex = 100;
  beginWave(world, config, () => 0.5);
  assert.ok(world.enemies.length <= config.waves.caps.enemyCount);
  for (const enemy of world.enemies) {
    assert.ok(enemy.x - enemy.width / 2 >= config.arena.paddingPx - 1e-9);
    assert.ok(enemy.x + enemy.width / 2 <= config.arena.width - config.arena.paddingPx + 1e-9);
    assert.ok(enemy.y <= config.arena.enemyFloorY + 1e-9);
  }
});

test('wave one keeps its configured row widths and spacing', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  const rows = new Map();
  for (const enemy of world.enemies) rows.set(enemy.slotY, (rows.get(enemy.slotY) ?? 0) + 1);
  assert.deepEqual([...rows.values()], config.waves.templates[0].rows.map((row) => row.length));
  assert.equal(world.enemies[1].slotX - world.enemies[0].slotX, config.waves.templates[0].spacingPx.x);
});

test('formation rows clamp at the enemy floor and stay alive', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  const enemy = world.enemies[0];
  enemy.slotY = config.arena.enemyFloorY - 1;
  const rightEdge = Math.max(...world.enemies.map((item) => item.slotX + item.width / 2));
  world.formation.offsetX = config.arena.width - config.arena.paddingPx - rightEdge - 0.1;
  world.formation.direction = 1;
  const health = world.player.health;
  updateEnemies(world, config.simulation.maxFrameSec, config);
  assert.equal(enemy.alive, true);
  assert.equal(enemy.slotY, config.arena.enemyFloorY);
  assert.equal(enemy.y, config.arena.enemyFloorY);
  assert.equal(world.score, 0);
  assert.equal(world.player.health, health);
});

test('clearing the fleet starts one intermission and then the next wave', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  world.enemies = [];
  updateWorld(world, {}, config.simulation.stepSec, config, () => 0.5);
  assert.equal(world.phase, 'intermission');
  const remaining = world.phaseRemainingSec;
  const steps = Math.ceil(config.waves.intermissionSec / config.simulation.maxFrameSec) + 1;
  for (let i = 0; i < steps; i += 1) updateWorld(world, {}, config.simulation.maxFrameSec, config, () => 0.5);
  assert.equal(world.waveIndex, 2);
  assert.equal(world.phase, 'combat');
  assert.ok(world.enemies.length > 0);
  assert.equal(world.events.filter((event) => event.type === 'waveStarted').length, 1);
  assert.ok(remaining > 0);
});

test('respawn waits the configured delay without decrementing it twice', () => {
  const config = cloneConfig(), world = createWorld(config);
  world.player.health = 1;
  world.projectiles = [{ id: 40, faction: 'enemy', x: world.player.x, y: world.player.y,
    prevX: world.player.x, prevY: world.player.y, width: 5, height: 5, alive: true, damage: 1 }];
  world.player.invulnerableSec = 0;
  world.player.ships = 2;
  world.player.health = 1;
  damagePlayer(world, 1, world.player.x, world.player.y, config);
  let elapsed = 0;
  while (elapsed + config.simulation.maxFrameSec < config.player.respawnDelaySec) {
    updateWorld(world, {}, config.simulation.maxFrameSec, config);
    elapsed += config.simulation.maxFrameSec;
  }
  assert.equal(world.phase, 'respawning');
  updateWorld(world, {}, config.simulation.maxFrameSec, config);
  assert.equal(world.phase, 'combat');
});

test('divers stop at the enemy floor and linger laterally for ten seconds', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  const enemy = world.enemies[0];
  enemy.diving = true;
  enemy.y = config.arena.enemyFloorY - 1;
  enemy.prevY = enemy.y;
  const firstFloorX = enemy.x;
  for (let i = 0; i < 100; i += 1) updateEnemies(world, config.simulation.maxFrameSec, config);
  assert.equal(enemy.alive, true);
  assert.equal(enemy.diving, false);
  assert.equal(enemy.lingering, true);
  assert.equal(enemy.y, config.arena.enemyFloorY);
  assert.ok(enemy.x >= config.arena.paddingPx + enemy.width / 2);
  assert.ok(enemy.x <= config.arena.width - config.arena.paddingPx - enemy.width / 2);
  assert.notEqual(enemy.x, firstFloorX);
});

test('enemy contact causes immediate terminal game over despite hull, ships and invulnerability', () => {
  const config = cloneConfig(), world = createWorld(config);
  world.player.health = config.player.maxHealth;
  world.player.ships = config.player.ships;
  world.player.invulnerableSec = 100;
  const enemy = world.enemies[0];
  enemy.x = world.player.x; enemy.y = world.player.y;
  enemy.prevX = enemy.x; enemy.prevY = enemy.y;
  resolveCollisions(world, config);
  assert.equal(world.gameOver, true);
  assert.equal(world.player.health, 0);
  assert.equal(world.player.ships, 0);
  assert.equal(world.player.alive, false);
  assert.equal(world.score, 0);
  assert.equal(world.events.filter((event) => event.type === 'playerDestroyed').length, 1);
});

test('new run initialization resets progression, entities, health and score', () => {
  const config = cloneConfig(), world = createWorld(config);
  world.score = 720; world.waveIndex = 10; world.player.health = 4;
  const restarted = createWorld(config);
  assert.equal(restarted.score, 0);
  assert.equal(restarted.waveIndex, 1);
  assert.equal(restarted.player.health, config.player.maxHealth);
  assert.equal(restarted.enemies.length, config.waves.templates[0].rows.flat().length);
});
