# ADR-171: Dynamic Per-Theme CSS Loading and Story-Shippable Themes

## Status: PROPOSED

## Date: 2026-05-08

## Builds on

- **ADR-170** (Component-Based Theming for the Browser Client) — defines
  the `.sharpee-*` component vocabulary that themes target. ADR-170
  established that each theme is a complete CSS kit covering every
  component class. ADR-171 takes the next step: each kit is a
  separately-shipped CSS file loaded only when active, and stories may
  register their own kits without touching platform code.
- **ADR-163** (Channel-Service Platform) — establishes the principle that
  the platform exposes UI surfaces; authors customize per story. ADR-163
  governs *data flow*; ADR-170 governs *visual chrome*; ADR-171 governs
  *who ships the visual chrome and how it is delivered*.
- The persistent direction recorded in
  `feedback_web_client_author_customizable`: "platform ships UI defaults
  for every channel/surface; authors override per-story; wire is
  data-only, never assume locked-in client choices." Story-shippable
  themes are the explicit visual-layer instance of that commitment.

## Context

After ADR-170 landed, the five themes (DOS Classic, Modern Dark,
Retro Terminal, Paper, System 6) all live in a single
`templates/browser/infocom.css` file (~1,982 lines). Each theme is a
complete kit targeting the `.sharpee-*` component vocabulary, but the
kits are concatenated into one file the browser downloads in full
regardless of which theme is active.

This deferred concatenation served Phase 2 and Phase 3 of the
component-themes work (one file, easy to bisect). It does not serve the
long-running design intent for two reasons:

1. **Story-shippable themes are impossible.** A story author who wants
   a custom theme has nowhere to put it. The shared `infocom.css` lives
   in the platform's `templates/browser/` folder; appending to it
   requires modifying platform code and shipping a platform release.
   This contradicts the explicit `feedback_web_client_author_customizable`
   commitment.

