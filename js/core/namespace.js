/* js/core/namespace.js
   Purpose : creates the ONE shared global, window.MB, and its module registry. Always the FIRST script (classic, defer).
   Owns    : MB.define / MB.use / MB.has / MB.modules. Nothing else. No feature code.
   Uses    : nothing.   Used by: every other file under js/ (see ARCHITECTURE.md section 1b).
   Mobile / reduced motion: not applicable.

   A module file is:
       MB.define('animals.deer', ['core.utils', 'core.scheduler'], function (utils, scheduler) {
           'use strict';
           ...private code...
           return { init };                         // public API (anything not returned stays private)
       });
   define() runs the factory immediately, so the <script> tag order in index.html IS the dependency order. A missing
   dependency or a duplicate name throws a message that says what to fix. Circular dependencies cannot be expressed. */
(function () {
    'use strict';
    if (window.MB) return;                                   /* loaded twice: keep the first registry */

    const mods = Object.create(null);
    const order = [];

    const MB = {
        define(name, deps, factory) {
            if (typeof deps === 'function') { factory = deps; deps = []; }
            deps = deps || [];
            if (typeof name !== 'string' || !name) throw new TypeError('MB.define: a module name is required');
            if (typeof factory !== 'function') throw new TypeError('MB.define("' + name + '"): a factory function is required');
            if (name in mods) throw new Error('MB.define: "' + name + '" is already defined');
            const args = deps.map(function (d) {
                if (!(d in mods)) {
                    throw new Error('MB.define: "' + name + '" needs "' + d + '", which is not loaded yet. ' +
                        'Check the <script> order in index.html (a module\'s tag must come after the tags of its dependencies).');
                }
                return mods[d];
            });
            const api = factory.apply(null, args);
            mods[name] = api === undefined ? Object.freeze({}) : api;
            order.push({ name: name, deps: deps.slice() });
            return mods[name];
        },
        use(name) {
            if (!(name in mods)) throw new Error('MB.use: "' + name + '" is not loaded');
            return mods[name];
        },
        has(name) { return name in mods; },
        get modules() { return order.map(function (m) { return { name: m.name, deps: m.deps.slice() }; }); }
    };

    Object.freeze(MB);
    Object.defineProperty(window, 'MB', { value: MB, writable: false, configurable: false, enumerable: true });
})();
