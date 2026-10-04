/* js/core/scheduler.js
   Purpose : the stage director: only one wandering creature moves at a time, so the page keeps returning to calm.
   Owns    : `Life` (claim / release / busy / calm).
   Uses    : nothing.   Used by: every creature and rare event (legacy blocks in script.js today; js/animals/* and js/environment/* later).
   Mobile / reduced motion: no gating of its own; callers skip themselves under reduced motion.
   Moved verbatim from script.js (Migration Step 2); its behaviour is unchanged. */
MB.define('core.scheduler', [], function () {
    'use strict';

    /* =====================================================================
       Life: one director for every wandering creature. Only one moves at a
       time, so the page keeps returning to calm. A creature asks with
       claim(name, ms) before it sets off and calls release(name) when it has
       gone; `ms` is a safety limit in case it never reports back.
       ===================================================================== */
    const Life = (() => {
        let who = null, until = 0, lastStart = -1e9, yieldFn = null;
        const free = () => !who || performance.now() > until;
        return {
            busy: () => !free(),
            /* force: take the stage regardless. 'preempt': take it only from a creature that offered to yield
               (background drifters pass onYield, and slip away when a creature with somewhere to be arrives) */
            claim(name, ms, force, onYield) {
                if (!free()) {
                    if (force === 'preempt' && yieldFn) { const y = yieldFn; yieldFn = null; y(); }
                    else if (force !== true) return false;
                }
                who = name; until = performance.now() + (ms || 15000); lastStart = performance.now(); yieldFn = onYield || null; return true;
            },
            release(name) { if (who === name) { who = null; until = 0; yieldFn = null; } },
            /* true when nothing has set off for `ms`: bigger events wait for a quiet stretch */
            calm: ms => free() && performance.now() - lastStart > ms
        };
    })();

    return { Life };
});
