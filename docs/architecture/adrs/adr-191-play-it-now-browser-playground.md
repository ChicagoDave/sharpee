# ADR-191: "Play It Now" — an in-browser Sharpee playground on the website

## Status: PROPOSED

## Date: 2026-06-25

## Terminology

The feature David described ("drop code in a window, it compiles behind the scenes,
press a button to play") is conventionally called a **playground** (cf. the TypeScript
Playground, Rust Playground, Go Playground). Related names for the same idea: in-browser
**sandbox**, **live editor**, or **REPL**. This ADR uses **playground**; the public page
is titled **"Play It Now"**.

## Context

Trying Sharpee today requires a local toolchain: install Node, `npm i -g @sharpee/devkit`,
`sharpee init`, `sharpee build`, serve `dist/web/`. That is the right loop for authoring a
real story, but it is a high bar for someone who just wants to *see what Sharpee feels
like* from a blog post, the book's landing page, or a conference talk.

We already ship every runtime piece needed to run a story in a browser:

- The `--browser` build (`./repokit build <story> --browser`) emits a **self-contained,
  static web client** under `dist/web/<story>/`: the platform (engine, world-model,
  parser-en-us, stdlib, lang-en-us) plus the framework-free `@sharpee/platform-browser`
  renderer, with the story bundled in. It runs on GitHub Pages with no server.
- Rendering is channel-based (ADR-163) and framework-free (ADR-170); the same renderer
  drives every published story.

The only thing the static client does *not* do is accept a **story supplied at runtime**.
A playground is exactly that: the existing browser bundle, but with the story compiled
from an editor pane on "Play" instead of baked in at build time.

The website is a static GitHub Pages site (`site/`, deployed by `.github/workflows/pages.yml`).
A playground that keeps the site static (no backend) is strongly preferred: it inherits
Pages hosting, costs nothing to run, and executes user code only in the user's own browser.

## Decision

Add a **"Play It Now" playground page** to the website. Layout: a code editor pane, a
**Play** button (plus **Reset** and an errors area), and a player pane that runs the
resulting story in the standard browser client. Compilation happens **client-side, in the
browser** — the site stays fully static.

### How it works (client-side compile pipeline)

1. **Edit.** The user edits a single-file story (the `src/index.ts` shape: imports from
   `@sharpee/*`, a `Story` class/object, `export const story`). The page seeds a runnable
   starter template (the Family Zoo "first room", ch02).
2. **Transpile.** On "Play", the story's TypeScript is transpiled to ESM JavaScript in the
   browser with **`esbuild-wasm`** (fast; can also be used to bundle), leaving the
   `@sharpee/*` specifiers external.
3. **Resolve.** An **import map** points the bare `@sharpee/*` specifiers at **pre-built
   browser-ESM platform bundles hosted on the site** (the same platform code the `--browser`
   build already produces, published as a versioned asset, e.g. `site/playground/vNNN/`).
4. **Load + run.** The transpiled story is loaded as a Blob-URL ES module, its `story`
   export is handed to the engine, and `@sharpee/platform-browser` is attached to the player
   pane — the identical runtime path of every published story.
5. **Isolate.** The compiled story + client run inside a **sandboxed `<iframe>`** so user
   code cannot touch the parent page, and each "Play" gets a clean world. Errors (transpile
   or runtime) surface in the errors area rather than the console.

### Editor

MVP uses **CodeMirror 6** (small, framework-free, fits ADR-170) with TypeScript syntax
highlighting. A later phase can upgrade to **Monaco** for full IntelliSense by loading the
bundled `@sharpee/*` `.d.ts` files (already shipped in `packages/sharpee/docs/genai-api/`
and the npm package) into Monaco's TS worker.

### Versioning

The hosted platform bundle is pinned to a published platform version and lives under a
versioned path so the playground is reproducible and a platform upgrade is a deliberate
republish, not a silent break. The page shows which version it is running.

## Options considered

1. **Client-side compile (CHOSEN).** Transpile + run entirely in the browser against a
   hosted platform ESM bundle. Keeps the site static; zero backend; user code runs only in
   the user's browser. Cost: needs a browser-ESM platform bundle + (for IntelliSense) a
   types payload; type-checking fidelity is limited (transpile strips types, no full `tsc`).
2. **Server-side compile service.** A backend endpoint runs the real `sharpee build` (tsf)
   and returns a story bundle. Pros: exact production toolchain, full type-check, a natural
   path to multi-file. Cons: requires hosting and sandboxing a Node compile service (not
   static Pages), resource limits, and security for running user compiles server-side.
   Rejected for the MVP; retained as a later option behind the same UI if full-fidelity
   compile or multi-file demands it.
