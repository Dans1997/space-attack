import { test } from 'node:test';
import assert from 'node:assert/strict';
import { CONFIG } from '../src/config.js';
import { createSession } from '../src/session.js';
import { createWorld } from '../src/world.js';

test('screen transitions gate start, pause, resume and full restart', () => {
  const session = createSession(() => CONFIG, createWorld);
  assert.equal(session.start(), false);
  session.ready(); assert.equal(session.screen, 'title');
  session.start(); const first = session.world;
  assert.equal(session.screen, 'playing');
  assert.equal(session.start(), false);
  session.pause(); assert.equal(session.screen, 'paused');
  session.resume(); assert.equal(session.world, first);
  first.score = 1234; first.gameOver = true; session.finish();
  assert.equal(session.screen, 'gameOver');
  for (let i = 0; i < 10; i++) {
    assert.equal(session.start(), true); assert.notEqual(session.world, first);
    assert.equal(session.world.score, 0); assert.equal(session.world.player.ships, CONFIG.player.ships);
    assert.equal(session.world.waveIndex, 1);
    session.world.gameOver = true; session.finish();
  }
});

test('loading failures can retry to title', () => {
  const session = createSession(() => CONFIG, createWorld);
  session.fail(new Error('missing sprite')); assert.equal(session.screen, 'error');
  assert.equal(session.start(), false); session.ready(); assert.equal(session.loadError, null);
});
