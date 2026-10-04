/* js/core/scheduler.js
   Purpose : the stage director: only one wandering creature moves at a time, so the page keeps returning to calm.
   Owns    : `Life` (claim / release / busy / calm) and `Beat`: the ONE world heartbeat (onBeat callbacks, the single weighted rare-event roll, start).
   Uses    : nothing.   Used by: every creature and rare event (legacy blocks in script.js today; js/animals/* and js/environment/* later).
   Mobile / reduced motion: no gating of its own; callers skip themselves under reduced motion.
   Life moved verbatim from script.js (Migration Step 2); Beat moved verbatim from legacy/200's heartbeat (Step 10f): same 6 s interval, same order, same one roll. */
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

    /* =====================================================================
       Beat: one heartbeat for the little world. Small things are occasional;
       bigger ones wait for a quiet stretch (Life.calm), then ONE random roll
       picks at most one rare event: weights are cumulative in registration
       order, so weights 0.03 / 0.03 / 0.06 give exactly r<.03, r<.06, r<.12.
       Per beat: pre() (unguarded), the onBeat callbacks (each guarded),
       post(beats) (unguarded), then the calm gate and the roll.
       ===================================================================== */
    const Beat = (() => {
        const fns = [], rares = [];
        let beats = 0;
        return {
            onBeat: fn => fns.push(fn),
            rare: (name, weight, fn) => rares.push({ name, weight, fn }),
            start(ms, pre, post) {
                setInterval(() => {
                    if (document.hidden) return;
                    beats++;
                    pre && pre();
                    fns.forEach(fn => { try { fn(beats); } catch (e) { } });
                    post && post(beats);
                    if (!Life.calm(40000)) return;                  /* quiet stretch first */
                    const r = Math.random();
                    let acc = 0;
                    for (const e of rares) { acc += e.weight; if (r < acc) { e.fn(); break; } }
                }, ms);
            }
        };
    })();

    return { Life, Beat };
});
