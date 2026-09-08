# ADR-341 parity table — Chord Writer for Windows against the macOS app

**Written**: 2026-09-08, session 4a2d5f (spike plan Phase 1). Every file named below was read or listed this session under `tools/ide/SharpeeIDE/` on `main` at `d06e511ae` (106 Swift files, 18,921 lines). Menu titles are from `Menus/MenuBuilder.swift`; the right-panel tabs from `Play/RightPanelViewController.swift:88-95`; the bottom-panel tabs from `Build/BottomPanelViewController.swift:24-25`.
**What it is**: AC-1's table. One row per feature of the macOS app, grouped by surface. The **Windows** column is seeded "not built" everywhere and is the column the shell plan later moves; a release ships only with every row "shipped" or an owned, dated gap (ADR-341 D1). The **Spike?** column is this phase's deliverable: **YES** marks a control the D2 spike phase builds in both toolkits, **no** marks plumbing or a standard control that needs no spike. The flagged rows, collected at the end, are the authoritative list Phases 3 and 4 build against.
**How the flags were assigned**: YES where the macOS app implements the control custom (its own AppKit view with drawing or layout logic), where D2 names the control explicitly (editor, project tree, WebView2 hosting, window chrome and appearance), or where the Windows toolkits are known to differ from AppKit in a way the spike must feel out (text editing, outline views, transparent title bars, dynamic appearance). "no" where the macOS code is a standard control, a sheet of standard controls, a subprocess runner, a pure model, or a persistence store.

## App shell and chrome

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Main window: four-pane horizontal split over a bottom-docked panel, status bar footer, divider positions remembered | ADR-154; SessionState | `MainWindow.swift` (1,951 lines: window, splits, rail, status bar, cross-pane routing) | not built | **YES** | Split layout with persisted dividers and a hidden-by-default bottom dock; WPF `GridSplitter` versus WinUI 3's lack of a native splitter is a known difference. |
| Story title centered in the title bar band; transparent titlebar with traffic lights floating over the band | macOS 26 workaround | `UI/StoryTitleBarViewController.swift`, `UI/WindowTitle.swift` | not built | **YES** | Windows has its own caption bar and no traffic lights; the mirror decides whether to extend into the title bar (both toolkits can) or keep a standard caption with the title centered. Appearance-sensitive. |
| Dual-palette dynamic theme tokens (dark Catppuccin-ish, light Latte), every surface re-resolving on appearance change | ADR-297 D1 | `Theme.swift`, `UI/ThemedPane.swift` | not built | **YES** | ADR-297's whole mechanism; WPF has no built-in light/dark switch (Fluent theme in .NET 9+ adds one), WinUI 3 does. The spike proves tokens flip live on both. |
| Appearance follows system by default, pinnable System / Light / Dark from View › Appearance, persisted, applied before the window builds | ADR-297 D2, D3 | `UI/AppearancePreference.swift`, `Menus/MenuBuilder.swift` | not built | **YES** | Part of the same spike as the token system. |
| Reusable tab strip (left-aligned text tabs, accent top bar, count badges) used by both panels | mock-bottom-panel | `UI/TabStripView.swift` | not built | **YES** | Custom-drawn; both toolkits have a TabControl whose look is far from this. Build once, reuse for both panels. |
| Font preference for the story pane and right-panel text: family Courier / SF Mono / Arial / Georgia, size S/M/L/XL, live re-render | David's ruling | `UI/FontPreference.swift`, View › Font menu | not built | no | Standard font handling; family names map to Windows equivalents (Consolas or Cascadia for SF Mono). A preference, not a control. |
| Menu bar: File, Edit, View, Build, Test, Window, app menu with About, Settings (⌘,), Check for Updates | `MenuBuilder.swift` | `Menus/MenuBuilder.swift` (398 lines) | not built | no | Windows apps carry the menu in-window; WPF `Menu` and WinUI 3 `MenuBar` both do this. Shortcut mapping ⌘ → Ctrl is mechanical. |
| Word Wrap toggle (View) | editor | `Editor/EditorViewController.swift:867` | not built | no | Part of the editor spike's feature list, not its own control. |

