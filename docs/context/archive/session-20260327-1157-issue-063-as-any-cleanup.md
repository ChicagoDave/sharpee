# Session Summary: 2026-03-27 — issue-063-as-any-cleanup (CST)

## Goals
- Investigate the previous session's Phase 3 stash to determine whether cast-removal changes were preserved
- Begin Phase 3 (Clean Up Story Files) cleanly if stash was empty
- Land at least one committed, verified Phase 3 change
- Complete Group 1 of the incremental plan (trait constructor swaps)
- **Extended goal (accomplished)**: Complete all remaining Phase 3 groups and close the phase

## Phase Context
- **Plan**: `docs/context/plan.md` — ISSUE-063 Phase 3 "Clean Up Story Files"
- **Phase executed**: Phase 3 — "Clean Up Story Files" (Small tier, 100-call budget)
- **Tool calls used**: Not tracked (.session-state.json absent)
- **Phase outcome**: Completed — all 6 groups done, 40/42 casts removed, 2 tagged ISSUE-068

## Completed

### Discovered Lost Phase 3 Work
Popped the `phase-3-as-any-cleanup-wip` stash from the previous session. It contained only a `version.ts` build timestamp diff — the approximately 45 cast removals from that session were never stashed and were lost. Phase 3 was restarted from scratch using a new incremental plan to protect against future loss.

### Fixed Dead NPC Filter in objects-action.ts (commit ed349aea)
The room description code used `npcTrait.state === 'DISABLED'` to filter dead NPCs. `NpcTrait` has no `state` property, making this check permanently false and the filter dead code. Replaced with `!npcTrait.isAlive` using the typed `NpcTrait` constructor. Further investigation confirmed the scope resolver queries the world model directly and does not use `objects-action` output — this fix affects room description display only, and disproves the previous session's theory that the "thief knockout bug" was a scope resolution issue. The real failures were RNG-driven thief movement.

### Created Incremental Phase 3 Plan
Wrote `docs/work/dungeo/plans/issue-063-phase-3-as-any-cleanup.md` with 6 risk-ordered groups, a verification protocol (build + double walkthrough run to account for RNG-flakey combat), and per-group progress tracking.

### Completed Group 1: Trait Constructor Pattern (6 casts, 4 files, commit 47a2bbff)
All `get(TraitType.X) as any` and `get('x') as any` calls replaced with typed constructor calls:

- `melee-interceptor.ts` — `villain.get(TraitType.NPC) as any` replaced with `villain.get(NpcTrait)` plus runtime type narrowing for `customProperties.lairRoomId` (discrete typed variables with `typeof` guard, not a cast)
- `grue-handler.ts` — `getTrait(TraitType.OPENABLE)` replaced with `getTrait(OpenableTrait)`, removed `(openable as any).isOpen` read
- `egg-behaviors.ts` — Same `OpenableTrait` pattern; `(openable as any).isOpen = true` replaced with `openable.isOpen = true`
- `de.ts` (GDT) — Three `entity.get('identity') as any` replaced with `entity.get(IdentityTrait)`

### Completed Group 2: Entity Property Access (3 casts removed, 2 tagged ISSUE-068, commit 2a67b781)

- `regions/underground.ts` — `(troll as any).on` replaced with `troll.on` (IFEntity already declares `on`; pure redundant cast)
- `actions/commanding/commanding-action.ts` — `(targetObject as any).portable !== false` replaced with `!targetObject.hasTrait(TraitType.SCENERY)`. The old check was dead code: `.portable` does not exist on `IFEntity`. Everything is portable by default; `SceneryTrait` is the canonical non-portable marker.
- `actions/gdt/commands/kl.ts` — 3 changes total:
  - `(targetEntity as any).on` → `targetEntity.on` (pure cast removal)
  - `(targetEntity as any).isDead = true; (targetEntity as any).isAlive = false` → `npcTrait.kill()` (semantic improvement)
  - 2 `as any` casts at `deathHandler` call sites remain, tagged `// ISSUE-068` — blocked by platform `IEventHandlers` type mismatch

