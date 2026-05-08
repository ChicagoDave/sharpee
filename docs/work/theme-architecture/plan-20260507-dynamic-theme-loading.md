# Plan: Dynamic Per-Theme CSS Loading and Story-Shippable Themes

**Created**: 2026-05-07
**Branch**: main (TBD)
**Target**: non-React browser client (`templates/browser/` + `packages/platform-browser/`)
**Scope**: platform change + ADR — requires explicit go-ahead per CLAUDE.md.
**Depends on**: `docs/work/theme-architecture/plan-20260507-component-themes.md` (must land first)

---

## Goal

Move themes from co-located CSS blocks in a shared stylesheet to **independently shippable per-theme CSS files** that the platform loads dynamically when a theme is selected. This is the architectural feature that delivers on `feedback_web_client_author_customizable`: stories can register custom themes by pointing the platform at a CSS file in their own assets, without touching platform code.

**Direct payoffs:**

- **Story-shippable themes.** A story author who wants custom UI chrome adds a CSS file to their assets and registers it in `BrowserClient` config. Today this is impossible — themes live in `templates/browser/infocom.css` (platform code).
- **Smaller wire.** Only the active theme's CSS is downloaded. With 5+ themes today and the door open for more, this matters as the catalog grows.
- **Cleaner authoring.** Each theme is a self-contained file, not a block in a 700-line shared stylesheet.

---

## Why this depends on the component-themes plan

This plan is meaningful only after the component vocabulary is published and the existing themes have been ported to it. Reasons:

1. **A theme has to be self-contained to be shippable.** That requires every theme to target a stable contract (`.sharpee-*` classes). Until the contract exists, themes can't stand alone — they piggy-back on each other's structural CSS in `infocom.css`.
2. **Story-shippable themes need a contract authors can write against.** Without `.sharpee-*` classes, a story author has nothing stable to target.
3. **Validation is easier.** When the contract is proven (Phase 2 of the prior plan ports four themes successfully), splitting into per-theme files is a mechanical extraction.

---

## Phase 0 — ADR-171 + design decisions

**Behavior Statement.**
- DOES: writes ADR-171 (Dynamic Per-Theme CSS Loading); resolves the open design questions below; gets sign-off.
- WHEN: after component-themes work (prior plan) reaches Phase 4 and lands.
- BECAUSE: dynamic stylesheet loading touches `ThemeManager` lifecycle, FOUC handling, and the `BrowserClient` config schema. These are platform-stability concerns that deserve an ADR before code changes.
- REJECTS WHEN: any of the open design questions below remain unanswered.

**Open design questions for Phase 0 to resolve:**

1. **Stylesheet swap mechanism.**
   - (a) Two `<link>` tags: load new theme's stylesheet → wait for `load` event → remove old `<link>`. Standard, but introduces a brief window where both are active.
   - (b) Replace `href` on a single `<link>`: simpler, but most browsers don't fire `load` reliably for `href` changes.
   - (c) Shadow DOM / `CSSStyleSheet.replaceSync()`: most modern, no FOUC window, but requires `adoptedStyleSheets` browser support (Chrome 73+, Firefox 101+, Safari 16.4+).
   - Recommendation: (a) two-link with load-event sequencing. Broadest compatibility; FOUC window measured in tens of ms.

2. **FOUC prevention on initial load.** `ThemeManager.applyEarlyTheme()` currently runs synchronously before the body renders, setting `data-theme` from localStorage. With dynamic loading, the *active theme's CSS file* must also be in the `<head>` before render — a `<link>` tag with the right `href` written by an inline `<script>` early in `<head>`. Phase 1 must preserve this property.

3. **Schema for theme registration.**
   - Today: `{ id: 'dos-classic', name: 'DOS Classic' }`
   - Proposed: `{ id, name, cssPath: 'themes/dos-classic.css', fontAssets?: ['fonts/chicago.woff2'] }`
   - Should `cssPath` be required (every theme is its own file) or optional (legacy themes could remain inline)? Recommendation: required after Phase 2; the migration eliminates the inline path entirely.

4. **Story-shippable theme path resolution.**
   - Platform themes live at `themes/<id>.css` relative to the served HTML root.
   - Story themes must be able to live at story-asset paths (e.g., `assets/my-custom-theme.css`).
   - Recommendation: `cssPath` is treated as a literal URL relative to the served HTML root. Stories that ship custom themes set `cssPath: 'assets/my-custom-theme.css'` (or wherever their build copies it). Platform doesn't try to resolve story-vs-platform paths automatically.

5. **Caching and cache-busting.** Theme CSS is served as static files. When a story updates its custom theme CSS, browsers may serve stale versions. Recommendation: include the build hash in the served filename (e.g., `themes/dos-classic.<hash>.css`) — already the build pipeline's pattern for other static assets, just extend.

**Deliverables:** `docs/architecture/adrs/adr-171-dynamic-theme-loading.md` reaching READY via `/adr-review 171`.

---

## Phase 1 — Refactor `ThemeManager` for stylesheet swapping

