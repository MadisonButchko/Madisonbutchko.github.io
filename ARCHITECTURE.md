# ARCHITECTURE

The permanent guide to how this site is organised. **Read this before changing anything.**
Migration steps (temporary) live in [MIGRATION_PLAN.md](MIGRATION_PLAN.md).

> **STATUS: migration not started.** Today the code is still `script.js` (4,653 lines), `ecosystem.js`
> (155) and `style.css` (2,769). §1–§10 describe the **target**; §0 says where things live **right now**.
> As each migration step lands, update §0 (rows disappear as code reaches its home) and the global-debt table (§4).

Static, build-free GitHub Pages site (`CNAME`, no bundler, no npm). Keep it that way: **native ES modules**
(`<script type="module">`), plain CSS, plain files. Local dev: `python3 -m http.server 8080` (`.claude/launch.json`;
`file://` does not work with modules).

Decisions already made (do not re-litigate): ES modules · deer lives in `animals/deer.js` and talks to the garden through a
small garden-facing API · files are split only for real independent logic, never for tidiness · dead-CSS cleanup is a
separate, later phase (never mixed into structural moves).

---

## Quick routing: which files do I read?

| Request is about… | Read (and only this) |
|---|---|
| a creature (new or existing) | `animals/animals.js` + that creature's file + `core/scheduler.js` + `css/animals.css` |
| deer | `animals/deer.js` + garden host API in `garden/garden.js` |
| birds / nest / seed feeding | `animals/birds.js` (guide bird: `animals/guide-bird.js`) |
| weather, rain, sun, wind | `environment/weather.js` or `breeze.js` + `css/environment.css` |
| flowers on the page (turning, touch, pollen) | `plants/flowers.js` |
| side vines | `plants/vines.js` (growth) and `plants/vine-sprigs.js` (click-grown) |
| dandelions / seeds | `plants/dandelions.js`, `plants/seeds.js` |
| footer garden game | `garden/*` + `css/garden.css` |
| Experience / Skills / bouquet | `botanical/*` + `css/botanical.css` |
| gallery / lightbox | `gallery/*` + `css/gallery.css` |
| nav, hero, scrolling effects | `navigation/`, `site/hero.js`, `effects/*` |
| Easter egg | `easter-eggs/easter-eggs.js` |
| persistence, random timing, cursor tracking, "is this spot free?" | `core/state.js`, `core/scheduler.js`, `core/pointer.js`, `core/safe-zones.js` |
| something is mobile- or reduced-motion-specific | §5 below, then the owning file |

**Every module starts with a header** (≤ 8 lines): purpose · owns · uses (imports) · used by · mobile / reduced-motion behaviour ·
debug hook if any. Keeping headers true is part of every change; they are what lets a session choose files without opening them.

---

## 0. Where things live right now (as of commit `9b824c4`)

Approximate line numbers; valid only until the code is moved. Use them to read only the range you need.

### script.js

