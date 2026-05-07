# Plan: System.css (Macintosh System 6) Theme Integration — Option B

**Created**: 2026-05-07
**Branch**: main (TBD)
**Target**: non-React browser client (`templates/browser/` + `packages/platform-browser/`)
**Scope**: platform change (touches `packages/platform-browser/`) — requires explicit go-ahead per CLAUDE.md.

---

## Goal

Add an authentic Macintosh System 6 visual theme to the browser client by integrating the upstream [`system.css`](https://github.com/sakofchit/system.css) library. Authentic means real System-6 chrome — `.window` with `.title-bar`, `<menu role="menubar">`, `.dialog` modals, ChicagoFLF/Geneva fonts, 1-bit B&W palette — not a CSS-variable approximation (which is Option A in the conversation).

Selecting "System 6" from the Settings → Theme submenu must produce a UI that visually matches the reference at <https://sakofchit.github.io/system.css/>, while the four existing themes (`dos-classic`, `modern-dark`, `retro-terminal`, `paper`) continue to render exactly as they do today.

---

## Scope of Change (what Option B actually touches)

The four current themes are pure CSS-variable swaps over a single fixed DOM. system.css is structurally different — it expects its own markup (`.window`, `.title-bar`, `<menu role="menubar">`, `<li role="menuitem">`, `.dialog`). It cannot be added by appending a new `[data-theme]` block; the DOM has to accommodate it.

**Files affected:**

| Layer | File | Type of change |
|------|------|----------------|
| template | `templates/browser/index.html` | restructure: wrap `#game-container` in `<div class="window">` + `<div class="title-bar">` + `<div class="window-pane">`; replace `#menu-bar` with `<menu role="menubar">` markup; rebuild modal dialogs as `<div class="standard-dialog modal-dialog">` |
| template | `templates/browser/infocom.css` | scope existing four-theme rules under their `[data-theme]` selectors so they don't bleed into system.css markup; add a `[data-theme="system-6"]` block whose body is mostly "let system.css render" |
| template (new) | `templates/browser/system.css` | vendored copy of upstream system.css |
| template (new) | `templates/browser/assets/fonts/` | bundled Chicago / Geneva webfonts from upstream |
| platform | `packages/platform-browser/src/managers/MenuManager.ts` | rework DOM queries to handle both the existing `.menu-dropdown` markup AND `<menu role="menubar">` markup (or unify on the system.css markup and rewrite the four legacy themes' CSS to style it — see Markup Strategy below) |
| platform | `packages/platform-browser/src/managers/DialogManager.ts` | accommodate `.standard-dialog` markup if dialog markup changes |
| platform | `packages/platform-browser/src/managers/ThemeManager.ts` | no logic change; `system-6` is just another theme id |
| story | `stories/dungeo/src/browser-entry.ts` | add `{ id: 'system-6', name: 'System 6' }` to the `themes` config array |

`build.sh` does **not** need to change for this client (the `--theme` flag in `build.sh:218` is Zifmia-only; the browser client ships all themes and switches at runtime).

---

## Markup Strategy — the key design decision

Three honest options. Phase 0 must pick one before Phase 1 starts:

### (a) Restructure DOM to system.css shape; back-port other four themes

One template, system.css markup. The four legacy themes get rewritten to override system.css selectors back into their current visual style.

- **Pro**: single source of truth; one DOM; theme switching stays a pure CSS swap.
- **Con**: every legacy theme needs a non-trivial CSS rewrite. Visual regressions are likely. The four themes' CSS doubles in size.

### (b) Conditional DOM via JS at theme-switch time

`MenuManager` rebuilds menu/dialog DOM when theme changes between system-6 and any other theme.

- **Pro**: legacy themes untouched; system-6 gets its own pristine markup.
- **Con**: theme manager becomes structure-aware; switching theme rebuilds DOM, kills focus, possibly disrupts in-flight modals. State-management hazard.

### (c) Two HTML templates, one selected at build time

`templates/browser/index.html` (existing) and `templates/browser/index-system6.html` (system.css markup). Build copies whichever is selected. `MenuManager` runs against whichever DOM is loaded.

- **Pro**: cleanest isolation; legacy themes guaranteed unchanged.
- **Con**: "System 6" is no longer a runtime theme switch — it's a build-time client variant. The Settings → Theme submenu inside system-6 either lacks the other four entries (legacy themes can't render against system.css markup) or has them but they look broken. Doubles template maintenance.

**Recommendation**: **(a) — restructure to system.css markup**. The legacy themes are CSS-variable swaps; rewriting them to style system.css selectors is mechanical and keeps runtime theme-switching as the user model. Cost is bounded; (b) and (c) trade ongoing complexity for upfront cost.

If after Phase 0 (a) looks bigger than estimated, fallback to (c).

---

## Phase 0 — Scout & Decide (no code)

**Behavior Statement: this phase produces decisions, not code.**

1. **Vendor system.css.**
   - Read upstream README and LICENSE.
   - Confirm: license is permissive enough to vendor (MIT expected — verify before copying).
   - Confirm: ChicagoFLF and Geneva webfonts ship with the library, and their *font* licenses (often separate from the CSS license) permit redistribution. If fonts are not redistributable, plan a fallback: Charcoal → Geneva → system-ui sans-serif. Document the fallback chain in this plan before Phase 1.
   - Note upstream version pinned (commit hash or release tag).

2. **Confirm Markup Strategy** ((a) / (b) / (c)). Recommendation is (a); confirm with David before starting Phase 1.

3. **Catalog DOM coupling in `MenuManager.ts` and `DialogManager.ts`.**
   - Every `getElementById` and `querySelector` call against menu / dialog DOM is a coupling point. Inventory them. Each one becomes either: (i) unchanged, if the new markup keeps the same id, or (ii) a rewrite, if the new markup uses semantic HTML instead of ids.
   - Pre-existing IDs to audit: `file-menu-btn`, `file-menu`, `settings-menu-btn`, `settings-menu`, `helpmenu-btn`, `help-menu`, `menu-save`, `menu-restore`, `menu-restart`, `menu-quit`, `menu-help`, `menu-about`, plus the `.theme-option`, `.menu-dropdown`, `.menu-button` class queries. Confirmed at `packages/platform-browser/src/managers/MenuManager.ts:25-125`.

4. **Decide title-bar / status-line treatment.**
   - System 6 didn't have an in-window status line. Two choices:
     - Keep current `#status-line` strip below `.title-bar` (functional but inauthentic).
     - Move location/score into the `.title-bar-text` itself (e.g. `Sharpee — Above Ground (Score: 0, Turns: 0)`).
   - Recommendation: keep the strip. Authenticity loss is small; functional regression of moving it is large (status-line updates are driven by channel renderers expecting that DOM).

5. **Decide menu interaction model.**
   - system.css ships hover-driven CSS dropdowns *and* a JS-toggleable variant. The current `MenuManager` is click-toggle. Pick one and stick to it; flag whichever wins in this section.

**Deliverables**: a handful of paragraphs added to this plan capturing the four decisions above, and a Phase-0 git commit (docs only).

**Gate to Phase 1**: David confirms (a) / (b) / (c), font fallback chain, and status-line treatment.

---

## Phase 1 — Vendor system.css; smoke-test in isolation

**Behavior Statement.**
- DOES: copies system.css and its font assets into `templates/browser/`; produces a standalone scratch HTML page that loads system.css and renders one `.window` with a menubar + a `.standard-dialog`.
- WHEN: run after Phase 0 decisions are recorded.
- BECAUSE: confirms that the vendored CSS+fonts render correctly when served from the eventual `dist/web/{story}/` location (no path bugs, no missing glyphs, no CORS surprises). If this fails, every later phase is wasted work.
- REJECTS WHEN: a font fails to load and the chain falls back to system sans-serif (visually wrong); or system.css rules conflict with anything global from `infocom.css` (sanity-check by loading both side-by-side).

**Steps:**
1. Copy `system.css` (pinned version from Phase 0) to `templates/browser/system.css`.
2. Copy font assets to `templates/browser/assets/fonts/`. Adjust `@font-face` `src:` URLs in `system.css` to point at the local paths.
3. Write `templates/browser/system-css-smoke.html` — a minimal page with one `.window`, one menubar, one button, one `.standard-dialog`. **Not** committed to the final build; this is a Phase-1 scratch artifact.
4. Serve via `npx serve templates/browser/` and visually verify against the upstream demo.
5. Update `build.sh:836-840` to copy `system.css` and the fonts directory alongside `styles.css` when the browser client is built.

**Acceptance criteria:**
- The scratch page renders pixel-equivalent to the upstream system.css demo for the components used.
- No console errors (font 404s, MIME-type mismatches).
- `./build.sh -s dungeo -c browser` still completes; the existing four themes still render correctly in `dist/web/dungeo/index.html`.

**Real-path test**: serve `dist/web/dungeo/` and visually confirm legacy themes are unchanged before moving on.

---

## Phase 2 — Restructure `index.html` to system.css markup

**Behavior Statement.**
- DOES: rewrites `templates/browser/index.html` so that the game container is a system.css `<div class="window">`, the menu bar is a `<menu role="menubar">`, and modal dialogs use `<div class="standard-dialog modal-dialog">`. Preserves every DOM id that `BrowserClient.initialize()` reaches for (see `stories/dungeo/src/browser-entry.ts:111-127`).
- WHEN: after Phase 1's vendoring lands.
- BECAUSE: the structural template change is the riskiest part of Option B. Doing it on its own commit, with the four legacy themes still working visually (because their CSS will be updated in Phase 3), separates DOM rework from CSS rework so regressions are bisectable.
- REJECTS WHEN: any id in `BrowserClient.initialize()` (`location-name`, `score-turns`, `text-content`, `main-window`, `command-input`, `modal-overlay`, `save-dialog`, `restore-dialog`, `startup-dialog`, `save-name-input`, `save-slots-list`, `restore-slots-list`, `no-saves-message`, `startup-save-info`, `menu-bar`) is removed or renamed. All must remain queryable.

**Required preservations (non-negotiable):**
- All ids passed to `BrowserClient.initialize()` (list above).
- All ids that `MenuManager.ts` queries: `file-menu-btn`, `file-menu`, `settings-menu-btn`, `settings-menu`, `help-menu-btn`, `help-menu`, `menu-save`, `menu-restore`, `menu-restart`, `menu-quit`, `menu-help`, `menu-about` (until Phase 4 rewrites the manager).
- All `.theme-option` class instances driving the theme submenu.

**Acceptance criteria:**
- `./build.sh -s dungeo -c browser` builds.
- Page loads, no JS errors, `BrowserClient.initialize()` finds every element it needs.
- All four legacy themes still apply (they may look broken because their CSS hasn't been updated yet — that's Phase 3 — but `data-theme` switching must not throw).

**Real-path test**: open `dist/web/dungeo/index.html`, verify save/restore dialogs open, type a command, verify status line updates. This is the integration-reality gate — if any user-flow breaks here, Phase 3+ are blocked.

---

## Phase 3 — Re-skin the four legacy themes against the new markup

**Behavior Statement.**
- DOES: rewrites the `[data-theme="dos-classic"]`, `[data-theme="modern-dark"]`, `[data-theme="retro-terminal"]`, `[data-theme="paper"]` blocks in `infocom.css` to style the new system.css-shaped DOM back to their current appearance.
- WHEN: after Phase 2 lands and the new markup is stable.
- BECAUSE: under Markup Strategy (a), legacy themes share the system.css DOM. Their CSS must override system.css's window/menubar/dialog rules to restore the existing look.
- REJECTS WHEN: a side-by-side screenshot of any legacy theme differs noticeably from a snapshot taken before Phase 2.

**Process:**
1. **Before Phase 2 lands**, capture screenshots of all four themes at three states: idle (just-launched), with menu open, with save dialog open. Store in `docs/work/system-css-theme/baseline-screenshots/`.
2. After Phase 2: switch through each theme, screenshot the same three states, diff against baseline.
3. Iterate on `infocom.css` for that theme until the diff is acceptable.

**Acceptance criteria:**
- All four legacy themes pass visual diff against pre-Phase-2 baseline (acceptable diff: font rendering microvariation; unacceptable: layout shifts, color regressions, missing borders).
- `./build.sh -s dungeo -c browser` builds.
- Walkthrough chain passes: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure` (this validates that no JS-side selector got broken; tests are headless so they don't catch visual issues).

---

## Phase 4 — Update `MenuManager` and `DialogManager` for the new markup

**Behavior Statement.**
- DOES: rewrites DOM queries in `packages/platform-browser/src/managers/MenuManager.ts` and `DialogManager.ts` to work against the system.css-shaped DOM. If Phase 0 chose to keep ids, this phase is a no-op for queries and only updates classes (`.menu-dropdown`, `.menu-button`, `.theme-option` may need to become `<menu role="menubar"> li[role="menuitem"]` etc.). If Phase 0 chose to drop ids in favor of semantic HTML, this phase is a larger rewrite.
- WHEN: after Phases 2 and 3 are stable, so the manager rewrite has a stable DOM target.
- BECAUSE: cross-boundary state — `MenuManager` owns user input mapping for the menu bar — must keep working under the new markup. The four legacy themes pass visually after Phase 3 but still depend on click-toggle behavior.
- REJECTS WHEN: any menu interaction (open File menu, open submenu, click theme option, click Save, ESC to close) regresses. Test manually for each menu, each submenu, each option.

**Boundary statement (rule 7a):**
- OWNER: `packages/platform-browser` owns menu / dialog input wiring; `templates/browser/index.html` owns DOM shape; story-level config owns theme list.
- SHARED?: yes — multiple stories will eventually use this same browser client. The menu DOM contract must stay stable across stories.
- PROMISE: `BrowserClient.initialize()` accepts a `BrowserClientElements` interface (see `stories/dungeo/src/browser-entry.ts:111-127`) — every property in that interface is a DOM contract. Don't break existing properties. If new ones are needed, add them; old ones must still resolve.
- ALTERNATIVES: could move menu logic into the template-side JS (decoupling platform-browser from menu DOM entirely), but that's a much larger ADR-worthy refactor and is out of scope.

**Acceptance criteria:**
- All click handlers still fire: Save, Restore, Restart, Quit, Help, About, every theme option.
- ESC closes open menus.
- Outside-click closes open menus.
- Walkthrough chain passes (regression baseline).

---

## Phase 5 — Add the `system-6` theme block + register in story config

**Behavior Statement.**
- DOES: adds `[data-theme="system-6"]` block to `infocom.css` whose primary effect is "let system.css render unchanged" — i.e. the block resets / unsets any CSS variables and rules from the four legacy themes that would override system.css. Also adds `<div class="menu-option theme-option" data-theme="system-6">System 6</div>` to the theme submenu in `index.html`. Also updates `stories/dungeo/src/browser-entry.ts` themes array.
- WHEN: after Phase 4 is stable.
- BECAUSE: this is the visible payoff. With the markup restructured (Phase 2), legacy themes preserved (Phase 3), and JS wiring updated (Phase 4), turning on the new theme is mostly declarative.
- REJECTS WHEN: switching to system-6 leaves any leftover styling from the previously selected theme (color bleed, font bleed). Switch through every legacy theme → system-6 → next legacy theme to validate clean transitions.

**Acceptance criteria:**
- Selecting Settings → Theme → System 6 makes the page render visually equivalent to the system.css upstream demo (with story content in place of placeholder text).
- Switching from System 6 to any legacy theme returns that theme to its pre-system-6 appearance (no leakage in either direction).
- `dungeo-theme` localStorage round-trip works (refresh after selecting System 6 keeps System 6 active, no flash of legacy theme).

---

## Phase 6 — Smoke test, walkthroughs, commit

**Behavior Statement.**
- DOES: runs the full walkthrough chain against the built bundle to confirm no regressions; performs a manual smoke test in a real browser of the System 6 theme; commits the cumulative work.
- WHEN: after Phase 5 lands.
- BECAUSE: this is the integration-reality gate (rule 12a). The combined system is what ships, and Web/CSS rendering cannot be tested in Node — a real-browser smoke is the only acceptance gate.
- REJECTS WHEN: walkthroughs fail, or any of the menu/dialog/theme-switch flows misbehave under any theme.

**Smoke-test script (manual, real browser):**
1. `./build.sh -s dungeo -c browser`
2. `npx serve dist/web/dungeo/` and open in browser.
3. With each of the five themes (default → System 6 last):
   - Verify status line, menu bar, input bar, main text area render correctly.
   - Open File menu; click Save Game; verify dialog appears with theme-correct chrome; type a save name; click Save; close.
   - Open File menu; click Restore Game; verify the saved game appears in the list; cancel.
   - Open Settings → Theme; switch to next theme. Verify clean transition.
4. Type `look`, `inv`, `n`, `s`, `quit` — basic command flow under System 6 theme.
5. Refresh page; confirm theme persists.

**Walkthrough regression:**
```bash
node dist/cli/sharpee.js --test --chain \
  stories/dungeo/walkthroughs/wt-*.transcript \
  --stop-on-failure
```
Must pass at the same baseline as session 2026-05-05 (48 passing for wt-01 + wt-02; full chain count whatever it is on main today).

---

## Risks

| Risk | Likelihood | Mitigation |
|------|-----------|------------|
| ChicagoFLF font license forbids redistribution | Medium | Phase 0 confirms; fallback chain → Charcoal → Geneva → system-ui. Authenticity loss accepted if license blocks it. |
| Markup Strategy (a) explodes in Phase 3 (legacy themes too divergent from system.css base) | Medium | Hard-stop at Phase 3 if any legacy theme can't be matched within 1–2 hours of CSS work; fallback to (c). |
| `MenuManager` DOM coupling deeper than the audit catches | Low | Phase 0 inventory; Phase 4 walkthrough chain catches selector breakage. |
| Status-line re-layout breaks channel renderers | Low | Phase 0 chooses to keep current strip; channel renderers untouched. |
| Modal dialog focus / keyboard a11y regresses | Medium | Phase 6 smoke covers focus + ESC; Phase 4 keeps existing handlers. |
| Bundle size jumps (system.css + Chicago fonts) | Low | Document the new size in Phase 1; Chicago is ~30–50 KB compressed; not a blocker. |

---

## Out of Scope

- Adding system.css to **Zifmia** (the React client). Zifmia is being shelved unless demand reappears.
- Authoring tools, story-level theme overrides, multi-window UI (system.css supports multi-window, but Sharpee's UI is single-window by design).
- ADR. This is an additive theme integration that doesn't change any platform contract — `BrowserClientElements` interface stays stable, `ThemeManager` API unchanged. If Markup Strategy (b) or (c) is chosen instead, then ADR-worthy.

---

## Open Questions for David

1. Confirm Markup Strategy: (a) restructure-and-rewrite, (b) conditional-DOM, or (c) two-templates? My recommendation is (a).
2. If ChicagoFLF can't be redistributed, is fallback to Geneva + system-ui acceptable, or should we drop System 6 in favor of an A-style approximation theme instead?
3. Status-line handling: keep below `.title-bar` (recommended), or fold into title-bar text?
4. Sequencing — do this after ADR-169 implementation (Web Audio fades), or interleave?

---

## Status

**DRAFT — awaiting decisions on Open Questions before Phase 0 starts.**

No code changes yet. No commits yet.
