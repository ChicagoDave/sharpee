# Phase 4 record — the shell, the custom-drawn surfaces, and the appearance flip

**Written**: 2026-09-13, session 30faa2, on `main`. Commands run on this Mac 2026-09-13 between 02:20 and 02:33 CDT. Spike code: `/Users/david/repos/spikes/opensilver-ide/hello/Hello/{Shell,Theme}/`, `MainPage.xaml(.cs)`. Evidence in the repo under `evidence/`: `phase-4-shell-light-play.png`, `phase-4-shell-dark-world.png`, `phase-4-shell-dark-testing.png`, `phase-4-theme-log.txt`.

**Why this phase grew a shell.** David, looking at the Phase 1–3 harness: *"you still have three horizontal panes, one clearly for debugging."* The harness proved plumbing and nothing about the product's shape. So this phase mirrors the macOS shell in XAML first — the parity table's Main-window row is a YES-flagged custom control in its own right — and mounts the real panes from Phases 2–3 inside it; the debug log becomes a Log tab in the bottom panel. The harness stays reachable with `--harness` so the earlier evidence remains reproducible.

**Outcome.**

| Question the plan asks | Answer |
|---|---|
| Where does OpenSilver's drawing model sit? | **Retained composition, WinUI 3's side of the line, not WPF's.** There is no `OnRender`/`DrawingContext`; a custom surface is a tree of `Border`/`Grid`/`TextBlock`/`Shapes` elements that OpenSilver renders to DOM. Every control below was built that way and all four rendered correctly. |
| ADR-297 live flip | **PASS.** One `SolidColorBrush` per token, shared by every element; mutating `Color` recolours the live DOM with no rebuild — probe below. |
| Tab strip / tab bar / World map | **Built, PASS** — same metrics and colours as the Swift originals; screenshots. |

## 1. What was built

