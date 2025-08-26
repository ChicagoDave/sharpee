# Remaining Actions Summary

## sleeping
**Purpose**: Rest or sleep action
**Key Issues**: Not yet analyzed
**Category**: Character state

## smelling
**Purpose**: Smell objects or environment
**Key Issues**: Not yet analyzed  
**Category**: Sensory

## switching_on / switching_off
**Purpose**: Toggle switchable devices
**Key Issues**: Likely delegates to SwitchableBehavior
**Category**: Device manipulation

## taking_off
**Purpose**: Remove worn items
**Key Issues**: Inverse of wearing action
**Category**: Inventory management

## talking
**Purpose**: Talk to NPCs or speak
**Key Issues**: Social interaction system
**Category**: Social

## throwing
**Purpose**: Throw objects at targets or in directions
**Key Issues**: Complex trajectory/target calculations
**Category**: Object manipulation

## touching
**Purpose**: Touch/feel objects
**Key Issues**: Simple sensory action
**Category**: Sensory

## turning
**Purpose**: Turn/rotate objects
**Key Issues**: May involve dial/knob mechanics
**Category**: Device manipulation

## unlocking
**Purpose**: Unlock locked containers/doors
**Key Issues**: Inverse of locking, key management
**Category**: Lock manipulation

## waiting
**Purpose**: Pass time
**Key Issues**: Simple meta action
**Category**: Meta

## wearing
**Purpose**: Put on wearable items
**Key Issues**: Clothing system, layering
**Category**: Inventory management

## Common Patterns Expected
Based on analyzed actions:
- **Sensory actions** (smelling, touching): Likely simple with minimal validation
- **Device actions** (switching_on/off, turning): Should delegate to behaviors
- **Inverse pairs** (locking/unlocking, wearing/taking_off): Similar structure
- **Social actions** (talking): Complex NPC interaction systems
- **Physical actions** (throwing): Physics calculations, trajectory

## Estimated Issues
- 30-40% likely have logic duplication
- Most missing three-phase pattern
- Social actions probably most complex
- Device actions should use behavior delegation