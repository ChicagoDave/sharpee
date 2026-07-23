# Implementation Plan — ADR-260 + ADR-261 (Scoring extension & Chord ranks)

**Status**: Phase 1 CURRENT
**Source ADRs**: `docs/architecture/adrs/adr-260-scoring-extension-platform-repair.md` (ACCEPTED),
`docs/architecture/adrs/adr-261-chord-use-scoring-ranks.md` (ACCEPTED)
**Written**: 2026-07-23, session 7f133e
**Execution context**: Docker container, safe mode off, on a branch.

---

## Sequencing rule

ADR-260 is a hard prerequisite of ADR-261: every Chord construct lowers onto a platform seam that
does not exist until 260 lands. Phases 1–5 are 260; phases 6–10 are 261; phase 11 validates both.

**Three phases are atomic and must not be split**, because splitting them leaves the suite red with
no intermediate green:

| Phase | Why atomic |
| --- | --- |
| 4 | Deleting `ScoringCapabilitySchema` breaks `stdlib/tests/test-utils/index.ts:34` the moment it lands — every stdlib action test fails until the helper is fixed in the same commit |
| 6 | Editing `docs/reference/chord.ebnf` reddens `chord/tests/language-version.test.ts`, which pins it by SHA; the version bump and re-pin travel with the grammar edit (ADR-261 D8) |
| 10 | The gate makes all fifteen existing `.story` files fail to compile — four are chord's own fixtures, so the compiler's suite is red until they migrate in the same commit |

**Standing constraint** (root `CLAUDE.md`): never auto-retry a failed build or test. Report and stop.
This matters more than usual here — phases 4, 6, and 10 each go red *by design* mid-phase, and a
retry loop will thrash instead of finishing the phase.

---

## Phase 1 — ScoreLedger gains the rank ladder (world-model)

**Goal**: the platform can hold and resolve a ladder. Pure addition; nothing existing changes.

**Files**: `packages/world-model/src/world/ScoreLedger.ts`, `WorldModel.ts` (delegating methods),
`AuthorModel.ts` (delegation parity — it already mirrors every ledger method), root barrel per
`packages/world-model/CLAUDE.md`.

**Build** (ADR-260 D2):
- `RankDefinition { id: string; name: string; threshold: number }` — thresholds are **absolute
  points**, never percentages.
- `setRanks(ranks)` — sorts ascending on receipt; empty array legal; **throws on duplicate
  thresholds** (silently keeping one would make the resolved rank depend on array order).
- `getRanks()`, `getRank(): RankDefinition | undefined` — **derived on every call** from
  `getTotal()`; never stored.
- `isScoringEnabled()` — default **false**; true once a scoring registration installs itself.
- `clear()` empties entries and maxScore but **leaves the ladder installed** — clearing gameplay
  state must not uninstall story configuration.
- `ScoreLedgerData` and `toJSON`/`fromJSON` are **unchanged**: ranks are configuration, not state.

**AC**: ADR-260 #4 (derived rank rises on award, falls on revoke, with no rank write between),
#5a (a `setMaxScore` change leaves the rank identical), #5b (`clear()` keeps the ladder), #5c
(`setRanks` sorts descending input and rejects duplicate thresholds). Existing world-model suite
green.

**Revert safety**: trivially revertable — nothing consumes it yet.

---

## Phase 2 — `@sharpee/ext-scoring` and the `registerPlugin` call site

**Goal**: the extension and its promotion plugin exist and can be registered. Still additive — no
story calls it yet.

