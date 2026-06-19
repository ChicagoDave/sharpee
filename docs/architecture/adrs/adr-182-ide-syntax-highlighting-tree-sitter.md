# ADR-182: IDE syntax highlighting via tree-sitter

## Status: ACCEPTED

## Date: 2026-06-19

## Context

P2 of the Sharpee IDE makes the editor TS-aware: editing a `.ts` file should *feel* like
editing TypeScript, not plaintext. The first deliverable is syntax highlighting. By P2 the
editor is already a configured `NSTextView` with a line-number gutter, find bar, word wrap,
and click-to-jump error flagging (built in P1/P5) — so the open question was narrow: **what
engine produces the token coloring, and how does it integrate without discarding the
existing editor?**

Three options were weighed (dependency health verified 2026-06-19):

- **A — TextMate grammar + an Oniguruma regex binding.** The original phase-plan wording.
  Per-line regex tokenization; no structural parse tree; we'd vendor/maintain an Oniguruma
  binding.
- **B — tree-sitter** (`swift-tree-sitter` + `tree-sitter-typescript`), layered over the
  existing `NSTextView`. Incremental parse tree; additive; the tree is reusable by later
  phases (bracket matching now; outline in P7; trait-position detection in P6).
- **C — adopt `CodeEditSourceEditor` wholesale.** Rich, tree-sitter-based, but its authors
  flag it "not ready for production use," and it owns the text view — we'd lose/rewire the
  gutter, word-wrap, and error-flagging from P1/P5.

This decision constrains later phases (P6/P7 build on whatever structural model P2 picks),
so it is recorded as an ADR.

## Decision

**Adopt tree-sitter (Option B) as the IDE's syntax-highlighting foundation.**

- **Dependencies:** `swift-tree-sitter` (pinned exact `0.10.0`) and `tree-sitter-typescript`
  (branch `master`), declared in `tools/ide/project.yml` (XcodeGen) and depended on by the
  app target. The TypeScript and TSX C grammars compile into the app under Swift 6 /
  macOS 26.
- **Integration is additive.** A `SyntaxHighlighter` parses the active document's
  `NSTextStorage` and applies `.foregroundColor` token attributes. The existing
  `NSTextView`, gutter, find bar, and word wrap are untouched. Attribute-only edits do not
  fire `textDidChange` / `NSText.didChangeNotification`, so highlighting neither recurses nor
  churns the ruler.
- **Highlight queries are loaded in-code, not from the grammar's resource bundle.** The spike
  established empirically that `LanguageConfiguration(tree_sitter_typescript(), name:)
  .queries[.highlights]` resolves to `nil` at runtime when consumed from an app target — the
  grammar's bundled `highlights.scm` is not discoverable by convention outside its own
  package. We therefore ship a **curated query in-code** (Option B-as-string). This also
  matches a longer-term need: Sharpee-specific captures (trait calls, message IDs in P6) will
  require a custom query regardless.
- **The query is split into independent groups** (core JS keywords / TS keywords /
  literals+comments / types). Each compiles on its own via `try?`; a node or token name the
  grammar doesn't recognize disables only its group instead of throwing out all highlighting.
  This pattern is mandatory when widening coverage.
- **Capture → color mapping** resolves dotted capture names by their head segment
  (`keyword.control` → `keyword`), against a small palette in `Theme`.

Incremental re-highlighting (replacing the current per-edit full re-parse) was scoped to
**Neon** (ChimeHQ) in step 2.3 but is **deferred (blocked)**: Neon `main` pins its
`SwiftTreeSitter` dependency to `branch:main`, which conflicts with our `exactVersion: 0.10.0`
pin (a package resolves to one version in the graph). Adopting Neon would force both deps onto
branch pins — non-reproducible builds — for marginal benefit, since tree-sitter re-parses
typical IF story files effectively instantly. Revisit only when per-edit re-parse is a
*measured* problem **and** ChimeHQ tags a Neon release pinning a stable SwiftTreeSitter.

## Consequences

- **Constrains P6/P7 toward tree-sitter.** Bracket matching, the outline panel, and
  trait-position detection should reuse the parse tree rather than introduce a second parser.
  (Semantic, type-aware data still comes from the P3 Node helper — tree-sitter is syntactic
  only.)
- **We own a curated query.** Coverage starts small (keywords, strings, comments, numbers,
  types) and widens incrementally. A major grammar upgrade that renames nodes requires a
  query tweak; the group-isolation pattern limits the blast radius.
- **`tree-sitter-typescript` is pinned to `master`.** Its query/nodes can shift under us;
  because we load our own query, only node-name drift (not their query churn) can affect us.
  Revisit pinning to a tagged release when one with a current `Package.swift` is available.
- **`LanguageConfiguration.queries[.highlights]` is off-limits** for query loading in this
  codebase — documented so a future session doesn't re-discover the nil-from-app-target trap.
- **New SPM/C-grammar build surface** in the IDE; `xcodegen generate` must run after the
  `project.yml` dependency change.

## Acceptance

Foundation (step 2.0 — **met**):

- Both SPM packages resolve and the TS/TSX C grammars compile under Swift 6 / macOS 26.
- A real-path test parses TS source through the **compiled grammar** and asserts token colors
  land on the correct `NSTextStorage` ranges (`const` → keyword, `42` → number) — no stub.
- Unmapped tokens and total query-load failure both fall back to base foreground (no undefined
  attribute); a malformed query group is dropped while sibling groups still apply (group
  isolation is **test-proven**, not just asserted in prose).
- Full IDE suite green.

Build-out (steps 2.1–2.6) acceptance criteria live in the phase plan
`docs/work/sharpee-ide/plan-20260619-p2-ts-aware-editor.md` (palette widening, Neon incremental
re-highlight, bracket matching, auto-indent, extension-based grammar selection). This ADR is the
decision record; the plan is the work checklist.

## Alternatives rejected

- **A (TextMate + Oniguruma):** per-line regex is fragile across multi-line constructs and
  yields no tree, so P6/P7 get zero reuse; plus a regex-engine binding to maintain.
- **C (CodeEditSourceEditor):** trades our working, controlled editor for an upstream
  component its own authors call not-production-ready, discarding P1/P5 editor work.

## Session

Produced 2026-06-19 (session `ffb3f0`). Implemented as P2 step 2.0 (spike) on branch
`ide/p2-ts-aware-editor`, commit `1d20922d` — 128 IDE tests green, including real-path
`SyntaxHighlighterTests` against the compiled grammar. Plan:
`docs/work/sharpee-ide/plan-20260619-p2-ts-aware-editor.md`.