## Launch

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Landing page: product name, five most recent projects, Open / Create Story / Close | ADR-280 | `Launch/LandingPageViewController.swift`, `Launch/LandingRecents.swift`, `Launch/LaunchCoordinator.swift` | not built | no | A modal of standard controls. |
| Create Story sheet: title and location, location defaulting to `<root>/<title>` and following the title until edited | ADR-280 D2 as amended A1, D4 | `Launch/CreateStoryViewController.swift`, `Workspace/StoryScaffold.swift`, `Workspace/StoryHome.swift` | not built | no | Standard controls; `Documents\<Story Title>\` on Windows (ADR-341 D6). |
| Reopen last story on launch (Settings) | David 2026-08-09 | `Settings/ReopenLastStoryPreference.swift`, `Persistence/SessionState.swift` | not built | no | Preference plus persisted session. |
| Story location mirror (the launcher's view of where stories live) | ADR-280 A1 | `Launch/StoryLocationMirror.swift` | not built | no | Pure model. |

## Project pane

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Typed artifact tree: Story, Walkthroughs, Assets, Web Template, Other as lenses over the real folder; open at the bottom | ADR-280 D1 | `Project/ProjectTreeViewController.swift` (NSOutlineView), `Project/ProjectArtifacts.swift`, `Project/ProjectPaneViewController.swift` | not built | **YES** | D2 names the project tree. `NSOutlineView` versus WPF `TreeView` versus WinUI 3 `TreeView`: grouping rows, icons per group, selection and double-click behavior, keyboard navigation. |
| Project Pane toggle (View) | shell | `Menus/MenuBuilder.swift` | not built | no | A visibility toggle. |
| Assets group | ADR-285 | `Project/ProjectArtifacts.swift:32-84` (group over the `assets` directory) | not built | no | On macOS this is the tree group only: ADR-285 D2's reconcile-against-declarations view and D3's declaring import were not found in the source (`grep -rn declare tools/ide/SharpeeIDE/Project/`, 2026-09-08). The mirror mirrors what exists; if ADR-285's manager is built later it lands on both. Recorded here so the parity table does not claim more than the macOS app has. |
| Project manifest (introspection result) | ADR-184 | `Project/ProjectManifest.swift` (hand-mirrored `Codable`), `Project/IntrospectionRunner.swift` | not built | no | ADR-341 D5: generated on both platforms, Swift first. Not a control. |

## Editor pane

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Code editor over an `NSTextView`: open in tabs, switch, close, save, save all, reload from disk, unsaved-change tracking, text replacement through the undo stack (used by the World tab's fixes and the Problems panel's IFID fix) | ADR-154; ADR-321 A3 | `Editor/EditorViewController.swift` (990 lines), `Editor/Document.swift` | not built | **YES** | **The first spike, per D2.** The Windows editor is a custom control or a third-party one on either toolkit; the spike builds enough to judge feel: typing, selection, undo, large-file scrolling, programmatic replace. |
| Syntax highlighting from the in-process Chord lexer (token kinds; no parse tree) | ADR-258 D7; ADR-182 pending | `Editor/ChordLexer.swift`, `Editor/SyntaxHighlighter.swift` | not built | **YES** | Part of the editor spike. Under ADR-341 D4 both editors move to ADR-182's tree-sitter grammar, implemented in the Swift app first; the spike proves the Windows editor can apply per-token attributes at typing speed. |
| Auto-indent and bracket matching | editor | `Editor/AutoIndenter.swift`, `Editor/BracketMatcher.swift` | not built | **YES** | Part of the editor spike: keystroke interception and transient highlight. |
| Line-number ruler | editor | `Editor/LineNumberRulerView.swift` | not built | **YES** | Part of the editor spike: a gutter that tracks scroll and wrap. |
| Tab bar above the editor (cells with close buttons) | editor | `Editor/TabBarView.swift` | not built | **YES** | Custom-drawn; same family as the tab strip. |
| Diagnostics in the editor: open at a span, navigate to a span, per-file diagnostic records | ADR-258 D5 | `Editor/EditorViewController.swift:395-433`, `Compose/ComposeDiagnostics.swift`, `Compose/SpanText.swift` | not built | **YES** | Part of the editor spike: range selection and scroll-to from an external span. |
| Word wrap | View menu | `Editor/EditorViewController.swift:867` | not built | **YES** | Part of the editor spike; the ruler must follow wrapped lines. |
| New Import… and Extract Selection to Import… (GH #288) | GH #288 | `Editor/ImportCommands.swift`, `Editor/ImportRefactor.swift` (pure functions) | not built | no | The text half is pure and ports as logic; the UI half is a name sheet. |
| Import commands' story-rooted path rules | Chord language facts | `Editor/ImportRefactor.swift` header | not built | no | Logic. |

## Right panel tabs

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Right panel: tab strip over Build, Play, Testing, Index, Diagnosis, Documentation, Publish, World; a build switches to Build, play-after-build switches to Play | David's ruling | `Play/RightPanelViewController.swift` | not built | **YES** | The container is the tab-strip spike plus pane switching; the eight panes are their own rows. |
| **Build** tab: streamed build output in a read-only monospaced view, scrolled to the tail; build report appended on success | ADR-258 D5; StoryIndex | `Build/BuildPanelView.swift`, `Build/BuildController.swift`, `Compose/StoryIndex.swift` | not built | no | A read-only text box fed chunks; standard on both toolkits. |
| **Play** tab: header (status dot, Restart, theme picker, Play-after-build toggle) over a `WKWebView` serving `dist/web/<id>/` on a custom scheme, placeholder when no bundle | ADR-252 D2; Phase 6b | `Play/PlayViewController.swift`, `Play/PlayHeaderView.swift`, `Play/WebBundle.swift`, `Play/PlayURLSchemeHandler.swift`, `Play/PlayThemeCatalog.swift` | not built | **YES** | D2 and D3 name WebView2 hosting. The spike serves a real story bundle from a directory over a custom origin through WebView2's resource hook so localStorage and relative URLs work (Phase 2's assumption check feeds this), then judges load and input feel. The header is standard controls. |
| Play runtime errors symbolicated through the source map and translated to Sharpee-speak, forwarded to Diagnosis and Game Errors | Play | `Play/PlayErrorSymbolicator.swift`, `Play/SharpeeErrorTranslator.swift`, `Play/SourceMap.swift` | not built | no | Logic; the message bridge from the page is part of the WebView2 spike. |
| **Testing** tab: the testing play surface, a `WKWebView` hosting the bundle's `index-testing.html` with the IDE's tree-of-cards UI injected; the page posts the whole tree document back, written to `<story-id>.tests.json`; view-state sidecar; replay at the pinned seed | ADR-307; ADR-306 | `TestingSurface/TestingSurfaceViewController.swift` (445 lines), `TestingSurface/TestingSessionStore.swift`, `TestingSurface/TestingSurfaceWebRoot.swift`; served by `Play/PlayURLSchemeHandler.swift:29-36` | not built | **YES** | Same WebView2 spike, second case: two-way messaging (turn-feed in, serialized document out) and script injection over a served bundle. The IDE-owned pane itself is `tools/ide/web/testing-surface`, shared under D3. |
| Testing Play Surface window (View menu) | ADR-306 | `Menus/MenuBuilder.swift` | not built | no | A second window hosting the same surface. |
| **Index** tab: headline stats over section tabs (Rooms / Regions / Things / People / Actions / Phrases / Hatch Modules), flat span-navigable lists, stale-marked with the IR | David's ruling: tabs not expanders | `Play/IndexView.swift` (310 lines), `Compose/StoryIndex.swift`, `Compose/IRTreeState.swift` | not built | no | Section tabs plus list views; standard list controls with double-click-to-span. Reuses the tab strip. |
| **Diagnosis** tab: readable explainer for the focused Play runtime error, clickable frames opening the editor | GH #296 | `Play/ErrorDiagnosisView.swift` | not built | no | Text and a list of clickable locations. |
| **Documentation** tab: `WKWebView` over the bundled author docs on `sharpee-docs://`, toolchain Chord version passed in, external links to the real browser, no network | ADR-281 D3 | `Docs/DocsTabViewController.swift`, `Docs/DocsTabSchemeHandler.swift`, `Docs/DocsTabWebRoot.swift`; the pane is `tools/ide/web/docs-tab` | not built | **YES** | Same WebView2 spike, third case: a second served root on its own origin, plus external-link interception. The corpus and search index (ADR-281 D1, D2) are package-time artifacts, not controls. |
| **Publish** tab: a button that asks where the zip goes, toolchain output streamed under it, artifact path with Reveal on success | ADR-284 D1, D2 | `Publish/PublishView.swift`, `Publish/PublishController.swift` | not built | no | Standard controls; "Reveal in Finder" becomes "Show in Explorer". |
| **World** tab: section strip over Map, Reach, Incomplete, and the no-analysis explanation | ADR-321 D8 | `World/WorldView.swift`, `World/WorldIndexDocument.swift` (866 lines, the analysis document), `World/WorldIndexRunner.swift` | not built | no | The strip is the tab-strip spike; the analysis is a subprocess result. The three views are rows below. |
| World › Map: rooms drawn on the analyzer's compass grid, one band per level, connections, solver notes | ADR-321 D7 | `World/WorldMapView.swift` (299 lines, custom drawing) | not built | **YES** | Custom 2D drawing of a graph with bands; WPF `Canvas`/`DrawingVisual` versus WinUI 3 `Canvas` or Win2D. The one World control that is not a list. |
| World › Reach: headline over a sectioned findings list | ADR-321 D4, D13 | `World/WorldReachView.swift`, `World/WorldFindingTable.swift` (479 lines) | not built | no | A sectioned, span-navigable table; standard list control with sections. |
| World › Incomplete: candidate cards with per-word fix buttons, declare, and ignore; edits applied through the editor's undoable path; ignore store | ADR-321 D5, D6, A3 | `World/WorldIncompleteView.swift` (552 lines), `World/WorldCandidateCard.swift`, `World/WorldSourceEdit.swift`, `World/WorldIgnoreStore.swift`, `World/WorldPhraseLocator.swift`, `World/WorldProseChunker.swift` | not built | no | Cards are a list of item templates with buttons; the edit computation is pure. Depends on the editor spike's programmatic replace. |

