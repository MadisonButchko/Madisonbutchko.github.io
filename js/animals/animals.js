/* js/animals/animals.js
   Purpose : a thin registry so animal modules can be found by name without new globals.
   Owns    : register(name, api), get(name), names().   Uses: nothing.
   Used by : animals/birds.js registers 'birds'. Nothing else reads it yet (the caterpillar and others register here as they move).
   Mobile / reduced motion: not applicable (no behaviour of its own). */
MB.define('animals.animals', [], function () {
    'use strict';
    const reg = Object.create(null);
    return {
        register(name, api) { reg[name] = api; return api; },
        get: name => reg[name],
        names: () => Object.keys(reg)
    };
});
