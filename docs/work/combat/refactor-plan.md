# Plan: Move CombatService to packages/extensions/basic-combat

## Context

CombatService is a generic skill-based combat resolver baked into stdlib. It handles both PC-attacks-NPC (as a fallback in attacking.ts) and NPC-attacks-PC (hardcoded in npc-service.ts). Dungeo's canonical MDL melee system replaces the PC→NPC path via an interceptor, but NPC→PC attacks still go through CombatService, producing wrong results and broken combat.

CombatService should be an **opt-in extension** that handles both attack directions. Stories with their own combat (Dungeo) register their own resolver for both directions. Stories wanting simple generic combat import basic-combat.

## Step 1: Create `packages/extensions/basic-combat/`

New package `@sharpee/ext-basic-combat`.

**Files to create:**

| File | Source | Notes |
|------|--------|-------|
| `package.json` | New | Depends on `@sharpee/core`, `@sharpee/world-model`, `@sharpee/stdlib` |
| `tsconfig.json` | New | Extends `../../../tsconfig.base.json`, refs: core, world-model, stdlib |
| `src/combat-service.ts` | **Move** from `packages/stdlib/src/combat/combat-service.ts` | Everything except `findWieldedWeapon()` |
| `src/combat-messages.ts` | **Move** from `packages/stdlib/src/combat/combat-messages.ts` | All CombatMessages constants, HealthStatus |
| `src/basic-combat-interceptor.ts` | New | Wraps CombatService as an ActionInterceptor for PC→NPC |
| `src/basic-npc-resolver.ts` | New | Wraps CombatService as an NpcCombatResolver for NPC→PC |
| `src/index.ts` | New | Barrel exports + `registerBasicCombat()` |
| `tests/combat-service.test.ts` | **Move** from `packages/stdlib/tests/unit/combat/combat-service.test.ts` | Update imports |

**`registerBasicCombat()` does two things:**
1. `registerActionInterceptor(TraitType.COMBATANT, 'if.action.attacking', BasicCombatInterceptor)` — handles PC→NPC
2. `registerNpcCombatResolver(basicNpcResolver)` — handles NPC→PC

**`BasicCombatInterceptor.postExecute()`:**
- Creates CombatService, calls `resolveAttack()`, calls `applyCombatResult()`
- Uses `findWieldedWeapon()` from `@sharpee/stdlib`
- Populates sharedData: `attackResult`, `combatResult`, `usedCombatService: true`
- Report phase in attacking.ts works unchanged (reads same sharedData fields)

**`basicNpcResolver()`:**
- Same CombatService logic currently in npc-service.ts `executeAttack()` (lines 592-642)
- Returns `ISemanticEvent[]` with `npc.attacked` and optional `if.event.death`

## Step 2: Add pluggable NPC combat resolver to npc-service.ts

**File:** `packages/stdlib/src/npc/npc-service.ts`

Add near top of file:
```typescript
export type NpcCombatResolver = (
  npc: IFEntity, target: IFEntity, world: WorldModel, random: SeededRandom
) => ISemanticEvent[];

let npcCombatResolver: NpcCombatResolver | undefined;

export function registerNpcCombatResolver(resolver: NpcCombatResolver): void {
  npcCombatResolver = resolver;
}
```

Rewrite `executeAttack()`:
- If `npcCombatResolver` registered → delegate to it
- Otherwise → emit basic `npc.attacked` event (no combat resolution)
- Remove `CombatService`, `applyCombatResult`, `CombatMessages` imports

## Step 3: Remove CombatService fallback from attacking.ts

**File:** `packages/stdlib/src/actions/standard/attacking/attacking.ts`

1. **Remove imports**: `CombatService`, `CombatResult`, `applyCombatResult` from `../../../combat`
2. **Validate (lines 176-187)**: Inline the `canAttack` check (just `CombatantTrait.isAlive`):
   ```typescript
   if (target.has(TraitType.COMBATANT)) {
     const combatant = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
     if (combatant && !combatant.isAlive) {
       return { valid: false, error: 'already_dead', params: { target: target.name } };
     }
   }
   ```
3. **Execute (lines 278-315)**: Replace CombatService fallback with graceful failure:
   ```typescript
   } else {
     // No interceptor — story must register a combat extension
     Object.assign(context.sharedData, {
       attackResult: { success: false, type: 'missed', damage: 0, remainingHitPoints: 0, targetDestroyed: false },
       usedCombatService: false,
       customMessage: 'no_combat_system',
     });
   }
   ```
4. **Report (lines 462-467)**: Replace `CombatMessages.ATTACK_KNOCKED_OUT` → `'combat.attack.knocked_out'`, `CombatMessages.ATTACK_MISSED` → `'combat.attack.missed'` (string literals)
5. **Remove** `import { CombatMessages } from '../../../combat/combat-messages'`

## Step 4: Clean up stdlib combat module

**`packages/stdlib/src/combat/combat-service.ts`:**
- Remove everything except `findWieldedWeapon()` and its types
- Rename file to `weapon-utils.ts` for clarity

