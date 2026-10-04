/* js/botanical/content.js
   Purpose : what the Experience / Skills botanical interface shares: its small helpers, the session visit counts, the content read from the <template> blocks (EXP, SK), and `ctx`, the registry that replaces the old closure (the stages, bouquet and openById register here; modules read them at call time).
   Owns    : $, $$, wait, frame, settle, esc, plain, f1, clamp, behavior, hash, rng, navH, focusQuiet, bringIntoView, visits/visit (sessionStorage "mb-visits-v1"), EXP, SK, PIECE_WORD, ctx.
   Uses    : core.state (mem).   Used by: every botanical/* module, animals/butterflies.js, easter-eggs.
   Mobile / reduced motion: reduce/fine are read once at load, as before.
   Moved verbatim from legacy/190-botanical.js (Migration Step 13); behaviour, order and timing unchanged. */
MB.define('botanical.content', ['core.state'], function () {
    'use strict';
    const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = matchMedia('(hover: hover) and (pointer: fine)').matches;
    const $ = (sel, root) => (root || document).querySelector(sel);
    const $$ = (sel, root) => [...(root || document).querySelectorAll(sel)];
    const wait = ms => new Promise(r => setTimeout(r, ms));
    /* animation waits never hang: hidden tabs pause frames and animations, so each wait also has a timer */
    const frame = () => Promise.race([new Promise(r => requestAnimationFrame(() => requestAnimationFrame(r))), wait(120)]);
    const settle = (anim, ms) => Promise.race([anim.finished.catch(() => { }), wait(ms + 250)]);
    const esc = s => String(s).replace(/[&<>"]/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[ch]);
    const plain = html => { const d = document.createElement('div'); d.innerHTML = html; return d.textContent.replace(/\s+/g, ' ').trim(); };
    const f1 = v => (+v).toFixed(1);
    const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
    const behavior = () => (reduce ? 'auto' : 'smooth');
    const hash = str => { let h = 2166136261; for (const ch of str) h = Math.imul(h ^ ch.charCodeAt(0), 16777619); return h >>> 0; };
    const rng = a => () => { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; };

    const navH = () => { const n = [$('.m-header'), $('.nav')].find(x => x && x.getClientRects().length); return n ? n.getBoundingClientRect().bottom : 0; };
    const focusQuiet = el => { if (!el) return; if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT|SELECT|TEXTAREA)$/.test(el.tagName)) el.setAttribute('tabindex', '-1'); try { el.focus({ preventScroll: true }); } catch (e) { el.focus(); } };
    /* scroll just enough to show `el` below the nav; if it is taller than the screen, line up its top */
    function bringIntoView(el, pad) {
        if (!el) return;
        pad = pad == null ? 10 : pad;
        const r = el.getBoundingClientRect(), top = navH() + pad, bottom = innerHeight - pad;
        if (r.top < top || r.height > bottom - top) scrollBy({ top: r.top - top, behavior: behavior() });
        else if (r.bottom > bottom) scrollBy({ top: r.bottom - bottom, behavior: behavior() });
    }
    /* session memory: optional, everything works without storage */
    const mem = MB.use('core.state').mem;
    const visitsStore = mem('mb-visits-v1', {});
    const visits = visitsStore.get();
    const visit = id => { visits[id] = (visits[id] || 0) + 1; visitsStore.set(visits); return visits[id]; };

    /* ------------------------------------------------------------------
       Content, read from the templates
       ------------------------------------------------------------------ */
    const EXP = {}, SK = {};
    const xpT = $('#xpData');
    if (xpT) $$('.xp-panel', xpT.content).forEach(panel => {
        const cat = panel.dataset.panel, btn = $('#cat-' + cat); if (!btn) return;
        const items = $$('.xp-card', panel).map(card => {
            const html = sel => { const e = $(sel, card); return e ? e.innerHTML.trim() : ''; };
            return {
                id: card.id, cat, minor: card.classList.contains('xp-card--quiet'),
                date: html('.xp-date'), role: html('.xp-role'), org: html('.xp-org'), lead: html('.xp-lead'),
                notes: $$('.xp-more > ul:not(.xp-chips):not(.xp-samples) > li', card).map(li => li.innerHTML.trim()),
                chips: $$('.xp-chips li', card).map(li => li.innerHTML.trim()),
                links: $$('a[href^="http"]', card).map(a => ({ href: a.getAttribute('href'), text: a.firstChild.textContent.trim() })),
                skills: $$('a[data-skill]', card).map(a => ({ key: a.dataset.skill, text: a.textContent.trim() })),
                related: $$('a[data-goto]', card).map(a => ({ goto: a.dataset.goto, text: a.textContent.trim() }))
            };
        });
        EXP[cat] = { cat, kind: 'exp', btn, name: $('.g-name', btn).textContent.trim(), note: btn.dataset.note || '', items, sym: 'cl-' + cat, box: '0 0 120 110' };
    });
    const skT = $('#skData');
    if (skT) $$('section[data-cat]', skT.content).forEach(sec => {
        const cat = sec.dataset.cat, btn = $('#sk-' + cat); if (!btn) return;
        const intro = $('.sk-intro', sec);
        SK[cat] = {
            cat, kind: 'skill', btn, plant: sec.dataset.plant || 'blossom',
            name: $('.h-name', btn).textContent.trim(), no: $('.h-no', btn).textContent.trim(),
            intro: intro ? intro.innerHTML.trim() : '', sym: 'pf-' + cat, box: '0 0 100 100',
            items: $$('li[data-item]', sec).map(li => ({ id: 'skill:' + cat + ':' + li.dataset.item, name: li.dataset.item, html: li.innerHTML.trim(), minor: li.hasAttribute('data-minor') }))
        };
    });
    const PIECE_WORD = { fern: 'frond', umbel: 'floret', eucalyptus: 'leaf', geometric: 'petal', blossom: 'blossom', frilled: 'petal', wheat: 'stem', wildflower: 'flower' };
    const ctx = { xpStage: null, skStage: null, openById: null };

    return { $, $$, wait, f1, clamp, reduce, fine, frame, settle, esc, plain, behavior, hash, rng, navH, focusQuiet, bringIntoView, visits, visit, EXP, SK, PIECE_WORD, ctx };
});
