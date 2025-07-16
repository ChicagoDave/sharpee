# Sharpee Interactive Fiction Framework - Testing Context

## Current Status
We are in the unit testing and integration testing stage of development for the Sharpee interactive fiction framework.

## Environment Setup
- **Root Directory**: `C:\repotemp\sharpee`
- **Development Environment**: Windows 11 with WSL Bash
- **Build System**: pnpm
- **Test Location**: Tests go in `/tests` directory of each package (e.g., `/packages/stdlib/tests`)
- **Scripts**: Not needed unless requested - builds/tests are run manually

## Core Architecture Principles
1. **Query-able world model** (underlying data and relationships)
2. **No virtual machine**
3. **Multiple language hooks**
4. **Event-driven text system**: All text sent through events to event store (in-memory). After turn completion, text service uses templates and language service to emit formatted text
5. **Fluent author layer**
6. **Standard library** with moderate complexity for modifications

### Critical Rule - No Hardcoded Text
```typescript
// ❌ WRONG
return "You can't take that.";

// ✅ RIGHT
return getMessage('cant_take_that');
```

## Current Testing Progress
**Status**: Creating golden tests for actions in the stdlib package  
**Completed**: 20/46 actions tested (43%)

### Test Progress by Category:
- ✅ **Object Manipulation (11/11)** - COMPLETE!
- ✅ **Movement & Navigation (5/5)** - COMPLETE!
- 📝 **Character Actions (2/7)** - In Progress
- 📝 **Communication (0/4)**
- 📝 **Combat & Physical (0/5)**
- 📝 **Device Interaction (0/3)**
- 📝 **Information & Meta (0/7)**
- 📝 **Exploration (0/1)**

### Recently Completed Tests (Sessions 1-3):
1. **Session 1**: Object Manipulation (11 actions)
   - closing, waiting, taking, dropping, examining, opening, locking, unlocking, inserting, removing, putting, giving, showing

2. **Session 2**: Movement & Navigation (5 actions)
   - going, entering, exiting, climbing, looking

3. **Session 3**: Character Actions (2 actions)
   - wearing, taking_off

## Key Files and Locations

### Test Infrastructure
- **Test Utilities**: `/packages/stdlib/tests/test-utils.ts`
- **Golden Tests Directory**: `/packages/stdlib/tests/unit/actions/`
- **Action Source Directory**: `/packages/stdlib/src/actions/standard/`
- **Progress Tracker**: `/ACTION_TESTS_CHECKLIST.md`

### Important Constants
- **Action IDs**: `/packages/stdlib/src/actions/constants.ts`
- **Architecture Decisions**: `/decisions` directory

## Golden Test Pattern
Each golden test follows this structure:
1. **Action Metadata** - Verify ID, required messages, and group
2. **Precondition Checks** - Test all failure conditions
3. **Successful Execution** - Test success scenarios
4. **Event Structure** - Validate event format and entities
5. **Testing Pattern Examples** - Additional patterns specific to the action

### Test Utilities Available
- `createEntity()` - Create mock entities with traits
- `createTestContext()` - Create action execution context
- `expectEvent()` - Validate event structure
- `TestData` - Helper for common test setups
- `createCommand()` - Create validated commands

## Next Priority Actions
Based on the checklist, continue with Character Actions:
1. **eating.ts** - Test eat/consume
2. **drinking.ts** - Test drink
3. **touching.ts** - Test touch/feel
4. **smelling.ts** - Test smell/sniff
5. **listening.ts** - Test listen

## Key Testing Insights from Previous Sessions

### Object Manipulation
- Actions validate visibility, reachability, and ownership
- Container/supporter handling includes capacity limits
- Social actions (giving/showing) have NPC preference systems
- Lock/key mechanics are sophisticated

### Movement & Navigation
- Directional movement validates exits and door states
- Entering/exiting supports containers, supporters, and ENTRY trait
- Climbing handles both directional (up/down) and object climbing
- Looking action categorizes visible items and handles darkness

### Character Actions
- Wearable system includes body parts and layering
- Implicit taking when wearing items from room
- Layering rules prevent wearing/removing items out of order
- Special restrictions like cursed items

## Request for New Session
Please continue creating golden tests for the remaining Character Actions, starting with `eating.ts`. Follow the established patterns and ensure comprehensive coverage including edge cases. The project uses the same structure and patterns as described above.

## Additional Context
- All actions are pure functions returning events, never mutating state
- Actions thoroughly validate preconditions
- The framework supports complex interactions like implicit actions
- Event-driven architecture allows for rich world model updates
