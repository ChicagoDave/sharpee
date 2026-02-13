# Session Summary: 2026-02-10 - combat-refactor (2:00 PM CST)

## Status: All 7 Steps Complete — Ready for Build + Test

## Goals
- Execute the combat system refactor plan from `docs/work/combat/refactor-plan.md`
- Extract CombatService from stdlib into `@sharpee/ext-basic-combat` extension
- Add pluggable NpcCombatResolver for NPC→target attacks
- Remove CombatService coupling from attacking.ts and npc-service.ts
- Create Dungeo melee NPC resolver so Dungeo owns both combat directions

## Architecture After Refactor

```
PC attacks NPC:  attacking.ts → ActionInterceptor → MeleeInterceptor (Dungeo)
                                                  → BasicCombatInterceptor (generic stories)

NPC attacks PC:  npc-service.ts → NpcCombatResolver → meleeNpcResolver (Dungeo)
                                                    → basicNpcResolver (generic stories)

No combat ext:   attacking.ts → "Violence is not the answer." (validation block)
                 npc-service.ts → bare npc.attacked event (no resolution)
```

## Completed Steps

### Gotcha Analysis (pre-implementation)
3 critical gotchas found and fixed before coding:
1. **Non-combat attack path clobbered** — kept three-branch structure in attacking.ts
2. **Guard behavior silent failure** — acceptable: document as requirement
3. **`canAttack()` inlining** — OK after analysis (unreachable branch)

Design decision: "Violence is not the answer." blocked at validation, not execute.

### Step 1: Create `packages/extensions/basic-combat/` (8 files)
- `package.json`, `tsconfig.json` — new package with core/world-model/stdlib deps
- `src/combat-service.ts` — moved CombatService + applyCombatResult from stdlib
- `src/combat-messages.ts` — moved CombatMessages from stdlib
- `src/basic-combat-interceptor.ts` — wraps CombatService as ActionInterceptor (PC→NPC)
- `src/basic-npc-resolver.ts` — wraps CombatService as NpcCombatResolver (NPC→PC)
- `src/index.ts` — barrel exports + `registerBasicCombat()` entry point
- `tests/combat-service.test.ts` — moved from stdlib

### Step 2: Add pluggable NpcCombatResolver to npc-service.ts
- `NpcCombatResolver` type + `registerNpcCombatResolver()` + `clearNpcCombatResolver()`
- globalThis pattern (matches interceptor registry)
- `executeAttack()` delegates to resolver or emits bare `npc.attacked` event
- Removed all CombatService imports from npc-service.ts

### Step 3: Remove CombatService fallback from attacking.ts
- Removed CombatService/CombatResult/applyCombatResult imports
- Validate: inlined `canAttack` + `violence_not_the_answer` block when no interceptor
- Execute: defensive no-op for unreachable "no interceptor" path
- Report: replaced CombatMessages constants with string literals
- `attacking-types.ts`: `combatResult` type → `unknown`
- `lang-en-us/attacking.ts`: added `already_dead` and `violence_not_the_answer` messages

### Step 4: Clean up stdlib combat module
- Created `weapon-utils.ts` with only `findWieldedWeapon()`
- Deleted `combat-service.ts` and `combat-messages.ts` (moved to basic-combat)
- Updated `combat/index.ts` — exports only `findWieldedWeapon`
- Fixed stale `CombatResult` type reference in `attacking.ts:333` → cast to `any`

### Step 5: Create Dungeo melee NPC resolver
- Created `stories/dungeo/src/combat/melee-npc-attack.ts` — `meleeNpcResolver()`
- Canonical MDL melee engine for villain→hero attacks
- Guard: no-op if target is not the player (`target.isPlayer`)
- Stagger: villain recovers instead of attacking
- Uses `villainStrength()` / `fightStrength()` / `resolveBlow(isHeroAttacking=false)`
- Applies all side effects: wounds, stagger, lose weapon, death
- UNCONSCIOUS hero treated as dead (per MDL)
- Returns events with `getVillainAttackMessage()` canonical text
- Module-level SeededRandom (same pattern as melee interceptor)

### Step 6: Register melee resolver in Dungeo init
- `registerNpcCombatResolver(meleeNpcResolver)` after MeleeInterceptor registration
- Dungeo owns both directions: PC→NPC (interceptor) + NPC→PC (resolver)

### Step 7: Build system integration
- `pnpm-workspace.yaml`: added `packages/extensions/basic-combat`
- `build.sh`: added to PACKAGES (after stdlib), added esbuild alias for CLI bundle
- `pnpm install` succeeded — workspace recognized new package

## All Files Changed

| File | Action |
|------|--------|
| `packages/extensions/basic-combat/*` | **Created** (8 files) |
| `packages/stdlib/src/npc/npc-service.ts` | Added NpcCombatResolver, removed CombatService |
| `packages/stdlib/src/npc/index.ts` | Added new exports |
| `packages/stdlib/src/actions/standard/attacking/attacking.ts` | Removed CombatService, fixed CombatResult ref |
| `packages/stdlib/src/actions/standard/attacking/attacking-types.ts` | `combatResult` → `unknown` |
| `packages/stdlib/src/combat/combat-service.ts` | **Deleted** (moved to basic-combat) |
| `packages/stdlib/src/combat/combat-messages.ts` | **Deleted** (moved to basic-combat) |
| `packages/stdlib/src/combat/weapon-utils.ts` | **Created** (`findWieldedWeapon` only) |
| `packages/stdlib/src/combat/index.ts` | **Updated** (exports weapon-utils only) |
| `packages/lang-en-us/src/actions/attacking.ts` | Added `already_dead`, `violence_not_the_answer` |
| `stories/dungeo/src/combat/melee-npc-attack.ts` | **Created** (`meleeNpcResolver`) |
| `stories/dungeo/src/combat/index.ts` | **Updated** (added export) |
| `stories/dungeo/src/index.ts` | **Updated** (import + register resolver) |
| `pnpm-workspace.yaml` | **Updated** (added basic-combat) |
| `build.sh` | **Updated** (PACKAGES + esbuild alias) |
| `docs/work/combat/refactor-plan.md` | Updated with gotcha logs |

## Next: Build + Test
```bash
./build.sh -s dungeo
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

Expected issues to fix:
- Compilation errors from new/moved files
- Stdlib tests expecting old CombatService behavior (now `violence_not_the_answer`)
- NPC service tests expecting combat resolution (now bare events without resolver)
