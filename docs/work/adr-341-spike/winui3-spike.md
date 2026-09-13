# ADR-341 D2 spike — WinUI 3

Same shape as `wpf-spike.md`, so Phase 6 can compare row by row.

**Built**: 2026-09-11, session `89f9e0`. `tools/spikes/adr-341/winui3-spike/`.
**Environment**: Windows 11 Pro 10.0.26100, AMD64, .NET SDK 10.0.401, unpackaged
WinUI 3 on `net10.0-windows10.0.22621.0`.
**Packages**: `Microsoft.WindowsAppSDK` **2.4.0**, `WinUIEdit` **0.0.5-prerelease**,
`TreeSitter.DotNet` 1.3.0.
**Build**: `dotnet build -c Release` → **exit 0, 0 errors**.

**Scope was deliberately narrowed before starting** (see `plan.md` Phase 4). Phase 3
built six controls at product fidelity and every defect it produced was its author's,
not WPF's. Rebuilding six controls here would produce a different set of author defects
and discriminate nothing. This phase built only what differs between the toolkits.

**Note on ADR-341's Context**: it records "Windows App SDK 1.8 stable with 2.0 in
preview". As of this check **2.4.0 is stable**. Not a decision change; the ADR's
snapshot has simply aged.

---

## Results

| # | Item | Result |
| --- | --- | --- |
| 1 | **Editor, external tokenizer (decisive)** | **PASS** — tree-sitter drives Scintilla container lexing |
| 2 | **Custom drawing** | **PASS, different model** — no `OnRender`; composed from `Canvas` + `Shapes` |
| 3 | **Window chrome / appearance** | **PARTIAL** — client area yes; **title bar does not follow**, same as WPF |
| 4 | **Reparse/restyle on the same file** | **14.5–15.4 ms** — statistically identical to WPF |
| 5 | WebView2 hosting | Not re-run; same control, Phase 2 proved the hook |

### 1. The editor — **PASS**, and it settles D4 for both toolkits

`WinUIEdit`'s `CodeEditorControl` exposes the whole Scintilla API as a WinRT
projection — **1003 public members**, read out of the shipped `.winmd`. Container
lexing works:

```
Editor.ResetLexer();
ed.SetILexer(0);                 // styling belongs to the container now
ed.StyleSetFore(style, colour);  // ADR-297 tokens, converted to Scintilla BGR
ed.StartStyling(offset, 0);
ed.SetStyling(length, style);
```

Verified by screenshot under both palettes: keywords in the ADR-297 mauve, strings
green, comments grey, **with no built-in lexer active** — every colour on screen came
from a tree-sitter query.

**This corrects `assumption-checks.md`.** Phase 2 said WinUIEdit's styling was reachable
"through a raw message interface rather than a typed extension point", inferred from its
README's mention of `SendMessage`. That is wrong: `SetILexer`, `StartStyling`,
`SetStyling`, `StyleSetFore`, `StyleClearAll` are all **typed WinRT methods**.
`SendMessage` is the escape hatch, not the route.

**So D4 is satisfiable on both toolkits, and the editor does not decide the choice.**
That was the question this phase existed to answer, and the answer removes the
asymmetry Phase 2's table implied.

**Two findings worth keeping:**

**Styling from the constructor silently does nothing.** `CodeEditorControl` initialises
its own styles when it loads and overwrites anything set earlier. The failure mode is
nasty: the style pass still runs and still reports a time, so it looks like "styling had
no effect" rather than "styling was undone". Moving the setup to `Editor.Loaded` fixed it.

**Scintilla styles byte ranges; tree-sitter yields UTF-16 indices.** They coincide for
ASCII, which this file is. A real editor needs an index map. Noted, not built — shell work.

**Also unresolved here**: the line-number margin keeps its own style
(`STYLE_LINENUMBER`, 33) and stayed white under the dark palette, because only style 0
and the token styles were set. One more call; recorded because it is the kind of detail
that makes a mirror look unfinished.

### 2. Custom drawing — **PASS, but a genuinely different model**

