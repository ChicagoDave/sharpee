# Session Summary: 2026-02-10 - combat-refactor (2:00 PM CST)

## Status: In Progress (Steps 1-3 of 7 complete)

## Goals
- Execute the combat system refactor plan from `docs/work/combat/refactor-plan.md`
- Extract CombatService from stdlib into `@sharpee/ext-basic-combat` extension
- Add pluggable NpcCombatResolver for NPC→target attacks
- Remove CombatService coupling from attacking.ts and npc-service.ts

## Completed

### Gotcha Analysis (pre-implementation)
Deep code review found 3 critical gotchas in the original plan:
1. **Non-combat attack path clobbered** — plan collapsed AttackBehavior (object destruction) branch with "no combat system" branch. Fixed: keep three-branch structure.
2. **Guard behavior silent failure** — NPC attacks with no resolver produce bare events. Acceptable: document as requirement.
3. **`canAttack()` inlining incomplete** — actually OK after analysis (unreachable branch).

Design decision: Default attacking response without combat system is "Violence is not the answer." — blocked at validation, not execute.

Plan updated with gotcha logs in Steps 3-6 and new test updates section.

### Step 1: Create `packages/extensions/basic-combat/` (8 files)
- `package.json` — depends on core, world-model, stdlib
- `tsconfig.json` — refs core, world-model, stdlib
- `src/combat-messages.ts` — moved from stdlib
- `src/combat-service.ts` — moved from stdlib (CombatService + applyCombatResult, NOT findWieldedWeapon)
- `src/basic-combat-interceptor.ts` — NEW: wraps CombatService as ActionInterceptor for PC→NPC
- `src/basic-npc-resolver.ts` — NEW: wraps CombatService as NpcCombatResolver for NPC→PC
- `src/index.ts` — barrel exports + `registerBasicCombat()` entry point
- `tests/combat-service.test.ts` — moved from stdlib

### Step 2: Add pluggable NpcCombatResolver to npc-service.ts
- Added `NpcCombatResolver` type, `registerNpcCombatResolver()`, `clearNpcCombatResolver()`
- Uses globalThis pattern (matches interceptor registry)
- Rewrote `executeAttack()`: delegates to resolver or emits bare `npc.attacked` event
- Removed all CombatService/applyCombatResult/findWieldedWeapon/CombatMessages imports
- Exported new type + functions from `npc/index.ts`

### Step 3: Remove CombatService fallback from attacking.ts
- Removed imports: CombatService, CombatResult, applyCombatResult, CombatMessages, getHealthStatusMessageId
- Removed `createSimpleRandom()` function
- Validate: inlined `canAttack` as `CombatantTrait.isAlive` check + `violence_not_the_answer` block when no interceptor
- Execute: replaced CombatService fallback with defensive no-op
- Report: replaced CombatMessages constants with string literals
- `attacking-types.ts`: changed `combatResult` to `unknown`, removed CombatResult import
- `lang-en-us/attacking.ts`: added `already_dead` and `violence_not_the_answer` messages

## Files Changed

| File | Action |
|------|--------|
| `docs/work/combat/refactor-plan.md` | Updated with gotcha logs in Steps 3-6, test updates section |
| `packages/extensions/basic-combat/*` | **Created** (8 files) |
| `packages/stdlib/src/npc/npc-service.ts` | Added NpcCombatResolver, removed CombatService |
| `packages/stdlib/src/npc/index.ts` | Added new exports |
| `packages/stdlib/src/actions/standard/attacking/attacking.ts` | Removed CombatService fallback, added violence_not_the_answer |
| `packages/stdlib/src/actions/standard/attacking/attacking-types.ts` | CombatResult → unknown |
| `packages/lang-en-us/src/actions/attacking.ts` | Added new messages |
| `docs/context/session-20260210-1400-combat-refactor.md` | This file |

## Remaining Steps
4. Clean up stdlib combat module (rename to weapon-utils, delete combat-messages)
5. Create Dungeo melee NPC resolver (`melee-npc-attack.ts`)
6. Register melee resolver in Dungeo init
7. Build system integration (workspace, build.sh, esbuild alias)

Then: build, fix tests, run walkthroughs.
