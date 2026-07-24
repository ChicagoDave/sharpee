# Session Summary: 2026-07-24 - hatch-scoring (CST)

## Goals
- Implement the plans for ADR-260 + ADR-261 (scoring extension & Chord ranks).
- Implement the plan for ADR-259 (Chord browser build supports hatch modules).

## Phase Context
- **Plans**: `docs/work/adr-260-261-scoring-ranks/plan.md` (11 phases),
  `docs/work/adr-259-hatch-browser-build/plan.md` (6 phases).
- **Phases executed**: all 17.
- **Phase outcome**: both plans COMPLETE; one acceptance item uncovered (below).

## Completed

Branch `hatch-scoring` off `main` at `9ede113c`. Twelve commits, one per plan
phase or atomic group, each green before the next.

### ADR-260 — scoring is a trusted extension (phases 1-5, 11)

`ScoreLedger` gained `RankDefinition`, `setRanks`/`getRanks`/`getRank` and the
enabled flag; the rank is **derived on every call**, thresholds are **absolute
points**, and `ScoreLedgerData` is unchanged so pre-ADR saves load intact.
`clear()` keeps the ladder.

New `@sharpee/ext-scoring`, shaped like `ext-basic-combat` — no action, no
grammar, no messages. `registerScoring(world)` takes no options bag;
`RankWatcherPlugin` emits `if.event.rank_risen` with rank ids and keeps only
the last-announced id, so promotions survive save/restore without re-firing.
The loader's `onEngineReady` gained the generic `registerPlugin` loop over
`ir.uses` — **`ExtensionRegistration.registerPlugin`'s first live call site**
since it was declared.

`if.action.scoring` reduced to a ledger reader: `computeRank` and its five
English literals deleted, every `getCapability(SCORING)` read gone, and
`no_scoring` finally reachable. The capability itself deleted (atomic with its
test-infrastructure migration). Thirteen of eighteen messages deleted; both
alias tables pruned in parallel.

Dungeo migrated in-phase with ADR-085's ladder, ported verbatim at
0/50/200/400/616.

### ADR-261 — `use scoring` and the rank ladder (phases 6-11)

Chord grammar: `use scoring` is the first `use` line to take an indented body;
`rank "<name>" at <n> [says <key>]` rungs; **Chord 1.1.0** with all four
version sites moving in one commit, as the EBNF SHA pin enforces.

`scoring` joined both registries (manifest + runtime), filling two of ADR-215's
three contract parts. `IRRankDef` carries kebab ids derived from the author's
name; three diagnostics gate the ladder. The loader lowers `ir.ranks` through
`setRanks` generically — no extension name appears in the loader.

The gate landed atomically with the migration: fifteen `.story` files plus two
inline test sources the ADR's file count did not cover.

### ADR-259 — the hatch browser build (phases A-F)

The CLI now transpiles the **authored** `.ts` through esbuild, retiring the
`dist/<base>.js` lookup. One implementation shared by all three former copies.
`esbuild` became a real `@sharpee/devkit` dependency.

`stories/friendly-zoo` split into a clean Chord story; the tutorial moved whole
to `stories/family-zoo-tutorial`. **This made the authored path true for the
first time** — `zoo.story:789` declares `from "./chord-extras.ts"` and the file
was at `src/chord-extras.ts`.

The `hasHatches` throw is gone. The bind check proves five failure modes at
build time. The build reports that a hatched bundle carries author-written
executable code.

## Key Decisions

1. **The hatch map ships as a generated sibling module** (`hatch-modules.ts`),
   not as placeholders substituted into the entry. Forced by a real failure:
   `init-browser` scaffolds a hand-written entry through a different
   substitution path, which left `{{HATCH_MODULES}}` literal and broke two
   existing browser-build tests. The sibling shape also lets D4's escape hatch
   keep hatch support.
2. **The promotion narrator derives the crossing rather than observing the
   event.** `TurnPluginContext.actionEvents` is a snapshot taken before the
   plugin loop, so no plugin can see another's output. Both plugins read the
   same derived ledger and cannot disagree.
3. **The transpiler keeps no cache of its own.** The output path is a hash of
   the source, so Node's require cache already keys on content. A path-keyed
   cache returned stale exports after an edit — caught by a test.
4. **friendly-zoo keeps no ladder**, so its scoring transcript now covers
   ADR-261 acceptance #4 (scoring on, no ladder, a score and no rank).

## Next Phase
Nothing planned. Both tracks are complete on `hatch-scoring`; the branch is
unpushed and unmerged.

## Open Items

### Short Term
- **`dotted-phrase-keys.test.ts` fails, and did before this work** — verified by
  stashing to a clean tree. A chord `parse.dotted-key` diagnostic rejects
  `if.action.taking.fixed_in_place`. Unrelated to scoring or hatches; worth its
  own look.
