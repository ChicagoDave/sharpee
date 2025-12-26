# IF Logic Assessment: Touching Action

## Action Overview
**Name:** Touching
**Type:** Query/Sensory Action
**Description:** Allows players to touch or feel objects to discover their tactile properties like texture, temperature, and material composition.

## What It Does in IF Terms
The touching action is a sensory exploration mechanism that provides texture/temperature feedback about objects without changing world state. It's a "feel" or "touch" command that lets players learn about object properties through tactile feedback rather than visual inspection.

## Core IF Validations Required
1. **Target existence** - Player must specify something to touch
2. **Reachability** - Target must be physically reachable (in scope as REACHABLE)
3. **Valid target type** - Some objects might logically reject touching (though most IF allows broad touching)

## Does Current Implementation Cover Basic IF Expectations?

**YES - with caveats.**

The implementation correctly:
- Validates that a target exists
- Delegates scope validation (REACHABLE) to CommandValidator via metadata
- Produces no world mutations (correct sensory behavior)
- Generates appropriate tactile property events
- Varies message based on touch verb (touch/poke/pat/stroke/feel)
- Derives sensory properties from entity traits (temperature from light/switchable, texture from wearable/container/edible)

## Gaps in Basic IF Logic

### 1. **Visibility vs Reachability Trade-off**
- **Gap**: Action validates target exists and scope validates reachability, but doesn't check **visibility**
- **IF Expectation**: In most IF systems, touching something usually requires being able to see it
- **Current Behavior**: A player could theoretically touch an object they can't see (darkness scenario)
- **Status**: This may be intentional (allowing blind touches like attacking in darkness), but it's not explicit in comments

### 2. **Verb-Specific Rejection Logic Missing**
- **Gap**: Some touch verbs might be contextually inappropriate (e.g., "stroke" vs "poke" on different object types)
- **IF Expectation**: Traditional IF might have different message responses based on object type + verb combo
- **Current Behavior**: All verbs succeed if target is reachable; message varies only for "feels_normal" state
- **Status**: Basic functionality present, but no verb appropriateness validation

### 3. **No Trait-Specific Restrictions**
- **Gap**: No validation for objects that might logically reject touching (e.g., hazardous objects that damage on contact)
- **IF Expectation**: Some IF systems prevent or modify touching based on object properties
- **Current Behavior**: Everything is touchable if reachable
- **Status**: Not a core gap - this is customizable via event handlers, but no built-in logic

### 4. **Edge Case: Scenery Immovability**
- **Gap**: The code marks scenery as immovable but doesn't prevent touching it
- **IF Expectation**: Scenery is typically still touchable (trees, walls, etc.) - this is correct
- **Status**: Correct implementation; immovability is reported as sensory feedback, not a block

## Summary
The touching action **meets fundamental IF expectations** for a sensory action. It validates presence and reachability, produces no mutations, and generates contextually appropriate feedback messages. The main uncertainty is whether visibility should be required (appears intentionally permissive, possibly for blind touch scenarios), and whether verb-object appropriateness validation is needed (current design favors simplicity - story can override via event handlers if needed).
