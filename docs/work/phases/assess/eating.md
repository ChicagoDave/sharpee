# Eating Action - IF Logic Assessment

## Action: Eating
**Brief Description:** Consume edible items that have the EDIBLE trait.

## What the Action Does in IF Terms
The eating action allows the player to consume food items in the game world. Once eaten, an item is marked as consumed and becomes unavailable for further eating. The action supports variable consumption (multiple servings/bites), tracks nutritional value, and can model special effects or tastes.

## Core IF Validations It Should Check

1. **Item Exists**: Must have a valid target item to eat
2. **Item is Edible**: Target must have the EDIBLE trait
3. **Item is Not a Drink**: Drinks should use DRINKING action instead
4. **Item Not Already Consumed**: Cannot eat something that's already been eaten
5. **Item Accessibility**: Should the player need to be holding the item, or can they eat things they can reach?

## Does Current Implementation Cover Basic IF Expectations?

**Partially.**

### What it does well:
- Validates item exists
- Validates item has EDIBLE trait
- Prevents eating drinks (redirects to DRINKING action)
- Prevents eating already-consumed items
- Generates appropriate event with eaten item data
- Uses four-phase pattern (validate/execute/blocked/report)
- Uses sharedData correctly between phases
- Creates semantic event `if.event.eaten` with proper event data

### Significant Gap:
**The implementation does NOT validate that the player can actually reach/access the item.**

Current scope is set to `REACHABLE` in metadata, but the validation phase never checks this. The action only validates:
- Item exists
- Item is edible (has trait)
- Item is not a drink
- Item is not consumed

But it **never calls `context.canReach(item)`** or similar to verify the player can actually access it. The scope validator may handle this at parse time, but the action's own validation completely skips reachability checks.

This is a critical gap: A player could command "eat apple" and if the apple somehow gets in scope (parse-time scope resolution), the action would consume it even if they can't reach it.

## Other Gaps in Basic IF Logic

1. **No holding requirement check**: Some IF games require the player to be holding food to eat it. Current implementation doesn't validate this.

2. **Portions/servings logic unclear**: The code references `portions` property but the EdibleTrait defines `servings`. There's semantic drift:
   - `eating.ts` uses `portions` and tracks `portionsRemaining`
   - `EdibleTrait.ts` defines `servings` property
   - The code accesses untyped properties with `(edibleTrait as any).portions`

3. **No implicit taking**: Some IF games have "eat apple" implicitly take the apple first if not held. This action never handles that.

4. **Consumed state persistence unclear**: The action sets `consumed = true` on the trait, but:
   - This is a direct mutation (not via behavior)
   - The trait doesn't formally declare a `consumed` property
   - It's set via unsafe cast `(edibleTrait as any).consumed`

## Summary
The eating action implements the core pattern correctly but has a critical validation gap: **no reachability check in the validate phase**. It also has semantic drift between "portions" (in action) and "servings" (in trait) and lacks type safety for the consumed state. The implementation assumes scope resolution handles all access validation, which is a dangerous assumption.
