# Session Plan: Occurrence ordinals arrange shape for derived rule tests (ADR-356 D2)

**Created**: 2026-10-11 (session ce4e4c)
**Plan Status**: ACTIVE
**Overall scope**: Let the ADR-356 derived runner arrange "this clause has already fired N-1 times" so a Chord `second time` ... `fifth time` ordinal body is exercised by the derived tier instead of SKIPPED `occurrence`. Planning only; every `packages/` change is a platform change gated on David's discussion.
**Bounded contexts touched**: N/A — test infrastructure (`packages/story-loader`, `packages/world-index`, `packages/branch-tester`, possibly `packages/transcript-tester`).
**Key domain language**: arrange (ADR-356 D2), pin grammar, occurrence counter, ordinal body, SKIPPED shape.
**Carries out**: Phase 7 ("Occurrence ordinals arrange shape", PENDING, Small) of `docs/work/author-narrative-testing/plan-20261002-remaining-rows.md`, whose CURRENT phase is 6b (on hold). David ruled ordinals IN for objective O-1 on 2026-10-03. When this plan lands, update that Phase 7 Status line to point here (docs edit, not platform).
**Location note**: written at David's requested path (dated file in `docs/work/branch-tester/`); `.current-plan` points here. Outgoing plan `plan-20261010-549-derived-preconditions.md` is DONE; no disposition needed, not archived.
**Gate**: Phases 2 and 3 edit `packages/**` and must not start until David approves them (CLAUDE.md platform rule; ADR-356 Consequences).

