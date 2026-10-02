export function getWaveDifficulty(config, waveIndex) {
  const { waves } = config;
  const requestedWave = Math.max(1, Math.floor(waveIndex));
  const templateIndex = (requestedWave - 1) % waves.templates.length;
  const template = waves.templates[templateIndex];
  const level = requestedWave - 1;
  const speedMultiplier = Math.min(waves.caps.speedMultiplier, 1 + level * waves.growth.speedPerWave);
  let formationSpeedPxSec = 0, fireIntervalSec = Infinity, diveIntervalSec = Infinity, maxDivers = 0;
  for (let index = 0; index < waves.templates.length; index += 1) {
    const latestWave = requestedWave - ((requestedWave - 1 - index + waves.templates.length) % waves.templates.length);
    if (latestWave < index + 1) continue;
    const priorLevel = latestWave - 1;
    const priorTemplate = waves.templates[index];
    const priorMultiplier = Math.min(waves.caps.speedMultiplier, 1 + priorLevel * waves.growth.speedPerWave);
    formationSpeedPxSec = Math.max(formationSpeedPxSec, priorTemplate.formationSpeedPxSec * priorMultiplier);
    fireIntervalSec = Math.min(fireIntervalSec, priorTemplate.fireIntervalSec * Math.pow(waves.growth.fireIntervalFactor, priorLevel));
    diveIntervalSec = Math.min(diveIntervalSec, priorTemplate.diveIntervalSec / priorMultiplier);
    maxDivers = Math.max(maxDivers, priorTemplate.maxDivers + Math.floor(priorLevel / waves.templates.length));
  }
  const cycle = Math.floor(level / waves.templates.length);
  return { template, speedMultiplier, formationSpeedPxSec,
    fireIntervalSec: Math.max(waves.caps.minFireIntervalSec, fireIntervalSec),
    diveIntervalSec: Math.max(waves.caps.minDiveIntervalSec, diveIntervalSec),
    maxDivers: Math.min(waves.caps.maxDivers, maxDivers),
    extraEnemies: Math.min(waves.caps.enemyCount, cycle * waves.growth.extraEnemiesPerCycle) };
}

export function beginWave(world, config, random = Math.random) {
  const difficulty = getWaveDifficulty(config, world.waveIndex);
  world.difficulty = difficulty;
  const cap = Math.max(0, Math.floor(config.waves.caps.enemyCount));
  const flattened = difficulty.template.rows.flat().slice(0, cap);
  const extraType = flattened.at(-1) ?? 'scout';
  const widestEnemy = Math.max(0, ...flattened.map((typeId) => config.enemyTypes[typeId].sizePx.width));
  const tallestEnemy = Math.max(0, ...flattened.map((typeId) => config.enemyTypes[typeId].sizePx.height));
  const usableWidth = Math.max(0, config.arena.width - 2 * config.arena.paddingPx - widestEnemy);
  const requestedSpacing = Math.max(0, difficulty.template.spacingPx.x);
  const templateCols = Math.max(1, ...difficulty.template.rows.map((row) => row.length));
  const maxCols = Math.max(1, Math.min(templateCols, cap || 1, requestedSpacing > 0 ? Math.floor(usableWidth / requestedSpacing) + 1 : templateCols));
  const spacingX = maxCols > 1 ? Math.min(requestedSpacing, usableWidth / (maxCols - 1)) : 0;
  const floorY = Math.min(config.arena.enemyFloorY, config.arena.height - tallestEnemy / 2);
  const usableHeight = Math.max(0, floorY - config.arena.paddingPx - tallestEnemy);
  const requestedSpacingY = Math.max(0, difficulty.template.spacingPx.y);
  const maxRows = Math.max(1, requestedSpacingY > 0 ? Math.floor(usableHeight / requestedSpacingY) + 1 : cap || 1);
  const baseRows = [];
  let remainingBase = cap;
  for (const sourceRow of difficulty.template.rows.slice(0, maxRows)) {
    const kept = sourceRow.slice(0, maxCols).slice(0, remainingBase);
    if (kept.length) baseRows.push(kept);
    remainingBase -= kept.length;
    if (remainingBase <= 0) break;
  }
  let count = baseRows.reduce((sum, row) => sum + row.length, 0);
  const extraCapacity = Math.max(0, maxRows - baseRows.length) * maxCols;
  const targetCount = Math.min(cap, count + extraCapacity, count + difficulty.extraEnemies);
  const rows = baseRows;
  while (count < targetCount) {
    const rowSize = Math.min(maxCols, targetCount - count);
    rows.push(Array(rowSize).fill(extraType));
    count += rowSize;
  }
  const totalWidth = (maxCols - 1) * spacingX;
  const originX = Math.max(config.arena.paddingPx + widestEnemy / 2,
    Math.min(config.arena.width - config.arena.paddingPx - widestEnemy / 2 - totalWidth, difficulty.template.origin.x));
  const spacingY = requestedSpacingY;
  const totalHeight = Math.max(0, rows.length - 1) * spacingY;
  const originY = Math.max(config.arena.paddingPx + tallestEnemy / 2,
    Math.min(floorY - totalHeight, difficulty.template.origin.y));
  world.enemies = [];
  rows.forEach((row, rowIndex) => row.forEach((typeId, colIndex) => {
    const type = config.enemyTypes[typeId];
    const x = originX + colIndex * spacingX;
    const y = originY + rowIndex * spacingY;
    world.enemies.push({ id: world.nextEntityId++, typeId, x, y, prevX: x, prevY: y,
      slotX: x, slotY: y, width: type.sizePx.width, height: type.sizePx.height, spriteId: type.spriteId,
      health: type.health, alive: true, diving: false, diveElapsedSec: 0, diveOriginX: x,
      hitboxInsetPx: type.hitboxInsetPx });
  }));
  world.formation.direction = 1; world.formation.offsetX = 0;
  world.formation.fireCooldownSec = difficulty.fireIntervalSec * (0.5 + random() * 0.5);
  world.formation.diveCooldownSec = difficulty.diveIntervalSec;
}

export function updateWaves(world, dt, config, random = Math.random) {
  if (world.enemies.some((enemy) => enemy.alive)) return;
  world.phase = 'intermission'; world.phaseRemainingSec = config.waves.intermissionSec;
  if (config.damage.clearShotsOnWave) world.projectiles = [];
}
