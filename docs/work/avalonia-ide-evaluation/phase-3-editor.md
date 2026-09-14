# Phase 3 — the editor

**Plan**: `docs/work/avalonia-ide-evaluation/plan.md`
**Run**: 2026-09-14, session 356d47, macOS (Darwin 25.6.0, arm64)
**Spike code**: `/Users/david/repos/spikes/avalonia-ide/editor/` (the lexer service) and
`…/pane/PaneHost/Editor/` (the editor window and colorizer)
**Evidence in repo**: `evidence/phase-3-editor-log.txt`, `evidence/phase-3-editor.png`

**Route taken: (a) — AvaloniaEdit, natively drawn, driven by the real Chord lexer.** The plan's
fallback (b), CodeMirror in a `NativeWebView` pane, was not needed and was not built.

**Verdict: measured PASS on every mechanical row. The felt judgment is David's and is still open.**
On the same 1755-line file the WPF and OpenSilver spikes measured: **7.96 ms** per whole-document
style pass and **7.41 ms** per typed character — roughly twice as fast as the WPF/tree-sitter spike
(14.8–15.9 ms) and roughly eight times slower than CodeMirror in-process (0.92 ms / 1.09 ms).
Neither of the two costs that separate it from CodeMirror is inherent; §4 attributes them.

## 1. One grammar, and how it is reached (ADR-341 D4 / AC-5)

The question the plan put to this phase was whether a natively-drawn editor forces a **second
definition of Chord syntax** — the risk ADR-341's Context names. It does not, and no C# port was
written.

`packages/chord/src/lexer.ts` is bundled by the repository's own esbuild into a line-oriented Node
service and run under the **vendored Node the app already ships**:

```
node build.mjs
  dist/lexer-server.js  5.4kb   ⚡ Done in 4ms
  bundled 4 modules; chord sources: packages/chord/src/span.ts, lexer.ts, diagnostics.ts
```

The protocol is one JSON object per line over stdin/stdout — the same shape `@sharpee/bridge`
already uses for the engine (ADR-135), so this is the platform's existing idiom rather than a new
one. Tokens come back as a flat number array (kind index, line, column, end line, end column) plus
the comment-line numbers, because an array of token *objects* for this file is a quarter of a
megabyte of JSON per keystroke.

```
[   0.367s] lexer service: ready in 116 ms — packages/chord/src/lexer.ts under the vendored node,
            kinds=[word,number,string,colon,comma,lparen,rparen,lbracket,rbracket,lbrace,rbrace,compare,punct]
```

**What is still curated on the C# side, and honestly so**: which words are *keywords* and which are
*header properties*. The lexer has no keyword kind — keyword-ness is a display choice — so
`ChordColorizer` carries the same 41-word keyword set and 15-word property set that
`SyntaxHighlighter.swift` and the OpenSilver spike carry, copied rather than re-derived. That is a
third copy of a display list, not a third definition of the grammar; the distinction is the one
D4/AC-5 turns on, and it is worth stating plainly rather than claiming "one grammar" without
qualification.

## 2. What was built

- **`editor/src/lexer-server.ts`** — the service above. Comment lines (indent-0 `##`, ADR-249) are
  reported separately because the lexer gives them no tokens and the Swift highlighter colors them
  whole.
- **`Hosting/ChordLexerService.cs`** — spawns the service, reads its ready banner for the kind order,
  and serializes requests (one answer line per request, so two in flight would interleave).
- **`Editor/ChordColorizer.cs`** — an AvaloniaEdit `DocumentColorizingTransformer`. It rebuilds a
  per-line run index from the token array and colors through `ChangeLinePart`. Palette: `Theme.swift`
  dark values (`#CBA6F7` keyword, `#A6E3A1` string, `#FAB387` number, `#6C7086` comment), property
  teal `#94E2D5` this spike's choice — the same choices the OpenSilver spike made, so the two can be
  compared by eye.
- **`Editor/EditorWindow.axaml`** — a `TextEditor` with `ShowLineNumbers`, Menlo 13, the dark ground.

## 3. The measured run — `evidence/phase-3-editor-log.txt`

