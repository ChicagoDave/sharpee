# Opening Action Design Review

## Interactive Fiction Perspective

### Core Semantics
The OPEN action in interactive fiction serves multiple narrative and mechanical purposes:

1. **Revealing Contents**: Opening containers to discover items
2. **Enabling Passage**: Opening doors to access new locations  
3. **State Transformation**: Changing the world state (closed → open)
4. **Discovery Mechanic**: First-time reveals vs. subsequent openings

### Expected Behaviors

#### Standard Cases
- `OPEN BOX` - Opens a container, revealing contents
- `OPEN DOOR` - Opens a door, enabling passage
- `OPEN WINDOW` - Opens an aperture (view/passage)
- `OPEN BOOK` - Opens a readable item (special case)
- `OPEN DRAWER` - Opens furniture container
- `OPEN SAFE` - Opens lockable container (if unlocked)

#### Edge Cases & Variations
- Opening already open things → "It's already open."
- Opening locked things → "It's locked."
- Opening unopenable things → "That's not something you can open."
- Opening things with custom mechanisms → Custom messages/effects
- Opening empty containers → "Opening the box reveals that it's empty."
- Opening containers with many items → List management
- Opening transparent containers → Already see contents
- Opening while carrying → Implicit take vs. in-place opening

### Player Expectations

1. **Feedback Quality**
   - Clear indication of success/failure
   - Contents revelation when appropriate
   - State change confirmation

2. **Logical Consistency**
   - Can't open locked things without unlocking first
   - Can't open things that are already open
   - Can't open things that aren't openable

3. **Discovery Experience**
   - First opening might be special (reveal text)
   - Subsequent openings are routine
   - Empty containers should indicate emptiness

### Narrative Considerations

1. **Pacing**: Opening actions can control narrative flow
   - Locked doors as gates
   - Hidden items as rewards
   - Puzzle boxes as challenges

2. **Atmosphere**: Opening can set mood
   - Creaking doors
   - Mysterious boxes
   - Ancient tomes

3. **Player Agency**: Opening represents choice
   - Exploration decisions
   - Risk/reward (trapped containers)
   - Resource management (keys, tools)

## Current Implementation Analysis

### Strengths
1. **Clear Delegation**: Uses OpenableBehavior properly
2. **Lock Integration**: Checks LockableBehavior
3. **Result Handling**: Captures IOpenResult from behavior
4. **Event Generation**: Multiple event types (domain, action, success)

### Weaknesses from IF Perspective

1. **Context Pollution**: Uses `(context as any)._openResult`
   - Should use `context.sharedData.openResult` [TECHNICAL DEBT - MUST FIX]

### Story/Platform Concerns (Not Stdlib Issues)

These are handled by the story author or platform layer, not the stdlib:

- **Message Customization**: Story authors handle via event handlers
- **Content Display**: Text Service handles formatting and grouping
- **Scope Variations**: Story can override with custom validators
- **Advanced Features**: Story-specific behaviors like:
  - Partial opening states (ajar doors)
  - Tool-based opening (OPEN WITH)
  - Implicit opening (auto-open when moving)
  - Custom effects (sounds, reveals, triggers)

## TypeScript/Architecture Considerations

### Current Issues

1. **Type Safety**: Context pollution breaks type safety
2. **Data Flow**: Result passing through context hack
3. **Event Data**: Manual construction instead of consistent builder
4. **Validation**: Good separation but could be cleaner

### Proposed Improvements

1. **Use SharedData Pattern**:
   ```typescript
   context.sharedData.openResult = result;
   ```

2. **Enhanced Event Data Builder**:
   - Consistent with other actions
   - Type-safe data construction
   - Reusable patterns

3. **Better Error Handling**:
   - More specific error messages
   - Context-aware errors

## Recommendations

### Priority 1: Core Fixes (Stdlib Responsibility)
1. ✅ Migrate to sharedData pattern (remove context pollution) - COMPLETED
2. Ensure proper event data structure
3. Maintain clean validate/execute/report separation

### Story-Level Concerns (Not Stdlib)
These should be handled by story authors through event handlers:
- First-time opening detection
- Custom reveal messages
- Special empty container handling
- Partial states (ajar, cracked open)
- Tool-based opening
- Implicit opening
- Custom effects and triggers
- Message variety and atmosphere

## Test Coverage Needs

### Current Coverage
- Basic open success
- Already open error
- Locked error
- Not openable error

### Missing Coverage
- Empty container special case
- Many items in container
- Transparent container opening
- Custom open messages
- Opening with effects/sounds
- First vs. subsequent opening

## Questions for Design Discussion

1. **Stdlib vs Story Boundary**: Where exactly should we draw the line?
   - Stdlib provides core mechanics and events
   - Story handles customization through event handlers
   - Platform (Text Service) handles display formatting

2. **Event Data Completeness**: What data must the stdlib provide?
   - Currently provides extensive data (container info, contents, etc.)
   - Is this the right level of detail?

3. **Validation Flexibility**: How can stories override validation?
   - Current scope system is fixed
   - Should stories be able to inject custom validators?

## Next Steps

1. ✅ Fix context pollution (migrate to sharedData) - COMPLETED
2. Review event data structure for completeness
3. Ensure clean separation of concerns (stdlib vs story)
4. Document patterns for story customization via event handlers