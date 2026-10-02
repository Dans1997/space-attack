export function createStarfield() {
  const cache = new Map();
  const golden = (Math.sqrt(5) - 1) / 2;
  return {
    draw(ctx, config, time, playerX, reducedMotion) {
      const { width, height } = config.arena;
      config.visuals.starLayers.forEach((layer, layerIndex) => {
        const cached = cache.get(layerIndex);
        if (!cached || cached.count !== layer.count) {
          cache.set(layerIndex, { count: layer.count, stars: Array.from({ length: layer.count }, (_, i) => {
            const seed = i + layerIndex * layer.count + 1;
            return { x: (seed * golden) % 1, y: (seed * (Math.sqrt(2) - 1)) % 1 };
          }) });
        }
        ctx.globalAlpha = layer.alpha;
        const offset = reducedMotion ? 0 : (playerX - width / 2) * layer.parallax;
        for (const star of cache.get(layerIndex).stars) {
          const x = ((star.x * width - offset) % width + width) % width;
          const y = (star.y * height + (reducedMotion ? 0 : time * layer.speedPxSec)) % height;
          ctx.fillRect(x, y, layer.radiusPx, layer.radiusPx);
        }
      });
      ctx.globalAlpha = 1;
    },
  };
}
