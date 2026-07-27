# Session Summary: 2026-07-26 - main [b88ed7]

**Goal**: Implement ADR-268 D5 — engine swap to confidence → tier → specificity →
definition order; remove `.withPriority` from builder API + all call sites;
`GrammarRule.tier: 'standard' | 'story'` contract.

**Status**: COMPLETE — all three ADR-268 acceptance criteria met; ADR marked
IMPLEMENTED. Not yet committed.

## Work done

- Pre-session audit clean (type check green, no stale artifacts, no blockers).
- **if-domain**: `GrammarRule.priority: number` → `tier: 'standard' | 'story'`
  (+ exported `GrammarTier`); `withPriority` removed from `PatternBuilder` and
  `ActionGrammarBuilder`; `GrammarEngine.sortRules()` DELETED — unsorted
  insertion is load-bearing (registration order = definition order, with a
  comment warning against reintroducing a sort); `createBuilder(tier)` sets the
  tier at the registration entry point; the directions() 90-band
  single-character-alias special case removed.
- **parser-en-us**: `findMatches` iterates story-tier rules first (so
  maxMatches early-stop can't starve story rules) and sorts confidence → tier →
  literalSpecificity → stable order; `english-parser.ts` candidate sort
  mirrors it; `RichCandidate.priority` → `tier`; `getStoryGrammar()`,
  `registerGrammar()`, `addVerb()`, `addPreposition()` register story tier.
- **grammar.ts**: all 106 `.withPriority` calls removed. ADR-268 D3 ordering:
  `go out` → exiting and `move :item to :destination` → putting hoisted ABOVE
  the direction-alias block with LOAD-BEARING ORDER comments (they tie their
  competitors on specificity; definition order decides). Header rewritten:
  priority guidelines → ADR-268 resolution-order note; all stale priority
  comments reworded to specificity/tier language.
- **story-loader**: loader emission dropped `withPriority(150/140)` — the
  story tier (via `getStoryGrammar()`'s builder) replaces both; bare-verb
  prefixes ride specificity below slotted forms.
- **Stories/fixtures**: dungeo's seven grammar files, family-zoo-tutorial,
  thealderman, devkit basic-story fixture — all `.withPriority` stripped;
  stale priority comments updated; vscode-ext wizard template comment fixed.
- **Tests updated**: if-domain grammar-builder (tier default, story tier,
  definition-order test replaces priority-sort test); parser-en-us
  adr-231-d2b-specificity (tier-beats-specificity + definition-order-tie
  tests replace the withPriority-override test), action-grammar-builder,
  walk-through, push-panel, story-grammar, english-grammar-engine,
  parser-integration; story-loader bare-verb-dispatch (tier asserts),
  scope-constraint-emission, pattern-constructs-emission (slot-presence /
  defaultSemantics filters replace priority filters), grammar-harness
  (story-tier builder).
- **Gap report**: `scripts/chord-gap-report.cjs` ordering carve-out retired —
  RESULT now reads "EMPTY — ADR-268 acceptance 2 satisfied".
- **New transcript**: `stories/dungeo/tests/transcripts/go-out-exiting.transcript`
  pins `go out` → exiting inside the balloon (acceptance 3). 7/7 green.
- **parser-en-us/CLAUDE.md**: story-grammar extension docs no longer teach
  `.withPriority(150)`; explains tier + definition-order semantics.
- **Mutation verification (post-implementation)**: agent confirmed all
  mutations + state-asserting tests; two findings closed — (1) NEW TEST in
  english-grammar-engine.test.ts: a story rule defined after 5 matching
  standard rules still survives `maxMatches: 5` (pins the story-tier-first
  iteration guard); (2) stale "150/140 split" header comment in
  scope-constraint-emission.test.ts reworded to tier language.

## Acceptance results (all green, priority term gone)

- Root `tsc --noEmit` clean; if-domain 95/95, parser-en-us 284/287 (3 skips,
  pre-existing), story-loader 399/399, devkit 83/84 (1 skip).
- dungeo units: 1789 passed, 9 expected failures, 4 skipped (115 transcripts,
  incl. new go-out-exiting).
- dungeo walkthrough chain: 904/904 (17 transcripts).
- fernhill 496 + wt 76; friendly-zoo 76 + wt 56; cloak 81; nautical 7.
- Gap report: EMPTY full stop (422 rules, 1 ruled exception `?`).

## Key decisions

- None new — implementing accepted ADR-268 (Q-1/Q-2/Q-3 resolved last session).
- ADR-268 status flipped ACCEPTED → IMPLEMENTED.

## Files modified

- packages/if-domain: src/grammar/grammar-builder.ts, grammar-engine.ts;
  tests/grammar/grammar-builder.test.ts
- packages/parser-en-us: src/english-grammar-engine.ts, english-parser.ts,
  grammar.ts; tests/{adr-231-d2b-specificity, action-grammar-builder,
  walk-through-pattern, push-panel-pattern, story-grammar,
  english-grammar-engine, parser-integration}.test.ts; CLAUDE.md
- packages/story-loader: src/loader.ts; tests/{bare-verb-dispatch,
  scope-constraint-emission, pattern-constructs-emission}.test.ts,
  tests/helpers/grammar-harness.ts
- packages/devkit/fixtures/basic-story/src/index.ts
- stories/dungeo/src/grammar/*.ts (7 files);
  stories/dungeo/tests/transcripts/go-out-exiting.transcript (new)
- stories/family-zoo-tutorial/src/index.ts, stories/thealderman/src/index.ts
- tools/vscode-ext/src/new-story-wizard.ts (comment only)
- scripts/chord-gap-report.cjs
- docs/architecture/adrs/adr-268-chord-grammar-rule-ordering.md (→ IMPLEMENTED)

## Next steps

1. Commit (on go-ahead — not yet committed).
2. ADR-269 (standard grammar as Chord source) — carries D3's 29-pair
   file-order constraint; lands onto ordering now proven.
