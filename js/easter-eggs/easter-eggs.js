/* js/easter-eggs/easter-eggs.js
   Purpose : small hidden moments: tap a scattered leaf and a ladybug walks out; fireflies around the contact section in the evening (local time); a tap gives "hello, I'm Madison" its colour change; the footer year.
   Owns    : those four handlers.   Uses: botanical.content ($, reduce), animals.butterflies (LADYBUG).   Used by: legacy/190 orchestrator (start()).
   Mobile / reduced motion: the ladybug and fireflies are skipped under prefers-reduced-motion; the hello tap exists for touch (pointerType != mouse).
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('easter-eggs.easter-eggs', ['botanical.content', 'animals.butterflies'], function (content, creatures) {
    'use strict';
    const { $, reduce } = content, { LADYBUG } = creatures;

    function start() {
    /* ------------------------------------------------------------------
       Small hidden moments
       ------------------------------------------------------------------ */
    /* tap a scattered leaf and a ladybug walks out across it */
    document.addEventListener('click', e => {
        const leaf = e.target.closest('.sc-leaf'); if (!leaf || reduce) return;
        const bug = document.createElement('span'); bug.className = 'ladybug on-leaf'; bug.setAttribute('aria-hidden', 'true'); bug.innerHTML = LADYBUG;
        leaf.appendChild(bug); setTimeout(() => bug.remove(), 3600);
    });
    /* fireflies glow around the contact section in the evening (local time) */
    (function () {
        const h = new Date().getHours(), sec = $('#contact'); if (!sec || reduce || (h >= 6 && h < 19)) return;
        const box = document.createElement('div'); box.className = 'fireflies'; box.setAttribute('aria-hidden', 'true');
        box.innerHTML = Array.from({ length: 5 }, (_, k) => '<i style="--k:' + k + ';left:' + (8 + k * 19) + '%;top:' + (20 + (k * 37) % 60) + '%"></i>').join('');
        sec.appendChild(box);
        new IntersectionObserver(es => es.forEach(en => box.classList.toggle('on', en.isIntersecting))).observe(sec);
    })();

    /* touch screens have no hover: a tap gives "hello, I'm Madison" the same gentle colour change */
    const hello = $('.about-hello');
    if (hello) hello.addEventListener('pointerdown', e => { if (e.pointerType === 'mouse') return; hello.classList.add('is-tapped'); clearTimeout(hello._t); hello._t = setTimeout(() => hello.classList.remove('is-tapped'), 1600); });

    /* footer year */
    const fy = $('#footerYear'); if (fy) { const y = new Date().getFullYear(); if (y >= 2026) fy.textContent = y; }
    }

    return { start };
});
