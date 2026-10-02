# Session prompts

The user-authored prompts below are in chronological order. Only grammar mistakes and mistypes have been corrected. Automatically supplied browser state, environment metadata and question UI wrappers are omitted.

## 1

Hi. Your task is to build Space Attack, a small, polished browser arcade game where the player pilots a spaceship against waves of enemies.

1. Do not implement anything yet.
2. [$watch:watch](C:\Users\danil\\.codex\plugins\cache\claude-video\watch\0.3.2\skills\watch\SKILL.md) the reference video on YouTube: [https://www.youtube.com/watch?v=jYIC8ADIArc](https://www.youtube.com/watch?v=jYIC8ADIArc)
3. It must include:
   - Keyboard movement and firing, with on-screen instructions
   - Enemy waves, working collisions, a visible score and health/lives
   - Increasing difficulty
   - A start screen, game over and restart
4. Use Codex only for all the code. No other AI tools.
5. Write AGENTS.md with the following rules:
   1. Follow SOLID, KISS and YAGNI
   2. Small modules with one job each
   3. Use plain HTML, CSS and JS modules
   4. Data-driven design, every value is customizable, including assets. Centralize it in a config file
   5. NPM tests must pass before every commit. Small commits, clear messages. Follow branching and PR best practices
   6. You can commit the assets without LFS, and please credit all of them in CREDITS.md

Write a PLAN.md with the file layout, game state, config shapes/formats and a clear acceptance checklist covering every requirement (including what was written above in #3).

In parallel, you can spawn one subagent (pre-configured in the Codex .toml file) to get assets while you plan the architecture and development stages (this was pre-selected):

1. Kenney Space Shooter Redux from OpenGameArt
2. Explosion sounds from the 512 retro sound effects pack by Juhani Junkala on OpenGameArt
3. Title and Level 1 tracks from 5 Action Chiptunes by Juhani Junkala on OpenGameArt
4. Download to a temp folder outside the repo, copy only what we use into assets, convert audio to OGG with ffmpeg
5. Keep the assets folder under 5MB and list every file and its use

When you're done, commit on main, then stop so I can review. Let me know if you can't fetch the files. I'll get you a direct link.

## 2

My bad, forgot to point you to the empty git folder: "F:\Repos\space-attack", already git init

## 3

1. Plan is approved
2. Make sure to create a branch and build it
3. Split the work so no two agents edit the same file
   1. You do the game loop, state machine, rendering, start screen, HUD and game over
   2. Spawn another agent that handles physics, collision, waves, and difficulty progression and unit tests
   3. The third agent will deal with audio in general, music and SFX, plus a tuning panel
   4. The tuning panel needs a hotkey to open; make sure to show it on the screen so I know which one you chose. In there, let me pick values, theme, ship pickers, and for speed just save in localStorage. Add a reset button too
   5. Add pause on P and mute on M

When the agents finish, wire everything together, run npm test, if it's green commit, start a local server and give me the URL.

## 4

1. The main menu background soundtrack is not looping well.
2. Add a losing condition: enemy ships can touch you and if they do, it's game over. Make sure they can't go past the bottom of the screen (they linger in the last row)

## 5

From my playtest:

1. Make sure we can go back to the main menu if we want, from the lose screen and pause screen
2. I don't hear a shooting SFX from the pilot ship or the enemy ships
3. Make the enemy wave start a little bit further up
4. The main menu theme only starts when I click mute, then unmute. Make sure it starts by default unless the user already muted it
5. When selecting the enemy pilots, for design purposes, let's not make it possible to select the blue pilot. That will only confuse the player. Each enemy pilot serves a purpose, so it doesn't make sense also to be able to change their shape. Either remove it completely or find a replacement asset for each class of ship
6. Some ships that fly towards the player change shape when they decide to act. Make this simple: one shape of ship can fly towards the player. They can't change shape once they're spawned. Pick one. Actually, they're not changing shape, they're rotating. So just don't rotate it when it starts flying
7. If I don't shoot a flying ship, it stays stuck on the bottom row and I can't shoot it. These ones can fly past the bottom of the screen (an exception to the bottom row rule and lose condition).

## 6

# AGENTS.md instructions

<INSTRUCTIONS>
# Global instructions

Applies to all my projects. Project-level AGENTS.md always wins over this file.

## Context

I work primarily in **Unity (C#)** and **Unreal Engine 5 (C++)**, plus assorted
tooling and automation scripts. Assume a Windows dev machine.

## Version control

- **Never commit or stage binary assets.** My repos use Git LFS; a binary added
  outside LFS is a mistake worth stopping to flag, not working around.
- Don't touch engine-generated directories: `Content/`, `Binaries/`,
  `Intermediate/`, `Library/`, `Temp/`, `DerivedDataCache/`, `Saved/`.
- Commit only when I ask. Never add AI attribution, `Co-Authored-By` trailers,
  or "generated with" footers to commits or PR descriptions.

## Writing code

- **Read the surrounding code first and follow its existing patterns** —
  naming, file layout, error handling, comment density. Match what's there
  rather than introducing a new idiom, even a better one. If the existing
  pattern is genuinely wrong, say so instead of silently diverging.
- **Ask before adding a dependency.** New packages, plugins, NuGet/UPM entries,
  and submodules all need my go-ahead first. Prefer the standard library or
  something already in the project.
- Don't reformat, reorganize, or "tidy" code I didn't ask you to change.

## Diagnostics

- When a language server reports a diagnostic on code you just edited, **fix it
  in the same turn** before moving on to the next step. Don't leave errors
  parked for later or hand back work with known diagnostics outstanding.
- If a diagnostic is a false positive or comes from missing project generation
  (Unity `.csproj`, UE `compile_commands.json`), say so explicitly rather than
  silently ignoring it.

## Reporting

- If tests fail or a step was skipped, say so plainly with the output.
- Don't claim something works unless you actually ran it.

## Audited skills: use when pertinent

- For skill installation or trust reviews, use the globally installed `skill-inspector` and `skillspector scan <path> --no-llm`, then inspect the flagged source. Never equate a static score with a malware verdict.
- For web UI work, select the relevant installed `baseline-ui`, `fixing-accessibility`, `fixing-metadata`, `fixing-motion-performance`, or `improve-ui` skill. For design quality, copy, accessibility, responsive layout, or comment cleanup, load `antislop` and only the matching `antislop-*` topic skill.
- Load these only for the current task; do not load the entire collection on every request. User instructions, repository conventions, existing authorization, and dependency approval take precedence. Web framework preferences do not apply automatically to Unity/Unreal work.
- These are reviewed local copies. Do not run their upstream installers, fetch replacement instructions, or update them without a separate requested and audited update. Reticle, the live UI Skills router, and create-design-md remain unapproved and uninstalled.
</INSTRUCTIONS>

## 7

Now let's make the game feel good:

1. Add parallax for the starfield
2. Thruster flicker and muzzle flash
3. Particle explosions, flash when we're hit + short screen shake, score popups
4. Wave banner between waves
5. Fades between screens
6. Bobbing title (smooth)
7. Music crossfades between title and game
8. UI/UX pass: make it look like a retro arcade game
9. SFX when the player pilot gets hit (different from the enemy ships)
10. Remove the enemy ships from the pilot ship shape configuration. We can't use enemy ship shapes for the main pilot ship
11. Every new value goes in config and tuning

## 8

1. Write a README explaining how to run the game, controls, tests, project layout, how to swap themes and values in config
2. Create a prompts.md with every prompt I type this session, word for word (correcting only grammar mistakes and mistypes)
3. Run tests again. If they are all green, create a PR and merge into main
4. From main, deploy the game
5. Reviewers should be able to play without a player account. **Use Codex Sites for hosting**
6. If you can, create also GitHub Pages hosting the game, also from main
7. Return the playable browser link to me, not the Pages one

## 9

Public repository; enable GitHub Pages too
