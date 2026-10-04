/* js/core/safe-zones.js
   Purpose : "is this spot free?" helpers: where a decoration or creature may land without covering anything a visitor reads or clicks, and "do this while nobody is looking".
   Owns    : BLOCK (the list of things that must not be covered), clearAt, navBottom, openSpot, offscreen, whenUnseen (+ its private waiting list), checkWaiting, inView, contentRects.
   Uses    : core.utils ($, $$, rand).   Used by: legacy/200-little-world.js (seeds, birds, rain, dandelions, placeIn, the world heartbeat calls checkWaiting) and, through window.World (clearAt, openSpot, inView, whenUnseen, contentRects), legacy/210-v11-polish.js.
   Mobile / reduced motion: pure geometry/DOM queries; no motion of its own.
   Moved verbatim from legacy/200 (Migration Step 9). The OTHER content-avoidance selector lists (guide bird, scattered blooms, flower patches, dandelion blockers) are deliberately NOT unified here: their differences are observable (Phase D). */
MB.define('core.safe-zones', ['core.utils'], function (utils) {
    'use strict';
    const { $, $$, rand } = utils;

    /* is anything the visitor reads or clicks at (x, y)? decorations and the world's own pieces don't count */
    const BLOCK = 'p,h1,h2,h3,h4,li,a,button,img,input,label,.nav,.hero-text,.collage,.about-body,.about-photo-wrap,.section-head,.section-hint,.xp-head,.garden,.herbarium,.mb-bouquet,.seed-wrap,.gallery-frame,.gallery-deviant,.contact-inner,.garden-bed,.garden-tip,.to-top,.guide-bird,.page-posy,.w-piece,footer';
    function clearAt(x, y, r) {
        if (x - r < 8 || x + r > innerWidth - 8 || y - r < navBottom() + 6 || y + r > innerHeight - 8) return false;
        for (const dx of [-r, 0, r]) for (const dy of [-r, 0, r]) {
            const top = document.elementsFromPoint(x + dx, y + dy).find(e => !e.closest('.w-ignore'));
            if (top && top.closest(BLOCK)) return false;
        }
        return true;
    }
    const navBottom = () => { const n = [$('.m-header'), $('.nav')].find(x => x && x.getClientRects().length); return n ? n.getBoundingClientRect().bottom : 0; };
    function openSpot(r, tries) {
        for (let k = 0; k < (tries || 40); k++) {
            const x = rand(20, innerWidth - 20), y = rand(navBottom() + 40, innerHeight - 60);
            if (clearAt(x, y, r)) return { x, y };
        }
        return null;
    }
    /* runs fn once the element is out of view (so changes happen while nobody is looking) */
    const offscreen = el => { const r = el.getBoundingClientRect(); return r.bottom < 0 || r.top > innerHeight || !r.width; };
    const waiting = [];
    function whenUnseen(el, fn) {
        if (offscreen(el)) { fn(); return; }
        let done = false;
        const once = () => { if (done) return; done = true; io.disconnect(); fn(); };
        const io = new IntersectionObserver(es => { if (!es[0].isIntersecting) once(); });
        io.observe(el);
        waiting.push({ el, once, done: () => done });   /* the heartbeat double-checks, in case the observer is throttled */
    }
    function checkWaiting() { for (let i = waiting.length - 1; i >= 0; i--) { const w = waiting[i]; if (w.done()) waiting.splice(i, 1); else if (offscreen(w.el)) { w.once(); waiting.splice(i, 1); } } }
    const inView = el => { if (!el) return false; const r = el.getBoundingClientRect(); return r.width && r.bottom > 60 && r.top < innerHeight - 40; };

    /* what a reader actually sees in a section: text lines, images and controls (not the empty width of their boxes) */
    function contentRects(sec) {
        const rects = $$('img, button, a, input, svg.g-art, svg.h-art, .collage, .gallery-frame, .contact-photo, .about-photo, .seed-art, .page-posy, .scatter, .w-sprout, .gs-inner, .title-bloom, .w-dandelion:not([hidden]), .v11-bud', sec).map(e => e.getBoundingClientRect());
        const tw = document.createTreeWalker(sec, NodeFilter.SHOW_TEXT, { acceptNode: n => n.textContent.trim() && !n.parentElement.closest('template, .vh') ? 1 : 2 });
        const range = document.createRange();
        for (let n = tw.nextNode(); n; n = tw.nextNode()) { range.selectNodeContents(n); rects.push(...range.getClientRects()); }
        return rects.filter(r => r.width && r.height);
    }

    return { BLOCK, clearAt, navBottom, openSpot, offscreen, whenUnseen, checkWaiting, inView, contentRects };
});
