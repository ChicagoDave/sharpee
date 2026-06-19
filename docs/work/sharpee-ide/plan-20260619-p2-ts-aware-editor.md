# P2 Kickoff — TS-Aware Editor

**Date:** 2026-06-19
**Branch:** TBD (`ide/p2-ts-aware-editor` suggested)
**Status:** IN PROGRESS — engine decided (Option B, tree-sitter); spike 2.0 ✅ complete & green
**Roadmap:** `docs/work/sharpee-ide/plan-20260509-phases.md` (P2 is next in the optimized order: P5 ✓ → **P2** → P3 → P7 → P6 → P8)

## Where we are

P5 hit the "useful for real work" milestone — open a Sharpee story, edit raw `.ts`, build, play. Everything from P2 on is polish. P2's deliverable: **editing TS files feels like editing TS, not plaintext.**

## What already exists (do NOT rebuild)

The editor (`tools/ide/SharpeeIDE/Editor/EditorViewController.swift`) is a configured `NSTextView` that already has, from P1/P5:

- **Line-number gutter** — `LineNumberRulerView` (NSRulerView), with error-line flagging
- **Find / find-bar** — `usesFindBar = true`, incremental search on (`⌘F` works; replace via the system find bar)
- **Word wrap** — `applyWordWrap()`, persisted preference
- Monospaced font, dark theme colors, undo/redo, multi-tab, dirty tracking, click-to-jump from build errors

So the P2 scope from the roadmap is **narrower than written**. "Line number gutter" and "find/replace" are largely done. The real remaining work is **syntax highlighting**, plus bracket matching and auto-indent.

## The kickoff decision: highlighting engine

The roadmap left this open ("evaluate at P2 kickoff"). The original wording said *TextMate grammars*; the landscape now favors tree-sitter. Three viable paths (dependency health verified 2026-06-19):

### Option A — TextMate grammar + Oniguruma regex (original plan)
Bundle `TypeScript.tmLanguage` + a theme; tokenize with an Oniguruma/Onigmo binding over our `NSTextStorage`.
- ➕ Grammars are plentiful; conceptually simple; full control.
- ➖ Need/maintain a Swift Oniguruma binding; regex tokenization is per-line and fragile; gives **no structural tree** — brackets/outline (P6/P7) get no reuse.

### Option B — tree-sitter (SwiftTreeSitter + Neon) over the existing NSTextView  ★ recommended
Add `swift-tree-sitter` + `tree-sitter-typescript` + **Neon** (ChimeHQ) as a highlighting layer feeding attributes into our current text view. Keeps everything we built.
- ➕ Incremental, parse-on-keystroke; robust; **the parse tree pays forward** — bracket matching (P2), outline (P7), and trait-position detection (P6) can all reuse it.
- ➕ Deps are healthy/maintained (official tree-sitter org; ChimeHQ Neon).
- ➖ New SPM deps + a C grammar to vendor; Neon integration has a learning curve.

### Option C — adopt CodeEditSourceEditor wholesale
Replace our `NSTextView` with the CodeEdit editor component.
- ➕ Rich out of the box (highlighting, minimap, completion).
- ➖ **Explicitly "not ready for production use."** Owns the text view → we'd lose/rewire the gutter, word-wrap, and error-flagging from P1/P5. Heavy dependency, low control. **Not now.**

