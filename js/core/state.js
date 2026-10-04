/* js/core/state.js
   Purpose : the site's small memories: the world state (localStorage), the session log of what the visitor grew (sessionStorage) and the generic session-store helper.
   Owns    : `WorldState` (key mb-world-v1), `GardenLog` (key mb-grown-v1), `mem(key, fallback)` (sessionStorage helper used by the botanical section).
   Uses    : nothing.   Used by: legacy blocks in script.js (world, botanical, v11 polish) today; plants/*, animals/*, botanical/* later.
   Mobile / reduced motion: storage is optional: every read/write is wrapped in try/catch and the site works with storage blocked.
   Moved verbatim from script.js (Migration Step 2); its behaviour is unchanged. */
MB.define('core.state', [], function () {
    'use strict';

    /* The world's small memory (one localStorage key): how much has been explored, the caterpillar's story,
       the nest, dandelion seeds that took root, and the bouquet ribbon. Works without storage too. */
    const WorldState = (() => {
        const KEY = 'mb-world-v1';
        let st = { explored: 0, story: 0, storyAt: 0, nest: 0, nestShown: 0, ribbon: '', sprouts: [], blownAt: 0 };
        try { Object.assign(st, JSON.parse(localStorage.getItem(KEY)) || {}); } catch (e) { }
        return { get: () => st, save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } } };
    })();

    /* session memory: optional, everything works without storage */
    const mem = (key, fallback) => ({
        get() { try { const v = JSON.parse(sessionStorage.getItem(key)); return v == null ? fallback : v; } catch (e) { return fallback; } },
        set(v) { try { sessionStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* in memory only */ } },
        clear() { try { sessionStorage.removeItem(key); } catch (e) { } }
    });

    /* the session log of what the visitor touched, found and grew, which the garden at the bottom is made from */
    const GardenLog = (() => {
        const KEY = 'mb-grown-v1', LIMIT = 30;
        let st = { items: [], pos: {}, ribbon: '' };
        try { Object.assign(st, JSON.parse(sessionStorage.getItem(KEY)) || {}); } catch (e) { }
        const listeners = new Set();
        const save = () => { try { sessionStorage.setItem(KEY, JSON.stringify(st)); } catch (e) { } };
        return {
            /* one entry per thing (by id); entries are small: what kind of flower, its colours, where it came from */
            add(entry) {
                if (!entry || !entry.id || st.items.some(x => x.id === entry.id)) return false;
                st.items.push(Object.assign({ t: Date.now() }, entry));
                if (st.items.length > LIMIT) st.items.splice(0, st.items.length - LIMIT);
                save(); listeners.forEach(f => f(entry)); return true;
            },
            items: () => st.items.slice(),
            pos: () => st.pos, setPos(id, p) { st.pos[id] = p; save(); },
            ribbon: () => st.ribbon, setRibbon(r) { st.ribbon = r; save(); },
            clear() { st = { items: [], pos: {}, ribbon: '' }; save(); listeners.forEach(f => f(null)); },
            on: f => listeners.add(f)
        };
    })();

    return { WorldState, GardenLog, mem };
});
