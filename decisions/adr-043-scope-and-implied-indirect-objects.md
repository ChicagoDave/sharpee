# ADR-043: Scope Resolution and Implied Indirect Objects

**Status:** Proposed  
**Date:** 2025-07-27  
**Deciders:** Development Team

## Context

During action test migration, we discovered that many IF commands have implied destinations or contexts based on the player's current scope. For example:

- When trapped in a freezer: `DROP BALL` → implies `DROP BALL IN FREEZER`
- When standing on a table: `DROP BOOK` → implies `DROP BOOK ON TABLE`
- When inside a car: `LOOK` → implies `LOOK AROUND CAR` (not the outside world)

Currently, our command validation doesn't add these implied indirect objects, and our actions don't check for them. This leads to incorrect behavior where items might be dropped in the wrong location or actions might affect the wrong scope.

## Problem Statement

1. **Scope determines implied context** - When a player is inside a container or on a supporter, many commands have an implied "where" that isn't explicitly stated
2. **Actions need destination awareness** - Actions like DROP, PUT, and LOOK need to know where the action should apply
3. **Consistent player experience** - Players expect commands to work relative to their immediate context

## Decision

We will implement scope-based command enhancement during the validation phase:

### 1. Command Validator Enhancement

The command validator will:
- Determine the player's immediate scope (container, supporter, or room)
- Add implied indirect objects for commands that need them
- Mark these additions as `implicit: true` for message generation

### 2. Scope Rules

Commands that get implied destinations:
- `DROP <object>` → adds current container/supporter as destination
- `PUT <object>` → adds current container/supporter as destination  
- `LOOK` → scoped to current container (not room) when inside something
- `SEARCH` → searches current location (container/supporter/room)
- `EXAMINE` → no change (explicit targets only)

Commands that do NOT get implied destinations:
- `TAKE <object>` → takes from wherever it is
- `GO <direction>` → always relative to room
- `THROW <object>` → requires explicit destination

### 3. Action Updates

Actions will:
- Check for `indirectObject` in the validated command
- Use the indirect object as the destination when present
- Fall back to current behavior only when no destination is provided
- Respect the `implicit` flag for appropriate message generation

### 4. Implementation Example

```typescript
// Command validator adds implicit destination
if (command.action === 'drop' && !command.indirectObject) {
  const playerScope = getPlayerScope(player);
  if (playerScope.type !== 'room') {
    command.indirectObject = {
      entity: playerScope.entity,
      implicit: true
    };
  }
}

// Dropping action uses destination
const dropLocation = command.indirectObject?.entity || 
                    world.getEntity(world.getLocation(player.id));
```

## Consequences

### Positive
- Natural command processing that matches player expectations
- Consistent scope-based behavior across all actions
- Cleaner separation between parsing, validation, and execution
- Messages can be tailored based on implicit vs explicit destinations

### Negative  
- More complex command validation logic
- All relevant actions need updates to check indirect objects
- Potential for unexpected behavior if scope rules aren't intuitive
- Testing complexity increases with implicit behaviors

### Neutral
- Command structure becomes richer with more metadata
- Actions become more destination-aware
- Some commands may need disambiguation in edge cases

## Implementation Priority

1. **Phase 1**: Update command validator to add implicit destinations
2. **Phase 2**: Update DROP, PUT, and other object manipulation actions
3. **Phase 3**: Update LOOK, SEARCH, and observation actions
4. **Phase 4**: Comprehensive testing of scope behaviors

## Notes

- This aligns with standard IF conventions (Inform, TADS, etc.)
- The `implicit` flag allows messages to be natural ("You drop the ball." vs "You drop the ball in the freezer.")
- Future work might include customizable scope rules per game
- Consider how this interacts with darkness and visibility
