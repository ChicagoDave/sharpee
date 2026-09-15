# Phase 2 — Compose and Play in-page: the pane collapse

**Plan**: `docs/work/web-ide-evaluation/plan.md`
**Run**: 2026-09-15, session 3b49f8, macOS 26.6.2, Edge 153.0.4234.32
**Spike code**: `/Users/david/repos/spikes/web-ide/src/{compose,play}.ts`, `build.mjs`, `app/{compose,play}.html` (outside this repository)
**Evidence in repo**: `evidence/phase-2/` — seven JSON files, each posted by the page itself

**Verdict: PASS on all three deliverables, unattended.** fernhill composes in the page with the real compiler, plays in a sandboxed iframe from the IR alone with no bundle built and nothing served, and the editor over the real lexer is **the fastest of the four shapes measured**. Two platform findings came out of it (§6), one of them a genuine seam between the compiler's API and a browser host.

No clicks were needed: Phase 1's persistent grant let the page reacquire the folder handle silently (`permissionWithoutPrompting: "granted"`), which is the first practical dividend of that result.

## 1. Compose in-page — PASS

`@sharpee/chord`'s `compile()` called directly in the page, on fernhill's real `.story` read through the Phase 1 `FileSystemDirectoryHandle`. No subprocess, no `sharpee compose`, no host of any kind:

```json
"sourceChars": 30509, "ok": true, "composeMs": 11.8,
"diagnosticCount": 0, "errorCount": 0,
"irTitle": "The Folly at Fernhill", "irId": "fernhill",
"hasHatches": false, "irBytes": 114170
```

**11.8 ms, gate-clean, 114 KB of IR.** For comparison the other three shapes all shelled out to `sharpee compose --json` — the OpenSilver spike measured 89 ms for the subprocess round trip on this same story. In-page compose is not merely possible; it is an order of magnitude cheaper, because there is no process to start.

## 2. The import resolver — PASS, and a real seam

fernhill declares **no** imports, so it cannot exercise the resolver. A two-file probe was written into the spike fixture (`spike-import-probe.story` + `spike-fragment.chord`) for that purpose only:

```json
"importsFound": ["spike-fragment.chord"], "importsResolved": 1, "ok": true, "errorCount": 0,
"entitiesInIR": ["Fragment Room", "Entry Hall", "Walker"], "fragmentRoomPresent": true
```

The fragment's room is **first** in the IR's entity list — spliced at the import site, which is ADR-251 D4's "an import is a paste" behaving exactly as specified, through a resolver backed by the browser's folder handle.

**The seam, and it is worth stating plainly: `CompileOptions.importResolver` is synchronous, and every browser filesystem API is asynchronous.** devkit's `makeFsImportResolver` can read lazily inside the callback because `fs.readFileSync` exists; a browser host cannot. It must walk the import graph itself — scanning for `import "…"`, resolving each path, recursing into fragments — and hand `compile()` a fully-populated map. This spike does that in `preloadImports()`, about 25 lines.

That is not a blocker and the workaround is small, but it is precisely the kind of platform/language seam `docs/core-concepts` names as the thing to notice: a capability the compiler offers in a shape only a Node host can consume. A host-neutral shape would be an async resolver, or a compile entry that accepts a pre-resolved fragment map explicitly rather than by convention. **Recorded for the decision record; not a change this plan makes** (platform changes require discussion first).

An earlier version of the probe had Chord syntax errors of my own making, and the failure is worth noting because of what it proved incidentally: the diagnostics came back stamped `[spike-fragment.chord]` with **fragment-relative line numbers**, so the fragment really was read through the handle and really was spliced — the resolver was proven by its error path before it was proven by its success path.

## 3. Play in-page — PASS, and D3's contract is void here

The composed IR is handed to a **sandboxed iframe** over `postMessage`; the frame calls `createStory(ir)` and boots a fresh world. No `dist/web/<id>/` was built, nothing was served for it, and no bundle for fernhill exists in this run:

```json
"type": "playing", "title": "The Folly at Fernhill",
"entityCount": 66, "playerLocation": "r01",
"bundleBuilt": false, "servedFrom": "none — IR passed by postMessage",
"sandbox": "allow-scripts allow-same-origin"
```

Then a typed turn, driven into the real client's command input:

```json
"command": "look", "transcriptChars": 352,
"tail": "The Folly at Fernhill … Iron Gates … The cab is already grinding away down the
         lane, its lamps swallowed by the dark. An auction notice is nailed to the
         left-hand gate … FERNHILL HOUSE AND GROUNDS, BY ORDER OF THE ESTATE, AT DAWN."
```

That is fernhill's own opening prose, rendered by the real `platform-browser` client from a world built out of an IR that was compiled seconds earlier in the parent document. The options doc's claim that **play needs no build step in this shape** is confirmed.

### The pane collapse — stated explicitly, as the plan requires

The single largest finding in *both* prior evaluations was about the host contract for web panes. **None of it applies here, and it is important that the parity table records "void" rather than "passed".**

- **ADR-341 D3's host contract** — "serve pane files, serve the story's own bundle, answer subprocess-result requests" — has no host to be a contract with. The IDE page and the pane are the same document; the Play surface is an iframe in the same origin, reached by `postMessage` and nothing else.
- **The response-supply question** that killed O6's preferred mechanism (`WebResourceRequested` is observation-only on macOS; no scheme handler is bound) **does not arise**. There is no web view to supply responses to.
- **The `window.webkit.messageHandlers` counterfeiting** that both prior hosts needed — the OpenSilver shim, the Avalonia shim with its `strategy: "assign"` — **does not arise**. There is no native host to impersonate, because the client already runs in a browser, which is what it was written for.
- **Custom schemes, loopback origins, token scoping, `Range` support** — all moot. The page's own origin serves everything.

