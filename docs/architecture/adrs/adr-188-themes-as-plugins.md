# ADR-188: Themes are plugins; platform-browser owns the theme engine

## Status: ACCEPTED (delivery model revised 2026-06-23 — see Revision below)

## Date: 2026-06-22

## Revision (2026-06-23): built-in themes ship with the platform, not as packages

Implementation surfaced that delivering the **built-in** themes as separate
installable `@sharpee/theme-*` npm packages (R1) is the wrong friction: an author
should not have to `npm install` (and the project publish) a package per standard
theme. The engine + token model (the core of this ADR) is unchanged; only **delivery**
of the built-ins changes:

- **Built-in themes ship with `@sharpee/platform-browser`** under `styles/themes/`
  (`modern-dark.css`, `retro-terminal.css`, `paper.css`, `system-6.css` + a
  `manifest.json` mapping `id → { name, css, assets }`). They travel with the engine
  package (already published as a `styles/**` asset) — no separate packages to publish
  or install.
- **An author applies a built-in by listing its id**: `sharpee.themes: ["modern-dark",
  "paper"]`. The build copies that theme's CSS from platform-browser into
  `dist/web/themes/` and wires the menu. `classic` is the `:root` default and needs no
  entry.
- **An author's own theme** is a `[data-theme]` token block in the author override
  stylesheet (`browser/<story>.css`), listed inline as `{ id, name }` in
  `sharpee.themes` (menu entry only; the CSS is already in the override).
