/* js/plants/seeds.js
   Purpose : dandelion seeds that took root: small flowers that appear later, further down the page, while that spot is out of sight.
   Owns    : SECTIONS (the page's section order), sprouts() (draws the saved sprouts, reveals each while unseen), plantSeed() (adds one, at most 4).
   Uses    : core.state (WorldState, GardenLog), core.utils (rand), core.safe-zones (whenUnseen).
   Used by : legacy/200-little-world.js (the 1.5 s first draw, window.World.plantSeed, the ?worlddebug hook).
   Mobile / reduced motion: no motion of its own; persists in WorldState.sprouts.
   Moved verbatim from legacy/200 (Migration Step 10a); behaviour, order and timing unchanged. */
MB.define('plants.seeds', ['core.state', 'core.utils', 'core.safe-zones'], function (state, utils, zones) {
    'use strict';
    const { rand } = utils, { whenUnseen } = zones, GardenLog = state.GardenLog;
    const W = state.WorldState.get();
    const save = () => state.WorldState.save();
    const SECTIONS = ['home', 'about', 'experience', 'skills', 'gallery', 'contact'];
    /* seeds that took root: small flowers along the bottom of a later section */
    function sprouts() {
        W.sprouts.forEach((sp, k) => {
            const sec = document.getElementById(sp.sec); if (!sec) return;
            let f = sec.querySelector('.w-sprout[data-k="' + k + '"]');
            const reveal = () => {
                if (f) return;
                f = document.createElement('div'); f.className = 'w-sprout'; f.dataset.k = k; f.setAttribute('aria-hidden', 'true');
                const col = ['#fbe7a1', '#f9c6d6', '#d9cbf3'][k % 3], kind = sp.type || 'daisy';
                const stem = '<path d="M12 40 C11 32 13 24 12 14" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 30 C7 28 5 24 5 21 C9 23 11 26 12 30Z" fill="#9fbe88"/>';
                f.innerHTML = '<svg viewBox="0 0 24 40">' + (kind === 'sprout' ? '<path d="M12 40 C11 34 13 30 12 26" stroke="#8db36a" stroke-width="1.4" fill="none"/><path d="M12 27 C6 26 3 21 4 17 C9 18 12 22 12 27Z" fill="#9fbe88"/><path d="M12 28 C17 26 20 22 20 18 C15 19 12 23 12 28Z" fill="#8db36a"/>'
                    : kind === 'dandelion' ? stem + '<use href="#fl-daisy" x="4" y="6" width="16" height="16" style="color:#f6cf3a;--center:#e0a020"/>'
                    : stem + '<use href="#fl-daisy" x="2" y="4" width="20" height="20" style="color:' + col + ';--center:#f2c230"/>') + '</svg>';
                if (GardenLog) GardenLog.add({ id: 'sprout:' + k + ':' + sp.sec, kind: 'sprout', sym: kind === 'sprout' ? 'fl-leaf' : 'fl-daisy', color: kind === 'dandelion' ? '#f6cf3a' : kind === 'sprout' ? '#8db36a' : col, center: '#f2c230' });
                f.style.left = (sp.fx * 100).toFixed(1) + '%';
                sec.appendChild(f); sp.shown = true; save();
            };
            if (sp.shown) reveal(); else if (!f) whenUnseen(sec, reveal);
        });
    }
    /* a dandelion seed that took root: it shows up later, further down, while that spot is out of sight */
    function plantSeed(fromId) {
        if (W.sprouts.length >= 4) return false;
        const here = SECTIONS.indexOf(fromId), next = SECTIONS[Math.min(SECTIONS.length - 1, Math.max(1, here + 1 + (Math.random() < 0.5 ? 1 : 0)))];
        W.sprouts.push({ sec: next, fx: rand(0.06, 0.94), shown: false, type: ['daisy', 'sprout', 'dandelion'][Math.floor(Math.random() * 3)] });
        save(); sprouts(); return true;
    }
    return { sprouts, plantSeed };
});
