# IF Logic Assessment: Attacking Action

## Action Overview
**Name:** attacking
**Brief Description:** Hostile action that allows the player to attack NPCs, objects, or anything with combat-related traits using optional weapons.

## What the Action Does in IF Terms
The attacking action is the core combat mechanic in Interactive Fiction. It lets the player:
- Attack NPCs and living creatures
- Destroy or damage breakable/destructible objects
- Optionally use weapons to increase effectiveness
- Achieve results ranging from ineffective hits to complete destruction or death

## Core IF Validations Required

### 1. Target Existence
- **Must have:** A target entity to attack
- **Implemented:** ✓ Yes (line 73-74) - Rejects with `no_target` error if missing

### 2. Target Visibility
- **Must have:** Target is visible/perceivable
- **Implemented:** ✓ Yes (line 78-79) - Checks `context.canSee(target)`
- **Note:** This is appropriate - attacks generally require seeing what you attack in IF

### 3. Target Reachability
- **Must have:** Target is physically reachable
- **Implemented:** ✓ Yes (line 83-84) - Checks `context.canReach(target)`
- **If Logic:** Can't attack distant objects or NPCs in other rooms

### 4. Self-Attack Prevention
- **Must have:** Player cannot attack themselves
- **Implemented:** ✓ Yes (line 88-89) - Compares target.id to player.id
- **If Logic:** Fundamental rule preventing self-harm

### 5. Weapon Possession (if weapon specified)
- **Must have:** If player specifies a weapon, they must be holding it
- **Implemented:** ✓ Yes (line 93-98) - Verifies weapon is in player's inventory
- **If Logic:** Can't attack with weapons not in possession

### 6. Valid Attack Target
- **Must have:** Target has combat-related traits (BREAKABLE, DESTRUCTIBLE, COMBATANT)
- **Implemented:** ✓ Partially (line 127 via AttackBehavior.attack)
- **If Logic:** Attacks are ineffective against objects without combat traits
- **Note:** This happens during execution/reporting, not validation

## Coverage Assessment

### Validates Successfully
- Basic preconditions (target exists, visible, reachable)
- Self-attack prevention
- Weapon possession validation
- Weapon specification handling

### Current Implementation Quality
The action follows the four-phase pattern correctly:
- **validate():** Checks preconditions only
- **execute():** Delegates to AttackBehavior, stores result in sharedData
- **blocked():** Generates error events for validation failures
- **report():** Generates detailed success events with attack results

### Weapon Handling
- Accepts optional weapon parameter
- Can infer weapon from inventory based on verb (stab, slash, cut)
- Handles both armed and unarmed attacks appropriately

### Result Reporting
Generates atomic events for:
- Attack success (`if.event.attacked`)
- Specific outcomes (broke, damaged, destroyed, killed, hit)
- Secondary effects (items dropped, exits revealed)
- Weapon degradation (tracked but not reported as event)

## Basic IF Logic Gaps

### Gap 1: Attacking Non-Combatant Objects
- **Issue:** Validation allows attacks on anything reachable (like furniture, scenery)
- **Current Behavior:** Attack succeeds in validation, fails silently in AttackBehavior
- **Better Approach:** Could validate that target has combat-related traits earlier
- **Impact:** Minor - user gets "ineffective" message instead of validation error
- **IF Standard:** Acceptable - most IF systems handle this way

### Gap 2: Weapon Type Matching
- **Issue:** Validation doesn't check if weapon can damage target (weapon type vs destructible requirements)
- **Current Behavior:** Allowed in validation, checked in AttackBehavior.damage()
- **Better Approach:** Could be caught earlier, but current approach works
- **Impact:** Minor - deferred to execution phase
- **IF Standard:** Typical - weapon-target compatibility often discovered during attempt

### Gap 3: No Weapon Requirement Check
- **Issue:** Validation doesn't check if target requires a weapon to damage it
- **Current Behavior:** Allowed in validation, checked in AttackBehavior.damage()
- **Better Approach:** Could validate early if destructible targets require weapons
- **Impact:** Low - UX degradation but not breaking
- **IF Standard:** Acceptable - players learn through attempts

## Verdict: Basic IF Expectations Met

✓ **Does the current implementation cover basic IF expectations?** YES

The attacking action covers the fundamental IF combat logic:
- Prevents impossible attacks (self, unreachable, invisible targets)
- Prevents using weapons you don't have
- Prevents attacking without a valid target
- Properly delegates combat resolution to trait-based behaviors
- Generates appropriate events for all outcomes

The gaps identified are edge cases where validation is deferred to execution/reporting. This is architecturally acceptable because:
1. AttackBehavior determines actual attack viability
2. Report phase generates appropriate success/error messages
3. Player receives feedback about why attack was ineffective

The implementation is sound from an IF design perspective.
