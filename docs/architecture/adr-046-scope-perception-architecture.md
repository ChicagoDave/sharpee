# ADR-046: Scope and Perception Architecture

Date: 2025-08-04
Status: Proposed
Supersedes: Clarifies ADR-045

## Context

During implementation of ADR-045 (Scope Management System), confusion arose about the relationship between:
1. Parser scope (what entities can be referenced in commands)
2. Perception scope (what entities can be sensed)
3. Visibility (what entities can be seen)
4. Witnessing (who observes events)

The world-model tests revealed that `getVisible()` and `getInScope()` have different expectations, leading to the realization that we have two complementary scope systems.

## Decision

We will maintain two separate but complementary scope systems:

### 1. Parser Scope System (World-Model)
**Location**: `packages/world-model/src/scope/`
**Purpose**: Determine what entities can be referenced in parsed commands
**Primary Use**: Parser entity resolution

```typescript
// When player types "GET MEDICINE"
const entitiesInScope = world.evaluateScope(playerId);
// Returns ALL entities that can be referenced, including:
// - Medicine in closed cabinet (player might know it's there)
// - Items in other rooms (if special scope rules apply)
```

### 2. Perception Scope System (Stdlib)
**Location**: `packages/stdlib/src/scope/`
**Purpose**: Determine what entities can be sensed through various channels
**Primary Use**: Witnessing, NPC reactions, knowledge tracking

```typescript
interface ScopeResolver {
  canSee(actor: IFEntity, target: IFEntity): boolean;
  canHear(actor: IFEntity, target: IFEntity): boolean;
  canReach(actor: IFEntity, target: IFEntity): boolean;
  getVisible(actor: IFEntity): IFEntity[];
}
```

## Architecture

### Layer Separation

```
┌─────────────────────────────────────┐
│         Game/Story Layer            │
│  (Uses witnessing for NPC behavior) │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│         Stdlib Layer                │
│  ┌─────────────────────────────┐   │
│  │   Witness System            │   │
│  │   - Tracks who sees what    │   │
│  │   - Updates NPC knowledge   │   │
│  └──────────┬──────────────────┘   │
│             │                       │
│  ┌──────────┴──────────────────┐   │
│  │   Perception Scope          │   │
│  │   - canSee/canHear/canReach │   │
│  │   - Uses VisibilityBehavior │   │
│  └─────────────────────────────┘   │
└──────────────┬──────────────────────┘
               │
┌──────────────┴──────────────────────┐
│         World-Model Layer           │
│  ┌─────────────────────────────┐   │
│  │   Parser Scope System       │   │
│  │   - Entity resolution       │   │
│  │   - Grammar constraints     │   │
│  └─────────────────────────────┘   │
│                                     │
│  ┌─────────────────────────────┐   │
│  │   VisibilityBehavior        │   │
│  │   - Line of sight           │   │
│  │   - Container transparency  │   │
│  └─────────────────────────────┘   │
└─────────────────────────────────────┘
```

### Method Mapping

World-Model methods will be specialized:

```typescript
class WorldModel {
  // For parser - uses scope rules (inclusive)
  getInScope(observerId: string): IFEntity[] {
    return this.evaluateScope(observerId);
  }
  
  // For perception - uses VisibilityBehavior (filtered)
  getVisible(observerId: string): IFEntity[] {
    const observer = this.getEntity(observerId);
    return VisibilityBehavior.getVisible(observer, this);
  }
  
  // For perception - uses VisibilityBehavior
  canSee(observerId: string, targetId: string): boolean {
    const observer = this.getEntity(observerId);
    const target = this.getEntity(targetId);
    return VisibilityBehavior.canSee(observer, target, this);
  }
}
```

## Examples

### Example 1: Medicine in Closed Cabinet

```typescript
// Setup: Closed cabinet contains medicine
const cabinet = world.getEntity('cabinet');
cabinet.getTrait(TraitType.OPENABLE).isOpen = false;

// Parser Scope (for command "GET MEDICINE")
const inScope = world.getInScope(playerId);
// ✓ Returns medicine - player can reference it

// Visual Perception
const visible = world.getVisible(playerId);
// ✗ Does NOT return medicine - can't see through closed cabinet

// Witness System
player.performAction('open', cabinet);
const witnesses = witnessSystem.recordWitnesses({
  type: 'action',
  actorId: playerId,
  action: 'open',
  target: cabinetId
});
// NPCs who can SEE the player will witness the action
```

### Example 2: Darkness

```typescript
// Parser Scope (for command "GET LAMP")
const inScope = world.getInScope(playerId);
// ✓ Returns lamp - even in darkness, can reference it

// Visual Perception
const visible = world.getVisible(playerId);
// ✗ Empty in darkness (unless player has light)

// Special scope rule for darkness
world.addScopeRule({
  id: 'darkness_limits',
  fromLocations: '*',
  includeEntities: (ctx) => {
    if (isDark(ctx.currentLocation) && !hasLight(ctx.actorId)) {
      // In darkness, can only reference carried items
      return world.getContents(ctx.actorId).map(e => e.id);
    }
    return null; // No restriction
  },
  forActions: ['taking', 'examining'], // Some actions affected
  priority: 200
});
```

## Benefits

1. **Clear Separation of Concerns**
   - Parser knows what can be named
   - Perception knows what can be sensed
   - Witnessing knows who observes what

2. **Flexible Game Design**
   - Can reference items you remember but can't see
   - NPCs react only to what they perceive
   - Special abilities can extend either system

3. **Backwards Compatible**
   - Existing tests expect this separation
   - VisibilityBehavior already implements perception correctly

## Migration Path

1. Update `WorldModel.getVisible()` and `canSee()` to use VisibilityBehavior
2. Keep `WorldModel.getInScope()` using scope rules
3. Implement stdlib ScopeResolver using VisibilityBehavior
4. Wire witness system to use ScopeResolver

## Decision Outcome

By maintaining two separate scope systems, we achieve:
- Accurate parser entity resolution (inclusive scope)
- Realistic perception modeling (filtered visibility)
- Proper witness determination for NPC reactions
- Clear architectural boundaries