**Behavior Statement.**
- DOES: rewrites `packages/platform-browser/src/managers/ThemeManager.ts` so `applyTheme(id)` becomes async, loads the new theme's `<link rel="stylesheet">`, awaits its `load` event, then removes the previous theme's `<link>`. `applyEarlyTheme(storageKey)` writes the early `<link>` synchronously into `<head>` from the saved theme id + the registered `cssPath`.
- WHEN: after Phase 0 ADR signs off.
- BECAUSE: the swap mechanism is the platform-side primitive everything else depends on. Get it right in isolation before changing the file layout (Phase 2) or the registration schema (Phase 3).
- REJECTS WHEN: switching themes flashes a frame of unstyled content (FOUC); the previous theme's CSS leaks into the new theme; `applyEarlyTheme` causes any flash on initial load.

**Boundary statement (rule 7a):**
- OWNER: `packages/platform-browser/src/managers/ThemeManager.ts` owns theme application; `BrowserClient` owns config; templates/CSS own visual content.
- SHARED?: yes — every browser-client story uses this manager.
- PROMISE: `ThemeManager` exposes `applyEarlyTheme(storageKey)` and `applyTheme(id)`. `applyTheme` becoming async is a contract change; the public callers — `BrowserClient.initialize()` line ~219 and theme-option click handlers in `MenuManager` — must be updated to `await` it.
- ALTERNATIVES: could keep `applyTheme` sync and fire-and-forget the stylesheet load (callers see the theme switch optimistically; FOUC may appear). Rejected — silent FOUC is the kind of regression that's hard to root-cause later.

**Steps:**

1. Update `ThemeManager.applyTheme(id)` to:
   - Find the theme entry in the registered themes list.
   - Read its `cssPath`.
   - Append a new `<link rel="stylesheet" href="…" data-theme-link="<id>">` to `<head>`.
   - Await the new link's `load` event (or a timeout fallback ~500ms).
   - Set `data-theme="<id>"` on `<html>`.
   - Remove the previously-active `<link data-theme-link="*">` (if any).
   - Persist `id` to localStorage.

2. Update `ThemeManager.applyEarlyTheme(storageKey)` to:
   - Read the saved theme id (or default).
   - Look up its `cssPath` from the registered themes (passed in at module load by an inline `<script>` snippet — see step 4).
   - Synchronously write a `<link>` tag into `<head>` via `document.write` or DOM manipulation before the body renders.
   - Set `data-theme` on `<html>`.

3. Update `BrowserClient.initialize()` to await the `applyTheme` call (was sync).

4. Update the inline `<script>` in `templates/browser/index.html` that calls `applyEarlyTheme` to also pass the registered theme list (so the early script knows what `cssPath` to write).

**Acceptance criteria:**

- Switching themes via Settings → Theme works without FOUC.
- Initial page load with a saved non-default theme shows the correct theme on first paint.
- The previous theme's CSS rules don't apply after a switch (verified via `document.styleSheets` inspection in DevTools).
- Walkthrough chain still passes (no JS-side regression).

---

## Phase 2 — Migrate the five existing themes to per-file

