# ISSUE-063 Phase 3: Clean Up Story Files (`as any` Elimination)

**Branch**: issue-063-as-any-cleanup
**Baseline**: 42 code-level `as any` casts in `stories/dungeo/src/` (excluding comments/doc strings)
**Approach**: Incremental — one group at a time, build + double walkthrough verification after each

## Group 1: Trait Constructor Pattern (6 casts) — LOW RISK — DONE

Commit: `47a2bbff`

- `melee-interceptor.ts`: `villain.get(NpcTrait)` + runtime `typeof` guard for `customProperties.lairRoomId`
- `grue-handler.ts`: `getTrait(OpenableTrait)` — direct `.isOpen` access
- `egg-behaviors.ts`: `get(OpenableTrait)` — direct `.isOpen = true` assignment
- `de.ts`: 3x `get(IdentityTrait)` replacing string-based lookups

**Note**: melee-interceptor required breaking `lairRoomId` into discrete variables with `typeof` guard + `?? null` for `moveEntity` — `customProperties` values are `unknown`, and `villainRoomId` is `string | undefined`.

## Group 2: Entity Property Access (4 casts) — MEDIUM RISK — DONE

- `underground.ts`: `(troll as any).on` → `troll.on` (IFEntity already declares `on`)
- `commanding-action.ts`: `(targetObject as any).portable !== false` → `!targetObject.hasTrait(TraitType.SCENERY)` (portable-by-default architecture; old check was dead code, always true)
- `kl.ts`: `(targetEntity as any).on` → `targetEntity.on` (IFEntity already declares `on`)
- `kl.ts`: `(targetEntity as any).isDead/isAlive` → `npcTrait.kill()` via NpcTrait constructor

**Blocked by ISSUE-068**: 2 `as any` casts remain in kl.ts at `deathHandler` call sites — `IEventHandlers` union type (`LegacyEntityEventHandler | LegacyEntityEventHandler[]`) isn't directly callable, and handler expects `IGameEvent` (with `data: Record<string, any>`) while event is `ISemanticEvent`. Tagged with `// ISSUE-068` comments.

**Status**: DONE (3 removed, 2 tagged as ISSUE-068-blocked)

## Group 3: Attributes displayName (3 casts) — LOW RISK

`(entity as any).attributes.displayName` — `IFEntity.attributes` is typed as `Record<string, unknown>`, so the cast is unnecessary.

| File | Line | Current |
|------|------|---------|
| `interceptors/inflatable-entering-interceptor.ts` | 130-131 | `(entity as any).attributes?.displayName` |
| `actions/inflate/inflate-action.ts` | 132 | `(boat as any).attributes.displayName = 'magic boat'` |
| `actions/deflate/deflate-action.ts` | 116 | `(boat as any).attributes.displayName = 'pile of plastic'` |

**Status**: TODO

## Group 4: sharedData Casts (9 casts) — LOW RISK

`(context.sharedData as any).xxx` — sharedData is typed as `Record<string, unknown>`, cast is redundant.

| File | Casts |
|------|-------|
| `actions/puzzle-move/puzzle-move-action.ts` | 5 (`direction`, `puzzleEvents`) |
| `actions/puzzle-take-card/puzzle-take-card-action.ts` | 2 (`takeCardEvents`) |
| `actions/gdt/gdt-command-action.ts` | 2 (`result`) |

**Status**: TODO

## Group 5: GDT de.ts Property Inspection (7 casts) — LOW RISK

Debug tool reads entity properties via `(entity as any).isOpen` etc. Should use trait lookups.

| File | Lines | Properties |
|------|-------|------------|
| `actions/gdt/commands/de.ts` | 80-86 | `enterable`, `portable`, `isOpen`, `isLocked`, `isOn`, `isSwitchable`, `isInflated` |

**Status**: TODO

## Group 6: Remaining Misc (13 casts) — MIXED RISK

| File | Line | Current | Risk |
|------|------|---------|------|
| `actions/set-dial/set-dial-action.ts` | 47 | `(command as any).rawInput` | Medium — need correct path |
| `actions/answer/answer-action.ts` | 149 | `(command as any).rawInput` | Medium — need correct path |
| `actions/say/say-action.ts` | 111 | `context.currentLocation as any` | Low |
| `actions/say/say-action.ts` | 366 | `context.sharedData.npcsInRoom as any[]` | Low |
| `actions/press-button/press-button-action.ts` | 93,99,126 | `world as any` | Low — functions already accept WorldModel |
| `actions/pour/pour-action.ts` | 112 | `(bucket as any)._traits?.keys?.()` | Low — `bucket.traits` is public |
| `npcs/robot/robot-behavior.ts` | 149 | `(npcTrait as any).customProperties = state` | Low — customProperties is on NpcTrait |
| `npcs/dungeon-master/dungeon-master-behavior.ts` | 188 | `(npcTrait as any).customProperties = state` | Low — customProperties is on NpcTrait |
| `scheduler/sword-glow-daemon.ts` | 120 | `(exit as any).destination` | Low — need to check exit type |
| `scheduler/explosion-fuse.ts` | 293 | `(wideLedgeTrait.blockedExits as any)[Direction.SOUTH]` | Low |

**Status**: TODO

## Completed

### objects-action.ts NPC filter fix (1 cast) — DONE
- Commit: `ed349aea`
- Replaced dead `npcTrait.state === 'DISABLED'` check with `!npcTrait.isAlive` using typed NpcTrait constructor
- Verified: 802 passing, 0 failures (2 runs)

### Group 1: Trait Constructor Pattern (6 casts) — DONE
- Commit: `47a2bbff`
- 4 files: melee-interceptor, grue-handler, egg-behaviors, GDT de.ts
- Verified: 794 passing (run 1), 837 passing (run 2), 0 failures

### Group 2: Entity Property Access (3 removed, 2 ISSUE-068-blocked) — DONE
- 3 files: underground.ts, commanding-action.ts, kl.ts
- `troll.on` and `targetEntity.on` — pure cast removal (IFEntity declares `on`)
- `commanding-action.ts` — dead `portable` check replaced with `hasTrait(SceneryTrait)` (architecture: everything portable by default)
- `kl.ts` — `isDead/isAlive` direct assignment replaced with `npcTrait.kill()`
- 2 remaining `as any` in kl.ts tagged `// ISSUE-068` — blocked by platform `IEventHandlers` type mismatch
- Filed ISSUE-068 for `LegacyEntityEventHandler` cleanup
- Verified: 838 passing (run 1), 816 passing (run 2), 0 failures

## Verification Protocol

After each group:
1. `./build.sh -s dungeo` — must compile clean
2. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — run **twice** (thief RNG)
3. Commit the group
