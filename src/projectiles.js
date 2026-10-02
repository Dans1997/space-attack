export function updateProjectiles(world, dt, config) {
  for (const shot of world.projectiles) {
    if (!shot.alive) continue;
    shot.prevX = shot.x; shot.prevY = shot.y;
    shot.y += shot.speedPxSec * dt; shot.lifetimeSec -= dt;
    if (shot.lifetimeSec <= 0) shot.alive = false;
  }
}