**Files**: new `packages/extensions/scoring/` (mirror `packages/extensions/basic-combat/`'s shape),
`packages/story-loader/src/loader.ts` (`onEngineReady`), workspace + build wiring.

**Build** (ADR-260 D5, D6):
- `registerScoring(world: IWorldModel): void` — **no options bag**. It flips `isScoringEnabled()`
  and registers the plugin. The ladder arrives separately via `world.setRanks(...)`, because
  `ExtensionRegistration.registerWorld` is `(world) => void` on a module-level `const` map and can
  never carry story data.
- A `TurnPlugin` emitting **`if.event.rank_risen`** with `{ fromRank: string | null; toRank: string;
  score: number }` — rank **ids**, not display names. `getState`/`setState` carry only the
  last-announced rank id.
- The `registerPlugin` call site, **in `onEngineReady`** (`loader.ts:679`) — *not* beside the
  `registerWorld` loop, where no plugin registry exists yet:

```ts
for (const name of this.ir.uses ?? []) {
  EXTENSION_REGISTRY.get(name)?.registerPlugin?.(engine.getPluginRegistry());
}
```

Generic over `ir.uses` — it names no extension, satisfying ADR-260 D5 and AC #6.

**AC**: ADR-260 #6 — one promotion per crossing, no re-fire across save/restore, and the plugin
reaches the registry through `registerPlugin` with no loader-side special-casing of `scoring`.

**Watch**: this is `registerPlugin`'s first live use anywhere. Confirm `combat` and `state-machines`
(neither defines the hook) are unaffected by the new loop.

---

## Phase 3 — Rewrite the scoring action; migrate dungeo (behavior-visible)

**Goal**: SCORE reads the ledger. **First phase with player-visible change.**

**Files**: `packages/stdlib/src/actions/standard/scoring/scoring.ts`, `stories/dungeo/src/index.ts`.

**Build** (ADR-260 D3):
- Execute reduces to: `isScoringEnabled()` false → `no_scoring`; else `getScore()`/`getMaxScore()`/
  `getRank()`; no ladder → `score_simple`/`score_display`; ladder → `score_with_rank`, or
  `perfect_score` at the ceiling.
- Delete every `getCapability(SCORING)` read, the `moves`/`achievements` plumbing, `computeRank`,
  and the `progressMessage` computation.
- **Dungeo migration is mandatory in this same phase**: add `registerScoring(world)` +
  `world.setRanks([...])` to `initializeWorld()`, porting ADR-085's `dungeo.rank.*` table (already
  absolute points: 0 / 50 / 200 / 400 / 616). Without it dungeo's SCORE emits `no_scoring` — *"This
  isn't that kind of game"* — in a 616-point game.
- Dungeo's own `registerCapability(SCORING, { moves, deaths })` stays as private bookkeeping.

**AC**: ADR-260 #2, #3.

---

## Phase 4 — Delete the capability (ATOMIC)

**Goal**: remove the dead contract. **Largest blast radius in the plan.**

**Files**: `packages/stdlib/src/capabilities/scoring.ts`, `capabilities/index.ts:55`,
`packages/stdlib/tests/test-utils/index.ts:34`,
`packages/stdlib/tests/unit/capabilities/capability-refactoring.test.ts:18,28`,
`packages/engine/tests/integration/query-events.test.ts:32`.

**Build** (ADR-260 D1): delete `ScoringCapabilitySchema` and `ScoringData`; remove the
`StandardCapabilities.SCORING` entry from `StandardCapabilitySchemas`. `StandardCapabilities.SCORING`
the *identifier* survives for stories using it as private bookkeeping.

**Why it must be one commit**: `registerStandardCapabilities()` defaults to registering every schema
in the table, and `test-utils/index.ts:34` calls it for every stdlib action test. The moment the
entry disappears, that helper and the tests asserting the old field shape break together.

**Note for the implementer**: this is the phase that reveals *why* the bug existed — stdlib's tests
registered a capability no shipped story ever had, so the tested configuration and the shipped
configuration differed.

**AC**: ADR-260 #1 (grep for `ScoringCapabilitySchema|computeRank|scoringSystemMessages` returns
nothing outside deleted files). Full stdlib + engine suites green.

---

## Phase 5 — Delete dead messages; prune both alias tables

