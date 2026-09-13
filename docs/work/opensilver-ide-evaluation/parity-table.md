# OpenSilver parity column — the ADR-341 table with a third column filled

**Written**: 2026-09-13, session 5c6bba (evaluation plan Phase 5). The rows are `docs/work/archive/adr-341-spike/parity-table.md` (2026-09-08, session 4a2d5f) unchanged: same features, same sources, same macOS implementation files, same Spike? flags. Nothing is added to the product surface. Two columns are dropped as noise here (the seeded "Windows: not built" column and the "Why, or what to build" column) and one is added: **OpenSilver**, filled from the Phase 0–4 records in this directory (`phase-0-prerequisites.md` … `phase-4-shell-and-appearance.md`) and their evidence under `evidence/`. Where a cell says PASS the phase record carries the command and output that earned it; where it says "not built" nothing was attempted and the cell is a cost estimate, not a result.

**Host**: `OpenSilver.Photino` 3.3.3 on .NET 10.0.300, macOS 26 (Apple Silicon) — a native .NET process and a native AppKit window whose XAML renders as DOM inside a `WKWebView`. Windows (WebView2 under Photino) is Phase 6 and has not run; every cell below is macOS evidence about a cross-platform host. The spike is at `/Users/david/repos/spikes/opensilver-ide/` (2,566 lines of C#/XAML in `Hello/{Hosting,Shell,Theme}`, `MainPage.xaml(.cs)`; a CodeMirror page in `editor/`).

**Fresh check at write time**: `dotnet test Hello.Host.Tests/Hello.Host.Tests.csproj` → `Passed! - Failed: 0, Passed: 15, Skipped: 0, Total: 15, Duration: 2 s` (2026-09-13 16:13 CDT). Nine tests drive the real `sharpee` shim, the real vendored Node, and the real Documents folder; six drive `PaneServer` against fernhill's real bundle and the IDE's real pane assets. No stubs.

**Cell vocabulary**: **PASS** — built and proven with inline evidence; **built** — works, screenshot or log, no separate measurement; **partial** — built with a named gap; **not built** — not attempted, with the expected cost; **same as WPF** — a plumbing or logic row where OpenSilver on Photino uses the identical .NET call (Phase 1 proved `System.Diagnostics.Process` and `System.IO` behave as ordinary calls).

## App shell and chrome

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Main window: four-pane horizontal split over a bottom-docked panel, status bar footer, divider positions remembered | ADR-154; SessionState | `MainWindow.swift` | **YES** | **partial** — built in `MainPage.xaml`: rail, project pane (220), editor, right panel (440), bottom panel (220, hidden by default), 22 px status bar, 1400×900. `GridSplitter` lives in `OpenSilver.Controls`, not the core assembly. Dividers drag correctly only after the iframe pointer-events guard (Phase 4 §5a); positions are **not persisted**. |
| Story title centered in the title bar band; transparent titlebar with traffic lights floating over the band | macOS 26 workaround | `UI/StoryTitleBarViewController.swift`, `UI/WindowTitle.swift` | **YES** | **built, different shape** — a 28 px in-content chrome band under Photino's native title bar carries the title; Photino exposes no title-bar customisation API, so no transparent-titlebar equivalent was tried. |
| Dual-palette dynamic theme tokens, every surface re-resolving on appearance change | ADR-297 D1 | `Theme.swift`, `UI/ThemedPane.swift` | **YES** | **PASS** — 18 tokens as one `SolidColorBrush` each; `Apply()` mutates `Color`; DOM rail `rgb(220,224,232)` → `rgb(22,23,29)` with no rebuild, 0.9 ms (`evidence/phase-4-theme-log.txt`). The editor pane flips with it. |
| Appearance follows system by default, pinnable System / Light / Dark, persisted, applied before the window builds | ADR-297 D2, D3 | `UI/AppearancePreference.swift`, `Menus/MenuBuilder.swift` | **YES** | **partial** — System/Light/Dark as a View › Appearance radio and band buttons; System tracks `matchMedia('(prefers-color-scheme: dark)')` live (wired, not exercised by the auto run). **Not persisted.** |
| Reusable tab strip (left-aligned text tabs, accent top bar, count badges) used by both panels | mock-bottom-panel | `UI/TabStripView.swift` | **YES** | **PASS** — `Shell/TabStrip.cs`, 150 lines: same metrics and colours; badges; `FitToWidth` truncation when tabs outgrow the strip. Retained elements, not drawn (§ drawing model, `decision.md`). |
| Font preference: family and size, live re-render | David's ruling | `UI/FontPreference.swift`, View › Font menu | no | **not built** — menu heading present, unwired. A CSS-variable swap in the editor page plus a brush/font token in XAML; small. |
| Menu bar: File, Edit, View, Build, Test, Window, app menu with About, Settings, Check for Updates | `MenuBuilder.swift` | `Menus/MenuBuilder.swift` | no | **built, at a cost the table did not predict** — OpenSilver 3.3.3 ships **no `Menu` control** and Photino exposes no native menu, so `Shell/MenuBar.cs` is Popups of rows in the chrome band, OS-agnostic, mirroring `MenuBuilder.swift`'s structure; ⌘/Ctrl shortcuts reach it from the XAML page and from inside every pane. Keyboard navigation inside menus not built. |
| Word Wrap toggle (View) | editor | `Editor/EditorViewController.swift:867` | no | **PASS** — a `lineWrapping` compartment reconfigured live (Phase 3). |

## Launch

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Landing page: recents, Open / Create Story / Close | ADR-280 | `Launch/*.swift` | no | **not built** — standard controls; the shell opens fernhill directly. |
| Create Story sheet: title and location | ADR-280 D2 A1, D4 | `Launch/CreateStoryViewController.swift`, `Workspace/StoryScaffold.swift` | no | **not built** — standard controls plus a `sharpee` subprocess (same as WPF). |
| Reopen last story on launch (Settings) | David 2026-08-09 | `Settings/ReopenLastStoryPreference.swift` | no | **not built** — a settings file; same as WPF. |
| Story location mirror | ADR-280 A1 | `Launch/StoryLocationMirror.swift` | no | **not built** — pure model; same as WPF. |

## Project pane

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Typed artifact tree: Story, Walkthroughs, Assets, Web Template, Other as lenses over the real folder | ADR-280 D1 | `Project/ProjectTreeViewController.swift` (NSOutlineView), `Project/ProjectArtifacts.swift` | **YES** | **partial** — `Shell/ProjectPane.cs`, 90 lines: the five typed groups over fernhill's real folder, Assets recursed, single click selects and double click opens (matching `:172`'s `doubleAction`). Built as a grouped list, **not an outline view**: no expand/collapse, no keyboard navigation. OpenSilver has a `TreeView`; not used. |
| Project Pane toggle (View) | shell | `Menus/MenuBuilder.swift` | no | **built** — rail button and View menu item. |
| Assets group (folder lens only on macOS) | ADR-285 | `Project/ProjectArtifacts.swift:32-84` | no | **built** — folder lens, recursed; images open in a viewer, audio in a player (Phase 4 §5c). |
| Project manifest (introspection result) | ADR-184 | `Project/ProjectManifest.swift`, `Project/IntrospectionRunner.swift` | no | **not built** — ADR-341 D5's C# generator target is needed under OpenSilver exactly as under WPF. |

