/* =====================================================================
   v11 polish pass. Runs last, so it can reuse everything above: the Life
   director, WorldState and the World helpers.
   ===================================================================== */
(function () {
    'use strict';
    /* sections far off screen pause their CSS animations (see .is-off in style.css): js/effects/scroll-effects.js */
    MB.use('effects.scroll-effects').offscreen();

    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];

    /* Rainbow letters (js/effects/text-effects.js); it also publishes window.__rainbow */
    MB.use('effects.text-effects').rainbowLetters();
    /* ------------------------------------------------------------------
       Small shared pieces: a particle budget (petals, seeds, sparkles and
       raindrops all draw from it, so repeated clicking can never pile up
       hundreds of them) and the session log of what the visitor touched,
       found and grew, which the garden at the bottom is made from.
       ------------------------------------------------------------------ */
    const FX = MB.use('core.particles').FX;
    window.__fx = FX;
    const GardenLog = MB.use('core.state').GardenLog;
    window.GardenLog = GardenLog;

    /* Turning flowers, touching a flower, late-flower adoption (js/plants/flowers.js); `seeded` and `REACT` are handed on to the dandelions below */
    const { seeded, REACT } = MB.use('plants.flowers').start();

    /* The chrysalis on the left vine (js/animals/caterpillar.js) */
    MB.use('animals.caterpillar').vineChrysalis();

    /* the dandelions (js/plants/dandelions.js): `seeded` and `REACT` are still private to this file, so they are handed over */
    MB.use('plants.dandelions').start({ seeded, REACT });

    /* touch screens have no hover: a tap on a garden flower or specimen gives the same little lift for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.g-cat, .h-spec'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tapF); h.__tapF = setTimeout(() => h.classList.remove('is-tapped'), 900);
    }, { passive: true });

    /* touch screens have no hover: a tap on a heading gives the same colour change for a moment */
    document.addEventListener('pointerdown', e => {
        if (e.pointerType === 'mouse') return;
        const h = e.target.closest && e.target.closest('.rb-host'); if (!h) return;
        h.classList.add('is-tapped'); clearTimeout(h.__tap); h.__tap = setTimeout(() => h.classList.remove('is-tapped'), 1600);
    }, { passive: true });
})();

