# Session Plan: GH #321 — a goal step as any acting-statement shape (ADR-329 D10)

**Created**: 2026-08-29
**Plan Status**: DONE
**Overall scope**: Generalize Chord's closed eight-verb goal-step vocabulary so a goal body
line that opens no step verb is tried as an acting statement whose actor is the block's
owner (D10). `taking`/`giving`/`dropping` shapes fold onto the existing `acquire`/`give`/
`drop` steps (their plan half — waiting, blocking — is unchanged); every other shape lowers
to one new `perform` step that acts now through `NpcTickContext.act`, sharing D6's one
truth for how a Chord character acts. Compiler work (parser/analyzer/AST/IR), then
character + story-loader runtime, then build/corpus/paper-trail/version-bump/closeout.
**Bounded contexts touched**: Chord Story Language (`packages/chord` — parser, analyzer,
AST, IR); Normative Character Layer (`packages/character` — goal steps, step evaluator,
tick phases); Story-Loader (`packages/story-loader` — the seam between compiled IR and the
built world, which supplies the loader-side id/action mappings both contexts need). No
engine, stdlib, or world-model change (D10 Surfaces).
**Key domain language**: acting statement, perform step, goal step, the fold (acquire /
give / drop), role-sorting (directObject / indirectObject / instrument / direction),
execution entry (`NpcTickContext.act`), `matchActShape`, `StepMutation`.

## References consulted
- `docs/architecture/adrs/adr-329-chord-acting-statement.md` §D10 — the goal-step-generalization decision this plan implements: the fold table, the `perform` step's shape, the errors (D2's, by name), the Surfaces list, and Acceptance items 6–8. This repo keeps ADRs at `docs/architecture/adrs/` rather than `docs/adrs/` (confirmed empty/absent); D10 is the authoritative source for this plan, not a secondary reference.
- `docs/architecture/adrs/adr-329-chord-acting-statement.md` §D6 (landing note, Phase 9c) — the runtime half already exists: `performStep`/`stepAction` in `tick-phases.ts` resolve a step's mutation to one action run through the execution entry; the refusal ruling (no advance, no announcement, retried next tick, each witnessed refusal narrating) is D6's, reused unchanged by D10 — Phase 2 must not re-derive it.
- `docs/architecture/adrs/adr-257-chord-language-version.md` — D2's semver rule: an additive, backward-compatible construct is a **minor** bump (4.1.0 → 4.2.0), never a major; the `chord.ebnf` surface pin (`language-version.test.ts`) fails the build on any grammar change without a matching bump, which gates Phase 3's ordering (grammar change and version bump land together).
- `docs/context/project-profile.md` — Chord Story Language and Normative Character Layer are separately named domains in this repo's own model; TypeScript strict mode (`noImplicitAny`, `noFallthroughCasesInSwitch`) applies to every new switch arm this plan adds; `pnpm --filter '@sharpee/<pkg>' test <name>` is the per-package test invocation; platform changes here are secondary to Chord + the IDE but this work is explicitly authorized (GH #321 discussed and approved).
- `docs/context/session-20260829-1418-feat-adr-321-world-index.md` (most recent session, this branch) — Open Items: none recorded; D10 was written this session as DRAFT, awaiting David's acceptance, which is why Phase 1 stops for explicit go before any edit (see Gating below).

**Proposals**: none of `docs/proposals/*.md` carry an ACCEPTED-not-PLANNED item in this
scope — this plan is not a "plan proposal" invocation, so no proposal item ids are cited
and no proposal status flips apply.

## Gating (DevArch rule 5 + CLAUDE.md platform-change rule)

ADR-329 D10 is **DRAFT**, not yet accepted by David, and `packages/chord`, `packages/
character`, and `packages/story-loader` are all under CLAUDE.md's "platform changes require
discussion first" rule. The goal's own framing note says GH #321 discussion already
happened ("gh 321 it is") — but this plan still does not open Phase 1 without an explicit
go from David in this session, per DevArch rule 5 ("never proceed from planning to
implementation without explicit user permission"). Accepting D10 itself (flipping DRAFT →
ACCEPTED) is a separate, David-only action from authorizing implementation; either can come
first, but Phase 1 needs both before its first edit.