**`packages/stdlib/src/combat/combat-messages.ts`:**
- Delete (moved to basic-combat)

**`packages/stdlib/src/combat/index.ts`:**
- Export only from `./weapon-utils`

**`packages/stdlib/src/index.ts`:**
- Keep `export * from './combat'` (now only exports `findWieldedWeapon`)

## Step 5: Create Dungeo melee NPC resolver

**New file:** `stories/dungeo/src/combat/melee-npc-attack.ts`

Function: `meleeNpcResolver(npc, target, world, random): ISemanticEvent[]`

Uses existing melee functions (all in `stories/dungeo/src/combat/`):
- `fightStrength(score, woundAdjust)` — hero's defense strength
- `villainStrength(ostrength)` — NPC's attack strength
- `resolveBlow(att, def, isHeroAttacking=false, ...)` — table-based resolution
- `applyVillainBlowToHero(currentWound, blowResult, baseFight)` — wound calculation
- `isHeroDeadFromWounds(score, newWound)` — death check
- `getVillainAttackMessage(villainKey, outcome, weaponName, pick)` — canonical text
- `getBaseOstrength(villain)` — villain strength lookup
- `MELEE_STATE` keys — read/write entity attributes

Side effects to apply per outcome:
- **STAGGER**: Set `player.attributes[MELEE_STATE.STAGGERED] = true`
- **LIGHT_WOUND**: Reduce `player.attributes[MELEE_STATE.WOUND_ADJUST]` by 1
- **SERIOUS_WOUND**: Reduce wound adjust by 2
- **LOSE_WEAPON**: Drop hero's weapon to room (`findWieldedWeapon` + `world.moveEntity`)
- **KILLED**: Emit `if.event.death`
- **UNCONSCIOUS**: Hero death (MDL treats unconscious hero as dead)
- **MISSED/HESITATE**: No effect

Returns `ISemanticEvent[]` with `game.message` event containing villain attack text.

Handle villain stagger: Check `npc.attributes[MELEE_STATE.VILLAIN_STAGGERED]`. If staggered, clear flag and emit recovery message instead of attacking.

## Step 6: Register Dungeo melee resolver

**File:** `stories/dungeo/src/index.ts` (in `initializeWorld()`)

Add after melee interceptor registration:
```typescript
registerNpcCombatResolver(meleeNpcResolver);
```

This gives Dungeo complete ownership of both combat directions:
- PC→NPC: `MeleeInterceptor` (existing, via `registerActionInterceptor`)
- NPC→PC: `meleeNpcResolver` (new, via `registerNpcCombatResolver`)

**No changes to NPC behaviors.** Troll/thief still return `{ type: 'attack', target: player.id }`. The resolver handles resolution.

## Step 7: Build system integration

**`pnpm-workspace.yaml`:** Add `- packages/extensions/basic-combat`

**`build.sh`:**
- Add `"@sharpee/ext-basic-combat:extensions/basic-combat"` to PACKAGES array (after stdlib, before plugins)
- Add `--alias:@sharpee/ext-basic-combat=./packages/extensions/basic-combat/dist/index.js` to esbuild bundle

## Files Summary

| File | Action | Package |
|------|--------|---------|
| `packages/extensions/basic-combat/*` | **Create** (8 files) | ext-basic-combat |
| `packages/stdlib/src/combat/combat-service.ts` | **Rename** to `weapon-utils.ts`, keep only `findWieldedWeapon` | stdlib |
| `packages/stdlib/src/combat/combat-messages.ts` | **Delete** | stdlib |
| `packages/stdlib/src/combat/index.ts` | **Update** exports | stdlib |
| `packages/stdlib/src/actions/standard/attacking/attacking.ts` | **Remove** CombatService fallback + inline validation | stdlib |
| `packages/stdlib/src/npc/npc-service.ts` | **Add** NpcCombatResolver, remove CombatService | stdlib |
| `stories/dungeo/src/combat/melee-npc-attack.ts` | **Create** villain-attacks-hero resolver | dungeo |
| `stories/dungeo/src/combat/index.ts` | **Update** exports | dungeo |
| `stories/dungeo/src/index.ts` | **Add** `registerNpcCombatResolver` call | dungeo |
| `pnpm-workspace.yaml` | **Add** basic-combat entry | workspace |
| `build.sh` | **Add** build order + esbuild alias | build |

**No changes to:** NPC behaviors (troll, thief), melee interceptor, melee engine, lang-en-us messages

## Verification

```bash
# 1. Build everything
./build.sh -s dungeo

# 2. Run stdlib unit tests
pnpm --filter '@sharpee/stdlib' test

# 3. Run basic-combat tests
pnpm --filter '@sharpee/ext-basic-combat' test

# 4. Run Dungeo walkthroughs (melee handles both directions now)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# 5. Verify no Dungeo→basic-combat dependency
grep -r "ext-basic-combat\|basic-combat" stories/dungeo/src/
# Should return nothing
```
