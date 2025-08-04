# Prompt: Implement ADR-014 - AuthorModel for Unrestricted World Access

## Context
We are implementing ADR-014 to solve a problem discovered during unit testing. Currently, the WorldModel enforces physics rules that prevent placing items in closed containers, which makes world setup and testing difficult. We need to create an AuthorModel that bypasses these rules for world construction.

## Key Files to Reference
- `/decisions/adr-014-unrestricted-world-model-access.md` - The design decision
- `/decisions/adr-014-assessment.md` - Detailed analysis of the approach
- `/packages/world-model/tests/integration/container-hierarchies.test.ts` - The test that exposed the problem (see "should update visibility when opening/closing containers")
- `/packages/world-model/implementation-checklist-adr-014.md` - Implementation checklist

## Current Problem
In the container-hierarchies test, we have this workaround:
```typescript
const cabinet = createTestContainer(world, 'Cabinet');
const openableTrait = new OpenableTrait();
(openableTrait as any).isOpen = false;
cabinet.add(openableTrait);

const medicine = world.createEntity('Medicine', 'item');
world.moveEntity(medicine.id, cabinet.id); // This SHOULD fail but currently doesn't
```

The test only works because WorldModel doesn't properly enforce container rules yet. When we implement proper validation, this test setup will break.

## Implementation Plan

### 1. Create AuthorModel class that:
- Shares the same SpatialIndex and EntityStore instances with WorldModel
- Bypasses all validation rules
- Optionally records events with 'author:' prefix when recordEvent=true
- Provides unrestricted access for world building

### 2. Update the medicine cabinet test to use AuthorModel:
```typescript
// New approach using AuthorModel for setup
const author = new AuthorModel(world.getDataStore());
const cabinet = author.createEntity('Cabinet', 'container');
cabinet.add(new OpenableTrait({ isOpen: false }));
author.moveEntity(medicine.id, cabinet.id); // Works even though closed!
```

### 3. Key Design Decisions:
- AuthorModel and WorldModel share the same underlying data (SpatialIndex, EntityStore)
- Simple boolean flag for event recording: `moveEntity(id, target, recordEvent?: boolean)`
- Author events use 'author:' prefix to distinguish from gameplay events
- No validation or rule checking in AuthorModel

## Start by:
1. Creating `/packages/world-model/src/world/AuthorModel.ts`
2. Implementing basic methods: moveEntity, createEntity, removeEntity
3. Updating the problematic test to use AuthorModel
4. Ensuring both models share the same data store

## Success Criteria:
- Can place items in closed containers during setup
- No gameplay events generated unless explicitly requested
- Existing WorldModel behavior remains unchanged
- The medicine cabinet test works properly using AuthorModel

Let's begin implementing AuthorModel to solve the closed container problem discovered during testing.
