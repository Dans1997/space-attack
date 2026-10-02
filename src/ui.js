export const keyLabel = (code) => ({ ArrowLeft: '←', ArrowRight: '→', Space: 'Space', Escape: 'Esc' }[code] ?? code.replace(/^Key/, ''));

export function applyTheme(config) {
  const root = document.documentElement;
  const theme = config.tuning.themes[config.tuning.theme ?? config.tuning.defaultTheme];
  for (const [name, value] of Object.entries(theme)) if (name !== 'label') root.style.setProperty(`--${name}`, value);
  for (const [name, value] of Object.entries(config.visuals.css)) root.style.setProperty(`--${name}`, value);
  root.style.setProperty('--font', config.visuals.font);
  document.querySelector('meta[name="theme-color"]').content = theme.background;
}

export function createUi(config) {
  const element = id => document.getElementById(id);
  let lastScreen;
  let lastWave;
  function configure() {
    const c = config();
    applyTheme(c);
    for (const [id, value] of Object.entries({ brand: c.meta.title, edition: c.ui.edition, 'score-label': c.ui.score, 'wave-label': c.ui.wave, 'ships-label': c.ui.ships, 'health-label': c.ui.health, 'final-score-label': c.ui.finalScore, 'final-wave-label': c.ui.finalWave, 'footer-copy': c.ui.footer, credits: c.ui.credits })) element(id).textContent = value;
    element('game').setAttribute('aria-label', c.ui.canvasLabel);
    element('health').setAttribute('aria-label', c.ui.health);
    element('credits').href = c.meta.creditsPath;
    element('hero-ship').src = c.assets.images[c.player.spriteId].path;
    document.querySelector('.identity img').src = c.assets.images[c.player.spriteId].path;
    document.querySelector('link[rel="icon"]').href = c.assets.images[c.player.spriteId].path;
    element('pause-button').textContent = `${c.ui.pause} (${keyLabel(c.controls.pause[0])})`;
    element('tuning-button').textContent = `${c.ui.tuning} (${keyLabel(c.controls.tuning[0])})`;
    element('menu-button').textContent = c.ui.mainMenu;
    element('controls').setAttribute('aria-label', c.ui.controls);
    element('controls').replaceChildren(...[
      [c.ui.moveLabel, `${c.controls.left.map(keyLabel).join(' / ')} · ${c.controls.right.map(keyLabel).join(' / ')}`],
      [c.ui.fireLabel, keyLabel(c.controls.fire[0])], [c.ui.pauseLabel, keyLabel(c.controls.pause[0])],
      [c.ui.muteLabel, keyLabel(c.controls.mute[0])], [c.ui.tuningLabel, keyLabel(c.controls.tuning[0])],
    ].map(([name, keys]) => {
      const line = document.createElement('span'); line.className = 'control';
      const key = document.createElement('kbd'); key.textContent = keys;
      const label = document.createElement('span'); label.textContent = name;
      line.append(key, label); return line;
    }));
    lastScreen = undefined;
  }
  function update(session, muted) {
    const c = config();
    const world = session.world;
    const player = world?.player;
    element('score').textContent = String(world?.score ?? 0).padStart(c.ui.scoreDigits, '0');
    element('wave').textContent = String(world?.waveIndex ?? 1).padStart(2, '0');
    element('ships').textContent = String(player?.ships ?? c.player.ships);
    const health = Math.max(0, player?.health ?? c.player.maxHealth);
    element('health').max = c.player.maxHealth;
    element('health').value = health;
    element('health-value').textContent = `${Math.round(health / c.player.maxHealth * 100)}%`;
    element('mute-button').textContent = `${muted ? c.ui.unmute : c.ui.mute} (${keyLabel(c.controls.mute[0])})`;
    element('mute-button').setAttribute('aria-pressed', String(muted));
    element('pause-button').disabled = !['playing', 'paused'].includes(session.screen);
    element('pause-button').textContent = `${session.screen === 'paused' ? c.ui.resume : c.ui.pause} (${keyLabel(c.controls.pause[0])})`;
    if (session.screen === 'playing' && world?.waveIndex !== lastWave) {
      lastWave = world.waveIndex;
      element('announcement').textContent = `${c.ui.wave} ${world.waveIndex}`;
    }
    if (lastScreen === session.screen) return;
    lastScreen = session.screen;
    const playing = session.screen === 'playing';
    if (playing) element('announcement').textContent = `${c.ui.wave} ${world.waveIndex}`;
    element('screen').hidden = playing;
    element('results').hidden = session.screen !== 'gameOver';
    element('menu-button').hidden = !['paused', 'gameOver'].includes(session.screen);
    element('hero-ship').hidden = !['title', 'loading'].includes(session.screen);
    const states = {
      loading: [c.ui.loading, '', null], title: [c.ui.title, c.ui.titleBody, c.ui.start],
      paused: [c.ui.paused, c.ui.pauseBody, c.ui.resume], gameOver: [c.ui.gameOver, c.ui.gameOverBody, c.ui.restart],
      error: [c.ui.loadError, session.loadError?.message ?? '', c.ui.retry],
    };
    if (!playing) {
      const [title, body, action] = states[session.screen];
      element('screen-title').textContent = title;
      element('screen-body').textContent = body;
      element('screen-kicker').textContent = session.screen === 'title' ? c.ui.subtitle : c.meta.title;
      element('screen-action').hidden = action === null;
      element('screen-action').textContent = action ?? '';
      element('confirm-hint').textContent = action === null ? '' : `${keyLabel(c.controls.confirm[0])} · ${action}`;
      element('final-score').textContent = String(world?.score ?? 0).padStart(c.ui.scoreDigits, '0');
      element('final-wave').textContent = String(world?.waveIndex ?? 1);
      element('announcement').textContent = title;
      if (action !== null && !document.querySelector('dialog[open]')) element('screen-action').focus({ preventScroll: true });
    }
  }
  configure();
  return { configure, update, notice(message) { element('notice').textContent = message; } };
}
