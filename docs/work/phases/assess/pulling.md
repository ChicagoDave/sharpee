# IF Logic Assessment: Pulling Action

## Action Summary

The **Pulling** action allows the player to pull objects that have the PULLABLE trait. It's a basic interaction action that validates pulling is possible, updates the pullable state, and emits events for story authors to handle specific pulling effects.

## What It Does in IF Terms

Pulling is a player-initiated manipulation action where the player exerts force on a pullable object in a specific direction. The action expects:

- A valid target object that exists and is reachable
- The target must have the PULLABLE trait (indicating it's designed to be pulled)
- The object transitions from a "default" state to "pulled" state
- Story authors handle the consequences via event handlers (pulling a lever activates something, pulling a cord rings a bell, etc.)

## Core IF Validations It Should Check

1. **Target Existence** - Something was specified to pull
2. **Target Reachability** - The object is accessible to the player
3. **Target Pullability** - The object has the PULLABLE trait
4. **Not Worn** - Can't pull items the player is wearing
5. **Repeatability Check** - Object hasn't already been pulled (if non-repeatable)
6. **Strength Requirement** - Player has sufficient strength (for heavy objects)

## Current Implementation Coverage

The pulling action covers the core validations reasonably well:

- [x] **Target Existence** - Checked (line 61-62)
- [x] **Target Pullability** - Checked via PULLABLE trait (line 66-68)
- [x] **Not Worn** - Checked for WEARABLE trait (line 71-76)
- [x] **State Check** - Prevents pulling objects already in "pulled" state (line 80-82)
- [x] **Four-Phase Pattern** - Properly implements validate/execute/blocked/report

## Obvious Gaps in Basic IF Logic

### 1. **Missing Strength Validation**
The PullableTrait contains `requiresStrength` field but the action never checks it. The validation should verify the player/actor has sufficient strength before allowing the pull. This is present in the data structure but not enforced.

**Impact**: Heavy objects that require strength can still be pulled by anyone.

### 2. **Missing Repeatability Check**
The PullableTrait has a `repeatable` flag but it's never validated. Objects marked as non-repeatable should only be pullable once, but currently the action allows pulling any object that hasn't been pulled yet based on state. These are related but different concepts.

**Impact**: Non-repeatable objects might be pullable multiple times if the state is reset or if maxPulls is configured.

### 3. **Missing Max Pulls Check**
The PullableTrait has `maxPulls` limit but it's not validated. Objects with pull limits (e.g., "can only pull 3 times") can be pulled beyond the limit.

**Impact**: Objects designed with pull limits can exceed their intended maximum.

### 4. **Incomplete Worn Check**
The worn validation only checks WEARABLE trait and its isWorn state. But wearable items might also be checked using the actor's location relationship. The check at line 73 assumes `wearable?.isWorn` exists, which may not always be reliable.

**Impact**: Could miss cases where items are worn through different mechanisms.

### 5. **No Reachability Validation**
The metadata claims `directObjectScope: ScopeLevel.REACHABLE` but the validation doesn't explicitly check reachability. This relies on parser/scope layer to pre-filter, which is fine architecturally but means no explicit error message for "not_reachable" is generated if that somehow fails.

**Impact**: Minor - the required message list includes 'not_reachable' but the validation never returns it.

## Summary

The pulling action implements the **basic three-phase pattern correctly** and covers the fundamental IF expectations for a simple interaction action. However, it has **moderate gaps** in validating the optional trait properties (strength requirements, pull limits, repeatability). These gaps mean story authors must work around them with event handlers rather than having the action enforce them directly.

The action is **sufficient for basic pulling scenarios** but incomplete for **advanced pulling mechanics** (heavy objects, limited-use levers, etc.).
