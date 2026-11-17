# Chord Writer as a web application — requirements and options

**Written**: 2026-09-13, session 5c6bba, on `main`. **Status**: a write-up for discussion. Nothing here is decided, planned, or spiked. It exists because David, on reading the OpenSilver evaluation's decision record, said the D2 "no web" ruling had been a capacity concern about a React shell rather than a shape principle, and asked to spike a pure web application and evaluate it against native and OpenSilver — and then, before any spike, to write up the options and list the requirements.

**What it builds on**: `brainstorm-20260813-web-chord-writer.md` beside this file (the browser-tier analysis, §1–11, still standing; §12's shell ranking superseded by ADR-341), the ADR-341 parity table (`docs/work/archive/adr-341-spike/parity-table.md`, the authoritative list of what Chord Writer *is*), and the OpenSilver evaluation (`docs/work/opensilver-ide-evaluation/`), whose parity column and host findings are the comparison a web spike would be held to. Every claim about the code below was checked today with the command shown; every claim about a browser or a service is dated and labelled.

**Four shapes are on the table after this**: native (Swift today; WPF as ruled for Windows), OpenSilver (native process and window, web-rendered XAML), a web application, and — added by David the same session — **Avalonia with Velopack** (cross-platform .NET XAML with its own Skia renderer, packaged and updated by Velopack). This document is mostly about the third, because "web application" can mean four quite different products; §3's O6 covers the fourth, which is not a web application at all but belongs in the same comparison.

---

## 1. Requirements — what Chord Writer needs from whatever hosts it

Each requirement is a thing the macOS app does today (row in the parity table), stated as what the operation needs from its host: a **folder** (a directory tree the author owns), a **process** (something that runs Node), a **bundler** (esbuild), the **network**, **persistent state**, or nothing beyond the page. The last column is whether the code that does it today is browser-clean — measured, not assumed.

```
grep -rn -E "import .* from '(node:)?(fs|path|child_process|os|worker_threads|url|module)'" \
  packages/branch-tester/src packages/chord/src packages/story-loader/src packages/platform-browser/src \
  --include='*.ts' | grep -v '\.test\.'
  → (no output)                                                          2026-09-13
```

| # | Requirement | Today (macOS app → devkit verb) | Needs from the host | Browser-clean today? |
|---|---|---|---|---|
| R1 | **Project files.** A story is a real folder the author picked (`~/Documents/<Story Title>/`, ADR-280 A1): `.story`, `.chord` imports, `<name>.config.json` sidecar (ADR-309), `assets/` (ADR-285), web template, `dist/` output. Open, list, read, write, rename, detect external change. | `Workspace/*.swift`, `Project/ProjectArtifacts.swift`; `NSOutlineView` over the folder | **folder** | n/a — this *is* the host question |
| R2 | **Editor.** Tabs, per-token Chord highlighting at typing speed, auto-indent, bracket matching, gutter, span selection from outside, undoable programmatic replace, word wrap. | `Editor/*.swift` over `NSTextView`; a Swift port of the Chord lexer | nothing beyond the page | CodeMirror 6 over `packages/chord/src/lexer.ts` is proven in a web view (OpenSilver Phase 3: 0.92 ms whole-document style pass, 1755 lines). Yes. |
| R3 | **Compose on edit.** `.story` + its `.chord` imports → Story IR + diagnostics with spans; 800 ms after the last keystroke; feeds Problems, the title, the Index. | `Compose/ComposeRunner.swift` → `sharpee compose --json` | reads across the **folder** (import resolution); no process needed | **Yes.** `@sharpee/chord` compiles in-page already (ADR-191 Mode A, the playground). The import resolver (`makeFsImportResolver` in devkit) is the one piece that reads files; it becomes a resolver over the folder handle. |
| R4 | **Build.** `browser-entry` bundled with the `@sharpee/*` platform ESM into `dist/web/<id>/game.js`; engine CSS and themes copied from `platform-browser`; devkit HTML templates; version stamp. | `Build/BuildRunner.swift` → `sharpee build` → `standalone/browser-core.ts` (`execFileSync` of the esbuild binary; `hatch-transpile.ts` for TypeScript hatches) | **process + bundler** today | **No.** `browser-core.ts:20-22` imports `node:fs`, `node:path`, `node:child_process`. In a browser the bundler is `esbuild-wasm` (~10 MB, contemplated by ADR-191 Mode B) over a virtual filesystem holding prebuilt platform ESM (the ADR-178 baseline set). **Or the requirement dissolves**: a web IDE does not need `dist/web/` to *play* (R5); it needs a bundle only to *publish* (R9). |
| R5 | **Play.** Run the story with the standard browser client, the story's own theme, restart, theme picker, runtime errors symbolicated back to source. | `Play/PlayViewController.swift` serving `dist/web/<id>/` over a custom scheme | a **served origin** for the bundle today | **Yes, and simpler.** In a browser the IDE is the browser: IR → `story-loader` → `platform-browser` in a sandboxed iframe, no bundle (brainstorm §5, ADR-191). |
| R6 | **Test.** The tree-of-cards Testing surface: replay a tree document at its pinned seed, edit assertions, write `<story-id>.tests.json` back, run the tree and stream results. | `TestingSurface/*.swift` hosting `tools/ide/web/testing-surface`; `Test/TestRunner.swift` → `sharpee test --tree --json` (NDJSON) | **folder** (the tests document) + **process** today | **Mostly yes.** The surface is already a web app. `@sharpee/branch-tester` — walker, tree document, auto-assertion, channel assertions — imports no Node builtin (grep above); devkit's `commands/test.ts` is the I/O shell. Running the tree in-page is a port of that shell, not of the logic. |
| R7 | **World index.** Reachability analysis over the IR; the Map, Reach, and Incomplete views. | `World/WorldIndexRunner.swift` → `sharpee world-index <ir.json>` → `@sharpee/world-index` | nothing beyond the page, once the IR is in hand | **Nearly.** The analysis takes IR; the package reads files at its edge (`packages/world-index/src/analyze.ts:24-25`, `story.ts:22` — `readFileSync`). A seam, not a port. |
| R8 | **Introspection / project manifest.** The `@sharpee/ide-protocol` manifest the IDE decodes. | `Project/IntrospectionRunner.swift` → `sharpee introspect` | reads the **folder** and `dist/` | The types are browser-clean (`ide-protocol` is types-only). The command is Node-bound; what it introspects needs checking against what a web IDE would hold in memory anyway. |
| R9 | **Publish.** A self-contained web zip — unzip, open `index.html`, it runs; itch.io-ready (ADR-284 D2). Web Template and Assets included. | `Publish/PublishController.swift` → `sharpee publish` (browser build + zip) | **bundler** (R4) + a place to put the zip | **Half.** The zip is `fflate`'s `zipSync` (`standalone/publish.ts:24`) — browser-clean. The build inside it is R4. Delivery is a download, or an upload to the author's cloud drive. |
| R10 | **Hatched TypeScript stories.** ADR-210 §5.6 hatches transpiled and bundled with the story. | `standalone/hatch-transpile.ts` (esbuild) | **bundler** | **No** — Node-bound today; in a browser it is `esbuild-wasm` or a tier boundary (brainstorm §6: "hatches need Chord Writer for Mac"). |
| R11 | **Documentation tab.** The bundled author docs corpus and search index, offline, Chord version passed in, external links to the real browser. | `Docs/*.swift` serving `tools/ide/web/docs-tab` | static assets | **Yes.** Already a web app; the corpus is a package-time artifact. |
| R12 | **Cloud files and sync.** Not a macOS feature — the author's own sync client does it (ADR-341 D6). A web app that cannot see a local folder inherits the requirement. | none | **network**, OAuth, a working copy, conflict handling | See §2. iCloud Drive has no third-party web API (brainstorm §4.1, still true as far as this writer knows — **verify**); Google Drive (`drive.file` scope) and OneDrive (Graph) do. |
| R13 | **Offline.** The macOS app has no network dependency at all. | n/a | a service worker and local storage | A PWA can be fully offline once loaded; the corpus and the platform bundles are static. |
| R14 | **Settings and session state.** Last project, open documents, active tab, pane geometry, appearance pin, font, reopen-last-story. | `UserDefaults` | **persistent state** | `localStorage`/IndexedDB; trivially. Cross-device is a cloud question. |
| R15 | **Updates and toolchain version.** Sparkle; the Chord version check against the toolchain's supported language version (ADR-257). | `Updates/*.swift`, `Compose/ChordVersionCheck.swift` | none | A web deploy *is* the update. The "toolchain" is the app's own bundle, so the version check is the app checking a story header against itself. The 165 MB vendored toolchain (brainstorm §12.3) does not exist in this shape. |
| R16 | **Media.** Images rendered, audio played, from the project's `assets/`. | native viewers over the folder | **folder** | Blob URLs from file handles; no `Range` problem (the OpenSilver Phase 4 §5d finding was Photino's, not the web's). |
| R17 | **Appearance.** ADR-297 dual palette, live flip, System/Light/Dark pin. | `Theme.swift` | none | CSS custom properties and `prefers-color-scheme`; the panes already do this. |
| R18 | **Second window.** Testing Play Surface as its own window. | a second `NSWindow` | none | `window.open` or a second tab sharing state through `BroadcastChannel`/OPFS. |
| R19 | **Isolation.** A running story must not reach the IDE. | separate `WKWebView` | none | Sandboxed `<iframe>`, as ADR-191 already does. |
| R20 | **Browser support.** Not a requirement today; becomes one. | n/a | — | See §2 — the File System Access API is the fork. |
| R21 | **Identity.** None today; a story is a folder. | none | — | None for a local-folder shape; OAuth for cloud; accounts for a hosted service. |

**The shape of the list.** Of 21 requirements, everything that is *logic* is browser-clean or a seam away (R2, R3, R5, R6, R7, R11, R13–R19). Three need a bundler (R4, R9, R10) and one of those (R4) dissolves for play and survives only for publish. The requirements that decide the product are **R1** (where the files live) and **R12/R20** (which browsers and which clouds). That is the same result the OpenSilver evaluation reached from the other side: the capability question is the folder, not the UI.

---

## 2. The one fact that forks the options — real folders in a browser

The File System Access API (`showDirectoryPicker`, writable `FileSystemDirectoryHandle`, handles persistable in IndexedDB) is what lets a page open the author's own `~/Documents/<Story Title>/` and write back into it. Support as of today, read from caniuse:

| Browser | `showDirectoryPicker` | Source |
|---|---|---|
| Chrome | supported, 105+ | caniuse.com/native-filesystem-api, 2026-09-13 |
| Edge | supported, 105+ | same |
| Safari (macOS, iOS) | **not supported**, through 26.6 | same |
| Firefox | **not supported**, through 155 | same |

Every browser has **OPFS** (the Origin Private File System — a fast, private, per-origin filesystem the user never sees in Finder). So the honest position is: **a pure web app can edit a real, author-owned folder in Chromium browsers only.** Everywhere else the project lives inside the browser's storage and reaches the author's world by export (a zip), by import, or by a cloud adapter. That is a direct trade against ADR-280 A1 — "the author picks the folder" — and it is the same loss the brainstorm named for the CloudKit fork (§4.1). It is not a detail.

A companion process (§3, O3) sidesteps the fork entirely, at the price of not being "pure".

---

## 3. Options — four products that all answer to "web app"

The comparison baseline for each: the macOS app as it ships, held to the parity table.

### O1 — Pure browser, local folders (File System Access API)

A static site. The author opens a folder; the page holds the directory handle, reads and writes the real files, composes and plays in-page, runs the test tree in-page, publishes by building with `esbuild-wasm` and downloading the zip. Nothing installed, nothing running locally but the browser.

- **R1**: real folder — **Chromium only.** Handle persisted in IndexedDB; the browser re-prompts for permission per session (a click on reopen). No change notification API — external edits are found by polling or on focus.
- **R4/R9/R10**: `esbuild-wasm` in a worker over a virtual FS of prebuilt platform ESM (the ADR-178 baseline, published as a versioned static asset the way ADR-191 Mode B sketches). About 10 MB of wasm, loaded lazily on first Publish. Hatches transpile the same way.
- **R12**: none needed — the author's own sync client syncs the real folder, exactly as on macOS. iCloud works *because* the folder is real.
- **R20**: Safari and Firefox authors get a degraded product: OPFS project, import/export zip, no folder. Or the site says "Chrome or Edge".
- **What it keeps**: ADR-280's model whole, ADR-284's artifact whole, no accounts, no backend, offline after first load.
- **What it costs**: the browser matrix; a bundler in the page; a build pipeline for "platform ESM as a static asset"; the editor rewrite (shared with every web shape and already half-proven).

### O2 — Pure browser, private storage plus cloud adapters

The brainstorm's §5 sketch. The project lives in OPFS as the working copy and syncs, debounced, to Google Drive (`drive.file`) or OneDrive (Graph). Works in every browser. No real local folder anywhere.

- **R1**: the author's folder is an app-managed tree in a cloud drive, or nothing (a zero-sign-in trial tier: open the site, write, play, never authenticate).
- **R12**: the whole product. OAuth for two providers, per-file round trips on open (a project is a tree), last-writer-wins unless conflict handling is built, no iCloud at all. Google's `drive.file` scope avoids the restricted-scope security assessment; a broad scope does not.
- **R20**: universal.
- **What it keeps**: reach — any browser, any OS, including iPad.
- **What it costs**: ADR-280 A1 is abandoned for this tier (the author never sees a folder); a real sync layer; two OAuth integrations to maintain; and a Mac author with Chord Writer already installed gains nothing and loses iCloud.

### O3 — Browser UI, local companion

The IDE is a web page; the engine is `@sharpee/devkit` running locally as a small server (`sharpee serve`, say), serving the page and answering file, compose, build, test, and publish requests over HTTP/WebSocket on `localhost`. The shape of Jupyter and code-server.

- **R1**: the real folder, in any browser, with real change notification. **R4/R9/R10**: the real esbuild, the real hatch transpile — the devkit code as it stands, no wasm, no virtual FS. **R12**: the author's sync client, as today.
- **What it keeps**: everything the macOS app does, with the existing devkit verbs as the backend and no port of the Node-bound code.
- **What it costs**: it is not "pure". The author installs Node and devkit (an `npm i -g @sharpee/devkit`, or a small installer that is — once again — a vendored Node, the 165 MB the brainstorm §12.3 measured, now per OS but without a native shell around it). Localhost security needs a per-session token so another tab cannot drive the author's filesystem. And the "no download" argument for a web app is gone.
- **Where it sits**: closer to Electron-without-Electron than to a website. Listed because it is the only web-UI shape that meets every requirement in §1 without exception, and because it is the natural *fallback* for O1/O2 authors who want hatches or a faster build.

### O4 — Hosted service

Projects live on a server; compose, build, test, and publish run there; the browser is a thin client. Accounts, storage, and hosting are the product's, not the author's.

- **R1/R12**: the server's filesystem; the author's "folder" is a workspace; export is a zip. **R4/R9/R10**: the real devkit on the server. **R20**: universal. **R21**: accounts, sessions, abuse handling, quotas.
- **What it keeps**: the strongest "open a link and write" story there is; collaboration becomes possible.
- **What it costs**: a backend to run, secure, back up, and pay for (David has a VPS; the archived multi-user server under `tools/_archive/zifmia` is the lineage, and it was retired). It is the shape least aligned with the culture the brainstorm §4.4 named — authors own their files — and with everything ADR-280 decided. This is a business decision before it is a technical one; it is not something a spike settles.

### O5 — TypeScript UI in a desktop shell (Electron, Tauri) — recorded for the comparison, not proposed

Not a web application; the brainstorm's §12 ranked these and ADR-341 D2 superseded the ranking. Listed so the three-way comparison does not silently omit the shape between "web app" and "OpenSilver": a TypeScript shell in Electron gets Node for free (the vendoring problem stops existing, §12.3) and every requirement above at native cost; Tauri does not bundle Node and inherits the vendoring on six targets. If O3's companion install is unacceptable and O1's browser matrix is unacceptable, this is where the pressure goes, and it should be named rather than rediscovered.

### O6 — Avalonia + Velopack (David, 2026-09-13) — not a web app; the fourth shape

**Avalonia** is XAML and C# on .NET with **its own renderer** (Skia): one codebase for Windows, macOS, Linux, iOS, Android, and the browser (WASM), drawing every control itself — no native controls, no web view for the chrome. It is WPF's idiom, not Silverlight's: `public override void Render(DrawingContext context)` with `DrawRectangle`, `FillRectangle`, `DrawEllipse`, redraw via `AffectsRender<T>` (docs.avaloniaui.net, "draw with a property", read 2026-09-13). **Velopack** is a cross-platform installer and auto-update framework: `Setup.exe` plus optional portable zip and delta `.nupkg` on Windows, a signed and notarized `.app` with an installer on macOS, `.AppImage` on Linux; releases hosted anywhere static files are served; Azure Trusted Signing supported on Windows by flag; Developer ID signing and `notarytool` notarization automatic on macOS when the identities and a notary profile are supplied (docs.velopack.io "packaging/overview" and "packaging/signing", read 2026-09-13).

Health, checked 2026-09-13 with `gh api`:

| Repository | Stars | Last push | Latest release | License |
|---|---|---|---|---|
| `AvaloniaUI/Avalonia` | 31,499 | 2026-09-12 | 12.1.2 (2026-09-02) | MIT |
| `AvaloniaUI/AvaloniaEdit` | 1,130 | 2026-08-28 | 11.4.1 (2026-02-05) | MIT |
| `velopack/velopack` | 2,327 | 2026-09-13 | 1.2.0 (2026-06-03) | MIT |
| `Avalonia.Controls.WebView` (NuGet) | — | 12.1.0 (2026-08-14) | — | MIT (nuspec) |

The commercial tier changed recently: "Avalonia Accelerate" is retired and folded into subscription tiers (Free MIT framework; Plus €299, Pro €899, Enterprise €6,999 per seat per year — avaloniaui.net/accelerate, read 2026-09-13). What Chord Writer needs is in the free tier: the framework, and the WebView package is MIT on NuGet. The Pro tier's Rich Text Editor, Tree Data Grid, and Markdown Viewer are not required.

**Where it sits against the other three.** It is the shape the OpenSilver decision record's counter-case named and did not evaluate: one codebase reaching every desktop OS **without** web rendering. Against the requirements:

- **R1, R3, R4, R6–R10, R15**: a plain .NET process — the same `System.Diagnostics.Process` and `System.IO` calls as WPF and OpenSilver; the vendored toolchain returns (Velopack packages it), the 165 MB with it.
- **R2 editor**: `AvaloniaEdit`, a port of the AvalonEdit the WPF spike passed with, MIT, pushed 2026-08-28 — but its last release predates Avalonia 12 by seven months, so the 12.x pairing needs checking. Or CodeMirror in the WebView, as OpenSilver did. Or a custom control, which David has said is acceptable.
- **R5, R6, R11 — the three web panes**: `Avalonia.Controls.WebView` (`NativeWebView`) wraps **WebView2 on Windows, WKWebView on macOS, WebKitGTK/WPE on Linux**; `InvokeScript`, `WebMessageReceived` via `invokeCSharpAction(body)`, and a `WebResourceRequested` event (docs.avaloniaui.net WebView reference). Whether that event lets the host **supply the response** — D3's contract — is **not documented**. The assembly carries `SetResponse`, `AddWebResourceRequestedFilter`, `SetVirtualHostNameToFolderMapping`, a `ResponseHandler`, and a `customScheme` string (`strings` over `lib/net10.0/Avalonia.Controls.WebView.dll`, 12.1.0), so the plumbing exists at least for the WebView2 backend. **This is O6's kill question**, the exact counterpart of OpenSilver's Phase 1 and of the WPF spike's assumption 2.
- **R17 appearance**: `ThemeVariant` (Light/Dark/System) with `{DynamicResource}` — ADR-297's flip is the WPF mechanism, cross-platform.
- **Menus**: `Menu` in-window, and `NativeMenu` for the macOS menu bar — the OpenSilver Phase 4 §5b gap does not exist here.
- **Custom drawing**: WPF's model (the deciding ground of D2) on every platform. The World map, the tab strip, and the ruler port as `Render` overrides, as they would to WPF.
- **Velopack and ADR-341 D7**: D7's open choice was MSIX-with-appinstaller versus a conventional installer plus an appcast updater. Velopack *is* the second option, cross-platform, with delta updates and Azure Trusted Signing (D7's signing ruling) by flag — and on macOS it would replace Sparkle. One caveat from its own docs: the App Sandbox entitlement is not supported; Chord Writer does not use it (it spawns Node), so this does not bite.

