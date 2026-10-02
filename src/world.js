import { movePlayer, firePlayerShot, updatePlayerRespawn } from './player.js';
import { updateEnemies, fireEnemyShots } from './enemies.js';
import { updateProjectiles } from './projectiles.js';
import { resolveCollisions } from './collisions.js';
import { beginWave, updateWaves } from './waves.js';

export function createWorld(config, random = Math.random) {
  const world = {
    elapsedSec: 0, score: 0, waveIndex: 1, phase: 'combat', phaseRemainingSec: 0,
    player: { x: config.player.spawn.x, y: config.player.spawn.y, prevX: config.player.spawn.x,
      prevY: config.player.spawn.y, width: config.player.sizePx.width, height: config.player.sizePx.height,
      spriteId: config.player.spriteId, health: config.player.maxHealth, ships: config.player.ships,
      alive: true, invulnerableSec: 0, fireCooldownSec: 0 },
    enemies: [], projectiles: [], events: [], gameOver: false, nextEntityId: 1,
    formation: { direction: 1, offsetX: 0, fireCooldownSec: 0, diveCooldownSec: 0 },
  };
  beginWave(world, config, random);
  return world;
}

export function updateWorld(world, input, dt, config, random = Math.random) {
  world.events = [];
  if (!(dt > 0) || world.gameOver) return world;
  const step = Math.min(dt, config.simulation.maxFrameSec);
  world.elapsedSec += step;
  const phase = world.phase;
  if (phase === 'respawning') updatePlayerRespawn(world, step, config);
  else movePlayer(world, input, step, config);
  if (phase === 'combat') {
    updateEnemies(world, step, config);
    if (world.gameOver || world.phase !== 'combat') return world;
    firePlayerShot(world, input.fire, step, config);
    fireEnemyShots(world, step, config, random);
    updateProjectiles(world, step, config);
    resolveCollisions(world, config);
    if (!world.gameOver) updateWaves(world, step, config, random);
  } else if (phase === 'intermission') {
    world.phaseRemainingSec = Math.max(0, world.phaseRemainingSec - step);
    if (world.phaseRemainingSec === 0) {
      world.waveIndex += 1;
      world.phase = 'combat';
      beginWave(world, config, random);
      world.events.push({ type: 'waveStarted', waveIndex: world.waveIndex });
    }
  }
  return world;
}
