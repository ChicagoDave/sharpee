# ADR-261: Chord gains `use scoring` and a `ranks` ladder

## Status: ACCEPTED (2026-07-23, session 7f133e) — `scoring` joins the trusted extension registry (D1), a `ranks` block under `use scoring` declares the ladder in absolute points (D2), absent `use scoring` means the game has no score (D3), the gate covers `score`/`award`/`ranks` together (D4), the loader lowers the ladder generically onto ADR-260's `setRanks` seam (D5), and a promotion speaks a per-rung authored phrase with no platform prose anywhere (D7). Promotions render through a loader-registered story reaction, never a platform sentence (D7), and the grammar change carries the version bump and its enforced EBNF pin (D8). Open Questions resolved by `adr-interview`; `adr-review` 9/16 → **16/16** after three blocker fixes (`says` had no channel to any renderer, the Chord version machinery was unnamed though test-enforced, and nothing asserted the fifteen-file migration). A second pass (three-ADR review of 259/260/261) corrected D1's plugin call site to `onEngineReady`, matching ADR-260 D6's amendment. Ships as **Chord 1.1** — a recorded one-time override of ADR-257 D2, see Consequences. Awaiting the owner's ACCEPTED flip. Not implemented.

## Parent: ADR-260 (scoring is a trusted extension) — this ADR is the Chord surface for the seams ADR-260 decides, and cannot land before it. Follows ADR-215 (the `use` extension contract, manifests, the names-vs-mappings split) and ADR-254 (kebab-case story keys). Relates to ADR-129 (the ScoreLedger `award` lowers onto).

## Date: 2026-07-23

## Context — verified, not assumed

Chord's award surface is complete and its rank surface is empty. `score <name> worth N` attaches a
scoring identity to four owners and `award <name>` grants it (`chord-language.md` §2.8, §4.5;
`ast.ts:76`, `ir.ts:469`, `chord.ebnf:156`). The word `rank` does not appear in the lexer, parser,
AST, IR, EBNF, or language reference — only inside message-alias names. An author has no way to
name a rank, set a threshold, or say when a rank is announced.

**Neither can an author say the game has no score.** Max score is derived — the loader sums every
declared `worth` (`loader.ts:518`) — so a story with no `score` lines gets `maxScore = 0` and, per
ADR-260's Context, SCORE answers *"Your score is 0 points."* There is no Chord spelling for *"this
isn't that kind of game."*

**`use` already means something precise, and it is a registration trigger.** Each name in
`EXTENSION_REGISTRY` carries runtime wiring the loader runs at load: `registration.registerWorld?.(world)`
(`loader.ts:375`), plugin registration (`loader.ts:708-717`), `registerChannels`
(`loader.ts:790`). The registry holds exactly two entries today — `combat` and `state-machines`
(`extension-registry.ts:104-111`) — and the chord-side manifest registry must carry exactly the same
names, pinned by a manifest-conformance test (`extension-registry.ts:10-12`).

**`state-machines` is the precedent for gating a construct rather than adding vocabulary.** Its
manifest contributes zero trait adjectives; the gated surface *is* the construct
(`manifests/state-machines.ts:8-11`), and `define machine` without the `use` is a LoadError:

```ts
if ((this.ir.machines ?? []).length > 0 && !(this.ir.uses ?? []).includes('state-machines')) {
  throw new LoadError('`define machine` needs `use state-machines` in the story header.');  // loader.ts:705
}
```

That manifest also records ADR-215's hard invariant — Chord's existing core `states:`/`select`/
`change` surface stayed **unconditional**, because gating shipped surface would break shipped
stories. **The owner has ruled that breaking changes are not a concern for this work**, which is why
the gate scope was decided on architectural grounds (D4) rather than settled by that invariant.