## Editor pane

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Code editor: open in tabs, switch, close, save, save all, reload from disk, unsaved-change tracking, text replacement through the undo stack | ADR-154; ADR-321 A3 | `Editor/EditorViewController.swift`, `Editor/Document.swift` | **YES** | **measured PASS; not native** — CodeMirror 6 in an `HtmlPresenter` iframe over `sharpee-editor://`. 200 single-character edits at the end of a 1755-line, 52 KB story: 1.09 ms per character including the whole-document style pass (`evidence/phase-3-editor-log.txt`). Tabs, switch (buffer pulled before load), close, dirty dot, ⌘S to the live mirror, programmatic `replace` then `undo` restoring the exact pre-edit hash: all proven. **Save all and reload from disk not built.** This is a hosted web editor, which ADR-341 D4 ("two native editors") rules out — see `decision.md` §3. The felt judgment (typing, cursor, focus between chrome and iframe) is David's and open (Phase 3 §6). |
| Syntax highlighting from the in-process Chord lexer | ADR-258 D7; ADR-182 pending | `Editor/ChordLexer.swift`, `Editor/SyntaxHighlighter.swift` | **YES** | **PASS** — the **compiler's own lexer**, `packages/chord/src/lexer.ts`, bundled into the page: 8,545 tokens on the measurement file, whole-document re-style **0.92 ms per pass** (50 passes). No second hand-written lexer exists in this shell; AC-5's intent ("no hand-written Chord lexer in the Windows directory") is met by reuse rather than by tree-sitter. Tree-sitter itself untested — no Chord grammar exists (ADR-182 unimplemented) and the applicable binding would be `web-tree-sitter`, not `TreeSitter.DotNet`. |
| Auto-indent and bracket matching | editor | `Editor/AutoIndenter.swift`, `Editor/BracketMatcher.swift` | **YES** | **partial** — `bracketMatching()` installed (not exercised by the auto run); CodeMirror's default keeps indentation on Enter; **no Chord-aware indent rule** built. |
| Line-number ruler | editor | `Editor/LineNumberRulerView.swift` | **YES** | **PASS** — `lineNumbers()` with active-line gutter; per visual line, so it follows wrap. |
| Tab bar above the editor (cells with close buttons) | editor | `Editor/TabBarView.swift` | **YES** | **PASS** — `Shell/EditorTabBar.cs`, 90 lines: bold-when-active, `×` close, separators, 6 px dirty dot. Multiple documents open at once (Phase 4 §5c). |
| Diagnostics in the editor: open at a span, navigate to a span, per-file diagnostic records | ADR-258 D5 | `Editor/EditorViewController.swift:395-433`, `Compose/ComposeDiagnostics.swift`, `Compose/SpanText.swift` | **YES** | **partial** — `select` from C# scrolls to and selects an authored span (897:8–897:30 → `"phrase out-of-the-wind"`); Index and World rows navigate this way. **Inline diagnostic decoration (squiggles) not built.** |
| Word wrap | View menu | `Editor/EditorViewController.swift:867` | **YES** | **PASS** — live; the gutter follows. |
| New Import… and Extract Selection to Import… | GH #288 | `Editor/ImportCommands.swift`, `Editor/ImportRefactor.swift` | no | **not built** — menu items present, unwired; pure logic plus a name sheet. |
| Import commands' story-rooted path rules | Chord language facts | `Editor/ImportRefactor.swift` | no | **not built** — logic. |

