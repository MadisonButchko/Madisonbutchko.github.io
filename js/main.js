/* js/main.js
   Purpose : the LAST script: starts the things that must run after every other script (wiring only, no feature code).
   Owns    : nothing.   Uses: plants.flowers.   Used by: nothing.
   It runs where ecosystem.js used to run (end of the deferred script list), so listener and init order are unchanged. */
(function () {
    'use strict';
    MB.use('plants.flowers').startAmbient();                 /* breathing, pollen, click delay, wind, rare visitor (was ecosystem.js) */
})();