- **`Theme/ThemeManager.cs`** — the 18 tokens of `Theme.swift` (light, dark) verbatim, one `SolidColorBrush` each, registered in `Application.Resources` before the page parses so XAML `StaticResource` and code both hold the *same instance*. `Apply(dark)` mutates each brush's `Color`.
- **`Shell/TabStrip.cs`** — `TabStripView.swift`: 30 px on the rail background, 12 px-inset text tabs, active tab on the play background with a 2 px accent bar across its top, red count badges (14 px, radius 7), 1 px bottom border. Used by the right panel (Build · Play · Testing · Index · Diagnosis · Documentation · Publish · World) and the bottom panel (Problems · Game Errors · Log).
- **`Shell/EditorTabBar.cs`** — `TabBarView.swift`: 28 px, cells with bold-when-active title, `×` close, 1 px separators, active on the editor background; a 6 px dirty dot replaces the 12 px inset when the document has unsaved changes (wired to the editor's `change` message).
- **`Shell/WorldMapView.cs`** — `WorldMapView.swift`'s layout verbatim (108×34 boxes, 24×22 gaps, 16 margin, 20 band header, 18 band gap; levels highest-first sharing one x origin) on a `Canvas` of `Rectangle` (RadiusX/Y 5), `Line` (dashed via `StrokeDashArray` for doors), and `TextBlock`; start room stroked 2 px accent, displaced rooms dashed mauve, unreached faded, level changes as ▲▼ chevrons. Fed by the real toolchain at tab-open time: `sharpee compose fernhill.story -o out/fernhill.ir.json` then `sharpee world-index out/fernhill.ir.json`.
- **`Shell/ProjectPane.cs`** — the typed groups of `ProjectArtifacts.swift` (Story, Walkthroughs, Assets, Web Template, Other) over fernhill's real folder, 14 px per level; clicking a file sends it to the editor.
- **`MainPage.xaml`** — `MainWindow.swift`'s shell: a 28 px chrome band (story title centred, Build/Compose left, System/Light/Dark right), rail (40 px, ▤ project toggle and ⚒ build-panel toggle tinted accent when active) | project pane (220, `GridSplitter`) | editor (tab bar over the Phase 3 CodeMirror pane) | `GridSplitter` | right panel (440); a bottom panel (220, hidden by default, toggled from the rail) under a `GridSplitter`; a 22 px status bar with the build pill and the toolchain's `sharpee --version` line. Window 1400×900, the macOS default.
- **Plumbing that now runs inside the shell**: compose at startup (Problems tab + badge from the diagnostics, story title from the IR meta), `Build` streaming into the Build tab, the Testing badge from the tree document's card count (31), the Play/Testing/Docs iframes loaded lazily on first tab selection, the editor loaded with `fernhill.story` on ready and re-themed on every flip.

`GridSplitter` is in `OpenSilver.Controls` (`xmlns:controls="clr-namespace:System.Windows.Controls;assembly=OpenSilver.Controls"`), not the core assembly — the one XAML namespace surprise. `StrokeDashArray`, `RadiusX/Y`, `CornerRadius`, and `HtmlPresenter` are all in the core runtime.

## 2. The drawing-model verdict

OpenSilver has **no immediate-mode drawing**. `UIElement` has no `OnRender`; there is no `DrawingContext`, `DrawingVisual`, or `NSView.draw(_:)` equivalent. A custom control is retained elements composed in code, and the runtime turns each into DOM (`div`s for panels and text, SVG for `Shapes`). That is exactly WinUI 3's model, which `decision.md` weighed *against* WinUI 3 on the ground that the macOS app's many `drawRect:` surfaces would each become "a retained element with a layout pass". So on the caveat-2 ground, OpenSilver inherits WinUI 3's cost, not WPF's advantage.

What this phase adds to that argument, from having built the four surfaces rather than reasoning about them:

- **The port cost was real but bounded.** Each Swift view's *layout* transliterated line-for-line (the World map's `layoutBoxes` is the same code in C#); only its *draw* method became element construction. Tab strip 150 lines, tab bar 90, World map 170, project pane 90.
- **The DOM is the escape hatch WinUI 3 does not have.** Anything that genuinely needs immediate-mode drawing can be an `HtmlPresenter` holding a `<canvas>` painted from JavaScript — the same route the editor already takes. Not used here (the map did not need it), but it is there.
- **Retained buys the theme flip for free.** Because every element holds a brush reference rather than a painted bitmap, changing the brush *is* the repaint. In WPF the same flip means invalidating every `OnRender` surface; here it is one property write per token.

## 3. The live flip — `evidence/phase-4-theme-log.txt`

Launched with `--appearance light --auto4`. The probe reads the *computed DOM colour* of the rail (`document.elementFromPoint(20, 400)`), not the brush, so it proves the pixels changed:

```
[   1.821s] probe: before flip — IsDark=False, RailBackground token #DCE0E8, DOM rail rgb(220, 224, 232)
[   2.125s] probe: after flip  — IsDark=True,  RailBackground token #16171D, DOM rail rgb(22, 23, 29),  Apply() took 0.9 ms
[   2.429s] probe: restored — DOM rail rgb(220, 224, 232)
```

`#DCE0E8` = rgb(220,224,232) and `#16171D` = rgb(22,23,29): the DOM shows the token's new value after one `Apply()` with nothing rebuilt. **PASS** on ADR-297 D2's "applies immediately". The editor pane flips with it (a `theme` message swaps its CSS variable palette; `editor.css` now carries both Theme.swift palettes), and the screenshots below show the two appearances end to end: chrome, panes, editor tokens, World map tokens.

**System appearance**: `window.matchMedia('(prefers-color-scheme: dark)')` inside Photino's WKWebView follows macOS; the shell reads it at launch and subscribes to `change`, so "System" tracks the OS setting live. Not exercised by the auto run (it would require flipping macOS mid-run); wired and logged.

## 4. Screenshots

- `phase-4-shell-light-play.png` — light: fernhill open in the editor (Latte tokens), the project pane's four groups with Assets recursed, the right panel on Play with the story's own retro theme, Testing badge 31, status bar `Ready` · `Sharpee 5.4.1 · Chord 3.6.0`.
- `phase-4-shell-dark-world.png` — dark: the World map — GROUND LEVEL and LEVEL -1 bands, `iron-gates` stroked accent, `folly-hill` dashed mauve (the solver displaced it), the door edge to `folly` dashed teal.
- `phase-4-shell-dark-testing.png` — dark: the Testing pane replaying fernhill's tree inside the right panel, the card column and the run column side by side.

## 5. Parity rows this phase moves (for Phase 5's column)

| Parity-table row | OpenSilver |
|---|---|
| Main window: four-pane split over bottom dock, status bar | built — `GridSplitter` dividers; positions not yet persisted |
| Story title centred in the chrome band | built as an in-content band under Photino's native title bar (no transparent-titlebar equivalent used) |
| Dual-palette tokens, every surface re-resolving | **PASS**, probe above |
| Appearance follows system, pinnable System/Light/Dark | built (band buttons; a menu would be the Windows form) |
| Reusable tab strip with badges | built, PASS |
| Editor tab bar with close buttons and dirty dot | built, PASS |
| Project tree (typed groups) | built as a grouped list, not an outline view — expand/collapse and keyboard navigation not built |
| World › Map custom drawing | built, PASS (retained shapes) |
| Right panel container + pane switching | built |
| Bottom panel: Problems / Game Errors | Problems fed by compose (0 for fernhill); Game Errors placeholder |

## 5a. Hosted-pane finding: drags die at an iframe boundary

David, on the first hands-on run: *"the panel slider is flakey and will stick to the mouse cursor or not move at all."* Cause, not OpenSilver's `GridSplitter` itself: the panes are iframes, each its own document, so a drag that starts on the XAML page loses every `mousemove` and the `mouseup` the moment the cursor crosses into a pane — the splitter freezes (no moves) or, if the button is released over a pane, never learns it (sticks to the cursor). Fix in `PaneBridge.Install`'s page script: on a left `mousedown` anywhere in the XAML document, every iframe gets `pointer-events: none`; `mouseup`, window `blur`, or `mouseleave` restores them. A general cost of the "native shell around web panes" shape on this host — WKWebView-hosted native shells (the macOS app) do not have it because their panes are separate `WKWebView`s, not iframes in one page; a WebView2-per-pane Windows shell would not either. Applied and rebuilt; awaiting David's re-test.

## 5b. Menu bar and Index — David's hands-on notes, same session

David, after the dividers were fixed: *"you'll need to add the chrome macos menu to the app since we've lost it with the browser version"*, then *"has to be OS-agnostic"*, and *"the index isn't implemented."*

**Menu bar (`Shell/MenuBar.cs`).** Photino provides a window and a web view; the macOS application menu is not part of that (its native library does hold `setMainMenu:`, but it exposes no API for it). A native `NSMenu` through the Objective-C runtime was the first thought and is ruled out by the OS-agnostic requirement — and by the mirror's own logic: Windows carries its menu in-window, so one in-app bar serves every OS. OpenSilver **3.3.3 ships no `Menu` control** (the repository's master has one; 3.3.3 has only the Input Toolkit's `ContextMenu`/`MenuItem`), so the bar is retained elements: top-level titles in the chrome band, each opening a `Popup` of rows (check mark · header · gesture) with separators and inline headings for what the Swift menus keep in submenus (Open Recent, Font, Appearance, Shipped Themes, Auto-Assertion). Structure and titles follow `MenuBuilder.swift`: the app menu, File, Edit, View, Build, Test, Window, Help. Gesture labels are OS-appropriate (⌘ on macOS, Ctrl elsewhere). Wired: Build, Run Tests (`sharpee test --tree` streaming into the Build tab), Testing Play Surface, Save, Project Pane, Build Panel, Word Wrap, Appearance (radio), Undo/Redo/Cut/Copy/Paste/Select All (sent into the editor, which runs CodeMirror's commands or `execCommand`), Open Recent › fernhill, Quit, About, Documentation. Unwired items log "not built". Shortcuts: a `keydown` listener on the XAML page and one inside every pane's shim forward ⌘/Ctrl B, U, ⌥U, S, 0, and comma to the shell — pressed inside the editor iframe they still reach the menu's commands.

