# Willow Valley

A mobile-first, single-settlement strategy game, designed for touch controls and persistent turns. The game is an early playable prototype.

## Play and test

After GitHub Pages is enabled with **GitHub Actions** as its source:

- Stable: https://matthnj15-pixel.github.io/Willow-Valley/
- Preview: https://matthnj15-pixel.github.io/Willow-Valley/dev/

**The production build uses the `main` branch.** The preview build uses `develop`. Both are deployed together to one Pages site. Game data uses separate browser storage namespaces; the preview cannot overwrite your production save.

## Controls

- Pan the map with one finger.
- Pinch with two fingers or use the +/- buttons to zoom.
- Select **Roads**, then tap points along your desired route. Tap **Build road** to commit. Tap **Undo** or **Cancel** to revise it.
- Select **Build** and pick an industry, then tap a location on the map to place it.
- Advance a month to resolve production, food consumption, taxes, upkeep, and residential growth.
- Tap **Advisor** for rule-based recommendations. AI is **not enabled**.
- Open the menu to export/import a JSON save.

## Development

- `main`: stable; never push experiments here.
- `develop`: integration/testing branch.
- `feature/*`: experiment branches, merged into develop using pull requests.
- Pull requests from develop to main promote tested changes.
- GitHub Actions runs Node's built-in test runner, then publishes main plus develop to independent site paths.

## Privacy and AI

There are **no API keys** in this repository. GitHub Pages is public. When AI is introduced, calls must go through an authenticated server-side backend with secret storage, quota enforcement, and explicit user permission. Never put API keys, service credentials, or personal data in this repository or in static browser assets.

The current Advisor uses local deterministic heuristics and **does not make AI requests**.

## Architecture

- `simulation.mjs`: pure deterministic simulation, save validation, construction and road rules.
- `app.mjs`: browser UI, gestures, SVG drawing, local saves.
- `config.mjs`: environment-specific configuration and feature flags.
- `tests/`: unit tests without external dependencies.
- `.github/workflows/pages.yml`: tests and dual-path Pages deployment.

The prototype uses HTML, CSS, SVG, and JavaScript without external dependencies. Save files carry a version and require future migration when the schema changes. The game's economy and map visuals are early mechanics that will be refined through playtesting.
