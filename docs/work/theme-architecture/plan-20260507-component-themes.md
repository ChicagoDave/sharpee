# Plan: Component-Based Theming for the Browser Client

**Created**: 2026-05-07
**Branch**: main (TBD)
**Target**: non-React browser client (`templates/browser/` + `packages/platform-browser/`)
**Scope**: platform change + ADR — requires explicit go-ahead per CLAUDE.md.
**Supersedes**: `docs/work/system-css-theme/plan-20260507-system-css-integration.md`

---

## Goal

Restructure the browser client's theme system so each theme is a **complete component kit**, not a CSS-variable palette swap over a fixed DOM. Define a small, stable **component vocabulary** that themes implement end-to-end. Make `system.css` (Macintosh System 6) one of N theme kits — not a special case.

Today, all four themes share one DOM and differ only in CSS variable values. Authors can change colors and fonts but not chrome. A "Retro Terminal" theme can't have CRT bezel scanlines; a "DOS Classic" theme can't have ASCII box-drawing borders. The architecture is the constraint, not the imagination.

The intended end state:

- A **published component contract** (~6 named components) that the browser client's DOM commits to. Theme CSS targets these components by class.
- Each existing theme **re-authored to the new model** without visual regression — same look, expressed against the new contract.
- **system.css** added as a fifth theme kit, dropping in cleanly because the contract was designed with kits like it in mind.
- Future story authors can ship per-story themes (consistent with `feedback_web_client_author_customizable`).

---

## The Component Vocabulary (proposed contract)