**What it costs.** A full rewrite of the macOS app as well as the Windows one — the "eventually macOS" question that OpenSilver deferred is here from day one, because the point of Avalonia is one codebase, and a Skia-rendered Mac app is not the AppKit app that ships today. Every control is Avalonia's own, so the app looks like itself on every OS rather than like each OS; for a mirror that already has its own chrome (ADR-297's palette, the tab strip, the title band) this is arguably the intent, but it is a product judgment, and the felt comparison applies to the whole shell, not just the editor. The web-pane kill question is open. AvaloniaEdit's release lag against Avalonia 12 is the dependency-health item to watch.

**What it keeps.** Everything native does — the drawing model, the real folder, the vendored toolchain's proven path — with one codebase and an update channel that answers D7 on three OSes at once.

### Hybrids that are probably the real candidates

- **O1 + O2 fallback**: real folders where the browser allows, OPFS elsewhere, cloud sync as an opt-in. One codebase; the storage adapter interface from brainstorm §5 with a `LocalFolderAdapter` added. This is what "pure web app" most plausibly means as a product.
- **O1/O2 + optional O3**: the pure tier for Chord-only stories; "install the companion" unlocks hatches, the real bundler, and any-browser real folders. The tier boundary the brainstorm §6 wanted, drawn at the install rather than at the platform.

