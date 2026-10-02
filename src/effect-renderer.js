export function drawWaveBanner(ctx, config, label, caption, alpha) {
  const v = config.visuals;
  const theme = config.tuning.themes[config.tuning.theme ?? config.tuning.defaultTheme];
  const { width, height } = config.arena;
  ctx.save();
  ctx.globalAlpha = alpha * v.waveBannerAlpha;
  ctx.fillStyle = theme.arena;
  ctx.fillRect(0, (height - v.waveBannerHeightPx) / 2, width, v.waveBannerHeightPx);
  ctx.globalAlpha = alpha;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  if (caption) {
    ctx.fillStyle = theme.muted; ctx.font = `${v.scoreFontPx}px ${v.font}`;
    ctx.fillText(caption, width / 2, height / 2 - v.waveBannerFontPx / 2);
  }
  ctx.fillStyle = theme.accent; ctx.font = `bold ${v.waveBannerFontPx}px ${v.font}`;
  ctx.fillText(label, width / 2, height / 2 + (caption ? v.scoreFontPx / 2 : 0));
  ctx.restore();
}

export function drawEffects(ctx, effects, config, reducedMotion) {
  const v = config.visuals;
  const theme = config.tuning.themes[config.tuning.theme ?? config.tuning.defaultTheme];
  ctx.save();
  for (const effect of effects.items) {
    const ratio = effect.age / effect.life;
    ctx.globalAlpha = 1 - ratio;
    ctx.fillStyle = theme.accent;
    if (effect.kind === 'banner') {
      drawWaveBanner(ctx, config, `${config.ui.wave} ${effect.waveIndex}`, '', 1 - ratio);
    } else if (effect.kind === 'score') {
      ctx.font = `bold ${v.scoreFontPx}px ${v.font}`;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const text = `${config.ui.scorePrefix}${effect.points}`;
      const y = effect.y - (reducedMotion ? 0 : ratio * v.scoreRisePx);
      ctx.strokeStyle = theme.arena; ctx.lineWidth = v.scoreStrokePx;
      if (v.scoreStrokePx > 0) ctx.strokeText(text, effect.x, y);
      ctx.fillText(text, effect.x, y);
    } else if (effect.kind === 'muzzle') {
      if (reducedMotion) continue;
      ctx.globalAlpha *= v.muzzleAlpha;
      ctx.fillStyle = theme.text;
      const radius = v.muzzleRadiusPx * (1 - ratio);
      ctx.fillRect(effect.x - radius, effect.y - v.particleSizePx / 2, radius * 2, v.particleSizePx);
      ctx.fillRect(effect.x - v.particleSizePx / 2, effect.y - radius, v.particleSizePx, radius * 2);
    } else if (effect.kind === 'explosion') {
      if (reducedMotion) {
        const size = v.reducedEffectSizePx;
        ctx.fillRect(effect.x - size / 2, effect.y - size / 2, size, size);
        continue;
      }
      for (let i = 0; i < v.particleCount; i++) {
        const variation = ((i + effect.id) * (Math.sqrt(5) - 1) / 2) % 1;
        const angle = i / v.particleCount * Math.PI * 2;
        const radius = effect.age * v.particleSpeed * (1 - v.particleSpread + variation * v.particleSpread);
        const size = v.particleSizePx * (1 - ratio);
        ctx.fillStyle = i % 2 ? theme.accent : theme.text;
        ctx.fillRect(effect.x + Math.cos(angle) * radius - size / 2, effect.y + Math.sin(angle) * radius - size / 2, size, size);
      }
      if (effect.age < v.explosionFlashSec) {
        ctx.fillStyle = theme.text;
        ctx.beginPath();
        ctx.arc(effect.x, effect.y, v.reducedEffectSizePx * (1 - effect.age / v.explosionFlashSec), 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }
  ctx.restore();
}
