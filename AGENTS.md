# Space Attack project instructions

## Design and code

- Follow SOLID, KISS and YAGNI. Prefer simple functions and explicit dependencies over speculative abstractions.
- Keep modules small, with one job each. Read surrounding code and follow its patterns; do not tidy unrelated code.
- Use plain HTML, CSS and native JavaScript ES modules. No framework, bundler or runtime dependency is planned. Ask before adding any dependency.
- Use Codex for all code. Do not use another AI coding, asset-generation or analysis service.
- Make the game data driven. Centralize all tunable values, bindings, text, styles, wave definitions, scoring, audio settings and asset references in `src/config.js`. No gameplay or presentation magic numbers elsewhere. Mathematical identities and platform API identifiers are not tunables.
- Keep simulation independent of DOM, Canvas and audio. Inject configuration, input and randomness so behavior can be tested deterministically.
- Fix diagnostics on edited code in the same turn. Report unavailable tooling, false positives and missing project generation explicitly.

## Assets

- This project's explicit exception permits committing the selected PNG/OGG assets without Git LFS.
- Download source archives into a temporary directory outside this repository. Copy only assets selected for a documented game role into `assets/`.
- Convert selected audio to OGG with ffmpeg. Keep the complete `assets/` directory strictly below 5,000,000 bytes, including license files.
- Credit every asset in `CREDITS.md`: repository file, original file, intended use, author, source URL, license, modifications and size. Preserve required license notices.
- Use Kenney Space Shooter Redux from OpenGameArt; explosion effects from Juhani Junkala's 512 retro sound effects; Title and Level 1 music from his 5 Action Chiptunes.

## Git and validation

- Run passing repository `npm test` before every commit; never commit with failed tests. Use Node's built-in test runner, without new test dependencies.
- Use small commits with clear imperative messages. Commit only when the user asks. Do not add AI attribution, Co-Authored-By trailers or generated-with footers.
- The planning/asset baseline was reviewed and approved. Implementation is authorized on `feature/space-attack`; the user requests a green test run, commit and local server URL when complete.
- Keyboard shortcuts are P (pause), M (mute), T (tuning), Enter (start/restart) and Space (fire), with lateral movement on arrows/A/D. Display the tuning shortcut on screen. The tuning panel provides bounded values, themes, ship pickers, localStorage persistence and Reset defaults.
- Later work uses focused feature branches from `main`, passing tests and a reviewable PR with concise behavior and validation details. Do not push, publish, create or merge a PR without appropriate user authorization.
- Never stage temporary archives, reference video, secrets, generated caches or unused assets. Do not touch engine-generated directories.
- Report tests that fail or checks that were skipped, including the actual output. Do not claim browser behavior works until it has been run.