2. **The wire grows linearly with the theme catalog.** Each new theme
   adds ~360 lines (System 6's footprint) regardless of whether anyone
   selects it. Five themes is tolerable; ten themes plus story-custom
   themes is not.

The fix is to make each theme a separately-loaded CSS file. The
*active* theme's file is in the `<head>`; switching themes loads the
new file and removes the old one. Stories register their own themes
the same way platform themes are registered, with `cssPath` pointing
into the story's own assets.

Two browser concerns shape the design:

- **Runtime swap must not flash unstyled content** between when the new
  stylesheet is requested and when it parses. Adding the new `<link>`
  before removing the old one, with a `load`-event guard, contains the
  window to tens of milliseconds.

- **Initial page load must not flash the wrong theme.** Today
  `applyEarlyTheme()` runs synchronously in `<head>` before `<body>`
  renders, setting `data-theme` from localStorage. With dynamic loading,
  the *active theme's CSS file* must also be in `<head>` synchronously,
  written by inline `<script>` from the registered themes table.

Three options were considered for the runtime swap mechanism:

- **(a) Two `<link>` tags with `load`-event sequencing.** Append the
  new theme's `<link>`, await its `load` event, set `data-theme`,
  remove the previous `<link>`. Broadest browser support; FOUC window
  is the time between `load` firing and the previous `<link>` being
  removed (single-frame, perceptually invisible).
- **(b) Mutate `href` on a single `<link>` element.** Simpler in code,
  but most browsers do not reliably fire the `load` event when `href`
  changes on an existing element — risks invisible failures where the
  swap silently doesn't happen.
- **(c) `adoptedStyleSheets` + `CSSStyleSheet.replaceSync()`.** Modern
  API, no FOUC window, no DOM churn. Requires Chrome 73+, Firefox 101+,
  Safari 16.4+ (March 2023). Excludes browsers older than ~3 years.

Three options were considered for the registration schema:

- **`cssPath` required for every theme.** Eliminates the inline
  CSS-block legacy path; every theme is its own file, no exceptions.
- **`cssPath` optional, inline-block fallback retained.** Gentler
  migration, but leaves a permanent escape hatch that becomes the
  default authoring path.
- **Auto-resolve `cssPath` from theme `id` if omitted** (e.g., default
  to `themes/<id>.css`). Cleaner-looking schema, but conflates
  convention with constraint and complicates story-asset paths.

Two options were considered for cache-busting:

- **Build-hash in filename** (`themes/dos-classic.a3f7b2.css`). Build
  rewrites both file and registered `cssPath`. Browser caches forever;
  every build invalidates automatically. Requires a hashing layer
  in the build pipeline that does not currently exist.
- **No hash; rely on Cache-Control headers and user hard-refresh.**
  Simpler now. When stale-cache reports come in from real
  deployments, we revisit with a focused effort.

## Decision

**Move every theme to a separately-loaded CSS file. Load the active
theme's file dynamically. Allow stories to register custom themes by
pointing `cssPath` at story assets.**

### Runtime swap: two `<link>` tags with `load`-event sequencing

Option (a) above. `ThemeManager.applyTheme(id)` becomes async:

1. Look up the theme entry; read `cssPath`.
2. Append `<link rel="stylesheet" href="<cssPath>" data-theme-link="<id>">`
   to `<head>`.
3. `await` the new link's `load` event (with a ~500ms timeout fallback).
4. Set `data-theme="<id>"` on `<html>`.
5. Remove the previously-active `<link data-theme-link="*">`.
6. Persist `id` to localStorage.

**Timeout-fallback behavior.** If the `load` event does not fire within
~500ms, the swap proceeds anyway: steps 4–6 still run. The new theme
will paint when the stylesheet eventually arrives; the window between
500ms and arrival may show partially-styled content (component classes
without their theme rules). We accept this over silently failing to
switch, on the basis that 500ms is already past the perceptual FOUC
threshold and the failure mode of "theme didn't switch" is worse than
"theme switched late."

**Stylesheet load failure (404, network error).** When `cssPath` 404s
or otherwise fails to load, the swap still completes (per the timeout
behavior above), the failure is logged to console with the theme id
and `cssPath`, and the visual fallback is whatever rules were already
applied — typically the previously-active theme stays painted because
the new `<link>` produces no rules. This is intentional: a broken
custom theme degrades gracefully rather than crashing the UI.

Option (c) is technically superior but excludes Safari versions older
than 16.4. Sharpee does not have a documented browser-support floor;
adopting (c) would set one implicitly. Option (a) is unconditionally
safe and the FOUC window is not perceptible at the resolution the
sequencing provides.

### Initial-load FOUC: inline `<script>` writes synchronous `<link>`

`templates/browser/index.html` gains an inline `<script>` early in
`<head>` that:

1. Reads the saved theme id from localStorage (key passed by the
   story's `browser-entry` build).
2. Looks up the registered themes table — embedded into the inline
   script at build time — for the matching `cssPath`. **If the
   localStorage id has no entry in the registered themes table** (e.g.,
   a story update removed a theme the user previously selected), the
   script falls back to `defaultTheme` and writes that theme's `<link>`
   instead. The stale-localStorage case is the explicit motivating
   scenario; without this fallback, the page would render unstyled.
3. Synchronously writes `<link rel="stylesheet" href="<cssPath>"
   data-theme-link="<id>">` into `<head>` before `<body>` renders.
4. Sets `data-theme` on `<html>`.

The themes table embedding happens during `build_browser_client` —
the build reads the story's `browser-entry.ts` themes config and
inlines a literal JS object into the HTML template. No async fetch,
no separate manifest file; the registry is part of the served HTML.

`ThemeManager.applyEarlyTheme()` retains its current API but its
implementation is split: the *attribute* setting moves to the inline
HTML script (because it must run before any platform JS loads); the
*manager-side* state (caching the id for later JS reads) stays in
`ThemeManager`.

### Schema: `cssPath` required, no fallback

```ts
interface ThemeConfig {
  id: string;
  name: string;
  cssPath: string;       // REQUIRED — no inline-block fallback
  fontAssets?: string[]; // optional list of asset paths to copy
}
```

There is no inline-CSS-block escape hatch. Every theme is its own
file. The migration in Phase 2 eliminates the inline path entirely;
after that point, an inline-mode would be an exception that
re-introduces the problem this ADR exists to solve.

### Path resolution: literal URL relative to served HTML root

`cssPath` is treated as a literal URL relative to the served HTML
root. The platform does not attempt to distinguish "platform theme"
from "story theme" or rewrite paths automatically.

- Platform themes: `cssPath: 'themes/<id>.css'` (build copies
  `templates/browser/themes/<id>.css` to `dist/web/<story>/themes/`)
- Story themes: `cssPath: 'assets/themes/my-custom-theme.css'`
  (story's build pipeline copies the file to the corresponding output
  location)

The convention is "wherever your build puts the file is the path you
register." A story's `build_browser_client` step is responsible for
copying its own `assets/` into the dist output.

The story-side update site for theme registration is the story's
browser entry point — for Dungeo this is
`stories/dungeo/src/browser-entry.ts` (the `themes: [...]` array on
the `BrowserClient` config). Phase 2's per-file split updates this
file in lockstep with the CSS extraction.

### Cache-busting: deferred

No content-hash filenames in this ADR. The build pipeline does not
currently have a hashing layer; building one is its own architectural
project that should apply to all static assets uniformly, not just
theme CSS. Until that work happens:

- Dev workflow: hard-refresh during iteration.
- Production: stale theme caches are an acceptable first-encounter
  bug. When real users report the symptom, we revisit with a focused
  effort.

This is a deliberate punt, not an oversight.

### Validation: deferred to The Alderman

The story-asset-path branch of `cssPath` resolution is not exercised
by any in-tree consumer in Phase 3. The Alderman (David's planned
future story) will be the first real story to register a custom theme
and is the named validator for the story-shippable-theme branch.

The bundled `packages/sharpee/templates/browser/` author starter
(republished as part of this ADR's debt — see Consequences) exercises
the platform-theme branch by copy-paste-construction. That covers
Phase 3's most likely failure mode (broken `<link>` writing logic);
it does not cover the most likely *story-side* failure mode
(authors getting the asset-path wrong), which The Alderman surfaces.

## Consequences

### Positive

- **Story-shippable themes work.** A story author drops a CSS file
  in their assets, registers it in `browser-entry.ts`, ships. No
  platform changes required.
- **Wire shrinks proportionally.** A user only downloads the active
  theme's CSS, not the full ~2k-line concatenation.
- **Per-theme files are easier to author.** A theme is one
  self-contained file; an author copies an existing one as a
  template, edits, ships.
- **Future themes scale.** Adding a sixth, seventh, twentieth platform
  theme has zero per-existing-user cost.

### Negative

- **`applyTheme` becomes async.** All callers must `await` it. This is
  a breaking platform-contract change for any third-party code calling
  `ThemeManager.applyTheme()` directly. (Scope of breakage: in-repo
  callers in `BrowserClient.initialize()` and `MenuManager` theme
  click handlers — both updated in Phase 1.)
- **First-time-load HTML is slightly more complex.** The inline
  `<script>` block is new code in `index.html` that must be kept in
  sync with the registered themes structure. Mitigated by build-time
  embedding (the script is generated, not hand-maintained).
- **Cache-busting punt.** Authors who update a custom theme without
  cache-busting may see stale CSS during dev. Documented in the
  bundled README as a known dev-workflow consideration.
- **No in-tree story-asset-path consumer until The Alderman.** Phase 3
  acceptance can prove the platform mechanism but cannot prove the
  story-asset-path branch end-to-end. The risk is that an obscure
  path-resolution bug ships and surfaces only when David starts The
  Alderman. Mitigated by the bundled starter exercising the most
  fragile machinery (the `<link>` write/swap logic) and by
  documenting the asset-path expectation explicitly in the README.

### Constraints on future work

- Any future "I want a single stylesheet for offline static deployment"
  request reverses this ADR. If that constraint surfaces, the question
  is "should the build optionally concatenate?" not "should we revert
  to inline blocks."
- Any future "themes can extend other themes" feature requires
  additional design — `cssPath` is a literal file, not a kit
  identifier; theme inheritance would need a new concept layered on
  top.

### In-scope debt that this ADR's implementation MUST close

`packages/sharpee/templates/browser/` was previously a stale author
starter (pre-ADR-170 contract, dead `--dos-*` variables). It was
deleted on 2026-05-08 on the explicit condition that this ADR's
implementation rebuilds it. Phase 3 of the implementation plan
(`docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md`)
republishes:

- A current `index.html` matching the `<dialog>` + `.sharpee-*`
  contract from ADR-170, including the inline FOUC-prevention `<script>`.
- A current `base.css` (structural).
- At least the DOS Classic theme as a default-ready example.
- A `browser-entry.ts.template` matching the current Dungeo entry
  pattern (no `modalOverlay`, no callbacks block, channel-renderer
  registration shown, themes-array shape current).
- A README explaining the author flow.

A new author doing `pnpm install @sharpee/sharpee` and copying from
`node_modules/@sharpee/sharpee/templates/browser/` MUST get a working,
current-contract starter when this ADR's implementation completes.

## Acceptance Criteria

When the implementation phases land, the following must hold for the
ADR to move from PROPOSED to ACCEPTED:

1. **Switching themes via Settings → Theme works without visible
   FOUC.** Verified manually in Chromium, Firefox, and Safari.
2. **Initial page load with a non-default saved theme paints the
   correct theme on first frame.** Verified by clearing localStorage,
   selecting a non-default theme, refreshing, and confirming no flash
   of the default theme.
3. **DevTools Network tab shows only the active theme's CSS** on
   initial load (plus `base.css`). Verified by hard-refresh under each
   theme.
4. **DevTools shows exactly one new stylesheet request and one
   removed `<link>` element per theme switch.** Verified during
   manual smoke.
5. **The previous theme's CSS rules do not apply after a switch.**
   Verified via `document.styleSheets` inspection in DevTools.
6. **Walkthrough chain (`wt-*.transcript`) passes.** Regression gate.
7. **Bundled `packages/sharpee/templates/browser/` contains a
   current-contract starter** as enumerated in the in-scope-debt
   section above.
8. **README documents the author flow** for shipping a custom theme,
   covering: where to put the CSS file, what classes to target, how
   to register it, what the asset-path expectation is.
9. **Stylesheet-load-failure behavior is verified.** When a registered
   theme's `cssPath` 404s, the swap completes without crashing the UI,
   the failure is logged to console, and the previously-active theme
   remains painted (per the timeout/load-failure section of Decision).
   Verified by manually pointing a registered theme's `cssPath` at a
   nonexistent file and confirming graceful degradation.
10. **Stale-localStorage fallback is verified.** When localStorage
    contains a theme id not in the registered themes table, the
    inline-script falls back to `defaultTheme` and renders correctly
    on first paint. Verified by setting localStorage to a removed
    theme id and refreshing.

The story-shippable-theme branch (story-registered theme actually
loading from a story-asset path) is acceptance-deferred to The
Alderman's first build. Until then, the platform mechanism is
proven; the end-to-end story flow is not.

## Session

2026-05-08 — Phase 0 design Q&A in session
`docs/context/session-20260508-1014-main.md`. The 8 design questions
listed in
`docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md`
were resolved interactively in this session. The bundled-starter debt
(documented above as "In-scope debt") originated from the same
session's cleanup of `packages/sharpee/templates/browser/`.

## References

- `docs/work/theme-architecture/plan-20260507-dynamic-theme-loading.md`
  — implementation plan; Phase 0 of that plan is closed by this ADR
  reaching READY.
- `docs/architecture/adrs/adr-170-component-based-theming.md` — the
  component vocabulary this ADR builds on.
- `docs/architecture/adrs/adr-163-channel-service-platform.md` — the
  channel-IO commitment this ADR's story-shippable-themes feature is
  the visual-layer instance of.
- `feedback_web_client_author_customizable` — the long-running design
  intent driving this ADR.
- 2026-04-29 author-enabled-client-architecture post on
  `sharpee.plover.net`.