3. **Embed an existing third-party sandbox (StackBlitz/CodeSandbox).** Fast to stand up but
   off-brand, dependent on a third party, and awkward to pin to a specific Sharpee platform
   version. Rejected.

## Scope

**MVP (Phase 1):**

- One static page, `site/play.html` (linked from nav and the homepage), framework-free,
  reusing the site chrome (`style.css`, `components.js`, `theme.js`).
- Single-file story; seeded starter template; **Play**, **Reset**, and an errors area.
- CodeMirror 6 editor with TS highlighting.
- `esbuild-wasm` transpile + import-map resolution against a hosted, version-pinned
  platform browser-ESM bundle.
- Player pane = `@sharpee/platform-browser` in a sandboxed iframe.

**Later phases:**

- Monaco editor + full `@sharpee/*` IntelliSense from bundled `.d.ts`.
- **Shareable URLs** (encode the story in the URL/hash, like the TS Playground) and/or
  gist import, for blog posts and the book.
- A library of **starter examples** (the book's per-chapter snippets, the Family Zoo
  checkpoints) loadable into the editor — direct synergy with the book code-snippet page.
- Multi-file projects.
- Optional **server-compile** path for full type-checking.
- Convergence with the standalone IDE effort (ADR-185) — the playground is the web-embedded
  cousin of that authoring surface.

## Consequences

- **New published asset: a browser-ESM platform bundle (+ later a types payload).** The
  platform must be consumable as browser ESM with no Node-runtime dependencies on the run
  path. The `--browser` build already proves the platform runs in a browser; this packages
  that same code for runtime story injection. Confirming there are no `fs`/`path`/Node-only
  imports on the runtime path is the **primary technical risk** to validate first.
- **Lowers the barrier to trying Sharpee to zero** (no install) — strategically aligned with
  the book + tutorial landing page and the adoption story.
- **New maintenance surface:** editor, transpile pipeline, and version pinning of the hosted
  platform bundle to each release (a step in the release/build process).
- **Security:** in the MVP, user code is transpiled and executed only in the user's own
  browser, inside a sandboxed iframe; nothing runs on a server. No new server attack surface.
- **Static-site preserved:** no backend, so GitHub Pages hosting and the existing Pages
  deploy continue unchanged.

## Acceptance criteria

- AC-1: A "Play It Now" page exists, linked from the site nav, using the shared site chrome.
- AC-2: The page loads a runnable starter story in the editor by default.
- AC-3: Pressing **Play** transpiles the editor's TypeScript in-browser and runs the
  resulting story in the player pane via `@sharpee/platform-browser`, with no network call to
  a compile backend.
- AC-4: A story that imports `@sharpee/*` resolves against the hosted, version-pinned platform
  ESM bundle and runs (e.g. the Family Zoo first room is playable: `look`, `examine sign`).
- AC-5: Transpile and runtime errors are shown in an errors area, not only the console, and
  do not break the page.
- AC-6: **Reset** restores a clean world (and the starter template).
- AC-7: User code runs sandboxed (iframe) and cannot mutate the host page.
- AC-8: The page displays the platform version it is running.

## Open questions

- Does the platform's runtime path import any Node-only modules (`fs`, `path`, `process`)
  that would block a clean browser-ESM bundle? (Validate against the existing `--browser`
  output first — it should already be clean.)
- Bundle size/cold-start budget for `esbuild-wasm` (~MBs) plus the platform bundle — is the
  first-Play latency acceptable, and should the wasm/platform load be deferred until the
  user focuses the editor or clicks Play?
- CodeMirror-first vs Monaco-first: is IntelliSense important enough to start with Monaco
  despite its weight, given the framework-free constraint (ADR-170)?
- Where does the hosted platform bundle live and how is it produced — a new `repokit`/
  `build-book`-style step that emits `site/playground/v<version>/` from the `--browser`
  pipeline?

## Relationships

- **Extends / relies on** ADR-170 (framework-free browser UI) and ADR-163 (channels as the
  universal UI surface) — the playground reuses `@sharpee/platform-browser` and the channel
  renderer unchanged.
- **Reuses** the `--browser` build output (ADR-187 repokit / ADR-180 devkit split): the
  playground is "the browser client, with the story supplied at runtime."
- **Synergizes with** the book's code-snippet page (this session) — snippets and Family Zoo
  checkpoints become loadable playground examples — and with the book + tutorial landing page.
- **Anticipates** ADR-185 (standalone IDE authoring tool): the playground is the lightweight,
  web-embedded sibling; they may share the editor + in-browser-compile machinery later.

## Session

Proposed 2026-06-25 (session 467027), after integrating the book's web presence into the
site. Written from David's request for a no-install "Play It Now" page; status PROPOSED,
pending his review and a spike on the browser-ESM platform bundle (the primary risk).
