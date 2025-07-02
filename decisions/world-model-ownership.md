# World Model Ownership

## Description
Only behaviors can modify world model state, and only in response to events.

## Rules
- **Behaviors** modify entity state during event handling
- **World Model** provides query methods for reading state
- **Immutable During Queries** - State cannot change while text service is reading
- **Transaction Boundaries** - All events complete before queries begin

## Scenarios
- TakeSuccessEvent → InventoryBehavior changes entity.parent
- Text service queries entity.parent after all events done
- Never: Parser directly modifying entity state
- Never: Text service changing state while generating text
