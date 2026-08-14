# Scope-Dependent Tests

This document tracks all tests that have been skipped because they depend on scope logic that hasn't been implemented yet.

## What is Scope Logic?

Scope logic determines what entities are visible and reachable to an actor based on their current location and the containment hierarchy. It affects:

- What the player can see
- What the player can interact with
- How commands resolve entity references
- Movement between locations
- Setting the correct `context.currentLocation` for actions

## Skipped Tests

### Entering Action (`tests/unit/actions/entering-golden.test.ts`)
- **"should fail when already inside target"** - Requires scope to track when player is inside a vehicle

### Exiting Action (`tests/unit/actions/exiting-golden.test.ts`)
- **"should fail when container is closed"** - Requires scope logic to properly set context.currentLocation for entities in containers
- **"should fail when exit is blocked"** - Requires scope logic to properly set context.currentLocation for entities with ENTRY trait
- **"should exit from vehicle with ENTRY trait"** - Requires scope logic to properly set context.currentLocation for entities in vehicles
- **"should handle custom prepositions correctly"** - Requires scope logic to properly set context.currentLocation for various entry types

### Showing Action (`tests/unit/actions/showing-golden.test.ts`)
- **"should prevent showing to someone not present"** - Depends on scope to determine who is present
- **"should handle showing to someone in a vehicle"** - Requires scope to handle visibility in vehicles

### Attacking Action (`tests/unit/actions/attacking-golden.test.ts`)
- **"should fail when target not in scope"** - Directly tests scope functionality
- **"should hit target in same vehicle"** - Requires scope to handle interactions within vehicles

### Throwing Action (`tests/unit/actions/throwing-golden.test.ts`)
- **"should fail when target not in scope"** - Directly tests scope functionality
- **"should throw at target in vehicle"** - Requires vehicle scope handling
- **"should throw from inside vehicle"** - Requires vehicle scope handling

## Exiting Action Notes

The exiting action currently uses `world.getLocation(player.id)` to determine where the player is. However, when scope logic is implemented, it should use `context.currentLocation` which would be properly set based on:
- Whether the player is in a container, supporter, or entry
- The containment hierarchy
- Special scope rules for vehicles and other enterable objects

## Design Notes

The current implementation uses a simplified approach where:
- Actions directly query the world model for location information
- `context.currentLocation` is set to the player's immediate container when the context is created
- Complex containment scenarios (like being in a container that's in a vehicle) are not fully supported

When scope logic is implemented, it will need to:
- Properly set `context.currentLocation` based on the actual containment hierarchy
- Handle visibility and reachability through multiple levels of containment
- Support special cases like vehicles that act as both containers and scope-defining objects