export function createEffects() {
  const items = [];
  return {
    items,
    add(events, config) {
      for (const event of events) {
        if (['enemyDestroyed', 'playerDestroyed', 'playerHit'].includes(event.type)) {
          items.push({ x: event.x, y: event.y, age: 0, hit: event.type === 'playerHit' });
        }
      }
      if (items.length > config.simulation.maxEffects) items.splice(0, items.length - config.simulation.maxEffects);
    },
    update(dt, config) {
      for (const item of items) item.age += dt;
      for (let i = items.length - 1; i >= 0; i--) if (items[i].age > config.visuals.explosionSec) items.splice(i, 1);
    },
    clear() { items.length = 0; },
  };
}
