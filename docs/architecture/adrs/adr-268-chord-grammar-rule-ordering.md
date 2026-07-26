# ADR-268: Chord grammar rule ordering — implicit specificity, no numeric priority

## Status: IMPLEMENTED (2026-07-26, session b88ed7) — D5 landed: engine swap to confidence → tier → specificity → definition order; `.withPriority` removed from builder API and every call site; `GrammarRule.tier: 'standard' | 'story'` contract; if-domain `sortRules` removed (unsorted insertion = definition order). Acceptance: full corpus green with the priority term gone (dungeo 1789 units + 904 wt chain, fernhill 496+76, friendly-zoo 76+56, cloak 81, nautical 7); gap report EMPTY full stop (`scripts/chord-gap-report.cjs`, carve-out retired); `go out` → exiting pinned in `stories/dungeo/tests/transcripts/go-out-exiting.transcript`. Previously ACCEPTED same day — specificity experiment (A7) decisive (zero divergences, static + full transcript corpus; `docs/work/chord-grammar-ordering/specificity-experiment.md`); interview resolved Q-1 no override construct, Q-2 tier-first, Q-3 engine swap now; adr-review 14/14. ADR-266 Q-7 answered: no ordering notation.

## Parent: ADR-266 (umbrella — inherited Q-7 per D14, restated below). Sibling ADR-267 (constructs, complete — ordering was its one excluded row; its D7 gap report reads "empty except ordering", which this ADR retires). Feeds ADR-269 (the migration consumes this ordering model; the 29 file-order-sensitive pairs below become migration constraints). Relates to ADR-231 D2b (`literalSpecificity` — the metric already in the engine), ADR-257 (language version — only if a construct is added; the recommended design adds none).

## Date: 2026-07-26

## Context

The I7 bar ADR-266 D1 adopts makes ordering author-facing: authors order definitions, and
ordering is part of how a grammar means what it means. But Sharpee's `.withPriority(n)` is
a bare integer, and transcribing raw numbers into Chord would import an engine detail as
author syntax. Only 106 of 422 registered rules deviate from the default 100
(`{90:37, 95:12, 96:1, 101:1, 105:41, 110:14}`).

Today's resolution order (`english-grammar-engine.ts:110-120`, mirrored at
`english-parser.ts:405`): **confidence desc → priority desc → literalSpecificity desc →
registration order**. Priority therefore only ever does work between rules that match the
same input at equal confidence.

**The A7 experiment was run before this design was fixed** (2026-07-26, session ea9d13;
method and full results: `docs/work/chord-grammar-ordering/specificity-experiment.md`).
Static: every different-priority rule pair swept for co-matchability — **zero pairs**
where specificity reverses priority's winner. Dynamic: the full transcript corpus (dungeo
units + walkthrough chain, fernhill, friendly-zoo, cloak, nautical) run through an
instrumented parser logging every place the priority term mattered — **zero divergences**.
Everything priority visibly decides falls into exactly three shapes:

1. **The story tier.** Loader/story rules at 150/140/155+ beating standard rules
   (`press yellow` → DUNGEO_PRESS_BUTTON over pushing). A layer relationship, not
   per-rule numeric information.
2. **One duplicate pattern.** `go out` → exiting@105 vs `go out` → going@100 — the only
   duplicate pattern with different actions in all 422 rules. Nothing but an ordering
   statement can decide it; a number is a bad spelling of "this one is listed first."
3. **Same-action ties.** `look` (looking@101 vs looking@100) — invisible whichever wins.

The feared case — the 37 abbreviation rules at priority 90 (`n`, `go n`, `g`), *shorter*
than what they were thought to outrank — turned out to compete with **nothing**: no other
rule matches those words. The band does no work at all.

## Decision (settled parts)

### D1 — Chord has no numeric priority

No `priority N` line, no number anywhere in the author surface. The 106 deviating
priorities are not transcribed by ADR-269's migration; the 90/95/96/101/105/110 bands die
with `grammar.ts`. This is the experiment's licensed outcome: specificity + definition
order reproduce every observable resolution the numbers produce today.

### D2 — Resolution order: confidence → tier → specificity → definition order

- **Confidence** stays first, unchanged.
- **Tier** (Q-2 resolved 2026-07-26: tier-first): story/Chord definitions outrank the
  standard grammar **before** specificity is consulted — "story overrides platform" is
  absolute and unconditional, the I7 precedent (story rules over Standard Rules). A
  consequence: the loader's 150/140 split (pattern vs bare-verb) collapses to **one story
  tier**, since bare-verb-vs-pattern is itself a specificity relation that the next key
  now handles. Rejected: specificity-first, which would let a very specific standard rule
  pierce a broad story rule an author wrote precisely to override behavior (the corpus
  cannot distinguish the placements today — this is design intent, not compatibility).
- **Specificity** is ADR-231 D2b's existing `literalSpecificity` (words consumed by
  literal/alternate tokens), promoted into the slot priority used to occupy. No new
  metric, no token-count formula in the language spec.
- **Definition order**: earlier definition wins remaining ties — I7's "listed before,"
  which is the bar D1 adopted. Registration order is already the engine's final stable
  tiebreak; it becomes *meaningful* (file order) instead of incidental (priority-sorted
  insertion).

### D3 — `go out` is ordered by definition order in the migrated source

