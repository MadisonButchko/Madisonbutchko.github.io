# STATUS (handoff)

## Status
- **Migration Steps 0–15 complete and verified** (T1 per step, T2 after Steps 10, 12, 13, 14, final pass after 15; file://, local server and Pages-style export all match the `pre-modular` baseline). Remaining: Phase D (consolidation), E (CSS), F (dead code) — all optional/later, one change per commit.

## Important architecture
- Classic `<script src defer>` files, **not ES modules** (modules break on `file://`).
- One controlled global: `window.MB` (`MB.define(name, deps, factory)`, `MB.use`, `MB.has`). No other new globals.
- **Tag order in `index.html` is the load/execution order.** Must keep working from `file://`, a local server and GitHub Pages (case-sensitive paths). Bump `?v=` on every changed file's tag.
- Organizational refactor only: no behavior, design, timing or mobile/touch/reduced-motion changes. Move code first, change behavior never.

## Completed structure
- `js/core/`: namespace, utils, scheduler (`Life`), state (`WorldState`, `GardenLog`, `mem`), particles (`FX`), safe-zones.
- `js/gallery/`: artworks, gallery (incl. lightbox).
- `js/effects/`: petals, flower-fx, scroll-effects, text-effects, cursor.
- `js/navigation/`: navigation, scroll-sunflower. `js/site/hero.js`.
- `js/legacy/`: 19 files (the old `script.js`, pure cut). Many are now one-line calls into modules. Real code remains in `050`, `070`, `130`, `140` (side vines + garden, 1,432 lines), `160`, `190`, `200`, `210`. `ecosystem.js` and `style.css` untouched.

## Step 10+
- **Step 10 (little world)** [10a–e DONE: `plants/dandelions.js`, `plants/seeds.js`, `environment/breeze.js`, `environment/weather.js`, `animals/{animals,birds,caterpillar}.js`; only the heartbeat, `World`, `placeIn` remain in legacy/200]: substeps with mixed risk, one commit each. 10a–10c (dandelions/seeds, sunlight, rain) may be batched if still self-contained. 10d (birds/nest/seed feeding) and 10f (heartbeat + weighted rare-event roll, must keep the single roll and today's probabilities) need stronger verification.
- **Step 11 (`ecosystem.js`)**: stand alone; its capture-phase click handler changes event-handler execution timing.
- **Step 12 (plants/vines)**: stand alone; vines and sprigs are high-risk and mutually coupled (use hook registration, no cycles).
- Steps 13–15: follow `MIGRATION_PLAN.md`.
- Pattern: scattered pieces become module entry points called from their original spot; whole files swap their tag in place.

## Testing
- `tools/capture.py` (5 profiles) + `tools/compare_json.py` against `tools/baseline/`; `tools/check_site.py paths|globals`; `tools/js_concat_check.py`, `tools/css_concat_check.py`; `tools/serve.py`.
- Always verify `file://`, local server, and a Pages-style export (copy of tracked files, served).

## Leftovers for later phases
- Thin legacy wiring files remain (`js/legacy/*`: mostly one-line `MB.use(...)` calls; real code left in `070` drifting butterfly, `200` World/placeIn/heartbeat registration, `210`, `140` vine wiring). Phase D moves modules to `init()` + `main.js`.
- Window debt still read by legacy code: `World`, `Life`, `GardenLog`, `__fx`, `__spin`, `__adoptFlowers`, `__birdSVG`, `__cloudSVG`, `__deerSVG`, `__visitFlower`, `__rainbow`, `__scatterPlace`.
- Dead code (Phase F): `BF` constant and `addStems` in `plants/vines.js`; `shouldVisit` placeholder (returns false) in `animals/butterflies.js`; the `TODO(human)` note on `clickGrowthLimit` in `plants/vine-sprigs.js`; unused header destructure in `legacy/140`; the passive `.w-nest/.w-story/.w-jade` are CSS-hidden (`display:none !important`).
- Five content-avoidance selector lists still differ (unify only in Phase D).

## Known caveats
- Run-to-run noise (not regressions): random decoration counts, reduced-motion DOM-node total (+2–3 %), photo fan/butterfly in screenshots, `.about-section` margin flip, sub-pixel text widths.
- Headless Chrome is the valid test environment; the in-app browser pane is hidden from the page.
- `window.openArtwork` / `openLightbox` no longer exist (intended). Legacy lookups (`Life`, `WorldState`, `artworks`, `openArtwork`, `buildCollage`) and `window.World` / `__rainbow` remain until their readers move.
- Five content-avoidance selector lists remain (unify only in Phase D).

## Git
- Branch `main`, up to date with `origin/main`. Restore tag `pre-modular` → `9b824c4` exists **locally only** (not pushed).
- Uncommitted: `ARCHITECTURE.md`, `MIGRATION_PLAN.md`, `index.html`, legacy/200, legacy/210, `js/plants/`, `js/environment/` (10a–e; commit one per substep if wanted). `__story`, `__eco`, `__gm`, `__vineQ/__vineBonus/__vineUpdate/__vineSprigs/__onVineLayout/__onVineTick` globals intentionally gone (the only fingerprint diffs); `ecosystem.js` deleted (unstaged); `js/plants/flowers.js` is the last script.

## Efficiency
- Read STATUS.md first; then only the current step of `MIGRATION_PLAN.md`.
- `ARCHITECTURE.md` only for ownership/dependency questions.
- Inspect only current-step files and direct dependencies; do not re-audit completed systems.
- Reuse existing tests; no new test infrastructure unless necessary.
- Keep commentary concise. Targeted tests first; broad baseline only where required.

NEXT: Phase D (consolidation) — only when asked; Phase F dead-code list below