**Fifteen `.story` files declare `score` or `award` today**: `stories/fernhill/fernhill.story`,
`stories/friendly-zoo/zoo.story`, four chord test fixtures (`zoo-phase-c`, `traits-basic`,
`zoo-actions`, `each-iteration`), and nine documentation fixtures — including
`docs/work/chord-language-reference/fixtures/flow/scoring.story`, which backs §4.5 of the language
reference. Every one of them is a migration site if the gate covers `score`/`award`.

## Decision

### D1 — `scoring` joins the trusted extension registry

`use scoring` becomes the third name in `EXTENSION_REGISTRY`, mapping to ADR-260's
`registerScoring(world)` through `registerWorld` — the same one-line, story-data-free shape as combat
(`extension-registry.ts:105`) — **and to the rank-watcher plugin through `registerPlugin`**, which
ADR-260 D6 makes live by adding its first call site, in the loader's `onEngineReady` hook where a
plugin registry actually exists. `scoring` is therefore the first registry entry to fill two of the
contract's three parts. A matching `SCORING_MANIFEST` is added to the chord-side manifest registry so
the conformance test keeps the two sets identical.

The two registrations fire at different moments, and both are during load: `registerWorld` at
world-build time (`loader.ts:369-376`), `registerPlugin` at `onEngineReady` (`loader.ts:679`). A
Chord story's `use scoring` line drives both without naming either.

**The `use` line enables scoring; it does not carry the ladder.** `registerWorld` is typed
`(world: WorldModel) => void` and `EXTENSION_REGISTRY` is a module-level `const`, so no registry
entry can reach a story's IR (ADR-260 D5). The ladder therefore travels the generic lowering path in
D5 below, and the registry entry never learns that ranks exist.

The manifest contributes **no trait adjectives**, exactly like `state-machines`. Scoring needs no
new adjective: `score … worth N` and `award` already exist as core lines, and rank ladders are
story-header configuration, not per-entity data.

### D2 — `ranks` is an indented block under `use scoring`

```story
story "The Folly at Fernhill" by "The Sharpee Project"
  id: fernhill
  version: 1.0.0
  use scoring
    rank "Curious Visitor" at 0
    rank "Attentive Guest" at 40
    rank "Master of the Folly" at 120
```

One `rank <string> at <number>` line per rung, in the story header only. The name is a quoted
author string — rank prose is author content (ADR-260 D4), so it is written the way entity names
are written, not as a kebab key resolved through a phrasebook.

**`at <n>` is absolute points, never a percentage** — ADR-260 D2's invariant, which exists so that a
change to maxScore can never move a rank boundary. The ladder above is therefore for a story whose
declared `worth` values sum to at least 120.

Rungs may be written in any order and are sorted ascending at compile time. A duplicate threshold is
`analysis.duplicate-rank-threshold`; a `ranks` rung outside a `use scoring` block is
`parse.rank-outside-scoring`.

**Placing the ladder under `use scoring` rather than in a free-standing block** is what makes the
`use` line carry configuration instead of being a bare gate — it is the one structural difference
from `use combat` and `use state-machines`, both of which take no body. The alternative — a
top-level `define ranks … end ranks` block — was rejected because it separates the ladder from the
line that enables it, allowing a ladder that silently does nothing.

### D3 — Absent `use scoring` means the game has no score

A story with no `use scoring` line installs no scoring, so SCORE answers `no_scoring` — *"This isn't
that kind of game"* — via ADR-260 D3. This is the Chord spelling that does not exist today, and it
is free: it falls out of the extension being opt-in rather than needing its own syntax.

`use scoring` with no `ranks` block is legal and meaningful: scoring is on, SCORE reports a score
with no rank (`score_simple` / `score_display`).

### D4 — The gate covers `score`, `award`, and `ranks` together

All three of scoring's constructs sit behind `use scoring`. A `score … worth N` line, an `award`
statement, or a `rank` rung in a story whose header lacks `use scoring` is
`analysis.scoring-needs-use`, backstopped by a `LoadError` in the story-loader for rogue IR — the
exact two-layer shape ADR-215 uses for `define machine` (`loader.ts:705`). A gated construct must
never be silently dead.

