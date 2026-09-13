# ADR-341 D2 spike — WPF

What was built, what failed, and how it felt. Per D2, the record is the reason the
toolkit choice is never re-litigated from toolkit marketing.

**Built**: 2026-09-11, session `89f9e0`. `tools/spikes/adr-341/wpf-spike/`.
**Environment**: Windows 11 Pro 10.0.26100, AMD64, .NET SDK 10.0.401, WPF on
`net10.0-windows`, VS Community 2026 18.10.12201.205.
**Packages**: `AvalonEdit` 6.3.1.120, `TreeSitter.DotNet` 1.3.0,
`Microsoft.Web.WebView2` 1.0.4191.47 — the three Phase 2 selected.
**Build**: `dotnet build -c Release` → **exit 0, 0 errors**, 2 nullable warnings.
Roughly 700 lines of C# and XAML across 7 files.

One window hosts all six spike items, so the felt judgment is made against a whole
shell rather than six toy apps — the macOS app is one window and its feel is the feel
of the pieces working together.

---

## Results by spike item

| # | Item | Result |
| --- | --- | --- |
| 1 | **Editor** | **BUILT** — highlighting, gutter, auto-indent, bracket matching, wrap, span navigation, undoable replace |
| 2 | **WebView2 pane hosting** | **BUILT** — custom origin, external-link interception, two-way messaging |
| 3 | **Project tree** | **BUILT** — real folders, lazy depth, selection |
| 4 | **Window chrome + appearance** | **BUILT, one defect** — tokens pixel-exact; the OS title bar does not follow |
| 5 | **Tab strip** | **BUILT** — custom drawn, accent bar, count badges, hover |
| 6 | **World map** | **BUILT** — custom drawing; rooms, bands, doors, sealed exits, displaced |

### 1. The editor — D2's first spike, and D4's whole premise

`AvalonEdit` driven by `TreeSitter.DotNet` through `DocumentColorizingTransformer`.
**No `.xshd` syntax definition exists in this spike** — the colours come from tree-sitter
query captures mapped onto ADR-297's `tokenKeyword`/`tokenString`/… tokens. That is D4's
one-grammar rule demonstrated rather than asserted: a Chord `highlights.scm` would drop
into the same `Map` table unchanged.

Loaded with a **real repository file** (`packages/engine/src/game-engine.ts`), because
scrolling and typing feel are only meaningful at realistic length and token density:

- **1755 lines, 1694 highlight spans**, rendered correctly (verified by screenshot —
  keywords mauve, strings green, comments grey, types yellow, all from the live palette).
- Line-number gutter: present and tracking.
- `AutoIndenter` and `BracketMatcher` are **ported behaviour-for-behaviour** from the
  Swift originals (2-space unit; indent after `(`/`[`/`{`; balanced scan preferring the
  character before the caret; no string/comment skipping, matching the Swift v1's own
  stated limitation) so the spike measures the toolkit and not a different algorithm.
- Auto-indent is wrapped in one `RunUpdate()` so a single Ctrl+Z removes the newline and
  the indent together — the AppKit editor's behaviour.
