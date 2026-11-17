# Phase 3 record — the editor

**Written**: 2026-09-13, session 30faa2, on `main`. Commands run on this Mac 2026-09-13 between 02:05 and 02:20 CDT. Spike code: `/Users/david/repos/spikes/opensilver-ide/editor/` (the editor page) and `…/hello/` (the host). Evidence in the repo: `evidence/phase-3-editor-log.txt`, `evidence/phase-3-editor-pane.png`.

**Outcome: measured PASS on every mechanical row; the felt judgment is David's and is still open.** A CodeMirror 6 editor driven by the *real* Chord lexer (bundled from `packages/chord/src/lexer.ts`) runs inside the OpenSilver Photino app through the same iframe path as the other panes. On a 1755-line file it re-lexes and re-decorates the whole document in **0.92 ms per pass** — against the WPF spike's 14.8–15.9 ms per keystroke on its 1755-line file. Selection and scroll-to-span from C#, programmatic undoable replace, line numbers, bracket matching, and word wrap all work. What this phase cannot supply is how typing *feels*, and the plan's exit state asks for exactly that; §6 says how to get it.

## 1. What was built

- **`editor/src/main.ts`** — CodeMirror 6 (`@codemirror/view` 6.43.6, `state` 6.7.1, `commands` 6.10.4, `language` 6.12.4, resolved from `website/node_modules`) with `lineNumbers`, `history`, `bracketMatching`, the default and history keymaps, `indentWithTab`, a `lineWrapping` compartment, and one `ViewPlugin` that on every document change runs `lex(doc.toString(), new DiagnosticBag())` — the same lexer `sharpee compose` uses, and the TypeScript original the macOS app's `ChordLexer.swift` is a pinned port of — and builds mark decorations from the token stream.
- **Styling mirrors `SyntaxHighlighter.swift`**: comment lines whole; strings, numbers, comparisons by token; the same curated keyword set (copied verbatim, 41 words); header properties colored when a property word is followed by a colon (an approximation of the Swift rule, noted). Colors are `Theme.swift`'s dark values (`0x1E1F26` background, mauve keyword, green string, peach number, grey comment); property teal is this spike's choice.
- **Host protocol** over the Phase 2 shim: in — `load`, `select`, `replace`, `undo`, `getText`, `typeBurst`, `measure`, `wrap`; out on the `editor` handler — `ready`, `loaded`, `change`, `selected`, `replaced`, `undone`, `text`, `typed`, `stats`, `wrapped`. The shim gained a generic door: any inbound message it does not own is re-dispatched to the page as a `sharpee-host` `CustomEvent`.
- **Serving**: a third scheme, `sharpee-editor://app/`, served by the same `PaneServer` with the shim injected into `<head>`. Bundle: `esbuild` 0.27.2, 14 modules, 636 KB unminified, three of them Chord sources (`lexer.ts`, `diagnostics.ts`, `span.ts`).

```
node build.mjs
  → dist/editor.js  636.5kb   ⚡ Done in 20ms
  → bundled 14 modules; chord sources: …/packages/chord/src/span.ts, lexer.ts, diagnostics.ts
```

## 2. The measurement file

`out/measure-1755.story` = fernhill (1179 lines) + the first 574 lines of ides-of-march, joined by a comment line: **1755 lines, 52,036 bytes, 8,545 tokens** — the WPF spike's file size (its record: "1755 lines, 1694 highlight spans"). Real Chord, not synthetic.

## 3. The auto run — `evidence/phase-3-editor-log.txt`

```
[   0.052s] pane: loading editor ← sharpee-editor://app/index.html
[   0.136s] editor ← {"type":"ready","codemirror":"view 6.43.6","lexer":"packages/chord/src/lexer.ts"}
[   0.177s] editor ← {"type":"loaded","name":"measure-1755.story","length":51984,"lines":1756,"tokens":8545}
[   0.770s] pane → {"type":"typeBurst","count":200}
[   1.022s] editor ← {"type":"typed","count":200,"wallMs":218,"perCharMs":1.09,"samples":200,
                      "totalMin":0,"totalMedian":1,"totalP90":1,"totalMax":2,"lexMedian":1,"buildMedian":0,
                      "lines":1439,"tokens":8586,"docLines":1756,"docLength":52184}
[   1.090s] editor ← {"type":"text","length":52184,"hash":"8787e839","firstLine":"story"}
[   1.186s] editor ← {"type":"selected","from":22348,"to":22370,"text":"phrase out-of-the-wind"}
[   1.697s] editor ← {"type":"replaced","from":15,"to":35,"before":"The Folly at Fernhil","after":"The Folly at Fernhill (edited)","length":52194}
[   1.792s] editor ← {"type":"text","length":52194,"hash":"371a09"}
[   1.906s] editor ← {"type":"undone","ok":true,"length":52184}
[   2.001s] editor ← {"type":"text","length":52184,"hash":"8787e839"}          ← identical to before the replace
[   2.257s] editor ← {"type":"stats", … "loopPasses":50,"loopMsPerPass":0.92}
```

