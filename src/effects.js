export function createEffects() {
  const items = [];
  let nextId = 0;
  let hitAge = Infinity;
  let shakeAge = Infinity;
  function addItem(item, life) {
    if (life > 0) items.push({ ...item, id: nextId++, age: 0, life });
  }
  return {
    items,
    add(events, config) {
      const v = config.visuals;
      for (const event of events) {
        if (['enemyDestroyed', 'playerDestroyed'].includes(event.type)) {
          addItem({ kind: 'explosion', x: event.x, y: event.y, player: event.type === 'playerDestroyed' }, v.explosionSec);
          if (event.points > 0) addItem({ kind: 'score', x: event.x, y: event.y, points: event.points }, v.scorePopupSec);
        }
        if (['playerHit', 'playerDestroyed'].includes(event.type)) { hitAge = 0; shakeAge = 0; }
        if (['playerFired', 'enemyFired'].includes(event.type)) {
          const enemy = event.type === 'enemyFired';
          const offset = enemy ? config.enemyTypes[event.enemyTypeId].sizePx.height / 2 : 0;
          addItem({ kind: 'muzzle', x: event.x, y: event.y + offset, enemy }, v.muzzleSec);
        }
        if (event.type === 'waveStarted') addItem({ kind: 'banner', waveIndex: event.waveIndex }, v.waveBannerSec);
      }
      if (items.length > config.simulation.maxEffects) items.splice(0, items.length - config.simulation.maxEffects);
    },
    update(dt) {
      hitAge += dt; shakeAge += dt;
      for (const item of items) item.age += dt;
      for (let i = items.length - 1; i >= 0; i--) if (items[i].age >= items[i].life) items.splice(i, 1);
    },
    feedback(config, reducedMotion = false) {
      if (reducedMotion) return { flash: 0, x: 0, y: 0 };
      const v = config.visuals;
      const fade = v.shakeSec > 0 ? Math.max(0, 1 - shakeAge / v.shakeSec) : 0;
      const phase = shakeAge * v.shakeHz * Math.PI * 2;
      return {
        flash: v.hitFlashSec > 0 ? Math.max(0, 1 - hitAge / v.hitFlashSec) * v.hitFlashAlpha : 0,
        x: fade ? Math.sin(phase) * v.shakePx * fade : 0,
        y: fade ? Math.cos(phase) * v.shakePx * fade : 0,
      };
    },
    clear() { items.length = 0; hitAge = Infinity; shakeAge = Infinity; },
  };
}