| Lines | What it is | Target home |
|---|---|---|
| 1–35 | `Life` (one-creature-at-a-time director), `WorldState` | `core/scheduler.js`, `core/state.js` |
| 36–116 | **top-level** (not an IIFE): artwork data, lightbox, gallery preview wiring (`let buildCollage`/`updateLightbox` stubs reassigned at 497+), `.reveal` observer, scroll-spy, Escape | `gallery/*`, `effects/scroll-effects.js`, `navigation/` |
| 117–181 | drifting petals (2 canvases) + click bursts | `effects/petals.js` |
| 183–401 | **mixed IIFE "Flower FX"**: hero name-letter wave (202), vine scroll-growth (214–337), click-bloom stamp (339), photo flower pops (361), drifting butterfly (380) | `site/hero.js`, `plants/vines.js`, `effects/flower-fx.js`, `animals/butterflies.js` |
| 403–451 | About word reveal; hero role rotator, photo fan, glow | `site/hero.js` |
| 453–711 | **mixed IIFE "FX v2"**: section-title letters + squiggles (463), gallery preview/modal/collage/lightbox extras (486–694), hero fan rotation (697) | `effects/text-effects.js`, `gallery/*`, `site/hero.js` |
| 713–788 | **mixed**: text hover settle, rainbow cursor glow (735), butterfly cursor + trail (742), gallery rainbow frame (781) | `effects/text-effects.js`, `effects/cursor.js`, `gallery/` |
| 790–877 | **mixed**: page-bg/ambient layers (792), nav pill (796), corner sunflower scroll indicator + back-to-top (805–876) | `effects/scroll-effects.js`, `navigation/` |
| 879–944 | flower nav; vine stems + vine butterflies | `navigation/`, `plants/vines.js`, `animals/butterflies.js` |
| 946–1428 | **side vines**: slots/sprigs (984–1106), `growVine` + tip hint (1107–1195), vine bird (1196–1239), vine caterpillar (1240–1396), flyby birds (1400–1428) | `plants/vine-sprigs.js`, `animals/birds.js`, `animals/vine-caterpillar.js` |
| 1429–1563 | flower patches + scattered blooms/leaves in empty margins | `plants/decor.js` |
| 1564–2376 | **footer garden game** (same IIFE as 946): species art (1603–1711), state/save/badges/HUD (1712–1933), plant/water/input/reset (1787–2006), critters (2007–2151), **deer** (2152–2286), weather (2287–2344), heartbeat (2345–2375) | `garden/*`, `animals/deer.js`, `environment/weather.js` |
| 2378–2389 | info pop-ins, shifting background | `effects/scroll-effects.js` |
| 2391–2520 | red guide bird | `animals/guide-bird.js` |
| 2522–2701 | photo floral frames; text hover colour | `site/hero.js`, `effects/text-effects.js` |
| 2703–3643 | **botanical interface**: content (2752), discoveries (2786), visitor butterfly/bee (2821), plant geometry (2892), **Stage** (2929–3358), bouquet (3375), links (3514), seed of curiosity (3562), hidden moments + tap-hover (3620–3640) | `botanical/*`, `animals/butterflies.js`, `easter-eggs/` |
| 3645–4072 | **the little world**: helpers (3665–3697), sunlight (3699), bird + seed feeding (3729–3853), nest (3855), caterpillar story (3886), dandelion/sprouts (3938–3990), rain cloud (3992), **heartbeat + rare-event roll** (4044), `window.World` | `core/safe-zones.js`, `environment/breeze.js`, `animals/*`, `plants/*`, `environment/weather.js`, `core/scheduler.js` |
| 4074–4652 | "v11 polish": off-screen pause, rainbow letters, `Spin`, `FX`, `GardenLog`, touch responses, late-flower adoption, chrysalis, **dandelions**, two tap-for-hover handlers | `core/particles.js`, `core/state.js`, `plants/*`, `effects/` |

### ecosystem.js (loaded after script.js)
Seed-packet pour (→ `plants/seeds.js`); per-flower breathing, off-screen pause, pollen, click-bloom delay, rare visitor
(→ `plants/flowers.js`); cursor breeze (→ `environment/breeze.js`). Exposes `window.__eco`.

### style.css
Layered by version, **not** by feature; later layers override earlier ones. Banners at: base+spring (1), circles (84), spring
theme (316), flower FX (525), hero v3 (637), FX v2 (717), FX v3 (824), gallery v3 (866), v4 (895), v5 (992), v6 (1053), v7 garden
(1102), v8 (1292), v9 (1364–1550), botanical (1550), little world (2059), v11 polish (2156), ecosystem yard (2356), v12 vines (2556),
v13 living plants (2607). ≈ 72 of 631 class names are never referenced from JS/HTML (mostly the old "yard"/chick/egg styles):
**probably dead; do not touch outside the dead-CSS phase.**

### index.html
Structure and content only: SVG symbol sprite (≈ 15–37), sections `#home #about #experience #skills #gallery #contact`, footer,
`#galleryModal`, `#lightbox`, `<template id="xpData">` (~340 lines) and `<template id="skData">`. Loads `style.css?v=28`,
`script.js?v=33`, `ecosystem.js?v=4 defer`. No inline handlers. Keep it that way.

---

## 1. Target project structure