## Bottom panel

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Bottom panel: tab strip over Problems and Game Errors, hidden by default, toggled from the rail | David's ruling | `Build/BottomPanelViewController.swift` | not built | no | Container; the strip is the tab-strip spike. |
| Problems: structured compose diagnostics (severity dot, code, message, file:line), click opens the exact span, status line on pipeline failure | ADR-258 D5 | `Compose/ProblemsView.swift`, `Compose/ComposeDiagnostics.swift`, `Compose/ComposeScheduler.swift` | not built | no | A list with a colored glyph column; standard. |
| Game Errors: symbolicated Play runtime errors, expandable rows, double-click opens source | Play | `Build/GameErrorsView.swift` | not built | no | Expandable list; standard. |

## Build, test, and compose plumbing

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Build (⌘B) and Cancel Build; Build Settings sheet (story, clients, skip-from), persisted per project | ADR-154 | `Build/BuildRunner.swift`, `Build/BuildController.swift`, `Build/BuildSettingsViewController.swift`, `Build/BuildSettings.swift`, `Build/BuildSettingsStore.swift`, `Build/BuildStatus.swift`, `Build/DataBuffer.swift` | not built | no | Process spawning with chunked stdout on Windows (`System.Diagnostics.Process`); the sheet is standard controls. |
| Shell environment for subprocesses (PATH, the bundled toolchain) | vendor-toolchain | `Build/ShellEnvironment.swift`, `Compose/BundledToolchain.swift` | not built | no | The Windows counterpart of the vendored toolchain (ADR-341 D6); Phase 2 checks the x64 Node runs. |
| Compose on edit: `sharpee compose --json`, scheduled, diagnostics decoded, IR retained | ADR-258 | `Compose/ComposeRunner.swift`, `Compose/ComposeScheduler.swift`, `Compose/ComposeDiagnostics.swift`, `Compose/IRTreeState.swift` | not built | no | Subprocess plus JSON decode against `@sharpee/ide-protocol` (generated types, D5). |
| Chord version check against the toolchain's supported language version | ADR-257 | `Compose/ChordVersionCheck.swift` | not built | no | Logic. |
| Run Tests (⌘U) and Cancel Test Run; NDJSON result stream | ADR-277 D1 | `Test/TestRunner.swift`, `Test/NDJSONLineBuffer.swift` | not built | no | Subprocess with a line-buffered stream. |
| Auto-Assertion policy menu (Test) | ADR-307 | `Menus/MenuBuilder.swift`, `Workspace/StoryHeaderAutoAssertion.swift` | not built | no | Menu plus header-line rewrite. |
| Introspection (project manifest) and World Index analysis runners | ADR-184; ADR-321 | `Project/IntrospectionRunner.swift`, `World/WorldIndexRunner.swift` | not built | no | Subprocesses. |

