# Scope and Trait Overlap Analysis

## Current Situation

We have overlapping responsibilities between WorldModel and stdlib's scope system:

### WorldModel Scope Logic
1. **VisibilityBehavior** - Full implementation for determining what entities can see
2. **canMoveEntity** - Enforces physical rules (e.g., can't put items in closed containers)
3. **ScopeService** - Stub that always returns true
4. **getVisible/getInScope** - Methods that use VisibilityBehavior

### Stdlib Scope System
1. **StandardScopeResolver** - Comprehensive visibility/reachability rules
2. **WitnessSystem** - Knowledge tracking
3. **CommandValidator** - Uses scope for entity resolution
4. **Actions** - Individual actions check scope requirements

## Problems

1. **Testing Challenges**: WorldModel prevents setting up test scenarios (e.g., items in closed containers)
2. **Duplicate Logic**: Both systems implement visibility rules
3. **Unclear Authority**: Which system should be the source of truth?
4. **Maintenance Burden**: Changes need to be made in multiple places

## Possible Solutions

### Option 1: Use AuthorModel for Test Setup
- AuthorModel bypasses WorldModel's rules
- Allows creating "impossible" scenarios for testing
- Keeps both systems intact

### Option 2: WorldModel Delegates to Stdlib
- WorldModel's visibility methods call stdlib's ScopeResolver
- Single source of truth for scope logic
- Requires WorldModel to depend on stdlib

### Option 3: Remove WorldModel's Scope Logic
- Move all scope logic to stdlib
- WorldModel becomes pure data storage
- Most invasive change but cleanest separation

### Option 4: Separate Physical vs Perceptual Rules
- WorldModel enforces physical possibility (can items fit?)
- Stdlib handles perception (can you see/reach it?)
- Clear separation of concerns

## Immediate Solution

For now, we'll work within WorldModel's constraints:
1. Open containers before adding items in tests
2. Close them after setup is complete
3. Document this pattern for future tests