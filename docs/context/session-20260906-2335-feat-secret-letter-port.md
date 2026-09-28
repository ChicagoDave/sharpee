# Session Summary: 2026-09-06 - feat/secret-letter-port

## Goals
- Execute Phase 5 of `docs/work/secret-letter-port-platform-defects/plan.md` (P-9, P-12, P-13): `stopping` phrase progress ownership, timer reads on `phrase detail while`, `{phrase}` marker splicing in entity descriptions.
- Execute Phase 6 (P-14): `make <actor> wear/take off <item>` per ADR-325 Amendment W1.
- Execute Phase 7 (P-15): `sleeping`/`waking` as standard stdlib actions.
- Advance Phase 8 (P-16) to CURRENT for the next session.

## Phase Context
- **Plan**: `docs/work/secret-letter-port-platform-defects/plan.md` — "Land the fifteen ACCEPTED items ... against `packages/`, each with the real-path test its Done-when names."
- **Phases executed**: Phase 5 — "Chord phrase-engine fixes — per-entry progress, timer reads on detail lines, and marker splicing in descriptions (P-9, P-12, P-13)" (Large, 400 budget); Phase 6 — "A runtime statement puts a garment on an actor, per ADR-325 Amendment W1 (P-14)" (Large, 400 budget); Phase 7 — "`sleeping` and `waking` ship as standard actions (P-15)" (Medium, 250 budget).
- **Tool calls used**: 458 total for the session (`.session-state-0e7d6f.json`), spanning all three phases plus this finalization.
- **Phase outcome**: All three completed within their individual budgets; no phase ran over.

## Completed

### Phase 5 (P-9, P-12, P-13) — GH #371, #359, #364
- Findings first: P-9 does **not** reproduce at HEAD — a bundle probe (seed 7) speaks the butler's two `stopping`-phrase arms correctly in both clause orders and forms; the port's split-phrase workaround was covering a defect already fixed by #304 (2026-08-23), likely a stale devkit dist on 2026-09-04. P-12's cause was analyzer pass order: entity override gates resolved in pass 1, before `buildTimers()` ran. P-13 was three room-only seams (loader marker rewrite, snippet compile, engine's examined handler).
- P-9: no source change — pin only (`gh-371-strategy-progress-per-phrase.test.ts`, 4, bootTurns); butler restored to one shared `stopping` phrase in `black-gate.chord`; guide rule added to `flow/select-with-a-strategy`.
- P-12: `packages/chord/src/analyzer.ts` collects `deferredOverrideGates` in pass 1, resolves them via `resolveOverrideGates()` after `buildTimers()` in pass 2. Pin: `gh-359-detail-gate-timer-read.test.ts` (5).
- P-13: `IdentityTrait.snippets` (world-model); loader `compileDescriptionSnippets` for every described entity + `extendLanguage` rewrite for every description key; examining event carries `snippets`; engine `tryProcessExamined` splices via `resolveSnippetDescription`; `validateRoomSnippets` scans every snippet-bearing host. Pins: story-loader `gh-364-entity-description-markers.test.ts` (1, real path), engine `examined-snippets.test.ts` (3), `snippet-validation.test.ts` (+3 non-room cases, filling a `mutation-verification` gap), world-model `identity-snippets.test.ts` (2).
- Issues #359 and #364 closed fixed; #371 closed not-reproducible-and-pinned. Each with evidence in the GitHub issue.