- **ADR-259 Phase F is not fully covered**: the bound producer's output is not
  asserted in a *running browser*, for want of a headless browser in the
  container. Parity is pinned at the module and bundle level instead, and the
  gap is recorded in the test header and the ADR status line.
- `packages/sharpee/docs/genai-api/lang.md` still lists the deleted scoring
  messages; it is generated from `.d.ts` and needs a regeneration pass.

### Long Term
- Promotions ship Chord-only (ADR-261 Consequences) — a TypeScript story gets
  `if.event.rank_risen` and must render it itself.
- The `score_with_rank` template renders "the rank of **an** Adventurer" — the
  formatter adds an article to `{rank}`. Pre-existing (the old `computeRank`
  output read the same way), cosmetic, and lang-en-us territory.

## Files Modified

**New packages/modules**: `packages/extensions/scoring/` (package, plugin,
tests, vitest config), `packages/devkit/src/standalone/hatch-transpile.ts`.

**Platform**: `world-model` (ScoreLedger, WorldModel, AuthorModel, barrels),
`if-domain` (RANK_RISEN), `stdlib` (scoring action + events, capabilities,
channels), `lang-en-us` (scoring messages), `chord` (ast, parser, ir, analyzer,
manifests, version), `story-loader` (loader, extension-registry,
message-alias-map), `devkit` (browser-core, author-game, entry template).

**Stories**: dungeo (`registerScoring` + ladder, new invariant transcript),
fernhill (ladder + two promotion phrases), friendly-zoo (split; scoring
transcript rewording), `stories/family-zoo-tutorial/` (new home).

**Docs**: `chord.ebnf`, `chord-grammar.md`, `chord-language.md`, all three ADR
status lines, both plan status lines.

## Notes

**Approach**: one commit per plan phase, with the three phases the plan marked
ATOMIC kept atomic. Every phase built both tsf targets and ran the affected
suites before committing.

**Environment**: the container had no `node_modules`, no `pnpm` on PATH
(`corepack pnpm` works), and an unbuilt `repokit`. Also: `tsf build` refreshes
only the CJS target — the ESM target needs `--target esm` separately, and
forgetting it produces false test failures against stale artifacts. That cost
one wrong diagnosis in phase 5.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: branch is unpushed; `main` is untouched.

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-129's ScoreLedger, ADR-215's extension contract,
  ADR-257's version rules, ADR-254's kebab convention, ADR-252's build contract.
- **Prerequisites discovered**: friendly-zoo's transcripts could not run at all
  before ADR-259 Phase A (no `dist/`), which is why a scoring regression in that
  story surfaced only during the hatch track.

## Architectural Decisions

No new ADRs. Three deviations from accepted ADRs are recorded in the ADR status
lines themselves: ADR-259's sibling-module hatch map and uncovered browser
assertion, ADR-260's unenumerated `score`-channel migration site, and ADR-261's
unreachable third gate case plus the derive-not-observe narrator.

## Mutation Audit

- `setRanks` sorts on receipt and throws on duplicate thresholds — asserted.
- `registerScoring` flips `isScoringEnabled()` — asserted, including that it
  does NOT install a ladder.
- The loader's `setRanks` lowering — asserted against the installed ladder.
- `clear()` empties entries and maxScore while keeping the ladder — asserted.
- All rank reads are derived; nothing writes a rank. No mutation to audit there
  by construction.

## Recurrence Check

- Similar to past issue? **YES** — "seam built and left unused" recurs for the
  fourth and fifth time: last session found three (`story-loader`'s hatch
  injection, `registerPlugin`, `ScoringCapabilitySchema`). This session added
  the `score` channel's unreachable capability fallback, and found
  `registerEventChain` — declared in world-model with **no call site anywhere in
  the repo**. Two of the five are now live or deleted; `registerEventChain` is
  still a reserved slot.
- The threshold the last session set ("worth a sweep if a fourth appears") is
  passed. A sweep for declared-but-uncalled platform seams is now warranted.

## Test Coverage Delta

- New: `score-ranks.test.ts` (16), `rank-watcher-plugin.test.ts` (14),
  `scoring-golden.test.ts` (15), `rank-ladder-parse.test.ts` (15),
  `rank-ladder-analysis.test.ts` (16), `scoring-gate.test.ts` (7),
  `rank-ladder.test.ts` (17), `hatch-bind-check.test.ts` (10),
  `hatch-host-parity.test.ts` (3). Plus one dungeo transcript.
- Suites green: world-model 1416, stdlib 1576, engine 524, chord 514,
  lang-en-us 430, devkit 80, ext-scoring 14, story-loader 350 (1 pre-existing
  failure).
- REAL-PATH through `dist/cli/sharpee.js`: dungeo chain 638, dungeo units 1783,
  friendly-zoo 71 + 7 walkthroughs, fernhill 76.

---

**Progressive update 1**: both plans implemented end to end; 12 commits on
`hatch-scoring`, unpushed — 2026-07-24