**Goal**: the message set matches what the action can emit.

**Files**: `packages/lang-en-us/src/actions/scoring.ts`,
`packages/chord/src/message-alias-catalog.ts:556-573`,
`packages/story-loader/src/message-alias-map.ts:553-570`.

**Build** (ADR-260 D3, D4): delete `rank_novice`…`rank_master`, the whole `scoringSystemMessages`
export, `scoring_not_enabled`, the four progress messages, and both achievement messages.
**Survivors are exactly five**: `no_scoring`, `score_simple`, `score_display`, `score_with_rank`,
`perfect_score`.

Prune **thirteen** of the eighteen `scoring-*` aliases from **both** tables. They are parallel;
drift between them is a live-alias/dead-target bug, so they move together.

**Revert safety**: independently revertable — no behavior depends on the deletions.

---

## Phase 6 — Chord grammar + version bump (ATOMIC)

**Goal**: `use scoring` with a body, `rank "<name>" at <n>`, and the `says <key>` suffix parse.
Parse only — no analysis, no lowering.

**Files**: `packages/chord/src/lexer.ts`, `parser.ts`, `ast.ts`, `docs/reference/chord.ebnf`,
`packages/chord/src/version.ts`, `packages/chord/tests/language-version.test.ts`.

**Build** (ADR-261 D2, D7, D8): the indented `use scoring` body — the first `use` line to take one,
where `use combat` and `use state-machines` take none. `parse.rank-outside-scoring` for a stray rung.

**All four version sites move in this commit** (ADR-261 D8): `CHORD_LANGUAGE_VERSION` → `'1.1.0'`,
the `ebnfSha256` re-pin, `chord.ebnf` itself, and the "Chord 1.0.0" headers in
`docs/reference/chord-grammar.md` and `chord-language.md`.

**Expect red mid-phase**: `language-version.test.ts` fails the instant the EBNF changes. That is the
pin working, not a regression — bump version and SHA together and it goes green.

**Version note**: 1.1.0, not 2.0.0, by the recorded override of ADR-257 D2 in ADR-261 § Consequences.
The pin enforces that version and SHA move together, not which number is right.

**AC**: ADR-261 #9.

---

## Phase 7 — Registry entry + manifest

**Goal**: `use scoring` is a known extension name that registers something.

**Files**: `packages/story-loader/src/extension-registry.ts`,
`packages/chord/src/manifests/scoring.ts` + `manifests/index.ts`.

**Build** (ADR-261 D1): `['scoring', { registerWorld: (world) => registerScoring(world) }]`;
`SCORING_MANIFEST` with **no trait adjectives** (like `state-machines`).

**Ordering — this must precede Phase 10.** The migration adds `use scoring` to fifteen files, and an
unknown `use` name is a `LoadError` (*"names no trusted extension"*). Migrating before this phase
would break every file it touches.

**AC**: ADR-261 #7 (manifest-conformance test green with `scoring` on both sides).

---

## Phase 8 — Analyzer + IR

**Goal**: ladders reach the IR, validated.

**Files**: `packages/chord/src/analyzer.ts`, `ir.ts`.

**Build** (ADR-261 D2, D5, D7): `IRRankDef { name; threshold; phraseKey?; span }` on the story
header. Ids by kebab-casing the name (ADR-254). Sort ascending at compile time. Diagnostics:
`analysis.duplicate-rank-threshold`, `analysis.duplicate-rank-id`, `analysis.rank-above-max` (sound
only because Chord has no runtime `setMaxScore`).

**`phraseKey` lives on `IRRankDef` and never on `RankDefinition`** — a phrase key is a Chord concept
a TypeScript story cannot supply.

**AC**: ADR-261 #1, #6.

---

## Phase 9 — Loader lowering + the `says` reaction

**Goal**: ladders install; promotions speak.

**Files**: `packages/story-loader/src/loader.ts`.

