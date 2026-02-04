# Feature-005: Cross-Area Shared Resources

## Status
Proposed

## Context
In large Interactive Fiction games, certain game elements need to exist across multiple areas: traveling merchants, legendary items that can be found in different locations, global NPCs with their own schedules, and common game mechanics. Without a shared resource system, these elements get duplicated across areas, leading to inconsistencies and maintenance nightmares.

## Problem
- Duplicating NPC definitions across areas leads to inconsistent behavior
- Traveling NPCs require complex state synchronization between areas
- Common items have different stats or descriptions in different areas
- Shared mechanics (combat, magic) implemented differently per area
- Updates to shared elements require changes in multiple files
- No single source of truth for important game elements
- Memory waste from duplicate definitions
- Save/load complexity for elements that exist in multiple areas

## Solution
Implement a shared resource management system that allows defining elements once and referencing them from multiple areas:

```typescript
// In shared/npcs.ts
export const SharedNPCs = SharedModule.create('npcs')
  .define({
    'traveling-merchant': {
      identity: {
        name: 'Korvan the Merchant',
        description: 'A well-traveled merchant with goods from distant lands'
      },
      schedule: {
        monday: { area: 'city', location: 'market-square', time: '8:00-18:00' },
        tuesday: { area: 'city', location: 'market-square', time: '8:00-18:00' },
        wednesday: { area: 'lake', location: 'docks', time: '10:00-16:00' },
        thursday: { area: 'mountain', location: 'base-camp', time: '12:00-15:00' },
        friday: { area: 'castle', location: 'courtyard', time: '9:00-17:00' },
        weekend: { area: 'traveling', unavailable: true }
      },
      inventory: {
        source: 'merchant-goods',
        refresh: 'weekly',
        special: {
          condition: ({ player }) => player.reputation > 50,
          items: ['rare-merchant-goods']
        }
      },
      dialogue: {
        base: 'merchant-standard',
        extensions: {
          'city': 'merchant-city-gossip',
          'lake': 'merchant-lake-rumors',
          'mountain': 'merchant-mountain-tales'
        }
      },
      persistence: {
        trackAcrossAreas: true,
        saveState: ['inventory', 'disposition', 'questFlags']
      }
    },
    
    'mysterious-stranger': {
      identity: {
        name: '???',
        description: 'A cloaked figure who seems to appear when least expected'
      },
      appearances: {
        mode: 'triggered',
        conditions: [
          { quest: 'main-quest', stage: 'revelation', location: 'any-tavern' },
          { playerLevel: 10, probability: 0.1, location: 'any-crossroads' },
          { item: 'ancient-medallion', location: 'any-shrine' }
        ]
      }
    }
  });

// In area modules, reference shared NPCs
area.npc('traveling-merchant')
  .fromShared()
  .override({
    // Area-specific overrides
    location: 'lakeside-inn',  // Override for special event
    dialogue: {
      add: 'lake-festival-dialogue'  // Additional context
    }
  })
  .onArrive(({ npc, area }) => {
    area.announce('merchant-arrival');
  });
```

### Shared Items
```typescript
export const SharedItems = SharedModule.create('items')
  .define({
    'healing-potion': {
      type: 'consumable',
      weight: 0.5,
      value: 50,
      effect: { heal: 20 },
      description: 'A red potion that restores health',
      foundIn: ['any-shop', 'any-dungeon-chest'],
      rarity: 'common'
    },
    
    'legendary-sword-excalibur': {
      type: 'weapon',
      unique: true,  // Only one can exist
      damage: { min: 20, max: 30 },
      requirements: { strength: 15 },
      description: 'The legendary blade of kings',
      // Multiple possible locations
      locations: [
        { area: 'lake', spot: 'stone-in-water', condition: 'full-moon' },
        { area: 'castle', spot: 'throne-room', condition: 'king-defeated' },
        { area: 'caverns', spot: 'dragon-hoard', condition: 'dragon-slain' }
      ],
      onTake: ({ player, world }) => {
        world.broadcast('excalibur-claimed', { wielder: player.name });
      }
    }
  });
```

