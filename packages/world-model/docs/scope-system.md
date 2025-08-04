# Scope System Documentation

The scope system in the World Model provides a flexible, rule-based approach to determining which entities are available to an actor in different contexts. This replaces the previous hard-coded visibility methods with a powerful, extensible system.

## Overview

The scope system consists of three main components:

1. **ScopeRule** - Defines what entities should be in scope under specific conditions
2. **ScopeRegistry** - Manages and indexes all scope rules
3. **ScopeEvaluator** - Evaluates rules to determine final scope

## Core Concepts

### Scope Rules

A scope rule determines which entities are included in scope based on:
- Actor's location
- Action being performed
- Custom conditions
- Dynamic entity inclusion

```typescript
interface ScopeRule {
  id: string;                          // Unique identifier
  fromLocations: string[] | '*';       // Where rule applies
  includeEntities: string[] | Function; // What to include
  includeLocations?: string[];         // Additional locations to include
  forActions?: string[] | '*';         // Which actions this applies to
  condition?: Function;                // When rule applies
  message?: string | Function;         // Optional message
  priority?: number;                   // Rule priority (higher = first)
  enabled?: boolean;                   // Enable/disable rule
  source?: string;                     // Rule source (core/story/etc)
}
```

### Rule Evaluation

Rules are evaluated in priority order (highest first). All rules whose conditions are met contribute entities to the final scope. This is an **additive** system - entities from all matching rules are combined.

## Basic Usage

### Adding a Simple Rule

```typescript
// Make entities in adjacent rooms visible
world.addScopeRule({
  id: 'see_adjacent',
  fromLocations: '*',
  includeLocations: ['room2'],
  condition: (context) => context.currentLocation === 'room1',
  priority: 75
});
```

### Dynamic Entity Inclusion

```typescript
// Include entities based on conditions
world.addScopeRule({
  id: 'light_visibility',
  fromLocations: '*',
  includeEntities: (context) => {
    const room = context.world.getEntity(context.currentLocation);
    if (room?.get('room')?.isDark) {
      // In dark room, only see light sources
      return context.world.getContents(context.currentLocation)
        .filter(e => e.has('lightSource'))
        .map(e => e.id);
    }
    return [];
  },
  priority: 100
});
```

### Action-Specific Rules

```typescript
// Different scope for different actions
world.addScopeRule({
  id: 'hearing_sounds',
  fromLocations: '*',
  includeEntities: (context) => {
    // Include sounds from adjacent rooms
    const adjacent = context.world.getStateValue('adjacent_rooms');
    const results = [];
    for (const roomId of adjacent[context.currentLocation] || []) {
      const contents = context.world.getContents(roomId);
      results.push(...contents
        .filter(e => context.world.getStateValue(`${e.id}_making_sound`))
        .map(e => e.id)
      );
    }
    return results;
  },
  forActions: ['listening', 'hearing'],
  priority: 80
});
```

## Common Patterns

### 1. Window/Portal Visibility

Allow seeing through openings into other locations:

```typescript
const windowRule: ScopeRule = {
  id: 'window_view',
  fromLocations: [livingRoom.id],
  includeLocations: [garden.id],
  forActions: ['looking', 'examining'],
  condition: (context) => {
    const window = context.world.getEntity('window');
    return window?.get('openable')?.isOpen === true;
  },
  message: 'You can see through the window.',
  priority: 75
};
```

### 2. Darkness and Light

Handle visibility in dark areas:

```typescript
const darknessRule: ScopeRule = {
  id: 'darkness_visibility',
  fromLocations: '*',
  includeEntities: (context) => {
    const location = context.world.getEntity(context.currentLocation);
    const isDark = location?.get('room')?.isDark;
    
    if (!isDark) return []; // Let default rules handle lit rooms
    
    // Check for light sources
    const hasLight = context.world.getContents(context.actorId)
      .some(e => e.get('lightSource')?.isLit);
    
    if (hasLight) return []; // Let default rules handle
    
    // In darkness without light, only see the room
    return [context.currentLocation];
  },
  condition: (context) => {
    const room = context.world.getEntity(context.currentLocation);
    return room?.get('room')?.isDark === true;
  },
  priority: 200 // High priority to override defaults
};
```

### 3. Sound Propagation

Allow hearing sounds from other locations:

```typescript
const soundRule: ScopeRule = {
  id: 'sound_travel',
  fromLocations: '*',
  includeEntities: (context) => {
    const results = [];
    const adjacentRooms = context.world.getStateValue('adjacent_rooms');
    
    if (adjacentRooms?.[context.currentLocation]) {
      for (const roomId of adjacentRooms[context.currentLocation]) {
        const contents = context.world.getContents(roomId);
        for (const item of contents) {
          if (context.world.getStateValue(`${item.id}_making_sound`)) {
            results.push(item.id);
          }
        }
      }
    }
    
    return results;
  },
  forActions: ['listening', 'hearing'],
  message: (entityId) => `You can hear the ${entityId} from nearby.`,
  priority: 75
};
```