### Phase 6 (P-14) — GH #360, ADR-325 Amendment W1
- David approved the W1a-W1g approach. chord: `WearStmt` AST (`kind: 'wear' | 'take-off'`), `make` statement head + parser case, additive IR kinds, `resolveWearStatement` with both compile-time gates (`analysis.wear-not-wearable`, `analysis.wear-actor-not-person`).
- story-loader runtime: `wear`/`take-off` in the mutation pass — off another wearer first, `moveWithLifecycle` to the actor if not held, `WearableBehavior.wear`; `take-off` runs `WearableBehavior.remove` and leaves the item held; already-worn/not-worn are no-ops.
- Story: `commerce-street.chord`'s arrival now reads `make the player wear the woolen cap`, reverting the GAP-comment workaround.
- Tree impact: the cap now arrives on the player, so the old blocked-`e` card is unreachable there (the story's own clothing rule refuses `take off cap` on Commerce Street). Re-pinned to `x cap` + `wear cap` (two turns kept so seeded every-turn draws downstream keep their positions).
- Finding recorded, not built: the tree's plain-property claims don't read the wearable trait, so W1f's `is worn` pin isn't available to the test-tree format.
- Pins: chord `adr-325-w1-make-wear.test.ts` (7); story-loader `adr-325-w1-make-wear.test.ts` (4, bootTurns, asserts `worn`/`wornBy`/location and the witnessed `exited` row — filled a `mutation-verification` gap on the cross-room wear).
- Docs: EBNF + website mirror, grammar log row, guide statements bullet, ADR-325 W1 stamped landed, ADR-329 D7 example line. Issue #360 closed with evidence.

### Phase 7 (P-15) — GH #362
- Finding: `sleepingAction` already existed (registered, English, grammar) but had no ADR-228 lifecycle descriptor, so it never consulted interceptors and the loader's fail-fast refused `on the player sleeping`; `waking` was an id only.
- David approved the signal-action design (room is the consultable entity, single slot = actor's current room). stdlib: `sleeping.ts` rewritten with `sleepingLifecycle`; new `waking/` (action, events, index) with `wakingLifecycle`; both registered (descriptor count 40 → 42); `SleepingErrorData` dropped.
- lang-en-us: `not_tired` (`{You} aren't tired.` — hard-coded per the platform's existing `{isn't}` second-person precedent), `waking.ts` (`already_awake`), verb entries.
- parser-en-us: `go to sleep`, `go to bed`, `lie down` → sleeping; `wake`, `wake up` → waking.
- Story: `maiden-house.chord` drops `define action sleeping`; Dormitory takes `on the player sleeping`; Red Gate's master bedroom takes the refusal.
- Two traps hit and recorded: `packages/parser-en-us/src/grammar.ts` is generated from `grammar/standard-en-us.story` (a hand edit was silently overwritten by `./repokit build`; fixed at the Chord source + `./repokit grammar`); the ADR-255 alias bijection has two sides (`packages/chord/src/message-alias-catalog.ts` and `packages/story-loader/src/message-alias-map.ts`) and both need every new message id.
- Also this phase: the ADR-257 EBNF pin re-recorded under the standing 3.6.0 for Phase 6's `make` statements (the version number moves at publish, per the 2026-08-29 ruling — not a new decision).
- Pins: stdlib `sleeping-waking-golden.test.ts` (12); story-loader `gh-362-sleeping-waking-standard.test.ts` (2, bootTurns). Issue #362 closed with evidence.

## Key Decisions
- **P-9 stays a pin, no source change (David, "go").** The bundle probe showed the reported defect does not reproduce at HEAD; reverting the split-phrase workaround and pinning the correct per-key counter behavior is the fix.
- **Entity-description marker splicing follows the room-prose pattern exactly (David, P-13 pick).** `IdentityTrait.snippets` mirrors `RoomTrait.snippets`; the loader, examining event, and engine handler all extend the same seam rather than inventing a parallel one.
- **`wear`/`take-off` are move-family statements, not the acting statement (ADR-325 Amendment W1, implemented this session).** ADR-329 D1's `the player`-exclusion does not apply; D7's put/act split is what W1 rides.
- **`sleeping`/`waking` are signal actions with the room as the consultable slot (David, "go").** Both always validate, mutate nothing themselves, and report one stock event — the story's own `on` interceptor supplies any real consequence.

## Next Phase
- **Phase 8**: "An unplaced entity never wins scope over a carried one" (P-16) — small, 100 budget.
- **Deliverable**: with `the dress` unplaced and `the daydress` (aka `dress`) in the player's inventory, `wear dress` must resolve to the carried day dress, never the offstage entity's intercept, for every action's `:item` slot.
- **Entry state**: present the fix approach to David before editing `packages/stdlib` scope resolution.

## Open Items
- No items opened or closed in the ledger this session (`devarch items list --json` returns the same two entries before and after).
- I-c8a56c-1: David's outstanding prose lines for the Chapters 6-8 placeholder beats and several loose threads — unrelated, untouched.
- I-c8a56c-2: GH #356 stallkeeper patience-counter basis, David's ruling pending — unrelated, untouched.

## Files Modified

**chord** (parser/analyzer/IR):
- `packages/chord/src/{analyzer,ast,ir,parser,stdlib-manifest,version}.ts` — deferred override gates (P-12), `WearStmt` + `resolveWearStatement` (P-14), version-pin bookkeeping.
- `packages/chord/src/message-alias-catalog.ts` — waking/sleeping aliases (P-15).
- `packages/chord/chord.ebnf` — `make wear/take-off` alternative.
- `packages/chord/tests/{adr-325-w1-make-wear,gh-359-detail-gate-timer-read,language-version}.test.ts` (2 new, 1 re-pinned).

**story-loader** (runtime):
- `packages/story-loader/src/{loader,message-alias-map,runtime}.ts` — description-snippet compile (P-13), wear/take-off mutation pass (P-14), waking/sleeping alias entries (P-15).
- `packages/story-loader/tests/{adr-325-w1-make-wear,gh-362-sleeping-waking-standard,gh-364-entity-description-markers,gh-371-strategy-progress-per-phrase}.test.ts` (4 new).

**world-model / engine** (description snippet splicing, P-13):
- `packages/world-model/src/traits/identity/identityTrait.ts`; `packages/world-model/tests/unit/traits/identity-snippets.test.ts` (new).
- `packages/engine/src/{prose-pipeline/handlers/examined,snippet-validation}.ts`; `packages/engine/tests/{unit/snippet-validation,prose-pipeline/handlers/examined-snippets}.test.ts` (1 new, 1 re-pinned).

**stdlib / lang-en-us / parser-en-us** (P-15):
- `packages/stdlib/src/actions/{lifecycle/registry,standard/index,standard/sleeping/*,standard/waking/*}.ts`; `packages/stdlib/tests/unit/actions/{lifecycle-registry,sleeping-waking-golden}.test.ts` (1 re-pinned, 1 new).
- `packages/lang-en-us/src/actions/{index,sleeping,waking}.ts`, `data/verbs.ts`.
- `packages/parser-en-us/grammar/standard-en-us.story` (source of truth) and its generated `src/grammar.ts`.

**story content**:
- `branch-stories/secret-letter/{black-gate,commerce-street,maiden-house,red-gate}.chord`, `secret-letter.tests.json` (tree re-pin).

**docs / plan / ADRs**:
- `docs/architecture/adrs/{adr-325-chord-presence-and-duration,adr-329-chord-acting-statement}.md`, `docs/architecture/chord-grammar-changes.md`.
- `docs/proposals/secret-letter-port-platform-defects.md` (P-9, P-12, P-13, P-14, P-15 PLANNED → DONE, rule 18a — already applied progressively this session).
- `docs/work/secret-letter-port-platform-defects/plan.md` (Phases 5, 6, 7 marked DONE with outcomes; Phase 8 advanced to CURRENT).
- `website/src/app/chord/guide/**/content.mdx`, `website/src/app/chord/stdlib/reference/{content.mdx,grammar-blocks.ts}`, `website/public/chord.ebnf`.
- Build-stamped: `stories/dungeo/src/version.ts`, `packages/sharpee/docs/genai-api/*.md` (regenerated by `./repokit build dungeo`, commit with the work).

## Notes
- Session started 2026-09-06 23:35 CDT (session 0e7d6f), previous session b8faec COMPLETE at end of Phase 4.
- **Integration Reality scan**: Phase 5's name ("Chord phrase-engine fixes") trips CLAUDE.md rule 13a's `engine` keyword. On inspection this is a naming coincidence, not an owned-dependency integration in the rule's sense — the "phrase engine" is in-process analyzer/runtime logic (`packages/chord`, `packages/story-loader`), never spawned, bundled, or migrated. Every pin for P-9/P-12/P-13 already drives the real production path directly (bootTurns, direct analyzer calls) with no stub or fake standing in for an owned dependency, so the substance of rule 13a is satisfied without a separate Integration Reality Statement.
- This finalization re-ran all seven touched package suites fresh rather than trusting the session's own progressive notes (ADR-0019); all seven passed, all timestamped 2026-09-07 01:13-01:14 CDT, after the session's last source edit (`message-alias-map.ts`, 01:00:21 CDT).
- Per the task instructions: `./sharpee test branch-stories/secret-letter --tree` (1468 cards / 2642 assertions) and the Dungeo chain (952) were **not** re-run in this finalization — both were run and passed at the end of Phase 7 (02:20 CDT progress note), after every source edit in the session; no further source edits followed.

---

## Session Metadata

- **Session**: 0e7d6f
- **Status**: COMPLETE
- **Blocker** (if any): N/A
- **Blocker Category**: N/A
- **Estimated Remaining** (if incomplete): N/A
- **Rollback Safety**: safe to revert — all changes are uncommitted working-tree edits on `feat/secret-letter-port`, none pushed.

## Dependency/Prerequisite Check
- **Prerequisites met**: Phase 4's analyzer stability (select-on/declared-state resolution) let Phase 5's pass-order fix (P-12) land without further chord-analyzer dependency; Phase 5's snippet-splicing seam (P-13) and Phase 6's wear/take-off statement were independent and proceeded in sequence per the plan's entry states.
- **Prerequisites discovered**: Phase 7 surfaced that `sleepingAction` pre-existed but lacked an ADR-228 lifecycle descriptor — a latent gap the proposal's Done-when hadn't named; Phase 7 also surfaced that `packages/parser-en-us/src/grammar.ts` is a generated file (source of truth is `grammar/standard-en-us.story`) and that the ADR-255 alias bijection has two files that both need every new message id — neither was documented as a trap before this session.

## Architectural Decisions
- ADR-325 Amendment W1 (ACCEPTED in a prior session) implemented and stamped landed this session; ADR-329 D7 gained a `make wear` example line.
- ADR-257's EBNF pin re-recorded under the standing 3.6.0 for Phase 6's grammar addition (version moves at publish per the 2026-08-29 ruling — not a new decision).
- No new ADRs written. P-9/P-12/P-13 are analyzer/runtime bug fixes with no future-session consequence beyond their grammar-log/guide entries.

## Mutation Audit
- Files with state-changing logic modified: `packages/chord/src/analyzer.ts` (override-gate resolution order, wear-statement resolution), `packages/story-loader/src/runtime.ts` (wear/take-off mutation pass), `packages/world-model/src/traits/identity/identityTrait.ts` (snippet map), `packages/engine/src/{prose-pipeline/handlers/examined,snippet-validation}.ts` (splice + host validation), `packages/stdlib/src/actions/standard/{sleeping,waking}/*.ts` (lifecycle actions).
- Tests verify actual state mutations (not just events): YES (evidence: fresh runs by this writer, 2026-09-07 01:13-01:14 CDT, all after the session's last source edit at 01:00:21 CDT — see Test Coverage Delta below for per-package counts). `gh-364-entity-description-markers.test.ts` and `adr-325-w1-make-wear.test.ts` (story-loader) drive `bootTurns` — the real interpreter path — and assert on entity state (`snippets` map, `worn`/`wornBy`, location, the witnessed `exited` row), not on return values.
- `mutation-verification` ran once per phase: Phase 5 found one gap (`validateRoomSnippets`'s non-room branch untested), filled with 3 cases same session; Phase 6 found one gap (witness row on the cross-room wear), filled same session; Phase 7 reported clean.

## Recurrence Check
- Similar to past issue? NO — no prior session in `docs/context/` records the generated-`grammar.ts` trap or the two-sided alias-bijection trap before this session; both are novel findings, now recorded in this file and in the grammar-changes log for future sessions to check before repeating them.

## Test Coverage Delta
- Tests added: 40 across the three phases (chord: 7 `adr-325-w1-make-wear` + 5 `gh-359-detail-gate-timer-read` = 12; story-loader: 4 `adr-325-w1-make-wear` + 2 `gh-362-sleeping-waking-standard` + 1 `gh-364-entity-description-markers` + 4 `gh-371-strategy-progress-per-phrase` = 11; stdlib: 12 `sleeping-waking-golden`; world-model: 2 `identity-snippets`; engine: 3 `examined-snippets`), plus re-pinned assertions in `language-version.test.ts`, `lifecycle-registry.test.ts`, and `snippet-validation.test.ts` (existing tests changed to match new/corrected behavior, not net-new) and story tree re-pins in `secret-letter.tests.json`.
- Tests passing before → after (evidence: fresh runs by this writer, 2026-09-07 01:13-01:14 CDT, all after the session's final source edit at 01:00:21 CDT):
  - `@sharpee/chord`: 1146 (end of Phase 4, prior session) → 1158 passing (78 test files).
  - `@sharpee/story-loader`: 1107 (end of Phase 4, prior session) → 1118 passing (130 test files).
  - `@sharpee/stdlib`: 1704 (Phase 5 progress checkpoint, untouched by Phases 1-4) → 1716 passing (129 test files).
  - `@sharpee/world-model`: 1506 passing (86 test files) — unchanged net count; Phase 5 added `identity-snippets.test.ts` (2) same session.
  - `@sharpee/engine`: 705 (Phase 5 progress checkpoint) → 708 passing (73 test files, 7 skipped).
  - `@sharpee/parser-en-us`: 328 passing (25 test files, 3 skipped) — grammar-source spellings added (P-15), no new test files.
  - `@sharpee/lang-en-us`: 452 passing (28 test files) — new message modules (`not_tired`, `already_awake`) covered by existing assembler/provider suites, no new test files.
  - `./sharpee test branch-stories/secret-letter --tree`: 1468 cards / 2642 assertions passing (run at end of Phase 7, 02:20 CDT, after every source edit this session — not re-run in this finalization; see Notes).
  - `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure`: 952 of 952 passed (same Phase 7 run — not re-run in this finalization; see Notes).
- Known untested areas: W1f's `is worn` pin is not available to the test-tree's plain-property claim format (noted in Phase 6's outcome, not a gap in the shipped behavior — the story-loader unit test covers it directly).

---

**Progressive update**: Session completed 2026-09-07
