/* js/world/world.js
   Purpose : the little world's wiring: sunlight, the birds/nest/seed, the caterpillar story, the dandelion seeds that took root, the rare-event heartbeat (rain / petal thief / nest visit in ONE roll, seed spawn as a beat callback), the shared helper registry (core.world, formerly window.World) and the ?worlddebug hook window.__world.
   Owns    : init() (everything legacy/200 did, in the same order), placeIn (where a dandelion may stand in a section).
   Uses    : core.state (WorldState), core.scheduler (Life, Beat), core.safe-zones, core.world, animals.birds, animals.caterpillar, plants.seeds, environment.breeze, environment.weather.
   Used by : js/main.js (init(), after the garden/botanical code and before the v11 flower pass, where legacy/200 ran).
   Mobile / reduced motion: unchanged (nothing here adds motion of its own).
   Moved verbatim from legacy/200 (Phase D); window.World became the core.world registry; behaviour, order and timing unchanged. */
MB.define('world.world', ['core.state', 'core.scheduler', 'core.safe-zones', 'core.world'], function (state, scheduler, zones, World) {
    'use strict';
    const { WorldState } = state, { Life } = scheduler;

    function init() {
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const rand = (a, b) => a + Math.random() * (b - a);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const f1 = v => (+v).toFixed(1);
    const W = WorldState.get();
    const save = () => WorldState.save();
    const NS = 'http://www.w3.org/2000/svg';
    /* safe-zone helpers (js/core/safe-zones.js): is anything the visitor reads or clicks at (x, y)? */
    const { clearAt, navBottom, openSpot, whenUnseen, checkWaiting, inView, contentRects } = MB.use('core.safe-zones');

    /* Sunlight (js/environment/breeze.js) */
    MB.use('environment.breeze').start();

    /* The world's birds, the seed to feed them, petal theft and the nest (js/animals/birds.js) */
    const { seed, steal, nest, gather, sparkle } = MB.use('animals.birds');

    /* The caterpillar's story (js/animals/caterpillar.js) */
    const caterpillar = MB.use('animals.caterpillar');
    caterpillar.start();

    /* ------------------------------------------------------------------
       The dandelion: tap it or brush across it and its seeds float off on
       the breeze. A few may take root further down the page, later.
       ------------------------------------------------------------------ */
    const seeds = MB.use('plants.seeds');   /* seeds that took root: js/plants/seeds.js */
    function placeIn(sec, w, h, extra = []) {
        const sr = sec.getBoundingClientRect(), blocks = contentRects(sec).concat(extra), W2 = document.documentElement.clientWidth, m = 12;
        for (const fy of [0.995, 0.97, 0.9, 0.8, 0.68, 0.55, 0.4]) for (const fx of [0.025, 0.975, 0.06, 0.94, 0.12, 0.88, 0.2, 0.8]) {
            const cx = sr.left + sr.width * fx, by = sr.top + sr.height * fy, box = { l: cx - w / 2, r: cx + w / 2, t: by - h, b: by };
            if (box.l < 6 || box.r > W2 - 6 || box.t < sr.top + 4 || box.b > sr.bottom - 2) continue;
            if (blocks.some(r => r.left < box.r + m && r.right > box.l - m && r.top < box.b + m && r.bottom > box.t - m)) continue;
            return { left: cx - sr.left - w / 2, top: by - sr.top - h };
        }
        return null;
    }
    /* (the dandelions themselves live in the v11 pass below: several of them, sharing one drift loop) */
    setTimeout(seeds.sprouts, 1500);

    /* A small rain cloud, rarely (js/environment/weather.js) */
    const { rainCloud } = MB.use('environment.weather');

    /* ------------------------------------------------------------------
       One heartbeat for all of it. Small things are occasional; bigger
       ones wait for a quiet stretch, so the page keeps returning to calm.
       ------------------------------------------------------------------ */
    /* the heartbeat itself and the single weighted rare-event roll live in js/core/scheduler.js (Beat) */
    const { Beat } = MB.use('core.scheduler');
    Beat.rare('rain', 0.03, rainCloud);
    Beat.rare('thief', 0.03, steal);
    Beat.rare('nest-visit', 0.06, () => nest.visit());
    Beat.start(6000,
        () => { checkWaiting(); caterpillar.advance(); nest.render(); },
        beats => { if (beats > 6 && !seed.el && W.explored >= 2 && Math.random() < 0.06) seed.spawn(); });

    Object.assign(World, {
        note(n) { W.explored += n || 1; save(); caterpillar.advance(); },
        /* shared with the v11 pass below, so it reuses these instead of making its own */
        sparkle, gather, placeIn, openSpot, clearAt, inView, whenUnseen, contentRects,
        seedAt: at => seed.spawn(at), hasSeed: () => !!seed.el, nestStage: () => W.nest,
        plantSeed: seeds.plantSeed, onBeat: fn => Beat.onBeat(fn), calm: ms => Life.calm(ms)
    });
    /* test hook, only when the page is opened with ?worlddebug */
    if (/[?&]worlddebug\b/.test(location.search)) window.__world = { seed: () => seed.spawn(), steal, rain: rainCloud, nestVisit: () => nest.visit(), state: W, sprouts: seeds.sprouts };
    }

    return { init };
});
