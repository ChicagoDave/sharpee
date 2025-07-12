# Fix UpdateEntity Build Issues Checklist

## Overview
This checklist addresses the immediate build failures caused by missing `updateEntity` method and related type issues. This work is separate from Phase 3.7 but was discovered during that refactoring.

## Decision Summary
- **Traits are mutable** by design for dynamic entity creation
- Add `updateEntity` as a simple wrapper for convenience
- Event handlers should use direct mutation patterns
- This aligns with the vision of runtime entity creation

## Step 1: Add updateEntity to WorldModel Interface ✓

**File:** `packages/world-model/src/world/WorldModel.interface.ts`

Add to the WorldModel interface:
```typescript
// Entity Management section
updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;
```

## Step 2: Implement updateEntity in WorldModelImpl ✓

**File:** `packages/world-model/src/world/WorldModel.ts`

Add the implementation:
```typescript
updateEntity(entityId: string, updater: (entity: IFEntity) => void): void {
  const entity = this.getEntity(entityId);
  if (!entity) {
    if (this.config.strictMode) {
      throw new Error(`Cannot update non-existent entity: ${entityId}`);
    }
    return;
  }
  
  // Call the updater - entity is mutable so changes happen in place
  updater(entity);
  
  // Future: Could emit change events here for reactive systems
  // this.emitChange({ type: 'entity-updated', entityId });
}
```

## Step 3: Fix Type Annotations in Event Handlers ✓

**File:** `packages/event-processor/src/handlers/movement.ts`

Update all arrow functions to have typed parameters:
```typescript
// Change:
world.updateEntity(target, (entity) => {

// To:
world.updateEntity(target, (entity: IFEntity) => {
```

Do this for all occurrences in the file.

**File:** `packages/event-processor/src/handlers/state-change.ts`

Same type annotation fixes:
```typescript
world.updateEntity(target, (entity: IFEntity) => {
```

## Step 4: Fix Direct Trait Mutations ✓

The event handlers are creating new trait instances unnecessarily. Update them to use direct mutation:

**Example in movement.ts:**
```typescript
// Current (unnecessary new instance):
world.updateEntity(target, (entity: IFEntity) => {
  const wearableTrait = entity.get(TraitType.WEARABLE) as WearableTrait;
  if (wearableTrait?.worn) {
    entity.add(new WearableTrait({ ...wearableTrait, worn: false }));
  }
  return entity;  // Remove this return
});

// Better (direct mutation):
world.updateEntity(target, (entity: IFEntity) => {
  const wearableTrait = entity.get(TraitType.WEARABLE) as WearableTrait;
  if (wearableTrait?.worn) {
    wearableTrait.worn = false;
  }
});
```

## Step 5: Fix Missing Exports ✓

**File:** `packages/stdlib/src/messages/message-keys.ts`

Check if this file exists and exports the expected functions. If not, they might be in message-resolver.ts and need to be re-exported:

```typescript
export { getMessage, messageResolver } from './message-resolver';
```

## Step 6: Fix PartOfSpeech Type ✓

**File:** `packages/stdlib/src/parser/vocabulary-types.ts`

Add 'preposition' to the PartOfSpeech type:
```typescript
export type PartOfSpeech = 
  | 'noun' 
  | 'verb' 
  | 'adjective' 
  | 'adverb' 
  | 'preposition'  // Add this
  | 'article' 
  | 'conjunction';
```

## Step 7: Remove Unnecessary SystemEvent Imports ✓

Some files are trying to import SystemEvent from modules that don't export it. Fix the imports to come from the correct location.

## Step 8: Build and Test ⏳

```bash
# Clean build to ensure fresh start
npm run clean
npm run build

# If successful, run tests
npm test
```

## Step 9: Document the Pattern ☐

Add a comment in WorldModel.interface.ts explaining the pattern:

```typescript
/**
 * Update an entity using a mutation function.
 * 
 * Note: Entities and traits are mutable by design to support dynamic
 * entity creation at runtime. The updater function receives the entity
 * and can modify its traits directly:
 * 
 * @example
 * world.updateEntity('kitchen', entity => {
 *   entity.get(TraitType.ROOM).description = "A messy kitchen";
 *   entity.attributes.messLevel = 5;
 * });
 * 
 * @param entityId - The ID of the entity to update
 * @param updater - Function that mutates the entity
 */
updateEntity(entityId: string, updater: (entity: IFEntity) => void): void;
```

## Success Criteria

- [ ] Build completes without errors
- [ ] Event processor handlers work correctly
- [ ] Tests pass (if any exist for these components)
- [ ] No TypeScript errors

## Next Steps After This

Once the build is fixed:
1. Complete Phase 3.7 steps 9-10 (final testing and cleanup)
2. Move to Phase 5: Update Engine with three-phase command processing
3. Create integration tests for the full pipeline

## Notes

- This is a tactical fix to unblock the build
- The deeper architectural cleanup (Phase 3.7) should still be completed
- Consider adding a style guide about mutable vs immutable patterns
- Future: Could add change detection/reactive updates to updateEntity