## Right panel tabs

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Right panel: tab strip over eight panes; a build switches to Build, play-after-build switches to Play | David's ruling | `Play/RightPanelViewController.swift` | **YES** | **partial** — all eight tabs fit at 440 px (truncated titles); panes load lazily on first selection; a build switches to Build (after the `SynchronizationContext` fix, Phase 4 §5d). **Play-after-build not built.** |
| **Build** tab: streamed build output, scrolled to the tail; build report appended | ADR-258 D5; StoryIndex | `Build/BuildPanelView.swift`, `Build/BuildController.swift` | no | **PASS** — 106 lines streamed with distinct arrival timestamps (Phase 1), shown on the first build after routing UI writes through `Dispatcher.BeginInvoke` (`evidence/phase-4-shell-light-build-tab.png`). Build report not appended. |
| **Play** tab: header (status dot, Restart, theme picker, Play-after-build) over a web view serving `dist/web/<id>/` on a custom scheme | ADR-252 D2; Phase 6b | `Play/PlayViewController.swift`, `Play/PlayURLSchemeHandler.swift`, … | **YES** | **PASS on hosting, header not built** — fernhill's bundle served unmodified over `sharpee-play://` through Photino's `RegisterCustomSchemeHandler`; the client booted, rendered 9 `[data-turn]` anchors, accepted a typed `look` (`evidence/phase-2-pane-log.txt`); 61 pane requests, all 200. The story's own retro theme renders (`evidence/phase-4-shell-light-play.png`). No status dot, Restart, or theme picker. |
| Play runtime errors symbolicated and forwarded to Diagnosis and Game Errors | Play | `Play/PlayErrorSymbolicator.swift`, `Play/SourceMap.swift` | no | **not built** — the page→host message bridge it depends on is proven (Phase 2 §1). |
| **Testing** tab: the testing surface with the tree-of-cards UI injected; whole document posted back and written; replay at the pinned seed | ADR-307; ADR-306 | `TestingSurface/TestingSurfaceViewController.swift`, `TestingSurface/TestingSessionStore.swift` | **YES** | **PASS** — full ADR-307 round trip: 31 cards in, replay through the real client (31 turn records), one typed turn, 32-card document out (21,412 chars) written by the host (`evidence/phase-2-fernhill.tests.written.json`); Run relays `sharpee test --tree --capture-output --capture-world --json` line by line and `opening-iron-gates PASS` renders green (`evidence/phase-4-shell-dark-test-run.png`). Written to the spike's mirror, never to fernhill. |
| Testing Play Surface window (View menu) | ADR-306 | `Menus/MenuBuilder.swift` | no | **wired, unverified** — the menu item is wired (Phase 4 §5b); a second Photino window was not screenshot-verified. |
| **Index** tab: headline stats, section tabs, span-navigable lists, stale-marked with the IR | David's ruling | `Play/IndexView.swift`, `Compose/StoryIndex.swift` | no | **PASS** — `Shell/IndexView.cs`: "13 rooms · 2 regions · 46 things · 4 people · 3 actions · 56 phrases" for fernhill, `StoryIndex.sections(of:)` rules mirrored, rows select their span in the editor, stale dimming plus "last good compile" banner on edit (`evidence/phase-4-shell-{dark,light}-index.png`). |
| **Diagnosis** tab | GH #296 | `Play/ErrorDiagnosisView.swift` | no | **not built** — placeholder. Text and a clickable list. |
| **Documentation** tab: web view over the bundled docs on `sharpee-docs://`, Chord version passed in, external links to the browser, no network | ADR-281 D3 | `Docs/DocsTabViewController.swift`, `Docs/DocsTabSchemeHandler.swift` | **YES** | **PASS on hosting** — corpus served over `sharpee-docs://`: `{"type":"loaded","title":"Sharpee — Documentation","navLinks":106,"version":"Chord 3.6.0"}`, `docs-index.json` 263,344 bytes (`evidence/phase-2-docs-pane.png`). **External-link interception not verified.** |
| **Publish** tab | ADR-284 D1, D2 | `Publish/PublishView.swift`, `Publish/PublishController.swift` | no | **not built** — placeholder. Standard controls plus a subprocess (same as WPF). |
| **World** tab: section strip over Map, Reach, Incomplete, and the no-analysis explanation | ADR-321 D8 | `World/WorldView.swift`, `World/WorldIndexRunner.swift` | no | **built** — `Shell/WorldView.cs` with the same strip; fed at tab-open by the real `sharpee compose … -o` then `sharpee world-index` (`evidence/phase-4-shell-dark-world-sections.png`). |
| World › Map: rooms on the compass grid, one band per level, connections, solver notes | ADR-321 D7 | `World/WorldMapView.swift` (custom drawing) | **YES** | **PASS, retained** — `Shell/WorldMapView.cs`, 170 lines: `layoutBoxes` transliterated line for line; `Canvas` of `Rectangle`/`Line`/`TextBlock`, dashed doors, accent start room, dashed-mauve displaced rooms, ▲▼ level chevrons (`evidence/phase-4-shell-dark-world.png`). Not drawn — composed; see `decision.md` §2. |
| World › Reach: headline over a sectioned findings list | ADR-321 D4, D13 | `World/WorldReachView.swift`, `World/WorldFindingTable.swift` | no | **built** — "Play reaches 13 of 13 rooms · 0 findings · 3 gates lifted" over sections shown only when non-empty. |
| World › Incomplete: candidate cards with per-word fix buttons, declare, ignore; edits through the undoable path; ignore store | ADR-321 D5, D6, A3 | `World/WorldIncompleteView.swift`, `World/WorldSourceEdit.swift`, `World/WorldIgnoreStore.swift` | no | **partial** — candidates banded by kind (Missing word 30 · Ambiguous 15 · No object 118 for fernhill), rows span-navigable, capped at 60 per band. **Fix buttons, declare, ignore, and the ignore store not built**; the undoable-replace primitive they need is proven (Phase 3). |

