function bounds(entity, inset = 0) {
  const pad = inset ?? 0;
  return { left: entity.x - entity.width / 2 + pad, right: entity.x + entity.width / 2 - pad,
    top: entity.y - entity.height / 2 + pad, bottom: entity.y + entity.height / 2 - pad };
}

export function sweptIntersects(projectile, target, targetInset = 0) {
  return sweptTime(projectile, target, targetInset) !== null;
}

export function sweptTime(projectile, target, targetInset = 0) {
  const b = bounds(target, targetInset);
  const pInset = projectile.hitboxInsetPx ?? 0;
  const left = b.left - projectile.width / 2 + pInset;
  const right = b.right + projectile.width / 2 - pInset;
  const top = b.top - projectile.height / 2 + pInset;
  const bottom = b.bottom + projectile.height / 2 - pInset;
  let t0 = 0, t1 = 1;
  const dx = projectile.x - projectile.prevX, dy = projectile.y - projectile.prevY;
  for (const [p, d, min, max] of [[projectile.prevX, dx, left, right], [projectile.prevY, dy, top, bottom]]) {
    if (d === 0) { if (p < min || p > max) return null; continue; }
    let a = (min - p) / d, z = (max - p) / d;
    if (a > z) [a, z] = [z, a];
    t0 = Math.max(t0, a); t1 = Math.min(t1, z);
    if (t0 > t1) return null;
  }
  return t0;
}

export function resolveCollisions(world, config) {
  for (const shot of world.projectiles) {
    if (!shot.alive) continue;
    if (shot.faction === 'player') {
      const target = world.enemies.map((enemy) => ({ enemy, time: enemy.alive ? sweptTime(shot, enemy, enemy.hitboxInsetPx) : null }))
        .filter((hit) => hit.time !== null).sort((a, b) => a.time - b.time)[0]?.enemy;
      if (!target) continue;
      shot.alive = false; target.health -= shot.damage;
      if (target.health <= 0 && target.alive) {
        target.alive = false; world.score += config.enemyTypes[target.typeId].points;
        world.events.push({ type: 'enemyDestroyed', x: target.x, y: target.y,
          enemyTypeId: target.typeId, points: config.enemyTypes[target.typeId].points });
      }
    } else if (shot.faction === 'enemy' && world.player.alive && world.player.invulnerableSec <= 0 &&
      sweptIntersects(shot, world.player, config.player.hitboxInsetPx)) {
      shot.alive = false;
      damagePlayer(world, shot.damage, shot.x, shot.y, config);
    }
  }
  for (const enemy of world.enemies) {
    if (enemy.alive &&
      overlap(bounds(enemy, enemy.hitboxInsetPx), bounds(world.player, config.player.hitboxInsetPx))) {
      destroyPlayerOnContact(world, enemy.x, enemy.y, config);
      break;
    }
  }
  world.projectiles = world.projectiles.filter((shot) => shot.alive && shot.y + shot.height / 2 >= 0 && shot.y - shot.height / 2 <= config.arena.height);
}

export function destroyPlayerOnContact(world, _x, _y, config) {
  if (world.gameOver) return false;
  world.player.health = 0;
  world.player.ships = 0;
  world.player.alive = false;
  world.gameOver = true;
  world.phase = 'combat';
  world.projectiles = config.damage.clearShotsOnRespawn
    ? world.projectiles.filter((shot) => shot.faction === 'player')
    : world.projectiles;
  world.events = world.events.filter((event) => event.type !== 'playerDestroyed');
  world.events.push({ type: 'playerDestroyed', x: world.player.x, y: world.player.y, ships: 0, cause: 'enemyContact' });
  return true;
}

function overlap(a, b) { return a.left <= b.right && a.right >= b.left && a.top <= b.bottom && a.bottom >= b.top; }

export function damagePlayer(world, damage, _x, _y, config) {
  if (world.player.invulnerableSec > 0 || !world.player.alive || world.gameOver) return false;
  world.player.health = Math.max(0, world.player.health - damage);
  world.events.push({ type: 'playerHit', x: world.player.x, y: world.player.y, damage });
  if (world.player.health > 0) {
    world.player.invulnerableSec = config.player.hitInvulnerableSec;
    return true;
  }
  world.player.alive = false; world.player.ships -= 1;
  world.events.push({ type: 'playerDestroyed', x: world.player.x, y: world.player.y, ships: world.player.ships });
  if (config.damage.clearShotsOnRespawn) world.projectiles = world.projectiles.filter((shot) => shot.faction === 'player');
  if (world.player.ships <= 0) { world.gameOver = true; world.phase = 'combat'; }
  else { world.phase = 'respawning'; world.phaseRemainingSec = config.player.respawnDelaySec; }
  return true;
}
