# Reserved-Surface Audit — ADR-267 acceptance 2

**Date**: 2026-07-25 (session 2d5bc7, Phase 1)
**Result**: PASS — zero findings on all four words, all surfaces.

ADR-267 makes four words structurally significant in Chord patterns: literal `the`
(D1/D15 — slot marker), literal `or` (D8 — alternation), leading `means` (D12 —
semantic default line), bare `directions` (D12 — direction block header). This audit
confirms, against every surface the acceptance names, that no existing pattern needs
any of them as a literal — so removing them from the writable pattern surface strands
nothing. Run before the parser change, per D1 ("acceptance requires the audit, not
the assumption").

## Method

- **Standard grammar**: registered `defineGrammar` against a real
  `EnglishGrammarEngine` (`packages/parser-en-us/dist`) and scanned all registered
  rules' pattern strings — literal tokens only (slots `:name`/`:name...` excluded;
  alternation `a|b` and optional `[a]` members unwrapped and checked individually).
  Script: session scratchpad `reserved-surface-audit.cjs`.
- **Stories + fixtures**: every `.story`/`.chord` file under `stories/` (5),
  `packages/` (53, includes all chord/story-loader test fixtures), and `docs/` (160)
  — grammar-block pattern lines and `define verb … means` patterns tokenized, slots
  excluded, four-word scan. Script: session scratchpad `audit-stories.cjs`.
- **Docs examples**: `.story`/`.chord` files covered above; markdown chord fences in
  `docs/reference/chord-language.md`, `chord-grammar.md`,
  `docs/work/story-language/design.md` checked for pattern lines carrying the words —
  the only hits were `the <slot> must be reachable` scope-constraint lines, which are
  action-line level (the existing `the`-led line family), not pattern lines.

## Results

| Surface | Rules/files | literal `the` | literal `or` | leading `means` | bare `directions` |
| --- | --- | --- | --- | --- | --- |
| Standard grammar (registered rules) | 422 | 0 | 0 | 0 | 0 |
| `stories/` | 5 files | 0 | 0 | 0 | 0 |
| `packages/` fixtures | 53 files | 0 | 0 | 0 | 0 |
| `docs/` chord files + md fences | 160 files | 0 | 0 | 0 | 0 |

No named exceptions; no diagnostic plan needed. Phases 2 and 4 (which land `or`,
`means`, `directions`) are gated open by this result.
