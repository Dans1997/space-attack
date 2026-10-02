import { createStarfield } from './starfield.js';
import { drawEffects, drawWaveBanner } from './effect-renderer.js';

export function createRenderer(canvas, assets, config, effects) {
  const ctx = canvas.getContext('2d');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const stars = createStarfield();
  let time = 0;
  function sprite(id, x, y, width, height, angle = 0) {
    const img = assets.images[id];
    if (!img) return;
    ctx.save(); ctx.translate(x, y); ctx.rotate(angle);
    ctx.drawImage(img, -width / 2, -height / 2, width, height); ctx.restore();
  }
  function draw(world, screen, dt = 0) {
    const c = config();
    const theme = c.tuning.themes[c.tuning.theme ?? c.tuning.defaultTheme];
    const { width, height } = c.arena;
    if (['playing', 'title', 'gameOver'].includes(screen)) time += dt;
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
    ctx.save();
    const feedback = effects.feedback(c, motion.matches);
    ctx.translate(feedback.x, feedback.y);
    ctx.fillStyle = theme.text;
    stars.draw(ctx, c, time, world?.player.x ?? width / 2, motion.matches);
    if (!world) { ctx.restore(); return; }
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
        const flicker = 1 + Math.sin(time * c.visuals.thrusterHz * Math.PI * 2) * c.visuals.thrusterFlicker;
        sprite(`fire${frame}`, p.x, p.y + c.visuals.flameOffset, c.visuals.flameSize.width, c.visuals.flameSize.height * flicker);
      }
      sprite(c.player.spriteId, p.x, p.y, p.width, p.height);
      ctx.globalAlpha = 1;
    }
    drawEffects(ctx, effects, c, motion.matches);
    ctx.restore();
    if (feedback.flash > 0) {
      ctx.globalAlpha = feedback.flash;
      ctx.fillStyle = theme.text; ctx.fillRect(0, 0, width, height);
      ctx.globalAlpha = 1;
    }
    if (world.phase !== 'combat' && screen === 'playing') {
      const intermission = world.phase === 'intermission';
      const elapsed = intermission ? c.waves.intermissionSec - world.phaseRemainingSec : 0;
      const alpha = intermission ? Math.max(0, 1 - elapsed / c.visuals.waveBannerSec) : 1;
      drawWaveBanner(ctx, c, intermission ? `${c.ui.intermission} ${world.waveIndex + 1}` : c.ui.respawning,
        intermission ? c.ui.waveCleared : '', motion.matches ? 1 : alpha);
    }
  }
  return { draw };
}
