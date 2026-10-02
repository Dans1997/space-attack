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
- P or Escape: pause/resume. Leaving the page pauses combat. Main menu on the pause and loss screens discards the run and returns to the title.
- M: mute/unmute; the choice persists across reloads. Music attempts to start automatically and retries on the first click or keypress if autoplay is blocked.
- T: Flight tuning. Choose speed, firing interval, dive speed, difficulty growth, music/effects volume, theme and a blue, red or green pilot ship. Enemy shapes are excluded. Starfield, combat feedback and arcade presentation sections expose every new feel value, including crossfade, shake, banner, fade and title bob controls. All are saved in this browser's localStorage. Reset defaults restores the original values. Closing tuning leaves a running game paused; P resumes. T closes the panel when focus is outside a form field, and Escape always closes it.

The HUD shows score, wave, remaining ships including the active ship, and hull health. Enemy kills award points once. Enemy bullets deplete hull and consume reserve ships; direct enemy contact ends the run immediately, even with full hull or protection. Formation enemies stop at the last row. Only interceptors dive; missed dives exit below the screen harmlessly, keeping their original orientation. Exhausting the fleet also opens game over. Waves repeat with capped increasing pressure.

## Project layout

```text
index.html, styles.css       Game shell, HUD, screens and arcade styling
tuning.css                  Responsive tuning dialog
src/config.js               All gameplay, presentation, theme and asset defaults
src/main.js                 Bootstrap and module integration
src/session.js, loop.js     Screen state machine and fixed-step game loop
src/world.js                Simulation orchestration
src/player.js, enemies.js   Player and enemy movement
src/waves.js                Wave templates and difficulty progression
src/projectiles.js          Projectile motion and lifetime
src/collisions.js           Swept collisions, damage and scoring
src/renderer.js             Canvas scene rendering
src/starfield.js             Parallax layers
src/effects.js              Transient effect lifetimes and feedback
src/effect-renderer.js      Particles, muzzle flashes, score and wave banners
src/ui.js, input.js         DOM screens/HUD and keyboard input
src/audio.js, assets.js     Music/SFX playback and asset loading
src/settings.js, tuning.js  Validated settings, localStorage and tuning controls
src/validation.js           Configuration validation
assets/                    Selected PNG/OGG assets and license notice
tests/                     Node unit tests
tools/server.js            Local HTTP server
tools/export-site.js       Copy only playable files into ignored dist/
.openai/hosting.json        Codex Sites identity and static output directory
prompts.md                 User prompts from this session
```

## Change themes and values

`src/config.js` centralizes gameplay data, assets, keyboard bindings, audio, themes, UI text and presentation tokens. The player ship picker uses three matching Kenney pilot variants with unchanged hitboxes. Old saved enemy-shaped pilot selections fall back to blue. Speed and audio changes apply immediately; derived wave pressure updates on the next wave. Reset does not restart the current run.

For a quick change, press **T**, choose a theme or edit a dial, and close the panel. For permanent defaults, edit `CONFIG` in `src/config.js`; for example, set `player.speedPxSec` to `420`, `audio.fadeSec` to `0.8`, or `tuning.defaultTheme` to `'phosphor'`. Units are named explicitly: seconds, logical pixels and pixels per second; opacity and volume use 0–1. The simulation arena stays independent of display size.

Themes live in `tuning.themes`, keyed by a stable ID. To add one, copy an existing record, give it a new ID and label, then change its `background`, `surface`, `text`, `muted`, `accent`, `ink`, `border` and `arena` hex colors. Select that ID in `defaultTheme` or in the tuning picker. Keep text and controls readable; `npm test` checks every theme's contrast.

Numeric tuning controls are descriptors in `tuning.fields` (some are appended by the `dial` helper at the bottom of config): `{ path, label, min, max, step, unit, group }`. `path` is a dot path into `CONFIG`, including array indices, such as `visuals.starLayers.0.speedPxSec`. Text controls use `type: 'text'`; color controls use `type: 'color'`. Add the default and its descriptor together to make a new value adjustable and persistent. Preserve valid bounds and follow existing descriptors.

To swap artwork or audio, update the keyed entries under `assets.images`, `assets.sounds` or `assets.music`, then reference those IDs from player/enemy types or audio event/track mappings. Preserve the player-only ship picker, use OGG for audio, keep `assets/` below 5,000,000 bytes and update `CREDITS.md` for each file.

Saved browser settings override changed defaults for the same storage version. Use **Reset defaults** after editing config to see the new defaults, or clear only `space-attack.settings.v1` from localStorage. Settings are local to each browser and site origin; no player account or backend is needed.

## Tests

```powershell
npm test
```

Tests use Node's built-in runner. They cover movement/firing, swept collisions, health/respawn, wave limits, state transitions, loop timing, input, settings, audio races, assets and theme contrast. No packages are installed.

Run one file with `node --test tests/effects.test.js`. Run the full `npm test` suite before every commit. A failing test must be resolved before committing; unit tests complement browser playtesting and do not prove subjective music quality or performance on every device.

## Static hosting

```powershell
npm run export
```

This copies `index.html`, both stylesheets, `src/`, `assets/` and `CREDITS.md` into `dist/`. It does not install dependencies, transpile code, or publish anything. `dist/` is generated and ignored by Git. Serve that directory on any static host; asset paths are relative so a GitHub Pages project subpath also works. Codex Sites uses `.openai/hosting.json` and deploys this output from the merged `main` source. The deployed game uses public access and has no sign-in requirement.

See PLAN.md for architecture and acceptance status, CREDITS.md for every included asset and VALIDATION.md for executed checks and remaining limits.