## Bottom panel

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Bottom panel: tab strip over Problems and Game Errors, hidden by default, toggled from the rail | David's ruling | `Build/BottomPanelViewController.swift` | no | **built** — Problems · Game Errors · Log (the spike's own log tab), hidden by default, rail toggle. |
| Problems: structured compose diagnostics with severity dot, code, message, file:line; click opens the span; status line on pipeline failure | ADR-258 D5 | `Compose/ProblemsView.swift`, `Compose/ComposeScheduler.swift` | no | **partial** — fed by compose on edit with a count badge (0 for fernhill, so the row rendering is unexercised). **Click-to-span not verified; pipeline-failure status line not built.** |
| Game Errors: symbolicated Play runtime errors, expandable rows | Play | `Build/GameErrorsView.swift` | no | **not built** — placeholder. |

## Build, test, and compose plumbing

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Build and Cancel Build; Build Settings sheet, persisted per project | ADR-154 | `Build/BuildRunner.swift`, `Build/BuildController.swift`, `Build/BuildSettings*.swift` | no | **partial** — Build PASS (⌘B and menu, streamed). Cancel is proven at the primitive (`Cancellation_kills_the_process_and_throws`, `Kill(entireProcessTree: true)`) but **not wired to a menu item**; **settings sheet not built**. Same `System.Diagnostics.Process` as WPF. |
| Shell environment for subprocesses (PATH, the bundled toolchain) | vendor-toolchain | `Build/ShellEnvironment.swift`, `Compose/BundledToolchain.swift` | no | **PASS** — the real `vendor-toolchain.sh` output (175 MB) resolved beside the executable via `AppContext.BaseDirectory`; vendored Node `v22.23.1` runs (Phase 1). **Windows needs its own launcher**: the shim is a POSIX script (Phase 1 §6) — true for WPF too. |
| Compose on edit: `sharpee compose --json`, scheduled, diagnostics decoded, IR retained | ADR-258 | `Compose/ComposeRunner.swift`, `Compose/ComposeScheduler.swift`, `Compose/IRTreeState.swift` | no | **PASS** — 800 ms after the last edit, through a scratch mirror of the story folder; Problems, title, and Index update from the result (Phase 4 §5b). `compose --json` exit 0 in 89 ms, gate-clean IR (Phase 1). |
| Chord version check against the toolchain's supported language version | ADR-257 | `Compose/ChordVersionCheck.swift` | no | **not built** — the status bar shows `sharpee --version` (`Sharpee 5.4.1 · Chord 3.6.0`); the comparison is logic. |
| Run Tests and Cancel Test Run; NDJSON result stream | ADR-277 D1 | `Test/TestRunner.swift`, `Test/NDJSONLineBuffer.swift` | no | **PASS** — `TestRunner.swift`'s exact arguments, every stdout line relayed to the surface as `runLine`, `runExit` at the end (Phase 4 §5d). Cancel not wired. |
| Auto-Assertion policy menu (Test) | ADR-307 | `Menus/MenuBuilder.swift`, `Workspace/StoryHeaderAutoAssertion.swift` | no | **not built** — heading present, unwired; a header-line rewrite. |
| Introspection and World Index analysis runners | ADR-184; ADR-321 | `Project/IntrospectionRunner.swift`, `World/WorldIndexRunner.swift` | no | **partial** — World Index PASS (real `sharpee world-index` at tab open); **introspection not run**. Same subprocess primitive. |