- **The `@sharpee/theme-*` package mechanism is retained as the future path for
  *third-party/community* themes** (shareable, versioned), but the built-ins do not use
  it. This supersedes R1/R5 *for the built-ins only*: they are platform-shipped data
  selected by id, not packages. AC-3's "removed from devkit, ship as packages" is met
  in spirit (the built-ins left devkit's template; they now live in platform-browser).

The rest of the ADR (engine, token model, cascade/fallback, wiring, ACs) stands.

## Extends

ADR-170 (Component-Based Theming for the Browser Client). ADR-170 established the
`.sharpee-*` component vocabulary + `--theme-*` custom properties + `data-theme`
switching. This ADR fixes how themes are *implemented and delivered*: it extracts a
single theme **engine** so a theme becomes data, and makes themes **plugins** rather
than built-ins baked into devkit.

## Context

The browser CSS today (`packages/devkit/templates/browser/styles.css`, ~1988 lines) is
**five hand-copied themes** — `dos-classic`, `modern-dark`, `retro-terminal`, `paper`,
`system-6` — each ~360 lines. Every theme re-implements the *same* component rules
scoped to its own selector: `[data-theme="X"] body { background: var(--theme-bg) }`,
the menu, status bar, prose pane, dialogs, scrollbars, etc.

The `--theme-*` custom properties exist, but **nothing generic consumes them** —
`grep` finds 0 un-scoped `var(--theme-*)` consumers; all ~349 are inside a
`[data-theme="X"]` block. So "a theme" in practice means *copy 360 lines and change the
values*. Three consequences:

1. **Book QA defect (Ch 26 §26.5).** The book's author-theme example sets only
   `--theme-*` variables ("the CSS block and the config entry are all it takes") — but
   with no consuming component rules, a variables-only theme is **inert** (the
   `data-theme` flips, the page never re-skins). §26.4's prose is right that you must
   style the `.sharpee-*` components under your `[data-theme]` block; §26.5's snippet
   contradicts it.
2. **All themes live in devkit**, which ADR-187 just made the *author* tool — runtime
   UI presentation does not belong there.
3. **Adding a theme is hostile** — an author must duplicate ~70 component rules just to
   read the variables, which defeats the point of having variables.

The variables were meant to enable a single consumer; the architecture never built it.

## Decision

**Extract the engine from the themes, put it in the runtime client, and ship themes as
plugins.**

- **`@sharpee/platform-browser` owns the theme engine.** A single, **un-scoped**
  component layer maps every `--theme-*` variable onto the `.sharpee-*` component
  vocabulary (`body { background: var(--theme-bg); color: var(--theme-text) } …`). This
  is the published, versioned **`--theme-*` contract** — the one definition of how a
  theme's variables paint the UI. The 16 variables: `--theme-bg`, `--theme-bg-alt`,
  `--theme-text`, `--theme-text-muted`, `--theme-accent`, `--theme-accent-text`,
  `--theme-border`, `--theme-input-bg`, `--theme-menu-bg`, `--theme-menu-hover`,
  `--theme-desktop-bg`, `--theme-font`, `--theme-font-body`, `--theme-font-chrome`,
  `--theme-font-size`, `--theme-line-height`.

- **A theme is data:** a `[data-theme="<id>"] { --theme-*: … }` variable block, plus an
  *optional* small override block for genuine flourishes the variables can't express
  (e.g. dos-classic's `text-transform: uppercase` title, a retro scanline). A *simple*
  theme is just variables; a *rich* theme is variables + a few overrides.

- **Themes ship as npm packages** — `@sharpee/theme-<name>`. Each ships its CSS (the
  variable block + optional flourishes) and its menu metadata (`{ id, name }`). They
  target platform-browser's `--theme-*` contract. The five current built-ins become
  theme packages; they are **removed from devkit's template**.

- **The default theme is the `:root` token baseline**, not a `[data-theme]` block.
  platform-browser ships `:root { --theme-bg:#0000aa; --theme-text:#fff; … }` — the
  classic white-on-blue palette — unconditionally. So the client is **always** skinned,
  even with no `data-theme` set and zero theme packages installed (and no FOUC).

- **Neither browser build ships theme CSS.** Post-ADR-187 there are two browser builds:
  the **devkit author** build (`packages/devkit/src/standalone/build-browser.ts`) and the
  **repokit in-repo** build (`tools/repokit/src/commands/browser.ts`, for Dungeo/FZ).
  Both copy platform-browser's engine + `:root` default CSS into `dist/web/`, and wire any
  listed `@sharpee/theme-*` packages' CSS + menu entries in — each independently (ADR-187
  R1: separate codebases, overlap duplicated). (Rewires the current `TEMPLATES_DIR` copy
  of `base/decorations/styles.css` + `themes/` to source from platform-browser instead.)

### Token model, cascade & fallback

This is the design tokens pattern, and it's what makes themes robust and small:

1. **`:root` holds the default token values** (the white-on-blue palette) — always
   present, so every component is skinned by default.
2. **A theme overrides tokens** under `[data-theme="<id>"] { --theme-*: … }`. Because
   `:root` and `[data-theme="x"]` have equal specificity, **load order decides** — so
   theme CSS must load *after* the engine/`:root` CSS (see wiring below).
3. **The engine consumes tokens** (`background: var(--theme-bg)`, …) once, un-scoped.
   No component rule is ever repeated per theme.
4. **Graceful degradation is automatic.** A token a theme leaves unset, an unknown
   `data-theme`, or a persisted theme whose package isn't installed all resolve to the
   `:root` default — the page is **never** unskinned, with zero fallback code. (Belt and
   suspenders: engine `var()` usage may also carry literal fallbacks,
   `var(--theme-bg, #0000aa)`, but `:root` already guarantees the value.)

### Theme package contract & wiring

- **A `@sharpee/theme-<name>` package is self-describing:** it ships one CSS file (e.g.
  `theme.css`) — a `[data-theme="<id>"] { --theme-*: … }` token block plus any optional
  flourish rules — and declares its metadata in `package.json`:

  ```jsonc
  "sharpee": { "theme": { "id": "modern-dark", "name": "Modern Dark", "css": "./theme.css" } }
  ```

- **Opt-in is explicit, discovery is not magic.** The author lists the theme packages
  they want (in the `BrowserClient` `themes` config / project config) — no scanning of
  `node_modules`. For each listed package, the browser build (devkit author and repokit
  in-repo, each independently per ADR-187 R1) resolves it, reads its `sharpee.theme`
  manifest, copies its CSS to `dist/web/themes/<id>.css`, links it in `index.html`
  **after** the engine/`:root` CSS (so its `[data-theme]` overrides win), and registers
  `{ id, name }` in the client's theme menu. The package carries the id /
  name / css; the author just names the package — low friction, no implicit behavior.
- The **default needs no package** — it's the `:root` baseline in platform-browser.

## Consequences

- The book's §26.5 promise becomes literally true: an author theme = a variable block,
  and it skins via the engine. Ch 26 is rewritten to the plugin model.
- `styles.css` collapses dramatically — the engine is one component layer; each theme is
  ~20 lines of variables + a handful of flourishes.
- Clean layering, consistent with ADR-187: runtime UI (engine, default theme) in
  platform-browser; author build-wiring in devkit; specific themes are opt-in plugins.
- New published surface: the `--theme-*` contract + the `@sharpee/theme-*` package shape
  (a registration/versioning concern for each theme package).
- devkit's browser build changes its CSS source (platform-browser, not its own
  template) — a delivery rewire that must keep `dist/web/` byte-complete.
- zifmia (multi-user) has its own CSS today; unifying it on the engine is a **separate,
  later** step — out of scope here.

## Acceptance criteria

- **AC-1 — engine + default in platform-browser.** platform-browser ships the un-scoped
  `--theme-*` consumer layer and the white-on-blue default. A `build --browser` with
  **zero** theme packages renders a fully-skinned white-on-blue client.
- **AC-2 — variables-only themes skin.** A theme that is *only* a `[data-theme]`
  variable block (no component rules) skins correctly via the engine — the §26.5
  promise holds.
- **AC-3 — built-ins become packages, no regression.** The five former themes ship as
  `@sharpee/theme-*` packages, removed from devkit; installing + listing one makes it
  selectable and it renders **identically** to the current build (visual/computed-style
  parity).