These are the named pieces of the browser client UI. Every theme must style every component. Names use a `sharpee-` prefix to avoid collision with library class names (e.g. system.css's bare `.window` / `.dialog`).

| Component | Class | Purpose |
|-----------|-------|---------|
| Window shell | `.sharpee-window` | The whole-game outer container |
| Window title bar | `.sharpee-window-title-bar` | Title strip at top of the shell (carries story title; theme may add chrome) |
| Window title bar controls | `.sharpee-window-title-bar-controls` | Decoration slot inside the title bar (close box, version stamp, etc.) |
| Menu bar | `.sharpee-menu-bar` | The horizontal menu bar |
| Menu bar item | `.sharpee-menu-bar-item` | A top-level entry (File, Settings, Help) |
| Menu bar trigger | `.sharpee-menu-bar-trigger` | The clickable button inside an item |
| Menu dropdown | `.sharpee-menu-dropdown` | The popup panel that appears on click |
| Menu option | `.sharpee-menu-option` | A row in a dropdown |
| Menu separator | `.sharpee-menu-separator` | The horizontal rule between groups |
| Menu submenu indicator | `.sharpee-menu-submenu-indicator` | Caret marker for nested submenus |
| Status bar | `.sharpee-status-bar` | The location/score row |
| Prose pane | `.sharpee-prose-pane` | The main scrolling text region |
| Prose overlay | `.sharpee-prose-overlay` | Decoration slot above the prose (CRT scanlines, paper grain, etc.) |
| Input bar | `.sharpee-input-bar` | The bottom command line |
| Input prompt | `.sharpee-input-prompt` | The `>` glyph |
| Input field | `.sharpee-input-field` | The actual `<input>` |
| Dialog overlay | `.sharpee-dialog-overlay` | Modal backdrop |
| Dialog | `.sharpee-dialog` | The modal frame itself |
| Dialog title | `.sharpee-dialog-title` | Header strip of a dialog |
| Dialog body | `.sharpee-dialog-body` | Scrollable content region |
| Dialog buttons | `.sharpee-dialog-buttons` | Row of action buttons |
| Dialog button | `.sharpee-dialog-button` | An individual button |

That's ~22 classes for a contract that covers everything in `templates/browser/index.html`. Comparable in scope to system.css's own component set.

**Naming convention:** identifiers are fully spelled out — `title-bar` not `titlebar`, `menu-bar` not `menubar`, `prose-pane` not `prose`. Minimal name set, but no compressed tokens within names.

**State modifiers** (BEM-style suffix):

- `.sharpee-menu-bar-item--open` — submenu is showing
- `.sharpee-menu-option--checked` — has a leading checkmark
- `.sharpee-menu-option--disabled` — non-interactive
- `.sharpee-dialog-overlay--hidden`, `.sharpee-dialog--hidden` — visibility (today's `.modal-hidden`)
- `.sharpee-input-bar--system-message` — for echoed system text styling

**Decoration slots — RESOLVED:**

Two slots are in the contract: `.sharpee-window-title-bar-controls` (decoration inside the title bar — close boxes, version stamps, theme-author chrome) and `.sharpee-prose-overlay` (decoration over the prose pane — CRT scanlines, paper grain). Themes that use neither leave them empty; themes that use them populate via CSS pseudo-elements or theme-side HTML if needed (a future-Phase-5 concern).

**Semantic HTML — RESOLVED:**

Adopt both:
- Menu bar uses `<menu role="menubar">` containing `<li role="menuitem">` entries.
- Modal dialogs use `<dialog>` (HTML5), not generic `<div>`.

Adopting `<dialog>` brings native focus management, ESC-to-close handling, and accessibility for free, but means `DialogManager` rewires its open/close logic to use `dialog.showModal()` / `dialog.close()` instead of toggling a hidden class. Phase 1 takes this on; details in Phase 1's deliverables list.

---

## Theme Authoring Model

A theme is:

```ts
{
  id: string;          // 'dos-classic' | 'modern-dark' | ...
  name: string;        // 'DOS Classic'
  cssPath: string;     // 'themes/dos-classic.css'
  fontAssets?: string[]; // optional, copied alongside the CSS at build time
}
```

A theme **CSS file** must:

1. Provide visual styling for **every component class** in the vocabulary above. A theme that omits styling for `.sharpee-dialog` is incomplete.
2. Be scoped under `[data-theme="<id>"]` at top level — switching themes is still a single attribute flip on `<html>`.
3. Either define its own typography or `@import` the platform's typography defaults.

A theme **CSS file may optionally**:

- Use CSS variables internally (a "minimal" theme can still build everything from a small variable set; a "rich" theme can use raw values everywhere). The contract is the component classes, not the variables.
- Bundle font assets via `@font-face` referencing files in its `fontAssets[]`.

The platform provides a **base CSS layer** (`templates/browser/base.css`) with structural rules that don't belong to any theme: flexbox layout for the menu bar, scrolling behavior for the prose pane, focus ring resets, screen-reader-only utility classes. Themes layer over base.

---

## Migration Strategy — Important

The four existing themes are **ported, not redesigned, in this work.** Same look, expressed against the new contract. Visual evolution of any theme (CRT scanlines for Retro Terminal, ASCII borders for DOS Classic) is **out of scope** for this plan and would be follow-up work.

This keeps the architectural change isolated and risk-bounded. If a theme looks the same after the migration, the migration is correct.

---

## Phase 0 — ADR + Contract Sign-off (no code)

**Behavior Statement.**
- DOES: produces an ADR and a finalized component vocabulary; gets David's sign-off before any DOM or CSS is touched.
- WHEN: first.
- BECAUSE: this contract becomes a stable platform commitment. Once any theme is authored against it, breaking it cascades. Get it right before writing CSS.
- REJECTS WHEN: any of the open questions in this plan don't have an answer.

**Steps:**

1. Write **ADR-170: Component-Based Theming for the Browser Client**.
   - Context: today's variable-swap themes can't express structurally distinct kits; system.css integration forced the question; long-running architectural direction is author-customizable UI (`feedback_web_client_author_customizable`, ADR-163 channels-as-universal-UI-surface, the 2026-04-29 author-enabled-client blog post).
   - Decision: published component vocabulary + per-theme CSS kits + base layer.
   - Consequences: contract becomes a stable platform commitment; each theme is bigger to author than before; system.css and future story-shipped themes drop in naturally; theme files become independently shippable artifacts.
   - Acceptance criteria for the ADR itself: per-component class list with rationale; decoration-slot decisions; semantic-HTML decisions; explicit migration commitment ("ported, not redesigned").

2. Run `/adr-review 170` — must reach READY FOR IMPLEMENTATION before Phase 1.

3. Capture **baseline screenshots** of all four current themes at three states (idle, menu open, save dialog open). Stored in `docs/work/theme-architecture/baseline-screenshots/`. These are the visual-regression gate for Phase 2.

**Deliverables**: `docs/architecture/adrs/adr-170-component-based-theming.md` reaching READY; baseline screenshot set committed.

**Gate to Phase 1**: David approves the ADR.

---

## Phase 1 — Refactor DOM and platform managers to use the new contract

**Behavior Statement.**
- DOES: rewrites `templates/browser/index.html` to use the `sharpee-*` component classes; updates DOM queries in `MenuManager.ts` and `DialogManager.ts` to match; preserves every id consumed by `BrowserClient.initialize()` (`stories/dungeo/src/browser-entry.ts:111-127`).
- WHEN: after Phase 0 ADR signs off.
- BECAUSE: the structural change must be isolated on its own commit so legacy theme regressions are bisectable. CSS still references old class names at this point; legacy themes will look broken after Phase 1 lands. Phase 2 fixes them.
- REJECTS WHEN: any id in `BrowserClient.initialize()` resolves to `null` after the change. Walkthrough regression chain must still pass (CSS is broken; JS wiring must not be).

**Boundary statement (rule 7a):**
- OWNER: `packages/platform-browser` owns menu/dialog input wiring; `templates/browser/index.html` owns DOM shape; theme CSS files own visual design.
- SHARED?: yes — every browser-client story uses this DOM. Multi-user / multi-story scenarios all share this template.
- PROMISE: `BrowserClient.initialize()` accepts the `BrowserClientElements` interface — every property is a DOM contract. Don't break existing properties. New element references for theme-author slots can be added; old ones must still resolve.
- ALTERNATIVES: could move menu/dialog wiring into the template-side JS, decoupling `platform-browser` from menu DOM entirely. That's a larger refactor (split `MenuManager` into platform-orchestration + template-side adapters), and is genuinely orthogonal to component theming. Out of scope here; mentioned for honesty.

**Steps:**

1. Refactor `templates/browser/index.html`:
   - Wrap `#game-container` in `<div class="sharpee-window">`.
   - Add `<div class="sharpee-window-titlebar">` containing `#menu-title` and `.sharpee-window-titlebar-controls` slot.
   - Replace `#menu-bar` markup with `<menu class="sharpee-menubar" role="menubar">` containing `<li class="sharpee-menubar-item">` entries.
   - Replace dialog markup with `.sharpee-dialog`-class structure.
   - Preserve **every id** referenced by `BrowserClient.initialize()` and `MenuManager.ts`.
   - Add `data-component` attributes that mirror class names where it aids debugging (optional).

2. Refactor `packages/platform-browser/src/managers/MenuManager.ts`:
   - Inventory current selectors (auditing was started in the prior plan):
     - `.menu-dropdown`, `.menu-button` (line 25, 28)
     - `#file-menu-btn`, `#file-menu`, `#settings-menu-btn`, `#settings-menu`, `#help-menu-btn`, `#help-menu` (lines 49-54)
     - `#menu-save`, `#menu-restore`, `#menu-restart`, `#menu-quit`, `#menu-help`, `#menu-about` (lines 88-125)
     - `.theme-option` (line 109)
   - Map each to its new class equivalent. Most ids stay; classes shift to `.sharpee-menu-*`. Decision: preserve ids, replace class queries.

3. Refactor `packages/platform-browser/src/managers/DialogManager.ts` similarly.

4. Refactor `templates/browser/infocom.css`:
   - Extract structural rules to `templates/browser/base.css`.
   - Leave existing `[data-theme]` blocks untouched (they reference old classes; they'll be rewritten in Phase 2).
   - Build will copy both files; `index.html` `<link>`s `base.css` first, then `themes.css` (or per-theme files if Phase 5 is folded in).

5. Build script update at `build.sh:836-840`: copy `base.css` alongside the existing CSS.

**Acceptance criteria:**

- `./build.sh -s dungeo -c browser` builds.
- Page loads, no JS errors.
- All menu interactions work (open, click options, ESC, click outside): tested manually.
- Walkthrough regression chain passes (`node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`). This is the JS-side gate — DOM coupling break in `MenuManager` would surface here.
- **Visual state is intentionally broken** — legacy themes target old class names that no longer exist. This is acceptable and expected at this checkpoint.

**Real-path test**: serve `dist/web/dungeo/`, click through every menu, open and close every dialog, verify input flow.

---

## Phase 2 — Port the four legacy themes to the new contract

**Behavior Statement.**
- DOES: rewrites the four `[data-theme="..."]` blocks in `infocom.css` to target `sharpee-*` selectors. Each theme lands on its own commit. Visual output matches Phase 0 baseline screenshots within tolerance.
- WHEN: after Phase 1 lands.
- BECAUSE: visual regression is the worst kind of bug in a theme migration — it's noticed and complained about but rarely caught by tests. One-theme-per-commit lets us bisect any regression to a single theme's port.
- REJECTS WHEN: a theme's screenshot diff exceeds tolerance against its Phase 0 baseline. Tolerance: subpixel font rendering OK; layout shifts and color drift not OK.

**Per-theme process** (run four times — `dos-classic`, `modern-dark`, `retro-terminal`, `paper`):

1. Rewrite the theme's `[data-theme]` block to target `sharpee-*` selectors instead of `.menu-bar`, `.menu-dropdown`, `.modal-dialog`, etc.
2. Build, serve, capture screenshots of the same three states as the baseline.
3. Diff against baseline. Iterate CSS until tolerable.
4. Commit: `style(themes): port {theme-id} to component-based contract`.
5. Walkthrough chain regression test on each commit.

**Acceptance criteria (each theme):**

- Idle state matches baseline within tolerance.
- Menu-open state matches baseline within tolerance.
- Save-dialog state matches baseline within tolerance.
- Theme switching at runtime still works (select theme → page reflects without reload).
- `dungeo-theme` localStorage round-trip preserved (refresh keeps theme).

**End-of-phase acceptance:**

- All four themes pass visual diff.
- Walkthrough chain green.
- No `[data-theme]` block references the old class names anywhere.
- `templates/browser/infocom.css` (or successor file) contains only `sharpee-*` selectors.

---

## Phase 3 — Add system.css as the fifth theme kit

**Behavior Statement.**
- DOES: adds a `system-6` theme kit using the new component contract. Theme is implemented either by (a) vendoring system.css and rewriting it to target `sharpee-*` selectors, or (b) writing fresh CSS that recreates system.css's visual design against `sharpee-*` selectors. Phase 0 ADR or this phase chooses; default recommendation is (b) — fresh CSS using only the rules we need (~200 lines vs vendoring 600).
- WHEN: after Phase 2 stabilizes.
- BECAUSE: this is the user-facing payoff. With the contract solid and four themes already ported as proof, adding a fifth kit is a contained, well-shaped task.
- REJECTS WHEN: the system-6 theme renders structurally different from upstream system.css demo (allowing for the menubar / status-line concessions documented below); or selecting system-6 and switching back to a legacy theme leaks any styling.

**Concessions for the contract:**

- **Status strip stays.** System 6 didn't have an in-window status bar; ours does (location + score). The system-6 theme keeps it as a thin strip styled to match the era (Geneva 9pt, B&W). Authentic-but-functional.
- **Title bar carries story title only.** System 6's authentic title bar showed the document name; ours does the same.
- **Menubar is in-window, not at top of screen.** System 6's menubar was at the top of the desktop; we keep it at the top of `.sharpee-window`. Authentic-enough.

**Font handling:**

1. Phase 0 must verify ChicagoFLF / Geneva webfont licensing before this phase.
2. If permissively licensed: bundle webfonts in `templates/browser/themes/system-6/fonts/`. Theme CSS `@font-face`s them.
3. If not: fallback chain Charcoal → Geneva → system-ui sans-serif. Document in the theme CSS.

**Steps:**

1. Create `templates/browser/themes/system-6.css` (or block in main themes file).
2. Create `templates/browser/themes/system-6/fonts/` if applicable; register `@font-face`.
3. Style each `.sharpee-*` component to match system.css upstream demo, using the era's design language (1-bit B&W, 1px borders, no rounded corners, Chicago bold for menubar/dialog titles, Geneva for body text, dotted-pattern for inactive title bars if a theme variant adds inactive state).
4. Add to story config: `stories/dungeo/src/browser-entry.ts` themes array gets `{ id: 'system-6', name: 'System 6' }`.
5. Add menu option to `index.html` theme submenu.
6. Update build to copy theme assets if they live in subdirectory.

**Acceptance criteria:**

- Selecting Settings → Theme → System 6 renders the page in System 6 chrome.
- All component classes are styled.
- Menus open / close correctly under System 6 styling.
- Save / Restore dialogs render with System-6-era dialog chrome.
- Switching to a legacy theme returns it to its Phase-2-ported state with no leakage.
- Refresh persists System 6 selection.

---

## Phase 4 — Smoke test and commit

**Behavior Statement.**
- DOES: full walkthrough regression + manual smoke through all five themes; commits the work.
- WHEN: after Phase 3 lands.
- BECAUSE: integration-reality gate (rule 12a) — CSS rendering cannot be verified in Node. A real-browser smoke is the only acceptance gate.
- REJECTS WHEN: walkthrough chain fails, or any theme exhibits regressions in menus / dialogs / theme-switch.

**Smoke-test script** (manual, real browser, one full pass):

1. `./build.sh -s dungeo -c browser`
2. `npx serve dist/web/dungeo/`
3. For each of the five themes (default → system-6 last):
   - Verify status, menubar, prose, input bar, window chrome render correctly.
   - Open File → Save Game; verify dialog matches theme; type a name; click Save.
   - Open File → Restore Game; verify saved game appears; cancel.
   - Open Settings → Theme; switch to next theme. Verify clean transition.
4. Type `look`, `inv`, `n`, `s`, `quit` under System 6 — basic command flow.
5. Refresh page; confirm theme persists across the round-trip.

**Walkthrough regression:**
```bash
node dist/cli/sharpee.js --test --chain \
  stories/dungeo/walkthroughs/wt-*.transcript \
  --stop-on-failure
```
Must match prior-session baseline (48 passing minimum for wt-01 + wt-02; full chain count whatever it is on main today).

---

## Phase 5 — split as follow-up plan

Confirmed split. Dynamic per-theme CSS loading and story-shippable themes are tracked in `docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md` with its own ADR (ADR-171). That plan **depends on this one landing first** — without component classes, there's nothing self-contained to ship per theme.

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| Component vocabulary turns out incomplete after Phase 2 begins | Medium | Phase 0 ADR review is the gate. If a need surfaces in Phase 2, pause and amend the ADR. Don't ship a half-contract. |
| Visual regression in legacy themes (Phase 2 baseline diff fails for one theme) | Medium | Per-theme commits make this bisectable. Worst case: one theme stays on the old CSS variable model under a bridge selector for a release; ports later. |
| Font licensing blocks System 6 authenticity | Low-Medium | Phase 0 verifies licensing; fallback chain documented. |
| `MenuManager` DOM coupling deeper than catalog catches | Low | Walkthrough chain in Phase 1 is the JS-side gate. |
| Theme switching introduces FOUC because base + theme CSS load order matters | Low | Base CSS is `<link>`'d before theme CSS in `<head>`. `ThemeManager.applyEarlyTheme()` already prevents pre-hydration flash. |
| Authors get confused authoring against the new contract | Medium | Phase 4 produces a brief author guide as part of commit; existing themes serve as reference implementations. |
| Bundle size grows (5 themes' worth of CSS, plus fonts) | Low | Phase 5 fixes this — dynamic loading means only active theme's CSS is on the wire. Until then, total is still <100 KB; not a blocker. |

---

## Out of Scope

- **Visual redesigns of existing themes.** Port to new architecture without changing appearance. Future work can let DOS Classic have ASCII borders, Retro Terminal have CRT scanlines, etc.
- **Zifmia (React client) themes.** Zifmia is being shelved unless demand reappears.
- **Story-shippable custom themes.** Phase 5 is a deliberate follow-up, not part of this plan's commitment.
- **`<dialog>` element migration.** Modal dialogs stay as `.sharpee-dialog` divs for now; native `<dialog>` is a separate concern.
- **Multi-window UI.** system.css supports it; Sharpee is single-window by design.
- **Theme system for the CLI / TUI client.** Out of scope.

---

## Open Questions for David

**Resolved (2026-05-07):**

1. ~~Component vocabulary~~ — David deferred to my judgment on naming; the 22-class vocabulary above stands, applying the no-abbreviations rule throughout.
2. ~~Decoration slots~~ — confirmed: `.sharpee-window-title-bar-controls` and `.sharpee-prose-overlay`. Minimal but present.
3. ~~Semantic HTML~~ — confirmed: adopt both `<menu role="menubar">` *and* `<dialog>`. Phase 1 takes on the `DialogManager` rewire.

**Resolved (2026-05-07, second pass):**

4. ~~System 6 CSS sourcing~~ — confirmed: write fresh CSS targeting `.sharpee-*` selectors directly. No vendored system.css.
5. ~~Phase 5 sequencing~~ — confirmed: split as follow-up. Dynamic per-theme CSS loading lives in `docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md` and gets its own ADR (ADR-171).
6. ~~ADR-170 fresh~~ — confirmed: fresh ADR-170 for UI chrome (component theming). ADR-163 stays scoped to data flow.
7. ~~Sequencing vs ADR-169 implementation~~ — confirmed: ADR-169 first. ADR-169 implementation lands as a single-session task; this plan's Phase 0 starts after it commits.

---

## Status

**DRAFT — awaiting answers to Open Questions before Phase 0 starts.**

No code changes yet. No commits yet. Supersedes the system-css-only Option B plan.
