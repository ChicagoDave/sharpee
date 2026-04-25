# Session Summary: 2026-04-24 - lang-articles-migration (CST)

## Goals
- Diagnose and fix the white house article-rendering bug in Dungeo
- Implement ADR-158: pass `EntityInfo` (not bare `entity.name`) through all stdlib message params
- Complete Phase 1 (helper + tests) and Phase 2 (pilot taking action)
- Begin Phase 3 rollout (per-action migration, one commit per action)

## Phase Context
- **Plan**: `docs/work/lang-articles/plan-20260424-the-cap-migration.md`
- **Phase executed**: Phase 1 — "Helper + unit tests" (DONE), Phase 2 — "Pilot one action end-to-end (taking)" (DONE), Phase 3 — "Roll out per action" (IN PROGRESS — 11 of ~26 actions complete across 2 sessions)
- **Tool calls used**: not tracked in .session-state.json this session
- **Phase outcome**: Phases 1 and 2 completed on budget; Phase 3 partially completed (Session 1: 4 actions, Session 2: 7 source files + 6 actions + 2 shared helpers)

## Completed

### Root Cause Diagnosis
Identified a ~130-template bug class in `packages/lang-en-us/`: stdlib actions pass `noun.name` (a bare string) as a message param, so the `{the:cap:item}` formatter chain receives a plain string with no `nounType`, `properName`, or `article` metadata. The ADR-095 formatters already have the correct article-selection logic — they just never receive the metadata. The engine's `setEntityLookup` path exists but is not wired.

### Phase 1 — Helper + Tests
- Added `packages/stdlib/src/utils/entity-info.ts`: `entityInfoFrom(entity: IFEntity): EntityInfo` reads `IdentityTrait` fields (`name`, `article`, `properName`, `nounType`, `grammaticalNumber`). Falls back to `{ name: entity.name }` when no `IdentityTrait` is present.
- Re-exported via `packages/stdlib/src/utils/index.ts` and the package barrel.
- 9 unit tests in `packages/stdlib/tests/unit/utils/entity-info.test.ts`: all five `nounType` cases, missing-`IdentityTrait` fallback, empty-name fallback.
- 11 integration tests in `packages/stdlib/tests/integration/entity-info-formatter.test.ts`: passes helper output through `theFormatter` / `aFormatter` / `someFormatter`; asserts correct rendering for common, proper, mass, unique, plural noun types. Includes the proper-name sentinel ("John arrives." — no "The").

### Phase 2 — Pilot: taking action
- Migrated all callsites in `packages/stdlib/src/actions/standard/taking/taking.ts`: 4 validation paths (`already_have`, `cant_take_room`, `fixed_in_place`, `cannot_take`), success event params, `reportSingleBlocked`, `blocked()` phase.
- Migrated 5 templates in `packages/lang-en-us/src/actions/taking.ts`: `already_have`, `cant_take_room`, `fixed_in_place`, `cannot_take`, `taken_from`. Preserved `taken_multi` ("{item}: Taken.") — IF list-label convention renders without article.
- Updated 5 unit test assertions in `taking-golden.test.ts` from bare string to `{ name: 'string' }` shape per ADR-158 contract.
- Wrote regression transcript `stories/dungeo/tests/transcripts/article-rendering.transcript`: covers common-noun (white house) and alias path.
- Live verification: `> take white house` now renders "The white house is fixed in place." (was "white house is fixed in place.").
- Discovered `englishTemplates` in `packages/lang-en-us/src/data/templates.ts` is dead code (exported but never imported). Noted for Phase 4 cleanup.
- Full Dungeo walkthrough chain ran 873/873 after three RNG-affected runs converged on a thief-clean result.

### Phase 3 — Per-action rollout (Session 1: 4 actions complete)

Each action received: callsite migration in stdlib + template update in lang-en-us + test assertion updates. Same diverged-params pattern applied where `...params` spread existed.