---

## 4. Requirements against options

**●** met as the macOS app does it · **◐** met with a named change or degradation · **○** not met in this shape · **—** not applicable

| Req | O1 local folders | O2 OPFS + cloud | O3 companion | O4 hosted | O6 Avalonia + Velopack | macOS today |
|---|---|---|---|---|---|---|
| R1 real author-owned folder | ◐ Chromium only | ○ app-managed tree | ● | ○ workspace | ● | ● |
| R2 editor | ● (web editor, one lexer) | ● | ● | ● | ◐ AvaloniaEdit (release lags Avalonia 12) or a web editor | ● |
| R3 compose | ● in-page | ● | ● local or in-page | ● server | ● subprocess | ● |
| R4 build | ◐ esbuild-wasm, lazy | ◐ same | ● | ● | ● | ● |
| R5 play | ● in-page, no bundle | ● | ● | ● | ◐ `NativeWebView`; response supply unverified | ● |
| R6 test | ◐ in-page port of the runner shell | ◐ | ● | ● | ◐ same pane question | ● |
| R7 world index | ◐ seam at the file edge | ◐ | ● | ● | ● | ● |
| R8 manifest | ◐ | ◐ | ● | ● | ● (D5 C# target) | ● |
| R9 publish zip | ◐ download | ◐ download / cloud | ● | ● | ● | ● |
| R10 hatches | ◐ esbuild-wasm or tier boundary | ◐ | ● | ● | ● | ● |
| R11 docs | ● | ● | ● | ● | ◐ same pane question | ● |
| R12 cloud sync | ● author's client (real folder) | ◐ Drive/OneDrive built; no iCloud | ● author's client | — | ● author's client | ● author's client |
| R13 offline | ● PWA | ◐ working copy offline, sync later | ● | ○ | ● | ● |
| R14 settings | ● | ● (+ cross-device via cloud) | ● | ● | ● | ● |
| R15 updates / toolchain | ● deploy; no vendored toolchain | ● | ◐ companion updates; vendored Node returns | ● | ● Velopack, deltas, one channel; 165 MB toolchain | ● Sparkle; 165 MB toolchain |
| R16 media | ● | ● | ● | ● | ● | ● |
| R17 appearance | ● | ● | ● | ● | ● `ThemeVariant` + `DynamicResource` | ● |
| R18 second window | ● | ● | ● | ● | ● | ● |
| R19 isolation | ● | ● | ● | ● | ● | ● |
| R20 browser support | ◐ Chromium for folders | ● | ● | ● | — | — |
| R21 identity | ● none | ◐ OAuth | ● none | ○ accounts | ● none | ● none |
| **Install** | none | none | Node + devkit | none | Setup.exe / .app / AppImage, ~toolchain-sized | 187 MB app |
| **Backend** | none | none | none | required | none | none |
| **Data ownership** | author's folder | app's tree in author's cloud | author's folder | service's storage | author's folder | author's folder |
| **Rendering** | browser | browser | browser | browser | Skia (own controls) | AppKit |
| **macOS app** | stays or replaced later | same | same | same | **rewritten** | — |

---

## 5. What a spike would have to kill, per option

Ordered capability-first, as the OpenSilver plan was (its Phase 1 was "the kill phase"; the UI was judged only after the host could spawn, read, and vendor).

**O1 — the kill questions, in order**
1. Open `~/Documents/<Story Title>/` with `showDirectoryPicker`, persist the handle, reload the page, reacquire it with one click, write a file the Finder sees. If this is not smooth in Chrome and Edge, O1 is O2.
2. Compose fernhill in-page with a folder-backed import resolver; diagnostics with spans.
3. Play fernhill in-page from IR, no `dist/`.
4. Run fernhill's tree document in-page through `branch-tester`'s walker; write `fernhill.tests.json` back to the folder.
5. `esbuild-wasm` in a worker bundling `browser-entry` against prebuilt platform ESM; the zip opens and plays from `file://`. Measure wasm load time and bundle time.
6. Only then the shell: the same parity rows the OpenSilver spike built, judged the same way, with the editor's *felt* comparison this time.

**O2** — 1 becomes "OPFS as working copy, Drive `drive.file` round trip for a tree"; the rest is identical. The OAuth work is not a spike question; it is known cost.

**O3** — 1 becomes "a `sharpee serve` verb that serves the page and answers file/compose/build/test over localhost with a session token"; 2–5 are the existing devkit verbs and need no kill. The spike question is the install story, and that is a packaging question the toolchain work has already priced (brainstorm §12.3, GH #457).

**O4** — not a spike. A decision about running a service.

**O6 — the kill questions, in order** (the OpenSilver plan's Phases 1–4, re-run against a different host)
1. `NativeWebView` on macOS and Windows serving fernhill's `dist/web/fernhill/` and the two IDE panes from the app — a response supplied from `WebResourceRequested` or a custom scheme, `localStorage` surviving a restart, `WebMessageReceived` both ways, the Testing round trip. If the host cannot supply responses on both OSes, O6 fails D3 as evaluated and the fallback is a localhost origin with a session token.
2. Subprocess, folder, and vendored Node — expected to pass trivially (a .NET process), but recorded with the same nine tests, not assumed.
3. `AvaloniaEdit` against Avalonia 12 driven by the compiler's lexer (or tree-sitter through `TreeSitter.DotNet`, GH #440), the same 1755-line measurement.
4. The four custom surfaces as `Render` overrides; the ADR-297 flip through `ThemeVariant`; `NativeMenu` on macOS.
5. `vpk pack` on macOS with Developer ID identities and a notary profile, and on Windows with Azure Trusted Signing, carrying the vendored toolchain; install, update, delta.
6. Then the shell and the felt comparison — on the Mac, against the shipping app, because that is where O6's cost lands.

---

## 6. How the three-way comparison would be judged

The OpenSilver evaluation set the frame and a web spike should be held to the same one so the columns line up: the parity table's rows, a per-control table with PASS/partial/not built, host findings that are not rows, and dependency health dated. A web shape adds dimensions the other two did not have, and the decision record should carry them explicitly rather than let them hide in the rows:

| Dimension | Native (Swift / WPF) | OpenSilver on Photino | Web (O1/O2) | Avalonia + Velopack (O6) |
|---|---|---|---|---|
| Codebases to reach Win + mac + Linux | three (or two, Linux out of scope) | one | one, plus nothing to install | one |
| Author's files | real folder | real folder | real folder in Chromium; otherwise not | real folder |
| Toolchain shipped | 165 MB vendored Node per arch | same | none (esbuild-wasm ~10 MB, lazy) | same as native, packaged by Velopack |
| Install and update | app + Sparkle / installer + channel | same, minus a proven Windows path | a URL | Velopack: Setup.exe, notarized .app, AppImage; deltas; one channel for all |
| Rendering | native | DOM in a web view | DOM in the browser | Skia, the app's own controls on every OS |
| Drawing model | `drawRect:` / `OnRender` | retained elements | DOM | `Render(DrawingContext)` — WPF's |
| Editor | native control, hand-written lexer or tree-sitter | web editor over the compiler's lexer | same as OpenSilver | AvaloniaEdit (AvalonEdit port) or a web editor in the pane |
| Web panes | WKWebView / WebView2 per pane | iframes in one page | the page itself | `NativeWebView` per pane (WebView2 / WKWebView / WebKitGTK); response supply unverified |
| Offline | always | always | after first load (PWA) | always |
| Browser matrix | — | — | a product decision | — |
| Hatched stories | full | full | wasm transpile or a tier boundary | full |
| macOS app | stays | stays until parity, then a felt call | a third product, or replaces | **rewritten from day one** — the point is one codebase |
| Where the deciding risk sits | second codebase forever | thin host, unproven on Windows | folder access outside Chromium; "web app" expectations | pane hosting contract unverified; a Skia-rendered Mac app replacing an AppKit one |

---

## 7. Questions this write-up cannot answer — David's

Not a menu; the things a spike plan needs settled or explicitly left open before it is written.

1. **Which "pure"?** Does a local companion (O3) count as a web app for this comparison, or is the candidate strictly O1/O2 — nothing installed?
2. **Browser matrix.** Is "real folders in Chrome and Edge; private storage elsewhere" an acceptable product, or must Safari authors have the same product as Chrome authors?
3. **ADR-280 A1.** For a web tier, may the project live somewhere the author cannot see in Finder (OPFS, a cloud tree), or is the real folder non-negotiable everywhere?
4. **Hatches.** `esbuild-wasm` in the page, or "hatches need the desktop app"?
5. **iCloud.** Confirm the brainstorm's §4.1 finding (no third-party web API) before anything in O2 is planned; it was flagged as the first thing to verify on 2026-08-13 and has not been.
6. **Relation to the macOS app.** Is the web app a third product beside a native Mac app and a native Windows app, or the thing that eventually replaces both — the same question the OpenSilver record deferred to a felt comparison? For O6 the question is not deferrable: Avalonia's value is one codebase, which means the Mac app is rewritten too.
7. **Which spike first.** O1 (web) and O6 (Avalonia) each have a kill list in §5 and each can be scoped like the OpenSilver plan. They answer different questions — "can a browser be the IDE" and "can one native-rendered codebase be the IDE everywhere" — and one session can run one of them properly.

When these have answers, the spike plan is the chosen kill list in §5, scoped like the OpenSilver plan, with a parity column and a decision record as its deliverables — and the ADR question returns as a four-way decision with every column filled.
