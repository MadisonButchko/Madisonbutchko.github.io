# CLAUDE.md

Static, build-free personal site (GitHub Pages). Plain HTML/CSS and classic ordered `<script defer>` files sharing one `window.MB` namespace (no bundler, no npm, **no ES modules**).
It must work from `file://` (double-click), a local server (`python3 -m http.server 8080`) and GitHub Pages (case-sensitive paths); verify all three.

## Read first
- **`ARCHITECTURE.md`** before any structural or feature work. Its routing table says which files to read for a given request.
- **`MIGRATION_PLAN.md`** while the migration is in progress (code may still live in `js/legacy/*` (the old `script.js`) / `ecosystem.js` / `style.css`; ARCHITECTURE §0 maps where). Do not mix feature work into a migration step.

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