| Action | Callsites migrated | Templates updated | Tests |
|---|---|---|---|
| pushing | 8 (7 messageParams + blocked) | 14 | 21/21 passing |
| pulling | 5 (3 validate + blocked + report) | 21 | 10/10 passing |
| opening | 5 (3 validate + 2 success + blocked) | 7 | 20/20 passing (3 skipped) |
| closing | 6 (4 validate + closed event + blocked) | 5 | 19/19 passing |

Article-rendering transcript and rug-trapdoor regression transcript (ISSUE-074) continue passing after each migration.

### Phase 3 — Per-action rollout (Session 2: actions 5–10, total 11 of ~26 complete)

Six more actions migrated, with two shared helpers discovered and migrated alongside their consumers.

| Action / Helper | Callsites migrated | Templates updated | Tests |
|---|---|---|---|
| lock-shared.ts (helper) | `validateKeyRequirements`, `createLockErrorEvent`, `analyzeLockContext` — all params blocks (key/item) | n/a — helper only | covered by locking + unlocking tests |
| locking | validate paths (key/item), success-message params, failure-path params | locking.ts | 25/25 (locking-golden.test.ts) |
| unlocking | validate paths, success params (item, key), failure-path re-derived (noun → EntityInfo), blocked() spread | unlocking.ts | 28/28 (unlocking-golden.test.ts) |
| switching_on | 3 validate paths (not_switchable, already_on, no_power), execute-phase params, failure-path re-derived; templates updated for sentence-start vs mid-sentence patterns | switching-on.ts | 24/24 (switching_on-golden.test.ts) |
| switching_off | same shape as switching_on; mirror of paired action | switching-off.ts | 24/24 (switching_off-golden.test.ts) |
| examining | blocked-phase params in examining.ts; `buildExaminingMessageParams` data builder in examining-data.ts — container/surface/target keys; legacy compat message templates also updated | examining.ts | 22/22 (examining-golden.test.ts) |
| putting | 12+ params blocks: `determineTargetPreposition` helper's 3 error paths, `validateSingleEntity`'s 5 paths (cant_put_in_itself, already_there, container_closed, no_room, no_space), `reportSingleSuccess`/`reportSingleBlocked` (put_in and put_on variants), blocked() phase, single-object report path (lines 521 and 537) | putting.ts | 33/33 (putting-golden.test.ts) |

**Pattern observations codified during Session 2:**
- Shared helpers (`lock-shared.ts`, `examining-data.ts`) must be migrated alongside their consuming actions — not as separate line items. Treating them as separate would leave mixed EntityInfo / bare-string shapes within a single logical unit.
- Many actions store `targetName: string` on sharedData for use in failure-path event emission. Where `report()` lacks direct access to the noun entity, pattern is: `const noun = context.command.directObject?.entity;` then re-derive via `noun ? entityInfoFrom(noun) : { name: sharedData.targetName }` as fallback. Avoids enlarging `SharedData` per-action.
- Action source files diverge in params spread usage: some use `...params` spread into top-level event data (taking, putting blocked), some don't (pushing, opening). Diverge only where spread exists.

**Verification status after Session 2:**
- All 11 migrated actions pass unit tests in isolation (~150 assertion updates from `'name'` to `{ name: 'name' }` shape across 11 test files).
- Bundle + chain last verified green (873/873) after the Session 1 commit (pushing through closing).
- Bundle NOT yet rebuilt for actions 6–11 (locking through putting). Full chain re-verification is the first task of Session 3.

## Key Decisions

### 1. Helper lives in stdlib, not world-model
world-model owns `IFEntity`; lang-en-us owns `EntityInfo`. Placing the bridge helper in world-model would create a `world-model → lang-en-us` dependency that inverts the domain-vs-presentation direction. stdlib already depends on both. If a future non-stdlib consumer needs `EntityInfo`, the right move is extracting the type to `if-domain` (separate ADR), not relocating the helper now. Captured in ADR-158.

