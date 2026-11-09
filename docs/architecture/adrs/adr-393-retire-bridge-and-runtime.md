# ADR-393: Retire `@sharpee/bridge` and `@sharpee/runtime`

**Status**: **ACCEPTED** (David, 2026-11-08, session 72d34d — "Lantern is dead, retire both"). Landed the same session; this record is written as the retirement lands.

## Date: 2026-11-08

**Kind**: process

**Scope**: `packages/_archive/bridge`, `packages/_archive/runtime`, `packages/sharpee` (the `runtime-surface` subpath), `pnpm-workspace.yaml`, `sonar-project.properties`, `docs/core-concepts/README.md`, `docs/architecture/adrs/adr-135-native-engine-bridge-protocol.md` (annotation only).

## Context

Two packages were born in March 2026 for Lantern, a prose-first LLM authoring tool in its own private repository, which needed to host a running Sharpee engine from outside the engine's process:

- `@sharpee/bridge` (ADR-135): a Node subprocess speaking newline-delimited JSON over stdin and stdout. It loaded a story from a `.sharpee` zip or compiled a TypeScript entry on the fly with esbuild, and flushed each turn as blocks, then events, then a status line.
- `@sharpee/runtime`: a headless engine in an iframe speaking postMessage. The parent sent story code as a string; the runtime evaluated it and expected `window.SharpeeStory` with `config`, `initializeWorld` and `createPlayer` — the TypeScript story contract only, with no path to a `.story` file.

They shared one engine API surface, `packages/sharpee/src/runtime-surface.ts`, whose header named them as its only consumers.

A deep dive on 2026-11-08 (triage of GH #409, "bridge and runtime have no consumer in the repo") established, against the tree at `89265ffcd`:

- **No consumer.** Nothing outside the two packages imported either one; the only references were the retired `tools/_archive/shite` and documents.
- **Never published.** Both 404 on the npm registry. Neither was in the ADR-178 baseline nor in repokit's platform package list, so `./repokit build` never built them; only turbo did, which is why they still typechecked.
- **No bundle step.** ADR-135 promises a standalone `node_bridge.js` and the runtime's README promises `sharpee-runtime.js`, both from the retired `build.sh`. Repokit has neither, so the runtime could not run at all: `runtime-frame.html` loads a file nothing produces. The README's own status line read "Draft — Incomplete and Untested."
- **No tests, no test script** (the 2026-11-02 refactoring-survey assessment recorded both at zero).
- **Real-path probe.** The bridge started and announced protocol 1.0.0, then failed to load Dungeo in TypeScript mode because it assumed `tsconfig.json` beside the entry file, where Dungeo's is one level up — a latent assumption nobody had ever hit.
- **Ongoing cost.** Six engine-contract changes since August touched both packages to keep them compiling (ADR-327, 334, 344, 345, 387, 390); ADR-387 lists them in its Scope. GH #475 (the publish validator silently skipping them) existed only because they existed.
- **What replaced them.** The Swift Chord Writer Play pane loads `dist/web/<id>/index.html` in a WKWebView with the engine in-process in the platform-browser bundle. The Avalonia PaneHost serves the same web panes and spawns Node only for the Chord compiler and lexer services, reusing the NDJSON-over-stdio idiom by hand without the package. Browser hosting goes through platform-browser's host-bridge (GH #464) and the ADR-191 sandboxed playground. Node hosting is `@sharpee/bootstrap`, the single story-loading implementation ADR-180 mandates — and the bridge hand-copied bootstrap's engine assembly, which is what ADR-180 forbids.

The one fact the repository did not record was Lantern's status. David supplied it: Lantern is dead.

## Decision

**D1 — Both packages are retired, not deleted.** `packages/bridge` and `packages/runtime` move to `packages/_archive/bridge` and `packages/_archive/runtime` by `git mv`, the way `packages/interpreter` was retired on 2026-08-13 (commit `a01ca3701`). `pnpm-workspace.yaml` already excludes `!packages/_archive/**`; it gains a comment naming this retirement beside the interpreter's.

**D2 — The shared surface goes with them.** `packages/sharpee/src/runtime-surface.ts` is deleted and the `"./runtime-surface"` entry leaves the umbrella's `exports`. Its header said only these two consumed it; nothing else did.

**D3 — ADR-135 stands as written and is annotated, not amended.** It gains a RETIRED block under Status pointing here. The historical mentions in ADR-342 (host inventory), ADR-344, ADR-345 and ADR-387 (Scope lines and as-built notes) are records of what was true when written and are not edited.

**D4 — A future out-of-process engine host is a thin transport over `@sharpee/bootstrap`, never a hand-copied engine assembly.** Bootstrap is the one story-loading implementation (ADR-180); a host that needs the engine in another process wraps bootstrap's `assembleGame` in its transport and adds nothing else. The retired bridge is not the base for that work — it predates ADR-180's rule and ADR-344's install seam, and reproduces both the hand assembly and the placeholder-player fabrication those decisions removed. The NDJSON-over-stdio idiom itself survives independently in PaneHost's lexer service and needs no package.

**D5 — The Sonar duplication exclusion for the two barrels is removed** (`sonar-project.properties`); the files it excused no longer exist in the scanned tree.

## Consequences

- `packages/` holds twenty-nine packages, not thirty-one; `docs/core-concepts/README.md` carries a one-line RETIRED entry in the interpreter's style.
- `pnpm-lock.yaml` drops both importers on the next `pnpm install`.
- GH #409 closes (answered: replaced) and GH #475 closes (the gate's silent-skip case no longer has a subject; the gate's own diagnosis of what it skips is not pursued here).
- Every future engine-contract change has two fewer hosts to carry. ADR-342's host inventory, read today, is bootstrap, platform-browser's `BrowserClient`, and the three devkit browser templates.
- Anyone reaching for a subprocess engine reads D4 first.

## Session

Session 72d34d, 2026-11-08, on `main`. Plan: `docs/work/retire-bridge-runtime/plan-20261108-retire-bridge-runtime.md`. The deep dive that produced the Context is in this session's summary.
