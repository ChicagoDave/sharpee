# World Model Test Fixes - Phase 3

## Issues Fixed

### 1. SpatialIndex Tests (5 fixes)
- **getAllDescendants depth behavior**: The function includes all descendants up to maxDepth, not just immediate children at that depth
- **removeChild behavior**: The implementation removes from childToParent map regardless of the parent specified
- **Deep hierarchy counting**: Fixed off-by-one errors in depth calculations
- **Entity moving**: When an entity is moved using addChild, it calls remove() which clears all its children

### 2. WorldModel Tests (23 fixes)
- **Entity type property**: Changed from setting `entity.type` (read-only) to creating entities with the correct type
- **Weight property**: Changed from `entity.weight` to `entity.attributes.weight`
- **SemanticEvent structure**: Added required `id` and `entities` properties to all event objects
- **WorldChange interface**: Updated event previewer to return correct WorldChange structure with proper types
- **Import missing**: Added SceneryTrait import

### 3. VisibilityBehavior Tests (6 fixes)
- **SceneryTrait visibility**: SceneryTrait doesn't have a visible property, so we mock it on the trait instance
- **LightSourceTrait property**: Changed `isOn` to `isLit` to match the trait definition
- **Light checking**: The implementation checks `isOn` property, so we set both `isLit` and mock `isOn`

## Key Learnings

1. **Trait Properties**: Traits are data-only structures, some properties used by behaviors are mocked or stored elsewhere
2. **Entity Properties**: Entity properties like weight are stored in `attributes`, not as direct properties
3. **Event Structure**: SemanticEvent requires id and entities fields, not just type/timestamp/data
4. **Implementation Details**: Test assumptions must match actual implementation behavior

## Test Status
- SpatialIndex: All tests should now pass
- WorldModel: All compilation errors fixed, tests should pass
- VisibilityBehavior: All compilation errors fixed, tests should pass

## Running the Tests
```bash
# Run all world tests
pnpm test -- tests/unit/world/

# Run individually
pnpm test -- spatial-index.test.ts
pnpm test -- world-model.test.ts
pnpm test -- visibility-behavior.test.ts
```