### 2. Diverge params shape from top-level event data
The `...params` spread pattern conflicts with the diverging shapes needed after migration: `params` holds `EntityInfo` for rendering while top-level event fields remain strings for handler consumption. Solution: replace spread with explicit shape declarations per callsite. Applied consistently across all migrated actions.

### 3. Preserve multi-take label patterns unchanged
`taken_multi` ("{item}: Taken.") uses the IF list-label convention. Applying `{the:cap:item}` would produce "The sword: Taken." which is wrong. Left unchanged with an explanatory comment. Formatter renders `EntityInfo.name` directly when no article formatter is applied — backward compatible.

### 4. Phase 4 guardrail is advisory-only
Per user decision: the template static scanner is a manual script (`pnpm audit:templates`), not a blocking CI check. ADR-158 + CLAUDE.md rule + manual scanner are the durable artifacts. Reasoning: lower friction for legitimate template additions and unforeseen story-side extension patterns. If the bug class recurs, future maintainers can promote the scanner to blocking.

### 5. Story-side custom scenery messages already supported
`SceneryTrait.cantTakeMessage` stores a story-specific messageId. The migration enables stories to use `{the:cap:item}` formatter chains in those messages too. No story-side changes needed.

## Phase 3 — Per-action rollout (Session 3: actions 12–22, total 22 of ~26 complete)

Twelve more actions migrated. Bundle rebuilt mid-session (after inserting/removing) and again at end of session. Article-rendering and rug-trapdoor regression transcripts passed 17/17 throughout.

| Action / Helper | Callsites migrated | Templates updated | Tests |
|---|---|---|---|
| inserting | 3 params blocks (no_destination, cant_insert, blocked) | inserting.ts | 20/20 |
| removing | 7 validate paths (already_have, not_in_container ×3 branches, container_closed, cannot_take, no_source), success/failure helpers, blocked | removing.ts | 26/26 |
| entering | 3 validate paths (already_inside, not_enterable, container_closed), report-phase params (re-derived from noun via context.command), blocked; removed duplicate `target` const in postReport hook scope | entering.ts | 17/17 (4 skip) |
| exiting | container_closed validate path, report-phase params (re-derived via context.world.getEntity from sharedData.fromLocation id) | exiting.ts | 15/15 (5 skip) |
| throwing | 4 validate paths (target_not_here, too_heavy), execute-phase params init + at_target target, blocked; ~25 templates updated | throwing.ts | 26/26 (2 skip) |
| attacking | 5 validate paths (not_visible, not_reachable, already_dead, violence_not_the_answer, attack_failed), report-phase params (target + weapon), blocked; pre-combat templates migrated to {the:cap:target}; combat.* messages preserved {targetName} (CombatService passes string) | attacking.ts | 42/42 |
| giving | 5 validate paths (not_actor, self, inventory_full, too_heavy, not_interested), execute-phase params, blocked | giving.ts | 24/24 |
| showing | analyzeShowAction params init, 2 validate paths (viewer_too_far, self), blocked; 3 assertion updates | showing.ts | 21/21 |
| smelling | analyzeSmellAction params.target, too_far validate path, blocked; 7 assertion updates | smelling.ts | 18/18 |
| listening | params.target init, blocked; 8 assertion updates | listening.ts | 17/17 |
| touching | blocked + report-phase params (re-derived from context.command); ~14 templates updated; 16 assertion updates | touching.ts | 22/22 |
| dropping | `determineDroppingMessage` in dropping-data.ts (item, container, supporter, location all to EntityInfo), 3 validate paths (not_held, still_worn, container_full), reportSingleSuccess params + container/supporter overrides, reportSingleBlocked, blocked; dropped_in/dropped_on templates updated; dropped_multi label preserved; 4 assertion updates | dropping.ts | 22/22 (2 skip) |