**Behavior Statement.**
- DOES: extracts each theme's CSS block from `infocom.css` (or wherever it lives post-component-themes work) into its own file at `templates/browser/themes/<id>.css`. Updates the build pipeline to copy them.
- WHEN: after Phase 1 lands.
- BECAUSE: the swap mechanism works in Phase 1, but no theme uses it yet. Phase 2 is the migration.
- REJECTS WHEN: any theme behaves visually different after migration (it shouldn't — extraction is mechanical).

**Steps:**

1. For each of the five themes (`dos-classic`, `modern-dark`, `retro-terminal`, `paper`, `system-6`):
   - Create `templates/browser/themes/<id>.css`.
   - Move the `[data-theme="<id>"]` block (and any `@font-face` rules specific to it) into the file.
   - Strip the `[data-theme]` selector wrapper since the file is loaded only when active.
   - Update the theme's entry in `stories/dungeo/src/browser-entry.ts` to include `cssPath: 'themes/<id>.css'`.

2. Update `templates/browser/infocom.css` (or successor) to contain only base CSS — what Phase 1 of the component-themes plan extracted as `base.css`.

3. Update `build_browser_client` in `build.sh` to copy `templates/browser/themes/` to `dist/web/<story>/themes/`.

4. Remove any `[data-theme]` selectors from base CSS — they shouldn't exist anymore since active theme = active stylesheet.

**Acceptance criteria:**

- Each theme renders identically to its post-component-themes-plan state.
- Switching themes loads the correct file (verified in Network tab).
- Walkthrough chain passes.
- No `[data-theme="..."]` selectors remain in base CSS.

---

## Phase 3 — Story-shippable themes (the actual feature)

**Behavior Statement.**
- DOES: extends `BrowserClient` config and `ThemeManager` so stories can register themes whose `cssPath` points into the story's own assets. Validates by shipping a demonstration custom theme from Dungeo (or another willing story).
- WHEN: after Phase 2 stabilizes.
- BECAUSE: this is the user-facing payoff. Phases 1 and 2 are infrastructure; Phase 3 is the feature.
- REJECTS WHEN: a story-registered theme fails to load, leaks into other stories, or doesn't appear in the theme menu.

**Steps:**

1. Verify that `BrowserClient.config.themes[].cssPath` accepts arbitrary URLs (not constrained to `themes/...`). Should already work after Phase 2 — Phase 3 is mostly validation + documentation.

2. Update build pipeline: when `build_browser_client` runs, also copy `${STORY_DIR}/assets/themes/` (if it exists) to `dist/web/${STORY_NAME}/themes/` (or wherever the story's `cssPath` references).

3. Document the author flow in `templates/browser/themes/README.md`: how to write a theme, what classes to target, how to register it in `browser-entry.ts`.

4. **Demonstration:** ship one custom theme from Dungeo to prove the flow end-to-end. Could be:
   - (a) A genuinely Dungeon-themed UI (parchment + iron-band borders).
   - (b) A test fixture (`dungeo-demo`) that's clearly a demo, not a default.
   - Recommendation: (a) if you want it; (b) if you don't. Either proves the architecture; (a) is the more compelling demo.

**Acceptance criteria:**

- Story-registered theme appears in the Settings → Theme submenu alongside platform themes.
- Selecting it loads the story's CSS file (verified in Network tab).
- Switching away to a platform theme cleanly unloads the story theme's stylesheet.
- README is clear enough that a new author could ship a theme without reading source code.

---

## Phase 4 — Smoke test, regression, commit

**Behavior Statement.**
- DOES: full walkthrough regression + manual smoke through all themes + the demonstration story theme; commits the cumulative work.
- WHEN: after Phase 3 lands.
- BECAUSE: integration-reality gate (rule 12a). Multi-stylesheet behavior cannot be verified in Node — real-browser smoke is the only acceptance gate.
- REJECTS WHEN: walkthroughs fail; theme switching exhibits FOUC; any registered theme fails to load.

**Smoke-test script (manual, real browser):**

1. `./build.sh -s dungeo -c browser`
2. `npx serve dist/web/dungeo/` and open in browser.
3. For each registered theme (platform + story-custom):
   - Verify it renders correctly.
   - Open save / restore dialog under it.
   - Switch to next theme; verify clean transition (no FOUC, no leak).
4. Refresh; confirm theme persists.
5. Open DevTools Network tab; confirm only the active theme's CSS is loaded on initial page load.
6. Switch themes; confirm only one new request and one removed `<link>` per switch.

**Walkthrough regression:**
```bash
node dist/cli/sharpee.js --test --chain \
  stories/dungeo/walkthroughs/wt-*.transcript \
  --stop-on-failure
```

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| FOUC during theme switch (window where both stylesheets active) | Medium | Phase 1 step 1 awaits the new link's `load` event before flipping `data-theme`. Tens-of-ms window is acceptable; visible FOUC is not. |
| Initial page load FOUC because `applyEarlyTheme` doesn't wait for the link to load | High if naive | Inline `<link>` in `<head>` blocks render natively. As long as it's written before `<body>`, browser handles it. Phase 1 step 2 must preserve this. |
| `applyTheme` becoming async surfaces a caller that wasn't awaiting | Medium | Inventory all callers in Phase 1. Update each. Walkthrough chain catches obvious ones. |
| Theme assets (fonts) for a story-shippable theme don't load | Medium | Phase 3 documents the asset-path expectation clearly. The build pipeline must copy story-asset folders. |
| Browser caching serves a stale theme CSS after a story update | Medium | Phase 0 question 5: include build hash in served filename. |
| Cross-origin issues with story-shipped themes | Low | Themes are same-origin (served from same `dist/web/<story>/`). Not a concern unless stories load themes from CDNs (out of scope). |

---

## Out of Scope

- **Theme hot-reload during development.** A nice-to-have, not a requirement.
- **Theme inheritance** (one theme extending another). Could be useful for "DOS Classic but with my colors" themes but adds significant complexity. Defer.
- **Runtime theme generation.** Authors writing themes via JS / data structures rather than CSS. Defer.
- **Per-channel theme overrides.** ADR-163 channels could in principle each carry rendering hints; out of scope here.
- **CSS-in-JS / styled-components.** Browser client is plain CSS; staying that way.

---

## Open Questions for David

1. **Story-shippable theme demonstration** — ship a Dungeon-themed UI for Dungeo (parchment + iron borders), or a test fixture demonstrating the mechanism, or skip the demo and let the next author who wants a custom theme prove it? Recommendation: ship a Dungeon-themed UI if you have aesthetic appetite for it; otherwise test fixture.
2. **Build-hash in stylesheet filenames** — adopt now (Phase 0 question 5)? Recommendation: yes, but only if the build pipeline already does this for other assets. Verify in Phase 0.
3. **Sequencing** — this depends on the component-themes plan landing first. Confirmed implicit, but flagging — don't start Phase 0 of *this* plan until Phase 4 of the prior one is committed.

---

## Status

**DRAFT — gated on the component-themes plan reaching its Phase 4 + David's answers to Open Questions above.**

No code changes yet. No commits yet.
