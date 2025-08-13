# Scope Systems Clarification

## Two Complementary Scope Systems

### 1. World-Model Scope System (Parser/Grammar)
**Location**: `packages/world-model/src/scope/`
**Purpose**: Determine what entities can be referenced in commands
**Used by**: Parser/Grammar engine for entity resolution

```typescript
// Example: Player types "GET MEDICINE"
// Parser asks: Is "medicine" in scope for resolution?
const inScope = world.evaluateScope(playerId);
// Returns: All entities that can be referenced, including medicine in closed cabinet
```

### 2. Stdlib Scope/Witness System (Perception/Knowledge)
**Location**: `packages/stdlib/src/scope/`
**Purpose**: Track sensory perception and actor knowledge
**Used by**: Game logic for NPC reactions, knowledge tracking

```typescript
// Example: Player takes crown
// Witness system asks: Who can see this happening?
const witnesses = witnessSystem.recordWitnesses({
  type: 'action',
  actorId: 'player',
  action: 'take',
  target: 'crown'
});
// Returns: NPCs who can SEE the action (using ScopeResolver.canSee)
```

## How They Work Together

```
Player Input: "TAKE CROWN"
    ↓
Parser uses World-Model Scope
- Is "crown" in scope for resolution? YES (even if in closed box)
- Resolve "crown" to entity ID
    ↓
Action Execution
- Can player actually take crown? (check physical constraints)
- Execute action if valid
    ↓
Witness System uses Stdlib Scope
- Who can SEE the player taking the crown?
- Update NPC knowledge based on perception
```

## Key Interfaces

### World-Model (Parser Resolution)
```typescript
interface ScopeRule {
  includeEntities: string[] | ((context) => string[]);
  forActions?: string[];  // Can be action-specific
  condition?: (context) => boolean;
}

// Used by:
world.evaluateScope(actorId, actionId?): string[]
world.getInScope(actorId): IFEntity[]
```

### Stdlib (Perception/Witnessing)
```typescript
interface ScopeResolver {
  canSee(actor: IFEntity, target: IFEntity): boolean;
  canHear(actor: IFEntity, target: IFEntity): boolean;
  canReach(actor: IFEntity, target: IFEntity): boolean;
  getVisible(actor: IFEntity): IFEntity[];
}

interface WitnessSystem {
  recordWitnesses(change: StateChange): WitnessRecord;
  getKnownEntities(actorId: string): EntityKnowledge[];
}
```

## Implementation Recommendation

1. **Keep World-Model scope inclusive** for parser resolution
2. **Implement ScopeResolver in stdlib** using VisibilityBehavior
3. **Wire them together** so witness system uses proper visibility

```typescript
// In stdlib scope-resolver.ts
class StandardScopeResolver implements ScopeResolver {
  canSee(actor: IFEntity, target: IFEntity): boolean {
    return VisibilityBehavior.canSee(actor, target, this.world);
  }
  
  getVisible(actor: IFEntity): IFEntity[] {
    return VisibilityBehavior.getVisible(actor, this.world);
  }
}
```

## No Wire Crossing!

These systems are designed to work together:
- World-Model scope = "what can be named"
- Stdlib scope = "what can be sensed"
- Witness system = "who knows what"

The confusion came from world-model's `getVisible()` using parser scope instead of perception scope.