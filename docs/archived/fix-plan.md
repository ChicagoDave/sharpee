# Test Failure Fix Plan

## Summary of Issues

1. **EntityType in Attributes**: Tests expect empty attributes but we're now storing entityType
2. **Physics Enforcement**: Tests trying to move items into closed containers fail with WorldModel
3. **Visibility System**: Items in containers not being properly included in scope/visibility
4. **Old API Usage**: Some tests using deprecated createEntity(id, name) signature

## Fixes Applied

### 1. Updated WorldModel and AuthorModel entity creation
- Both now pass entityType in attributes during construction
- This ensures consistency across all entity creation paths

### 2. Updated Tests to Use AuthorModel
- `container-visibility-fix.test.ts` - Use AuthorModel for setup
- `trait-combinations.test.ts` - Use AuthorModel for placing items in locked/closed containers
- `minimal-visibility.test.ts` - Fixed to use new createEntity(name, type) signature

### 3. Fixed entity-system-updates test
- Updated test for mixed old/new entities to simulate loading old saves properly

## Remaining Issues to Fix

### 1. Integration Tests
- `container-hierarchies.test.ts` - Update to use AuthorModel where needed
- `room-navigation.test.ts` - Check for physics violations
- `visibility-chains.test.ts` - Update for AuthorModel usage

### 2. Unit Tests  
- Check if any unit tests are trying to violate physics rules
- Update test expectations for entityType in attributes

### 3. Visibility/Scope Logic
- Debug why items in containers aren't showing in scope
- Verify getAllContents recursive functionality
- Check VisibilityBehavior logic for containers

## Next Steps

1. Run tests again to see current state
2. Fix remaining test failures one by one
3. Verify all tests pass
4. Document any design decisions or changes