**Index (`Shell/IndexView.cs`).** `StoryIndex.sections(of:)` and `stats(of:)` in rule: entities sorted case-insensitively into Rooms (extra kinds as detail), Regions, People (person kind or playable, "playable" as detail), Things (kinds as detail); Actions; Phrases (the default locale's keys without a dot, monospaced); Hatch Modules (with module path). Headline "13 rooms · 2 regions · 46 things · 4 people · 3 actions · 56 phrases" for fernhill, zeros omitted; section tabs are the same `TabStrip` ("Rooms · 13"); empty sections omitted; the selected section survives a rebuild. Clicking a row sends its authored span to the editor (`select`), which scrolls and selects it. Stale marking: any editor change dims the list and shows the "last good compile" banner until the next gate-clean compose.

**Compose on edit.** To feed the Index and Problems while typing without ever writing the real story, the shell mirrors `ComposeScheduler.swift`: 800 ms after the last edit it pulls the editor's text, writes it to `out/live/fernhill.story` (sidecars copied beside it once), composes that, and updates Problems, the title, and the Index. Save (⌘S) writes the same mirror and clears the dirty dot — the status bar says so. `git status branch-stories/fernhill` stays empty.

Screenshots: `evidence/phase-4-shell-dark-index.png`, `evidence/phase-4-shell-light-index.png` — the menu bar in the band, the Index tab with its headline, section tabs, and room list.

## 5c. Second hands-on pass — David's punch list, same session

*"files open with a single click and only one file is open at a time. you cannot 'close' a file. the build happens automatically and this made me realize the macos IDE did not auto build. We should not be display the contents of sound files and images should show the image, not the binary contents. Not sure why there's a red (31) next to Testing. World tab is cut off and should have sub-tabs."*

Each item checked against the Swift app before changing anything:

| Item | macOS app (read) | Done here |
|---|---|---|
| Open gesture | `ProjectTreeViewController.swift:172` — `outlineView.doubleAction`; a single click selects | Single click selects (row highlight); double click opens |
| One document, no close | `TabBarView.swift` — `setTabs(_:activeIndex:)`, `onSelect`, `onClose` | A document list: every open file is a tab; switching pulls the outgoing buffer from the editor before loading the next; `×` closes (a dirty close is logged and discarded — the macOS app would ask) |
| Binary contents shown | not an editor case there; the project tree opens `.story`/`.chord`/templates, and assets are a group | Images (`png jpg gif webp svg`) render in a viewer with name and size; audio (`wav mp3 ogg m4a flac`) gets a player; served read-only from the story folder over a fourth scheme, `sharpee-story://`; other unknown types get "no viewer" |
| Red (31) on Testing | `setCount` callers: **Problems, Game Errors, Diagnosis only** (`BottomPanelViewController.swift:59-78`, `RightPanelViewController.swift:186-197`); the Testing tab carries no badge | Removed. The 31 was this spike's invention (the tree's card count) |
| World tab cut off | `TabStripView.swift` bounds the stack and truncates titles | `TabStrip.FitToWidth`: when the tabs outgrow the strip each gets an equal share and its title truncates with an ellipsis; all eight tabs now fit at 440 px (titles are short at that width — the panel wants ~560 px for full titles) |
| World sub-tabs | `WorldView.swift` — section strip over Map, Reach, Incomplete, plus the no-analysis explanation | `Shell/WorldView.cs`: the same strip; Reach = headline ("Play reaches 13 of 13 rooms · 0 findings · 3 gates lifted") over sections that appear only when non-empty (unreached, blocked, stranded, broken exits, gates lifted with what each requires, progression); Incomplete = the candidate list banded by kind (Missing word 30 · Ambiguous 15 · No object 118 for fernhill), rows span-navigable into the editor, capped at 60 per band |

