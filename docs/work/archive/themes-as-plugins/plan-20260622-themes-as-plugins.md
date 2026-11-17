# Plan: Themes as plugins; platform-browser owns the theme engine — ADR-188

**Date**: 2026-06-22
**ADR**: [ADR-188](../../architecture/adrs/adr-188-themes-as-plugins.md) (ACCEPTED; delivery revised 2026-06-23); extends ADR-170
**Status**: Phases 1–5 done; delivery model REVISED 2026-06-23 (see below) — pending: npm publish (user) + familyzoo build-verify (post-publish)

## REVISION 2026-06-23 — built-in themes ship WITH the platform (not as packages)

The package-per-theme model below (Phase 3's `@sharpee/theme-*` packages) was the wrong
friction for **built-ins** — an author shouldn't `npm install`/publish a package per
standard theme. The engine + token model is unchanged; delivery of the built-ins
changed (see ADR-188 "Revision 2026-06-23"):
- Built-in theme CSS now lives in `@sharpee/platform-browser/styles/themes/` (4 CSS +
  `manifest.json` + system-6 fonts), travelling with the engine package. The four
  `packages/theme-*` packages were **deleted**.
- Authors apply built-ins by **id**: `sharpee.themes: ["modern-dark", "paper"]`. Their
  own theme is a `[data-theme]` block in `browser/<story>.css`, listed inline as
  `{ id, name }`. The `@sharpee/theme-*` package path is retained only for future
  third-party themes.
- Both builds (`build-browser.ts`, `commands/browser.ts`) rewritten: `resolveWiredThemes`
  reads platform-browser's `styles/themes/manifest.json` for built-in ids + accepts inline
  author themes; built-ins copy CSS + link, author themes are menu-only.
- Verified: visual harness 9/9 (now sourcing `styles/themes/`), real dungeo build (4
  built-ins copied byte-identical, namespaced system-6 fonts resolve, menu Classic+4),
  devkit real-path test (built-in id + inline author theme). Ch 26 rewritten to the
  built-in-id + author-theme model; ADR-188 revised. familyzoo migrated (lists 4 built-in
  ids + inline zoo-sunny; deps → platform-browser ^1.1.2 / devkit ^1.1.3).
- **The phase blocks below are HISTORICAL** (they describe the superseded package model);
  the build/verify facts still apply, but "theme packages" → "built-in themes in
  platform-browser" per this revision.

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

The visual ACs (AC-1/2/3/7 — does it actually skin, no regression to the 5 themes) require
a **Playwright visual harness**. As of 2026-06-22 (session c9f121) one lives **in-repo** at
`packages/platform-browser/tests/visual/` (`pnpm --filter @sharpee/platform-browser
test:visual`) — a real-path suite (real engine CSS + real `.sharpee-*` shell DOM, Chromium,
computed-style assertions). Later phases extend it: Phase 3 adds computed-style **parity**
specs per migrated theme; Phase 4 adds a switch spec; Phase 6 runs the full set. The
build/wiring ACs (AC-4/5/6/9) are verifiable without it. **Do not call a visual phase done
without a harness run.**

## Phases

### Phase 1 — Theme engine + `:root` default in platform-browser [AC-1, AC-7]

> **Status (2026-06-22, session c9f121): DONE — build/structural AND visual verified.**
> Visual harness stood up in-repo (no longer waiting on a parallel session):
> `packages/platform-browser/tests/visual/` — a real-path Playwright suite that loads
> the actual `engine.css` + `base.css` against the real `.sharpee-*` shell DOM (read from
> the platform's own `index.html`) in Chromium and asserts computed styles. Run with
> `pnpm --filter @sharpee/platform-browser test:visual`. 3/3 pass:
> AC-1 (zero-theme → white-on-blue skin), AC-7 (unknown theme → `:root` default), AC-7
> (unset token within a theme → per-token `:root` fallback).
> Created in `packages/platform-browser/styles/`:
> - `base.css` — verbatim copy of the devkit structural CSS (owner header updated).
> - `engine.css` — the `:root` default token set (all 16 tokens, classic = white-on-blue)
>   + the de-scoped `modern-dark` component layer. The `#333` latent bug is avoided by
>   construction (modern-dark used `var(--theme-border)`). Extraction proven faithful:
>   the 285 declaration/selector lines diff IDENTICAL to the de-scoped source.
> - `ts-forge.json` `{"assets":["styles/**"]}` + `files:["dist","dist-esm","styles"]`.
> Verified: `tsf build --npm --package @sharpee/platform-browser` ships `base.css` +
> `engine.css` to `~/.tsf-publish/sharpee/platform-browser/styles/`.
> **NOT done:** AC-1 (zero-theme build renders fully-skinned white-on-blue) and AC-7
> (unset token / unknown theme → `:root` default) are visual — require a harness run.
> **Open question carried to Phase 2:** `decorations.css` (ADR-174 platform vocabulary)
> is also a platform-shipped engine layer currently in devkit templates; it should move to
> platform-browser too. Left out of Phase 1 to keep scope to the plan's `base`+`engine`.

> **Extraction analysis (2026-06-22, diff-driven — done; authoring NOT yet done).**
> Mapped `devkit/templates/browser/styles.css` (1988 lines):
> - **Token model already exists** at lines 25–113: `:root, :root[data-theme="dos-classic"]`
>   (the default = white-on-blue = `classic`) + `:root[data-theme="X"]` overrides for the
>   other 4. These token blocks move to platform-browser (`:root` default) / theme
>   packages (the 4 overrides, Phase 3).
> - **Component rules** (lines 116–1988) are 5 `[data-theme="X"]`-scoped blocks. Diffed
>   prefix-normalized: dos/dark/paper/retro are ~identical (4–14 differing lines);
>   **system-6 differs by ~188 lines** (a genuinely distinct Mac chrome). So the engine
>   ≈ the shared ~357-rule block, de-scoped.
> - **Engine source of truth = modern-dark's de-scoped block** — it's token-pure (uses
>   `var(--theme-border)` etc. with no extra literals).
> - **Latent bug found:** dos-classic hardcodes `border-bottom: 1px solid #333` where it
>   should be `var(--theme-border)` (dark/paper/retro use the var). Engine uses the var.
> - **Flourishes (→ theme packages, Phase 3):** retro = scanline `background-image`
>   gradient + `text-shadow` glow; paper = dialog backdrop `rgba(0,0,0,.5)` (vs `.7`);
>   system-6 = the ~188-line chrome set; classic/dark = none (token-only).
> - **Token completeness TODO:** the `classic` `:root` block defines 13 of the 16 tokens;
>   `--theme-desktop-bg`, `--theme-font-body`, `--theme-font-chrome` are defined elsewhere
>   — the `:root` default must define **all 16** (AC-7: no unset token). Source the 3
>   missing defaults before authoring.
>
> **Authoring (next, needs the QA harness for AC-1/AC-7 visual checks):** create
> `platform-browser` `engine.css` (= de-scoped modern-dark block, `#333`→var) + the
> all-16-token `:root` default; ship via package `files`.

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

> **Status (2026-06-22, session c9f121): DONE — both builds rewired + verified.**
> - **decorations.css** moved into the engine layer: `packages/platform-browser/styles/`
>   now holds base + engine + decorations (all three identical across the old devkit and
>   repo-root template dirs, so the move is lossless). platform-browser `exports` gained
>   `./package.json` + `./styles/*` so the devkit build can resolve the dir from a story's
>   deps.
> - **devkit author build** (`build-browser.ts`): copies base/engine/decorations from the
>   resolved `@sharpee/platform-browser/styles`, no longer from `TEMPLATES_DIR`; ships no
>   theme CSS/fonts; index.html links `engine.css`. Verified by the real-path
>   `browser-build.test.ts` (fresh project → dist/web has base/engine/decorations, no
>   styles.css/themes).
> - **repokit in-repo build** (`commands/browser.ts`): copies the three from
>   `packages/platform-browser/styles`; drops the `infocom.css→styles.css` theme + `themes/`;
>   website mirror updated. Verified by a real `buildBrowserClient(root,'dungeo')` run:
>   output CSS is **byte-identical** to platform-browser source, index.html links engine.css.
> - **Stale-artifact cleanup:** both builds now `rm` an obsolete `styles.css` + `themes/`
>   from the output (and repokit's website mirror), so a rebuild over a pre-ADR-188 output
>   never serves stale theme CSS (confirmed against dungeo's existing output).
> - **Both index.html templates** (devkit + repo-root) relink to `base → engine →
>   decorations`, with a comment marking where Phase 4 injects theme links.
> - **Scaffold audit:** `init.ts` / `init-browser.ts` only touch the author override —
>   no stale theme/CSS refs.
> - **Deletion deferred (deliberate):** the template theme files are NOT deleted.
>   `templates/browser/styles.css` (the 5-theme kit) and `templates/browser/themes/`
>   (system-6 fonts) are the **Phase 3 migration source**; `base.css`/`decorations.css` in
>   the template dirs are now redundant-but-harmless. Delete all after Phase 3 packages exist.
> **NOT done:** a full in-browser render of a built story (engine default skin) is Phase 6
> cutover scope; the engine skin itself is already proven by the Phase 1 harness on the
> byte-identical engine.css.

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

> **Status (2026-06-23, session 36a20d): DONE — packages built + parity verified.**
> Decision (user): **pure-CSS, workspace-only** packages (no TS shell, not in
> `ts-forge.config.json`); **four** themes migrated (dos-classic stays the `:root`
> `classic` default per R7, not packaged). Created under `packages/theme-*/`:
> - `@sharpee/theme-modern-dark` — token block ONLY (it was the engine's de-scoped
>   source of truth, so the engine already paints it; zero flourishes).
> - `@sharpee/theme-retro-terminal` — token block + 1 flourish (`body` scanline
>   gradient + phosphor `text-shadow`).
> - `@sharpee/theme-paper` — token block + 1 flourish (dialog `::backdrop` 0.5).
> - `@sharpee/theme-system-6` — the *rich* theme: token block (all 16) + `@font-face`
>   (url re-pointed to package-local `fonts/`) + the full ~130-line Mac chrome set +
>   the two bundled woff2 fonts (byte-identical copies).
> Each ships `theme.css` + a `package.json` `sharpee.theme` manifest `{id,name,css[,assets]}`,
> `files`, and `exports` for `./theme.css` + `./package.json` (+ `./fonts/*` for system-6).
> **Verified:** token blocks diff byte-faithful to source (13/13/13/16 tokens);
> `require.resolve('@sharpee/theme-<id>/theme.css' | '/package.json' | '/fonts/*')`
> all resolve; `pnpm install` registered them (40 workspace projects). Parity harness
> extended (`fixture.ts` gained `themeCssPath` to link a real package `theme.css` after
> the engine; new `theme-parity.spec.ts`): **7/7 visual pass** (3 Phase-1 engine + 4
> new per-theme parity, each asserting token application via the engine + the theme's
> flourishes). No registration beyond the workspace glob — pure-CSS packages are
> invisible to tsf by design (publish deferred).
> **NOT done / deferred:** (1) npm-publish path for pure-CSS packages (tsf only
> discovers tsconfig-bearing projects — a separate small decision later). (2) Deleting
> the devkit template theme sources (`templates/browser/styles.css`, `themes/`) — the
> migration source; delete only after Phase 4 wiring is proven (needs user confirmation).
> (3) **Phase 4 font-placement contract:** system-6's `theme.css` uses `@font-face`
> url `fonts/<file>.woff2` relative to itself, so Phase 4 must copy the theme's `fonts/`
> dir to sit beside the linked CSS in `dist/web/`.

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

> **Status (2026-06-23, session 36a20d): DONE — both builds wire + verified.**
> Decisions (user): authors declare the list in **`sharpee.themes`** (package-name
> array) in the story package.json; the default menu entry is **`classic`** (ADR R7),
> replacing the legacy `dos-classic`.
> - **Templates** (devkit + repo-root `index.html`): default `data-theme="classic"`;
>   a `THEME_LINKS` marker (build replaces with a `<link>` per theme, after the engine);
>   `#theme-menu` reduced to the `classic` default + a `THEME_MENU_ITEMS` marker.
> - **Both builds** (duplicated per ADR-187 R1): `resolveWiredThemes` (require.resolve
>   each listed pkg from the story dir, read `sharpee.theme` manifest — explicit opt-in,
>   no node_modules scan, AC-9), `copyWiredThemes` (theme.css → `dist/web/themes/<id>.css`
>   + declared `assets` e.g. system-6 `fonts/` → `themes/fonts/`; dir rebuilt each time so
>   a de-listed theme never lingers), `injectThemes` (links at the marker + regenerated
>   menu = classic + `{id,name}` per pkg). repokit also mirrors `themes/` to `website/public`.
> - **Dungeo** (story, autonomous): `sharpee.themes` lists the 4 packages + deps added;
>   `browser-entry.ts` defaultTheme → `classic`, menu array aligned.
> **Verified:** real `buildBrowserClient(root,'dungeo')` → `themes/{modern-dark,retro-terminal,paper,system-6}.css`
> byte-identical to package source, `themes/fonts/*` byte-identical, 4 `<link>`s after the
> engine, menu = Classic+4, default `classic`, website mirror updated, no leftover markers.
> devkit real-path `browser-build.test.ts` extended (no-themes default → no `themes/`; then
> add `sharpee.themes` + rebuild → `themes/modern-dark.css` present, linked after engine /
> before override, menu regenerated) — passes. Visual harness +`theme-switch.spec.ts`
> (AC-5 flip across 4 linked pkgs re-skins; AC-8 uninstalled id → classic) — **9/9 pass**.
> repokit typecheck clean; repokit browser rejection tests 2/2.
> **NOT done:** repokit lacks an *automated* real-path wiring test (manual `buildBrowserClient`
> run verified; the logic is duplicated from the devkit path which IS auto-tested). Deleting
> the devkit template theme sources is still deferred (post-Phase 4 cleanup, needs confirmation).

- In **both** build paths (devkit `standalone/build-browser.ts` and repokit
  `commands/browser.ts`): for each theme package listed (BrowserClient `themes` config /
  project config), resolve it, read `sharpee.theme`, copy its CSS to
  `dist/web/themes/<id>.css`, link **after** the engine CSS, register `{id,name}` in the
  client theme menu. No `node_modules` scanning. (Duplicated per tool, ADR-187 R1.)
- **Verify:** listed package → CSS present at `dist/web/themes/<id>.css`, linked after
  engine, `{id,name}` in menu — for an author project (devkit) **and** an in-repo story
  (repokit); switching (visual, harness) re-skins.

### Phase 5 — Book Ch 26 rewrite [AC-6]

> **Status (2026-06-23, session 36a20d): DONE — chapter rewritten + web regenerated.**
> `docs/book/parts/part-7/26-decoration-and-theming.md`: the "Theming: one DOM, many
> skins" section now describes the **engine + token model** (the platform ships one
> un-scoped consumer layer + the `:root` `classic` default; a theme is a `[data-theme]`
> token override; the 16 `--theme-*` properties are the published contract, listed in
> full; equal-specificity load-order + automatic `:root` fallback explained). The old
> "each theme is a complete CSS file" / "the contract is the component classes, not the
> variables" claims are gone. New "Themes are plugins" section: a theme ships as an
> `@sharpee/theme-*` package with a `sharpee.theme` manifest, the author lists it in
> `sharpee.themes`, the build copies/links/menus it (no node_modules scan). The §26.5
> "all it takes" contradiction is resolved — a variables-only block now genuinely skins.
> Family Zoo claim made truthful (it defines a `zoo-sunny` `[data-theme]` token block in
> the author override stylesheet and lists it; the engine paints the components) without
> over-claiming it's already variables-only. Key-takeaway theming sentence updated.
> Regenerated the chunked web site (`scripts/build-book.sh web`, pandoc 3.10, 49 pages):
> `docs/book/web/26-*.html` now shows the plugin model — 0 stale phrases, "theme engine"
> / "@sharpee/theme" / "sharpee.theme" present.
> **NOT done (drift to flag):** `tutorials/familyzoo` still ships `browser/familyzoo.css`
> with the OLD full component-rule block AND consumes pre-ADR-188 published packages
> (`@sharpee/* ^1.0.8`, no engine), so its zoo-sunny still NEEDS those component rules to
> skin today. Migrating familyzoo to the engine model is a separate task (it tracks the
> next published package release), out of this ADR's in-repo scope.

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
- [x] AC-1 engine + `:root` default in platform-browser; zero-theme build skins white-on-blue. *(visual harness, 2026-06-22)*
- [x] AC-2 variables-only theme skins via the engine. *(theme-modern-dark is token-only; parity harness, 2026-06-23)*
- [~] AC-3 themes ship as packages, render identically (4 packages built + parity harness 4/4, 2026-06-23). Remaining: dropping the devkit template sources (deferred to post-Phase 4).
- [x] AC-4 neither browser build (devkit author / repokit in-repo) ships theme CSS unless listed. *(real-path build tests + dungeo build, 2026-06-22/23)*
- [x] AC-5 switching works across default + packages. *(theme-switch.spec.ts, 2026-06-23)*
- [x] AC-6 book Ch 26 rewritten to the plugin model; §26.5 variables-only + correct; web regenerated. *(2026-06-23)*
- [x] AC-7 unset token / unknown theme → `:root` default (never unskinned). *(visual harness, 2026-06-22)*
- [x] AC-8 persisted theme id w/ no package → default on restore. *(theme-switch.spec.ts uninstalled-id case, 2026-06-23)*
- [x] AC-9 self-describing packages; explicit opt-in, no node_modules scan. *(real-path wiring: devkit test + dungeo build, 2026-06-23)*

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
