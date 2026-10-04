/* js/core/world.js
   Purpose : the "little world" registry: one shared object the world's modules read helpers from (note, sparkle, gather, placeIn, openSpot, clearAt, inView, whenUnseen, contentRects, seedAt, hasSeed, nestStage, plantSeed, onBeat, calm).
   Owns    : nothing but the (initially empty) object; world/world.js fills it in init(), before anything calls it. Replaces window.World (Phase D).
   Uses    : nothing.   Used by: animals/birds, botanical/bouquet, plants/dandelions, plants/flowers (they read it at call time), world/world.js (fills it).
   Mobile / reduced motion: not applicable. */
MB.define('core.world', [], function () {
    'use strict';
    return {};
});
