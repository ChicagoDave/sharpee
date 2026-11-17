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

### Gotcha log

Three issues found during review that the original plan would have introduced:

1. **Non-combat attack path clobbered.** The execute phase has three branches: (a) interceptor exists, (b) no interceptor + CombatantTrait, (c) no interceptor + no CombatantTrait (AttackBehavior for object destruction). The original plan collapsed (b) and (c) into one "no interceptor" branch. **Fix:** Only replace branch (b); leave branch (c) (`AttackBehavior.attack()`) completely untouched.

2. **`canAttack()` inlining was incomplete.** The original plan only inlined the `isAlive` check. But `canAttack()` also handles "target is not a combatant" → `CANNOT_ATTACK`. However, looking at the actual code flow: validate line 176 checks `target.has(TraitType.COMBATANT)` *before* calling `canAttack()`, so the "not a combatant" case is already unreachable — only `isAlive` matters. The inlined code is correct as-is.

3. **Default "Violence is not the answer."** When no combat extension is registered, the stdlib response for attacking a combatant should be the classic IF fallback: "Violence is not the answer." This is a validation-level block, not an execute-phase failure. Cleaner to block in validate than to let execute run and produce a dummy result.

### Changes

1. **Remove imports**: `CombatService`, `CombatResult`, `applyCombatResult` from `../../../combat`; `CombatMessages` from `../../../combat/combat-messages`

2. **Validate (lines 176-187)**: Replace `canAttack()` with inline check + interceptor check:
   ```typescript
   if (target.has(TraitType.COMBATANT)) {
     const combatant = target.get(TraitType.COMBATANT) as CombatantTrait | undefined;
     if (combatant && !combatant.isAlive) {
       return { valid: false, error: 'already_dead', params: { target: target.name } };
     }
     // No combat system registered — block with standard IF response
     if (!interceptor) {
       return { valid: false, error: 'violence_not_the_answer', params: { target: target.name } };
     }
   }
   ```
   Note: `interceptor` is already resolved earlier in validate (sharedData.interceptor). If there's a scoping issue, move the interceptor lookup above this block.

3. **Execute (lines 278-315)**: Remove the entire CombatService fallback branch. The `if (interceptor?.postExecute)` branch is now the only CombatantTrait path (validate blocks if no interceptor). Add a defensive else for safety:
   ```typescript
   if (interceptor?.postExecute) {
     // === INTERCEPTOR HANDLES COMBAT === (unchanged)
     ...
   } else {
     // Should not reach here — validate blocks if no interceptor.
     // Defensive fallback: treat as missed.
     Object.assign(context.sharedData, {
       attackResult: { success: false, type: 'missed', damage: 0, remainingHitPoints: 0, targetDestroyed: false },
       weaponUsed: weapon?.id,
       weaponInferred,
       usedCombatService: false,
     } satisfies AttackingSharedData);
   }
   ```

4. **The `} else {` branch (lines 316-342)** — `AttackBehavior.attack()` for non-combatant objects — is **completely untouched**.

5. **Report (lines 462-467)**: Replace `CombatMessages.ATTACK_KNOCKED_OUT` → `'combat.attack.knocked_out'`, `CombatMessages.ATTACK_MISSED` → `'combat.attack.missed'` (string literals).

6. **Add lang-en-us message** for `'if.action.attacking.violence_not_the_answer'` → `"Violence is not the answer."` in the attacking messages file.

## Step 4: Clean up stdlib combat module

### Gotcha log

- **`applyCombatResult()` also lives in combat-service.ts.** It mutates CombatantTrait (health, isAlive, knockedOut) and drops inventory on death. Both the basic-combat interceptor and the basic-combat NPC resolver need it. It moves to basic-combat along with CombatService. The dungeo melee system does NOT use `applyCombatResult()` — it manages its own wound/death state via MELEE_STATE attributes.
- **`CombatResult` type** is referenced in `attacking.ts` sharedData and in `AttackingSharedData` type. After removing CombatService from stdlib, the type import breaks. Options: (a) keep the type definition in stdlib as a shared interface, or (b) make sharedData.combatResult `unknown` and let interceptors type it. Option (b) is cleaner — the stdlib attacking action doesn't inspect `combatResult` directly, only `attackResult`.

### Changes

**`packages/stdlib/src/combat/combat-service.ts`:**
- Remove everything except `findWieldedWeapon()` and its types
- Rename file to `weapon-utils.ts` for clarity