The real difference between the toolkits, and the one that will be paid on every custom
control in the parity table.

| | WPF | WinUI 3 |
| --- | --- | --- |
| API | override `OnRender`, get a `DrawingContext` | no equivalent |
| Style | immediate-mode draw calls | compose retained elements, or add Win2D |
| Tab strip | 4 `DrawingContext` calls in one method | `Rectangle` + `TextBlock` per visual, positioned on a `Canvas` |
| Hit-testing | hit-test rects computed in `OnRender` | a transparent `Rectangle` per tab with its own handler |
| Text measuring | `FormattedText` gives width directly | construct a `TextBlock`, call `Measure`, read `DesiredSize` |

Both produce the right picture — the World map renders rooms, banded grid, teal door
dots, dashed red sealed exits and the dashed mauve displaced room in both. But WinUI 3
turns every drawn mark into a **retained visual with a layout pass behind it**. For the
World map that means one element per room, per label, per link, per band, where WPF
issued one draw call each. Win2D (`Microsoft.Graphics.Win2D`) would restore immediate
mode at the cost of another dependency; this spike deliberately took the no-extra-
dependency path a WinUI 3 developer reaches for first.

### 3. Window chrome and appearance — **PARTIAL, and it corrects a Phase 3 guess**

Phase 3 found that WPF needs an explicit `DwmSetWindowAttribute(DWMWA_USE_IMMERSIVE_
DARK_MODE)` for the title bar, and predicted WinUI 3 "likely does not have that gap,
since its window chrome is its own."

**That prediction was wrong.** Measured under a Dark pin:

- First attempt: title bar `#EFF4F9`, map background `#FEFEFE` — **the whole app
  ignored the pin**. WinUI 3 themes from `RequestedTheme`, not from a custom token
  table, and ADR-297's dual-palette system is a parallel mechanism that must be
  connected to it explicitly.
- After setting `Root.RequestedTheme` and the token backgrounds: the client area is
  correctly dark throughout — editor, map, tab strip, status bar.
- **The title bar is still `#EEF4F9`.** An unpackaged WinUI 3 `Window` does not theme
  its own caption from `RequestedTheme`; it needs `AppWindow.TitleBar` customisation
  or `ExtendsContentIntoTitleBar`.

**So both toolkits need explicit work for the title bar.** This is no longer a point of
difference, and Phase 6 must not carry it as one.

**One real difference remains, in WPF's favour.** WPF's `{DynamicResource}` repaints
consumers automatically when a resource is reassigned — that is what made ADR-297's live
flip a single `Theme.Apply()` call. WinUI 3 has no `Freeze`, and `{ThemeResource}` /
`{StaticResource}` do not re-resolve on assignment, so a **live** flip means rebuilding
the visuals that use the tokens. Applying the pin at startup works on both; flipping it
while running is materially cheaper on WPF.

### 4. The measurement that settles Phase 3's correction

Same file (`packages/engine/src/game-engine.ts`, 1755 lines), same whole-document
parse-and-style pass:

| Toolkit | Style pass |
| --- | --- |
| WPF (AvalonEdit + `DocumentColorizingTransformer`) | 14.8 – 15.9 ms |
| WinUI 3 (WinUIEdit + Scintilla container lexing) | **13.5 – 15.4 ms** |

**Statistically identical**, across two completely different editor controls and two
different styling APIs. That confirms Phase 3's correction from the other side: the cost
is the O(document) highlight query in *my* harness, not either toolkit and not either
editor. The strikethrough in `assumption-checks.md` is the right record.

Worth noting for the shell plan, not for the choice: Scintilla exposes `StyleNeeded`, a
container-lexing callback that asks for a **range**, so the range-scoped fix is built
into its model. AvalonEdit's `ColorizeLine` is per-line and offers the same opportunity.
Both make the fix easy; neither was the problem.

### Memory

| | Working set |
| --- | --- |
| WPF spike | **105 MB** |
| WinUI 3 spike | **152 MB** (201 MB on one earlier run) |