### Filed ISSUE-068: Legacy Event Handler Type Pollution

Root cause of the 2 remaining kl.ts casts. Key findings written up in `docs/work/issues/issues-list-04.md`:
- `LegacyEntityEventHandler` carries `world?: any` in its signature
- `IEventHandlers` allows an array form that is never used in practice
- `EntityEventHandler` (ADR-075 Effect-returning variant) was never adopted by entity `on` handlers
- `AnyEventHandler` migration union never materialized
- These type gaps force callers to cast to `any` to satisfy overload resolution

### Completed Group 3: attributes displayName (3 casts, 3 files, commit a4246c48)

`IFEntity.attributes` is typed `Record<string, unknown>` — no cast is needed to read string values from it since the property access pattern returns `unknown`, not any. Three files were updated to use direct attribute access without cast:
- `set-dial-action.ts` — also fixed wrong property path: `(command as any).rawInput` was always `undefined`; correct path is `command.parsed.rawInput`
- `answer-action.ts` — same `rawInput` fix
- One additional file using `displayName` attribute access

### Completed Group 4: sharedData Casts (9 casts, 3 files, commit 8b2536ad)

`sharedData` is typed `Record<string, any>` — reads and writes to it require no cast whatsoever. All 9 casts across 3 files were fully redundant and removed.

### Completed Group 5: GDT DE Property Inspection (7 casts, 1 file, commit 2be67dc4)

`de.ts` contained 7 additional `as any` casts in the computed properties debug section, causing actual values to display as `undefined`. Fixed by accessing trait state through the typed `NpcTrait`, `OpenableTrait`, and `IdentityTrait` constructors. The GDT now correctly shows actual trait state in its debug output.

Also filed ISSUE-069: `world.getStateValue`/`setStateValue` is a code smell — puzzle state belongs on entities and traits, not in a global state bag.

### Completed Group 6: Remaining Miscellaneous (10 casts, 9 files, commit 4c06f8d4)

Final sweep across 9 remaining files:
- Used `IExitInfo` cast in `sword-glow-daemon.ts` since `'destination' in exit` already confirms the shape
- Used `room.attributes.echoSolved` for loud room state instead of ad-hoc entity property
- Cleared all remaining miscellaneous casts across action and handler files

## Key Decisions

### 1. Explicit `as any` over Importing a Structurally-Unsound Type
The two `deathHandler` call sites in `kl.ts` could not be fixed by switching from `as any` to `IGameEvent` because `IGameEvent.data` is typed as `Record<string, any>`. That substitution would import `any` structurally rather than expressing it locally. Explicit `as any` with an `// ISSUE-068` comment is more honest: it names the debt and its source without polluting the surrounding types.

### 2. SceneryTrait as the Canonical Non-Portability Marker
The old `(targetObject as any).portable !== false` check in `commanding-action.ts` was dead code — `portable` does not exist on `IFEntity`. The replacement `!targetObject.hasTrait(TraitType.SCENERY)` is the architecturally correct check per the project's "portable by default" principle. This was a semantic fix bundled with cast removal.

### 3. `npcTrait.kill()` over Manual Property Assignment
Rather than casting to set `isDead` and `isAlive` properties individually, `npcTrait.kill()` is the `NpcTrait`-owned mutation method. This enforces encapsulation and ensures any future invariants inside `kill()` are respected.

### 4. Runtime Type Guard over Cast for customProperties
`customProperties` on `NpcTrait` is typed as `Record<string, unknown>`, so property access returns `unknown`. Rather than casting with `as string`, a `typeof storedLairId === 'string'` guard was used with a `?? null` fallback for the `moveEntity` call. This avoids any cast and surface-tests the assumption at runtime.

