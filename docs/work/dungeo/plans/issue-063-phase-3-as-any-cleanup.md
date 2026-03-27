# ISSUE-063 Phase 3: Clean Up Story Files (`as any` Elimination)

**Branch**: issue-063-as-any-cleanup
**Baseline**: 42 code-level `as any` casts in `stories/dungeo/src/` (excluding comments/doc strings)
**Approach**: Incremental — one group at a time, build + double walkthrough verification after each

## Group 1: Trait Constructor Pattern (6 casts) — LOW RISK

Replace `entity.get(TraitType.X) as any` or `entity.get('x') as any` with `entity.get(XxxTrait)`.

| File | Line | Current | Replacement |
|------|------|---------|-------------|
| `interceptors/melee-interceptor.ts` | 173 | `villain.get(TraitType.NPC) as any` | `villain.get(NpcTrait)` |
| `handlers/grue-handler.ts` | 114 | `(openable as any).isOpen` | Use `OpenableTrait` directly (already have `openable`) |
| `traits/egg-behaviors.ts` | 88 | `(openable as any).isOpen = true` | Cast to `OpenableTrait` or use typed getter |
| `actions/gdt/commands/de.ts` | 50 | `entity.get('identity') as any` | `entity.get(IdentityTrait)` |
| `actions/gdt/commands/de.ts` | 68 | `locationEntity?.get('identity') as any` | `locationEntity?.get(IdentityTrait)` |
| `actions/gdt/commands/de.ts` | 167 | `item.get('identity') as any` | `item.get(IdentityTrait)` |

**Status**: TODO

## Group 2: Entity Property Access (4 casts) — MEDIUM RISK

Direct property access on entities via `as any`. Some change semantics.

| File | Line | Current | Notes |
|------|------|---------|-------|
| `regions/underground.ts` | 356 | `(troll as any).on = {...}` | `IFEntity` declares `on?: IEventHandlers` — cast not needed |
| `actions/commanding/commanding-action.ts` | 197 | `(targetObject as any).portable !== false` | `portable` doesn't exist on IFEntity — always true. Semantic change needed. |
| `actions/gdt/commands/kl.ts` | 90 | `(targetEntity as any).on` | `IFEntity` declares `on` — cast not needed |
| `actions/gdt/commands/kl.ts` | 108-109 | `(targetEntity as any).isDead = true; .isAlive = false` | Should use `npcTrait.kill()` |

**Risk**: `commanding-action.ts` changes logic — `portable` is never set on entities, so `!== false` always passes. Need to determine correct semantics for the robot's object-taking check.

**Status**: TODO

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

## Verification Protocol

After each group:
1. `./build.sh -s dungeo` — must compile clean
2. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — run **twice** (thief RNG)
3. Commit the group
