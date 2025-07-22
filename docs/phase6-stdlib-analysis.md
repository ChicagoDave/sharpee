# Phase 6 Analysis - Standard Library Updates

## Overview
Phase 6 involves checking the standard library (commands, actions, responses) for compatibility with the new ID system.

## Analysis Results

### Command Processing Flow
1. **Parser** → Produces ParsedCommand with text references
2. **Validator** → Resolves text to entities using scoring algorithm
3. **Actions** → Work with resolved entity objects (have IDs)
4. **Event Handlers** → Update world state using entity IDs
5. **Response Templates** → Generate text using entity names

### Key Findings

#### Command Validator (✅ Compatible)
- Located in `/packages/stdlib/src/validation/command-validator.ts`
- Uses `getEntityName(entity)` which returns `entity.name`
- Entity.name getter already uses displayName (from Phase 2)
- Scoring algorithm matches user input against entity names
- **No changes needed** - works correctly with new system

#### Action Handlers (✅ Compatible)
- Example: `/packages/stdlib/src/actions/standard/taking.ts`
- Receive ValidatedCommand with resolved entities
- Use `entity.id` for all world operations
- Use `entity.name` for any display purposes
- **No changes needed** - already use proper patterns

#### Response Templates (❓ Need to verify)
- Need to check where response text is generated
- Must ensure they use entity names, not IDs
- Should use `world.getName(id)` if they have an ID

### What Actually Needs Updating

1. **If any code directly creates entities with old signature** - Update to new signature
2. **If any code assumes specific ID formats** - Remove assumptions
3. **If response templates expose IDs** - Use names instead

### Implementation Status

Since the command system already properly separates:
- User-facing names (for input/output)
- Internal IDs (for state management)

The standard library appears to be largely compatible with the new ID system.

## Recommendations

1. **Search for createEntity calls** in stdlib to ensure new signature
2. **Verify response generation** doesn't expose IDs
3. **Test command execution** with new ID system
4. **Document the name/ID separation** for future developers

## Conclusion

Phase 6 may require minimal changes because the architecture already properly separates concerns. The key abstraction points (entity.name, world operations by ID) were already in place.
