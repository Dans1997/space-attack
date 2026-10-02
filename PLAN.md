# Space Attack implementation plan

## Phase boundary

This baseline contains planning documents and selected, credited assets only. No game code is implemented. Commit the baseline on `main`, then stop for user review. All future code is written with Codex only. No new dependencies are needed or approved.

## Reference and direction

Reference: [Space Attack Longplay (Emerson Arcadia 2001 Game), RetroGamingLoft](https://www.youtube.com/watch?v=jYIC8ADIArc), approximately 4:45.

The watch skill's local download failed with `HTTP Error 403: Forbidden`; it extracted no frames or captions. Browser playback succeeded, and Codex inspected sampled visuals at approximately 0:00, 0:28, 1:25, 2:22, 3:20, 4:16 and 4:44. This is sampled visual evidence, not a claim to have reviewed every frame or the audio. No other AI service was used.

Observed: black playfield; compact colored enemy formation at the top; cyan ship near the bottom; vertical projectiles; score counters across the top; green energy bar and spare-ship indicators below. At about 3:20 enemies are visible below the formation, suggesting dive attacks. The final sampled frame still shows combat; a game-over/restart flow was not established by the reference.

Adaptation: keep the readable formation-shooter composition, lateral piloting and upward shots, then use the selected Kenney artwork with a restrained starfield, clear DOM HUD and short impact feedback. Start, pause, game over, restart, modern keyboard instructions and the difficulty curve below are proposed features driven by the user's requirements. No reference sprites or video/audio will be redistributed.

## Proposed file layout

Only AGENTS.md, PLAN.md, CREDITS.md, assets and validation notes exist in the baseline. The remaining files are to be created after review.

```text
space-attack/
  AGENTS.md
  PLAN.md
  CREDITS.md                # every included file, provenance, use and license
  VALIDATION.md             # baseline checks and limitations
  .gitignore                # introduced with implementation tooling
  index.html                # semantic shell, Canvas, HUD, screen buttons
  styles.css                # layout using config-supplied CSS custom properties
  package.json              # type: module; npm test => node --test; no dependencies
  README.md                 # local HTTP serving, controls and tests
  assets/
    images/                 # only selected PNGs
    audio/                  # selected OGG music and explosions
    KENNEY-LICENSE.txt       # supplied notice, counted in size budget
  src/
    config.js               # sole source of customizable data
    main.js                 # bootstrap and connect modules
    assets.js               # load asset manifest and report failures
    input.js                # key state and action edges; clears on blur
    session.js              # screen transitions and fresh-run reset
    loop.js                 # requestAnimationFrame and fixed simulation steps
    world.js                # serializable world creation and update orchestration
    player.js               # movement, shot cooldown and respawn
    enemies.js              # formation and dive movement
    waves.js                # wave creation, completion and difficulty parameters
    projectiles.js          # projectile advancement and lifetime
    collisions.js           # swept hit detection and ordered damage resolution
    effects.js              # bounded transient visual effects
    renderer.js             # Canvas drawing only
    ui.js                   # DOM HUD, screens, focus and config CSS variables
    audio.js                # user-gesture unlock, tracks, effects, mute
  tests/
    config.test.js
    session.test.js
    simulation.test.js
    collisions.test.js
    waves.test.js
    assets.test.js
```

Add modules only as their jobs become necessary; combine trivial adjacent responsibilities if splitting them would add ceremony. No entity-component framework, inheritance hierarchy, networking or editor is planned.

## Game loop and state

Screens: `loading -> title -> playing -> gameOver`; `playing <-> paused`. Asset-loading failure presents a readable error and Retry. Start/Enter begins a fresh run; Restart/Enter from game over creates a completely new world. Pause/Escape suspends simulation; Resume requires an explicit action. Blur/hidden tabs clear keys, pause gameplay and suspend audio. Resuming resets the loop accumulator so background time cannot advance combat.

Session shape: `{ screen, world, input, audio: { unlocked, muted }, loadError }`. World shape: `{ elapsedSec, score, waveIndex, phase, phaseRemainingSec, player, enemies, projectiles, effects, formation, nextEntityId }`. World phases are `combat`, `intermission`, `respawning`. Entities use stable ids, current/previous position, dimensions, hitbox, health, type and alive status. Input holds action states and pressed edges; it is not coupled to DOM events in the simulation.

Use a 60 Hz fixed step and requestAnimationFrame for rendering. Clamp accumulated elapsed time and bound catch-up work. Units are logical pixels, seconds, pixels/second, degrees and integer points. World coordinates stay at a configured 800 x 600; scale the canvas proportionally for display and device pixel ratio without changing physics. HUD and controls remain legible outside the canvas.

Update order: consume input; move player; move enemies; spawn/advance shots; resolve collisions; remove dead/offscreen entities; advance wave/respawn state; publish events for audio/effects. Rendering never modifies simulation. Randomness is injectable and seeded in tests. Render only alive entities and bounded effect pools.

## Controls, combat and progression

- Arrow Left/Right or A/D move horizontally within the arena; Space fires while held, limited by a configured cooldown. The instruction strip remains visible, and title instructions derive labels from the same binding config. Enter starts/restarts; Escape pauses/resumes; M mutes. Prevent scrolling for bound play keys only while the game is focused; do not fire when a DOM button/text control owns the event.
- Default health is 100 and total ships is 3 (the HUD labels total ships, including the current ship). A hit removes 35 health; contact/escape damage is separately configured. Health zero consumes one ship. Remaining ships respawn at full health after a short delay with temporary invulnerability; zero ships enters game over. Clear hostile shots on respawn. No repeated damage from one consumed projectile or during invulnerability.
- Player bullets damage enemies and award configured points once on a kill. Enemy bullets and enemy contact damage the player. Escaped divers return to their formation slot; a configurable crossing of the defense line costs health, with no kill score. Formation/bullet bounds, simultaneous hits, dead entities and offscreen cleanup have explicit tests.
- Use inset rectangular hitboxes and swept projectile-vs-hitbox tests from previous to current position to avoid tunneling. Resolve each non-piercing shot against the nearest valid target; consume it once. Award score only on the alive-to-dead transition. Terminal player damage takes precedence over starting another wave.
- Wave 1 introduces a formation and light enemy fire. Subsequent waves reuse ordered templates, adding capped speed, enemy count, attack frequency and projectile pressure. Waves 1-3 introduce scout, diver and armored types; unlocks must refer to actual downloaded sprites. Begin the next wave only when all enemies are destroyed and a configured intermission ends. Clear leftover shots at the boundary.
- Endless waves are the default. Repeat templates with a cycle multiplier, bounded counts and minimum firing intervals so difficulty rises without unbounded object growth. No boss, shop, powerup tree or save system is needed.

## Configuration contract

`src/config.js` exports one plain `CONFIG` object. All values below are design defaults, to be tuned during browser testing. This document specifies data, not implemented code. Arrays express order; records are keyed by stable ids; asset paths are repository-relative strings. No functions in configuration. File references must match CREDITS.md; final filenames are taken from its downloaded inventory.

| Section | Fields and formats |
| --- | --- |
| `meta` | `title: string`, `version: string`, `creditsPath: string` |
| `arena` | `width: 800`, `height: 600`, `paddingPx: 24`, `playerY: 540`, `defenseLineY: 560` |
| `simulation` | `stepSec: 1/60`, `maxFrameSec: 0.1`, `maxSteps: 6`, `maxProjectiles: 160`, `maxEffects: 64` |
| `controls` | action-to-`KeyboardEvent.code[]` record; left `[ArrowLeft, KeyA]`, right `[ArrowRight, KeyD]`, fire `[Space]`, confirm `[Enter]`, pause `[Escape]`, mute `[KeyM]`; display names and instructions derived from this data |
| `player` | `spriteId`, `sizePx: {width,height}`, `hitboxInsetPx`, `speedPxSec: 360`, `maxHealth: 100`, `ships: 3`, `fireIntervalSec: 0.18`, `projectileId`, `respawnDelaySec: 0.8`, `invulnerableSec: 1.5`, `spawn: {x,y}` |
| `projectileTypes` | id-to-record map: `{ spriteId, sizePx, speedPxSec, damage, lifetimeSec, faction, hitboxInsetPx }`; player moves upward, enemy downward; faction enum `player/enemy` |
| `enemyTypes` | id-to-record map: `{ spriteId, sizePx, hitboxInsetPx, health, points, contactDamage, escapeDamage, movementId, projectileId }`; movement enum `formation/diver`; scout 1 health/100 points, diver 1/150, armored 2/250 |
| `waves` | `{ templates: [{ id, rows: [[enemyTypeId,...]], spacingPx:{x,y}, origin:{x,y}, formationSpeedPxSec, fireIntervalSec, diveIntervalSec, maxDivers }], intermissionSec: 1.2, growth: {speedPerWave:0.08, extraEnemiesPerCycle:2, fireIntervalFactor:0.94}, caps: {enemyCount:48, speedMultiplier:2.5, minFireIntervalSec:0.35, minDiveIntervalSec:0.75, maxDivers:4} }` |
| `damage` | `{ defaultBulletDamage:35, clearShotsOnRespawn:true, clearShotsOnWave:true }`; per-type values override defaults |
| `assets` | `{ images: {id:{path:string, required:boolean}}, sounds:{id:{path:string, required:boolean}}, music:{title:{path,loop:true}, level1:{path,loop:true}} }`; manifest includes all runtime files, required sprites block load, missing optional audio yields visible silent-mode notice |
| `audio` | `{ masterVolume:0.7, musicVolume:0.35, sfxVolume:0.6, maxConcurrentEffects:6, fadeSec:0.25, startMuted:false, events:{enemyDestroyed:soundId, playerDestroyed:soundId}, tracksByScreen:{title:musicId, playing:musicId} }`; paused/game over stop gameplay music, title begins only after user gesture |
| `visuals` | palette, system font stack, font sizes, layout spacing, responsive breakpoints, canvas DPR cap, background sprite/tile settings, star density/speeds, HUD positions, hit flash duration, explosion frame ids/duration, particle count/colors/lifetime, screen shake amplitude/duration, focus style; explicit reduced-motion overrides disable shake and reduce effects |
| `ui` | all labels, instructions, status/error messages, score padding, health format, title/start/pause/gameOver/restart copy, credits label; no hardcoded user-facing text in modules |

Validate positive dimensions/rates, finite numbers, bounded volumes `[0,1]`, integer counts, allowed enums, nonempty bindings/templates, health/damage consistency, all referenced ids and manifest paths. Reject invalid config with an actionable loading error. Styles consume config tokens as CSS variables set at bootstrap; layout algorithms remain CSS. Changing an asset path, player speed, wave template, binding, palette or label must require only config changes.

## Assets and presentation

All three preselected packs were fetched from OpenGameArt; originals remain outside Git. Selected inventory: one player, three enemy variants, two projectiles, a space background, twenty Kenney fire frames for animated thrust/impact effects, one explosion sound reused for destruction events, and complete Title/Level 1 tracks. Audio was encoded OGG with ffmpeg. Enemy type ids scout/diver/armored map respectively to enemy-scout.png/enemy-interceptor.png/enemy-heavy.png. HUD health and ships use DOM/CSS, so no additional UI asset is needed. Kenney fire frames are not a verified explosion sequence; procedural particles supplement destruction feedback. Disclose all changes in CREDITS.md. Exact inventory, licensing, bytes and proposed roles live there. A role reserves an asset for the planned game; unused files must be removed before shipping.

Aim for a compact centered playfield with generous enemy/player separation, readable high-contrast score/health/ships/wave, focused controls and restrained effects. Use a system font to avoid another asset source. Semantic DOM buttons, visible focus, keyboard activation and status announcements support screen operation. Honor reduced motion; audio unlocks only through user gesture, mute remains available, and silent mode must be playable.

## Development stages after approval

1. Establish native module shell, config validation, Node built-in tests, local HTTP serving instructions, asset loader and title screen. Check paths, loading failure and credits link.
2. Build deterministic world, keyboard input, fixed-step loop, lateral movement and firing. Test bounds/cooldowns and frame-rate independence; inspect in browser.
3. Add formations, dives, enemy shots, swept collisions, health/ships/respawn and score. Test simultaneous collisions, tunneling, invulnerability and single score awards.
4. Add wave templates, difficulty caps, intermissions, pause, terminal game-over and full restart. Test repeated runs and wave transitions.
5. Wire selected OGG audio and visual effects, finish responsive layout and accessibility, then tune pacing in browser. Load the relevant reviewed baseline-ui/accessibility/motion skills plus matching antislop topics for actual UI work.
6. Run all NPM tests, perform browser acceptance below, verify asset budget/credits, and prepare a focused PR only when authorized. Each implementation commit requires green tests and a clear message.

## Acceptance checklist

Baseline review gates:

- [x] No game implementation exists in this baseline.
- [x] AGENTS.md contains SOLID/KISS/YAGNI, small modules, plain HTML/CSS/JS, centralized configurable values/assets, pre-commit NPM tests, small clear commits, branching/PR rules and the authorized non-LFS asset exception.
- [x] PLAN.md defines file layout, states, units, config formats, update/collision rules, development stages and acceptance gates.
- [x] Watch skill attempted; browser-sampled reference findings and evidence limits are recorded.
- [x] One Codex subagent only prepared assets; no other AI tools used.
- [x] Originals downloaded outside repo; only selected files copied; audio converted with ffmpeg; entire assets folder <5,000,000 bytes.
- [x] Every asset and license notice is inventoried and credited with file, use, author, source, license and alterations; fetch failures are explicitly reported.
- [x] Planning/asset validation through NPM passes before the requested main commit.
- [ ] Commit on main, verify clean Git status and stop for user review (final delivery gate).

Future game acceptance gates (unchecked until actually run):

- [ ] Runs over local HTTP in current Chrome/Edge and Firefox with native ES modules and no runtime dependencies or console errors.
- [ ] Title screen shows Space Attack, readable keyboard instructions, Start and credits; keyboard-only activation works.
- [ ] Left/right arrows and A/D move/clamp the spaceship; held Space fires at the configured rate; instructions stay on screen and match remapped bindings.
- [ ] Enemy waves spawn, move, attack and clear correctly; each kill raises visible score exactly once.
- [ ] Player bullets hit enemies; enemy bullets/contact hit the player; fast bullets cannot tunnel; simultaneous hits cannot double-consume a shot or kill score.
- [ ] Health and remaining ships are visible; damage, invulnerability, death and respawn behave as specified; zero ships enters game over.
- [ ] Later waves demonstrably increase pressure; counts and rates respect caps; seeded tests verify waves 1, 3 and 10 and multiple cycles.
- [ ] Start, game over and Restart work; restart resets score, health, ships, wave, entities, timers, keys and effects; no duplicate listeners or loops after ten restarts.
- [ ] Pause/blur stops combat; resume causes no time jump, stuck key or surprise shot; UI remains keyboard usable.
- [ ] Title and Level 1 music and explosion sounds use the credited OGG files, begin only after a gesture, obey volumes/mute and do not accumulate across screens/restarts; blocked audio still permits gameplay.
- [ ] Assets, tunables, bindings, labels and visual tokens can be changed in config alone; invalid references report useful errors.
- [ ] Layout remains usable at desktop and narrow viewport sizes, HUD stays legible, focus is visible, and reduced-motion mode removes shake.
- [ ] A five-minute run on the review machine has bounded entities/effects and smooth play; record browser, hardware and observations rather than claiming an unmeasured performance target.
- [ ] Repository npm test passes meaningful config, state, movement, collision, progression and asset/license/budget checks before every implementation commit.
- [ ] Final assets remain under 5 MB; every shipped file is used and credited; only Codex authored code; reviewable branch/PR and clear commits follow project rules.