Gating all three is what makes D3 a rule with no exceptions: scoring is on precisely when the header
says so, and there is exactly one place to look. The rejected alternative — gating only `ranks` and
leaving `score`/`award` bare — would have required enablement to be inferred from *either* the `use`
line *or* the presence of declared scores, reintroducing the two-homes-for-one-fact shape that
ADR-260 spent four decisions removing.

The cost is migration: fifteen `.story` files gain a `use scoring` line, and §4.5 of
`chord-language.md` changes with its fixture.

### D5 — The loader lowers `ranks` onto ADR-260's seam, beside `setMaxScore`

`IRRankDef { name: string; threshold: number; span: Span }` is added to the IR, carried on the story
header alongside `uses`. The loader lowers the ladder in the same place it already computes the
ceiling:

```ts
if (this.ir.scores.length > 0) {
  world.setMaxScore(this.ir.scores.reduce((sum, s) => sum + s.worth, 0));  // loader.ts:518 (today)
}
if ((this.ir.ranks ?? []).length > 0) {
  world.setRanks(this.ir.ranks.map(toRankDefinition));   // ADR-260 D2 — generic, name-agnostic
}
```

The loader does not know that `scoring` is the extension consuming this; it lowers `ir.ranks` the way
it lowers any other IR field. That is what keeps ADR-260 D5's rule intact — no special-casing of an
extension name in the loader.

