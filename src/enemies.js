export function updateEnemies(world, dt, config) {
  const { arena, waves } = config;
  const formation = world.formation;
  const floorY = Math.min(arena.enemyFloorY, arena.height - Math.max(...Object.values(config.enemyTypes).map((type) => type.sizePx.height)) / 2);
  const alive = world.enemies.filter((enemy) => enemy.alive && !enemy.diving);
  if (alive.length) {
    const bounds = alive.reduce((b, e) => ({ min: Math.min(b.min, e.slotX - e.width / 2), max: Math.max(b.max, e.slotX + e.width / 2) }), { min: Infinity, max: -Infinity });
    const speed = world.difficulty.formationSpeedPxSec;
    formation.offsetX += formation.direction * speed * dt;
    if (bounds.max + formation.offsetX > arena.width - arena.paddingPx || bounds.min + formation.offsetX < arena.paddingPx) {
      formation.direction *= -1;
      formation.offsetX += formation.direction * speed * dt;
      for (const enemy of alive) enemy.slotY = Math.min(floorY, enemy.slotY + waves.rowStepPx);
    }
  }
  for (const enemy of world.enemies) {
    if (!enemy.alive) continue;
    enemy.prevX = enemy.x; enemy.prevY = enemy.y;
    if (enemy.diving) {
      enemy.diveElapsedSec += dt;
      enemy.x = enemy.diveOriginX + Math.sin(enemy.diveElapsedSec * waves.diveSwayRate) * waves.diveSwayPx;
      enemy.y += waves.diveSpeedPxSec * world.difficulty.speedMultiplier * dt;
      enemy.x = Math.max(arena.paddingPx + enemy.width / 2,
        Math.min(arena.width - arena.paddingPx - enemy.width / 2, enemy.x));
      if (enemy.y - enemy.height / 2 > arena.height) {
        enemy.alive = false;
      }
      continue;
    }
    enemy.x = enemy.slotX + formation.offsetX;
    enemy.y = Math.min(floorY, enemy.slotY);
    enemy.slotY = enemy.y;
  }
}

export function fireEnemyShots(world, dt, config, random = Math.random) {
  if (world.gameOver) return;
  const { formation } = world;
  formation.fireCooldownSec -= dt; formation.diveCooldownSec -= dt;
  const candidates = world.enemies.filter((enemy) => enemy.alive && !enemy.diving);
  if (formation.fireCooldownSec <= 0 && candidates.length && world.projectiles.length < config.simulation.maxProjectiles) {
    const shooter = candidates[Math.floor(random() * candidates.length)];
    const type = config.projectileTypes[config.enemyTypes[shooter.typeId].projectileId];
    world.projectiles.push({ id: world.nextEntityId++, x: shooter.x, y: shooter.y + shooter.height / 2,
      prevX: shooter.x, prevY: shooter.y + shooter.height / 2, width: type.sizePx.width, height: type.sizePx.height,
      spriteId: type.spriteId, faction: 'enemy', damage: type.damage, lifetimeSec: type.lifetimeSec,
      speedPxSec: type.speedPxSec * world.difficulty.speedMultiplier, alive: true, hitboxInsetPx: type.hitboxInsetPx });
    world.events.push({ type: 'enemyFired', x: shooter.x, y: shooter.y, enemyTypeId: shooter.typeId });
    formation.fireCooldownSec = world.difficulty.fireIntervalSec;
  }
  const divers = world.enemies.filter((enemy) => enemy.alive && enemy.diving).length;
  const diveCandidates = candidates.filter((enemy) => config.enemyTypes[enemy.typeId].movementId === 'diver');
  if (formation.diveCooldownSec <= 0 && divers < world.difficulty.maxDivers && diveCandidates.length) {
    const diver = diveCandidates[Math.floor(random() * diveCandidates.length)];
    diver.diving = true; diver.diveElapsedSec = 0; diver.diveOriginX = diver.x;
    formation.diveCooldownSec = world.difficulty.diveIntervalSec;
  }
}