**On "the build happens automatically".** The shell does not build automatically; it *composes* on edit (800 ms after the last keystroke), which is what `Compose/ComposeScheduler.swift` does in the macOS app too — Problems, the title, and the Index update while typing. Build (the browser bundle) is manual in both, ⌘B / Build › Build. If the macOS app should auto-build on save, that is a product decision for both shells, and this record only notes that the question came up here.

Screenshots: `evidence/phase-4-shell-dark-world-sections.png` (World with its section strip, all eight right-panel tabs fitting), `evidence/phase-4-shell-light-image-viewer.png` (two tabs open, the folly photograph rendered with its size, the project row highlighted).

## 5d. Third hands-on pass — Build tab, Test Run, audio

*"even though the build is automatic, its log is not displayed in the Build tab unless I run build a second time. The Testing tab runs through the story with the default assertions, but Test Run seems to hang (each test shows 'running...'). The sound files don't play or I can't hear them and show Error in the player."*

**Build tab empty on the first build — a host finding, fixed.** Reproduced headlessly (`--build` at startup: the status pill reached "Build succeeded" while the right panel stayed on Play). Cause: **there is no `SynchronizationContext` in the OpenSilver Photino host**, so code after an `await` resumes on a thread-pool thread; the first build's tab switch and text writes ran there and never reached the DOM, while a second build from the menu ran on the UI thread and did. Fix: every UI touch in `BuildAsync` goes through `Dispatcher.BeginInvoke` (the rule the harness already followed for callbacks). `evidence/phase-4-shell-light-build-tab.png`: the full streamed build log on the first run. This is a general rule for any OpenSilver desktop shell — the same code under WPF would have had a `DispatcherSynchronizationContext` and never shown the bug.

