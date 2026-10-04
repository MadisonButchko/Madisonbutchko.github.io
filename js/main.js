/* js/main.js
   Purpose : the LAST script: starts every feature, in the one order the site has always run them (wiring only, no feature code).
   Owns    : nothing.   Uses: every feature module (each exposes start()/init()/named entry points; none but gallery's first block runs at definition any more).
   Order   : this sequence IS the old script order (the former legacy files 020-210 and ecosystem.js, in tag order), so listener registration order,
             DOM creation order and timers are unchanged. Do not reorder without re-running the baseline (tools/README.md).
   Debug   : ?v11debug adds window.__vineDebug here; the other debug hooks (__world, __garden, __dand, __v11) are added by their modules. */
(async function () {
    'use strict';
    const use = MB.use;
    /* Each old script ended with a microtask checkpoint (MutationObserver callbacks ran there). One script can't do that by itself,
       so `await boundary()` marks every place an old script ended: pending observer callbacks run exactly where they used to. */
    const boundary = () => Promise.resolve();
    const { reduce } = use('core.utils');
    const gallery = use('gallery.gallery'), scroll = use('effects.scroll-effects'), text = use('effects.text-effects'), cursor = use('effects.cursor');
    const nav = use('navigation.navigation'), hero = use('site.hero'), vines = use('plants.vines'), flowers = use('plants.flowers');
    const birds = use('animals.birds'), bouquet = use('botanical.bouquet');

    scroll.reveal(); nav.scrollSpy();                                  /* reveal-on-scroll, scroll-spy */
    await boundary();
    use('effects.petals').init();                                      /* drifting petals + click bursts */
    await boundary();
    hero.letters();                                                    /* hero name letters */
    await boundary();
    vines.start();                                                     /* the side vines grow with scroll */
    await boundary();
    use('effects.flower-fx').init();                                   /* click blooms, photo flower pops */
    await boundary();
    use('animals.butterflies').drift();                                /* a butterfly drifts across now and then */
    await boundary();
    hero.aboutWords(); hero.heroV3();                                  /* About text, role rotator, photo fan, cursor glow */
    await boundary();
    text.titles(); gallery.enhance(); hero.fanRotation();              /* animated titles, gallery tilt + modal/lightbox, fan rotation */
    await boundary();
    text.hoverSettle(); cursor.glow(); cursor.butterfly(); gallery.frame();
    await boundary();
    scroll.pageBg(); nav.pill();                                       /* background layers, nav pill */
    await boundary();
    use('navigation.scroll-sunflower').init();                         /* corner sunflower + back to top */
    await boundary();
    nav.flowerNav();                                                   /* flower nav */
    await boundary();
    vines.stems();                                                     /* vine near-bloom */
    await boundary();
    birds.init();                                                      /* the nest at the contact photo */
    await boundary();

    /* side vines: sprigs, the vine bird, vine caterpillars, flybys; then patches/blooms and the garden game */
    if (!reduce) {
        const sprigs = use('plants.vine-sprigs');
        sprigs.start();
        const vineBird = birds.vineBird();
        const vineCaterpillar = use('animals.vine-caterpillar').start();
        if (/[?&]v11debug\b/.test(location.search)) window.__vineDebug = { caterpillar: vineCaterpillar, bird: vineBird, VINE: sprigs.VINE, flyby: () => flyby };
        const flyby = birds.flyby();
        if (window.__vineDebug) window.__vineDebug.flyby = flyby;
    }
    use('plants.decor').start();
    use('garden.garden').start();
    await boundary();

    scroll.popins(); scroll.bgShift();                                 /* info pop-ins, slowly shifting background */
    await boundary();
    use('animals.guide-bird').start();                                 /* the little red guide bird */
    await boundary();
    hero.photoFrames();                                                /* photo frames */
    await boundary();
    text.hoverColor();                                                 /* text hover colour */
    await boundary();

    use('botanical.stage').create();                                   /* Experience / Skills stages */
    bouquet.create(); bouquet.markAll(); bouquet.draw();               /* the visitor's bouquet + "visited" marks */
    use('botanical.links').start();                                    /* ways in + a seed of curiosity */
    use('easter-eggs.easter-eggs').start();                            /* hidden moments, footer year */
    await boundary();

    use('world.world').init();                                         /* the little world: sunlight, birds, story, seeds, heartbeat */
    await boundary();

    scroll.offscreen(); text.rainbowLetters();                         /* the v11 pass: off-screen pause, rainbow letters */
    const { seeded, REACT } = flowers.start();                         /* turning flowers, touch responses, late adoption */
    use('animals.caterpillar').vineChrysalis();
    use('plants.dandelions').start({ seeded, REACT });
    flowers.touchTap(); text.tapHover();                               /* tap equivalents of hover lifts */
    await boundary();

    flowers.startAmbient();                                            /* breathing, pollen, click delay, wind, rare visitor (was ecosystem.js) */
})();