## Workspace and story model

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Story detection, story target, workspace root, package detection | ADR-280 | `Workspace/Story*.swift`, `Workspace/WorkspaceRoot.swift` | no | **not built** — `System.IO` logic; same as WPF. The shell opens fernhill by path. |
| Story config sidecar as canon; header lines rendered from it on save | ADR-309 | `Workspace/StoryConfig.swift`, `Workspace/StoryHeader*.swift` | no | **not built** — the sidecar is copied beside the mirror unchanged; the byte-compatible rewrite is logic; same as WPF. |
| Scaffolding a new story through devkit | ADR-280 D3 | `Workspace/StoryScaffold.swift` | no | **not built** — subprocess; same as WPF. |

## Persistence, settings, updates, identity

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Session state: last project, open documents, active tab, window and pane geometry | Persistence | `Persistence/SessionState.swift`, `Persistence/RecentProjectsStore.swift` | no | **not built** — a settings file under the .NET process; same as WPF. |
| Settings window: author-level preferences | David 2026-08-09 | `Settings/SettingsWindowController.swift` | no | **not built** — menu item wired to "not built". Standard controls; a second Photino window or a Popup. |
| Check for Updates and scheduled background check | Sparkle | `Updates/UpdateController.swift` | no | **not built** — ADR-341 D7's open question, identical under OpenSilver: Photino publishes a self-contained single-file `.exe`; MSIX and the update channel were checked only for the WPF shape (`decision.md` §4 of the spike record) and **not re-checked under Photino**. |
| App identity, About panel | app | `AppIdentity.swift`, `AppDelegate.swift` | no | **built** — About wired from the app menu (Phase 4 §5b). |

## Protocol and shared panes (not controls, tracked for parity)

