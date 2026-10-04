# MIGRATION PLAN (temporary: delete when finished)

Goal: reach the structure in [ARCHITECTURE.md](ARCHITECTURE.md) through small, individually revertible commits.
Decisions fixed by the owner: **ES modules** · deer in `animals/deer.js` with a small garden-facing API · files split only for real independent logic
(birds that are simple variations stay together in `birds.js`) · **dead-CSS cleanup is a separate later phase** (touch an obsolete rule only if it directly blocks a step, and say so in the commit).

## Ground rules
1. **One step = one commit.** If its test fails, `git revert` that commit; nothing else is implicated.
2. **Relocate, don't redesign.** A step cuts code and pastes it into a module, changing only (a) local helper declarations → imports and (b) `window.__x` reads → imports/hooks. No logic, timing, selector or CSS-value changes.
3. Consolidation (shared pointer, unified safe-zones, registries, global removal) comes **after** everything has moved (Phase D).
4. Leaves first, shared services second, tightly coupled clusters last.
5. Keep `?worlddebug`, `?gardendebug`, `?v11debug` hooks working; they are the test levers.
6. While an unmoved block still reads `window.__x`, the new module keeps `window.__x = x  // migration debt`. Remove it in the step that moves the last reader (§4 table in ARCHITECTURE).
7. Mutated top-level `let` bindings cannot be reassigned from another module: when a split needs that, expose a setter/hook, but only in a step that already handles it (see Step 3).
8. Every step updates ARCHITECTURE.md §0 (and the §4 debt table) and gives each new module its header.

## Execution-order policy (new, important)
Today the IIFEs run in file order and later ones rely on DOM built earlier. Known order dependencies: hero/section **letters** (`.ltr`, built at 202/463) before text hover settle (718) and rainbow letters (4090);
**page-bg/ambient** layers (792); **vines** before the garden; flowers placed after layout before **late-flower adoption** (4344); the **world** (3645) before **v11 polish** (4074); `World`/`Life`/`WorldState` before all users.
Policy: after Step 5 every piece of `script.js` lives in an ordered side-effect file and `main.js` imports them **in the original order**. A later move replaces a legacy file with its final module **at the same position in `main.js`**. Only in Phase D do modules switch to `init()` functions.

## Test tiers
- **T1 targeted**: the checks listed under the step (always includes the mobile and reduced-motion line for the code moved).
- **T2 full smoke**: run at the end of each Phase and after every step marked **high**. It is long, so don't run it after trivial steps.

**T2 full smoke checklist** (desktop ≥ 1240 px, phone 375×812, reduced motion):
- Console: zero errors/warnings on load, after scrolling the whole page, after opening/closing every overlay below.
- Load: hero letters animate, petals drift, role word rotates, photo fan shuffles, nav pill follows scroll, vines grow on scroll, corner sunflower indicator.
- Navigation: every nav link (pill + mobile menu), back-to-top, scroll-spy.
- Experience/Skills: click → ~230 ms bloom → opens; buds, notes, swipe/arrows, Escape; seed packet pours; bouquet fills; ribbon bow.
- Gallery: preview → modal; each filter; shuffle; surprise; piece → lightbox; arrows, keys, zoom, slideshow, swipe; Escape order; body scroll-lock restored.
- Garden: plant, water, thirst, pests + shoo, rain/sun, badges, save/restore, "start over" (two-step wipe).
- World (forced): `?worlddebug` → `__world.seed()`, `.steal()`, `.rain()`, `.nestVisit()`; `?gardendebug` → `__garden`; `?v11debug` → `__dand`, `__vineDebug`; `__story.advance()`.
- Reduced motion: skipped effects are skipped, click delay is 0, still alternatives present.
- Idle 2 min: `document.querySelectorAll('*').length` stable. Reload mid-page: scroll restored, saved garden restored, no jump at the footer.

## Tools (Step 0; outside the shipped site, e.g. `tools/`)
- **console smoke snippet**: runs the debug hooks above, records error count and DOM node count before/after.
- **css-concat-check**: `cat css/*.css` in `<link>` order must equal the original `style.css` byte-for-byte.
- **style-snapshot**: console snippet that dumps `getComputedStyle` for elements matching given selectors to JSON, to diff before/after a CSS move.
- **js-concat-check**: for the legacy slice (Step 5), concatenating segments in order must equal the pre-slice file minus added import/export lines.