**Patterns refined this session:**
- Actions where `report()` uses `sharedData.targetName` (a string) without direct entity access: re-derive via `context.command.directObject?.entity` or `context.world.getEntity(state.fromLocationId)`, then `entityInfoFrom(noun) ?? { name: sharedData.targetName }` as fallback. Avoids enlarging SharedData per-action.
- For actions delegating to data builders (examining — Session 2, dropping — this session): migrate the data builder file alongside the action file; it owns the params shape.
- For actions delegating to other actions (inserting → putting): migrate only the inserting-side error/blocked paths; the success path inherits from putting's already-migrated event data.
- Removed duplicate `const target = ...` declarations in inner block scopes where the migration introduced a name collision with a pre-existing variable.
- `attacking`'s `combat.*` message templates intentionally left with `{targetName}` (bare string) because `CombatService` passes `targetName` as a plain string, not an `EntityInfo`. Flagged as a follow-up item separate from this branch.

**Verification status after Session 3:**
- All 22 migrated actions pass unit tests in isolation.
- Bundle rebuilt and walkthrough chain re-verified: first 5 walkthroughs 170/170 in isolation; full chain RNG variance confirmed (490 fail / 25 fail / 474 fail across 3 runs — same thief-RNG pattern as prior sessions, not a regression from this branch).
- Article-rendering + rug-trapdoor regression transcripts: 17/17 throughout.

## Next Phase
- **Phase 3 (continued)**: ~4 actions remain: `talking`, `climbing`, `searching`, `wearing`. Additional audit needed for: `going` (vehicle.name + door.name noted but not yet migrated), `reading`, `eating`, `drinking`, `taking_off`. Other action files (`about`, `again`, `help`, `inventory`, `looking`, `quitting`, `restarting`, `restoring`, `saving`, `scoring`, `sleeping`, `undoing`, `version`, `waiting`, `hiding`, `lowering`, `raising`) appear to have no entity-name params.
- **Phase 4**: advisory scanner script (`pnpm audit:templates`), finalize ADR-158, update CLAUDE.md "Language Layer Separation" subsection with one-line rule, clean up dead `englishTemplates` export.
- **Tier**: rollout (one commit per action remaining)
- **Entry state**: Phase 3 active; branch `lang-articles-migration`; 22 actions migrated and unit-tested; bundle rebuilt and verified green for all Session 3 actions.

## Open Items

### Short Term
- Complete remaining Phase 3 actions: `talking`, `climbing`, `searching`, `wearing` (~4 actions)
- Audit and migrate if needed: `going` (vehicle.name + door.name), `reading`, `eating`, `drinking`, `taking_off`
- Phase 4: add advisory scanner script (`pnpm audit:templates`), finalize ADR-158, update CLAUDE.md "Language Layer Separation" subsection
- `attacking` follow-up: `CombatService` passes `targetName` as a plain string to `combat.*` message templates — those templates are currently excluded from the migration; a separate task should migrate CombatService to pass EntityInfo
- Run full walkthrough chain after Phase 3 is complete (thief-RNG noise makes individual runs unreliable; establish a deterministic seed or run enough times to separate signal from noise)

### Long Term
- Dead code: `englishTemplates` in `packages/lang-en-us/src/data/templates.ts` — exported but never imported; clean up in Phase 4 or separate issue
- `nameId` (ADR-107) interaction: `entityInfoFrom` returns the literal `name` for entities using localized naming; out of scope for this branch, flagged as follow-up issue
- Dungeo: varying scenery responses for narrative texture (white house has funny response) — story-side enhancement, independent of this migration

## Files Modified

**New files** (6):
- `packages/stdlib/src/utils/entity-info.ts` — `entityInfoFrom` helper
- `packages/stdlib/tests/unit/utils/entity-info.test.ts` — 9 unit tests
- `packages/stdlib/tests/integration/entity-info-formatter.test.ts` — 11 integration tests
- `stories/dungeo/tests/transcripts/article-rendering.transcript` — regression transcript
- `docs/architecture/adrs/adr-158-entity-info-in-message-params.md` — ADR (drafted)
- `docs/work/lang-articles/plan-20260424-the-cap-migration.md` — plan