```
index.html
css/                  one file per responsibility; media queries + reduced-motion live WITH their feature
  base.css            :root tokens, reset, typography, body, page background
  layout.css          hero/about/contact/footer layout + their breakpoints
  navigation.css      nav pill, flower nav, mobile bar, scroll sunflower
  gallery.css         preview, modal, lightbox
  effects.css         petals, cursor, text effects, reveal/pop-ins, shared keyframes
  botanical.css       Experience garden, Skills herbarium, stage, bouquet
  plants.css          decorative flowers, vines/sprigs, dandelions, seeds
  garden.css          footer garden game (bed, plants, HUD, badges)
  animals.css         every creature
  environment.css     rain, sun, breeze, rainbow
js/
  main.js             imports in a fixed, documented order and wires registries. ≤ ~80 lines, no feature code.
  core/
    utils.js          $, $$, rand, pick, clamp, f1, wait, NS, reduce, fine
    scheduler.js      Life (stage director) + ONE heartbeat (onBeat) + weighted rare-event roll
    state.js          WorldState, GardenLog, session stores, storage-key table
    pointer.js        ONE window-level pointer tracker + delegated tap-for-hover helper (late step)
    safe-zones.js     "is this spot free of text/photos/controls?"
    particles.js      the FX particle budget
  site/hero.js        hero letters/rotator/fan/glow, About word reveal, photo frames
  navigation/         navigation.js (pill, flower nav, mobile menu, scroll-spy, in-page links) · scroll-sunflower.js
  gallery/            artworks.js (data) · gallery.js · lightbox.js
  effects/            petals.js · scroll-effects.js · cursor.js · text-effects.js · flower-fx.js
  plants/             plants.js (manager + shared flower art) · flowers.js · decor.js · vines.js · vine-sprigs.js · dandelions.js · seeds.js
  garden/             garden.js (game core + host API) · hud.js (badges, toasts, HUD) · species.js · critters.js
  botanical/          content.js · plant-art.js · stage.js · bouquet.js (+discoveries) · links.js
  animals/            animals.js (manager) · deer.js · birds.js · guide-bird.js · vine-caterpillar.js · caterpillar.js · butterflies.js
  environment/        environment.js (manager) · weather.js · breeze.js
  easter-eggs/        easter-eggs.js
images/
```

Folders/files are created **only when code arrives**. Soft size guide: a module is worth its own file at roughly **40–350 lines** of
real logic (registries/data excepted). Larger → find the seam; smaller → keep it in its manager or sibling.
Candidate splits recorded but decided only when the code is read: `botanical/stage.js` (≈ 430 lines today) may shed
`stage-notes.js` (note HTML builders, 3083–3150) and `stage-flight.js` (3246–3337) if the closure allows.

Deliberately **not** separate files: nest (lives in `birds.js`), fireflies/ladybug/hello tap (in `easter-eggs.js`), sunlight lean + wind
(one file, `breeze.js`, both are cursor-driven forces), the pest bird and garden butterfly (inside `garden/critters.js`),
animal SVG art (stays beside its animal until two files need it; then `animals/art.js`).

Why no `css/responsive.css`: a feature's mobile and reduced-motion rules sit in the same file as the feature. Only layout-level
breakpoints live in `layout.css`.

---

## 2. System responsibilities

One feature, one obvious home. "Not responsible for" matters as much as "responsible for".