| Feature | Source | macOS implementation | Spike? | OpenSilver |
|---|---|---|---|---|
| Wire types for compose diagnostics, test results, run events, the manifest | ADR-184; `@sharpee/ide-protocol` | hand-mirrored `Codable` in `Project/`, `Compose/`, `Test/` | no | **not built** — the spike parses compose JSON ad hoc. D5's generator needs a **C# target** under OpenSilver exactly as under WPF; the ordering ("Swift first") only matters while the Swift app remains a consumer. |
| The two IDE-owned web panes and the story's Play bundle, shared under one host contract | ADR-341 D3 | `tools/ide/web/docs-tab`, `tools/ide/web/testing-surface`; two scheme handlers | no | **PASS — built once, served by a third host** — both IDE panes and the Play bundle loaded unmodified from their checked-in locations. D3's host side here is **host-neutral JavaScript** (`PaneServer` resolver + `PaneBridge` shim), not a native handler per host. One finding for D3's contract module: the client and the surface detect their host by the WebKit-specific shape `window.webkit.messageHandlers.<name>`, which any non-WebKit host must counterfeit (Phase 2 §4). |

## Host findings that are not rows

These are properties of the Photino + OpenSilver host, not features of the macOS app, so they get no row. Each one cost time this evaluation and would cost a shipping shell the same; `decision.md` weighs them.

| Finding | Where | Consequence |
|---|---|---|
| Every OpenSilver desktop host renders XAML as DOM inside the OS web view | Phase 0 §2 | The shape is native process + native window + web-rendered UI. ADR-341 D2's "not a web application in a window" is the ruling this reopens. |
| No `OnRender`/`DrawingContext`; custom surfaces are retained element trees | Phase 4 §2 | WinUI 3's drawing model, not WPF's — the ground David named when choosing WPF. Port cost measured: tab strip 150, tab bar 90, World map 170, project pane 90 lines. `HtmlPresenter` + `<canvas>` is the immediate-mode escape hatch. |
| Retained composition makes the ADR-297 flip one property write per token | Phase 4 §3 | Free, with no `{DynamicResource}` machinery. |
| Panes are iframes in one page: a drag that crosses a pane loses `mousemove`/`mouseup` | Phase 4 §5a | Fixed with a `pointer-events: none` guard on `mousedown`. A WKWebView-per-pane or WebView2-per-pane shell does not have this. |
| No `SynchronizationContext` in the Photino host; code after `await` resumes off the UI thread | Phase 4 §5d | Every UI touch must go through `Dispatcher.BeginInvoke`. WPF's `DispatcherSynchronizationContext` hides this. |
| Photino's custom-scheme delegate returns a bare stream — no status, no headers, no `Range` | Phase 4 §5d | `<audio>` fails over the scheme; worked around with `data:` URLs (fernhill's clips are 4–32 KB). A shipping host needs a range-capable local origin. |
| OpenSilver 3.3.3 ships no `Menu` control; Photino exposes no native menu API | Phase 4 §5b | The menu bar is hand-built from Popups. Master has a `Menu`; 3.3.3 does not. |
| `OpenSilver.Photino` 3.3.3 pins `Photino.NET` 3.2.3 (net6–net8 assets) while Photino's own line is 4.x; `photino.NET` last pushed 2026-03-26 | Phase 0 §2; re-checked 2026-09-13 (1336★, pushed 2026-03-26) | Runs under net10.0, but the host pairing is a version behind and six months quiet. |
| The browser (WASM) target has no custom-scheme origin to serve panes from | Phase 2 §6 | Owned gap for the browser tier (ADR-191's, outside ADR-341). The messaging half is already host-neutral. |
| `sharpee build` through the sealed toolchain fails for a story outside the repo | Phase 1 §5 → GH #457 | Not an OpenSilver finding: a Chord Writer toolchain packaging defect the evaluation surfaced. Open. |

## What the column says at a glance

Of the eighteen **YES**-flagged rows the spike list was built against: 9 **PASS** (theme tokens, tab strip, editor, highlighting, ruler, editor tab bar, word wrap, Testing, World map), 2 **PASS on hosting with the surrounding controls unbuilt** (Play without its header, Documentation without external-link interception verified), 6 **partial** (main window without persistence; appearance without persistence; project tree as a list; auto-indent without a Chord rule; diagnostics without inline decoration; right panel without play-after-build), 1 **built in a different shape** (the title band). None failed. Of the flagged rows, the editor's PASS is measured and not felt, and it is a hosted web editor rather than the native one D4 specifies.

Of the rows flagged **no**: everything that touches a subprocess or the filesystem and was attempted (compose, build, world-index, test run, toolchain, Documents round trip) passed with the same .NET calls WPF would make; everything not attempted is standard controls or logic. One "no" row — the menu bar — turned out to be a build item on this host because the toolkit lacks the control.
