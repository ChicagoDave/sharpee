# Traits vs Behaviors

## Description
Traits are capabilities/markers on entities. Behaviors are the logic that implements those capabilities.

## Design
- **Traits** - Static data/flags (Container, Fixed, Openable)
- **Behaviors** - Event handlers with logic (ContainerBehavior handles open/close)
- **Attachment** - When a trait is added to an entity, its behaviors are registered
- **State** - Stored on the entity, accessed by behaviors

## Scenarios
- Entity.addTrait('container') → Registers ContainerBehavior → Handles OpenAttemptEvent
- Behaviors check: if (entity.hasTrait('container'))
- Never: Logic inside trait classes
- Never: Traits directly handling events