## A pre-existing gap Phase 3 will meet, flagged now

`packages/chord/chord.ebnf` has **no goal-block production at all** today — not even the
existing eight step verbs (`seek`/`acquire`/`wait-for`/`move-to`/`act`/`say`/`give`/`drop`)
appear in the grammar file, confirmed by direct search (zero matches for `seek`, `acquire`,
`active`, or `goal` as a grammar keyword). D10's paper trail line ("the goal-step production
gains the row") assumes a production that add a row to, but that production was never
landed — an ADR-310 D8 paper-trail gap, not something D10 introduced. Similarly, the
goal/character reference page (`website/src/app/chord/guide/characters-and-conversation/
goals/content.mdx`, 37 lines) documents only `seek`/`move to`/`say` and has never been
updated for D6's `acquire`/`give`/`drop` landing (2026-08-29, same day). Phase 3 adds the
`perform` row/documentation as D10 asks; it does **not** silently expand to backfill the
whole pre-existing gap. This is flagged for David to decide: close the full gap in Phase 3,
file it as a follow-on issue, or leave it — not a call this plan makes on its own.

## Phases

### Phase 1: Compiler — the acting-statement fold and the `perform` step (Acceptance 6)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Chord Story Language — `parseGoalBodyLine`'s step vocabulary, the
  analyzer's goal-step lowering switch, `matchActShape`'s role-sorting, one new IR/AST step
  kind.
- **Entry state**: ADR-329 D10 accepted or David's explicit go to implement it; branch
  `feat/adr-321-world-index` clean; `./repokit build dungeo` last known green (per pending
  pre-session-audit / prior session baseline).
