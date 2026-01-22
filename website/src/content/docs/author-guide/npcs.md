---
title: "NPCs"
description: "Creating non-player characters with behaviors and conversations"
section: "author-guide"
order: 4
---

# Non-Player Characters (NPCs)

NPCs are autonomous characters that can move, talk, fight, and react to player actions. They act during each turn after the player.

## NPC Architecture

NPCs are built from three components:

1. **Entity**: The NPC object with traits
2. **Behavior**: Logic that runs each turn
3. **Messages**: Text displayed for NPC actions

### Project Structure

```
src/npcs/
├── guard/
│   ├── index.ts           # Exports
│   ├── guard-entity.ts    # Entity creation
│   ├── guard-behavior.ts  # Turn logic
│   └── guard-messages.ts  # Message IDs
```

## Creating an NPC Entity

```typescript
import {
  WorldModel,
  EntityType,
  IdentityTrait,
  ActorTrait,
  NpcTrait,
  CombatantTrait
} from '@sharpee/world-model';

export function createGuard(world: WorldModel, roomId: string) {
  const guard = world.createEntity('guard', EntityType.ACTOR);

  // Identity - name and description
  guard.add(new IdentityTrait({
    name: 'burly guard',
    aliases: ['guard', 'soldier', 'warrior'],
    description: 'A burly guard in chain mail blocks your path.',
    properName: false,
    article: 'a'
  }));

  // Actor - marks as non-player
  guard.add(new ActorTrait({ isPlayer: false }));

  // NPC - behavior and state
  guard.add(new NpcTrait({
    behaviorId: 'guard',      // Which behavior to use
    isHostile: true,          // Will attack player
    canMove: false,           // Stationary guard
  }));

  // Combat stats (optional)
  guard.add(new CombatantTrait({
    health: 20,
    maxHealth: 20,
    skill: 40,
    baseDamage: 5,
    hostile: true,
    canRetaliate: true
  }));

  // Place in room
  world.moveEntity(guard.id, roomId);

  return guard;
}
```

## NpcTrait Properties

| Property | Type | Description |
|----------|------|-------------|
| `isAlive` | boolean | NPC is alive (default: true) |
| `isConscious` | boolean | NPC can act (default: true) |
| `isHostile` | boolean | Hostile to player (default: false) |
| `canMove` | boolean | Can move between rooms (default: false) |
| `behaviorId` | string | ID of registered behavior |
| `allowedRooms` | string[] | Rooms NPC can enter |
| `forbiddenRooms` | string[] | Rooms NPC cannot enter |
| `conversationState` | string | Current dialogue state |
| `knowledge` | object | What NPC knows |
| `goals` | string[] | NPC objectives |
| `customProperties` | object | Story-specific data |

## NPC Behaviors

Behaviors define what an NPC does each turn. Sharpee provides built-in behaviors you can use or extend.

### Built-in: Guard Behavior

Stationary NPC that blocks passage and fights:

```typescript
import { guardBehavior } from '@sharpee/stdlib';

// Guard automatically:
// - Attacks player each turn if hostile
// - Counterattacks when attacked
// - Emits blocking message when player enters room
```

### Built-in: Wanderer Behavior

NPC that moves randomly between rooms:

```typescript
import { createWandererBehavior } from '@sharpee/stdlib';

const wanderer = createWandererBehavior({
  moveChance: 0.3,      // 30% chance to move each turn
  announceEntry: true   // Announce when entering player's room
});
```

### Custom Behavior

Create story-specific behaviors:

```typescript
// src/npcs/merchant/merchant-behavior.ts
import { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import { MerchantMessages } from './merchant-messages';

export const merchantBehavior: NpcBehavior = {
  id: 'merchant',
  name: 'Merchant Behavior',

  // Called every turn
  onTurn(context: NpcContext): NpcAction[] {
    // Only act if player is in same room
    if (!context.playerVisible) {
      return [];
    }

    // Random chance to offer a deal
    if (context.random.chance(0.2)) {
      return [{
        type: 'emote',
        messageId: MerchantMessages.OFFERS_DEAL,
        data: { npcName: context.npc.name }
      }];
    }

    return [];
  },

  // Called when player enters NPC's room
  onPlayerEnters(context: NpcContext): NpcAction[] {
    return [{
      type: 'emote',
      messageId: MerchantMessages.GREETS_PLAYER,
      data: { npcName: context.npc.name }
    }];
  },

  // Called when NPC is attacked
  onAttacked(context: NpcContext, attacker): NpcAction[] {
    return [{
      type: 'emote',
      messageId: MerchantMessages.FLEES,
      data: { npcName: context.npc.name }
    }];
  }
};
```

### NpcContext

Behaviors receive context with useful information:

```typescript
interface NpcContext {
  npc: IFEntity;              // The NPC entity
  world: WorldModel;          // World access
  turn: number;               // Current turn number
  playerVisible: boolean;     // Is player in same room?
  npcLocation: string;        // NPC's current room ID
  npcInventory: IFEntity[];   // Items NPC is carrying
  random: RandomProvider;     // For random decisions

  // Helper methods
  getEntitiesInRoom(): IFEntity[];
  getAvailableExits(): Direction[];
}
```

### NPC Actions

Behaviors return arrays of actions:

```typescript
type NpcAction =
  | { type: 'move'; direction: Direction }
  | { type: 'take'; target: string }
  | { type: 'drop'; target: string }
  | { type: 'attack'; target: string }
  | { type: 'emote'; messageId: string; data?: object }
  | { type: 'speak'; messageId: string; data?: object };
```

