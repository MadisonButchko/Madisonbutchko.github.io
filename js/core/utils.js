/* js/core/utils.js
   Purpose : the small helpers that script.js re-declares in many IIFEs, in ONE place.
   Owns    : $, $$, rand, pick, clamp, f1, wait, NS, reduce, fine.
   Uses    : nothing.   Used by: nothing yet (Migration Step 2 only creates it); every extracted module will list it as a dependency.
   Mobile / reduced motion: `reduce` and `fine` are evaluated ONCE at load, exactly like the per-IIFE copies they replace (never live).
   Definitions are copied from the legacy blocks. `f1` here is the string-returning one used by script.js ((+v).toFixed(1));
   ecosystem.js has a different, number-returning `f1` (Math.round(n * 10) / 10): it is NOT the same helper, so it is not unified here. */
MB.define('core.utils', [], function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const rand = (a, b) => a + Math.random() * (b - a);
    const pick = a => a[Math.floor(Math.random() * a.length)];
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const f1 = v => (+v).toFixed(1);
    const wait = ms => new Promise(r => setTimeout(r, ms));
    const NS = 'http://www.w3.org/2000/svg';

    return { $, $$, rand, pick, clamp, f1, wait, NS, reduce, fine };
});
