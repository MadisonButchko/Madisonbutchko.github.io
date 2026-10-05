# CLAUDE.md

Static, build-free personal site (GitHub Pages). Plain HTML/CSS and classic ordered `<script defer>` files sharing one `window.MB` namespace (no bundler, no npm, **no ES modules**).
It must work from `file://` (double-click), a local server (`python3 -m http.server 8080`) and GitHub Pages (case-sensitive paths); verify all three.

## Read first
- **`STATUS.md`** before any edit.
- **`ARCHITECTURE.md`** before any structural or feature work. Its routing table says which files to read for a given request.
- **`MIGRATION_PLAN.md`** is historical/reference only. Read it only for requests about unfinished migration work (code may still live in `js/legacy/*` / `ecosystem.js` / `style.css`; ARCHITECTURE §0 maps where). Do not mix feature work into a migration step.

## Background features
Before adding or modifying background decorations, plants, creatures, ambient effects, or draggable objects, read `BACKGROUND_RULES.md` and the relevant ownership guidance in `ARCHITECTURE.md`.
These are global rules. Apply them to every background feature unless I explicitly override them.
Reuse existing modules and shared services. These rules do not authorize unrelated refactoring, consolidation of existing infrastructure, or changes to unrelated features. Scale verification to the requested change.

## Rules
- Preserve existing design, content, animation, timing and behavior unless explicitly asked to change it. This is not a redesign.
- Make the smallest relevant change. No unrelated refactors; note problems you notice elsewhere instead of fixing them.
- Keep each feature in its documented owning module. Reuse shared services (`js/core/`: state, scheduler, pointer, safe-zones, particles, utils) instead of duplicating infrastructure. No new `window.*` globals (`MB` and the `?…debug` hooks excepted), no second scheduler, heartbeat or global pointer listener.
- Preserve desktop, mobile/touch (every hover effect needs a tap equivalent), accessibility, and `prefers-reduced-motion` behavior.
- Clean up everything temporary: listeners, timers, observers, animation frames, DOM nodes.
- `main.js` only wires modules (it is the last script). Never put feature implementation in it.
- Moving code and changing behavior never happen in the same commit.
- Don't touch the files in `tools/` or `tools/baseline/` as part of site work; they are verification aids.
- Commit or push only when asked.

## Responsive / Mobile Requirements
Mobile compatibility is a default requirement for every visual, interactive, animation or layout change, even when the prompt doesn't mention mobile.
- Treat desktop and phone as separate layouts when needed; don't just shrink the desktop version. Account for both for every new feature.
- Adapt size, position, spacing, animation bounds and layout to the available screen. Respect existing mobile-specific positioning and breakpoints.
- Use targeted media queries when desktop and mobile need different placement or sizing. Don't alter unrelated desktop or mobile layout to fit a new feature.
- New elements must never unintentionally cover or obstruct text, photos, buttons, navigation, game elements or other interactive/decorative features. Check `z-index`/stacking so everything layers as intended.
- Prevent clipping, off-screen elements, unintended overlap and horizontal scrolling.
- Interactions must work with touch as well as mouse/keyboard where applicable.
- **Required verification:** before calling any visual or interactive change complete, check it at desktop and phone-sized viewports and confirm: (1) correct placement and scale; (2) no unintended overlap or obstruction; (3) no horizontal overflow; (4) correct stacking/`z-index`; (5) touch interactions work; (6) animations stay within their intended area.

## Feature workflow
Follow this automatically for every new feature, modification or bug fix.

### 1. Orient
- Read `STATUS.md`, then use `ARCHITECTURE.md` to find the owning system.
- Inspect only the owning module, its direct dependencies, relevant styles and relevant shared services. Don't scan the whole repo unless necessary.

### 2. Choose one home per feature
- Extend an existing module if the behavior naturally belongs there.
- Create a new module only if the feature has meaningful independent logic, state, lifecycle, interactions, animation, dependencies or likely future expansion. No tiny files for trivial behavior.
- Never put feature code in `main.js` (wiring/init only).

### 3. Reuse before creating
Check for existing infrastructure first: shared state, scheduling/rare events, animals, plants, garden, weather/environment, safe zones, navigation, gallery, botanical systems, effects, touch/mobile handling, reduced motion, storage/persistence, utilities. Never duplicate schedulers, global state, timers, pointer trackers, safe-zone systems, utilities, event infrastructure or persistence.

### 4. Smallest change
Implement only what the request requires. Don't refactor unrelated code, redesign unrelated parts, optimize working systems without reason, rename unrelated code, change existing timing/randomness, change storage semantics, change unrelated responsive behavior, or clean up things you merely notice.

### 5. Compatibility
Preserve desktop, mobile, touch, keyboard/accessibility, responsive breakpoints, `prefers-reduced-motion`, `file://`, local server and GitHub Pages. No ES-module requirement or other change that breaks `file://` without explicit approval.

### 6. Lifecycle
Clean up DOM nodes, listeners, timers, intervals, observers, animation frames and temporary state. No uncontrolled loops or duplicate global listeners.

### 7. Testing
- Isolated feature: test the requested behavior and directly related behavior, check console errors, and test mobile/reduced motion if relevant.
- Structural/high-risk change: use the existing regression/baseline tools and test broader affected systems. Don't rebuild test infrastructure unless existing tools can't verify the change.
- Don't investigate known animation/randomness screenshot noise unless reproducible or a real regression.
- A passing automated test does not override a manually observed regression.

### 8. Needs explicit approval
Don't automatically: centralize pointer sampling, unify safe-zone selector behavior, merge timers/heartbeats, alter randomness/probabilities, alter scheduling timing, alter persistence/storage behavior, or remove intentional hooks that merely look unused. These can change observable behavior.

### 9. Docs
Update `ARCHITECTURE.md` only if ownership or architecture changes. Update `STATUS.md` only for meaningful long-term project-state changes. No doc updates for trivial edits.

### 10. Final response
Keep it brief: what changed, files changed, tests performed, important caveats. No long migration-style report unless asked.
