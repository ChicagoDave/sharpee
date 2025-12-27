# IF Logic Assessment: Help Action

## Action Name and Description
**Help** - A meta-action that displays gameplay instructions and command information to the player. No world mutations, purely informational.

## What the Action Does in IF Terms
Help is a **signal action** that provides out-of-game assistance to the player. It does not represent an in-world action (no character within the narrative performs "help"). Instead, it's a meta-command that:
- Displays general gameplay instructions (commands, movement, objects, etc.)
- Provides targeted help for specific topics or actions if requested
- May differentiate first-time help from repeated requests
- Reports availability of hints if the game has a hint system

## Core IF Validations It Should Check

From an Interactive Fiction perspective, the core validations for HELP are minimal since it's a meta-action:

1. **Always Succeeds** - Help should never fail due to game state. A player should always be able to request help regardless of location, inventory, or game conditions.
2. **No Scope Restrictions** - Help doesn't require the player to perceive or reach anything in the game world.
3. **No Prerequisites** - Help has no preconditions (unlike actions requiring specific traits or states).

## Does the Current Implementation Cover Basic IF Expectations?

**YES** - The implementation correctly handles the fundamental IF expectations:

✓ **validate() always succeeds** - Returns `{ valid: true }` with no preconditions
✓ **No world mutations** - execute() analyzes the request but makes no state changes
✓ **Proper event emission** - report() emits semantic events for the report service
✓ **Handles general and specific help** - Analyzes topic requests from command extras/objects
✓ **Differentiates help types** - Tracks first-time help separately from repeated requests

## Gaps in Basic IF Logic

### 1. **Blocked Phase is Unused (Minor Code Smell)**
The `blocked()` method is included but never called since validation always succeeds. This creates unreachable code. Per the comment at line 126, this was added "for consistency" but adds no value for a signal action.

### 2. **Indirect World State Access (Design Concern)**
Lines 61-79 access shared data via `(context.world as any).getSharedData?.()` to check if help was previously requested:
```typescript
const sharedData = (context.world as any).getSharedData?.() || {};
```
This bypasses the normal action context interface and relies on runtime type assertions. This couples help to undocumented world API contracts.

**IF Impact**: Help correctly skips checking if hints are "enabled" at the game level, but the mechanism for reading that state is fragile.

### 3. **Topic Parsing Could Fail Silently**
The action attempts to extract help topics from three sources (extras, indirectObject, directObject) but provides no feedback if the parsed topic doesn't match known help sections. If a player types "HELP BANANA" and banana isn't a recognized topic, the action silently treats it as general help.

**IF Expectation**: IF typically provides feedback like "No help available for that topic" rather than falling back to general help.

### 4. **No Validation of Event Data Completeness**
The action builds `eventData` with optional fields but doesn't validate that the event handler will have the data it needs. If a handler expects `helpRequest` but it's undefined, it could fail silently.

## Summary

**Fundamentals**: The implementation correctly treats HELP as a zero-precondition signal action that never fails and produces no side effects.

**Gaps**: The implementation has stylistic issues (unused blocked phase) and design concerns (fragile world state access) but no critical IF logic flaws. A player can always request help and receive some response, which is the core IF requirement.
