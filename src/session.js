export function createSession(config, worldFactory) {
  const session = { screen: 'loading', world: null, loadError: null };
  return {
    get screen() { return session.screen; },
    get world() { return session.world; },
    get loadError() { return session.loadError; },
    ready() { session.loadError = null; session.screen = 'title'; },
    fail(error) { session.loadError = error; session.screen = 'error'; },
    start() {
      if (!['title', 'gameOver'].includes(session.screen)) return false;
      session.world = worldFactory(config());
      session.screen = 'playing';
      return true;
    },
    pause() { if (session.screen === 'playing') session.screen = 'paused'; },
    resume() { if (session.screen === 'paused') session.screen = 'playing'; },
    finish() { if (session.screen === 'playing' && session.world?.gameOver) session.screen = 'gameOver'; },
  };
}
