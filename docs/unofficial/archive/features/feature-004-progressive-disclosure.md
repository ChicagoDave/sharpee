# Feature-004: Capability-Based Area Access

## Status
Proposed

## Context
Large Interactive Fiction games need to control player progression through content while maintaining a sense of open-world exploration. Traditional level-gating feels artificial and "gamey," while completely open worlds can overwhelm players or lead them to content they're not prepared for. Games need a more nuanced approach that guides players naturally while respecting their agency.

## Problem
- Hard level requirements ("You must be level 10") break immersion
- Locked doors everywhere feels contrived
- Players get frustrated when they can't access visible content
- No indication why an area is inaccessible or what's needed
- Players may miss important progression items and get stuck
- Difficulty in balancing linear narrative with open exploration
- New players wander into dangerous areas and have bad experiences

## Solution
Implement a capability-based access system that uses items, knowledge, abilities, and environmental conditions as natural gates:

```typescript
.area('caverns', CavernsModule, {
  connections: ['lake'],
  
  // Soft gate - warns but allows entry
  warnings: {
    level: { 
      min: 8, 
      message: 'caverns-dangerous-warning',
      type: 'danger'
    },
    missing: { 
      item: 'light-source', 
      message: 'caverns-dark-warning',
      type: 'equipment' 
    }
  },
  
  // Hard gate - prevents entry without
  requires: {
    any: [
      { item: 'glowing-crystal' },
      { ability: 'dark-vision' },
      { companion: 'torch-bearer' }
    ]
  },
  
  // Preview system
  preview: {
    enabled: true,
    locations: ['cavern-entrance'],
    distance: 1,  // How far in player can see
    description: 'You peer into the darkness...'
  },
  
  // Discovery hints
  hints: {
    'village-elder': 'caverns-location-hint',
    'ancient-map': 'caverns-entrance-marked',
    'local-rumors': 'caverns-treasure-rumor'
  }
});
```

### Natural Gate Types

```typescript
// Environmental gates
area.access()
  .requires({ 
    season: 'winter',  // Lake frozen
    reason: 'The lake must be frozen to walk across' 
  });

// Knowledge gates  
area.access()
  .requires({ 
    knowledge: 'ancient-password',
    reason: 'The door remains sealed without the password'
  });

// Social gates
area.access()
  .requires({
    reputation: { faction: 'nobles', min: 50 },
    reason: 'The guards won\'t let a commoner pass'
  });

// Multi-solution gates
area.access()
  .requires({
    any: [
      { item: 'palace-key' },
      { ability: 'lockpicking', level: 10 },
      { companion: 'palace-guard' },
      { quest: 'royal-invitation' }
    ],
    reason: 'The palace gates are locked'
  });
```

### Preview System
```typescript
// Let players see what they're missing
area.entrance('dark-cave')
  .preview(({ player, output }) => {
    output.add('cave-entrance-description');
    
    if (!player.has('light-source')) {
      output.add('cave-too-dark-to-enter');
      output.hint('maybe-find-light-source');
    } else {
      output.add('cave-lit-path-visible');
    }
  })
  .onAttemptEnter(({ player, output }) => {
    if (!player.has('light-source')) {
      output.add('stumble-in-darkness');
      player.takeDamage(5, 'bumping-into-walls');
      player.moveBack();
      return false;
    }
    return true;
  });
```

## Consequences

### Positive
- **Natural Progression**: Gates feel like part of the world
- **Player Understanding**: Clear feedback on what's needed
- **Multiple Solutions**: Players can find creative approaches
- **Exploration Rewarded**: Finding hints and previews is valuable
- **Soft Difficulty Curve**: Warnings guide without forcing
- **Replayability**: Different solutions on different playthroughs

### Negative
- **Design Complexity**: More work than simple locked doors
- **Potential Softlocks**: Players might miss required items
- **Balancing Challenge**: Multiple solutions harder to balance
- **Preview Spoilers**: Might reveal too much

### Neutral
- Changes how designers think about progression
- Encourages item/ability design that serves dual purposes
- May lead to "metroidvania" style design

## Implementation Notes

### Gate Evaluation
```typescript
class AreaAccessService {
  canAccess(area: Area, player: Player): AccessResult {
    const requirements = area.getAccessRequirements();
    
    // Check hard requirements
    if (requirements.requires) {
      const result = this.checkRequirements(requirements.requires, player);
      if (!result.success) {
        return {
          allowed: false,
          reason: result.reason,
          missing: result.missing,
          hints: this.getHints(result.missing)
        };
      }
    }
    
    // Check warnings (soft gates)
    const warnings = this.checkWarnings(requirements.warnings, player);
    
    return {
      allowed: true,
      warnings: warnings,
      confidence: this.calculateConfidence(player, area)
    };
  }
}
```

### Hint System Integration
```typescript
// Automatic hint generation
area.generateHints({
  // NPCs who might know about this area
  knowledgeable: ['elder', 'traveler', 'scholar'],
  
  // Items that might reference this area
  references: ['ancient-map', 'explorer-journal'],
  
  // How hints are revealed
  revelation: {
    gradual: true,  // More info over time
    requires: { reputation: 20 },  // Need trust
    context: 'dialogue.ask-about-areas'
  }
});
```

## Examples

### Equipment Gate
```typescript
area.access('underwater-temple')
  .requires({ 
    item: 'breathing-apparatus',
    reason: 'You need a way to breathe underwater'
  })
  .alternatives([
    { spell: 'water-breathing' },
    { transformation: 'merman' }
  ])
  .preview('The temple shimmers beneath the waves');
```

### Knowledge Gate
```typescript
area.access('secret-library')
  .requires({
    knowledge: 'library-location',
    reason: 'You don\'t know where the library is'
  })
  .hints({
    'bookshop-owner': { 
      requires: { reputation: 30 },
      provides: 'library-district-hint'
    },
    'stolen-map': {
      found: 'thief-hideout',
      provides: 'library-exact-location'
    }
  });
```

### Progressive Gate
```typescript
area.access('throne-room')
  .stages([
    {
      id: 'outer-gate',
      requires: { anyOf: ['guard-uniform', 'invitation'] }
    },
    {
      id: 'inner-gate',
      requires: { reputation: { nobles: 50 } }
    },
    {
      id: 'throne-approach',
      requires: { quest: 'royal-summons' }
    }
  ])
  .onPartialAccess(({ stage, player }) => {
    // Player can access up to their cleared stage
  });
```

## Related Patterns
- Feature-001: Area Module System (gates between areas)
- Feature-002: Quest Framework (quests unlock areas)
- Feature-003: Environmental Systems (seasonal gates)
- Feature-005: Shared Resources (items that unlock areas)

## Edge Cases
- Player sequence-breaks with unexpected solutions
- Multiple players in multiplayer reaching gates differently
- Time-sensitive gates (only open at night)
- Conflicting requirements (need item A which requires area B)

## Future Considerations
- Visual representation of locked/unlocked areas
- Community-sourced hints for stuck players
- Dynamic difficulty adjusting gates
- New Game+ with different gate configurations

## References
- Metroid's power-up gating
- Zelda's item-based progression
- Dark Souls' interconnected world with natural gates
- Hollow Knight's ability gates
- The Witness's knowledge gates
