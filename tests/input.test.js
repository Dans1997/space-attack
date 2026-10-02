import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createInput } from '../src/input.js';
import { CONFIG } from '../src/config.js';

test('keyboard holds actions, clears on blur, and fires shortcuts once per press', () => {
  const target = new EventTarget();
  const calls = [];
  const input = createInput({ target, bindings: () => CONFIG.controls, onAction: action => calls.push(action), canPlay: () => true });
  function dispatch(type, code, repeat = false) {
    const event = new Event(type, { cancelable: true });
    Object.assign(event, { code, repeat }); target.dispatchEvent(event); return event;
  }
  dispatch('keydown', 'KeyD'); dispatch('keydown', 'Space');
  assert.deepEqual(input.read(), { left: false, right: true, fire: true });
  dispatch('keyup', 'KeyD'); assert.equal(input.read().right, false);
  dispatch('keydown', 'KeyP'); dispatch('keydown', 'KeyP', true); dispatch('keydown', 'KeyM'); dispatch('keydown', 'KeyT');
  assert.deepEqual(calls, ['pause', 'mute', 'tuning']);
  input.clear(); assert.equal(input.read().fire, false);
  input.destroy(); dispatch('keydown', 'Space'); assert.equal(input.read().fire, false);
});

test('typing in form controls and button activation do not drive the ship', () => {
  const target = new EventTarget();
  let kind = 'input';
  target.closest = selector => selector.split(/,\s*/).includes(kind) ? target : null;
  const calls = [];
  const input = createInput({ target, bindings: () => CONFIG.controls, onAction: action => calls.push(action), canPlay: () => true });
  const key = code => { const event = new Event('keydown', { cancelable: true }); Object.assign(event, { code }); target.dispatchEvent(event); return event; };
  key('KeyD'); key('KeyP'); assert.equal(input.read().right, false); assert.deepEqual(calls, []);
  kind = 'button'; const enter = key('Enter'); assert.equal(enter.defaultPrevented, false);
  key('Space'); assert.equal(input.read().fire, false); assert.deepEqual(calls, []);
  kind = 'canvas'; key('KeyT'); assert.deepEqual(calls, ['tuning']);
  input.destroy();
});
