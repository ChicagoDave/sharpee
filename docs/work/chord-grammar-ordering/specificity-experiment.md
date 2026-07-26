# ADR-268 specificity experiment (A7)

> The experiment `sharpee-chord-grammar-syntax.md` §A7 required before ADR-268's design is
> fixed: does specificity-only ordering reproduce the resolution today's `.withPriority(n)`
> values produce? Run 2026-07-26, session ea9d13, against `47bb4655` (Chord 2.3.0, 422
> registered standard-grammar rules).

## Verdict

**Design (c) wins decisively — and needs even less than proposed.** Across the full
transcript corpus and a complete static pairwise sweep:

- **Zero cases** where specificity ordering picks a different winner than priority.
- **Zero cases** where an intra-standard-grammar priority does visible work that
  specificity cannot reproduce — except the single duplicate-pattern pair `go out`
  (exiting@105 vs going@100), the only duplicate pattern with different actions in all
  422 rules. Definition order (I7's "listed before") covers it; no per-rule number needed.
- The **37 abbreviation rules at priority 90** — A7's feared "shorter than what they
  outrank" problem — compete with **nothing**. `n`, `go n`, `g` never co-match any other
  rule (no other rule matches those words). The band is dead weight; token-count
  specificity never even sees a tie involving it.
- The only priorities doing real, visible work are the **story/Chord tier** (150/140/155+,
  loader-assigned): `press yellow` (DUNGEO_PRESS_BUTTON@150 over pushing@100), `break
  frame` (DUNGEO_BREAK@150 over attacking@100). That is a *layer* relationship — story
  beats standard — not per-rule numeric information.

Resolution order that reproduces today's behavior with no numeric priority at all:

```
confidence  →  tier (story/Chord > standard)  →  literal specificity  →  definition order
```

The engine already computes and uses literal specificity (ADR-231 D2b `literalSpecificity`)
as the post-priority tiebreak; this reorders it in place of priority, not a new metric.

## Method

### Static (whole rule set)

`specificity-dump.cjs` registers the standard grammar against a real
`EnglishGrammarEngine` (same load path as `scripts/chord-gap-report.cjs`) and dumps all
422 rules → `rules.json`. `specificity-pairs.cjs` then tests every pair with *different*
priorities for co-matchability (DP over compiled tokens; slots modeled as consuming ≥1
arbitrary words — an overapproximation, so "no co-match" is definitive) and compares
priority order against clean-match literal specificity (`litRequired`):

| class | meaning | pairs | confidence-comparable |
| --- | --- | --- | --- |
| REVERSE | specificity picks the opposite winner | **0** | 0 |
| TIE | specificity ties; would fall to definition order | 29 | 2 |
| AGREE | specificity picks the same winner | 65 | 41 |

The 29 TIE pairs: 25 are `move :item to :destination`@110 vs the `move :target <dir>`@105
cross-product (co-match only on contrived inputs like "move rock to north"); 2 are
`put on :item`@105 vs `put :item in/on :x`@100 (different slot counts — confidence
separates them in practice); the 2 comparable ones are `take :item off`@105 vs
`take up :item`@100 (co-match requires "take up off") and **`go out`@105(exiting) vs
`go out`@100(going)** — the one genuine case. These 29 pairs are exactly the relative
orderings the ADR-269 migration must preserve by file order.

The 90-band (37 rules) and 96/101 rules appear in **no pair at all** (nothing co-matches
an abbreviation; `look [around]`/`look [carefully] at` only overlap same-action rules).

### Dynamic (transcript corpus, ground truth)

A scratchpad **copy** of `dist/cli/sharpee.js` was instrumented at the parser's final
candidate sort (`english-parser.ts:405`) — behavior unchanged (stock winner always used),
but each multi-candidate parse appends a JSONL record when:

- `DIVERGE` — re-sorting candidates by confidence → literalSpecificity (priority term
  removed) yields a different winner;
- `PRIORITY-TIEBREAK` — priority broke a (confidence, specificity) tie;
- `PRIORITY-DECIDED` — priority broke a confidence tie but specificity agrees.

Corpus (all suites green, identical results to last session's acceptance run): dungeo 114
unit transcripts + 17-walkthrough chain, fernhill 18 + walkthrough, friendly-zoo 8 + 7
chain, cloak 8, nautical ship-directions. (concealment-test and channel-service-test fail
to load with the **stock** bundle too — stale story dists, pre-existing, excluded.)

**1,000 records, 34 groups, zero DIVERGE.** Breakdown:

| group | class | records | visible? |
| --- | --- | --- | --- |
| `look` — looking@101 vs looking@100 | TIEBREAK | 390 | no (same action) |
| story tier over standard, specificity ties (`press yellow`, `break frame`) | TIEBREAK | 12 | **yes — tier work** |
| story tier over standard, same action (`board boat`, `disembark`) | TIEBREAK | 30 | no |
| `turn on X` switching_on@100 over turning@95, `push wall` story rules, `unlock X with Y`@110 etc. | DECIDED | 568 | no — specificity agrees in every one |

`go out` (the duplicate-pattern pair) never occurs in the corpus; a directed probe
(`--exec "go out"` in dungeo) confirms it logs as PRIORITY-TIEBREAK, different actions —
the single intra-standard case needing definition order.

## Observations surfaced (not changed)

1. **Optional-skip confidence quirk**: an optional pattern token reached after the input
   is exhausted is skipped **without** the ×0.9 `skippedOptionals` penalty
   (`english-grammar-engine.ts:157-161` and `:342-345` — the penalty only applies when a
   present token fails to match). So bare `look` matches `look [around]` at confidence
   1.0, tying plain `look` — which is the only reason priority 101 exists. Both rules map
   to looking, so it is invisible either way.
2. **Story tier beats standard even when the standard rule is more literal-specific**
   (priority 150 dominates at equal confidence). The corpus never hits a case where a
   standard rule outspecifies a competing story rule, so tier-before-specificity vs
   specificity-before-tier is unobservable today; the recommended order keeps tier first
   to preserve "story overrides platform" absolutely.
3. `findMatches` stops at `maxMatches: 10` while iterating rules priority-first — in a
   definition-order world the iteration order changes correspondingly (ADR-268
   implementation detail).
4. Candidate records identify rules by action+priority+specificity (RichCandidate carries
   no rule reference); groups were mapped back to rules via `rules.json`.

## Artifacts

- `specificity-dump.cjs` / `rules.json` — rule dump (regenerate after grammar changes)
- `specificity-pairs.cjs` / `pairs.json` — static pairwise sweep
- `analyze-ordering.cjs` — aggregates the instrumented-run JSONL logs
- Instrumented bundle + per-suite logs: session scratchpad (ephemeral; method documented
  above — patch anchor is the candidate sort at the parser's `const best = candidates[0]`)
