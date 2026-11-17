# Phase 4 — custom-drawn surfaces, the shell, and the appearance flip

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64), Avalonia 12.1.2
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/pane/PaneHost/{Shell,Theme}/` (outside this repository)
**Evidence in repo**: `evidence/phase-4-shell-log.txt`, `evidence/phase-4-shell-dark.png`, `evidence/phase-4-shell-light.png`

**The central question, answered: Avalonia's `Render(DrawingContext)` is WPF's model, not WinUI 3's.**
It is a re-record-on-invalidation method, not a per-frame paint and not a composed element tree
wearing WPF's method name. Measured, not read off documentation — §2. ADR-297's live flip **PASSES**
at the pixel level, and costs *zero* re-records. `NativeMenu` **PASSES**. The four custom-drawn
surfaces are built and rendering from real analyzer output.

The felt comparison of the whole shell against the shipping AppKit app is David's; the two
screenshots are what it needs.

## 1. What was built

Every surface below derives from `DrawnSurface`, whose only job is to count `Render` calls and hand
off to `Draw(DrawingContext)`. Nothing is composed from `Border`/`Grid`/`TextBlock` trees.

| Surface | Lines | Drawn from |
|---|---|---|
| `Shell/TabStripView.cs` | 111 | `TabStripView.swift` metrics: 30 px on the rail background, 12 px-inset text tabs, active tab on the play background with a 2 px accent bar across its top, count badges 14 px at radius 7, 1 px bottom border |
| `Shell/EditorTabBarView.cs` | 80 | `TabBarView.swift`: 28 px, bold-when-active title, `×` close, 1 px separators, a 6 px dirty dot replacing the 12 px inset |
| `Shell/WorldMapView.cs` | 174 | `WorldMapView.swift` layout verbatim (108×34 boxes, 24×22 gaps, 16 margin, 20 band header, 18 band gap, levels highest-first on one x origin) |
| `Shell/ProjectPaneView.cs` | 88 | `ProjectArtifacts.swift`'s typed groups (Story · Walkthroughs · Assets · Web Template · Other), 14 px per level |
| `Shell/DrawnSurface.cs` | 42 | the base and the instrument |
| `Theme/ThemeTokens.cs` | 87 | `Theme.swift`'s 22 tokens, light and dark, one mutable `SolidColorBrush` each |
| `Shell/ShellWindow.axaml(.cs)` | 77 + 335 | `MainWindow.swift`'s shell, plus the two probes |

**453 lines across the four surfaces and their base**, against the OpenSilver spike's ~500 across
its four — close enough that the port cost is the same order on both hosts, and that is the useful
comparison rather than the exact number.

The shell mirrors `MainWindow.swift`: a 28 px chrome band (story title centred, Build/Compose left,
Light/Dark right), a 40 px rail with the project and bottom-panel toggles, the project pane (220,
`GridSplitter`), the editor over its tab bar, a right panel (440) carrying Play · Testing · Docs ·
World, a bottom panel (Problems · Game Errors · Log), and a 22 px accent status bar with the build
pill and the toolchain version. Phase 1's pane hosting and Phase 3's editor are both mounted inside
it — the Testing badge reads **31**, from fernhill's real tree document.

The World map is fed by the **real analyzer output** (`sharpee compose` → `sharpee world-index`),
never synthetic:

```
world map: 13 rooms, 12 connections (3 with doors), 2 levels, 1 displaced
           — from the real world-index output
project pane: 8 file(s) from the real story folder
editor: fernhill.story — 1180 lines, 5279 tokens
```

`folly-hill` draws dashed mauve because the analyzer reports it displaced (`study` holds the cell it
wanted); `iron-gates` carries the 2 px accent stroke as the start room; `cellar` sits in its own
`level -1` band; three connections draw dashed teal because a door sits in them.

## 2. The drawing-model verdict — measured

`DrawnSurface` counts every `Render` call. The probe then does four things and reads the counters
**after real frames have been presented**, because Avalonia renders on the render thread and a
counter read synchronously reads a frame that has not happened yet (the first attempt at this probe
read all zeros for exactly that reason, and the zeros were the measurement, not the framework).

```
  RightTabs: 1 Render(DrawingContext) call(s) after first layout
  BottomTabs: 2 …   EditorTabs: 2 …   WorldMap: 1 …   ProjectPane: 2 …
  after AffectsRender property change: RightTabs 1, EditorTabs 1
  after explicit InvalidateVisual: RightTabs 1, BottomTabs 1, EditorTabs 1, WorldMap 1, ProjectPane 1
  idle over 8 frame waits, no invalidation: RightTabs 0, BottomTabs 0, EditorTabs 0, WorldMap 0, ProjectPane 0
