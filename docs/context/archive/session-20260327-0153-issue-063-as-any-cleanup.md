# Session Summary: 2026-03-27 - issue-063-as-any-cleanup (CST)

## Goals
- Complete Phase 3 of ISSUE-063: eliminate all `as any` casts in `stories/dungeo/src/`
- Achieve a type-check-clean build for the dungeo story
- Commit and advance plan to next phase

## Phase Context
- **Plan**: `docs/context/plan.md` — ISSUE-063 Eliminate `as any` Casts
- **Phase executed**: Phase 3 — "Clean Up Story Files" (Small)
- **Tool calls used**: ~95 / 100
- **Phase outcome**: Partially completed — all code changes done and type-check clean, but not committed due to a pre-existing thief knockout bug discovered during walkthrough testing

## Completed

### Phase 3 Type Cleanup (22 files, ~45 casts removed)

All trait-access and other `as any` casts removed from `stories/dungeo/src/`. Changes are stashed as `phase-3-as-any-cleanup-wip` at `stash@{0}`.

**Group 1 — Trait constructor pattern (11 casts, 7 files)**
- `grue-handler.ts`, `egg-behaviors.ts`, `objects-action.ts`, `melee-interceptor.ts`, `robot-behavior.ts`, `dungeon-master-behavior.ts`, `de.ts` (GDT): replaced `getTrait(TraitType.XXX) as any` with `getTrait(XxxTrait)` constructor form

**Group 2 — Entity property access (4 casts, 4 files)**
- `underground.ts`: `(troll as any).on` → `troll.on` (IFEntity already declares `on`)
- `sword-glow-daemon.ts`: `(exit as any).destination` → `exit.destination as string`
- `explosion-fuse.ts`: `(wideLedgeTrait.blockedExits as any)[Direction.SOUTH]` → direct index
- `commanding-action.ts`: `(targetObject as any).portable !== false` → `!targetObject.hasTrait(TraitType.SCENERY)`

**Group 3 — Attribute displayName (4 casts, 3 files)**
- `inflatable-entering-interceptor.ts`, `inflate-action.ts`, `deflate-action.ts`: `(entity as any).attributes.displayName` → `entity.attributes.displayName`

**Group 4 — Redundant sharedData casts (9 casts, 3 files)**
- `puzzle-move-action.ts`, `puzzle-take-card-action.ts`, `gdt-command-action.ts`: `(context.sharedData as any).xxx` → `context.sharedData.xxx`
- Added `result` field to `GDTCommandSharedData` interface to cover the one new sharedData property

**Group 5 — Remaining casts (~15 casts, 8 files)**
- `set-dial-action.ts`, `answer-action.ts`: `(command as any).rawInput` → `command.parsed.rawInput` (also fixed wrong property path)
- `press-button-action.ts`: `world as any` → `world` (functions already accept WorldModel)
- `say-action.ts`: stored echo state in `entity.attributes.echoSolved`; typed `findNpcsInRoom` return as `IFEntity[]`
- `kl.ts` (GDT): `(targetEntity as any).on` → `targetEntity.on`; replaced `(targetEntity as any).isDead/isAlive` with `npcTrait.kill()`
- `de.ts` (GDT): replaced 7 computed-property `as any` accesses with proper trait lookups (OpenableTrait, LockableTrait, SwitchableTrait, InflatableTrait)
- `pour-action.ts`: `(bucket as any)._traits?.keys?.()` → `bucket.traits.keys()` (traits is a public Map)

### Thief Knockout Bug Investigation

Discovered a pre-existing non-deterministic bug: when the thief is knocked unconscious (`MeleeOutcome.UNCONSCIOUS`), the parser cannot resolve the thief as a target on the very next "attack thief with knife" command, returning "I don't understand that." The bug:
- Cascades through all subsequent walkthroughs
- Is triggered by certain RNG seeds, not all runs
- Appears in the melee interceptor's UNCONSCIOUS outcome path
- Scope resolver does NOT filter by consciousness
- The attacking action does NOT block targeting unconscious NPCs
- Phase 3 type changes are NOT the cause — baseline code on the branch also exhibits this bug

## Key Decisions

### 1. Loud Room echo state stored in `entity.attributes`
Used `entity.attributes.echoSolved` instead of a direct entity property to avoid the `as any` cast. `IFEntity.attributes` is already typed as `Record<string, unknown>`, so this is clean without needing a dedicated trait.

### 2. Fixed `command.rawInput` → `command.parsed.rawInput`
The `as any` cast in `set-dial-action.ts` and `answer-action.ts` was masking a wrong property path. The correct location for raw input is `command.parsed.rawInput`.

### 3. Used `npcTrait.kill()` in GDT KL command
Replaced direct `(targetEntity as any).isDead = true` assignments with the proper `NpcTrait.kill()` method. This ensures the trait's own state management is used rather than bypassing it.

### 4. Stashed Phase 3 changes pending bug fix
Phase 3 changes are complete and type-clean but were stashed rather than committed because the thief knockout bug causes walkthrough failures. The stash is at `stash@{0}` with message `phase-3-as-any-cleanup-wip`. The plan's Phase 3 status is left as CURRENT rather than marking it DONE, since the changes are not yet committed.

