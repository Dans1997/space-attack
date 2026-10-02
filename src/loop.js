export function createLoop({ step, render, isRunning, config, requestFrame = requestAnimationFrame, cancelFrame = cancelAnimationFrame }) {
  let previous = null;
  let accumulator = 0;
  let handle;
  let active = false;
  function frame(timestamp) {
    if (!active) return;
    const rules = config().simulation;
    const elapsed = previous === null ? 0 : Math.min(Math.max((timestamp - previous) / 1000, 0), rules.maxFrameSec);
    previous = timestamp;
    if (isRunning()) {
      accumulator += elapsed;
      let steps = 0;
      while (accumulator >= rules.stepSec && steps < rules.maxSteps && isRunning()) {
        step(rules.stepSec);
        accumulator -= rules.stepSec;
        steps++;
      }
      if (steps === rules.maxSteps) accumulator %= rules.stepSec;
    } else accumulator = 0;
    render();
    handle = requestFrame(frame);
  }
  return {
    start() { if (active) return; active = true; previous = null; handle = requestFrame(frame); },
    resetTime() { previous = null; accumulator = 0; },
    stop() { active = false; cancelFrame(handle); previous = null; accumulator = 0; },
  };
}
