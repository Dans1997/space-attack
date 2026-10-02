# Space Attack

A browser formation shooter made with plain HTML, CSS and JavaScript modules. No dependencies or build step.

## Run

Use the existing Node.js 22+ installation:

```powershell
npm start
```

Open http://127.0.0.1:4173. Keep the server terminal running; Ctrl+C stops it. An optional port can be passed with `npm start -- 4174`. Serve over HTTP rather than opening index.html directly.

## Fly

- Left/right arrows or A/D: move. Hold Space to fire.
- Enter or Launch ship: start; Enter or Fly again: restart.
- P or Escape: pause/resume. Leaving the page pauses combat.
- M: mute/unmute.
- T: Flight tuning. Choose speed, firing interval, dive speed, difficulty growth, music/effects volume, theme and ship sprites. All are saved in this browser's localStorage. Reset defaults restores the original values. Closing tuning leaves a running game paused; P resumes. T closes the panel when focus is outside a form field, and Escape always closes it.

The HUD shows score, wave, remaining ships including the active ship, and hull health. Enemy kills award points once. Enemy bullets deplete hull and consume reserve ships; direct enemy contact ends the run immediately, even with full hull or protection. Enemies stop at the last row and remain on screen. Exhausting the fleet also opens game over. Waves repeat with capped increasing pressure.

## Configure and test

`src/config.js` centralizes gameplay data, assets, keyboard bindings, audio, themes, UI text and presentation tokens. Ship pickers reuse the credited sprites with unchanged hitboxes. Speed and audio changes apply immediately; derived wave pressure updates on the next wave. Reset does not restart the current run.

```powershell
npm test
```

Tests use Node's built-in runner. They cover movement/firing, swept collisions, health/respawn, wave limits, state transitions, loop timing, input, settings, audio races, assets and theme contrast. No packages are installed.

See PLAN.md for architecture and acceptance status, CREDITS.md for every included asset and VALIDATION.md for executed checks and remaining limits.