### Shared Mechanics
```typescript
export const CombatSystem = SharedModule.create('combat')
  .define({
    config: {
      damageCalculation: 'realistic',
      criticalHits: true,
      dodgeEnabled: true,
      blockEnabled: true
    },
    
    actions: {
      'attack': { 
        stamina: 10, 
        accuracy: ({ attacker }) => attacker.skill.combat * 0.8,
        damage: ({ attacker, weapon }) => weapon.damage + attacker.strength
      },
      'defend': {
        stamina: 5,
        reduction: ({ defender }) => defender.skill.defense * 0.5
      },
      'flee': {
        stamina: 15,
        success: ({ actor, enemy }) => actor.speed > enemy.speed * 0.7
      }
    },
    
    statusEffects: {
      'stunned': { duration: 2, prevents: ['attack', 'defend'] },
      'bleeding': { duration: 5, damage: 2 },
      'poisoned': { duration: 10, damage: 1 }
    }
  })
  .registerWith((area) => {
    // Automatically applied to all areas
    area.combat.use(this);
  });
```

### Shared Messages
```typescript
export const SharedMessages = SharedModule.create('messages')
  .define({
    // Common messages used across areas
    'item-too-heavy': 'That\'s too heavy for you to carry.',
    'inventory-full': 'You can\'t carry any more items.',
    'not-enough-gold': 'You don\'t have enough gold for that.',
    'combat-victory': 'You have defeated {enemy.name}!',
    'level-up': 'You\'ve gained a level! You are now level {player.level}.',
    
    // Traveling NPC messages
    'merchant-arrival': 'Korvan the Merchant has arrived at {location}.',
    'merchant-departure': 'The merchant packs up and heads to {destination}.',
    'merchant-closed': 'The merchant\'s shop is closed. Try again tomorrow.',
    
    // Shared item messages
    'unique-item-exists': 'The {item.name} has already been claimed.',
    'item-requirements-not-met': 'You need {requirements} to use this.'
  })
  .withFormatting({
    variables: true,  // Support {var} substitution
    markdown: true,   // Support **bold** and *italic*
    colors: true      // Support [red]text[/red]
  });
```

## Consequences

### Positive
- **Single Source of Truth**: Each shared element defined once
- **Consistency**: Same behavior across all areas
- **Easy Updates**: Change propagates everywhere automatically
- **Memory Efficient**: Single instance for shared elements
- **Cross-Area Features**: Traveling NPCs, global events work naturally
- **Maintainability**: Clear ownership of shared resources
- **Version Control**: Clean diffs when updating shared elements

### Negative
- **Coordination Required**: Teams must agree on shared element changes
- **Abstraction Complexity**: Another layer of indirection
- **Override Complexity**: Area-specific overrides can get confusing
- **Testing Overhead**: Shared elements need testing in all contexts
- **Coupling**: Areas become dependent on shared modules

### Neutral
- Encourages thinking about what should be global vs local
- May lead to over-engineering simple elements
- Requires clear documentation of shared interfaces

## Implementation Notes

### Resource Registry
```typescript
class SharedResourceRegistry {
  private resources: Map<string, SharedResource> = new Map();
  
  register(type: string, id: string, definition: any): void {
    const key = `${type}:${id}`;
    this.resources.set(key, {
      type,
      id,
      definition,
      references: new Set<string>()  // Track which areas use this
    });
  }
  
  get(type: string, id: string): any {
    const resource = this.resources.get(`${type}:${id}`);
    if (!resource) {
      throw new Error(`Shared resource not found: ${type}:${id}`);
    }
    return resource.definition;
  }
  
  instantiate(type: string, id: string, context: AreaContext): any {
    const definition = this.get(type, id);
    return this.factory.create(type, definition, context);
  }
}
```

