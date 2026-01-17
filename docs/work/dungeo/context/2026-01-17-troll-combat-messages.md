# Troll Combat Messages Fix

**Date:** 2026-01-17
**Branch:** dungeo

## Problem

The troll was not attacking the player. Console logs showed `npc.attacked` events firing but with minimal data (just `npc` and `target` IDs), and no combat messages were being displayed.

## Root Causes

1. **Player missing CombatantTrait**: The player entity didn't have `CombatantTrait`, so the NPC service's `executeAttack` method skipped combat resolution (line 592 checks `if (target.has(TraitType.COMBATANT))`).

2. **Wrong message IDs**: The NPC service was using player-perspective message IDs (`combat.attack.hit`) which had templates like `"{You} {hit} {targetName}"` - not appropriate for NPC attacks.

3. **NPC messages not loaded**: The `npcLanguage` messages weren't being loaded by the language provider.

## Solution

### 1. Added CombatantTrait to Player (`stories/dungeo/src/index.ts`)

```typescript
player.add(new CombatantTrait({
  health: 100,
  maxHealth: 100,
  skill: 50,
  baseDamage: 1,
  armor: 0,
  hostile: false,
  canRetaliate: false
}));
```

### 2. NPC-specific Message IDs (`packages/stdlib/src/npc/npc-service.ts`)

Changed the NPC attack to use NPC-prefixed message IDs:

```typescript
const npcMessageId = combatResult.messageId.replace('combat.attack.', 'npc.combat.attack.');
```

### 3. Canonical Zork Messages (`packages/lang-en-us/src/npc/npc.ts`)

Added troll combat messages from the original MDL source (`docs/dungeon-81/mdlzork_810722/original_source/dung.355`):

```typescript
'npc.combat.attack.missed': "The troll swings his axe, but it misses.",
'npc.combat.attack.hit': "The axe gets you right in the side. Ouch!",
'npc.combat.attack.hit_light': "The flat of the troll's axe skins across your forearm.",
'npc.combat.attack.hit_heavy': "The troll hits you with a glancing blow, and you are momentarily stunned.",
'npc.combat.attack.knocked_out': "The flat of the troll's axe hits you delicately on the head, knocking you out.",
'npc.combat.attack.killed': "The troll lands a killing blow. You are dead.",
```

### 4. Load NPC Messages (`packages/lang-en-us/src/language-provider.ts`)

Added `loadNpcMessages()` method and call in constructor to register NPC messages.

## Canonical Source Reference

The original MDL Zork (1981) had 8 combat outcomes per villain with multiple message variants:

- 0: MISSED - attacker misses
- 1: UNCONSCIOUS - defender knocked out
- 2: KILLED - defender dead
- 3: LIGHT-WOUND - defender lightly wounded
- 4: SERIOUS-WOUND - defender seriously wounded
- 5: STAGGER - defender staggered
- 6: LOSE-WEAPON - defender loses weapon
- 7: HESITATE - miss on free swing (unconscious target)
- 8: SITTING-DUCK - kill unconscious target

Current implementation maps to simplified outcomes (missed, hit_light, hit_heavy, knocked_out, killed).

## Files Modified

- `stories/dungeo/src/index.ts` - Added CombatantTrait to player
- `packages/stdlib/src/npc/npc-service.ts` - Use NPC-specific message IDs
- `packages/lang-en-us/src/npc/npc.ts` - Added canonical troll combat messages
- `packages/lang-en-us/src/language-provider.ts` - Load NPC messages on init

## Future Improvements

- Add message randomization (pick from multiple variants per outcome)
- Add STAGGER and LOSE-WEAPON mechanics
- Support per-NPC message tables (thief has different messages than troll)
- Add weapon-specific message substitution (`{weapon}` placeholder)