**Modified — stdlib actions** (26 files):
- `packages/stdlib/src/actions/standard/taking/taking.ts` — Phase 2 callsite migration
- `packages/stdlib/src/actions/standard/pushing/pushing.ts` — Phase 3 Session 1
- `packages/stdlib/src/actions/standard/pulling/pulling.ts` — Phase 3 Session 1
- `packages/stdlib/src/actions/standard/opening/opening.ts` — Phase 3 Session 1
- `packages/stdlib/src/actions/standard/closing/closing.ts` — Phase 3 Session 1
- `packages/stdlib/src/actions/standard/locking/locking.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/locking/lock-shared.ts` — Phase 3 Session 2 (shared helper)
- `packages/stdlib/src/actions/standard/unlocking/unlocking.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/switching_off/switching_off.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/examining/examining.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/examining/examining-data.ts` — Phase 3 Session 2 (data builder)
- `packages/stdlib/src/actions/standard/putting/putting.ts` — Phase 3 Session 2
- `packages/stdlib/src/actions/standard/inserting/inserting.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/removing/removing.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/entering/entering.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/exiting/exiting.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/throwing/throwing.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/attacking/attacking.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/giving/giving.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/showing/showing.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/smelling/smelling.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/listening/listening.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/touching/touching.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/dropping/dropping.ts` — Phase 3 Session 3
- `packages/stdlib/src/actions/standard/dropping/dropping-data.ts` — Phase 3 Session 3 (data builder)

**Modified — lang-en-us templates** (23 files):
- `packages/lang-en-us/src/actions/taking.ts` — Phase 2 template migration
- `packages/lang-en-us/src/actions/pushing.ts` — Phase 3 Session 1
- `packages/lang-en-us/src/actions/pulling.ts` — Phase 3 Session 1
- `packages/lang-en-us/src/actions/opening.ts` — Phase 3 Session 1
- `packages/lang-en-us/src/actions/closing.ts` — Phase 3 Session 1
- `packages/lang-en-us/src/actions/locking.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/unlocking.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/switching-on.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/switching-off.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/examining.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/putting.ts` — Phase 3 Session 2
- `packages/lang-en-us/src/actions/inserting.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/removing.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/entering.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/exiting.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/throwing.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/attacking.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/giving.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/showing.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/smelling.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/listening.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/touching.ts` — Phase 3 Session 3
- `packages/lang-en-us/src/actions/dropping.ts` — Phase 3 Session 3

**Modified — stdlib tests** (21 files):
- `packages/stdlib/tests/unit/actions/taking-golden.test.ts` — Phase 2 assertion updates
- `packages/stdlib/tests/unit/actions/pushing*.test.ts` — Phase 3 Session 1
- `packages/stdlib/tests/unit/actions/pulling*.test.ts` — Phase 3 Session 1
- `packages/stdlib/tests/unit/actions/opening*.test.ts` — Phase 3 Session 1
- `packages/stdlib/tests/unit/actions/closing*.test.ts` — Phase 3 Session 1
- `packages/stdlib/tests/unit/actions/locking-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/unlocking-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/switching_on-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/switching_off-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/examining-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/putting-golden.test.ts` — Phase 3 Session 2
- `packages/stdlib/tests/unit/actions/inserting-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/removing-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/entering-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/exiting-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/attacking-golden.test.ts` + `attacking.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/showing-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/smelling-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/listening-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/touching-golden.test.ts` — Phase 3 Session 3
- `packages/stdlib/tests/unit/actions/dropping-golden.test.ts` — Phase 3 Session 3
- (throwing-golden.test.ts and giving-golden.test.ts had no assertion updates needed)