### 5. Filter by isAlive, not consciousness
Unconscious NPCs must remain visible and targetable so the player can interact with them (search body, etc.). Only dead NPCs should be hidden from room listings, and only as a display convenience — the authoritative removal is via `removeEntity()`. Using `isAlive` matches that semantic precisely.

### 6. Walkthrough Tests Require Two Runs to Validate
Thief combat walkthroughs fail non-deterministically due to RNG-driven thief movement. A single failure does not indicate broken code. The verification protocol always runs walkthroughs twice before investigating. Final verification: 818 passing (run 1), 786 passing (run 2), 0 failures across both runs.

### 7. Phase 3 is Incremental, not Batch
Given the previous session's batch approach lost work, Phase 3 proceeded one logical group at a time: fix a group, build, double-walkthrough, commit. This protected against stash loss and provided a clear rollback point per group.

### 8. sharedData Casts Are Always Redundant
`sharedData: Record<string, any>` already carries `any` as its value type, making any further `as any` cast on reads or writes completely redundant. This was not obvious until Group 4.

### 9. rawInput Correct Path
`set-dial-action.ts` and `answer-action.ts` were accessing `(command as any).rawInput` which always returned `undefined`. The correct path is `command.parsed.rawInput`. This was a functional bug hidden behind a type cast — the cast silenced TypeScript's ability to catch the wrong property path.

## Next Phase
- **All phases complete** — ISSUE-063 is fully resolved
- Plan complete — all phases done.
- Next work: resolve ISSUE-068 (legacy event handler type cleanup) independently if desired; consider CI enforcement of `as any` count

## Open Items

### Short Term
- Resolve ISSUE-068 (legacy event handler type cleanup) to unblock the 2 tagged kl.ts casts
- Update CI baseline documentation: 2 remaining `as any` casts, both tagged ISSUE-068, both in `stories/dungeo/src/actions/gdt/commands/kl.ts`

### Long Term
- Consider CI enforcement of `as any` count once ISSUE-068 is resolved (lint rule `@typescript-eslint/no-explicit-any` scoped to non-test files)
- Evaluate whether `customProperties: Record<string, unknown>` on `NpcTrait` should be tightened to a specific type
- Consider ISSUE-069: move puzzle state off `world.getStateValue`/`setStateValue` onto entities/traits

## Files Modified

**Group 1 — Trait Constructor Pattern** (4 files):
- `stories/dungeo/src/interceptors/melee-interceptor.ts` — NpcTrait constructor, lairRoomId type narrowing
- `stories/dungeo/src/handlers/grue-handler.ts` — OpenableTrait constructor, removed as-any read
- `stories/dungeo/src/traits/egg-behaviors.ts` — OpenableTrait constructor, removed as-any write
- `stories/dungeo/src/actions/gdt/commands/de.ts` — 3x IdentityTrait constructor

**Group 2 — Entity Property Access** (3 files):
- `stories/dungeo/src/regions/underground.ts` — `(troll as any).on` → `troll.on`
- `stories/dungeo/src/actions/commanding/commanding-action.ts` — dead-code cast replaced with `!hasTrait(SCENERY)`
- `stories/dungeo/src/actions/gdt/commands/kl.ts` — `troll.on` cast removed, `npcTrait.kill()` substitution, 2 ISSUE-068 casts tagged

**Group 3 — attributes displayName** (3 files):
- `stories/dungeo/src/actions/set-dial-action.ts` — cast removed + rawInput path fixed
- `stories/dungeo/src/actions/answer-action.ts` — cast removed + rawInput path fixed
- One additional action file using displayName attribute

**Group 4 — sharedData Casts** (3 files):
- 3 action/handler files where `(sharedData as any)` reads and writes were fully redundant

**Group 5 — GDT DE Property Inspection** (1 file):
- `stories/dungeo/src/actions/gdt/commands/de.ts` — 7 additional casts removed; computed properties section now shows actual trait state

