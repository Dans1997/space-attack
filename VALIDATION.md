# Implementation validation

Checked on 2026-10-02 in `F:\Repos\space-attack`, branch `feature/space-attack`. No dependencies were installed. Tools are the existing Node.js v22.20.0, NPM 10.9.3 and FFmpeg.

## Automated checks

`npm test`: **51 passed, 0 failed, 0 skipped**. Re-run before each implementation commit.

The first GitHub Ubuntu run failed the credited byte-total assertion (50 passed, 1 failed): Git normalized the Kenney notice to LF while the Windows original and credits counted CRLF. `.gitattributes` now preserves the notice's original 511 bytes on every checkout. No license text was changed. Local tests pass after this correction; CI must be green before merging.

Coverage: deterministic initialization; movement/held firing; swept nearest hit and single scoring; bullet health/respawn; immediate full-hull/invulnerable contact loss; formation ships stopping at the floor; missed divers exiting harmlessly; interceptor-only dives; bounded rows/high waves; monotonic capped difficulty; intermission timing; ten fresh-run resets; fixed-loop catch-up/pause; form keyboard isolation; config/asset references; localStorage validation/reset; media unlock/fallback; stale music promises; decoded-buffer looping/gain.

All **36 assets total 1,394,605 bytes**. All 29 PNGs and 6 OGGs appear in the runtime manifest; the remaining file is the Kenney license. CREDITS.md inventories all files. Archives remain outside the repository.

FFmpeg inspected Title: duration **11.294127 seconds**, source metadata `Loop Ready, Free to Use Anywhere`, no silence interval with `silencedetect=noise=-40dB:d=0.04`. Music now loops an AudioBufferSourceNode over the decoded buffer, avoiding HTML media restart latency. Asset bytes were not changed. Tests verify continuous looping and source lifecycle; browser playback emitted no audio error. Subjective listening quality is for review, not an automated assertion.

`node --check` passed on main.js, renderer.js and the server. Git whitespace checks passed. An earlier run encountered `SyntaxError: Unexpected reserved word` in waves.test.js during an agent edit; fixed. Another overlapping run saw audio.js temporarily absent during replacement; final tests pass with the completed file.

## Browser checks

Ran `http://127.0.0.1:4173` in Codex's in-app Chromium browser:

- Title/Launch, keyboard movement/Space shot, HUD, kill score 000100, damage/respawn, P pause/resume, M mute/unmute.
- T native tuning pauses combat; Escape/Close restore focus and leave combat paused for manual resume.
- Baseline: Speed 500, Phosphor, player Interceptor and enemy Heavy survived reload. Latest playtest removed the enemy picker and ignores old saved enemy overrides. Solar and volume controls also worked. Reset restored defaults.
- Opening-fleet speed 180 exercised live game over with enemies still on screen at the last row. Fly again restored score 0, wave 1, hull 100%, ships 3 and a fresh formation. Restored defaults afterward.
- Desktop and 390 x 844 viewport: screenshots, no horizontal overflow (`scrollWidth = clientWidth = 390`), legible controls/focus. Native tuning scrolls within viewport and opens at theme/heading. Viewport override reset.
- Browser error logs empty after integrated checks.

Not run: separate Chrome/Edge/Firefox installations, measured five-minute browser performance, physical mobile keyboard/200% zoom, or subjective audio seam recording. These remain open; no performance or full cross-browser claim. A diagnostic simulation with enlarged hull stopped normally on contact at wave 2 after 19.62 seconds, confirming hull cannot bypass contact loss; it was not a benchmark.

## UI delivery gate

Primary-agent source review, DESIGN.md, browser interactions/screenshots above, and theme-contrast tests supply evidence.

