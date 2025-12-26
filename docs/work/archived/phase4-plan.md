# Phase 4 Plan - Minimal Implementation Actions

## Overview
Phase 4 targets the 12 remaining low-quality actions (scores < 6.0) that have minimal implementations or need system-level design.

## Actions to Address (Priority Order)

### Group 1: Simple Sensory Actions (Quick Wins)
These actions can be improved with better integration and event systems.

1. **Smelling (5.5)** - Basic sensory action
   - Add proper event emission
   - Support for smell traits/descriptions  
   - Integration with room ambience

2. **Tasting (5.5)** - Could merge with eating
   - Add taste trait support
   - Better integration with consumables
   - Consider merging into eating action

### Group 2: Expressive Actions (Minimal Value)
These provide minimal gameplay value and could be story-specific.

3. **Singing (5.0)** - Minimal implementation
   - Add proper event structure
   - Support for audience reactions
   - Consider making story-specific

4. **Thinking (5.0)** - Placeholder action  
   - Add hint system integration
   - Support for revealing memories
   - Could trigger story events

### Group 3: Movement Variants
5. **Jumping (5.5)** - Basic movement variant
   - Add height/obstacle support
   - Integration with room connections
   - Physics for jumping over things

### Group 4: State-Based Actions (Need Time System)
These require a time/state management system to be meaningful.

6. **Sleeping (5.0)** - Needs time system
   - Add fatigue/rest mechanics
   - Dream sequence support
   - Time passage events

7. **Waking (5.0)** - Pairs with sleeping
   - Wake conditions (noise, time, etc.)
   - Grogginess effects
   - Morning routine triggers

### Group 5: Economic Actions (Need Design)
These require a full economic system design before implementation.

8. **Buying (5.5)** - Needs economic system
   - Currency management
   - Merchant interactions
   - Price negotiation

9. **Selling (5.5)** - Pairs with buying
   - Item valuation
   - Merchant willingness
   - Bartering support

## Refactoring Strategy

### For Sensory Actions (Smelling, Tasting)
- Create shared `analyzeSensoryAction` pattern
- Add proper trait support (SMELLABLE, TASTEABLE)
- Emit detailed sensory events
- Consider consolidation with examining

### For Expressive Actions (Singing, Thinking)
- Evaluate if they should remain in stdlib
- If kept, add proper event emission
- Support for story-specific responses
- Consider moving to optional actions package

### For Movement Variants (Jumping)
- Add physics/trajectory calculations
- Support for jumping over/onto things
- Integration with room navigation
- Proper failure conditions

### For State Actions (Sleeping/Waking)
- Design basic time/fatigue system
- Add state management for consciousness
- Support for forced sleep/wake
- Dream and wake event sequences

### For Economic Actions (Buying/Selling)
- Design currency trait system
- Create merchant/shop behaviors
- Add transaction validation
- Support for bartering/negotiation

## Implementation Priority

### Quick Wins (Do First)
1. **Smelling** - Simple sensory improvement
2. **Tasting** - Simple sensory improvement  
3. **Thinking** - Add hint/memory support

### Medium Effort (Do Second)
4. **Singing** - Add performance mechanics
5. **Jumping** - Add physics support

### High Effort (Consider Deferring)
6. **Sleeping/Waking** - Requires time system
7. **Buying/Selling** - Requires economic system

## Success Criteria

For each action:
- Eliminate code duplication
- Add proper event emission
- Follow established patterns (analyze functions)
- Achieve minimum score of 7.0
- Document changes and migration path

## Alternative Approach

Consider **removing** the following from stdlib:
- Singing (make story-specific)
- Thinking (replace with hint system)
- Buying/Selling (move to commerce package)

This would leave stdlib focused on core IF mechanics.

## Next Steps

1. Start with sensory actions (quick wins)
2. Evaluate each action for keep/remove decision
3. Implement improvements for kept actions
4. Create migration guides for removed actions
5. Update documentation

## Expected Outcomes

- Reduce low-quality actions from 12 to 0-5
- All remaining actions at 7.0+ quality
- Clear separation of core vs optional actions
- Established patterns for future additions