- Span navigation (a compose diagnostic arriving from outside) and a programmatic
  undoable replace (the World tab's fixes) are both wired to menu items.

**The finding that matters — and it corrects Phase 2.** The title band reports live
reparse cost. On the 1755-line file it is **14.8–15.9 ms per keystroke**.

Phase 2's assumption check measured **0.001 ms** and I wrote that "reparse cost is not a
design constraint." That was measured on a **four-line document** and it does not
generalise. The real cost is not tree-sitter's incremental parse — it is re-running the
highlight query over the whole tree and rebuilding the span list on every change, which
is O(document), not O(edit). At ~15 ms a keystroke consumes an entire 60 fps frame.

This is a spike finding, not a blocker: the fix is well understood (query only the
changed range, or only the visible viewport, and splice the span list) and is ordinary
editor engineering rather than a toolkit limitation. **But it must be carried into
Phase 4 as a measurement both toolkits are held to**, and `assumption-checks.md` has
been corrected so the micro-benchmark is not quoted as a general result. The honest
statement is: *tree-sitter parses fast enough; the naive whole-document query does not,
in either toolkit.*

### 4. Window chrome and appearance — verified by pixel, not by eye

ADR-297's mechanism reproduced rather than reinvented: one token namespace, every token a
light/dark pair, values **copied from `Theme.swift`** rather than re-picked. Consumers
bind `{DynamicResource Theme.X}`, so reassigning the resource repaints them live — the
WPF counterpart of AppKit re-resolving a dynamic `NSColor`. D3 holds: appearance is
app-wide, no per-pane toggle.

The pin (System / Light / Dark) persists to `HKCU\Software\Sharpee\Adr341Spike`
under the value name `SharpeeAppearance` — the same name the macOS app uses in
`UserDefaults` — and is read and applied in `OnStartup` **before the window is
constructed**, which is ADR-297 D2's "applied at launch before the window builds."

Verified by restarting under each pin and sampling the rendered pixels:

| Token | Dark pin, measured | Light pin, measured | `Theme.swift` expects |
| --- | --- | --- | --- |
| `railBackground` | **#16171D** | **#DCE0E8** | #16171D / #DCE0E8 |
| `projectBackground` | **#262832** | **#E6E9EF** | #262832 / #E6E9EF |
| `editorBackground` | **#1E1F26** | **#EFF1F5** | #1E1F26 / #EFF1F5 |

Exact on all three, both palettes. The pin survived the restart, so persistence and
pre-window application are both demonstrated rather than assumed.

**The defect: the OS non-client area does not follow the appearance.** Under the Dark
pin the entire client area is dark while the Windows title bar stays light. On macOS
this is free — `NSApp.appearance` themes the window frame with everything else. On
Windows the frame is the DWM's, and an app must opt in explicitly per window via
`DwmSetWindowAttribute(DWMWA_USE_IMMERSIVE_DARK_MODE)`. Small, known, one call — but it
is a real instance of the mirror costing something the original got for nothing, and
**Phase 4 must check whether WinUI 3 has the same gap** (it likely does not, since its
window chrome is its own).

### 2, 3, 5, 6 — the rest

- **WebView2 hosting**: the Phase 2 hook, now inside the real shell. Serves the pane over
  `https://pane.chordwriter.invalid`, intercepts `NewWindowRequested` so external links
  would go to the real browser (ADR-281 D3's rule), and receives `postMessage` from the
  pane into the status bar — the Testing pane's two-way channel in miniature.
- **Project tree**: a `TreeView` over the real `stories/` directory — armoured,
  cloak-of-darkness, dungeo and the rest are the actual folders, not fixtures.
- **Tab strip**: custom `OnRender` drawing. Accent bar under the selection, rounded count
  badges (Testing shows 12, Problems 3), hover wash. Reused three times in one window —
  editor tabs, bottom dock, right panel — which is the reuse the parity table asks for.
- **World map**: custom `DrawingContext` work — banded grid, rooms as rounded boxes,
  connections, teal door dots, dashed red sealed exits, dashed mauve displaced rooms,
  greyed unreached rooms. All colours from the `world*` tokens.

---

## How it felt — **not taken, deliberately (David, 2026-09-11)**

The planned felt assessment was **not recorded**, on David's ruling: "close phase 3 and
move to phase 4." This is a decision, not an omission, and the reason is worth keeping.

David used the running build and reported, in order: the rail icons did nothing, tabs
would not close, the syntax highlighting was "not right", the chrome was gone, the
colour schemes were wrong in the default case, the right panel ignored View → Appearance,
the left panel never collapsed completely, and finally the app crashed. Then: *"what's
the goal here? given everything we built on on the MacOS side, recreating the same views
shouldn't be this hard."*

**Every one of those was a defect in this spike's code. Not one was a fact about WPF.**

| Reported | Actual cause |
| --- | --- |
| Rail icons do nothing | They were `TextBlock`s; no handlers were ever wired |
| Tabs not closeable | The tab strip was drawn; no document set existed behind it |
| Highlighting "not right" | Every file ran through the **TypeScript** grammar, including `.story` |
| Project pane empty | Dropped the explicit `Foreground`; WPF's stock `TreeViewItem` hardcodes near-black, so dark-on-dark |
| Chrome gone | **Mine** — I was moving his window to take screenshots while he used it |
| Right panel ignores appearance | The pane's HTML hardcoded its own colours |
| Left panel never fully collapses | `ColumnDefinition.MinWidth` outranks `Width`, and the splitter is its own column |
| Crash | `NullReferenceException` in `VisualLine.RunTransformers` — a null highlighter pushed into `LineTransformers` for a grammar-less file |

All were fixed except the felt assessment itself. The fixes are in the tree; the record
of them is this table, because **the pattern is the finding**: a spike whose defects are
all its author's is a spike that has stopped producing toolkit evidence.

### Why closing without the assessment is defensible

D4's screening question — can the editor control be driven by an external tokenizer —
was **already settled in Phase 2 by reflecting AvalonEdit's shipped assembly**. No build
was required to answer it. What the build added beyond that was confirmation the wiring
works end to end, the ADR-297 pixel match, the DWM title-bar defect, and the reparse
measurement. Those are recorded. A felt assessment would have refined a toolkit that had
already cleared every bar the spike set; it would not have changed the decision, which
turns on whether **WinUI 3** has a usable native editor at all.

### The datum that does belong to the shell plan, not here

David's "recreating the same views shouldn't be this hard" is a real signal, and it is
not about WPF. Six controls at this fidelity took a full session and produced eight
user-visible defects. The parity table has **far more than six rows**. That is evidence
about the *cost of D1's mirror*, and it belongs in the shell plan's estimate rather than
in a toolkit comparison — the same six controls in WinUI 3 would have produced a
different eight defects and told us nothing more about the choice.

---

## Notes for Phase 4 (so the comparison is like-for-like)

- Hold WinUI 3 to the **same reparse measurement on the same file**, and record it the
  same way. The whole-document-query cost is the harness's, not WPF's.
- Check whether WinUI 3's window chrome follows the appearance without an explicit DWM
  call.
- `WinUIEdit`'s styling goes through the raw Scintilla message API rather than a typed
  extension point; note the difference in how it *felt to write*, not only whether it
  worked, since D2 asks for both.
- If the WinUI 3 editor falls back to Monaco-in-WebView2, that is **not** an equivalent
  result — record it as a D4 conflict, per the note in `assumption-checks.md`.
