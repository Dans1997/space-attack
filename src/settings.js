function clone(value) {
  return structuredClone(value);
}

function getPath(target, path) {
  return path.split('.').reduce((value, key) => value?.[key], target);
}

function setPath(target, path, value) {
  const parts = path.split('.');
  const key = parts.pop();
  const owner = parts.reduce((value, part) => value[part], target);
  owner[key] = value;
}

function readStorage(storage, key) {
  try {
    return JSON.parse(storage?.getItem(key) ?? 'null');
  } catch {
    return null;
  }
}

export function createSettings(baseConfig, storage) {
  if (storage === undefined) {
    try {
      storage = globalThis.localStorage;
    } catch {
      storage = null;
    }
  }
  const config = clone(baseConfig);
  const tuning = config.tuning;
  const storageKey = tuning.storageKey;
  const fields = new Map(tuning.fields.map((field) => [field.path, field]));
  const themes = new Set(Object.keys(tuning.themes));
  const playerShips = new Set(tuning.playerShips.map((ship) => ship.id));
  let theme = tuning.defaultTheme;
  tuning.theme = theme;
  let playerShipId = config.player.spriteId;
  let muted = Boolean(config.audio.startMuted);
  let persistError = !storage;

  function save() {
    try {
      if (!storage) throw new Error('Browser storage unavailable');
      storage.setItem(storageKey, JSON.stringify({
        version: config.tuning.version,
        fields: Object.fromEntries([...fields.keys()].map((path) => [path, getPath(config, path)])),
        theme,
        playerShipId,
        muted,
      }));
      persistError = false;
    } catch {
      persistError = true;
    }
  }

  function applySaved(saved) {
    if (!saved || saved.version !== tuning.version || typeof saved !== 'object') return;
    if (saved.fields && typeof saved.fields === 'object') {
      for (const [path, field] of fields) {
        const value = Number(saved.fields[path]);
        if (Number.isFinite(value)) setPath(config, path, normalize(value, field));
      }
    }
    if (themes.has(saved.theme)) theme = saved.theme;
    if (playerShips.has(saved.playerShipId)) playerShipId = saved.playerShipId;
    if (typeof saved.muted === 'boolean') muted = saved.muted;
    config.player.spriteId = playerShipId;
    config.audio.startMuted = muted;
    tuning.theme = theme;
  }

  function normalize(value, field) {
    const bounded = Math.min(field.max, Math.max(field.min, value));
    const steps = Math.round((bounded - field.min) / field.step);
    const stepped = Math.min(field.max, field.min + steps * field.step);
    return Number(stepped.toFixed(6));
  }

  applySaved(readStorage(storage, storageKey));

  function update(path, value) {
    if (fields.has(path)) {
      const number = Number(value);
      if (Number.isFinite(number)) setPath(config, path, normalize(number, fields.get(path)));
    } else if (path === 'tuning.theme' && themes.has(value)) {
      theme = value;
      config.tuning.theme = value;
    } else if (path === 'tuning.playerShip' && playerShips.has(value)) {
      playerShipId = value;
      config.player.spriteId = value;
    } else if (path === 'audio.muted' && typeof value === 'boolean') {
      muted = value;
      config.audio.startMuted = value;
    } else {
      return config;
    }
    save();
    return config;
  }

  function reset() {
    const defaults = clone(baseConfig);
    for (const key of Object.keys(config)) delete config[key];
    Object.assign(config, defaults);
    theme = tuning.defaultTheme;
    config.tuning.theme = theme;
    playerShipId = config.player.spriteId;
    muted = Boolean(config.audio.startMuted);
    save();
    return config;
  }

  return {
    config,
    update,
    reset,
    get persistError() { return persistError; },
    get values() {
      return {
        fields: Object.fromEntries([...fields.keys()].map((path) => [path, getPath(config, path)])),
        theme,
        playerShipId,
        muted,
      };
    },
  };
}