```

Three facts, and together they are the verdict:

1. **One `Render` per invalidation, never more.** `AffectsRender<T>` on a styled property produces
   exactly one; `InvalidateVisual()` produces exactly one.
2. **Zero `Render` calls while idle**, over eight frame waits. It is not a per-frame painter.
3. **`Render` is re-entered on invalidation at all**, which a retained element tree would not do —
   OpenSilver's surfaces have no `OnRender` to re-enter, which is what made them WinUI 3's model.

That is WPF's contract precisely: record drawing operations into a retained surface, re-record when
invalidated. **So O6's central promise holds** — the drawing model that decided WPF over WinUI 3
(ADR-341 D2) is available cross-platform, and the many `drawRect:` surfaces of the macOS app
transliterate rather than being re-architected as element trees. `WorldMapView.Draw` is the Swift
`draw(_:)` in C#, not a rewrite of it.

## 3. ADR-297's live flip — PASS, at the pixel level, for free

The probe renders the tab strip to an offscreen `RenderTargetBitmap` on each side of the flip and
reads an actual pixel, so the claim is about pixels rather than about the token values that fed them:

```
  before: IsDark=False, railBackground=#DCE0E8, editorBackground=#EFF1F5, accent=#1E66F5
  before: RightTabs pixel(200,20) = #DCE0E8
  after:  IsDark=True,  railBackground=#16171D, editorBackground=#1E1F26, accent=#89B4FA
  after:  RightTabs pixel(200,20) = #16171D — CHANGED
  Apply(22 tokens) took 0.06 ms; drawn surfaces repainted: RightTabs 0, BottomTabs 0, …, ProjectPane 0
```

The pixel is the token, exactly. And note the last line: **zero `Render` calls, changed pixels.**
Mutating a shared `SolidColorBrush.Color` does not re-enter `Draw` — the recorded draw operations
hold the brush *by reference* and the compositor re-reads its colour when it composites. So on
Avalonia the theme flip costs neither a rebuild (OpenSilver's advantage) nor a re-record (the cost
`decision.md` predicted for WPF, where "the same flip means invalidating every `OnRender` surface").

**That prediction was wrong for Avalonia, and it is worth saying so plainly** — the OpenSilver
decision record reasoned that retained composition buys the flip for free and immediate-mode does
not. Avalonia gets both: `Render(DrawingContext)` semantics *and* a free flip, because its immediate
mode records brush references rather than resolved colours. `Apply` over 22 tokens is 0.06 ms.

Screenshots `evidence/phase-4-shell-dark.png` and `evidence/phase-4-shell-light.png` are the same
shell either side of the flip: chrome, rail, project pane, editor ground, tab strips, World map boxes
and connections all repaint.

**One gap, honestly**: the editor's *syntax* colours do not flip. `ChordColorizer` holds its own
`SolidColorBrush` constants rather than `ThemeTokens`, so it keeps the dark palette on a light
ground. That is a wiring gap in the spike, not a framework limit — the same shared-brush trick would
fix it in one edit — and it is visible in the light screenshot.

## 4. `NativeMenu` — PASS

```
native menu: 2 top-level item(s) — File (4), Story (2)
```

`File` (New Story ⌘N · Open… ⌘O · separator · Save ⌘S) and `Story` (Build ⌘B · Run Tests ⌘U) appear
in the **macOS menu bar**, visible in both screenshots. This is a row where O6 differs from O5
outright: the OpenSilver spike's Phase 4 recorded no native `Menu` control at all.

## 5. What this phase does not establish

- **The felt comparison.** Reserved to David by the plan, and the reason for the two screenshots.
  The goal framing says this question is *not* deferrable for O6, since Avalonia's whole proposition
  is one codebase reaching the Mac too — so it stands open rather than being answered here.
- **Hit-testing beyond the basics.** Tab clicks and project-pane clicks are wired; the World map is
  not clickable, and the tab strip has no hover state.
- **Windows.** Every number above is the macOS backend. Phase 7.
- **The `×` close glyph, the dirty dot in use, and the rail's active tint** are drawn but not driven
  by real document state — the tab bar's `SetDirty` exists and is not wired to the editor's changes.