## Workspace and story model

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Story detection, story target, workspace root, package detection | ADR-280 | `Workspace/StoryDetector.swift`, `Workspace/StoryTarget.swift`, `Workspace/WorkspaceRoot.swift`, `Workspace/PackageDetector.swift` | not built | no | Filesystem logic; path separators and `Documents` resolution differ. |
| Story config sidecar `<story-name>.config.json` as canon; header lines (IFID, themes, publish source, auto-assertion) rendered from it on save | ADR-309 | `Workspace/StoryConfig.swift`, `Workspace/StoryHeaderLines.swift`, `Workspace/StoryHeaderIFID.swift`, `Workspace/StoryHeaderThemes.swift`, `Workspace/StoryHeaderPublishSource.swift`, `Workspace/StoryHeaderAutoAssertion.swift` | not built | no | A wire contract shared with devkit's `story-config.ts`; ports as logic and must stay byte-compatible. |
| Scaffolding a new story through devkit | ADR-280 D3 | `Workspace/StoryScaffold.swift` | not built | no | Subprocess. |

## Persistence, settings, updates, identity

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Session state: last project, open documents, active tab, window and pane geometry | Persistence | `Persistence/SessionState.swift`, `Persistence/RecentProjectsStore.swift`, `Persistence/DefaultsMigration.swift` | not built | no | `UserDefaults` becomes a settings file or the registry; logic. |
| Settings window (⌘,): author-level preferences, one section per group | David 2026-08-09 | `Settings/SettingsWindowController.swift` | not built | no | Standard controls. |
| Check for Updates and scheduled background check | Sparkle | `Updates/UpdateController.swift` | not built | no | Not a control. The Windows update channel is ADR-341 D7's question, decided in the shell plan after Phase 5. |
| App identity, About panel | app | `AppIdentity.swift`, `AppDelegate.swift` (658 lines: lifecycle, menu actions, window routing) | not built | no | Application plumbing. |