- **Deliverable**:
  - `packages/chord/src/ast.ts` (`~934`) — `GoalStepDecl` gains a `perform` variant carrying
    raw words (mirroring `ActStmt`'s shape, not a pre-parsed verb) so the analyzer does the
    shape matching, exactly as it does for the top-level acting statement.
  - `packages/chord/src/parser.ts` (`parseGoalBodyLine`, `~2154`) — a default case before
    the existing `parse.goal-step` error: a body line matching none of the eight step verbs
    (and not `active when`) is admitted as a `perform` candidate using the same admission
    heuristic `tryParseActStatement` (`~7199`) uses (`stdlibActVerbs()`, `storyVerbLexicon()`,
    `verbLemmas`) — not re-tried as a step, tried as a raw-words line for the analyzer. A
    `when` suffix on a step line still fires `parse.goal-step` naming `wait for` (unchanged
    for the other seven verbs; the default case must not accept a suffix either).
  - `packages/chord/src/analyzer.ts` — the goal-step lowering switch (`~5170`) gains a
    `perform` case beside the existing eight, sharing `matchActShape` (`~6646`) with
    `resolveActStatement` (`~6475`) for shape matching. It role-sorts slots into
    directObject/indirectObject/instrument/direction using the **same rule as
    `runtime.ts:3556-3568`** (a story action's `slotTypes` — built from the AST's own
    `DefineAction.slotTypes: SlotTypeDecl[]`, `ast.ts:1514-1515` — marks instrument slots;
    otherwise shape order gives directObject then indirectObject; `direction` comes from a
    `going` shape's literal) so the role-sort happens once, at compile time, using data the
    analyzer already has from its own `storyActShapes()` AST scan — no dependency on
    `this.ir.actions` ordering. Slot name refs resolve via `resolveEntityId` (the `'player'`
    sentinel included — `the player` is admissible in a slot; the owner never appears,
    matching D10's ruling and D1's player-as-actor exclusion which does not apply to slots).
    Errors are D2's, by name (`parse.goal-step` for an unopened verb — parser-side;
    `analysis.act-slot-shape` for a verb whose shapes the words don't fit, listing them;
    the existing unknown-entity error for an unknown slot name).
  - `packages/chord/src/ir.ts` (`IRGoalStep`, `~645`) — one new `perform` variant: bare
    action name (unqualified — the analyzer does not know the `chord.action.` prefix, D10
    Surfaces), shape name, and slots already role-sorted (`directObject?`, `indirectObject?`,
    `instrument?` as resolved IR entity ids; `direction?` as a resolved literal word).
  - `packages/chord/tests/` — a new test file (model: `act-statement.test.ts`'s 18-case
    shape) covering each row of D10's fold table lowering as stated (`take`/`give`/`drop`
    shapes fold to `acquire`/`give`/`drop`, not `perform`); a story verb (`conjure the key
    into the Vault`, D10's own worked example) lowers to `perform` with roles sorted; `go
    east` carries the direction; each named error fires by its id, with `the player` in a
    slot admissible and the owner never named. `packages/chord/tests/language-version.test.ts`
    is expected to fail once the grammar changes (its EBNF hash pin) — do not attempt to make
    it pass in this phase; Phase 3 re-pins it alongside the version bump.
- **Exit state**: `pnpm --filter '@sharpee/chord' test <new-test-name>` green; every other
  chord suite green except the expected `language-version.test.ts` EBNF-hash failure (left
  for Phase 3); `packages/chord/src/ast.ts`, `parser.ts`, `analyzer.ts`, `ir.ts` compile
  under strict mode with no new `any`. No character/story-loader/website change yet.
- **Status**: DONE (2026-08-29, session 9de27b — David's go "go ahead with phase 1".
  Landed: `ast.ts` `GoalStepDecl` `perform` variant; `ir.ts` `IRGoalStep` `perform` +
  `IRPerformSlots`; `parser.ts` `tryParsePerformStep` (default case in `parseGoalBodyLine`,
  `when` suffix refused naming `wait for`); `analyzer.ts` `lowerPerformStep` (fold on
  manifest `taking`/`giving`/`dropping` unless a story action shadows the name; roles from
  the AST's `slotTypes`), with `actWordsSpan`/`actWordsNameRef` factored out of
  `resolveActStatement`. Tests: `packages/chord/tests/adr-329-d10-perform-step.test.ts`,
  18; chord suite 1100 passing / 72 files. `language-version.test.ts` did NOT go red — the
  EBNF is untouched until Phase 3. `pnpm exec tsc --noEmit -p packages/chord/tsconfig.json`
  clean.)

### Phase 2: Character + story-loader runtime — the `perform` step acts (Acceptance 7)
- **Tier**: Medium
- **Budget**: 250 tool calls
- **Domain focus**: Normative Character Layer (`packages/character` — `GoalStep`,
  `StepMutation`, `evaluateStep`, `performStep`/`stepAction`) and the Story-Loader seam
  (`packages/character/src/apply-compiled.ts`'s `mapGoalStep`, `CompiledCharacterContext`;
  `packages/story-loader/src/loader.ts`'s wiring, `~884`) that supplies the loader-owned id
  mappings both packages need but neither owns alone.
- **Entry state**: Phase 1 done — `chord`'s IR carries a `perform` goal step with bare
  action name and role-sorted, compile-time-resolved slot ids.
- **Deliverable**:
  - `packages/character/src/goals/goal-types.ts` — `PerformStep` (`type: 'perform'`, bare
    action name, role-sorted slot refs) added to the `GoalStep` union (`~114`); `StepMutation`
    (`~224`) gains one `{ kind: 'perform'; actionId: string; slots: ActSlots }` variant
    carrying an **already-fully-resolved** actionId and world-ready slots — unlike `move`/
    `take`/`give`/`drop`, `perform` needs no further lookup at tick time (D10: "it acts
    now... the action's own validate is the only gate").
  - `packages/character/src/apply-compiled.ts` — `CompiledCharacterContext` (`~42`) gains a
    second loader-supplied resolver beside `resolveEntityId`: an action-id qualifier (bare
    story action name → `chord.action.<name>`, matching `runtime.ts:3544`'s
    `storyDef ? 'chord.action.' : 'if.action.'` rule — `mapGoalStep`, `~113`, needs to know
    whether the name is a story action or a standard one, the same test `runtime.ts` makes
    against `this.ir.actions`). `mapGoalStep`'s new `perform` case resolves every slot
    through `resolve` (the entity-id mapping, IR id → world id) and the action name through
    the new resolver, producing a `PerformStep` with world-ready ids.
  - `packages/story-loader/src/loader.ts` (`~884`) — supplies both resolvers when calling
    `applyCompiledCharacter`; the action-id resolver looks up `this.ir.actions` exactly as
    `runtime.ts:3544` does, so the two code paths apply one rule from two call sites (not a
    shared function across the character/story-loader boundary — `character` cannot import
    `story-loader` — but one rule, stated once here and cited at both sites).
  - `packages/character/src/tick-phases.ts` — `stepAction`'s switch (`~911`) gains one
    `case 'perform'`: no room-exit lookup, no entity re-fetch — the mutation already carries
    a ready `actionId`/`ActSlots` pair, so this case is a direct pass-through. `performStep`
    (`~888`) needs no change; the existing refusal/witness/advance path (D6, reused
    unchanged per D10) already covers whatever `stepAction` returns.
  - **Scaffolding test** (rule 13a, declared, not the gate): extend
    `packages/character/tests/tick-phases/goal-world-mutations.test.ts` using
    `scaffold-entry.ts`'s hand-written `ExecutionEntry` stand-in to exercise `stepAction`'s
    new case directly and cheaply during iteration.
  - **REAL-PATH test** (rule 13a, the acceptance gate): a new
    `packages/story-loader/tests/adr-329-d10-perform-step.test.ts` (model: `adr-329-goal-
    steps.test.ts`'s 5-case shape, on `GameEngine.executeTurn`) covering every clause of
    Acceptance 7 — D10's own wizard example (`conjure the key into the Vault` moves the key,
    asserted on `world.getLocation`, and advances the step); `take the key` written as a goal
    step waits until the key is in the room (the `acquire` fold, on the real path, not
    `perform`); a refused `perform` (an out-of-reach or otherwise-blocked action) leaves the
    world unchanged, does not advance, and narrates its refusal to a present player on each
    retried turn (D6's ruling, reused).
- **Exit state**: `pnpm --filter '@sharpee/character' test <scaffolding-test-name>` and
  `pnpm --filter '@sharpee/story-loader' test adr-329-d10-perform-step` both green; the
  REAL-PATH test is the acceptance gate for Acceptance 7 — the scaffolding test alone does
  not close this phase (rule 13a). `applyStepMutation` remains gone (D6 already retired it;
  this phase does not resurrect an off-pipeline path for `perform`).
- **Status**: DONE (2026-08-29, session 9de27b — David's go "phase 2". Landed as
  planned: `goal-types.ts` `PerformStep`/`PerformSlots`/`StepMutation.perform`;
  `step-evaluator.ts` completes with the mutation; `apply-compiled.ts` `mapGoalStep` +
  `CompiledCharacterContext.resolveActionId`; `loader.ts` supplies it; `tick-phases.ts`
  `stepAction` resolves ids/direction (and a `perform` of `going` marks `movedNpcIds`).
  **Platform correction the real path forced**: `runtime.ts` `buildDispatchAction` bound
  `the actor` and every capability/after-clause actorId to `context.player` — a story
  action performed by an NPC bound the player; now `(context.actor ?? context.player)`;
  the real-path case for it was verified to fail with the fix stashed. Fixture finding:
  a story action's effect must live in a `define trait … on <actor> <gerund> … end trait`
  the entity composes (entity `on` clauses never fire on the dispatch path — loader rule);
  the ADR's D10 block corrected to that shape. Tests: REAL PATH
  `packages/story-loader/tests/adr-329-d10-perform-step.test.ts` 6 on
  `GameEngine.executeTurn`; scaffolding `goal-world-mutations.test.ts` +4 (15), and
  `scene-sub-step.test.ts` +1 (a `perform` of `going` closes a scene on exit — the
  `movedNpcIds` marking, a mutation-verification gap). The unresolved-slot guard is
  scaffold-only by design (unreachable on the real path; noted in the test).
  story-loader 992 passing / 94 files; character 579 / 49; both tsc clean;
  `./repokit build dungeo` green, stamping 5.2.0.)

### Phase 3: Build, corpus, paper trail, version bump, closeout (Acceptance 8, D8)
- **Tier**: Small
- **Budget**: 100 tool calls
- **Domain focus**: cross-cutting — no new domain concept, verification and paper trail for
  Phases 1–2's `perform` step.
- **Entry state**: Phase 2 done — REAL-PATH test green on `GameEngine.executeTurn`.
- **Deliverable**:
  - `./repokit build dungeo` (use `--skip <pkg>` to resume on a partial failure) — full
    platform build.
  - Corpus comparison against the `docs/context/session-20260829-0234-...md` baseline via
    `dist/cli/sharpee.js`: ides-of-march (39 cards), fernhill (36), secret-letter (131
    passing / 29 pre-existing failing), thealderman and character-acceptance suites, Dungeo
    chain (952 passing / 17 transcripts) — zero diffs expected (Acceptance 8: "none uses the
    form" — the corpus doesn't write `perform` steps yet, so this is a regression check, not
    a new-behavior check).
  - **No version bump in this phase** (superseded 2026-08-29, session 9de27b — David: nothing
    past Chord 3.3.0 / Sharpee 5.1.1 is published, so 3.4.0/4.0.0/4.1.0/D10 collapse into
    Chord **3.5.0** alongside Sharpee **5.2.0**; both already set this session — `version.ts`,
    the pin test, `adr-327-phase1.test.ts`, the 4 golden snapshots, and `tsf version 5.2.0`
    across 34 packages). Phase 3 only re-records the EBNF hash in
    `packages/chord/tests/language-version.test.ts` under 3.5.0 when the goal-step row lands.
    `./repokit build` stamps `engine-version.ts` and Dungeo's `version.ts` to 5.2.0.
  - Paper trail: `packages/chord/chord.ebnf` — add the `perform` row (and, per the flagged
    gap above, only after a decision from David on whether to also land the missing
    goal-block production this phase or defer it); `docs/architecture/chord-grammar-
    changes.md` — dated entry; `website/src/app/chord/reference/grammar/content.mdx` and
    `website/src/app/chord/guide/characters-and-conversation/goals/content.mdx` (37 lines
    today, documents only `seek`/`move to`/`say`) — add the fold table and the `perform`
    step, using D10's wizard example.
  - `docs/architecture/adrs/adr-329-chord-acting-statement.md` — stamp D10's Acceptance
    items 6–8 with the session, test file names, and counts (mirroring D6/D7's own landing
    notes' style).
  - `gh issue close 321` with a landing comment citing the session and the REAL-PATH test.
- **Exit state**: corpus identical to baseline; chord/story-loader/character suites green;
  `CHORD_LANGUAGE_VERSION` at 3.5.0 with a re-pinned surface hash; D10 stamped
  Acceptance-complete; GH #321 closed.
- **Status**: DONE (2026-08-29, session 9de27b — David's go "phase 3". Corpus identical to
  baseline through the rebuilt bundle: fernhill 36, ides 39, secret-letter 131/29,
  thealderman 4, cloak 80/2, friendly-zoo 75/1, character-acceptance b1 15 / b3 62+1 /
  p10 21 / p8+p9 19, Dungeo chain 952/17. EBNF: the flagged gap was closed the way the
  session recommended — a real `goal-block` production (header, `active when`, the eight
  step lines, the `verb-words` step), with a note that the other ADR-310 character-block
  lines remain undocumented in the file; hash re-pinned `f8d5cbaf…` under 3.5.0 (no bump —
  consolidation ruling); chord 1100 green. `chord-grammar-changes.md` row; reference
  create-block table row; goals guide rewritten with the fold and the wizard example.
  D10 Acceptance 6–8 stamped; GH #321 closed.)

**Plan Status**: DONE (2026-08-29, session 9de27b — every phase DONE.)