```
[   0.439s] loaded: measure-1755.story — 51984 chars, 1756 lines, 8545 tokens,
            658 styled runs, 29 comment lines, payload 141162 bytes
[   0.848s] style pass: 7.96 ms per pass over 50 passes
[   2.332s] typing: 200 single-character inserts at the end of the document —
            1482 ms wall, 7.41 ms per character (min 4.48, median 7.50, p90 9.77, max 12.06)
[   2.342s] select: 897:8–897:30 → from=22348 to=22370 text="phrase out-of-the-wind";
            first visible line after scroll-to = 874
[   2.358s] replace: 2:10–2:30 "The Folly at Fernhil" → "The Folly at Fernhill (edited)";
            length 51984 → 51994, hash e097d899
[   2.366s] undo: length 51984, hash 72cd60f0 — MATCH against the pre-edit document
[   2.366s] gutter: ShowLineNumbers=True, margins=2
[   2.367s] wrap: WordWrap=True set live, no reload
```

**8,545 tokens** is the same count the OpenSilver spike reported at load on the same file — the two
editors are reading the same lexer's output, which is the point.

| Feature (the WPF/WinUI3 spike's own list) | Result |
|---|---|
| Typing speed | 200 single-character transactions at the end of the 1755-line document: 1482 ms wall, **7.41 ms per character**, including the whole-document re-lex and re-index |
| Per-token highlighting | 8,545 tokens read, 658 styled runs built, 29 comment lines colored whole; keyword / string / number / property / comment classes |
| Style pass cost, whole document | **7.96 ms per pass** (50 back-to-back passes). WPF spike: 14.8–15.9 ms. OpenSilver/CodeMirror: 0.92 ms |
| Gutter / line-number ruler | `ShowLineNumbers=True`, two left margins installed |
| Span selection and scroll-to from outside | `select` 897:8–897:30 → `"phrase out-of-the-wind"`, identical to the OpenSilver spike's selection; `ScrollToLine(897)` put line 874 at the top |
| Programmatic undoable replace | `replace` 2:10–2:30 → 51,984 → 51,994 chars, hash `e097d899`; `Undo()` → length and hash back to `72cd60f0`, **MATCH** |
| Word wrap | `WordWrap = true` applied live, no reload |
| Save / reload | Not wired in this window; it is Phase 2's `ReadAllText`/`WriteAllText` plus the document's own text, both proven separately |

Screenshot `evidence/phase-3-editor.png` — the styled document held at line 897: `define` and
`phrase` in keyword mauve, prose plain, quoted speech in string green, `means` colored, the
line-number gutter, the dark ground, and the selection `phrase out-of-the-wind` on line 897. (The
status line still reads `starting…`; the harness never updates it, and the run log is what carries
the numbers.)

## 4. Where the 8 ms goes — and why it is not a verdict on AvaloniaEdit

The run attributes every pass to its three parts:

```
style pass breakdown (medians): lexer 0.49 ms inside node
                              | whole bridge round trip 3.93 ms (serialize + pipe + parse 8545 tokens)
                              | index rebuild 3.86 ms in C#
```

- **The lexer itself is 0.49 ms.** Chord lexing is not the cost, on either host.
- **The bridge is 3.93 ms** — JSON serialization in Node, the pipe, and `JsonDocument` parsing 141 KB
  into 42,725 integers in C#. This is the price of the *transport*, not of native rendering, and it
  is the part a real implementation would attack first (a binary frame, or sending only the changed
  line range instead of the whole document).
- **The index rebuild is 3.86 ms** — walking every token, reading each word token's text back out of
  the document to test it against the keyword set, and rebuilding the per-line dictionary. Also
  whole-document work on every keystroke, also avoidable: the edit touched one line.

So the comparison to state in Phase 6 is **7.96 ms of which 0.49 ms is the language**, against
CodeMirror's 0.92 ms — and both are measured the same way, whole document per keystroke. The honest
reading is that AvaloniaEdit's own drawing is nowhere in the measurement; what separates the two
numbers is an unoptimized IPC and an unoptimized index, both of which this phase deliberately left
naive so the number would be comparable in *kind* to the other two spikes rather than flattered.

Against the WPF spike the comparison is cleaner: 7.96 ms against 14.8–15.9 ms, both native editors
re-doing the whole document per keystroke, and this one carrying the *real* grammar while the WPF
spike carried tree-sitter.

## 5. What this phase does not establish

- **How typing feels.** The plan reserves this to David explicitly, and it is not inferable from
  7.41 ms. What would settle it is sitting in the window and typing into it.
- **Incremental lexing.** Every pass here is whole-document by design (§4).
- **Diagnostics in the gutter, bracket matching, completion.** Not in the parity table's editor rows
  and not built.
- **The Windows backend.** Phase 7.