### Traveling NPC Implementation
```typescript
class TravelingNPCService {
  private schedules: Map<string, NPCSchedule> = new Map();
  
  updateTime(currentTime: GameTime): void {
    for (const [npcId, schedule] of this.schedules) {
      const currentLocation = this.getCurrentLocation(npcId, currentTime);
      const npc = this.registry.get('npc', npcId);
      
      if (currentLocation.area !== npc.currentArea) {
        // NPC needs to travel
        this.initiateTravel(npcId, npc.currentArea, currentLocation.area);
      }
    }
  }
  
  private initiateTravel(npcId: string, from: string, to: string): void {
    // Remove from current area
    this.eventBus.emit({
      type: 'npc-departing',
      npcId,
      fromArea: from,
      toArea: to
    });
    
    // Add to destination area after travel time
    this.scheduler.schedule({
      delay: this.calculateTravelTime(from, to),
      action: () => {
        this.eventBus.emit({
          type: 'npc-arriving',
          npcId,
          area: to
        });
      }
    });
  }
}
```

### Override System
```typescript
interface OverrideOptions {
  // Replace completely
  replace?: any;
  
  // Merge with original
  merge?: {
    [key: string]: any;
  };
  
  // Add to collections
  add?: {
    dialogue?: string[];
    inventory?: string[];
    behaviors?: string[];
  };
  
  // Remove from collections
  remove?: {
    dialogue?: string[];
    inventory?: string[];
    behaviors?: string[];
  };
}
```

## Examples

### Global Quest Items
```typescript
SharedItems.define({
  'crown-fragment': {
    type: 'quest-item',
    unique: true,
    description: 'A piece of the shattered crown',
    variants: [
      { id: 'crown-fragment-1', foundIn: 'lake.sunken-palace' },
      { id: 'crown-fragment-2', foundIn: 'mountain.eagle-nest' },
      { id: 'crown-fragment-3', foundIn: 'caverns.deepest-vault' }
    ],
    onAllCollected: ({ player }) => {
      player.inventory.combine(['crown-fragment-1', 'crown-fragment-2', 'crown-fragment-3'])
        .into('restored-crown');
    }
  }
});
```

### Faction System
```typescript
SharedModule.create('factions')
  .define({
    'rebels': {
      name: 'The Free Coalition',
      baseReputation: 0,
      ranks: [
        { min: 0, title: 'Unknown' },
        { min: 20, title: 'Sympathizer' },
        { min: 50, title: 'Supporter' },
        { min: 100, title: 'Freedom Fighter' }
      ],
      benefits: {
        20: { shop: 'rebel-quartermaster' },
        50: { areas: ['rebel-hideout'] },
        100: { companion: 'rebel-champion' }
      }
    }
  });
```

### Magic Spells
```typescript
SharedModule.create('spells')
  .define({
    'fireball': {
      school: 'destruction',
      manaCost: 20,
      requirements: { intelligence: 12, spellbook: 'basic-destruction' },
      effect: {
        damage: { fire: '3d6' },
        area: 'small-radius',
        savingThrow: 'reflex'
      },
      description: 'Hurls a ball of fire at your enemies',
      foundIn: [
        { area: 'city', vendor: 'wizard-shop', price: 500 },
        { area: 'mountain', loot: 'wizard-tower', probability: 0.3 }
      ]
    }
  });
```

## Related Patterns
- Feature-001: Area Module System (areas reference shared resources)
- Feature-002: Quest Framework (shared quest items)
- Feature-006: Event-Based Communication (traveling NPC events)
- ADR-001: Event-Driven Architecture (shared resource changes are events)

## Edge Cases
- NPC scheduled to be in area that player hasn't unlocked
- Unique item already taken when player reaches alternate location
- Shared resource modified while NPC is traveling
- Save/load during NPC travel
- Conflicting overrides from multiple areas

## Future Considerations
- Visual editor for NPC schedules
- Automatic conflict detection for overrides
- Performance optimization for many traveling NPCs
- Dynamic resource loading based on player proximity
- Community-contributed shared resources

## References
- Elder Scrolls: Traveling merchants and shared NPCs
- Baldur's Gate: Global reputation systems
- World of Warcraft: Shared items and currencies
- The Witcher 3: Traveling merchants with schedules