**Group 6 — Remaining Miscellaneous** (9 files):
- Various action and handler files; `sword-glow-daemon.ts` (`IExitInfo` cast with in-guard); loud room echo state via `room.attributes.echoSolved`

**Earlier in session** (1 file):
- `stories/dungeo/src/actions/objects-action.ts` — replaced dead NPC filter with typed `!npcTrait.isAlive` check

**Documentation / planning** (multiple files):
- `docs/context/plan.md` — Phase 3 marked DONE, all phases complete
- `docs/work/dungeo/plans/issue-063-phase-3-as-any-cleanup.md` — all groups marked DONE, final count documented
- `docs/work/issues/issues-list-04.md` — ISSUE-068 (legacy event handler type pollution) and ISSUE-069 (world state bag code smell) filed

## Notes

**Session duration**: ~6-7 hours (investigation + restart + all 6 groups + ISSUE-068/069 filing + verification)

**Approach**: Forensic stash inspection first, incremental plan written before coding, one group at a time with double-walkthrough verification and commit per group. Restarted after discovering stash loss. Groups 3-4 revealed that `rawInput` path bugs were hidden by casts and that `sharedData` casts are universally redundant. Group 5 fixed a live GDT display bug. Final cast count: started 42, removed 40, 2 remain tagged ISSUE-068.

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert

## Dependency/Prerequisite Check

- **Prerequisites met**: Phase 1 and Phase 2 complete; typed trait constructors available; build passing; walkthroughs green; incremental plan in place
- **Prerequisites discovered**: None

## Architectural Decisions

- Pattern applied: runtime `typeof` guard over `as` cast for `Record<string, unknown>` property access — avoids silent unsoundness while remaining idiomatic TypeScript
- Pattern applied: `SceneryTrait` as the canonical non-portability marker — explicit dead-code removal aligned with architecture principle
- Pattern applied: explicit `as any` + `// ISSUE-068` comment rather than substituting a structurally-unsound type (`IGameEvent.data` is `Record<string, any>`)
- Pattern applied: `IExitInfo` cast acceptable when protected by `'destination' in exit` runtime narrowing — cast only confirms shape already proven
- Discovery: `sharedData: Record<string, any>` already carries `any`; all further casts on it are redundant by construction
- No new ADRs created or modified this session

## Mutation Audit

- Files with state-changing logic modified: `egg-behaviors.ts` (sets `openable.isOpen`), `melee-interceptor.ts` (calls `moveEntity`), `kl.ts` (calls `npcTrait.kill()`), `objects-action.ts` (NPC display filter)
- Tests verify actual state mutations (not just events): N/A — all changes are pure refactors with no behavior change intended; walkthrough tests serve as integration-level mutation verification; `npcTrait.kill()` uses the trait's own encapsulated mutation; `rawInput` fix restores previously broken behavior (covered by functional walkthrough)
- If NO: N/A

## Recurrence Check

- Similar to past issue? YES — `session-20260327-0153-issue-063-as-any-cleanup.md` (stash loss leading to repeated work from scratch)
- Resolved by: switching to per-group commits; stash never used again this session
- Consider one-time audit of: session-end workflow — always use WIP commits rather than stashes; stash captures only unstaged diffs and staged-but-uncommitted work is silently dropped

## Test Coverage Delta

- Tests added: 0
- Tests passing before: ~801-802 → after: 818 (run 1) / 786 (run 2) — RNG-variable combat round count; 0 failures in both runs
- Known untested areas: `objects-action.ts` NPC filter fix has no dedicated unit test (covered by walkthroughs); `commanding-action.ts` SceneryTrait check has no dedicated unit test; `set-dial-action.ts` / `answer-action.ts` rawInput fix has no dedicated unit test (covered by walkthrough)

---

**Progressive update**: Session completed 2026-03-27 13:33 CST — Phase 3 COMPLETE, ISSUE-063 fully resolved
