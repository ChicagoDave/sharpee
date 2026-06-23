# Plan: Themes as plugins; platform-browser owns the theme engine — ADR-188

**Date**: 2026-06-22
**ADR**: [ADR-188](../../architecture/adrs/adr-188-themes-as-plugins.md) (ACCEPTED); extends ADR-170
**Status**: NOT STARTED — platform change (`packages/platform-browser`, `packages/devkit`) + new theme packages + book; ADR-accepted

## Goal

Replace the five hand-copied themes baked into devkit with a **design-token engine**:
- `@sharpee/platform-browser` ships the engine (one un-scoped `--theme-*` consumer layer)
  + the `:root` default tokens (white-on-blue, id `classic`).
- A theme = a `[data-theme="<id>"]` token block (+ optional flourishes), delivered as an
  `@sharpee/theme-<name>` npm package (self-describing via a `sharpee.theme` manifest).
- the browser builds — devkit author (`standalone/build-browser.ts`) **and** repokit
  in-repo (`commands/browser.ts`, post-ADR-187) — source CSS from platform-browser and
  wire listed theme packages into `dist/web/`.

Delivered against ADR-188 AC-1…AC-9. Robustness (unset token / unknown / uninstalled
persisted theme → `:root` default) is automatic from the token model — no fallback code.

## Hard constraint: visual verification

The visual ACs (AC-1/2/3/7 — does it actually skin, no regression to the 5 themes) can
only be confirmed with the **Playwright QA harness** (the parallel book-QA session). This
plan's per-phase "verify" steps that say *visual* must run there. The build/wiring ACs
(AC-4/5/6/9) are verifiable in-repo. **Do not call a visual phase done without a harness run.**

## Phases

### Phase 1 — Theme engine + `:root` default in platform-browser [AC-1, AC-7]
- Create the engine CSS in `packages/platform-browser` (e.g. `styles/engine.css` +
  `styles/base.css` for layout): the un-scoped component rules that consume `--theme-*`
  (`body { background: var(--theme-bg); color: var(--theme-text) } .sharpee-status-bar { … }`
  …), extracted from the **common var-consuming declarations** the 5 themes share.
- Add `:root { --theme-bg:#0000aa; --theme-text:#fff; … }` — the `classic` white-on-blue
  default token set (all 16 tokens).
- **Extraction method (the delicate part):** diff the 5 `[data-theme="X"]` blocks in the
  current `devkit/templates/browser/styles.css`. Declarations that consume `var(--theme-*)`
  are identical across themes → they become the engine (un-scoped). Literal declarations:
  those identical across all 5 (layout: heights, padding, scrollbar px) → engine/base;
  those that DIFFER per theme (e.g. dos-classic `text-transform:uppercase`) → that theme's
  flourish override (Phase 3). Keep a mapping so nothing is lost.
- platform-browser `package.json` `files` ships the CSS; root barrel/exports unaffected
  (CSS is a static asset, not a TS export).
- **Verify (visual, harness):** a page with the engine + `:root` only (no `[data-theme]`)
  renders fully-skinned white-on-blue.

### Phase 2 — both browser builds source CSS from platform-browser [AC-4]
Post-ADR-187 there are **two** browser builds in two separate tools — rewire **both**
independently (ADR-187 R1: separate codebases, overlap duplicated):
- **devkit author build** — `packages/devkit/src/standalone/build-browser.ts`.
- **repokit in-repo build** — `tools/repokit/src/commands/browser.ts` (Dungeo / FZ).

Each: copy `base.css` / `engine.css` / fonts from `@sharpee/platform-browser` (a resolved
dep) into `dist/web/`, **not** from the devkit `TEMPLATES_DIR`; link the engine CSS in
`index.html`. Remove the 5 themes + the per-theme `styles.css` bulk from
`devkit/templates/browser` (keep only what's genuinely devkit's: the `index.html`
template + the author-override link). **Neither build ships theme CSS** (AC-4). Also
audit the scaffold — `standalone/init.ts` + `init-browser.ts` (both reference
`templates/browser`) — for stale theme/CSS references and update.
- **Verify:** both `./sharpee build --browser` (author) and `./repokit build dungeo
  --browser` (in-repo) produce a `dist/web/` whose CSS comes from platform-browser; the
  page still loads + skins (engine default).

