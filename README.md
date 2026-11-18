# Prismfall

An original neon arcade game for make.fun's **best-game-01** ("Make the best
game"). Bounce a sphere of light off a light bar and shatter the crystal
prisms sinking toward the shatter line. Clear 10 waves to bring back the dawn.

- **Move**: mouse or arrow keys · **Launch**: Space or click · **Pause**: P · **Mute**: M
- Catch falling glyphs: **W** wide bar, **S** split orb, **T** slow time, **+** shield
- Consecutive prism hits build a combo multiplier; a prism that crosses the
  shatter line, or a lost orb, costs a shield. Three shields, ten waves.

## Layout

- `game/` — the game itself: static files, no build step. `game/index.html`
  opens in a desktop browser and plays fully offline.
- `game/src/` — one file per job: `config` (tuning), `random` (seeded RNG),
  `audio` (WebAudio effects), `input`, `particles`, `entities`, `world`
  (rules and state), `render` (canvas drawing), `shots` (deterministic
  screenshot scenes), `main` (boot and loop).
- `screenshots/` — four real renders of the game (play, title, victory, game
  over), captured from the `?shot=` scenes listed in `shots.json`.
- `main.ts` — the hand-in program: copies `game/` and `screenshots/` to the
  output directory and writes `dossier.json` with `vendor/makefun-game.ts`.
- `serve.ts` — a tiny local server for play-testing: `node serve.ts`.

Run the hand-in locally with `mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts`.
