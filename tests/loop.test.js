import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createLoop } from '../src/loop.js';
import { CONFIG } from '../src/config.js';

test('loop clamps long frames and discards time while paused', () => {
  let callback, count = 0, running = true, renders = 0;
  const loop = createLoop({ config: () => CONFIG, requestFrame: fn => { callback = fn; return 1; }, cancelFrame() {}, step: () => count++, render: () => renders++, isRunning: () => running });
  loop.start(); callback(0); callback(10000);
  assert.ok(count <= CONFIG.simulation.maxSteps && count > 0);
  const initial = count; running = false; callback(20000); assert.equal(count, initial);
  loop.resetTime(); running = true; callback(30000); assert.equal(count, initial);
  callback(30020); assert.equal(count, initial + 1);
  loop.stop(); callback(40000); assert.equal(count, initial + 1); assert.ok(renders > 0);
});
