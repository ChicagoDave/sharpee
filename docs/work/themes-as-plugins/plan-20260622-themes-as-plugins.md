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
- [x] AC-1 engine + `:root` default in platform-browser; zero-theme build skins white-on-blue. *(visual harness, 2026-06-22)*
- [ ] AC-2 variables-only theme skins via the engine.
- [ ] AC-3 5 themes ship as packages, removed from devkit, render identically.
- [x] AC-4 neither browser build (devkit author / repokit in-repo) ships theme CSS. *(real-path build tests + dungeo build, 2026-06-22)*
- [ ] AC-5 switching works across default + packages.
- [ ] AC-6 book Ch 26 rewritten; §26.5 variables-only + correct.
- [x] AC-7 unset token / unknown theme → `:root` default (never unskinned). *(visual harness, 2026-06-22)*
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