### 4. Magical Sight

Implement special vision abilities:

```typescript
const trueSightRule: ScopeRule = {
  id: 'true_sight',
  fromLocations: '*',
  includeEntities: (context) => {
    if (!context.world.getStateValue(`${context.actorId}_true_sight`)) {
      return [];
    }
    
    // See all invisible objects
    return context.world.getContents(context.currentLocation)
      .filter(e => context.world.getStateValue(`${e.id}_invisible`))
      .map(e => e.id);
  },
  forActions: ['looking', 'examining'],
  message: 'Your magical sight reveals hidden things!',
  priority: 80
};
```

### 5. Container Contents

See inside containers based on state:

```typescript
const containerRule: ScopeRule = {
  id: 'container_contents',
  fromLocations: '*',
  includeEntities: (context) => {
    const results = [];
    const contents = context.world.getContents(context.currentLocation);
    
    for (const container of contents) {
      if (container.has('container')) {
        const openable = container.get('openable');
        
        // Include contents if container is open or transparent
        if (!openable || openable.isOpen || container.get('container')?.isTransparent) {
          const containerContents = context.world.getContents(container.id);
          results.push(...containerContents.map(e => e.id));
        }
      }
    }
    
    return results;
  },
  priority: 60
};
```

## Advanced Features

### Rule Priorities

Rules are evaluated in priority order:
- 200+ : Override rules (darkness, special conditions)
- 100-199 : Enhanced visibility (magic sight, special abilities)
- 50-99 : Standard rules (default visibility, containers)
- 0-49 : Low priority additions

### Conditional Rules

Rules can have complex conditions:

```typescript
{
  condition: (context) => {
    const actor = context.world.getEntity(context.actorId);
    const location = context.world.getEntity(context.currentLocation);
    
    // Only applies if actor has special ability AND location allows it
    return actor?.getStateValue('has_xray_vision') && 
           !location?.getStateValue('blocks_xray');
  }
}
```

### Performance Optimization

The scope system supports caching:

```typescript
const result = scopeEvaluator.evaluate(context, {
  cache: true,           // Enable caching
  maxRules: 10,         // Limit rules evaluated
  ruleFilter: (rule) => rule.priority > 50  // Filter rules
});
```

## Migration from Old System

### Before (Hard-coded)
```typescript
getVisible(actorId: string): Entity[] {
  const location = this.getLocation(actorId);
  const contents = this.getContents(location);
  // Hard-coded visibility logic
  return contents.filter(e => !e.isInvisible);
}
```

### After (Rule-based)
```typescript
// Define visibility rules
world.addScopeRule({
  id: 'default_visibility',
  fromLocations: '*',
  includeEntities: (context) => {
    const contents = context.world.getContents(context.currentLocation);
    return contents
      .filter(e => !context.world.getStateValue(`${e.id}_invisible`))
      .map(e => e.id);
  },
  priority: 50
});

// Use the scope system
const visible = world.getVisible(actorId); // Now uses rules
```

## Best Practices

1. **Use Clear Rule IDs**: Make rule IDs descriptive of their purpose
2. **Set Appropriate Priorities**: Higher priority for override rules
3. **Keep Conditions Simple**: Complex logic in includeEntities, not condition
4. **Action Specificity**: Use forActions to limit rule application
5. **Additive Design**: Rules add entities, they don't remove them
6. **Performance**: Use location-specific rules when possible
7. **Debugging**: Use the debug option to see which rules applied

## Debugging Scope Issues

```typescript
// Get detailed scope information
const details = world.getScopeWithDetails(context);
console.log('Entities in scope:', details.entities);
console.log('Rules applied:', details.ruleDetails);

// Check specific entity
const inScope = world.isEntityInScope(entityId, context);
console.log(`Entity ${entityId} in scope:`, inScope);

// Evaluate with debug info
const result = scopeEvaluator.evaluate(context, { debug: true });
console.log('Applied rules:', result.appliedRules);
console.log('Skipped rules:', result.skippedRules);
```

## Integration with Story System

Story-specific rules can override or extend core rules:

```typescript
// In story initialization
storyGrammar.definePattern('look through telescope')
  .withScopeRule({
    id: 'telescope_view',
    fromLocations: ['observatory'],
    includeLocations: ['distant_mountains', 'night_sky'],
    condition: (context) => {
      const telescope = context.world.getEntity('telescope');
      return telescope?.getStateValue('focused') === true;
    },
    priority: 90
  });
```

## Summary

The scope system provides a powerful, flexible way to determine entity availability. By combining multiple rules with different priorities and conditions, complex visibility and interaction scenarios can be implemented without modifying core code. The additive nature of rules makes it easy to extend functionality while maintaining compatibility.