Same machine, same file, comparable content. Roughly 50% more for WinUI 3. One
measurement, not a benchmark — but it points the same way as the drawing model does.

### Developer experience, since D2 asks for it

**One C# error produced three.** A wrong overload (`StyleSetFont`) failed the C#
compile, which left the XAML markup compiler without a LocalAssembly for pass 2
(`WMC1509`), which reported `Unknown type 'TabStrip'` and `Unknown type 'WorldMap'` —
two errors that look like a XAML namespace problem and are not. Fixing the single C#
error cleared all three. Same-project custom controls resolve fine.

**Hand-writing the project was necessary.** The Windows App SDK ships no `dotnet new`
templates (they are Visual Studio templates), so the `.csproj`, `app.manifest` and
`App.xaml` were written by hand. Not hard, but it is friction WPF does not have — a
WPF project is `dotnet new wpf`.

**The dependency graph is stricter.** Pinning `Microsoft.Windows.SDK.BuildTools`
explicitly produced an `NU1605` downgrade error against what App SDK 2.4.0 requires;
letting it come in transitively was the fix. Incidentally this **answers Phase 0's open
question for Phase 5**: the packaging tools arrive through NuGet, so the missing Windows
10/11 SDK install is not the blocker it looked like.

---

## What this phase did **not** build

The project tree, tab close boxes, pane collapse, document sets, save/reload, WebView2
hosting. All were product fidelity in Phase 3 and would be product fidelity here. The
plan records the narrowing and the reason before the work started, not after.

## The asymmetry — read this before comparing the two records

David's assessment on seeing this build: **"that last test was pretty raw."** It is, and
Phase 6 must not let that count against WinUI 3.

| | WPF spike | WinUI 3 spike |
| --- | --- | --- |
| Controls built | six | three |
| Project tree, file tabs, save/reload, WebView2 | yes | **no** |
| Unstyled line-number gutter, map clipped at the window edge | fixed | **left as-is** |
| Time spent in the app by David | most of a session | **none** |
| Defects found through use and fixed | eight | **zero, because nobody used it** |

This is the deliberate consequence of narrowing Phase 4's scope, and the narrowing was
right — Phase 3 proved that building the sixth control teaches nothing about the
toolkit. But it leaves the two records unequal in a way that is easy to misread.

**What is genuinely comparable**, because it was measured the same way on both: the
style-pass timing, working-set memory, whether an external tokenizer can drive the
editor, the drawing model, the title-bar behaviour, and the dependency/tooling friction.
Every claim Phase 6 should weigh comes from that list.

**What is not comparable**: how finished either felt. The WPF build looks better because
more of it exists. Read as toolkit evidence, "the WinUI 3 one felt raw" is a fact about
how much was built, not about WinUI 3 — and it is the most vivid thing in this document,
which is exactly why it is flagged here rather than left to be absorbed silently.

If Phase 6 ends up genuinely tied and a felt comparison would break the tie, the only
honest way to get one is to bring the WinUI 3 build up to the WPF build's level and use
both. That is a real cost and should be a deliberate decision, not something inferred
from two records of unequal depth.

## Read for Phase 6

The editor question — the one D2 ordered spiked first, and the one Phase 2's table
implied would decide it — **came back level**. Both toolkits drive a native editor from
one tree-sitter grammar, at the same speed, satisfying D4.

What is left is not one decisive fact but a set of smaller ones, and they do not all
point the same way:

- **For WPF**: a mature, stable editor control against a `0.0.5-prerelease` that
  self-declares "breaking API changes are very likely"; immediate-mode drawing for the
  custom controls; a live theme flip for free; ~50% less memory; `dotnet new wpf`.
- **For WinUI 3**: Microsoft's stated current direction; a native control whose whole
  Scintilla surface is typed and projected; chrome that is its own rather than Win32's.
- **Level**: the editor/D4 question, the style-pass cost, and the title bar.

Phase 6 makes the call on this evidence, and David breaks the tie if it is one — D2 says
the toolkit whose spikes pass is the toolkit, and on the spikes as run, **both pass**.