**Recommendation: Option B.** It's additive (no rewrite of P1/P5 work), the dependencies are healthy, and tree-sitter's tree is the foundation P6/P7 already need. This is an ADR-worthy choice (adopts tree-sitter as the IDE's syntax foundation, constraining later phases) → write a short ADR once confirmed.

> **DECIDED 2026-06-19: Option B.** Spike 2.0 done (see below). ADR still to be written before the build-out lands.

## Proposed scope (assuming Option B)

| Step | Work | Notes |
|---|---|---|
| 2.0 ✅ | Add SPM deps (`swift-tree-sitter`, `tree-sitter-typescript`); spike parse→query→color end-to-end | **DONE** — see Spike Results. Neon deferred to 2.3 |
| 2.1 | `SyntaxHighlighter` — wires Neon to the active document's `NSTextStorage`; maps tree-sitter capture names → `Theme` colors | New file in `Editor/` |
| 2.2 | Theme token palette — extend `Theme` with token colors (keyword, string, comment, type, number, function, punctuation) matching the dark mock | Theme-only |
| 2.3 | Re-highlight on edit + on tab switch; tear down on close | Hook into `textDidChange` / `loadActiveDocumentIntoTextView` |
| 2.4 | Bracket matching — highlight the partner bracket at the caret (reuse the parse tree) | tree-sitter node lookup |
| 2.5 | Auto-indent on newline — carry leading whitespace + one level after `{`/`(`/`[` | Keep simple; not full reformat |
| 2.6 | `.ts`/`.tsx` only for now; non-TS files render as today (plain) | Grammar selection by extension |

## Out of scope (per roadmap)

Completion (P6), refactoring, multi-cursor, semantic/type-aware coloring (that needs the Node helper from P3 — P2 is purely syntactic).

## Behavior statements (for the testable pieces)

**SyntaxHighlighter.highlight(storage:)**
- DOES: applies foreground-color attributes to ranges in the document's `NSTextStorage`, keyed by tree-sitter capture name → Theme color
- WHEN: a `.ts`/`.tsx` document loads, on edit, and on tab switch
- BECAUSE: tokens must be visually distinguished for the editor to read as code
- REJECTS WHEN: file extension has no registered grammar → leaves storage unstyled (plain), no throw

**bracket matching**
- DOES: adds a transient highlight attribute to the matching bracket's range
- WHEN: the caret is adjacent to a bracket character
- REJECTS WHEN: no matching partner in the tree → no highlight

## Tests

- `SyntaxHighlighterTests`: feed a known TS snippet, assert specific ranges receive the expected token color (assert on the `NSAttributedString` attributes — actual state, not "didn't throw").
- Bracket matching: caret-position fixtures → assert the partner range is highlighted; unbalanced input → assert none.
- Auto-indent: newline after `{` → assert inserted leading whitespace length.
- Grammar selection: `.md`/`.json` file → assert storage is left unstyled.
- *Note:* highlighting is real AppKit text-system work; keep the highlighter logic (capture→color mapping, range computation) in a unit-testable type separate from the view so tests don't need a live window.

## Dependencies / risks

- **Dependencies:** P1 (editor exists ✓). New SPM packages (Option B).
- **Risk — grammar vendoring:** `tree-sitter-typescript` ships C; confirm it builds cleanly under SPM for the app's deployment target. Spike this first in 2.0.
- **Risk — Neon + our custom ruler/word-wrap interplay:** verify Neon's invalidation doesn't fight `LineNumberRulerView` refresh or word-wrap reflow. Smoke-test early.
- **Decision gate:** confirm Option B (or pick A/C) before 2.0; write the ADR.

## Spike 2.0 Results (2026-06-19)

Outcome: **green.** All 128 IDE tests pass, including 5 new `SyntaxHighlighterTests`. Branch `ide/p2-ts-aware-editor`.

**What was built**
- `project.yml`: added SPM packages `SwiftTreeSitter` (exact 0.10.0) and `TreeSitterTypeScript` (branch `master`); the app target depends on both products. Regenerate with `xcodegen generate`.
- `Editor/SyntaxHighlighter.swift`: parses an `NSTextStorage`, runs curated highlight queries, applies `.foregroundColor` token colors. Re-highlights the whole doc per call (no incremental re-parse yet — that's Neon in 2.3).
- `Theme.swift`: +6 token colors (keyword/string/comment/number/type/function).
- `Editor/EditorViewController.swift`: holds a `SyntaxHighlighter`, calls `applyHighlighting()` on document load and on edit (TS-family files only; attribute-only edits don't recurse `textDidChange` or churn the ruler).
- `SharpeeIDETests/SyntaxHighlighterTests.swift`: real-path coverage.

**Findings (carry into the build-out)**
1. **Bundled-query auto-discovery fails from an app target.** `LanguageConfiguration(tree_sitter_typescript(), name:).queries[.highlights]` returns nil at runtime — the grammar's resource bundle isn't resolved by convention outside its own package. Confirmed empirically (the first spike pass colored nothing). **Resolution: load our own query in-code** (Option B). Do NOT rely on `.queries[.highlights]`.
2. **One query string = one failure blast radius.** A single unknown node/token name makes the whole `Query` throw. Mitigation in place: the query is **split into independent groups** (core JS keywords / TS keywords / literals+comments / types); each compiles via `try?` and a failing group disables only itself. Keep this structure when widening coverage.
3. **API path that works:** `Parser.setLanguage(config.language)` → `Query(language:data:)` → `query.execute(in: tree).resolve(with: .init(string: source)).highlights()` → iterate `NamedRange.name` / `.range`. Compiles and runs under Swift 6 / macOS 26.

**Integration Reality** — OWNED: the compiled tree-sitter-typescript grammar. REAL-PATH TEST: `testHighlightColorsKeywordToken` / `testHighlightColorsNumberLiteral` drive the actual grammar + our query and assert on real `NSTextStorage` attribute output. No stub. STUB JUSTIFICATION: none.

## Next actions (build-out)

1. **Write the ADR** — adopt tree-sitter as the IDE syntax-highlighting foundation (deps, in-code-query decision, group-isolation pattern).
2. **2.1–2.3** — widen the capture set + palette; introduce **Neon** for incremental re-highlight (replace the per-edit full re-parse).
3. **2.4–2.6** — bracket matching (reuse the tree), auto-indent on newline, grammar selection by extension.

> Earlier "Suggested first action" (resolve engine + spike 2.0) is **done** — superseded by the list above.
