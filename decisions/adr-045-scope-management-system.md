# ADR-045: Scope Management System

Date: 2024-08-02
Status: Proposed

## Context

Interactive fiction requires sophisticated scope management to determine which entities are available for interaction in different contexts. Currently, scope is implicitly handled through location containment, but this doesn't support:

1. Seeing entities in other locations (observatory viewing a bulldozer)
2. Action-specific scope rules (can hear but not see something)
3. Special visibility rules (darkness, fog, windows)
4. Story-specific scope extensions

The grammar rules engine (ADR-044) needs a robust scope system to resolve entity references in parsed commands.

## Decision Drivers

1. **Stdlib orientation** - Must use entity IDs for all resolution
2. **Flexibility** - Support complex visibility rules
3. **Performance** - Efficient scope calculation
4. **Author-friendly** - Easy to use in Forge
5. **Extensibility** - Stories can add custom rules

## Current State

Scope is currently determined by:
- Location containment hierarchy
- Hard-coded "visible" and "touchable" calculations
- No support for cross-location visibility
- No action-specific scope

## Proposed Solution

A three-layer scope system:

### 1. Stdlib Layer - Core Scope Rules

```typescript
interface ScopeRule {
  id: string;
  fromLocations: string[] | '*';  // Entity IDs or wildcard
  includeEntities: string[] | ((context: ScopeContext) => string[]);
  includeLocations?: string[];     // Make other locations visible
  forActions?: string[] | '*';     // Action-specific scope
  condition?: (context: ScopeContext) => boolean;
  message?: string | ((entity: string, action: string) => string);
}

interface ScopeContext {
  world: WorldModel;
  actorId: string;
  actionId?: string;
  currentLocation: string;
}

// Example: Observatory can see bulldozer
const observatoryRule: ScopeRule = {
  id: 'observatory_view',
  fromLocations: ['observatory'],
  includeEntities: ['bulldozer', 'mountain'],
  forActions: ['examining', 'looking'],
  message: 'You can see it from here with the telescope.'
};

// Example: Darkness limits scope
const darknessRule: ScopeRule = {
  id: 'darkness_scope',
  fromLocations: '*',
  includeEntities: (ctx) => {
    const location = ctx.world.getEntity(ctx.currentLocation);
    if (location?.properties?.dark && !hasLight(ctx)) {
      return ctx.world.getContainedEntities(ctx.actorId);
    }
    return []; // No restriction
  },
  condition: (ctx) => {
    const location = ctx.world.getEntity(ctx.currentLocation);
    return location?.properties?.dark === true;
  }
};
```

### 2. Parser Integration

The grammar rules engine uses scope constraints that compile to scope rules:

```typescript
grammar
  .define('look at|examine :target')
  .where('target', scope => scope
    .visible()                    // Standard visibility
    .orRule('observatory_view')   // Include rule by ID
    .orExplicitly(['painting'])   // Force include by ID
  )
  .mapsTo('examining');

// Compiles to:
const examineScope: ScopeRule = {
  id: 'examine_target_scope',
  fromLocations: '*',
  includeEntities: (ctx) => {
    const visible = getVisibleEntities(ctx);
    const fromRule = evaluateRule('observatory_view', ctx);
    const explicit = ['painting'];
    return [...visible, ...fromRule, ...explicit];
  },
  forActions: ['examining']
};
```

### 3. Forge Simplification

Forge provides author-friendly APIs that compile to scope rules:

```javascript
// Forge API
location('observatory')
  .canSee('bulldozer', 'mountain')
  .when('looking', 'examining');

// Compiles to stdlib scope rule with entity IDs
```

## Scope Evaluation Flow

1. **Collect applicable rules** - Based on current location and action
2. **Evaluate conditions** - Filter rules by their conditions
3. **Build scope set** - Union of all included entities
4. **Apply constraints** - Grammar-specific filtering
5. **Return entity IDs** - Always work with IDs, not objects

## Implementation Plan

### Phase 1: Core System
1. Define ScopeRule interface in world-model
2. Add ScopeRegistry to manage rules
3. Implement scope evaluation engine
4. Add to WorldModel API

### Phase 2: Parser Integration
1. Update grammar builder with scope constraints
2. Compile constraints to scope rules
3. Use scope during entity resolution

### Phase 3: Forge API
1. Design author-friendly scope APIs
2. Implement compilation to scope rules
3. Add debugging support

## Example Use Cases

```typescript
// Window visibility
scopeRules.add({
  id: 'window_view',
  fromLocations: ['living_room'],
  includeLocations: ['garden'],  // See into garden
  forActions: ['looking', 'examining'],
  condition: (ctx) => {
    const window = ctx.world.getEntity('window');
    return window?.properties?.open === true;
  }
});

// Hearing through walls
scopeRules.add({
  id: 'sound_travel',
  fromLocations: ['bedroom'],
  includeEntities: (ctx) => {
    return ctx.world.query({
      location: 'kitchen',
      property: 'noisy',
      value: true
    });
  },
  forActions: ['listening'],
  message: 'You can hear it from the next room.'
});

// Magic scrying
scopeRules.add({
  id: 'crystal_ball',
  fromLocations: '*',
  includeEntities: (ctx) => {
    const actor = ctx.world.getEntity(ctx.actorId);
    if (actor?.hasInInventory('crystal_ball')) {
      return ctx.world.query({ property: 'magicallyVisible' });
    }
    return [];
  },
  forActions: ['scrying', 'examining']
});
```

## Consequences

### Positive
- Flexible scope management
- Action-specific visibility
- Cross-location interactions
- Story extensibility
- Clear debugging via rules

### Negative
- Additional complexity
- Performance overhead for rule evaluation
- Learning curve for rule system

### Mitigation
- Rule caching and indexing
- Clear documentation
- Good defaults
- Platform events for debugging

## Decision

Implement the three-layer scope system with:
1. Stdlib scope rules using entity IDs
2. Parser integration via grammar builder
3. Simplified Forge APIs

This provides the flexibility needed for complex IF scenarios while maintaining the principle that all entity resolution uses IDs.

## References

- ADR-044: Parser and Vocabulary System Gaps
- Inform 7 scope rules for inspiration
- TADS 3 sense system