### Phase 3 — Theme package contract + migrate the 5 themes [AC-3, AC-9]
- Define the `@sharpee/theme-<name>` shape: one CSS file (`theme.css` =
  `[data-theme="<id>"] { --theme-* }` + flourishes) + `package.json`
  `"sharpee": { "theme": { "id", "name", "css": "./theme.css" } }`.
- Migrate `modern-dark`, `retro-terminal`, `paper`, `system-6` (and optionally
  `dos-classic`, though it's now the `classic` default) each to a package: token block
  from its old variable section + its theme-specific flourishes from the Phase-1 diff.
- Workspace + publish registration for each new package (new-package checklist:
  ts-forge.config.json, workspace, etc. — these are publishable `@sharpee/*`).
- **Verify (visual, harness):** each migrated theme, installed + selected, renders
  **identically** to the current build (computed-style parity, no regression).

### Phase 4 — both browser builds wire listed theme packages [AC-5, AC-9]
- In **both** build paths (devkit `standalone/build-browser.ts` and repokit
  `commands/browser.ts`): for each theme package listed (BrowserClient `themes` config /
  project config), resolve it, read `sharpee.theme`, copy its CSS to
  `dist/web/themes/<id>.css`, link **after** the engine CSS, register `{id,name}` in the
  client theme menu. No `node_modules` scanning. (Duplicated per tool, ADR-187 R1.)
- **Verify:** listed package → CSS present at `dist/web/themes/<id>.css`, linked after
  engine, `{id,name}` in menu — for an author project (devkit) **and** an in-repo story
  (repokit); switching (visual, harness) re-skins.

### Phase 5 — Book Ch 26 rewrite [AC-6]
- Rewrite §26.4–26.5 to the plugin model: a theme = a token block; ship/install it as an
  `@sharpee/theme-*` package; list it in config. §26.5's example becomes variables-only
  and is now correct. Document the `--theme-*` token vocabulary + the `:root`-default
  fallback. Remove the "the CSS block and the config entry are all it takes" contradiction
  (it's now true). Update the "Family Zoo v18 ships exactly this" claim to match.
- Regenerate `docs/book/web/26-*.html` on the next book build.

### Phase 6 — Cutover verification [AC-1…AC-9]
- Run all ADR-188 tests together via the QA harness: engine default skins; variables-only
  theme skins; 5 migrated themes parity; switch; negative fallback; persisted-theme
  resilience; wiring. Confirm AC-1…AC-9.

## Acceptance gate (ADR-188)
- [ ] AC-1 engine + `:root` default in platform-browser; zero-theme build skins white-on-blue.
- [ ] AC-2 variables-only theme skins via the engine.
- [ ] AC-3 5 themes ship as packages, removed from devkit, render identically.
- [ ] AC-4 neither browser build (devkit author / repokit in-repo) ships theme CSS.
- [ ] AC-5 switching works across default + packages.
- [ ] AC-6 book Ch 26 rewritten; §26.5 variables-only + correct.
- [ ] AC-7 unset token / unknown theme → `:root` default (never unskinned).
- [ ] AC-8 persisted theme id w/ no package → default on restore.
- [ ] AC-9 self-describing packages; explicit opt-in, no node_modules scan.

## Risks / notes
- **CSS extraction is the delicate part** (Phase 1/3): separating shared engine rules from
  per-theme flourishes. A wrong split silently regresses a built-in theme. Mitigate with
  the diff method + computed-style parity tests (harness).
- **Cascade/load order:** theme CSS must load *after* engine/`:root` CSS (equal specificity
  → source order wins). Enforce in the `index.html` link order (Phase 2/4).
- **Visual verification gap:** in-repo I can do build/wiring; the skin/parity checks need
  the parallel Playwright harness. Sequence harness runs after Phases 1, 3, 4, 6.
- **New publishable packages** (Phase 3): follow the 6-point new-package checklist; they're
  `@sharpee/theme-*`, published, versioned.
- **zifmia** keeps its own CSS (deferred, ADR-188 Deferred); not touched here.

## Out of scope
- zifmia unification on the engine.
- `prefers-color-scheme` auto-selection (a future theme-selection feature on top of the token model).