**core/** Owns: helpers, stage director, heartbeat, rare-event roll, persistence, pointer tracking, safe-zone checks, particle budget.
Not: any visible feature. Core imports from nothing above it.

**navigation/** Nav pill, flower nav (butterfly flying to your section), mobile menu, scroll-spy, corner sunflower scroll indicator /
back-to-top, in-page links. Not: reveal effects, gallery, garden.

**site/** Hero (letters wave, role rotator, photo fan, glow), About word reveal, scrapbook photo frames. Not: navigation, cursor.

**gallery/** Artwork list, preview grid, modal (filters, shuffle, surprise, masonry), lightbox (arrows, keys, thumbs, zoom, slideshow,
backdrop). Artworks are identified by **file name**, never index. Not: cursor effects, plants, animals.

**effects/** Petals canvas; scroll reveal / off-screen CSS pause / info pop-ins / page background; cursor ring, rainbow glow,
butterfly cursor, magnetic hovers; text hover colours, title letters, rainbow letters; click-bloom stamp + photo flower pops.
Not: anything with persisted state or creatures.

**plants/** Decorative flowers (turning, breathing, touch responses, pollen, click-bloom delay, late-flower adoption), margin patches
and scattered blooms, side vines (scroll growth in `vines.js`, click-grown sprigs in `vine-sprigs.js`), dandelions, seeds that took
root, seed-packet pour. Not: weather, creature behaviour, the footer game, Experience/Skills content. Vines **expose** "this sprig may be
eaten"; animals eat them; vines never know about animals.

**garden/** The footer game: bed, species art, planting/watering/thirst/lifespan, HUD + badges, "start over", own save, own on-screen
tick. Hosts critters (bunny, snail, pest bird, caterpillar, butterfly). Not: deer logic, weather logic, page decoration.
It provides a small **garden-facing API** (`live plants`, `plantAt`, bed geometry, `removePlant(p, how)`, `water`, `shedPetals`,
`flash/toast`, `isNarrow`) that animals and weather plug into.

**botanical/** Experience flowers, Skills specimens (read from the `<template>`s), the open-plant stage, field notes, discoveries, the
bouquet and ribbon, ways-in links, "seed of curiosity". Not: the footer garden, ambient flower motion (`plants/`).

**animals/** Every wandering creature's *behaviour*. Not: weather, plant/flower state, gallery, navigation. See §6.
- `birds.js`: simple variations of "a bird visits something": vine bird, flyby birds, the world bird (seed feeding, petal theft) and the nest they build.
- `guide-bird.js`: the red banner bird (own spot-finding, scroll re-check, bubble). Independent logic, own file.
- `vine-caterpillar.js`: crawls along vine paths (own physics/rAF/eating). `caterpillar.js`: the story twig caterpillar → chrysalis → butterfly life cycle.
- `butterflies.js`: drifting butterfly, vine butterflies, visitor butterfly/bee, tiny touch-butterfly. `deer.js`: the garden deer.

**environment/** `weather.js`: rain clouds (garden and page), sun toggle, rainbow after rain. `breeze.js`: cursor-driven forces on plants
(sunlight lean, wind). Not: creatures, plant growth.

**easter-eggs/** Small hidden moments (ladybug on a leaf, "hello" tap, linger-on-flower visitor, evening fireflies). Each egg is a function
registered with `easter-eggs.js`; promote one to its own file only when it grows real logic.

### Naming glossary (same word, different things)
- **seed**: seed-packet pour (`plants/seeds.js`) · "seed of curiosity" surprise piece (`botanical/links.js`) · seed that feeds a bird (`animals/birds.js`) · dandelion seed/sprout that takes root (`plants/dandelions.js` + `seeds.js`).
- **bird**: guide, vine/flyby, garden pest (in `critters.js`), world bird. **caterpillar**: vine, garden, story.
- **rainbow**: `__rainbow` = the *letter colour wash*; the sky rainbow is in `weather.js`.
- **World** (`window.World`) is today's shared helper bag (safe-zone helpers, `onBeat`, `note`); it disappears into `core/`.

---

## 3. Shared services (`js/core/`)

### utils.js
Replaces helpers re-declared per IIFE (`reduce` ×16, `rand` ×5, `NS` ×9, `clamp` ×4, `f1` ×4, `$`/`$$` ×3). `reduce` and `fine` are
**evaluated once at load** (as today; never make them live).

### scheduler.js: stage director, heartbeat, rare events
- `claim(name, ms, force, onYield)` → true if you may act. `force === true` takes the stage; `'preempt'` takes it only from a creature that
  passed `onYield`; `ms` is a safety timeout. `release(name)`, `busy()`, `calm(ms)` (nothing has set off for `ms`). Contract unchanged from today's `Life`.
- `onBeat(fn)`: the **one** 6 s world heartbeat (skips while `document.hidden`). Never add a `setInterval` for periodic behaviour.
- `rare(name, weight, fn)`: features register their own rare events; the scheduler rolls **one** random number per beat after `calm(40000)`,
  exactly as today's world heartbeat (rain 3 %, thief 3 %, nest visit 6 %). The scheduler never imports a feature.
- Known intentional exceptions (documented, not duplicates): the garden game's own on-screen-only tick (its critters live inside the bed and do
  not use `Life`), the guide bird's own interval, hero rotator/fan intervals, lightbox slideshow, per-creature animation timers.
  The ecosystem rare visitor (a self-rescheduling 90–170 s timeout) becomes a `rare()` registration only in the consolidation phase (it changes timing).

### state.js: persistence
| Key | Storage | Owner |
|---|---|---|
| `mb-world-v1` | localStorage | `WorldState`: explored, story, storyAt, nest, nestShown, ribbon, sprouts, blownAt |
| `mb-garden-v1` | localStorage | garden game save; wiped by "start over" |
| `mb-visits-v1`, `mb-discoveries-v2`, `mb-found-items-v1` | sessionStorage | botanical |
| `mb-grown-v1` | sessionStorage | `GardenLog` (what the visitor touched, found, grew) |

New keys: `mb-<name>-v<n>`; read/write in try/catch; site works with storage blocked; bump the version when the shape changes; register here.
The garden's key stays inside `garden/` (game-specific wipe) but is listed here.

### pointer.js (late step; until then **do not add** another window-level `pointermove`/`mousemove`)
One rAF-coalesced pointer tracker with position, velocity and `subscribe(fn)`. Centralise **only** window-level consumers that just need
"where is the cursor / how fast": rainbow glow, butterfly cursor, vine breeze, sunlight lean, wind (≈ 5–6 listeners today). Also a delegated
`tapHover(selector, ms)` helper replacing the three duplicated "touch has no hover" `pointerdown` handlers (about-hello, flower/specimen, headings).
**Stays local on purpose:** element-scoped listeners (card tilt, hero fan, lightbox zoom, garden-bed breeze, vine hit areas, Stage drag, seed drag,
dandelion brush), because they only matter while the pointer is over/dragging that element and centralising them adds cost, not clarity.
Touch: pointer.js does not track touch position continuously (no hover on touch); drags remain local to their element.

### safe-zones.js (extracted verbatim first; unified later)
`clearAt`, `openSpot`, `contentRects`, `navBottom`, `inView`, `whenUnseen`. Today there are **five** divergent selector lists (`CONTENT` ×2, `BLOCK` ×2,
`BLOCKERS`). They are moved as-is, then unified in a dedicated step because their differences are observable (placement changes). Elements that
belong to the world and may overlap carry `.w-ignore`.

### particles.js
`FX` particle budget (28 on phones, 48 otherwise). Anything spawning repeated visual bits uses `FX.room/track/claim/free`.

---

## 4. Module communication and dependencies

Allowed, in order of preference:
1. **Import a shared service** from `core/`.
2. **Manager registry (host/guest):** the manager exposes `register…()`; guests call it; the manager never imports a guest by name; `main.js` wires them.
3. **Hook registration** when a host needs a callback from a guest (`vines.onLayout(fn)`, `vines.onTick(fn)`, `GardenLog.on(fn)`, `onBeat(fn)`, `pointer.subscribe(fn)`).
4. **A one-way explicit import** when one feature truly depends on another (e.g. `animals/birds.js` imports `plants/vine-sprigs.js`'s `canEat`). Direction must be stated in the file header.

Forbidden: new `window.*` globals (debug hooks behind `?…debug` excepted), importing another feature's internals, reaching into another feature's DOM by
class name, a second director/heartbeat/pointer tracker, **circular imports** (use hooks instead).

Layering: `main → features → managers → core`. Core imports nothing above it.

### Dependency map (target)
- `core/*` ← everything (state: botanical, seeds, caterpillar, birds, dandelions · scheduler: all animals, weather, flowers, easter-eggs · safe-zones: decor, dandelions, seeds, birds, guide-bird, weather, easter-eggs · particles: flowers, dandelions, weather, birds · pointer: cursor, breeze).
- `plants/vines.js` **hosts hooks** (`onLayout`, `onTick`, `onRender`); `vine-sprigs.js` registers into it (today vines↔sprigs call each other through globals: a circular import if copied naively).
- `animals/birds.js`, `vine-caterpillar.js` → read `vine-sprigs.js` (`canEat`, `eat`); `caterpillar.js` → `vines` (chrysalis shows on the vine only when vines are visible).
- `animals/deer.js`, `garden/critters.js`, `environment/weather.js` (garden rain/sun) → garden-facing API from `garden/garden.js`; the garden never imports them (they register).
- `botanical/stage.js` → `effects/text-effects.js` (`rainbow`), `plants/seeds.js` (`pour`), `botanical/bouquet.js`, `core/state.js`.
- `plants/flowers.js` → `animals/butterflies.js` (`visitFlower`) via a registry call, not an import cycle.

### Window-global debt (today → how each disappears)
| Global | Defined (script.js) | Read by | Becomes |
|---|---|---|---|
| `Life`, `GardenLog`, `__fx`, `World` | 26, 4211, 4189, 4063 | many | `core/*` imports |
| `__gm`, `__vineUpdate`, `__vineQ`, `__vineBonus` | 280, 323–326 | 1061, 1055, 1100, 1184 | exports of `plants/vines.js` |
| `__vineSprigs`, `__onVineLayout`, `__onVineTick` | 1075, 1144, 4383 | 303, 252, 319 | hook registration on `vines.js` (breaks the cycle) |
| `__birdSVG`, `__cloudSVG` | 954, 2288 | 3735, 3997/4002 | shared art import (`animals`, `weather`) |
| `__guideBird` | 2470 | 3777, 3798, 3804 | `guide-bird.js` export |
| `__visitFlower` | 2828 | ecosystem.js 148 | `butterflies.js` export |
| `__eco` | ecosystem.js 154 | 3609 | `plants/seeds.js` export |
| `__rainbow`, `__spin`, `__story` | 4117, 4165, 3934 | 3112; 3194, 4023, 931, 939; 4052, 4064 | exports of text-effects / flowers / caterpillar |
| `__deerSVG`, `__scatterPlace`, `__adoptFlowers` | 2025, 1561, 4359 | **no reader found** | verify, then drop |
| `__garden`, `__world`, `__dand`, `__vineDebug` | debug-only (`?gardendebug`, `?worlddebug`, `?v11debug`) | tests | **keep** |

---

## 5. Mobile, touch and reduced-motion contract

Every module declares in its header how it behaves on touch / narrow screens / reduced motion. Gating signals that exist today (reuse, don't reinvent):
- `reduce` (once at load): petals not drawn; seed pour returns 0; pollen, wind, rare visitor, world thief skipped; click-bloom 230 ms delay becomes 0; CSS gives still/quiet alternatives (e.g. `.cl-still`). Never changes live.
- `fine` (`hover:hover and pointer:fine`): cursor ring/glow/butterfly cursor, wind, hover-driven effects exist only here.
- **Touch has no hover:** each hover effect needs a tap equivalent (`.is-tapped` on about-hello, flowers/specimens, headings; vine tap hint; tap-to-pour/blow). New hover features must add one.
- Width tiers in use: `innerWidth < 700` (particle cap 28, starter garden 6 vs 10 plants, tighter layouts), `< 1240` (slim vines at the edge, vine butterflies hidden, caterpillar caps 2/1 vs 3/2, vine-bird "wide screens"), garden `narrowBed` `< 600` (deer reach/speed), CSS breakpoints 400/600/640/700/768/900/1000/1200/1239.
- Phones resize the viewport as the address bar moves: relayout only when width changes (vines use a ≥ 160 px height guard). Keep that guard in any new resize handler.
- Hidden tab: `document.hidden` pauses heartbeat work; animation waits also have timer fallbacks (`wait`/`settle`) so nothing hangs.
Each migration step's test (MIGRATION_PLAN) names the mobile and reduced-motion checks for the code it moves.

---

## 6. Feature creation rules (every future session)

Before adding a feature:
1. Read this file (the routing table first).
2. Identify the owning system (§2). If none fits, propose one before coding.
3. Read **only** that system's manager, the relevant module(s), the shared services it uses and its CSS file; use module headers to check what they own.
4. Create or modify the smallest appropriate module; do not create a file for < ~40 lines of logic.
5. Reuse shared infrastructure (§3). Do not copy helpers.
6. Smallest possible integration change (usually one `register…()` line in `main.js`).
7. Do not refactor unrelated systems; note, don't fix, problems elsewhere.
8. Test the feature and the neighbours it could affect (MIGRATION_PLAN "Smoke test"); update the module header and, if you added a hook/dependency, §4.

### Adding a new animal
1. Decide: is it a variation of an existing behaviour (add to `birds.js`, `butterflies.js`…) or does it have meaningful independent logic/state/lifecycle/animation? Only the latter gets `js/animals/<animal>.js`.
2. Implement only that animal's behaviour: appear, move, interact, leave.
3. Take the stage with `claim(name, ms, force?, onYield?)`; `release` always (incl. errors/timeouts). Background drifters pass `onYield`. Trigger with `onBeat` or `rare(name, weight, fn)`, never a new interval.
4. Use `safe-zones.js` for spots, `particles.js` for petals/sparkles, `state.js` for memory. If it interacts with garden plants, use the garden-facing API; with vines, the `vine-sprigs` exports.
5. Register with `animals.js` (`registerAnimal({ name, init, onBeat? })`) + one import/register line in `main.js`.
6. CSS in `css/animals.css` with its own mobile and reduced-motion rules. DOM is created by JS, `aria-hidden="true"`, `pointer-events: none` unless tappable; no `index.html` markup.
7. Test desktop (mouse), mobile (touch, ≤ 700 px, plus the 1239 px tier if vines/garden are involved), reduced motion (absent or static; no timers left).
8. Check cleanup: nodes removed, listeners removed, timers/frames cancelled, `release` called; `document.querySelectorAll('*').length` stable after repeats.
9. Verify other animals and the garden still work.

### Adding a new plant feature
1. Host: decorative flowers → `plants/flowers.js`; vines → `vines.js`/`vine-sprigs.js`; margin placement → `decor.js`; footer-game species → `garden/species.js`; Experience/Skills art → `botanical/plant-art.js`.
2. A new standalone behaviour → file in `plants/`, registered with `plants/plants.js`.
3. Placement via `safe-zones.js`; persisted growth via `state.js` (register the key).
4. Off-screen pause: reuse the existing `.is-off` / `--ps` mechanisms; no new IntersectionObserver per element.
5. CSS in `plants.css` (`garden.css` / `botanical.css` for those hosts). 6. Test desktop, mobile, reduced motion, resize/orientation, and that animals can still eat/visit it.

### Adding an environmental effect
1. Weather/forces go in `environment/` (`weather.js`, `breeze.js`, or a new file with real logic), registered with `environment.js`. Ask `calm(ms)` before starting anything large.
2. Pointer-driven → `pointer.subscribe`; time-driven → `onBeat` / `rare`.
3. Cap particles with `particles.js`; clean up on end.
4. Plants/animals *react* via a hook the effect exposes (e.g. `onRain(fn)`); the effect never edits their DOM.
5. CSS in `environment.css`; reduced motion = still/quiet version. 6. Test desktop, mobile (touch alternative), reduced motion, tab hidden, cleanup.

### Adding an Easter egg
1. Add a function to `easter-eggs/easter-eggs.js` and register it (id, trigger, cooldown via scheduler). If it exceeds ~40 lines of logic, give it a file in `easter-eggs/` and register that.
2. Discoverable but never required, keyboard-safe, never blocks reading or navigation. 3. Persist "found" only through `state.js`.
4. Test touch (no hover), reduced motion, repeated triggering (cooldown), cleanup.

## 7. `main.js` contract and execution order
- `main.js` only imports and wires. **Module evaluation order = import order = the old file order.** Several pieces depend on DOM built earlier
  (title/hero letters before text-effects and rainbow letters; page-bg before layers; flowers placed after layout before late-flower adoption; vines before the garden; the world before "polish").
  The required order is recorded in a comment block in `main.js`; do not reorder imports without checking it.
- Feature modules export `init()` (or register with their manager) rather than running at import time, **once they are out of the legacy slice** (MIGRATION_PLAN Phase B/C). Until then they are side-effect modules in the original order.
- If `main.js` grows past ~80 lines or contains feature logic, something belongs in a manager.

## 8. Architectural rules
- No feature code in `main.js`. One director, one heartbeat, one pointer tracker, one particle budget. No duplicate global state.
- No new `window.*` globals (debug hooks aside). No circular imports.
- No uncontrolled `setInterval`; prefer `onBeat`, observers, rAF with a cancel path. Pause on `document.hidden`.
- Feature behaviour in the feature module; shared behaviour in `core/` or a manager. Do not modify unrelated systems.
- Preserve mobile/touch behaviour and accessibility (decorative DOM `aria-hidden`; interactive things focusable with visible focus; Escape closes overlays; the garden bed keeps its `role="button"` keyboard path).
- Respect `prefers-reduced-motion` (evaluate `reduce` once; provide a still/quiet alternative, not a broken one).
- Clean up temporary DOM, listeners, timers, observers and animation frames.
- CSS: media queries and reduced-motion rules beside the feature; no new `!important` unless fixing a documented override; later-in-file wins, so **`<link>` order in `index.html` is part of the cascade**.
- **Move code first, change behaviour later, never both in one commit.** Dead-code/CSS cleanup is its own phase.
- Cache-busting: module imports do not inherit `?v=` from `main.js`; bump `main.js?v=` and any changed CSS `?v=`; see MIGRATION_PLAN risk note.