**Build** (ADR-261 D5, D7): lower `ir.ranks` via `world.setRanks(...)` beside the existing
`setMaxScore` at `loader.ts:518` — **generic, name-agnostic**, no knowledge that `scoring` consumes
it. Register the story-side reaction mapping `if.event.rank_risen`'s `toRank` id to the rung's
`phraseKey`.

Three load-time steps now land at three moments: `registerWorld` before entity construction
(`:369-376`), the ladder at `:518`, the plugin at `onEngineReady` (`:679`). All complete before turn
one; awards and crossings happen only during play.

**AC**: ADR-261 #7a — a rung with `says` speaks its phrase once, a rung without speaks nothing while
still emitting the event, and the spoken text is asserted to be a string present in no platform
source.

---

## Phase 10 — The gate + fifteen-file migration (ATOMIC)

**Goal**: scoring is on precisely when the header says so.

**Files**: `packages/chord/src/analyzer.ts` (gate), `story-loader/src/loader.ts` (LoadError
backstop), fifteen `.story` files, `docs/reference/chord-language.md` §4.5 and §5.10.

**Build** (ADR-261 D4): `analysis.scoring-needs-use` for a bare `score`/`award`/`rank`, backstopped
by a `LoadError` for rogue IR — the two-layer shape of `define machine` (`loader.ts:705`).

**Migration list**: `stories/fernhill/fernhill.story`, `stories/friendly-zoo/zoo.story`, four chord
fixtures (`zoo-phase-c`, `traits-basic`, `zoo-actions`, `each-iteration`), nine doc fixtures
including `docs/work/chord-language-reference/fixtures/flow/scoring.story`.

**Why atomic**: the four chord fixtures gate the compiler's own tests. Landing the gate without them
reds the chord suite; landing them without the gate is a no-op.

**AC**: ADR-261 #5 (each of the three constructs gated independently, with spans), #8 (all fifteen
compile; chord + story-loader suites green).

---

## Phase 11 — REAL-PATH validation

**Goal**: prove it through the shipped CLI, not through fixtures.

**Build**:
- **Fernhill** — migrated, given a ladder with at least one `says` rung, built and played via
  `node dist/cli/sharpee.js`. SCORE shows an authored rank; crossing the rung prints the story's own
  sentence (ADR-261 #10).
- **Dungeo** — walkthrough chain crossing the thief's death, SCORE read before and after, proving the
  616 → 650 ceiling change leaves the rank untouched (ADR-260 #7). This is the empirical form of D2's
  invariant.

Per `one-good-run-rule`: a single passing dungeo chain is the baseline; thief/combat RNG flakes are
not regressions.

---

## Risk register

| Risk | Phase | Mitigation |
| --- | --- | --- |
| Capability deletion cascades through every stdlib action test | 4 | Atomic commit; test-utils fixed in the same change |
| EBNF pin reds the suite | 6 | Expected; bump version + SHA together |
| Migration reds chord's own fixtures | 10 | Atomic; registry entry already landed in Phase 7 |
| Dungeo SCORE silently becomes `no_scoring` | 3 | Migration is in-phase, not follow-up |
| `registerPlugin`'s first live use | 2 | Verify combat/state-machines unaffected by the new loop |
| Auto-retry thrashing on by-design red | 4, 6, 10 | Root `CLAUDE.md`: never auto-retry; report and stop |

## Out of scope

Demotion announcements; `moves`/`achievements` replacements; a TypeScript-side convenience for
rendering promotions (promotions ship Chord-only); per-region score ceilings; localization of rank
names.

## References consulted

ADR-260, ADR-261 (both ACCEPTED, this session), ADR-257 D2 + its recorded exception, ADR-129
(ScoreLedger), ADR-215 (extension contract), ADR-085/076 (superseded; source of dungeo's ladder),
ADR-254 (kebab keys), root + stdlib + world-model `CLAUDE.md`.
