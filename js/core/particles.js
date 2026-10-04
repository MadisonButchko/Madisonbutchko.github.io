/* js/core/particles.js
   Purpose : the particle budget: petals, seeds, sparkles and raindrops all draw from it so repeated clicking can never pile up hundreds of elements.
   Owns    : `FX` (room / track / claim / free / live). Cap is 28 when innerWidth < 700 at load, otherwise 48.
   Uses    : nothing.   Used by: legacy blocks in script.js today; plants/*, environment/*, animals/* later.
   Mobile / reduced motion: the smaller phone cap is decided once at load from innerWidth (as before).
   Moved verbatim from script.js (Migration Step 2); its behaviour is unchanged. */
MB.define('core.particles', [], function () {
    'use strict';

    const FX = (() => {
        let live = 0; const MAX = innerWidth < 700 ? 28 : 48;
        return {
            room: n => Math.max(0, Math.min(n, MAX - live)),
            /* el is removed (and its slot returned) when its animation ends, or after ms at the latest */
            track(el, anim, ms) {
                live++; let done = false;
                const end = () => { if (done) return; done = true; live--; el.remove(); };
                if (anim) anim.onfinish = end; setTimeout(end, ms || 4000);
            },
            /* for particles moved by a script loop instead of an animation */
            claim: n => { const k = Math.max(0, Math.min(n, MAX - live)); live += k; return k; },
            free: k => { live = Math.max(0, live - k); },
            get live() { return live; }
        };
    })();

    return { FX };
});
