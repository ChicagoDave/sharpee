# Work Summary — Scoring extension & Chord ranks (ADR-260 + ADR-261)

**Date:** 2026-07-24
**Branch:** hatch-scoring
**Target:** `docs/work/adr-260-261-scoring-ranks/` (ADR-260, ADR-261)
**Plan:** `docs/work/adr-260-261-scoring-ranks/plan.md` (11 phases, all done)
**Session:** `docs/context/session-20260724-0200-hatch-scoring.md` (chronological record, environment notes, recurrence check)

## Goal

Turn scoring from a half-dead capability into a trusted extension, and give Chord
authors a rank ladder. ADR-260 deletes the capability nothing registered,
consolidates all scoring state on ADR-129's ScoreLedger, and adds
`@sharpee/ext-scoring`; ADR-261 adds `use scoring`, the `rank … at <n>` ladder,
per-rung `says` promotions, and the gate that makes "this game has no score"
sayable.

## What was done

One commit per plan phase (three of them atomic by the plan's own analysis).
Every phase built both tsf targets and ran the affected suites before committing.

### Phase 1 — ScoreLedger rank ladder (`713e4d20`)

`ScoreLedger` gained `RankDefinition { id, name, threshold }`, `setRanks`
(sorts ascending on receipt, throws on duplicate threshold), `getRanks`,
`getRank` (**derived on every call** from `getTotal()`, never stored),
`setScoringEnabled`/`isScoringEnabled` (default false). Delegated on WorldModel
and AuthorModel; `RankDefinition` exported through the world barrels.

Invariants locked by `score-ranks.test.ts` (16 tests): thresholds are **absolute
points**, so a `setMaxScore(616 → 650)` change leaves the rank identical (the
dungeo thief-death case); `ScoreLedgerData` is unchanged so a pre-ADR save loads
intact and carries no rank fields; `clear()` empties entries and maxScore but
keeps the ladder installed.

### Phase 2 — `@sharpee/ext-scoring` + `registerPlugin`'s first call site (`713e4d20`)

New package under `packages/extensions/scoring/`, shaped like `ext-basic-combat`
— no action, no grammar, no messages. `registerScoring(world)` takes **no
options bag** (it cannot: `registerWorld` is `(world) => void` on a module-level
const map); it only flips the enabled flag. `RankWatcherPlugin` emits
`if.event.rank_risen` (new `IFEvents.RANK_RISEN`) with rank **ids**, carrying
`fromRank: null` on the first promotion, and keeps only the last-announced id so
a save/restore does not re-fire. Priority 25, below the scheduler.

The loader's `onEngineReady` gained a generic loop over `ir.uses` calling
`EXTENSION_REGISTRY.get(name)?.registerPlugin?.(...)` — **the first live use of
`ExtensionRegistration.registerPlugin` since it was declared.** Names no
extension, so it satisfies the no-special-casing rule. `rank-watcher-plugin.test.ts`
(14 tests) proves one promotion per crossing, silence on demotion, re-announce on
re-crossing, and no re-fire across save/restore.

### Phase 3 — ledger-reading SCORE + dungeo migration (`713e4d20`)

`if.action.scoring` reduced to: `isScoringEnabled()` false → `no_scoring`; else
read `getScore()`/`getMaxScore()`/`getRank()` and pick `score_simple` /
`score_display` / `score_with_rank` / `perfect_score`. Deleted `computeRank` and
its five English literals, every `getCapability(SCORING)` read, and the
moves/achievements/progress plumbing. The rank **id** rides in the event's domain
data; the author's rank **name** rides in `params.rank` — stdlib invents no rank
prose. Dungeo migrated in this same phase (mandatory, not a follow-up):
`registerScoring(world)` + ADR-085's ladder ported verbatim at 0/50/200/400/616.
`scoring-golden.test.ts` (15 tests).

### Phase 4 — delete the capability, ATOMIC (`de24e206`)

`ScoringCapabilitySchema` and `ScoringData` deleted; the `SCORING` entry removed
from `StandardCapabilitySchemas`. Atomic because `registerStandardCapabilities()`
defaults to every schema and stdlib's shared test setup calls it for every action
test, so the table entry and the tests asserting the old field shape had to move
together (`test-utils`, `capability-refactoring.test.ts`, the engine query-events
test). `StandardCapabilities.SCORING` the *identifier* survives for private
bookkeeping (dungeo's moves/deaths).

**One migration site D7 did not enumerate:** the `score` channel
(`stdlib/src/channels/standard.ts`) carried a legacy `ScoringData` fallback. It
was already unreachable — the ledger branch above it tests `getScore()`, which
every world has — so it is deleted rather than ported, with a test pinning that a
story-registered `scoring` capability cannot influence the channel.

### Phase 5 — delete dead messages, prune both alias tables (`c0db9a5a`)

Thirteen of eighteen messages deleted (five `rank_*`, four progress, two
achievement, `scoring_not_enabled`, and the whole `scoringSystemMessages` export
that no module imported). Five survive. Both alias tables — chord's catalog and
the loader's map, the two halves of one ADR-255 bijection — pruned in parallel.
`score_display` lost its "in {moves} turns" clause.

### Phase 6 — Chord grammar + Chord 1.1.0, ATOMIC (`96268575`)

`use scoring` is the first `use` line to take an indented body: `rank "<name>" at
<n> [says <key>]` rungs. `RankDecl` on the AST, `parseRankLine` in the parser,
diagnostics `parse.rank-outside-scoring` / `parse.use-body` / `parse.rank-name` /
`parse.rank-threshold` / `parse.rank-says` / `parse.rank-extra`. **All four
version sites moved in one commit** (`CHORD_LANGUAGE_VERSION → 1.1.0`, the
re-recorded `ebnfSha256`, `chord.ebnf`, and the doc headers), as the
language-version pin enforces. 1.1.0 rather than 2.0.0 is a recorded one-time
override of ADR-257 D2, documented beside the constant. `rank-ladder-parse.test.ts`
(15 tests); ten golden AST/IR snapshots re-recorded (the diff is only the additive
`"ranks": []`).

### Phase 7 — registry entry + manifest (`599b1c7b`)

`SCORING_MANIFEST` (no trait adjectives, like `state-machines`) on the compile
side; the runtime `['scoring', { registerWorld, registerPlugin }]` entry on the
loader side — the first entry to fill two of ADR-215's three contract parts. Must
precede the migration, since an unknown `use` name is a LoadError. The
manifest-conformance test passes with `scoring` on both sides.

### Phase 8 — analyzer + IR (`0035f184`)

`IRRankDef { id, name, threshold, phraseKey?, span }`. Ids kebab-cased from the
name (ADR-254). Sorted ascending. Three gates with spans:
`analysis.duplicate-rank-threshold`, `analysis.duplicate-rank-id`,
`analysis.rank-above-max` (sound only because Chord has no runtime `setMaxScore`,
so the sum of declared `worth` is the whole ceiling). `phraseKey` lives on
`IRRankDef` and deliberately not on the platform `RankDefinition`.
`rank-ladder-analysis.test.ts` (16 tests); four IR snapshots re-recorded.

### Phase 9 — loader lowering + `says` reaction (`f9873838`)

The loader lowers `ir.ranks` through `world.setRanks(...)` beside the
`setMaxScore` it already computes — generic, no extension name, `phraseKey`
stripped. The `says` narrator is a loader-registered `TurnPlugin` holding a map
from rank id to phrase key. **It derives the crossing from the ledger rather than
observing `if.event.rank_risen`**, because `TurnPluginContext.actionEvents` is a
snapshot taken before the plugin loop — no plugin can see another's output. Both
plugins read the same derived ledger and cannot disagree. Rendering rides ADR-097:
the emitted event carries the phrase key as its messageId. `rank-ladder.test.ts`
(17 tests).

### Phase 10 — the gate + fifteen-file migration, ATOMIC (`dc88e880`)

`analysis.scoring-needs-use` for a bare `score`/`award`, backstopped by a
`LoadError` in the loader for rogue IR. Reported once per construct kind.
**Deviation from acceptance #5:** the third gated construct, a `rank` rung, cannot
produce this diagnostic from source — the ladder is structurally inside the
`use scoring` body, so a stray rung is `parse.rank-outside-scoring` at parse time,
earlier and more precise; the rogue-IR form is covered by the loader's LoadError,
which is asserted. Fifteen `.story` files migrated (the ADR's list) plus two
inline test sources the file count did not cover (`action-body`, `on-after-pair`).
`chord-language.md` §4.5 gains the opt-in rule and a Ranks subsection; §5.10 and
`chord-grammar.md` list `scoring`. `scoring-gate.test.ts` (7 tests).

### Phase 11 — REAL-PATH validation (`ec3ad32c`)

Fernhill gained a three-rung ladder with two `says` rungs and their phrases.
Through `dist/cli/sharpee.js`, SCORE shows the authored rank and each promotion
prints the story's own sentence exactly once. Dungeo gained a new transcript
(`rank-survives-ceiling-change.transcript`) restoring the post-thief-fight chain
state: the ceiling has risen to 650 and the rank is still "Adventurer", because
`400 ≤ 493 < 616` is a threshold comparison, not a percentage. New transcript
rather than an edit to a passing walkthrough, per the root CLAUDE.md rule.

## Test coverage delta

- New unit suites: `score-ranks` (16), `rank-watcher-plugin` (14),
  `scoring-golden` (15), `rank-ladder-parse` (15), `rank-ladder-analysis` (16),
  `scoring-gate` (7), `rank-ladder` (17). Plus one dungeo transcript.
- Suites green: world-model 1416, stdlib 1576, engine 524, chord 514,
  lang-en-us 430, ext-scoring 14. story-loader 350 pass, 1 **pre-existing**
  failure (`dotted-phrase-keys`, verified on a clean tree).
- REAL-PATH through the shipped CLI: dungeo chain 638, dungeo units 1783,
  fernhill 76.

## Flags for David

1. **`packages/sharpee/docs/genai-api/lang.md` still lists the deleted scoring
   messages.** It is generated from `.d.ts` and needs a regeneration pass.
2. **`score_with_rank` renders "the rank of an Adventurer"** — the formatter adds
   an article to `{rank}`. Pre-existing (the old `computeRank` output read the
   same way), cosmetic, lang-en-us territory.
3. **friendly-zoo declares `use scoring` with no ladder**, so its scoring
   transcript now covers ADR-261 acceptance #4 and its wording changed from
   `score_with_rank` to `score_display`. Deliberate, noted in the transcript
   header. (Surfaced only because ADR-259 Phase A let that story's transcripts
   run again — see the hatch work summary.)