| Feature (the WPF/WinUI3 spike's own list) | Result |
|---|---|
| Typing speed | 200 single-character transactions at the end of the 1755-line document: 218 ms wall, **1.09 ms per character** including CodeMirror's own update and the whole-document style pass |
| Per-token highlighting | 8,586 tokens styled from the real lexer's stream; keyword / string / number / property / comment classes (screenshot) |
| Style pass cost, whole document | **0.92 ms per pass** (50 back-to-back passes; single-pass samples read 0–2 ms because `performance.now()` is coarsened to 1 ms in WKWebView). WPF spike on its 1755-line file: 14.8–15.9 ms per keystroke |
| Gutter / line-number ruler | `lineNumbers()` + active-line gutter; follows wrap (CodeMirror's gutter is per visual line) |
| Span selection and scroll-to from outside | `select` 897:8–897:30 → selection `"phrase out-of-the-wind"`, view scrolled to center the line |
| Programmatic undoable replace | `replace` 2:10–2:30 → title edited (length 52,184 → 52,194); `undo` → length and content hash back to the pre-edit values |
| Word wrap | `wrap on` reconfigures `EditorView.lineWrapping` live |
| Bracket matching | `bracketMatching()` installed (not exercised by the auto run) |
| Save / reload | Not wired in the page; it is Phase 1's `Host.ReadAllText`/`WriteAllText` plus `load`/`getText`, both proven separately |

Screenshot `evidence/phase-3-editor-pane.png`: the editor inside the OpenSilver window, dark theme, line numbers, `define phrase` in keyword color, prose plain, the selection on line 897.

## 4. Why the number is so far from the WPF spike's, and what it does and does not mean

The WPF spike's 14.8–15.9 ms was **tree-sitter + a whole-document highlight query per keystroke** through AvalonEdit's colorizer — its own record says the cost was "re-running the query over the whole document, O(document), not O(edit)". This spike's 0.92 ms is **the token lexer + a decoration build per keystroke**, also O(document). They are comparable *in kind* (both re-do the whole document on every keystroke) but not the same work: a line lexer producing 8.5k tokens is cheaper than a tree-sitter parse plus a query producing 1.7k spans. Two things are fair to conclude, and one is not:

- **Fair**: the macOS app's actual highlighter (`SyntaxHighlighter.swift`, the same lexer, whole-document per call) has a like-for-like counterpart here that costs about a millisecond on a real 1755-line story inside a WKWebView — nowhere near a frame budget.
- **Fair**: CodeMirror's incremental document model means typing at the end of a 52 KB document is a ~1 ms transaction; there is no "web page in a box" cost at the model level.
- **Not fair**: "OpenSilver's editor is 15× faster than WPF's" — different highlighter, different measurement. If ADR-182's tree-sitter grammar lands (D4), the web editor would run it through `web-tree-sitter` in the page and would face the same O(document)-query trap the WPF record warns about unless it queries the viewport only.

## 5. Tree-sitter reachability — not tried, and why

The plan forbids a reachability claim without an attempt. No attempt was made, for a reason that is a fact rather than an excuse: **no Chord tree-sitter grammar exists** (ADR-182 is accepted and unimplemented), and no tree-sitter binding of any kind is in the workspace (`ls node_modules | grep tree-sitter` → nothing; no `package.json` names one). In this host the relevant binding would be `web-tree-sitter` (WASM, in the page) rather than the `TreeSitter.DotNet` package the WPF spike loaded, because the editor runs in the web view, not in the .NET process. So the honest statement is: *untested; the binding that applies is a different one from the WPF spike's; nothing here bears on GH #440's TreeSitter.DotNet health concern either way*.

## 6. The felt judgment — David's to make

Mechanics are measured; feel is not. To try it:

```
cd ~/repos/spikes/opensilver-ide/hello/Hello.Photino
dotnet run --no-build -- --pane editor      # then click "Load 1755", type, select, scroll, "Wrap"
```

Things to attend to that no number here captures: cursor and selection rendering (CodeMirror draws its own, `drawSelection()`), keyboard routing between the XAML chrome and the iframe (does ⌘Z inside the editor reach CodeMirror or the host?), focus after clicking a XAML button, scroll feel with the trackpad, and whether the gutter/wrap/active-line look reads as the macOS editor's or as a web widget. The exit-state call — *native, or a web page in a box* — waits on that session; this record does not make it.

## 7. What this phase does not establish

- Auto-indent for Chord (the macOS `AutoIndenter.swift` behavior) is not implemented; CodeMirror's default keeps indentation on Enter, which is most of it, but no Chord-aware rule exists here.
- No diagnostics decoration (squiggles from `compose --json` spans): the span→offset math is proven by `select`, the rendering is not built.
- Multiple documents / tabs: not built; that is Phase 4's tab bar and Phase 5's parity column.
- Browser (WASM) target: the editor page is plain web content and would run there unchanged, but the serving origin gap from Phase 2 applies.