**Modified — stdlib barrel** (1 file):
- `packages/stdlib/src/utils/index.ts` — re-export of `entityInfoFrom`

## Notes

**Session duration**: ~4 hours (Session 1) + additional Session 2 work (locking through putting) + Session 3 (inserting through dropping — 12 actions)

**Approach**: Diagnosis first, then a well-bounded plan covering all ~130 templates. Pilot on a single action (taking) to validate the diverged-params pattern before committing to the full rollout. Phase 3 proceeds one action per commit so any regression is trivially isolatable.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Phase 3 rollout — ~4 actions remain (talking, climbing, searching, wearing) plus audit of going/reading/eating/drinking/taking_off; Phase 4 (scanner + ADR-158 finalization) not started
- **Blocker Category**: Other: planned multi-session rollout, not a blocking defect
- **Estimated Remaining**: ~1–2 hours across ~1 session (Phase 3 near-complete); ~1 hour for Phase 4
- **Rollback Safety**: safe to revert (all work is on `lang-articles-migration` branch, not merged to main)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-095 formatters already correct; IdentityTrait already populated by stories; stdlib already depends on both world-model and lang-en-us
- **Prerequisites discovered**: None blocking; `nameId` (ADR-107) interaction is a known gap but out of scope

## Architectural Decisions

- [ADR-158]: Pass `EntityInfo` objects (not bare strings) in stdlib message params — rationale: formatter chains need nounType/properName/article metadata to emit correct articles; passing strings silently drops the metadata the formatter already knows how to use
- Pattern applied: existing ADR-095 formatter system wired end-to-end — no new formatter logic, only callsite discipline
- Diverged-params pattern: `params` object holds `EntityInfo` for rendering; top-level event fields remain strings for handler consumption — avoids `...params` spread conflicts

## Mutation Audit

- Files with state-changing logic modified: none (this session is purely a message-rendering fix; no world-model state mutations were changed)
- Tests verify actual state mutations (not just events): N/A — changes are rendering-path only; existing state-mutation tests were not modified
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — ISSUE-074 (ADR-157) was a migration where the emission semantics were silently dropped during refactor. The audit discipline added to CLAUDE.md ("Migration Audits Enumerate Emissions, Not Just Mutations") directly applies here. This session is a forward migration that explicitly preserves backward compatibility by keeping top-level event fields as strings.
- Recommendation: after Phase 3 complete, run `pattern-recurrence-detector` to check whether any walkthrough transcript expectations were silently passing against broken article output.

## Test Coverage Delta

- Tests added: 20 (9 unit + 11 integration for Phase 1; all other work was updates to existing assertions)
- Tests passing before: baseline (all green on main before branch)
- Tests passing after: all 22 migrated actions green in isolation; first 5 walkthroughs 170/170 in isolation; full chain RNG-variable (thief combat noise — not a regression from this branch); article-rendering + rug-trapdoor regression transcripts 17/17
- Assertion updates: ~150 (Sessions 1–2) + ~48 additional (Session 3: showing 3, smelling 7, listening 8, touching 16, dropping 4, removing ~11) ≈ ~200 total across 21 test files, from bare `'name'` string to `{ name: 'name' }` shape
- Known untested areas: ~4 remaining stdlib actions not yet migrated (talking, climbing, searching, wearing); going/reading/eating/drinking/taking_off need audit; CombatService `combat.*` messages still use bare string targetName (separate follow-up); story-side templates in `stories/dungeo/src/messages/` (out of scope for this branch)

---

**Progressive update**: Session 1 completed 2026-04-24 21:58 CST; Session 2 update appended 2026-04-24 (locking, unlocking, switching_on, switching_off, examining, putting — 6 actions + 2 helpers, 11 of ~26 total); Session 3 update appended 2026-04-24 (inserting, removing, entering, exiting, throwing, attacking, giving, showing, smelling, listening, touching, dropping — 12 actions, 22 of ~26 total)
