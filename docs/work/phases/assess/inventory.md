# Inventory Action - IF Logic Assessment

## Action Name and Description
**Inventory** - The fundamental action for the player to check what items they are carrying, both held and worn.

## What the Action Does in IF Terms
The inventory action displays the player's current inventory, listing both items they are holding and items they are wearing. This is a query-only action that reads the world state without making any changes. It may also provide burden feedback (light, heavy, overloaded) if the player has weight capacity constraints.

## Core IF Validations It Should Check

### Fundamental IF Constraints
1. **Always succeeds** - Inventory checking has no preconditions; the player can always check what they're carrying
2. **Distinguish held items** - Items being held should be clearly separated from worn items in output
3. **Empty inventory handling** - When carrying nothing, provide appropriate feedback rather than an empty list
4. **Query world model** - Directly read player inventory from world model (getContents), not assumptions or cached data

### Secondary Considerations (Enhanced)
5. **Weight capacity awareness** - If player has inventory limits (ACTOR trait with maxWeight), calculate and report total weight
6. **Burden messaging** - Provide feedback on burden level (light <75%, heavy 75-89%, overloaded 90%+)
7. **Verb variations** - Support short forms like "i" and "inv" for quick inventory checks
8. **Observable action** - Generate observable event so NPCs can notice the player checking their pockets

## Does the Current Implementation Cover Basic IF Expectations?

**YES - All fundamental validations and IF semantics are present:**

- ✓ Always valid (line 206 - returns `{ valid: true }` unconditionally)
- ✓ Separates held vs worn items via WearableTrait.worn check (line 62-76)
- ✓ Empty inventory handling with varied messages (line 146-150)
- ✓ Direct world model query via context.world.getContents() (line 59)
- ✓ Weight calculation and burden assessment (line 78-132)
- ✓ Burden messaging with thresholds (line 124-130)
- ✓ Short form verb support for "i" and "inv" (line 135-139)
- ✓ Observable action via if.action.inventory event (line 229)

## Any Obvious Gaps in Basic IF Logic

**No significant gaps found.** The implementation handles all fundamental IF expectations:

1. **No side effects** - Execute phase performs no world mutations; pure analysis only
2. **Type-safe data flow** - Uses InventorySharedData interface to pass analyzed inventory safely between phases
3. **Comprehensive event data** - Event includes item counts, names, worn status, and weight information for observer logic
4. **Flexible output** - Supports multiple message variations (empty, carrying, wearing, both) with appropriate detail levels
5. **Four-phase compliance** - Properly implements four-phase pattern: validate (always true) → execute (analyze) → report (emit events) → blocked (never called)

The implementation correctly treats inventory as a query action with optional burden awareness, maintaining IF semantics while providing rich data for event-driven output and NPC perception.
