import test from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createWorld } from '../src/world.js';
import { resolveCollisions, sweptIntersects } from '../src/collisions.js';
import { updateProjectiles } from '../src/projectiles.js';

const cloneConfig = () => structuredClone(CONFIG);

test('swept collision catches a fast projectile that crosses the target in one tick', () => {
  const shot = { x: 100, y: 100, prevX: 100, prevY: 0, width: 4, height: 8 };
  const target = { x: 100, y: 50, width: 20, height: 20 };
  assert.equal(sweptIntersects(shot, target), true);
});

test('one shot damages only its nearest target and awards a kill once', () => {
  const config = cloneConfig(), world = createWorld(config, () => 0.5);
  const first = world.enemies[0];
  const nearer = { ...first, id: 999, x: first.x, y: first.y + 3, prevX: first.x, prevY: first.y + 3, slotX: first.x, slotY: first.y + 3 };
  world.enemies = [first, nearer];
  const score = world.score;
  world.projectiles = [{ id: 1000, faction: 'player', x: first.x, y: first.y, prevX: first.x, prevY: first.y - 100,
    width: 7, height: 24, damage: 1, alive: true, hitboxInsetPx: 0 }];
  resolveCollisions(world, config);
  assert.equal(world.projectiles.length, 0);
  assert.equal(world.enemies.filter((enemy) => enemy.alive).length, 1);
  assert.equal(world.score, score + config.enemyTypes[nearer.typeId].points);
  resolveCollisions(world, config);
  assert.equal(world.score, score + config.enemyTypes[nearer.typeId].points);
});

test('damage transitions through respawn and terminal game over exactly once', () => {
  const config = cloneConfig(), world = createWorld(config);
  world.player.health = 1;
  world.projectiles = [{ id: 500, faction: 'enemy', x: world.player.x, y: world.player.y,
    prevX: world.player.x, prevY: world.player.y - 200, width: 7, height: 20, alive: true, damage: 35, hitboxInsetPx: 0 }];
  resolveCollisions(world, config);
  assert.equal(world.player.ships, config.player.ships - 1);
  assert.equal(world.phase, 'respawning');
  assert.equal(world.gameOver, false);
  world.player.ships = 1; world.player.alive = true; world.player.health = 1; world.phase = 'combat';
  world.projectiles = [{ id: 501, faction: 'enemy', x: world.player.x, y: world.player.y,
    prevX: world.player.x, prevY: world.player.y - 200, width: 7, height: 20, alive: true, damage: 35, hitboxInsetPx: 0 }];
  resolveCollisions(world, config);
  assert.equal(world.gameOver, true);
  assert.equal(world.player.ships, 0);
});

test('a swept shot consumes the first enemy along its travel path', () => {
  const config = cloneConfig(), world = createWorld(config);
  const scout = config.enemyTypes.scout, armored = config.enemyTypes.armored;
  world.enemies = [
    { id: 1, typeId: 'armored', x: 120, y: 100, prevX: 120, prevY: 100, width: armored.sizePx.width, height: armored.sizePx.height, health: armored.health, alive: true, hitboxInsetPx: armored.hitboxInsetPx },
    { id: 2, typeId: 'scout', x: 120, y: 300, prevX: 120, prevY: 300, width: scout.sizePx.width, height: scout.sizePx.height, health: scout.health, alive: true, hitboxInsetPx: scout.hitboxInsetPx },
  ];
  world.projectiles = [{ id: 3, faction: 'player', x: 120, y: 0, prevX: 120, prevY: 400, width: 7, height: 24, damage: 1, alive: true, hitboxInsetPx: 0 }];
  resolveCollisions(world, config);
  assert.equal(world.enemies[1].alive, false);
  assert.equal(world.enemies[0].health, armored.health);
  assert.equal(world.score, scout.points);
});

test('a fast shot still collides when its endpoint has passed beyond the arena', () => {
  const config = cloneConfig(), world = createWorld(config);
  const enemyType = config.enemyTypes.scout;
  world.enemies = [{ id: 1, typeId: 'scout', x: 200, y: 12, prevX: 200, prevY: 12,
    width: enemyType.sizePx.width, height: enemyType.sizePx.height, health: 1, alive: true, hitboxInsetPx: enemyType.hitboxInsetPx }];
  world.projectiles = [{ id: 2, faction: 'player', x: 200, y: 12, prevX: 200, prevY: 40, width: 7, height: 24,
    damage: 1, alive: true, hitboxInsetPx: 0, speedPxSec: -1000, lifetimeSec: 2 }];
  updateProjectiles(world, 0.1, config);
  resolveCollisions(world, config);
  assert.equal(world.enemies[0].alive, false);
  assert.equal(world.score, enemyType.points);
});