## Next Phase
- **No next phase defined**: Phase 3 is the final phase in `plan.md`. After the thief knockout bug is resolved and Phase 3 is committed, the plan will be complete.
- **Immediate unblocking task**: Investigate the thief knockout → untargetable bug. Likely in parser scope resolution or melee interceptor's UNCONSCIOUS handling. Check commits on this branch that touched `scope-resolver.ts` or the parser.

## Open Items

### Short Term
- Fix the thief knockout → untargetable bug (parser scope issue, non-deterministic, RNG-seeded)
- Once fixed: pop `stash@{0}` (phase-3-as-any-cleanup-wip), verify type-check, run engine + stdlib tests, commit Phase 3
- Mark Phase 3 DONE in `plan.md`, mark plan complete

### Long Term
- Add CI enforcement to prevent new `as any` casts from being introduced (e.g., `tsc --noEmit` in CI with a baseline count check)
- The 2 remaining structural `as any` casts in `if-entity.ts` and 2 in `AuthorModel.ts` were left intentionally (dynamic property lookup patterns) — document them with `// eslint-disable-next-line @typescript-eslint/no-explicit-any` and an explanation comment

## Files Modified (stashed, not committed)

**stories/dungeo/src/actions/** (14 files):
- `answer-action.ts` — fixed `command.rawInput` → `command.parsed.rawInput`
- `commanding-action.ts` — portable check via hasTrait instead of cast
- `deflate-action.ts` — attributes.displayName cast removed
- `inflate-action.ts` — attributes.displayName cast removed
- `inflatable-entering-interceptor.ts` — attributes.displayName cast removed
- `melee-interceptor.ts` — NpcTrait + IdentityTrait constructor pattern
- `pour-action.ts` — `bucket.traits.keys()` instead of `_traits` cast
- `press-button-action.ts` — `world as any` casts removed
- `puzzle-move-action.ts` — sharedData casts removed (5)
- `puzzle-take-card-action.ts` — sharedData casts removed (2)
- `room-info/objects-action.ts` — NpcTrait constructor, fixed .state check
- `say/say-action.ts` — echo state in attributes, typed findNpcsInRoom
- `set-dial/set-dial-action.ts` — fixed rawInput path
- `gdt/commands/de.ts` — trait lookups replace computed-property casts
- `gdt/commands/kl.ts` — `targetEntity.on`, `npcTrait.kill()`
- `gdt/gdt-command-action.ts` — sharedData casts removed (2)

**stories/dungeo/src/handlers/** (1 file):
- `grue-handler.ts` — OpenableTrait constructor pattern

**stories/dungeo/src/npcs/** (2 files):
- `dungeon-master/dungeon-master-behavior.ts` — customProperties cast removed
- `robot/robot-behavior.ts` — NpcTrait constructor, customProperties cast removed

**stories/dungeo/src/regions/** (1 file):
- `underground.ts` — `troll.on` direct access

**stories/dungeo/src/scheduler/** (2 files):
- `explosion-fuse.ts` — Direction.SOUTH direct index
- `sword-glow-daemon.ts` — `exit.destination as string`

**stories/dungeo/src/traits/** (1 file):
- `egg-behaviors.ts` — OpenableTrait constructor, direct isOpen assignment

## Notes

**Session duration**: ~3 hours

**Approach**: Systematic file-by-file replacement of `as any` casts using the constructor-based generic pattern already available on `getTrait`. Each group of casts was addressed together (trait constructor, entity property, attributes, sharedData, remainder). Type-check verification was run after each group and again at end of session.

---

## Session Metadata

- **Status**: INCOMPLETE
- **Blocker**: Non-deterministic thief knockout → untargetable bug blocks walkthrough tests — pre-existing bug triggered by certain RNG seeds in the melee system
- **Blocker Category**: State Management
- **Estimated Remaining**: ~2 hours (bug investigation + fix + stash pop + commit)
- **Rollback Safety**: safe to revert — all Phase 3 changes are in a git stash, not committed; main branch is unaffected

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 (platform files) and Phase 2A+2B (game-engine.ts) complete and committed; trait constructor pattern well-established
- **Prerequisites discovered**: Thief knockout bug must be fixed before Phase 3 can be committed cleanly; the bug predates Phase 3 changes

## Architectural Decisions

- Pattern applied: `entity.attributes` as `Record<string, unknown>` for transient puzzle state (echo room), avoiding a dedicated trait for a single boolean flag
- `npcTrait.kill()` is the canonical way to mark an NPC dead — do not set `isDead`/`isAlive` directly on the entity

## Mutation Audit

- Files with state-changing logic modified: `kl.ts` (kill NPC), `egg-behaviors.ts` (open egg), `grue-handler.ts` (open trapdoor)
- Tests verify actual state mutations (not just events): NO — Phase 3 changes were stashed; no new tests written this session
- If NO: `kl.ts` kill path, `egg-behaviors.ts` openable mutation, and `grue-handler.ts` openable mutation should have state-assertion tests added (not blocking for this cleanup refactor, but should be tracked)

## Recurrence Check

- Similar to past issue? NO — the `as any` cleanup is a one-time systematic refactor unique to ISSUE-063; the thief knockout bug is a new discovery not matching prior session blockers

## Test Coverage Delta

- Tests added: 0
- Tests passing before: engine 184, stdlib 1113
- Tests passing after: engine 184, stdlib 1113 (no change — Phase 3 stashed)
- Known untested areas: thief unconscious → targetability path; GDT KL kill mutation; egg open mutation

---

**Progressive update**: Session completed 2026-03-27 01:53 CST