---

## Phase A: mechanism and safety (no feature code moves)

### Step 0: safety net · risk none · docs/tools only
- Tag `pre-modular`; build the tools above; capture baseline screenshots (1440, 1024, 768, 390) and a clean console log.
- Add a tiny root `CLAUDE.md` ("read ARCHITECTURE.md first; use the routing table"). *(Separate approval; it is not one of the two plan docs.)*
- Test: baseline recorded.

### Step 1: load both scripts as ES modules + strict-mode audit · risk **medium**
- **Move:** nothing. `index.html`: `<script type="module" src="script.js">` then `<script type="module" src="ecosystem.js">` (same order; modules are deferred in order, matching today's script + defer).
- **Strict-mode audit (already partially done in review):** both files compile with `"use strict"` (no early errors: octal, duplicate params, `with`, `delete x`), and a heuristic scan for undeclared assignments found none (the one hit, `qf`, was a comment). **Still to do during this step:** (a) grep for function declarations inside `if/for/{}` blocks that are used outside that block (sloppy mode hoists them; strict does not); (b) top-level `this`; (c) a runtime pass that forces every path (debug hooks, all overlays) watching for `ReferenceError`; (d) module scripts run after parsing: check anything measuring layout at parse time (scroll restore, vines `measureAbout`, garden height reservation).
- **Files:** `index.html` only. **Depends on:** nothing.
- **Test:** T2 full. Compare intro animation timing and scroll restoration to the baseline. If anything is off, revert and fix in a follow-up before proceeding.

## Phase B: shared services and preparation (still no feature relocation)

### Step 2: `core/utils.js`, `core/state.js`, `core/scheduler.js` (Life only), `core/particles.js` · risk low
- **Move (verbatim, with `export`):** `Life` (1–25) → scheduler; `WorldState` (28–35), `GardenLog` (4191–4211), session `mem()` store (2741–2750) → state; `FX` (4168–4189) → particles; helpers → utils (new; nothing is replaced yet).
- **To:** `js/core/*`; `script.js` imports them; keep `window.Life`, `window.GardenLog`, `window.__fx` aliases (debt). Entry becomes `js/main.js` importing `../script.js`.
- **Depends on:** Step 1. **Test (T1):** storage keys unchanged in DevTools → Application; an existing saved garden/world loads; creatures still take turns. Mobile/RM: nothing moved that depends on either; confirm FX cap still 28 at 375 px.

### Step 3: gallery + lightbox as **one** module · risk low–medium
Gallery code is split across the top-level block (36–116), the FX v2 IIFE (486–694) and the v3 frame (781–788), tied together by stubs (`let buildCollage = () => {}`, `let updateLightbox = () => {}`) that the later IIFE *reassigns*. A reassigned binding cannot be shared between modules, so all of it must move together.
- **3a** `artworks` array (36–44) → `gallery/artworks.js` (data only; `export`). Test: preview/modal render.
- **3b** everything else (top-level lightbox/preview wiring, FX v2 gallery section, rainbow frame) → `gallery/gallery.js` as one cohesive module (≈ 450 lines, temporary). Runs at the position of the top-level block. Replace the stubs with plain function declarations in the module. Watch the `document.onkeydown` / `.onclick` property assignments (they overwrite earlier handlers: keep the same order) and `document.body.style.overflow` shared with other overlays.
- **3c** split `gallery/lightbox.js` out of `gallery.js` (pure move; `gallery.js` imports `openLightbox`/`updateLightbox`).
- **Depends on:** Step 2. **Test (T1):** each filter, shuffle, surprise, preview-piece → exact piece, lightbox arrows/keys/zoom/slideshow/swipe, Escape order (lightbox then modal), scroll lock; phone: swipe, layout; reduced motion: no autoplay/ stagger animation issues.

### Step 4: carve the four mixed IIFEs into single-purpose IIFEs, **in place** · risk low–medium
Re-wrap only; code stays in `script.js`, in the same order, so nothing can reorder. Each carve first lists the closure variables the pieces share (declare them in a tiny shared scope or duplicate the pure helper).
- **4a** Flower FX (183–401) → name-letter wave · vine scroll growth (shares `vines`, `pf/qf`, `__gm`) · click-bloom stamp + photo pops (share `flowerSVG`, `FLOWERS`) · drifting butterfly.
- **4b** FX v2 (453–711) → title letters/squiggles · (gallery already gone after Step 3) · hero photo fan rotation.
- **4c** v3 (713–788) → hover settle · rainbow glow · butterfly cursor + trail.
- **4d** v4 (790–877) → page-bg/ambient · nav pill · corner sunflower indicator (+back-to-top).
- **Test (T1):** per carve, the touched effects only (e.g. 4a: letter wave on hover, vine growth on scroll, click bloom, photo pop, drifting butterfly); phone: tap equivalents; RM: pieces that early-return still do.

### Step 5: slice `script.js` into ordered legacy segment files · risk medium (mechanical)
- **Move:** cut at IIFE boundaries into `js/legacy/NN-name.js` (e.g. `10-petals.js`, `20-vine-growth.js`… `90-polish.js`), each an unchanged side-effect module. `main.js` imports them in the original order (comment block lists the order dependencies above).
- **What breaks:** only the few top-level bindings shared between segments (`Life`, `WorldState`, `artworks`: already exported by Steps 2–3). Anything else that fails reveals an undocumented shared variable: export it from its owner and note it in ARCHITECTURE §4.
- **Verify:** js-concat-check; T2 full. **After this step every later step is "move a segment (or one section of it) to its final module and swap one import line in place".**

## Phase C: relocate to final homes (lowest risk first)

### Step 6: effects leaves · low
- **6a** petals → `effects/petals.js`. **6b** reveal observer, off-screen `is-off`, info pop-ins, shifting background, page-bg/ambient → `effects/scroll-effects.js`. **6c** hover settle, text hover colour, title letters/squiggles, rainbow letters (`__rainbow` stays as export: read by the Stage) → `effects/text-effects.js`. **6d** click-bloom stamp + photo pops → `effects/flower-fx.js`.
- **T1:** 6a RM: canvases absent/ static; phone dpr cap. 6b `.reveal` on every section, tags pop one by one, sections far off-screen pause animation. 6c hover colours on text/circles/headings, tap equivalents on touch, `.ltr` letters still present when rainbow runs. 6d click bloom, photo pop, RM skip.

### Step 7: navigation + hero · low–medium
- Nav pill, mobile menu, scroll-spy, flower nav (with its butterfly), in-page links → `navigation/navigation.js`; sunflower scroll indicator/back-to-top → `navigation/scroll-sunflower.js`; hero letters wave, role rotator, photo fan (+ rotation), glow, About word reveal, photo floral frames → `site/hero.js`.
- **Watch:** MutationObserver on `.nav` class changes; scroll+resize handlers; fan interval pause-on-hover/hold logic.
- **T1:** every nav state desktop/phone, quick scroll spy, back-to-top morph, fan click/hover/dots, frames tucked on phones, RM.

### Step 8: cursor effects → `effects/cursor.js` · medium
- Cursor ring, rainbow glow, butterfly cursor + trail, magnetic hovers. Listeners stay exactly as they are (centralising is Phase D).
- **T1:** desktop (fine pointer) only; absent on touch; ring grows over links; glow follows; RM state.

### Step 9: safe-zone helpers → `core/safe-zones.js` · medium
- Move verbatim `clearAt`, `openSpot`, `offscreen`, `whenUnseen`, `checkWaiting`, `inView`, `navBottom`, `BLOCK`, `contentRects` (3665–3697). The other four selector lists stay put. `checkWaiting` is still called by the world heartbeat.
- **T1:** forced seed/bird/rain find open spots; nothing lands on text at 375 / 768 / 1440 px.

### Step 10: the little world, one commit each (all use Steps 2 and 9) · medium → high
- **10a** dandelions + seeds that took root (3938–3990, 4391–4652) → `plants/dandelions.js`, `plants/seeds.js`. T1: tap/brush blow, seed drifts, sprout appears later out of sight, persists after reload; touch tap; RM.
- **10b** sunlight lean + (later) wind → `environment/breeze.js` now with sunlight only. T1: lean toward cursor, corner sunflower turns, none on touch.
- **10c** page rain cloud + rainbow-after-rain (3992–4043) → `environment/weather.js` (`__cloudSVG` stays as debt for the garden cloud). T1: `__world.rain()` shower, bow/lift, rainbow, tap dismiss, RM still cloud.
- **10d** world bird, seed feeding, petal theft, nest (3729–3884) → `animals/birds.js` + create `animals/animals.js` (thin registry). Nest stays inside `birds.js`. T1: drag a seed to a bird, `__world.steal()`, nest grows only while out of view, persists; phone drag.
- **10e** caterpillar story + chrysalis + butterfly (3886–3937, 4362–4390) → `animals/caterpillar.js` (butterfly emerging goes with it). `__story` replaced by an import. T1: `__story.advance()` through stages; chrysalis shows only when vines visible; reload persistence.
- **10f** heartbeat + rare roll (4044–4069) + `window.World` → `core/scheduler.js`: owns the single interval, `onBeat`, and `rare(name, weight, fn)` with weights 0.03 (rain), 0.03 (thief), 0.06 (nest visit) **in one roll**, exactly today's thresholds; the seed-spawn probability stays a beat callback. `World` stays as a thin compatibility object until Phase D. T1: events still fire; `calm(40000)` gating unchanged. **Risk medium-high: probabilities must not change.**
- **End of step 10: T2.**

### Step 11: `ecosystem.js` dissolves · low–medium
- Seed pour → `plants/seeds.js`; breathing, off-screen pause, pollen, click-bloom delay (capture-phase handler that replays a trusted click after 230 ms), rare visitor → `plants/flowers.js`; cursor breeze → `environment/breeze.js`. Delete `ecosystem.js`. `__visitFlower`/`__eco` consumers updated as moved.
- **Watch:** the capture-phase click order relative to other click handlers is behaviour. **T1:** click delay + pollen on Experience/Skills, seed pour, breeze on fast passes, rare visitor via console; phone: no breeze, taps still bloom; RM: delay 0.

### Step 12: plants cluster · **high**, substeps in order
- **12a** turning flowers (`Spin` 4126–4167), touch responses, late-flower adoption (4214–4361) → `plants/flowers.js`; shared flower art/palettes → `plants/plants.js`. T1: every decorative flower turns/reacts; late-added flowers adopted; tap equivalent.
- **12b** flower patches + scattered blooms (1429–1563) → `plants/decor.js` (keeps own `CONTENT` selector until Phase D). T1: no overlap on text at 3 widths; resize re-check.
- **12c** vine scroll growth + vine butterflies (214–337, 910–944) → `plants/vines.js`; keeps `__gm/__vineUpdate/__vineQ/__vineBonus` as exports and **hosts** `onLayout/onTick/onRender` hooks.
- **12d** click-grown sprigs, slots, tip hint, `growVine` (984–1195) → `plants/vine-sprigs.js`; registers into vines via hooks (breaks the `__vineSprigs`/`__onVineLayout` cycle; `__onVineTick` chain from v11 becomes a hook registration).
- **12e** vine bird + flyby birds (1196–1239, 1400–1428) → `animals/birds.js`; vine caterpillar (1240–1396) → `animals/vine-caterpillar.js`. T1 (12c–e): scroll the page both ways (stems/leaves/blooms retreat in order), click vine at several heights (limit 24 / 14), birds and caterpillars eat sprigs and they regrow, slim vines at < 1240 px, resize/address-bar guard, `?v11debug`.
- **End of step 12: T2.**

### Step 13: botanical · medium, **stage high**; separate commits in this order
`content.js` (2752–2785) → `plant-art.js` (2892–2928) → `bouquet.js` incl. discoveries (2786–2820, 3375–3513) → `links.js` incl. seed of curiosity (3514–3618) → visitor butterfly/bee to `animals/butterflies.js` (2821–2891) → hidden moments to `easter-eggs/easter-eggs.js` (3620–3643) → **`stage.js` last** (2929–3358; decide the `stage-notes`/`stage-flight` splits only after reading its closure variables).
- **Depends on:** `__rainbow` (6c), `pour` (11), `GardenLog`/`mem` (2), `World.note` (10f). **T1:** open/switch/close both sections (desktop + phone layout), buds and notes, swipe, keyboard/focus order, Escape, bouquet fill + ribbon, ways-in links, revisit "new bud", RM. **Then T2.**

### Step 14: footer garden → `garden/` + `animals/deer.js` + `environment/weather.js` · **high**, bottom-up
- **14a** species art (pure functions, 1603–1711) → `garden/species.js`.
- **14b** badges, toasts, HUD text (1769–1933) → `garden/hud.js`.
- **14c** garden weather (2287–2344) → `environment/weather.js` (sharing cloud art with 10c).
- **14d** critters: bunny, snail, pest bird, caterpillar, butterfly (2007–2151) → `garden/critters.js`.
- **14e** deer (2152–2286) → `animals/deer.js` using the **garden-facing API** (live plants, bed geometry, `removePlant(p, how)`, `water`, `shedPetals`, `flash`, `isNarrow`). Defining this API is the work of this step; it only exposes what deer/critters/weather already read.
- **14f** the game core (state, save, plant/water/input/reset, tick) → `garden/garden.js`.
- **T1 each:** force with `__garden`: plant/water/thirst/lifespan, each critter, deer walk-in/bite/flee/leave (narrow bed < 600 reach/speed), sun/rain cycles, badges, save/restore, **start over wipes `mb-garden-v1`**, phone layout (starter patch 6 vs 10), RM, tab hidden. **Then T2.**

### Step 15: guide bird → `animals/guide-bird.js` · medium
- 2391–2520. `__guideBird` becomes an export read by `birds.js`. **T1:** flutters in empty spaces, points to the garden, yields to purposeful creatures, phone behaviour unchanged.

## Phase D: consolidation (behaviour-adjacent; one change per commit)
1. `core/pointer.js` + subscribe: migrate rainbow glow, butterfly cursor, vine breeze, sunlight, wind **one at a time**; then the three duplicated tap-for-hover handlers → `tapHover`. Risk medium–high: wind uses a 1300 px/s velocity threshold that depends on sampling; verify equivalence.
2. Unify the five safe-zone selector lists (observable placement changes: review at 3 widths).
3. Replace the `init()` side-effect style with `init()` + registries (`animals.js`, `environment.js`, `easter-eggs.js`, `plants.js`); remove `window.World` and remaining `window.__*` (keep debug hooks); confirm `__deerSVG`, `__scatterPlace`, `__adoptFlowers` unread, then drop.
4. Decide about merging the garden's own tick and the ecosystem rare-visitor timer into the scheduler (changes timing: only with explicit approval).
5. Share creature/cloud art where two files use it (`animals/art.js`).
- **T2 after each of 1–3.**

## Phase E: CSS (structural), separate from JS steps
- **E1 mechanical split (provably safe):** cut `style.css` at existing banner lines into ordered files; link in the same order; css-concat-check must be byte-identical.
- **E2 regroup by responsibility** into `css/{base,layout,navigation,gallery,effects,botanical,plants,garden,animals,environment}.css`, moving a feature's CSS *after* its JS has moved. Before moving a rule check whether another rule targets the same element + property later in the cascade (148 `!important`s, v-layers override earlier ones); verify with style-snapshot + screenshots at 1440 / 1024 / 768 / 390 and RM. Media queries and reduced-motion rules travel with their feature.
- **Exception to "no cleanup":** an obsolete rule is touched only if it directly blocks a move (record in the commit message).

## Phase F: dead-code cleanup (later, separate, approved)
- ≈ 72 CSS class names look unreferenced (`yard`, `yd-*`, `eco-*`, `chick`, `ch-*`, `eg-*`, `rock`, `gulp`, `row-*`, `sp-lv2/3`…); some may be built by string concatenation. Produce the list, confirm, delete in its own commits with before/after screenshots. Also: stale `explore.js` comments, the leftover `TODO(human)` near `clickGrowthLimit` (script.js ≈ 1101), unread globals, the Experience "fawn" CSS after commit `ba7d87c`.

## Risks and notes
- **Cache-busting:** module imports ignore the `?v=` on `main.js`; after a deploy returning visitors can get a mix of old/new modules for up to GitHub Pages' cache window (~10 min). Decide a scheme before Step 5 (e.g. a single `VERSION` constant appended to imports via a tiny import map or a versioned directory); until then, bump `?v=` on `main.js` and CSS and accept the window.
- **Request waterfall:** ~40 modules over HTTP/2 is fine on GitHub Pages; keep import depth ≤ 3 and add `<link rel="modulepreload">` for the legacy list if first paint regresses (compare to baseline in Step 5).
- **iCloud path:** the repo lives under iCloud Drive; keep an eye out for sync conflicts during large moves (commit often).
- **No automated tests exist.** T1/T2 are manual + the Step 0 console snippet; that is why every step is small.

## First step to perform
**Step 0** (baseline, tools, tag; docs/tooling only). Then **Step 1** (ES module switch + strict audit) as the first commit that touches the site.