**`packages/stdlib/src/combat/combat-messages.ts`:**
- Delete (moved to basic-combat)

**`packages/stdlib/src/actions/standard/attacking/attacking-data.ts`:**
- Change `combatResult: CombatResult | undefined` → `combatResult: unknown` in `AttackingSharedData`
- Remove `CombatResult` import

**`packages/stdlib/src/combat/index.ts`:**
- Export only from `./weapon-utils`

**`packages/stdlib/src/index.ts`:**
- Keep `export * from './combat'` (now only exports `findWieldedWeapon`)

## Step 5: Create Dungeo melee NPC resolver

**New file:** `stories/dungeo/src/combat/melee-npc-attack.ts`

Function: `meleeNpcResolver(npc, target, world, random): ISemanticEvent[]`

### Gotcha log

1. **Double inventory drop on thief death.** The melee interceptor (PC→NPC) calls `combatant.kill()` then runs its own inventory-drop loop. The thief's death handler ALSO drops inventory. This works by accident because the thief entity is removed by the death handler before the interceptor's loop runs, so `getContents()` returns empty. The NPC resolver (NPC→PC) handles **hero** death, not villain death, so this particular issue doesn't apply here. But document the ordering dependency in the melee interceptor for future reference.

2. **NPC-vs-NPC not supported.** The resolver uses hero-specific functions (`fightStrength`, `applyVillainBlowToHero`). If target is not the player, these would produce garbage. Since dungeo NPCs only attack the player, this is fine. Add a guard: if `target` is not the player, return empty events (silent no-op).

3. **Stagger state check must happen before blow resolution.** If the villain is staggered, they skip their attack and recover. This is checked via `npc.attributes[MELEE_STATE.VILLAIN_STAGGERED]`. The resolver must check this FIRST and short-circuit with a recovery message.

### Implementation

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
- **KILLED**: Emit `if.event.death` with `target: player.id`
- **UNCONSCIOUS**: Hero death (MDL treats unconscious hero as dead) — also emit `if.event.death`
- **MISSED/HESITATE**: No effect

Returns `ISemanticEvent[]` with `game.message` event containing villain attack text.

Handle villain stagger: Check `npc.attributes[MELEE_STATE.VILLAIN_STAGGERED]`. If staggered, clear flag and emit recovery message instead of attacking.

Guard clause: If `target` is not the player entity, return `[]` (no-op).

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

### Gotcha log

- **Guard behavior without combat extension.** Stdlib's `guardBehavior` returns `{ type: 'attack' }` actions. After refactor, if no NpcCombatResolver is registered, `executeAttack()` emits a bare `npc.attacked` event with no damage — the NPC appears to attack but nothing happens. This is acceptable: a story using guard behavior should register a combat system. No stdlib code change needed, but worth documenting in basic-combat's README.
- **Interceptor registry throws on duplicate.** MeleeInterceptor and BasicCombatInterceptor both target `CombatantTrait` + `if.action.attacking`. Only one can be active. Dungeo's existing `hasActionInterceptor()` guard (line 475) prevents collision. Stories must choose one combat system, not both.

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

## Test updates required

These tests will break after the refactor and need updating:

| Test file | What breaks | Fix |
|-----------|-------------|-----|
| `packages/stdlib/tests/unit/combat/combat-service.test.ts` | Entire file — CombatService moved | **Move** to `packages/extensions/basic-combat/tests/`, update imports |
| `packages/stdlib/tests/unit/actions/attacking.test.ts` | Tests exercising CombatService fallback (combatant target, no interceptor) now get `violence_not_the_answer` block | Update to expect blocked result, or register basic-combat in test setup |
| `packages/stdlib/tests/unit/npc/npc-service.test.ts` | `executeAttack` without resolver now emits bare `npc.attacked` with no damage/death | Update to expect bare events, or register basic-combat resolver in test setup |

## Verification

```bash
# 1. Build everything
./build.sh -s dungeo

# 2. Run stdlib unit tests (expect some failures to fix)
pnpm --filter '@sharpee/stdlib' test

# 3. Run basic-combat tests
pnpm --filter '@sharpee/ext-basic-combat' test

# 4. Run Dungeo walkthroughs (melee handles both directions now)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# 5. Verify no Dungeo→basic-combat dependency
grep -r "ext-basic-combat\|basic-combat" stories/dungeo/src/
# Should return nothing
```
