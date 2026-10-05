# Background Feature Rules

These are global rules. Apply them to every background feature unless I explicitly override them.
Follow CLAUDE.md and ARCHITECTURE.md. These rules govern requested work; they do not independently authorize changes to existing features.

## Protect portfolio content

- Keep background objects away from text, headings, buttons, links, cards, photos, navigation, and important controls.
- Preserve intentional existing content-attached decorations unless explicitly asked to change them.
- Prefer open margins, corners, whitespace, section edges, and decorative areas.
- Distribute objects naturally with generous spacing. Do not fill every empty area.
- Check collisions with protected content and other objects before placement and during movement where relevant.
- If an area is crowded, choose another safe location. If none exists, defer or omit the decoration.
- Reuse appropriate density limits so the page remains uncluttered.
- Keep portfolio content the main focus.
- Preserve typography, colors, layout, section structure, and the existing visual style.
- Do not create a separate game or garden section. Preserve the existing garden unless explicitly asked to change it.

## Reuse existing systems

- Inspect the owning module and direct dependencies before implementation.
- Reuse existing safe-zone, scheduler, particle, state, utility, and interaction services through their documented APIs.
- Do not introduce a second scheduler, heartbeat, global pointer tracker, particle manager, or exclusion-zone system.
- Extend the existing owning module where possible. Create shared helpers only when necessary functionality is missing and reuse justifies them.
- Keep feature implementation out of main.js.
- Do not centralize pointer handling, unify safe-zone lists, merge timers, or change unrelated scheduling, randomness, or persistence without explicit approval.
- Preserve the static, build-free architecture and existing script/style order.

## Dragging

Only make an object draggable when I explicitly request it.

- Support mouse dragging and touch dragging.
- Provide an accessible alternative when moving the object is necessary to use the feature.
- Keep movement within safe decorative areas.
- Prevent drops over protected content or directly on other draggable objects.
- If dropped somewhere invalid, restore the previous valid position or use the nearest safe location.
- Preserve interactions after moving.
- Preserve normal scrolling outside an active drag.
- Reuse existing interaction infrastructure and clean up temporary drag state and listeners.
- Do not persist positions unless requested.

## Responsive behavior

- Support desktop, tablet, and mobile.
- Do not rely only on hover. Provide appropriate touch and keyboard interactions.
- For affected responsive features, check approximately 375px, 390px, 430px, tablet, and desktop widths.
- Reuse existing breakpoints and viewport handling.
- When space is limited, reduce or omit decorations rather than covering content or causing horizontal scrolling.

## Performance and visual calm

- Keep animations lightweight; prefer transforms and opacity where suitable.
- Reuse existing offscreen and hidden-tab pause mechanisms.
- Clean up temporary particles, DOM nodes, listeners, timers, observers, and animation frames.
- Avoid unnecessary timers and repeated global listeners.
- Do not add an expensive global mousemove listener per object. Preserve justified element-scoped interaction handlers.
- Keep scrolling smooth and preserve initial page-load performance.
- Respect existing reduced-motion behavior.
- Limit simultaneous noticeable animations. Keep major effects occasional.
- Coordinate new effects through existing scheduling services.
- Avoid synchronized activity without changing unrelated timing or probabilities.

## Scope and final checks

- Implement only explicitly requested features. Examples and batch suggestions are not implementation requests.
- For small changes, verify the affected feature and its immediate surroundings.
- After broad background-feature changes, check the whole page for overlap, clutter, clipping, horizontal scrolling, mobile issues, broken interactions, performance regressions, and decorations covering content.
- Confirm decorations do not intercept protected controls.
- Follow CLAUDE.md compatibility checks for file://, local serving, and GitHub Pages.
- Fix regressions introduced by the current work. Report unrelated existing problems without expanding scope.
- Report checks honestly, including anything not verified.
