export function validateConfig(config) {
  const positive = (value, name) => { if (!Number.isFinite(value) || value <= 0) throw new Error(`Invalid positive value: ${name}`); };
  for (const [key, value] of Object.entries(config.arena)) positive(value, `arena.${key}`);
  for (const key of ['speedPxSec', 'maxHealth', 'ships', 'fireIntervalSec', 'respawnDelaySec']) positive(config.player[key], `player.${key}`);
  positive(config.simulation.stepSec, 'simulation.stepSec');
  positive(config.simulation.maxSteps, 'simulation.maxSteps');
  if (!config.waves.templates.length) throw new Error('At least one wave template is required');
  for (const template of config.waves.templates) {
    if (!template.rows.length || template.rows.some(row => !row.length)) throw new Error(`Empty wave: ${template.id}`);
    for (const type of template.rows.flat()) if (!config.enemyTypes[type]) throw new Error(`Unknown enemy: ${type}`);
    for (const key of ['formationSpeedPxSec', 'fireIntervalSec', 'diveIntervalSec']) positive(template[key], key);
  }
  for (const entity of [config.player, ...Object.values(config.enemyTypes), ...Object.values(config.projectileTypes)]) {
    if (!config.assets.images[entity.spriteId]) throw new Error(`Unknown sprite: ${entity.spriteId}`);
    positive(entity.sizePx.width, 'size width'); positive(entity.sizePx.height, 'size height');
    if (entity.projectileId && !config.projectileTypes[entity.projectileId]) throw new Error(`Unknown projectile: ${entity.projectileId}`);
  }
  for (const [key, codes] of Object.entries(config.controls)) if (!Array.isArray(codes) || !codes.length || codes.some(code => typeof code !== 'string')) throw new Error(`Invalid controls: ${key}`);
  for (const key of ['masterVolume', 'musicVolume', 'sfxVolume']) if (!Number.isFinite(config.audio[key]) || config.audio[key] < 0 || config.audio[key] > 1) throw new Error(`Invalid volume: ${key}`);
  if (!config.tuning.themes[config.tuning.theme ?? config.tuning.defaultTheme]) throw new Error('Unknown theme');
  return config;
}