A side observation from that run: the vendored toolchain's `build` **succeeds for fernhill** (`— exit 0 after 232 ms`, `dist/web/fernhill` written into the story's gitignored `dist/`), whereas Phase 1 recorded it failing (GH #457). The difference is esbuild resolving the in-repo story's imports by walking up to the repository's own `node_modules`, where `dist-esm` exists — the sealed closure's gap is only reached from a story outside the repo. Added to #457 as a comment; the seal is leaky in that direction too.

**Test Run hung — a missing host duty, built.** The surface's Run button posts `{run: true}` to its host and expects the host to run the tree and relay the NDJSON stream back (`TestRunner.swift`, `TestingSurfaceViewController.swift:361-372`: `__sharpeeTestingSurface.runLine(text)` per line, `runExit(ok, note)` at the end). The spike had ignored the post. Now `RunTreeForSurfaceAsync` runs `sharpee test <story> --tree --capture-output --capture-world --json` — TestRunner.swift's exact arguments — against the live mirror in `out/live/` (the story text, the sidecars, and the surface's latest document, which is now written there), relays every stdout line as `runLine`, and sends `runExit`. `evidence/phase-4-shell-dark-test-run.png`: `opening-iron-gates PASS` with green check marks per assertion, status "Tests passed".

**Audio "Error" in the player — a WKWebView media limit, worked around.** WebKit fetches media with `Range` requests and expects `206`/`Content-Range`; Photino's custom-scheme delegate answers with a bare stream (no status, no headers), so an `<audio>` over `sharpee-story://` fails where an `<img>` succeeds. Fernhill's clips are 4–32 KB, so the viewer now inlines them as `data:` URLs: `evidence/phase-4-shell-light-audio-player.png` shows `dawn-theme.wav` playing (00:03 / 00:04). A shipping host would serve media from a range-capable local HTTP origin, or a scheme handler that can answer ranges — Photino's cannot. Owned gap for the parity column, not a kill.

## 6. Not built, deliberately

Diagnosis and Publish panes (placeholders); divider persistence; menu items past the wired set (New Story, New Import, Open Project, Close, Cancel Build/Tests, Font, Shipped Themes, Auto-Assertion policy, Publish, Window › Minimize/Zoom — those two are host-owned); keyboard navigation inside menus; tab-strip overflow truncation (at 440 px the last two right-panel tabs sit off the edge — the Swift strip bounds and truncates; this one does not yet); multiple open documents; save (the editor's `getText` path exists, no ⌘S). None of these is a drawing-model or host question; they are Phase 5 parity rows to mark "not built".
