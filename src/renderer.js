export function createRenderer(canvas, assets, config, effects) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  function sprite(id, x, y, width, height, angle = 0) {
    const img = assets.images[id];
    if (!img) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.drawImage(img, -width / 2, -height / 2, width, height); ctx.restore();
  }
  function draw(world, screen) {
    const c = config();
    const theme = c.tuning.themes[c.tuning.theme ?? c.tuning.defaultTheme];
    const { width, height } = c.arena;
    const dpr = Math.min(devicePixelRatio || 1, c.visuals.maxDpr);
    const targetWidth = Math.round(width * dpr), targetHeight = Math.round(height * dpr);
    if (canvas.width !== targetWidth || canvas.height !== targetHeight) { canvas.width = targetWidth; canvas.height = targetHeight; }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = theme.arena; ctx.fillRect(0, 0, width, height);
    if (assets.images.background) {
      ctx.globalAlpha = c.visuals.backgroundAlpha;
      ctx.drawImage(assets.images.background, 0, 0, width, height);
      ctx.globalAlpha = 1;
    }
    ctx.fillStyle = theme.text;
    ctx.globalAlpha = c.visuals.starAlpha;
    const time = world?.elapsedSec ?? 0;
    for (let i = 0; i < c.visuals.starCount; i++) {
      // Multiplicative hashing gives a fixed starfield without runtime randomness.
      const x = ((i * 0.61803398875) % 1) * width;
      const y = (((i * 0.41421356237) % 1) * height + (motion.matches ? 0 : time * c.visuals.starSpeed)) % height;
      ctx.fillRect(x, y, c.visuals.starRadius, c.visuals.starRadius);
    }
    ctx.globalAlpha = 1;
    if (!world) return;
    for (const enemy of world.enemies) if (enemy.alive !== false) {
      sprite(enemy.spriteId, enemy.x, enemy.y, enemy.width, enemy.height);
    }
    for (const shot of world.projectiles) if (shot.alive !== false) sprite(shot.spriteId, shot.x, shot.y, shot.width, shot.height);
    const p = world.player;
    if (p.alive !== false) {
      const invulnerable = p.invulnerableSec > 0;
      ctx.globalAlpha = invulnerable ? (motion.matches ? c.visuals.reducedMotionAlpha : Math.floor(time * c.visuals.blinkHz) % 2 ? c.visuals.protectedAlpha : 1) : 1;
      if (screen === 'playing' && !motion.matches) {
        const frameCount = Object.keys(c.assets.images).filter(id => id.startsWith('fire')).length;
        const frame = Math.floor(time * c.visuals.flameFps) % frameCount;
        sprite(`fire${frame}`, p.x, p.y + c.visuals.flameOffset, c.visuals.flameSize.width, c.visuals.flameSize.height);
      }
      sprite(c.player.spriteId, p.x, p.y, p.width, p.height);
      ctx.globalAlpha = 1;
    }
    ctx.strokeStyle = theme.accent;
    ctx.fillStyle = theme.accent;
    for (const effect of effects.items) {
      const ratio = effect.age / c.visuals.explosionSec;
      ctx.globalAlpha = 1 - ratio;
      if (motion.matches) {
        const size = c.visuals.reducedEffectSizePx;
        ctx.fillRect(effect.x - size / 2, effect.y - size / 2, size, size); continue;
      }
      for (let i = 0; i < c.visuals.particleCount; i++) {
        const angle = i / c.visuals.particleCount * Math.PI * 2;
        const radius = effect.age * c.visuals.particleSpeed;
        ctx.fillRect(effect.x + Math.cos(angle) * radius, effect.y + Math.sin(angle) * radius, c.visuals.particleSizePx, c.visuals.particleSizePx);
      }
    }
    ctx.globalAlpha = 1;
    if (world.phase !== 'combat' && screen === 'playing') {
      ctx.fillStyle = theme.text;
      ctx.font = `600 ${c.visuals.intermissionFontPx}px ${c.visuals.font}`;
      ctx.textAlign = 'center';
      ctx.fillText(world.phase === 'respawning' ? c.ui.respawning : `${c.ui.intermission} ${world.waveIndex + 1}`, width / 2, height / 2);
    }
  }
  return { draw };
}