## NPC Messages

Define message IDs for localization:

```typescript
// src/npcs/merchant/merchant-messages.ts
export const MerchantMessages = {
  GREETS_PLAYER: 'mystory.merchant.greets',
  OFFERS_DEAL: 'mystory.merchant.offers_deal',
  ACCEPTS_TRADE: 'mystory.merchant.accepts',
  REFUSES_TRADE: 'mystory.merchant.refuses',
  FLEES: 'mystory.merchant.flees'
} as const;
```

Provide text in your story's language extensions:

```typescript
// src/index.ts
getLanguageExtensions() {
  return {
    'mystory.merchant.greets': 'The merchant nods in greeting.',
    'mystory.merchant.offers_deal': '"I have rare goods, if you have coin..."',
    'mystory.merchant.accepts': '"A fair trade! Pleasure doing business."',
    'mystory.merchant.refuses': '"That price is an insult!"',
    'mystory.merchant.flees': 'The merchant flees in terror!'
  };
}
```

## Registering NPCs

Register behaviors and create entities in your story:

```typescript
// src/index.ts
import { Story } from '@sharpee/engine';
import { NpcService } from '@sharpee/stdlib';
import { merchantBehavior } from './npcs/merchant/merchant-behavior';
import { createMerchant } from './npcs/merchant/merchant-entity';

export class MyStory implements Story {
  initializeWorld(world: WorldModel): void {
    // Register custom behaviors
    NpcService.registerBehavior(merchantBehavior);

    // Create rooms...
    const market = createMarketSquare(world);

    // Create NPCs
    createMerchant(world, market.id);
  }
}
```

## Combat NPCs

For NPCs that fight, add `CombatantTrait`:

```typescript
guard.add(new CombatantTrait({
  health: 20,           // Current health
  maxHealth: 20,        // Maximum health
  skill: 40,            // Combat skill (higher = better)
  baseDamage: 5,        // Damage per hit
  armor: 1,             // Damage reduction
  hostile: true,        // Will attack player
  canRetaliate: true,   // Counterattacks when hit
  dropsInventory: true, // Drops items on death
  deathMessage: 'The guard collapses!'
}));
```

### Combat Behavior Example

```typescript
export const trollBehavior: NpcBehavior = {
  id: 'troll',
  name: 'Troll Behavior',

  onTurn(context: NpcContext): NpcAction[] {
    const combatant = context.npc.get(CombatantTrait);

    // Don't act if dead or unconscious
    if (!combatant?.isAlive || !combatant?.isConscious) {
      return [];
    }

    // Check if we have a weapon
    const hasWeapon = context.npcInventory.some(
      item => item.has(WeaponTrait)
    );

    if (!hasWeapon) {
      // Try to recover dropped weapon
      const axeInRoom = findWeaponInRoom(context);
      if (axeInRoom && context.random.chance(0.75)) {
        return [
          { type: 'take', target: axeInRoom },
          { type: 'emote', messageId: 'troll.recovers_weapon' }
        ];
      }
      // Cower without weapon
      return [{ type: 'emote', messageId: 'troll.cowers' }];
    }

    // Attack if hostile and player visible
    if (combatant.hostile && context.playerVisible) {
      const player = context.world.getPlayer();
      return [{ type: 'attack', target: player.id }];
    }

    return [];
  }
};
```

## Event Handlers

NPCs can react to game events:

```typescript
// In entity creation
(guard as any).on = {
  // When NPC dies
  'if.event.death': (event, world): ISemanticEvent[] => {
    // Unblock passage
    RoomBehavior.unblockExit(guardRoom, Direction.NORTH);

    // Award points
    const scoring = world.getCapability(StandardCapabilities.SCORING);
    scoring.scoreValue += 10;

    return [{
      type: 'game.message',
      data: { messageId: 'guard.passage_opens' }
    }];
  },

  // When something is given to NPC
  'if.event.given': (event, world): ISemanticEvent[] => {
    if (event.data.itemId === goldCoin.id) {
      // Accept bribe
      return [{
        type: 'game.message',
        data: { messageId: 'guard.accepts_bribe' }
      }];
    }
    return [];
  }
};
```

## NPC State Changes

Modify NPC state during gameplay:

```typescript
const npcTrait = npc.get(NpcTrait);

// Knock out (unconscious but alive)
npcTrait.knockOut();

// Wake up
npcTrait.wakeUp();

// Kill
npcTrait.kill();

// Change hostility
npcTrait.makeHostile();
npcTrait.makePassive();

// Track knowledge
npcTrait.setKnowledge('playerName', 'Adventurer');
if (npcTrait.knows('playerName')) {
  const name = npcTrait.getKnowledge('playerName');
}

// Goals
npcTrait.addGoal('guard_treasure');
npcTrait.removeGoal('guard_treasure');
if (npcTrait.hasGoal('guard_treasure')) { ... }
```

## Best Practices

1. **Separate concerns**: Entity creation, behavior, and messages in different files
2. **Use built-in behaviors**: Extend `guardBehavior` or `wandererBehavior` when possible
3. **Check NPC state**: Always verify `isAlive` and `isConscious` before acting
4. **Use message IDs**: Never hardcode English strings in behaviors
5. **Test NPC interactions**: Write transcripts for key NPC scenarios
6. **Document custom properties**: Define interfaces for `customProperties`
