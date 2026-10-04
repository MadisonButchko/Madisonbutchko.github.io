# STATUS (handoff)

## Status
- **Migration finished: Steps 0–15, Phase D items 3 and 5, Phase E (E1) and Phase F complete and verified** (uncommitted). Phase D items 1 (core/pointer), 2 (unify safe-zone lists) and 4 (merge timers) are deliberately NOT done: they change observable behavior/timing and need approval.
- **Phase E:** `style.css` split at its existing layer banners into `css/01-base.css` … `css/14-side-vines-plants.css`, linked in the same order (`?v=2`); `tools/css_concat_check.py` proved the pure cut byte-identical (226,489 bytes) before the Phase F pruning. E2 (regrouping rules by feature) was deliberately NOT done: the cascade is layered by version with 148 `!important`s, so reordering is not provably safe and was not required. The old `style.css` was removed (original kept as `pre-modular:style.css`).
- **Phase F:** removed 144 CSS rules/selectors that target only classes never referenced in `index.html` or `js/` (`yard`, `yd-*`, `eco-*`, `ch-*`, `eg-*`, `chick`, `rock`, `gulp`, `sp-lv2/3`, `vine-bud-stem`, old `mobile-*`/`writing-*`/`flip-*`/`skill-tag`…), skipping dynamic prefixes (`is-*`, `row-*`, `gs-*`, `vine-right`); removed dead `BF` constant, `addStems` (+ its resize listener) and unused `NS`/`rand` in `plants/vines.js`; fixed stale comments (`explore.js`, `style.css`) and the obsolete `TODO(human)` on `clickGrowthLimit`.
- **Left unresolved on purpose:** `shouldVisit` placeholder (returns false) in `animals/butterflies.js`, still wired into `botanical/stage.js` (real, unimplemented design hook; its TODO stays); the passive `.w-nest/.w-story/.w-jade` `display:none !important` rules; `@keyframes` possibly orphaned by pruned rules; Phase D 1/2/4; `tools/` is still publicly served by Pages.

## Final verification (Chrome, headless)
file://, local server and a Pages-style export (`css/` only, no `style.css`): desktop, desktop-rm, laptop, tablet, phone: 0 console errors/warnings, smoke 0 errors, computed-style snapshots 0 differences vs `tools/baseline`, `check_site.py paths` and `globals` PASS. Fingerprint differences are only the intentionally removed globals/`__story` hook plus known reduced-motion DOM-node noise. Screenshots differ only by known noise (photo fan tilt, bird, random decorations).

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
- `js/legacy/` is gone; `js/main.js` is the single ordered init sequence (keep its order and `boundary()` calls; verified identical to the old load order: 890 / 653 ordered side effects normal / reduced motion). Gallery's first block still runs at definition (it owns private state `enhance()` reassigns).
- Test env note: Google Chrome vanished from /Applications mid-session; tools/ hardcode its path. Phase D checks ran under Brave (new vs a served `git archive HEAD` export); re-run against `tools/baseline/` once Chrome is back.
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

NEXT: nothing required. Optional, needs approval: Phase D items 1, 2, 4.
