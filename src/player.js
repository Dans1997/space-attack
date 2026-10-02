export function movePlayer(world, input, dt, config) {
  const player = world.player;
  player.prevX = player.x; player.prevY = player.y;
  player.invulnerableSec = Math.max(0, player.invulnerableSec - dt);
  player.fireCooldownSec = Math.max(0, player.fireCooldownSec - dt);
  if (!player.alive) return;
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  const half = player.width / 2;
  player.x = Math.max(config.arena.paddingPx + half,
    Math.min(config.arena.width - config.arena.paddingPx - half, player.x + direction * config.player.speedPxSec * dt));
}

export function firePlayerShot(world, firing, dt, config) {
  const player = world.player;
  if (!player.alive || !firing || player.fireCooldownSec > 0) return;
  if (world.projectiles.length >= config.simulation.maxProjectiles) return;
  const type = config.projectileTypes[config.player.projectileId];
  world.projectiles.push({ id: world.nextEntityId++, x: player.x, y: player.y - player.height / 2,
    prevX: player.x, prevY: player.y - player.height / 2, width: type.sizePx.width, height: type.sizePx.height,
    spriteId: type.spriteId, faction: 'player', damage: type.damage, lifetimeSec: type.lifetimeSec,
    speedPxSec: type.speedPxSec, alive: true, hitboxInsetPx: type.hitboxInsetPx });
  player.fireCooldownSec = config.player.fireIntervalSec;
}

export function updatePlayerRespawn(world, dt, config) {
  if (world.phase !== 'respawning') return;
  world.phaseRemainingSec = Math.max(0, world.phaseRemainingSec - dt);
  if (world.phaseRemainingSec > 0 || world.gameOver) return;
  world.player.x = config.player.spawn.x; world.player.y = config.player.spawn.y;
  world.player.prevX = world.player.x; world.player.prevY = world.player.y;
  world.player.health = config.player.maxHealth; world.player.alive = true;
  world.player.invulnerableSec = config.player.invulnerableSec;
  world.phase = 'combat';
}