Rank ids are derived from the name by kebab-casing it (ADR-254's story-key convention), so a rank is
addressable in diagnostics and in `if.event.rank_risen`'s payload (ADR-260 D6) without the author
declaring an id. Two names that kebab-case to the same id is `analysis.duplicate-rank-id`. Because
ranks are configuration rather than saved state (ADR-260 D2), a rank id never appears in a save file
and renaming a rank between releases cannot invalidate one.

Because thresholds are absolute points (D2), the compiler knows the ceiling — the sum of every
declared `worth` — and a rung above it is `analysis.rank-above-max`, an unreachable rank the author
almost certainly did not intend. This check is sound for Chord specifically because Chord has **no
statement that changes maxScore at runtime**; the sum of declared `worth` is the whole ceiling. A
TypeScript story calling `setMaxScore` at runtime (as dungeo does) is unaffected — that path has no
compile step and no ladder validation, by design.

Ordering is safe, though the three steps land at three different moments. `registerWorld` enables
scoring before entity construction (`loader.ts:369-376`); the ladder lowers beside `setMaxScore`
(`loader.ts:518`); the rank-watcher registers at `onEngineReady` (`loader.ts:679`, ADR-260 D6). All
three complete during load, and both `award` and rank crossings happen only during play, so no
award can fire without a ladder and no crossing can occur without a watcher. The steps need not be
adjacent — only all three done before turn one.

### D6 — `award` and `score` lowering are unchanged

Nothing about the award path moves. `award` continues to lower into interceptor and behavior clauses
and to reach `world.awardScore` through the ledger; owner-first resolution, owner-qualified
identities, and dedup-by-identity are all untouched. This ADR adds a ladder and a gate; it does not
redesign scoring's authoring model.

### D7 — A promotion speaks a per-rung phrase, named on the rung

A rung may name the phrase spoken when the player reaches it:

```story
  use scoring
    rank "Curious Visitor" at 0
    rank "Attentive Guest" at 40 says settled-in
    rank "Master of the Folly" at 120 says mastered-the-folly
```

`says <key>` is an optional suffix taking a kebab-case key in the story's own phrase namespace
(ADR-254) — the same namespace `phrase` statements and `{marker}` interpolations use, so an
undefined key produces the same diagnostic any undefined phrase key does, and the phrase may carry a
strategy and `or` variants like any other.

**The key stays in the story layer; it never enters a platform type.** `IRRankDef` gains
`phraseKey?: string`, but `RankDefinition` — the shape `setRanks` takes (ADR-260 D2) — deliberately
does **not**: a phrase key is a Chord concept, and a TypeScript story has nothing to put there.
Instead the Chord loader, which already holds the IR, registers a story-side reaction to
`if.event.rank_risen` that maps the event's `toRank` id to the rung's `phraseKey` and speaks it.
The platform emits the event; the story owns everything said about it.

That routing is the reason this decision is implementable at all: the event payload carries rank
**ids** (ADR-260 D6), and D5 derives those ids by kebab-casing the rank name — so the loader's map
is keyed on a value the platform already sends, with no new field crossing the boundary.

**Rank prose therefore never lives in the platform** — not in stdlib, not in lang-en-us, not in
`ext-scoring`. ADR-260 D4 removed stdlib's rank *names*; this removes the platform's rank *sentence*
on the same reasoning, one layer up.

**A rung with no `says` is silent**, and that follows from the decision rather than being a separate
choice: with no platform sentence anywhere, there is nothing to fall back to. `says` is how an author
asks for an announcement, so a ladder carrying none is a ladder that only answers SCORE — a legitimate
design, and the one every ladder written before this feature effectively has. `if.event.rank_risen`
still fires for every crossing regardless, so a story can react to unannounced rungs itself.

Rejected: a platform default in lang-en-us keyed to an `ext-scoring` message id, in combat's shape
(`lang-en-us/src/actions/attacking.ts:56-57` supplies `combat.attack.missed` for
`basic-combat`). It would have made promotions work with zero author effort, but at the cost of a
platform sentence about a moment only the story knows how to describe — and every game announcing a
promotion in the same words is precisely the outcome the ladder exists to avoid.

### D8 — The grammar change carries the Chord version bump and its enforced pin

Three of this ADR's constructs are author-visible grammar — `use scoring`'s indented body, the
`rank … at <n>` rung, and its `says <key>` suffix — so `docs/reference/chord.ebnf` changes, and that
is mechanically enforced. `packages/chord/tests/language-version.test.ts` pins
`{ languageVersion: '1.0.0', ebnfSha256: '6094d1cd…' }` and fails the suite the moment the EBNF file
differs, with the instruction to bump both together (ADR-257 D5).

Four sites move as one commit:

- `CHORD_LANGUAGE_VERSION` in `packages/chord/src/version.ts` → `'1.1.0'`
- the pinned `ebnfSha256` in `packages/chord/tests/language-version.test.ts`, re-recorded
- `docs/reference/chord.ebnf` — the `use-line`, the ranks body, and the `says` suffix
- the "Chord 1.0.0" headers in `docs/reference/chord-grammar.md` and
  `docs/reference/chord-language.md`, plus §4.5's scoring text and §5.10's extension catalog

The version is 1.1.0 rather than 2.0.0 by the recorded override in Consequences, not by these
mechanics — the pin test enforces *that the two move together*, not *which number* is correct.

## Acceptance

1. A `.story` with `use scoring` and a three-rung ladder compiles, and `ir.uses` contains `scoring`
   with the rungs sorted ascending regardless of source order.
2. `SCORE` in that story renders the author's rank name — asserted against a name appearing in no
   platform source.
3. A `.story` with no `use scoring` answers SCORE with `no_scoring`, asserted on the message id.
4. `use scoring` with no `ranks` block answers SCORE with a score and no rank.
5. The gate fires for each of the three gated constructs independently — a bare `score … worth N`,
   a bare `award`, and a bare `rank` rung each produce `analysis.scoring-needs-use` at compile time
   with the offending span — and hand-built rogue IR produces the `LoadError`.
6. Duplicate threshold and duplicate kebab-id each produce their diagnostic with the offending span.
7. The manifest-conformance test passes with `scoring` present on both sides.
7a. A rung with `says <key>` speaks that phrase on the turn the player crosses it, once; a rung
   without `says` speaks nothing while still emitting `if.event.rank_risen`; and an undefined key
   fails at compile time. The spoken text is asserted to come from the story's phrase — a string
   present in no platform source — proving the loader-registered reaction (D7) is what rendered it.
8. **The migration lands.** All fifteen gated `.story` files compile with their `use scoring` line —
   `stories/fernhill/fernhill.story`, `stories/friendly-zoo/zoo.story`, the four chord fixtures
   (`zoo-phase-c`, `traits-basic`, `zoo-actions`, `each-iteration`), and the nine doc fixtures — and
   the chord and story-loader suites are green. The four chord fixtures gate the compiler's own
   tests, so this criterion is a prerequisite for the rest, not a cleanup pass.
9. **The version pin moves as one unit** (D8): `language-version.test.ts` passes with
   `languageVersion: '1.1.0'` and a re-recorded `ebnfSha256`, and `sharpee --version` prints
   `Chord 1.1.0`.
10. **REAL-PATH**: a shipped story — fernhill, migrated — is built and played through
   `dist/cli/sharpee.js`, its SCORE line shows an authored rank, and crossing a rung with `says`
   prints the story's own promotion sentence. Not a fixture, not a stub.

## Consequences

**Gained.** Ranks become authorable for the first time. "This game has no score" becomes sayable.
The story header states the game's feature set in one place, beside `use combat`.

**Lost / cost.** Points thresholds (D2) mean a ladder is tuned against the ceiling as it stood when
written: adding a `score … worth N` line raises the max and leaves the top rung further from it.
That rebalancing is the accepted price of the invariant that a moving ceiling never re-ranks a
player, and it is at least visible — a top rung far below max is lintable, where a silently shifted
percentage boundary is not. Fifteen `.story` files need a `use scoring` line added (D4), including
the language reference's own §4.5 fixture — meaning the reference text changes with the grammar. A
second way to express intent appears: declaring a score and forgetting the `use` becomes a new error
class (the same one `define machine` already has).

**Version — Chord 1.1, as a recorded override of ADR-257 D2.** D4 stops previously-valid stories
from compiling, which ADR-257 D2 defines as a language **major** (*"a removed/renamed construct, or a
construct that no longer compiles"*). The owner has ruled this ships as **Chord 1.1** anyway
(2026-07-23, session 7f133e), consciously setting that rule aside for this change rather than
amending it or softening the gate to a warning.

Both alternatives were considered and rejected: a deprecation window (warn in 1.1, error in 2.0),
which would have kept D2 literally true at the cost of a temporary two-enablement-sources shim; and
amending D2 to classify extension gates as minor, which would have set a general precedent from a
single case.

**This is an exception, not a new rule.** ADR-257 D2 still means what it says for every other change,
and the next construct that stops compiling is still a major unless someone rules otherwise again.
The honest cost of this choice is that D2 was advisory the first time it was tested — recorded here
so a later reader finds a decision rather than an inconsistency.

**Constrained going forward.** `EXTENSION_REGISTRY` growth remains a grammar change, and the
chord-side manifest must move with it. Rank names stay author strings — a future localization story
for ranks would need `override messages <locale>`-style treatment, which this ADR does not design.

**Promotions ship Chord-only, and that should be said plainly.** `says` is Chord syntax and the
rendering reaction is registered by the Chord loader (D7), while ADR-260 D4/D6 leave no platform
sentence anywhere. So a TypeScript story — dungeo included — gets `if.event.rank_risen` and nothing
else: to announce a promotion it must handle the event itself. ADR-260 D6's capability is therefore
*available* to every story but *delivered* only to Chord ones. That is a consequence of putting all
rank prose in the story layer, not an oversight, but it means the feature's headline benefit lands
for Chord authors first.

**Not addressed.** Per-region or per-chapter score ceilings; achievements; demotion announcements
(ADR-260 D6 leaves them silent); and a TypeScript-side convenience for rendering promotions.

## Session

Session 7f133e (2026-07-23). Written together with ADR-260 so the seam between platform and language
is explicit. The `use scoring` shape was chosen after reading `registerBasicCombat` — the only real
extension contributes no verbs, layering behavior behind stdlib actions — which showed that scoring
could be an extension without SCORE-the-verb leaving stdlib.