## Measured baseline (2026-10-11, seed 1209, `./sharpee test branch-stories/secret-letter/secret-letter.story`)
- 1656 branches, 955 exercised, 701 not exercised, 12 failing (all story findings; GH #549 closed).
- Exactly 4 rows SKIPPED `occurrence`, one clause: `Outer Market Roof · on every-turn · the 2th/3th/4th/5th time — SKIPPED occurrence: the Nth firing` (`branch-stories/secret-letter/eavesdrop.chord:164/166/168/170`). Clause is `eavesdrop.chord:160-175`: `on every turn while the group of mercenaries is here`, bodies `first time` ... `fifth time`; the fifth moves three entities offstage and changes the story to hunted. First-time row passes today.
- The Alderman: `./sharpee test stories/thealderman/chord/thealderman.story`, seed 42: 1 failure, 37 of 78 exercised.
- Out of scope: 14 `first time` blocks in `night-journey.chord` under `after the player entering` are SKIPPED `command-lifecycle`, not an ordinal problem.

## References consulted
- `docs/architecture/adrs/adr-356-the-story-is-the-test-suite.md` — D2: arrange the floor directly, never play to it; unarrangeable = SKIPPED with a named shape; dated inline amendments (2026-09-27 timer phase, 2026-10-11 #549 at lines 95-97) record each floor change. AC-4: SKIPPED counts in the denominator. AC-5: nothing outside the loader writes `chord.*` keys (grep test).
- `docs/architecture/adrs/adr-340-testing-assertion-core.md` (D3) — write lives in story-loader, read in transcript-tester; branch-tester imports, never copies.
- `docs/work/author-narrative-testing/plan-20261002-remaining-rows.md` — Phase 7 is this work.
- `docs/objectives/author-narrative-testing.md` — Scope rulings line 25 (ordinals IN); Progress line 21 (2026-10-11: "occurrence ordinals still unbuilt").
- `docs/context/session-20261011-0303-main.md` — Next Phase: ordinals belong to a different plan.
- GH #525 (OPEN) — arrange shapes ranked by SKIPPED count; occurrence = 4.
- `packages/branch-tester/src/derived-runner.ts` — lines 520-525 `case 'ordinal'`: `terms: []` when ordinal <= 1, else SKIPPED `occurrence`; line 914 label template `the ${leaf.ordinal}th time` (prints "1th", "2th").
- `packages/world-index/src/branches.ts` — `collectClauseBranches` (746); `ClauseBranch` (162), `BranchLeaf` (110), `BranchPrecondition` (120, incl. `ordinal` and `unfired`), `BranchClause` (76; no clause index); ordinal precondition pushed at 367-373.
- `packages/story-loader/src/state-keys.ts` (23-24) — `CHORD_OCCURRENCE_PREFIX = chord.occurrence.`; header promise: nothing outside the loader writes `chord.*`.
- `packages/story-loader/src/runtime/statements.ts` (382-388) — ordinal body runs when `ctx.occurrence === stmt.ordinal`; counter is read-then-incremented at the firing site.
- Firing-site key families: `runtime/scheduler-constructs.ts` (entity-turn 236 — the eavesdrop case; story-turn 109; trait-turn 154; sequence 50), `runtime/on-clauses.ts:280`, `runtime/dispatch-verbs.ts:146,185`, `runtime/event-clauses.ts:84,118`, `runtime/move-clauses.ts:89`, `runtime/timers.ts:273`. Dialogue/threads/derived keys are not ordinal bodies, out of scope.
- `packages/story-loader/src/pin-grammar.ts` (20, 78-79, 90) — `<key> occurrence = <n>` already recognized, shape `occurrence`, "Named, not written"; `arrange.ts` header refuses it; `packages/transcript-tester/src/assertion-core.ts:439` does not read it.
- `packages/branch-tester/tests/derived-runner.test.ts` + `tests/fixtures/derived/*.story` — REAL-PATH fixture suite (real parser + engine, seed 7).
- Product ADRs not consulted (no Scope intersection): none

## The design problem (the one decision for David)
The runner knows a branch by `ClauseBranch` (owner, clause kind/binding/action, span) but not the clause index or the loader's key family, so it cannot name `<key>` in `<key> occurrence = <n>` without duplicating the loader's key scheme, which the state-keys.ts promise and AC-5 forbid in spirit.

Deeper dive (2026-10-11, session ce4e4c, source read — corrects the first draft of this section):

- **Every option needs a world-index change.** A branch's `span` is the LEAF's span when the leaf has one (`emitClause`, `packages/world-index/src/branches.ts:422,432`): for an ordinal leaf that is the `second time` statement's span (eavesdrop.chord:164), not the clause's. The clause's span is in the frame (`branches.ts:648`, `spanOf(n)`) and is dropped. So (b) needs a `clauseSpan` field on `ClauseBranch` just as (a) needs a `clauseIndex`. The walker is a generic `Object.keys` recursion (`branches.ts:714`), so the clause's index within its owner's `onClauses` is NOT at hand there, while the clause span is. `IROnClause` carries `span: Span` (`packages/chord/src/ir.ts:963`, `Span.file` optional for a `.chord` import). `collectClauseBranches` has exactly one consumer, `derived-runner.ts` (grep over `packages/*/src` and `tools/ide`), so either type change has a blast radius of one file.
- **"Clause index" is not one number today.** The families index differently: `entity-turn.<irId>.<i>` and `chord.clause.<irId>.<action>.<i>` use the owner's `onClauses` index; `on.<irId>.<action>.<clauseKind>.<j>` uses the index within the clauses of one action and kind (`on-clauses.ts:233-234`); `trait-turn.<trait>.<i>.<irEntityId>` is per entity carrying the trait (the counter is per entity, so the branch's `owner` — `WriterOwner` has entity/machine/story, no trait kind — must say which entity); `sequence.<slug>` has no index. So under (a) the loader still has to own the identity → key mapping; what the runner passes is an identity, never a key.
- **Both options therefore reduce to the same loader function** `occurrenceKeyFor(identity)`, with every firing site rewritten to call it (nine sites: scheduler-constructs.ts:50,109,154,236; on-clauses.ts:280; dispatch-verbs.ts:146,185; event-clauses.ts:84; timers.ts:273; move-clauses.ts:89). The decision is only what the identity is and how the pin spells it.
- **The yield is 4 rows, not 5.** Secret Letter's fifth `occurrence` row (`black-gate.chord:1107`, `Second Floor Landing · after entering · second time`) sits under an `after the player entering` clause whose first-time row is already SKIPPED `command-lifecycle`; it stays SKIPPED on that shape whatever is arranged. The Alderman and fernhill have no later-ordinal bodies (grep for `second|third|fourth|fifth time`).

Options (Chord/pin examples; syntax marked UNSHIPPED where it does not exist today):
- **(a) Structural identity.** `ClauseBranch.clause` gains the owner and the clause's index within the owner's `onClauses` (world-index computes it at the `isOnClause` emit by looking the node up in its parent array, as `ownerOf` already does for roots at `branches.ts:775`). The loader exports `occurrenceKeyFor({ owner, clauseIndex })` and rewrites the nine sites to it (unifying the families or mapping them — unifying is cleaner and changes save keys, which is allowed: no back-compat, save versioning dormant). Pin, UNSHIPPED: `the group of mercenaries on every turn #1 occurrence = 4` (owner, head words, 1-based clause number among that owner's clauses). Pro: the pin is a name an author could write in a card later, stable across edits that do not reorder clauses; the key scheme becomes single-sourced; the read side (assertion core) gets the same spelling for free. Con: the trait-clause family needs the entity too (`#1` on a trait is per entity), so the identity is `{ owner, clauseIndex, entity? }`; the pin grammar grows a structural form; the larger rewrite of the nine sites.
- **(b) Span identity.** `ClauseBranch` gains `clauseSpan`. The loader records `span → key` as it wires each clause (same nine sites, each calling one `registerOccurrenceKey(clause.span, key)` instead of being rewritten); arrange takes UNSHIPPED `occurrence at eavesdrop.chord:160 = 4` and resolves through the map. Pro: smallest loader change, families untouched, keys unchanged. Con: a line number is not a name — it shifts on every edit above it, so it can never be an authored pin and the read side would need a second spelling; the span→key map is a second registry the nine sites must remember to feed (a forgotten site fails silently as `unrecognized`); trait clauses still need the entity, so the identity is `{ span, entity? }` anyway.
- **(c) Replay the clause n-1 times.** Rejected: ADR-356 D2 says arrange, never play to it; replay also runs earlier bodies, whose effects (the fifth body relies on the entities still being onstage) would corrupt the state under test.

Recommendation: **(a)**. The extra cost over (b) is the nine-site rewrite, which is the same nine sites (b) touches, and it buys a name instead of a line number and one key scheme instead of nine. Not decided here — David's call.

Ordering note: arranging the counter alone on a fresh world gives exactly the state wanted (counter = N-1, earlier bodies not run). That is the "prove a rule IN a state" principle of D2; not replaying earlier ordinal bodies is deliberate and correct.
`once` (`unfired` precondition) is already `terms: []`; a `, once` clause's second firing is not a branch. No change.
Read side: should the assertion core also READ `occurrence` (ADR-340 D3, as the timer-phase amendment did) so a card can pin `... occurrence = 3`? Proposed as part of Phase 2 or a separate phase; David decides at the gate.

## Phases

### Phase 1: Decision gate — key-resolution shape and read side
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: ADR-356 D2 arrange shapes, loader/runner boundary
- **Entry state**: this plan written; baseline above measured
- **Deliverable**: David picks (a) or (b) (or another) and says whether the assertion core reads `occurrence`; choice recorded in this plan. No code.
- **Exit state**: Phases 2 and 3 scoped against the chosen option and marked approved or revised
- **Demonstration**: the recorded decision line in this plan names the chosen option, the read-side answer, and the date
- **Decision** (David, 2026-10-11, session ce4e4c): "go with (a), read side in phase 2". Option (a) structural identity; the assertion core reads `occurrence` in Phase 2 with the same spelling arrange writes. Phases 2 and 3 are approved against (a).
- **Demonstrated**: the Decision line above, written 2026-10-11 from David's message in session ce4e4c; no code, no test run. [reported by session, unverified]
- **Status**: DONE (2026-10-11, session ce4e4c)

### Phase 2: Loader and arrange write the occurrence counter (gated on David's approval)
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: `packages/story-loader` (`occurrenceKeyFor` identity → key, the nine firing sites routed through it, arrange write), `packages/world-index` (owner + clause index on `ClauseBranch`), `packages/transcript-tester` (assertion core reads `occurrence` with the same spelling)
- **Entry state**: Phase 1 decision recorded (option (a), read side here) and Phase 2 approved (David, 2026-10-11)
- **Deliverable**: a Behavior Statement for the write; red fixture first (`packages/branch-tester/tests/fixtures/derived/occurrence-ordinals.story`, a clause with `first` ... `third time` bodies, real-path test in `derived-runner.test.ts`), then loader source so arrange lands the counter at N-1 for the structural identity; **one composable key, not a mapping** (plan-review 2026-10-11, ADR-340 A1): every one of the nine firing sites writes `<occurrencePrefix><owner>.<clauseIndex>[.<entity>]` through one loader function, `StoryStateKeys` gains `occurrencePrefix`, and the assertion core composes the key from prefix plus identity exactly as it composes `timerPrefix + timer` (`assertion-core.ts:594`), importing nothing from the loader runtime (the assertion core is browser-safe); per-entity trait counters and sequences fit the same form; AC-5 grep test still green; `pin-grammar` shape `occurrence` becomes written and read with the same spelling; the fixture includes one `after entering` ordinal clause so GH #529's landing is covered; dists rebuilt
- **Exit state**: loader and (if approved) assertion core suites green; arrange refuses an unresolvable occurrence by name
- **Demonstration**: new loader tests assert the stored counter equals N-1 after arrange and the AC-5 grep test passes; fixture still red until Phase 3
- **Demonstrated**: 
- **Status**: PENDING

### Phase 3: Derived runner uses it; re-measure; record (gated on David's approval)
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: `packages/branch-tester` derived runner, ADR-356 D2 record
- **Entry state**: Phase 2 done
- **Deliverable**: `derived-runner.ts:520-525` returns the occurrence term for ordinal > 1 instead of SKIPPED; label fix at line 914 (proper ordinal words or "firing N"); fixture goes green; re-measure Secret Letter (expect 4 occurrence SKIPPED -> 0, 959 of 1656 exercised, 0 regressions against 955/12) and The Alderman (seed 42, today 1 failure / 37 of 78), one run each; ADR-356 D2 dated amendment; GH #525 comment; Phase 7 Status line in `plan-20261002-remaining-rows.md`; Progress line in `docs/objectives/author-narrative-testing.md`
- **Exit state**: no `occurrence` SKIPPED rows in Secret Letter; ADR, issue, plan and objective updated
- **Demonstration**: `./sharpee test branch-stories/secret-letter/secret-letter.story` prints 959 exercised, 12 failing, zero `SKIPPED occurrence`; `pnpm --filter '@sharpee/branch-tester' test derived-runner` green including the new fixture
- **Demonstrated**: 
- **Status**: PENDING