## Protocol and shared panes (not controls, tracked for parity)

| Feature | Source | macOS implementation | Windows | Spike? | Why, or what to build |
|---|---|---|---|---|---|
| Wire types for compose diagnostics, test results, run events, the manifest | ADR-184; `@sharpee/ide-protocol` | `Project/ProjectManifest.swift` and the decoders in `Compose/` and `Test/` (hand-mirrored) | not built | no | ADR-341 D5: generated, Swift first. |
| The two IDE-owned web panes (docs tab, testing surface) and the story's Play bundle | ADR-341 D3 | `tools/ide/web/docs-tab`, `tools/ide/web/testing-surface`; served by the two scheme handlers | not built | no | Shared under D3's host contract; the Windows side of that contract is the WebView2 spike above. |

## The spike list (Phases 3 and 4 build these, in this order)

Editor first, per D2; then the rest by how far each toolkit's stock control is from what the macOS app draws.

1. **The editor** — text view with tabs, per-token highlighting at typing speed, auto-indent, bracket matching, line-number gutter that follows wrap, span selection and scroll-to from outside, programmatic undoable replace, save and reload. Rows: Editor pane, all YES rows.
2. **WebView2 hosting** — serve a story bundle directory over a custom origin through the resource-request hook (Phase 2's assumption check), then the three cases: Play (load, input, error bridge), Testing (script injection, two-way messaging, document round trip), Documentation (second root, external-link interception). Rows: Play, Testing, Documentation.
3. **The project tree** — typed groups with icons over a real folder, selection, double-click, keyboard navigation. Row: Project pane.
4. **Window chrome and appearance** — the four-pane split with persisted dividers and a hidden bottom dock, the centered title band, dual-palette dynamic tokens flipping live, the System / Light / Dark pin. Rows: App shell, first four rows.
5. **The tab strip** — the custom strip with accent bar and count badges, reused by both panels and the World section strip. Rows: tab strip, right panel container, editor tab bar.
6. **The World map** — custom 2D drawing of rooms on a banded grid with connections. Row: World › Map.

Everything else in the table is standard controls, subprocess plumbing, or pure logic, and is not spiked; it is built in the shell plan once the toolkit is chosen.

## Facts recorded for the shell plan, not for the spike

- ADR-285's asset manager (D2 reconcile, D3 declaring import) is not in the macOS source; the Assets group is a folder lens. The parity bar is the macOS app as shipped.
- ADR-277 D4's `.transcript` editor and D5's recording bridge were retired for the author world by ADR-306 and ADR-307 (`Play/PlayViewController.swift` header, `Project/ProjectArtifacts.swift:13`); the Testing tab is the tree-document surface. No parity row exists for transcripts.
- `tools/ide/web/testing-tab` is an untracked directory holding only `node_modules`; not a pane (ADR-341 Context).
