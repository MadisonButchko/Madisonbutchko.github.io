/* js/animals/art.js
   Purpose : creature and cloud art that more than one file draws: the vine/flyby bird (also the garden's bird pest) and the rain cloud (the page cloud and the garden cloud).
   Owns    : BIRD_SVG, CLOUD_SVG (plain SVG strings).   Uses: nothing.   Used by: plants/plants.js (re-exports BIRD_SVG), animals/birds.js, environment/weather.js.
   Mobile / reduced motion: static art.
   Moved verbatim from plants/plants.js and environment/weather.js (Phase D, "share art where two files use it"); replaces window.__birdSVG / window.__cloudSVG. */
MB.define('animals.art', [], function () {
    'use strict';
    const BIRD_SVG = '<svg viewBox="0 0 40 32"><path d="M5 15 L0 10 L1.5 18 Z" fill="#7fb3cc"/><ellipse cx="18" cy="18" rx="13" ry="10" fill="#a9d8ea"/><ellipse cx="20" cy="22" rx="8" ry="5.5" fill="#fff4e0"/><circle cx="29" cy="11" r="7" fill="#a9d8ea"/><circle cx="31" cy="9.5" r="1.4" fill="#5a4366"/><circle cx="31.5" cy="13.2" r="1.6" fill="#f9c6d6" opacity=".85"/><path d="M35 10.5 L40 12.5 L35 14 Z" fill="#f2c230"/><g class="c-wing"><path d="M11 15 C15 5 26 7 24 16 C21 20 13 20 11 15Z" fill="#8fc3dc"/></g><path d="M15 27.5 L14 31.5 M21 27.5 L22 31.5" stroke="#c98a06" stroke-width="1.3" stroke-linecap="round"/></svg>';
    const CLOUD_SVG = '<svg viewBox="0 0 110 62" aria-hidden="true"><path class="cl-body" d="M26 54 C12 54 7 41 17 35 C13 22 28 13 39 19 C44 7 65 4 73 17 C84 11 99 19 96 32 C107 35 105 54 91 54 Z"/><circle cx="46" cy="36" r="2.3" fill="#5a4366"/><circle cx="64" cy="36" r="2.3" fill="#5a4366"/><path d="M51 42 Q55 45.5 59 42" stroke="#5a4366" stroke-width="1.6" fill="none" stroke-linecap="round"/><ellipse cx="40" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><ellipse cx="70" cy="41" rx="3.4" ry="2.2" fill="#f9c6d6"/><g class="cl-still" fill="#8cc4e6"><rect x="30" y="62" width="2.4" height="8" rx="1.2"/><rect x="46" y="66" width="2.4" height="10" rx="1.2"/><rect x="62" y="63" width="2.4" height="8" rx="1.2"/><rect x="78" y="67" width="2.4" height="10" rx="1.2"/></g></svg>';

    return { BIRD_SVG, CLOUD_SVG };
});
