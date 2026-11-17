# Remove CombatService from Dungeo Combat Path

## Context

Two combat systems are active simultaneously:
- **CombatService** (stdlib): Generic skill-based hit/miss/damage. Hardcoded in `attacking.ts` (fallback) and `npc-service.ts` (ALL NPC attacks).
- **Melee system** (dungeo): Canonical MDL table-based combat with 9 outcome types (missed, stagger, wound, unconscious, killed, etc.)

The MeleeInterceptor handles hero->villain attacks via ADR-118 interceptors, but NPC counter-attacks bypass it entirely and use CombatService. Additionally, hero attacks produce **empty text output** (30 attacks generate no visible text, confirmed in verbose testing). The troll cannot be killed.

**Goal**: Make the melee system the ONLY combat logic for dungeo. No platform changes needed.

## Step 1: Debug and fix empty hero attack output

The melee interceptor's `postReport` emits `game.message` events with `text` field, which `handleGameMessage` (text-service) should render. But 30 attacks produce zero visible output.

**Investigation approach**: Add temporary `console.error` tracing to the built bundle's melee interceptor to confirm:
- Is `postExecute` being called?
- What `blowResult.outcome` is returned?
- Is `postReport` being called?
- What events does `report()` return?

**Known issue**: `npc-messages.ts:227` registers `MeleeMessages.HERO_ATTACK` as `''` (empty string). While `handleGameMessage` treats empty string as falsy (falls through to `data.text`), the registration might interact poorly elsewhere. Remove these empty registrations.

**Files**:
- `stories/dungeo/src/messages/npc-messages.ts` - Remove empty HERO_ATTACK and VILLAIN_ATTACK registrations (line 227-228)
- `stories/dungeo/src/interceptors/melee-interceptor.ts` - Add tracing if needed, fix any issues found

## Step 2: Create villain-attacks-hero melee function

New file: `stories/dungeo/src/combat/melee-npc-attack.ts`

Function: `resolveVillainAttackOnHero(villain, world, random): ISemanticEvent[]`

Uses existing melee engine functions:
- `fightStrength()` for hero strength (from `melee.ts`)
- `villainStrength()` for villain effective strength (from `melee.ts`)
- `resolveBlow(villainStr, heroStr, false, ...)` - villain attacking hero (from `melee.ts`)
- `applyVillainBlowToHero()` for wound calculation (from `melee.ts`)
- `isHeroDeadFromWounds()` for death check (from `melee.ts`)
- `getVillainAttackMessage()` for canonical messages (from `melee-messages.ts`)
- `findWieldedWeapon()` for hero weapon (from `@sharpee/stdlib`)

Side effects to apply:
- **STAGGER**: Set `player.attributes[MELEE_STATE.STAGGERED] = true` (hero misses next attack turn)
- **LIGHT_WOUND**: Reduce `player.attributes[MELEE_STATE.WOUND_ADJUST]` by 1
- **SERIOUS_WOUND**: Reduce wound adjust by 2
- **LOSE_WEAPON**: Drop hero's weapon to room floor
- **KILLED**: Hero death (emit `if.event.death`)
- **UNCONSCIOUS**: Not applicable for hero in MDL (hero dies instead)
- **MISSED/HESITATE**: No effect

Returns `ISemanticEvent[]` with `game.message` event containing the villain attack text.

## Step 3: Update troll behavior to use melee for attacks

**File**: `stories/dungeo/src/npcs/troll/troll-behavior.ts`

Currently delegates attacks to `guardBehavior.onTurn()` which returns `{ type: 'attack', target: player.id }`. This goes to `npc-service.ts` `executeAttack()` which uses CombatService.

Change: When troll would attack (armed + hostile + player visible), return:
```typescript
{ type: 'custom', handler: () => resolveVillainAttackOnHero(context.npc, context.world, context.random) }
```

Also update `onAttacked()` to return custom melee action instead of `guardBehavior.onAttacked()`.

Handle villain stagger: check `villain.attributes[MELEE_STATE.VILLAIN_STAGGERED]` - if staggered, emit "The troll slowly regains his feet." and clear the flag instead of attacking.

## Step 4: Update thief behavior to use melee for attacks

**File**: `stories/dungeo/src/npcs/thief/thief-behavior.ts`

In `handleFightingState()` and `onAttacked()`, replace `{ type: 'attack', target: player.id }` with custom melee action.

The thief behavior already has complex state machine logic - only the attack action itself changes.

## Step 5: Verify and reduce attack count in wt-01

After fixing the melee system:
- Troll OSTRENGTH=2, sword penalty=1, effective DEF=1
- DEF1 table with ATT=2: 2/9 kill, 2/9 unconscious, 2/9 stagger, 3/9 miss
- Kill probability per effective attack: 44.4%
- 10 attacks: >99.7% kill probability

Reduce troll attacks from 30 back to a reasonable number (15-20). The current failure was caused by the melee interceptor not working, not by insufficient attacks.

## Step 6: Build and test

```bash
./build.sh -s dungeo
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

Verify:
- wt-01 troll fight succeeds (troll dies, `[ENSURES: not entity "troll" alive]` passes)
- wt-12 thief fight succeeds (thief dies, `[ENSURES: not entity "seedy-looking thief" alive]` passes)
- All 12 walkthroughs pass
- Combat produces visible text output

## Files Modified

| File | Change | Type |
|------|--------|------|
| `stories/dungeo/src/messages/npc-messages.ts` | Remove empty HERO_ATTACK/VILLAIN_ATTACK registrations | Story |
| `stories/dungeo/src/combat/melee-npc-attack.ts` | New: villain-attacks-hero melee function | Story |
| `stories/dungeo/src/combat/index.ts` | Export new function | Story |
| `stories/dungeo/src/npcs/troll/troll-behavior.ts` | Use custom melee actions for attacks | Story |
| `stories/dungeo/src/npcs/thief/thief-behavior.ts` | Use custom melee actions for attacks | Story |
| `stories/dungeo/src/interceptors/melee-interceptor.ts` | Fix any output issues found in Step 1 | Story |
| `stories/dungeo/walkthroughs/wt-01-get-torch-early.transcript` | Reduce attack count after fix | Story |

**No platform changes.** All modifications are in `stories/dungeo/`.
