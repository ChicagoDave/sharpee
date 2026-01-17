# Work Summary: Troll Combat Fixes (ISSUE-004, ISSUE-006)

**Date**: 2026-01-16
**Issues**:
- ISSUE-004: "kill troll" not recognized
- ISSUE-006: Troll doesn't attack player
**Status**: Fixed

## Problem 1: "kill troll" Not Recognized (ISSUE-004)

The parser only had `attack :target with :weapon` pattern. Simple attack commands like "kill troll", "attack troll", "fight troll" were not recognized.

### Solution

Added missing combat verb patterns to `packages/parser-en-us/src/grammar.ts`:

```typescript
// Simple attack patterns
grammar
  .forAction('if.action.attacking')
  .verbs(['attack', 'kill', 'fight', 'slay', 'murder', 'hit', 'strike'])
  .pattern(':target')
  .build();

// Attack with weapon patterns
grammar.define('kill :target with :weapon').mapsTo('if.action.attacking').withPriority(110).build();
grammar.define('hit :target with :weapon').mapsTo('if.action.attacking').withPriority(110).build();
grammar.define('strike :target with :weapon').mapsTo('if.action.attacking').withPriority(110).build();
```

## Problem 2: Troll Doesn't Attack Player (ISSUE-006)

The troll had:
- `behaviorId: 'guard'` in NpcTrait
- `hostile: true` in CombatantTrait

But `guardBehavior.onTurn()` did nothing - it was designed for passive guards that only counterattack.

### Solution

1. **Updated guardBehavior** (`packages/stdlib/src/npc/behaviors.ts`):
   - `onTurn`: Now attacks player if hostile, player visible, and NPC is alive/conscious
   - Uses CombatantTrait to check hostile status and consciousness

```typescript
onTurn(context: NpcContext): NpcAction[] {
  const combatant = context.npc.get(TraitType.COMBATANT) as CombatantTrait | undefined;
  if (combatant && (!combatant.isAlive || !combatant.isConscious)) {
    return [];
  }

  if (combatant?.hostile && context.playerVisible) {
    const player = context.world.getPlayer();
    if (player) {
      return [{ type: 'attack', target: player.id }];
    }
  }
  return [];
}
```

2. **Updated NpcService.executeAttack()** (`packages/stdlib/src/npc/npc-service.ts`):
   - Previously only emitted an `npc.attacked` event with no actual combat
   - Now uses `CombatService` to resolve attacks and deal actual damage
   - Applies combat results (damage, knockout, death) to the target
   - Emits death event if target is killed

## Files Changed

1. `packages/parser-en-us/src/grammar.ts` - Add attack/kill verb patterns
2. `packages/stdlib/src/npc/behaviors.ts` - guardBehavior attacks if hostile
3. `packages/stdlib/src/npc/npc-service.ts` - executeAttack uses CombatService

## Testing

Created `stories/dungeo/tests/transcripts/troll-combat.transcript` for integration testing.

## Reference: Fortran Source

The original Zork FIGHTD subroutine (timefnc.f:548-632) shows that villains attack every turn when:
1. Player is in same room as villain
2. Villain has FITEBT (fighting) flag set
3. Villain is awake (OCAPAC >= 0)

The TROLLP function (objects.f:2403-2478) handles troll-specific behavior including:
- 33% chance to start fighting on first encounter (FRSTQW check)
- Waking up when kicked/alarmed
- Taking/eating items thrown/given to it