This is the one dimension on which the pure-web shape is structurally simpler than every alternative rather than merely different. It should be read as such and not as three rows quietly passing.

What replaces it is a smaller question this phase did not need to answer: what the sandbox attributes should be for a *story's* untrusted content. This run used `allow-scripts allow-same-origin`, which is sufficient for the client and is **not** a security posture anyone has reviewed.

## 4. The editor — PASS, and the fastest of the four shapes

Measured on **both** files, because a number from a different file is not a comparison. `measure-1755.story` is the exact file the WPF, OpenSilver and Avalonia spikes measured, and it reports the same **8,545 tokens** here, which confirms the same lexer reading the same bytes. CodeMirror resolves from the repo's own `website` workspace — the same build the OpenSilver spike bundled — deliberately, so the comparison is of hosts and not of editor versions.

| Shape | Style pass, whole document | Per typed character |
|---|---|---|
| WPF + tree-sitter | 14.8–15.9 ms | — |
| Avalonia + AvaloniaEdit (real lexer over NDJSON) | 7.96 ms | 7.41 ms |
| OpenSilver + CodeMirror in an iframe | 0.92 ms | 1.09 ms |
| **Pure web + CodeMirror in the page** | **0.82 ms** (median; min 0.73, p90 0.95) | **0.83 ms** |

On fernhill itself (1,180 lines, 5,279 tokens): 0.52 ms and 0.55 ms.

The undo round trip the other spikes asserted holds here too — one programmatic replace of line 2, one `undo()`, and the document hashes identical before and after (`4eb5b75a` on the measurement file, `561c4634` on fernhill), asserted on the text rather than on `undo()`'s return value.

**Why it is faster than OpenSilver's CodeMirror, which is the same editor over the same lexer:** that one ran inside an `HtmlPresenter` iframe hosted by a XAML application in a WKWebView. This one runs in the page. The ~0.1 ms is the host tax, and this shape has none.

**One flaw in this harness, self-corrected and recorded** because the first number was wrong: the initial run "verified" undo by calling it 200 times after a 200-character burst, which ran past the typing and into the document *load* transaction, emptying the editor and reporting `restored: false` with a length of 0. The load is not an edit. The corrected assertion is a single replace and a single undo against a hash.

## 5. What the bundles cost

| Bundle | Size | Contents |
|---|---|---|
| `compose.js` | **1.33 MB** | CodeMirror 6 + the Chord compiler (56 modules) |
| `play.js` | **3.31 MB** | the whole runtime — 19 `@sharpee/*` packages: engine, world-model, stdlib, parser-en-us, lang-en-us, platform-browser, story-loader, channel-service, event-processor, plugins, plugin-scheduler, plugin-state-machine, character, extensions, core, if-domain, if-services, text-blocks, chord |

Unminified, no code splitting, no compression — so these are ceilings, not shipping numbers, and gzip alone typically takes a bundle of this shape to roughly a third. But **4.6 MB of JavaScript is the first-load cost of the shape whose install story is "a URL"**, and that tension belongs in the decision record rather than in a footnote. Phase 6's service worker is what makes it a first-load cost rather than an every-load one; Phase 5 will add `esbuild-wasm` on top for publishing.

The fact worth putting beside it: **all 19 runtime packages bundled for the browser without a single import failing.** The options doc's "browser-clean" grep is confirmed by a real bundle, not by a search — with one exception, next.

## 6. Two platform findings

**The platform runtime is not browser-clean on its own — it needs three build-time defines.** The first run of this phase bundled cleanly, booted, and then printed into the player pane:

```
[Startup Error: ReferenceError: process is not defined]
```

The cause is that devkit's browser build injects `--define:process.env.NODE_ENV="production"`, `--define:process.env.PARSER_DEBUG=undefined` and `--define:process.env.DEBUG_PRONOUNS=undefined` (`packages/devkit/src/standalone/browser-core.ts:747-749`). Any other browser host must know to replicate them. The failure mode is poor: the bundle builds with no warning, the world constructs (66 entities, the player placed), and the error only surfaces as a startup message inside the client. A host author who did not already know to look at `browser-core.ts` would be debugging their own code.

**`File`/`Text` length counts are UTF-16 units, not bytes** — carried forward from Phase 1 §6 and visible again here: this phase reports fernhill as 30,509 characters where the file is 30,559 bytes.

## 7. What this phase does not establish

- **The test tree.** Phase 3 — the ADR-307 round trip in-page, with `branch-tester`'s real walker.
- **Anything about OPFS.** Every read in this phase went through the folder handle. The O2 route is Phase 4, and Phases 2–3's call sites are supposed to work identically over it — untested so far.
- **Any build or publish path.** No `esbuild-wasm`, no zip, no hatch. Phase 5.
- **Offline, appearance, project pane, second window, settings.** Phase 6.
- **Safari and Firefox.** Everything here ran in Edge, because the folder handle is Edge-only. Compose, play and the editor have no obvious reason to differ, but "no obvious reason" is not a measurement, and Phase 4 is where they get exercised against OPFS.
- **A reviewed sandbox posture** for untrusted story content (§3).
- **Minified or split bundle sizes** (§5).
- **Diagnostics rendered against the editor.** Compose returned zero diagnostics for fernhill, so the display path — spans mapped to CodeMirror positions, squiggles — was never exercised on a real error. The probe story's error path was exercised in JSON only.
