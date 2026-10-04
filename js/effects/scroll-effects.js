/* js/effects/scroll-effects.js
   Purpose : small page-level scroll/visibility effects: reveal-on-scroll, off-screen CSS pause, page background layers, info pop-in indexes, the shifting sky.
   Owns    : reveal(), offscreen(), pageBg(), popins(), bgShift(). Each is called by a legacy file at the exact spot its code used to run (order matters: pageBg before bgShift).
   Uses    : nothing.   Used by: js/legacy/020, 110, 150, 210 (until those are replaced by main.js wiring in Phase D).
   Mobile / reduced motion: no motion of its own; the CSS decides reduced-motion behaviour. Pure DOM/observer setup, same on touch.
   Moved verbatim from the legacy files (Migration Step 6); behaviour, order and timing unchanged. */
MB.define('effects.scroll-effects', [], function () {
    'use strict';

    /* the .reveal observer: adds .visible once a block is 60px into view (was the first line of the old script) */
    function reveal() {
        const rvIO=new IntersectionObserver(es=>es.forEach(e=>{if(e.isIntersecting){e.target.classList.add('visible');rvIO.unobserve(e.target);}}),{rootMargin:'0px 0px -60px 0px'});document.querySelectorAll('.reveal').forEach(e=>rvIO.observe(e));
    }

    function offscreen() {
    /* sections far off screen pause their CSS animations (see .is-off in style.css) */
    const offIO = new IntersectionObserver(es => es.forEach(e => e.target.classList.toggle('is-off', !e.isIntersecting)), { rootMargin: '300px 0px' });
    document.querySelectorAll('main > section, footer').forEach(s => offIO.observe(s));
    }

    function pageBg() {
        const bg = document.createElement('div'); bg.className = 'page-bg'; bg.setAttribute('aria-hidden', 'true');
        const amb = document.createElement('div'); amb.className = 'ambient'; amb.setAttribute('aria-hidden', 'true'); amb.innerHTML = '<span></span><span></span><span></span><span></span>';
        document.body.prepend(amb); document.body.prepend(bg);
    }

    function popins() {
        const groups = ['.hero-tags', '.social-links'];
        groups.forEach(sel => document.querySelectorAll(sel).forEach(g => [...g.children].forEach((el, i) => el.style.setProperty('--ci', i))));
    }

    function bgShift() {
        const sky = document.createElement('div'); sky.className = 'sky-shift'; sky.setAttribute('aria-hidden', 'true'); sky.innerHTML = '<i></i><i></i><i></i>';
        const bg = document.querySelector('.page-bg'); if (bg) bg.after(sky); else document.body.prepend(sky);
    }

    return { reveal, offscreen, pageBg, popins, bgShift };
});
