# 02 — Architecture

**Created**: 2026-09-11
**Status**: EXPLORATORY

## The fork that decides everything (D1)

Two shapes were considered:

1. **Canvas owns a project model; `.story` is an export target.**
2. **`.story` text is the source of truth; the canvas is a projection over it
   and edits it surgically.**

Taken: (2).

Reason (1) was rejected: Chord is layout-significant and the parser
deliberately discards `##` comment runs ("contributes nothing", `chord.ebnf`
§Comments). An editor that reprints the file from a model will quietly eat
authored structure — comment runs, blank-line paragraph boundaries, the
distinction between a blank line inside a body (paragraph break) and a blank
line in a `create` block (ends the block). It also forks the file format's
future: Chord Writer and the iPad app would drift.

## What "surgical" means

The canvas manipulates **ranges in the text**. A gesture resolves to one or
more inserts/replacements at byte offsets; anything the canvas does not
understand is never touched.

Worked example — dropping `lockable` on the oak door, then setting its initial
state, is two inserts on one line:

```
create the oak door
    a door
    a door, lockable with the iron key
    a door, lockable with the iron key, starts locked
```

Both inserts are one undo step. The rest of the file is byte-for-byte
unchanged, including the author's comments and blank lines.

This requires a CST (or at minimum a range-annotated AST) rather than the
current lossy AST: every card on the canvas carries the source range it came
from, which is also how canvas ↔ source selection is a lookup rather than a
re-parse, and how a diagnostic lands on the right icon.

### Graceful degradation

Because the canvas edits ranges rather than owning the document, a construct
the canvas cannot draw is not a problem — it renders as a read-only source
card and is left alone. The language can outrun the UI without breaking
anyone's file. Given Chord is still landing ADRs in the 330s, this is not a
nicety.

## Projection cards

Most cards correspond to exactly one block. The **Start Card** (D6) does not:
it is a projection across three places in the file.

```
story
    prologue: <the first words>

before the game starts
    change the player to Wren
end before

create Wren
    starts in the Kitchen
    carries Gran's note
```

One card, three ranges, one undo step. This is the first real stress test of
the projection model and the place where range drift will show up first — a
hand edit in Chord Writer between sessions moves the ranges underneath.
See `07`.

## Coordinates (D7)

Chord has no notion of where a room sits on a canvas, and adding one to the
language was not considered. Card positions ride in a `##` comment run in the
file itself:

```
## chord-canvas: start 90,56 · Kitchen 90,228 · Pantry 520,228
## chord-canvas: Back Garden 90,486 · Cellar Stairs 520,486
## chord-canvas: oak door 352,150
```

Legal exactly where comment runs are legal (between top-level constructs,
blank-delimited). Contributes nothing to the parse. Consequences:

- No sidecar file to lose, and no project wrapper.
- Chord Writer opens the same file none the wiser.
- A story opened from someone else's file arrives with *their* layout, not a
  re-run of a graph-layout algorithm. The story looks the way its author
  arranged it.

Unresolved: the exact key format, what happens to the run when a room is
deleted, and whether a run that has gone stale is repaired silently or left
alone.

## Play

Play is nearly free, because the seam already exists. The story header carries
`client:`, `theme:`, `template:`, `default-theme:` and `storage-prefix:`
(ADR-252 D3, folded into the closed schema by the ADR-298 amendment) — a
browser build target that ships today.

```
.story → parse/analyze → IR → existing browser client in a WKWebView
```

No server round trip, no second runtime. If the parser and analyzer run in the
same JS context, the SwiftUI canvas talks to them over a JSON bridge and gets
back `parse.*` / `analysis.*` codes with ranges, which it badges directly onto
the offending card. The diagnostic vocabulary is already stable and
UI-mappable — an unusual asset and the reason `05` is cheap to build.

## Shape, if it proceeds

- SwiftUI for canvas, drag, Pencil, inspector — the things that want native.
- A hidden WKWebView hosting parser, analyzer, compiler and the story client.
- A JSON bridge carrying: edit ranges up, diagnostics and IR down.

The open architectural question is not this split; it is whether the CST and
range-tracking work belongs in `packages/chord` (shared with Chord Writer) or
in the app. It should be the former.