The exiting rule precedes the going rule in the migrated standard grammar; a comment marks
the ordering as load-bearing. The 29 statically co-matchable different-priority pairs
(`pairs.json`; 25 are the `move :item to :destination` vs `move :target <dir>` family)
are preserved the same way — ADR-269's migration keeps each pair's current winner earlier
in the file. Only `go out` is corpus-visible; the rest are contrived inputs, ordered
correctly anyway at zero cost.

### D4 — No language change, no version bump (Q-1 resolved 2026-07-26: no construct)

This ADR adds **zero constructs** to Chord: ordering is implicit (specificity) plus
positional (definition order), both already meaningful in a `.story` file.
`CHORD_LANGUAGE_VERSION` stays 2.3.0; no `chord-grammar-changes.md` row. Definition order
is the only escape hatch; if a cross-file ordering need ever materializes, an explicit
relational construct is purely additive to rule in then. Rejected: shipping `wins over`
now — a full construct landing (EBNF → parser → analyzer → IR → loader, version bump,
docs) for zero call sites beyond one (`go out`) that file order already handles.

### D5 — The engine swap lands under this ADR, and `.withPriority` is removed (Q-3 resolved 2026-07-26)

The ordering change does not wait for ADR-269. `EnglishGrammarEngine.findMatches` and the
parser's candidate sort move to D2's order (confidence → tier → specificity → definition
order) now, and the full transcript corpus proves the experiment's zero-DIVERGE prediction
on the real engine — the migration then lands onto ordering already proven.

`.withPriority(n)` is **removed from the builder API in the same landing** — never
accepted-but-ignored (the ADR-235-D2 silent-drop class is the rejected alternative). Every
call site goes with it: `grammar.ts` (the 106 deviating rules — the corpus proves
specificity reproduces them), story TS rules (dungeo's seven grammar files, 145–170 band —
ditto, including its intra-story orderings; also `family-zoo-tutorial`, `thealderman`, and
the devkit `basic-story` fixture), and the loader's emitted 150/140
(`loader.ts:1179,1200`, which collapse into the single story tier per D2).

*Tier contract (review fix, 2026-07-26):* `GrammarRule.priority: number` is replaced by
`GrammarRule.tier: 'standard' | 'story'`, set at the registration entry point — the
distinction registration already knows: the standard grammar's `defineGrammar` builder
registers `standard`; the story grammar surface (`getStoryGrammar()`) and the Chord
loader register `story`. Both sort sites compare tier first (`story` wins), then
`literalSpecificity`, then registration order.

*Modules (review fix, 2026-07-26):* if-domain `grammar-builder.ts` (both `withPriority`
declarations — `PatternBuilder` and `ActionGrammarBuilder` — and the `GrammarRule.priority`
field), if-domain `grammar-engine.ts` (`addRule`/`sortRules` priority sort — its **removal
is load-bearing**: unsorted insertion is what makes registration order equal definition
order; also `forAction`'s 90-band single-character-alias assignment), parser-en-us
`english-grammar-engine.ts` (`findMatches` sort + `maxMatches` iteration order),
`english-parser.ts` (candidate sort + `RichCandidate.priority` → `tier`), `grammar.ts`,
story-loader `loader.ts`, the story/fixture call sites above, and the parser-en-us test
files that assert priority behavior (7 files, e.g. `adr-231-d2b-specificity.test.ts`,
`story-grammar.test.ts`) — updated to assert the D2 order.

> **Inherited question resolved**: ADR-266's Q-7 — *What notation does Chord get for
> ordering?* — was restated here per D14 and is answered: **none** (D1/D4). Ordering is
> implicit specificity plus definition order, with the story tier above both (D2); the
> interview resolutions of 2026-07-26 (Q-1 no construct, Q-2 tier-first, Q-3 swap now +
> API removal) closed it.

## Acceptance

1. D2's resolution order is implemented in `EnglishGrammarEngine.findMatches` and the
   parser's candidate sort, `.withPriority` is removed from the builder API with all call
   sites (D5), and the **full transcript corpus is green with the priority term gone** —
   the experiment's zero-DIVERGE prediction, confirmed on the real engine.
2. `scripts/chord-gap-report.cjs` drops its ordering carve-out: the report reads EMPTY,
   full stop — ADR-267 D7's "empty except ordering" retires.
3. The migrated source (ADR-269) contains no ordering annotations — definition order
   only (D4) — and the D3 pair list is honored: `go out` resolves to exiting in a
   transcript assertion.

## Consequences

- Priority disappears from the author surface entirely; the migrated standard grammar
  reads as sentences, not a config file. Authors control ordering the I7 way: write the
  more specific pattern, or list first what wins.
- Definition order becomes semantic. Reordering lines in a `.story` file (or the migrated
  standard grammar) can change resolution — a property authors already expect from I7 and
  from CSS-like systems, but new to Chord tooling (formatters must not reorder grammar
  lines).
- The engine's `maxMatches: 10` early-stop currently iterates rules priority-first; the
  iteration order follows the D2 model when the swap lands (D5).
- Observation recorded, not acted on (fact, not a ruling): optional tokens skipped at
  end-of-input carry no ×0.9 confidence penalty (`english-grammar-engine.ts:157-161`,
  `:342-345`) — the only reason `look [around]`@101 exists. Same-action, so invisible to
  this ADR either way.

## Session

Experiment + draft: session ea9d13 (2026-07-26), `docs/context/session-20260725-2356-main.md`.
Experiment artifacts: `docs/work/chord-grammar-ordering/` (dump, pairwise sweep, corpus
aggregation, report).