- **AC-4 — no browser build ships theme CSS.** The engine/default/themes are not in
  `packages/devkit/templates`; **both** browser builds — devkit author
  (`standalone/build-browser.ts`) and repokit in-repo (`commands/browser.ts`) — only
  source platform-browser's CSS and wire listed theme packages into `dist/web/`.
- **AC-5 — switching works.** `data-theme` flips between the default and installed theme
  packages re-skin the page.
- **AC-6 — book updated.** Ch 26 rewritten to the plugin model; §26.5 example is a
  variables-only theme and is correct.
- **AC-7 — graceful fallback.** An unset `--theme-*` token, or a `data-theme` with no
  matching/installed theme, renders the `:root` default — the page is never unskinned.
- **AC-8 — persisted-theme resilience.** A persisted selected-theme id whose package is
  not installed on a later build falls back to the default (no error, no blank skin).
- **AC-9 — self-describing packages.** devkit wires a listed `@sharpee/theme-*` from its
  `sharpee.theme` manifest alone (id/name/css); the author lists the package, nothing
  else, and `node_modules` is not scanned.

## Tests

Real-path (Playwright over a built `dist/web/`, the harness that caught the bug):

- **Engine default:** build with no theme package → assert computed `body` background ≈
  `#0000aa`, text `#ffffff` (white-on-blue skins with no theme installed).
- **Variables-only theme:** a fixture theme that sets only `--theme-bg/-text/-accent` →
  assert the page's computed styles track those values (skins via the engine alone).
- **Migrated package parity:** build with `@sharpee/theme-modern-dark` installed +
  selected → computed styles match the pre-migration modern-dark rendering (no
  regression). Repeat for the other four.
- **Switch:** flip `data-theme` default ↔ a package theme → computed styles change
  accordingly.
- **Fallback (negative):** set `data-theme="does-not-exist"` (no package) → computed
  styles equal the `:root` default (white-on-blue). A fixture theme that omits
  `--theme-accent` → the accent resolves to the `:root` default, not `unset`.
- **Persisted-theme resilience:** persist selected theme `X`, build *without* `X`'s
  package, restore → renders the default; no console error.
- **Wiring (real-path):** list one `@sharpee/theme-*` in config → `dist/web/themes/<id>.css`
  exists, is linked after the engine CSS, and `{id,name}` appears in the menu.

## Resolved decisions (2026-06-22)

- **R1 — delivery: npm packages.** Themes are `@sharpee/theme-*` packages (versioned,
  installable, shareable), not drop-in files.
- **R2 — default: standard white-on-blue**, shipped by platform-browser.
- **R3 — engine home: `platform-browser`** (not devkit, not a dedicated package).
  Rationale: the engine is runtime presentation (platform-browser's domain), it must be
  a *published* contract for theme packages to target (R1), and it keeps devkit
  author-only (ADR-187). A dedicated `@sharpee/theme-engine` package was rejected as
  over-factored unless zifmia later needs a platform-browser-independent base.

## Resolved decisions (2026-06-22)

Settled with CSS-architecture judgment (the design tokens / `:root`-default pattern):

- **R4 — token model & cascade.** `:root` holds the default token values; themes override
  tokens under `[data-theme="<id>"]`; the engine consumes tokens once, un-scoped; theme
  CSS loads *after* the engine/`:root` CSS so equal-specificity overrides win. Robustness
  (unset token / unknown theme / uninstalled persisted theme → `:root` default) is
  automatic, no fallback code.
- **R5 — theme package shape.** `@sharpee/theme-<name>` ships one CSS file (token block +
  optional flourishes) and a `package.json` `sharpee.theme` manifest `{ id, name, css }`.
- **R6 — wiring is explicit + self-describing.** The author lists the theme packages they
  want; `build --browser` resolves each, reads its manifest, copies the CSS to
  `dist/web/themes/<id>.css`, links it after the engine CSS, and registers `{id,name}`.
  No `node_modules` scanning.
- **R7 — default theme id `classic`** (name "Classic", white-on-blue), shipped as the
  `:root` baseline — no package. (The name is cosmetic; the id is the stable handle.) A
  separate `dos-classic` package becomes optional, since the default already is that
  palette.

## Deferred (non-blocking)

- **zifmia unification** on the shared engine — zifmia has its own CSS today; moving it
  onto the platform-browser engine is a separate later step, out of scope here.

## Issues / Session

- Surfaced 2026-06-22 by book QA (Ch 26 §26.5 theming inert). The `--sharpee-*`→`--theme-*`
  variable-namespace rename (commit `14cabe83`) was necessary but insufficient — the
  missing consumer is the real defect this ADR addresses.
- Cross-references: ADR-170 (component theming), ADR-187 (devkit author-only),
  ADR-174 (decoration), ADR-178 (baseline packages).