- PASS R-02: authored UI text has no em dashes.
- PASS R-03: narrow geometry has no horizontal overflow; title/action/HUD fit.
- PASS R-17: numbers come from game state or tuning data.
- PASS R-18: no testimonials.
- PASS R-23: only user-selected, credited assets; no generated imagery.
- PASS R-24: credits link targets served CREDITS.md.
- PASS R-25: themes pass computed text contrast >=4.5 and focus/control contrast >=3.
- PASS R-26: launch/restart/pause/mute/tuning/reset/close/pickers/numbers have exercised handlers.
- PASS R-27: loading, failure/Retry, title, pause, combat and terminal states; failure/retry tests.
- PASS R-28: no FAQ.
- PASS R-32: native controls/dialog, visible focus, keyboard actions and Escape close.
- PASS R-33: UI source directly authored; no external rewrite script.
- PASS R-34: themes share variables/layout; palette tests and all three theme selections pass.
- PASS R-35: HTTP app and interactive flow run; no build step required.
- PASS R-36: no invented security/performance/customer claims.
- PASS R-37: approved reference/PLAN supplied direction; DESIGN records identity/dials.
- PASS R-38: no fabricated people/statistics/ghost features.
- PASS R-01: solid surfaces; no gradients/glow decoration.
- PASS R-04: icon is a credited in-game ship.
- PASS R-06: system sans for controls; tabular HUD digits.
- PASS R-07: starfield follows space-shooter reference; no UI grid.
- PASS R-08: arrows label real movement keys.
- PASS R-09: no decorative capsule badges.
- PASS R-10: no glassmorphism.
- PASS R-12: no decorative shadows.
- PASS R-13: no glow affordances.
- PASS R-14: no filler feature cards.
- PASS R-19: purposeful combat motion; still UI; reduced-motion path removes decoration/flashing.
- PASS R-22: illustration is the selected ship sprite.
- PASS Liveliness/dials: ENERGY 2 / RHYTHM 1 / MOTION 2 in DESIGN.
- PASS Liveliness/consistency: stable cabinet and purposeful combat match dials.
- PASS Liveliness/focal point: arena in play; one primary overlay action.
- PASS Liveliness/spacing: separate status/arena/control regions.
- PASS Liveliness/accent: blue ship connects action/hull/focus.
- PASS Liveliness/motif: repeated ships/formations identify the game.
- PASS Liveliness/direction: approved reference plus documented design read.
- PASS C-1: layout/color/type reasons in DESIGN.
- PASS C-2: handlers/native semantics on controls.
- PASS C-3: sections serve play/state/controls/provenance.
- PASS C-4: tested browser states/narrow layout and reset/storage checks pass.
- PASS C-5: explicit verification limits instead of claims.
- PASS R-05: arcade field/HUD/controls, no marketing template.
- PASS R-11: modest radius, no pill UI.
- PASS R-15: Launch ship, Resume flight, Fly again actions.
- PASS R-16: no marketing buzzwords.
- PASS R-20: formation combat/ship art define the product.
- PASS R-21: dark field follows reference, alternate palettes supported.
- PASS R-29: neutral surfaces/text and one action accent per palette.
- PASS R-30: no SaaS product imitation.
- PASS R-31: major visual reasons in DESIGN.

## Baseline history

Approved baseline external NPM harness: four passing tests before `38c0a26`. Watch download returned HTTP 403, no frames/captions; Codex inspected browser samples documented in PLAN.md. No other AI service was used.

## Latest playtest corrections

- Main menu from both pause and Ship lost was exercised in the browser; returning clears the run and restores the title/HUD defaults. Session tests also cover fresh launches after both paths.
- Enemy origins are 25 px higher. Only interceptors can dive, keep their spawned sprite/orientation and leave below the arena harmlessly. Formation floor clamp and actual ship-contact loss remain. Focused simulation tests pass.
- Player/enemy firing emits distinct events mapped to credited short OGG shots. FFprobe decoded their durations (0.116100 s / 0.185737 s); the local server returned HTTP 200 for both. Browser shooting after integration produced no audio-unavailable notice. Audible balance remains a listening review.
- Music attempts startup by default; suspended context resume and blocked HTML autoplay are retryable on a user gesture. Mute/unmute were each saved and verified across browser reloads. The default remains unmuted.
- Browser tuning contains theme, numeric values and Your ship, with no enemy picker. No new dependencies.
- Interim integration test run: 33 passed / 4 failed (missing player-shot.ogg plus three obsolete enemy-picker settings assertions). Shot files initially landed in the review output folder; they were copied into the actual repository and obsolete assertions updated. Subsequent full suite passed.

## Arcade feel validation

- `npm test`: 51 passed, 0 failed/skipped. Added parallax position/speed/reduced-motion checks; bounded effect lifetimes, zero-duration hit feedback and exact point events; all new dials/defaults/pilot assets; numeric/string/color persistence; gain ramps, repeated gesture preservation, rapid reversal, retiring voices, mute/destroy and zero crossfade.
- All JavaScript files passed `node --check`. Browser launch, initial wave strip, pause/menu fades and native tuning were exercised with no console errors. The title was observed at different vertical positions with the same desktop layout; CSS uses a smooth transform-only cycle.
- Pilot choices show Blue/Red/Green only. Red survived reload. Native shake adjustment to 5 also survived reload; restored shake 4 and Blue afterward. Gameplay/Audio groups open by default; other advanced sections collapse. Text fields render as text inputs.
- Desktop and 390 x 844 layouts inspected. Narrow `scrollWidth` and `clientWidth` both 390. Viewport override reset, latest title screenshot captured and preview left at title.
- Defaults: three star layers, transient muzzle/particle feedback, a 0.1-second low-opacity hit flash and 0.16-second arena shake. Reduced motion disables travel, rapid flashes, shake and title bobbing; pure feedback checks pass. No new package or external font.
- Added one distinct CC0 pilot damage sound and matching red/green Kenney pilot sprites. Every file is credited; full asset total remains 1,394,605 bytes.
- Crossfades use decoded Web Audio sources and gain automation. The HTML audio fallback remains available but switches music without overlapping fades. Subjective sound balance/seam quality and a measured long gameplay performance run remain review items; the new transient effects were tested for timing/bounds rather than claiming a hardware benchmark.
- An interim run had 46/48 passing tests: the previous immediate-stop audio assertion and enemy-shaped pilot assertion failed. They were updated to the new fade/pilot behavior; the final suite is green.
- UI guidance: the user's explicit bobbing-title/retro-cabinet request supersedes the skills' default against endless motion/scanline gradients. DESIGN.md now records the motion purpose and ENERGY 3 / RHYTHM 1 / MOTION 3. Square controls, native semantics, visible focus, actual HUD values, grouped settings and responsive checks remain; the existing approved HTML/CSS/module stack takes precedence over framework preferences.
