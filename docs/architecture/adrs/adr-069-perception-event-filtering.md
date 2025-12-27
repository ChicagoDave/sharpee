# ADR-069: Perception-Based Event Filtering

## Status

Accepted

## Context

Testing the Cloak of Darkness story revealed that the `going` action emits full room descriptions even when entering a dark room. The `looking` action correctly handles darkness, but `going` bypasses this check entirely.

### Current Problem

```
> south  (entering dark bar with cloak)
Foyer Bar

The bar, much rougher than you'd have guessed...

You can see message in the sawdust here.

Blundering around in the dark isn't a good idea!
```

The player sees the full room description AND contents, then gets told it's dark. This breaks immersion and game logic.

### Root Cause

The `going` action emits `if.event.room.description` directly in its `report()` phase without checking darkness:

```typescript
// going.ts lines 282-283
context.event('if.event.room.description', roomDescData);
```

### Broader Issue

Darkness is just one perception blocker. Others include:

- Player is blind (trait/status effect)
- Player is blindfolded (wearing something over eyes)
- Magical darkness (environmental effect)
- Eyes closed (temporary state)
- Deafness (for audio descriptions)
- Hallucinations (should show false information)

Each action implementing its own perception checks creates:

1. Inconsistent behavior across actions
2. Duplicated logic
3. Missed edge cases
4. Maintenance burden

## Decision

This ADR proposes options for a **perception-based event filtering** system. The goal is to separate "what happened" (action events) from "what the player perceives" (filtered events sent to text service).

## Options

### Option A: Engine-Level Post-Execution Filter

Add an event filter in the engine's turn processing pipeline.

```
Actions emit events → Engine filters by perception → Text service renders
```

**Implementation:**

```typescript
// In GameEngine or TurnProcessor
class TurnProcessor {
  private perceptionFilter: PerceptionFilter;

  async executeTurn(command: string): Promise<TurnResult> {
    // 1. Parse and execute action
    const rawEvents = await this.executeAction(command);

    // 2. Filter events through perception layer
    const perceivedEvents = this.perceptionFilter.filter(
      rawEvents,
      this.world.getPlayer(),
      this.world
    );

    // 3. Pass filtered events to text service
    return { events: perceivedEvents, ... };
  }
}

// PerceptionFilter implementation
class PerceptionFilter {
  filter(events: ISemanticEvent[], actor: IFEntity, world: WorldModel): ISemanticEvent[] {
    const location = world.getContainingRoom(actor.id);
    const canSee = this.canSeeVisually(actor, location, world);

    return events.map(event => {
      if (event.type === 'if.event.room.description' && !canSee) {
        return this.createDarknessEvent(event, actor, location);
      }
      // ... other perception transformations
      return event;
    });
  }

  private canSeeVisually(actor: IFEntity, location: IFEntity, world: WorldModel): boolean {
    // Check actor state
    if (actor.hasTrait(TraitType.BLIND)) return false;
    if (this.isWearingBlindfold(actor, world)) return false;

    // Check environment
    if (VisibilityBehavior.isDark(location, world)) return false;

    return true;
  }
}
```

**Pros:**

- Centralized filtering - all events pass through one point
- Actions stay pure - emit what happened, not what's perceived
- Easy to add new perception blockers
- Works for any movement (going, teleportation, pushed)

**Cons:**

- Engine depends on perception logic (world-model concepts leak into engine)
- Filter needs to understand event types
- May need event type registry

---

### Option B: Stdlib PerceptionService Called by Engine

Keep perception logic in stdlib, but engine calls it via interface.

```typescript
// In @sharpee/core - interface only
interface IPerceptionService {
  filterEvents(events: ISemanticEvent[], actor: IFEntity, world: WorldModel): ISemanticEvent[];
}

// In @sharpee/stdlib - implementation
class PerceptionService implements IPerceptionService {
  filterEvents(events: ISemanticEvent[], actor: IFEntity, world: WorldModel): ISemanticEvent[] {
    // Full implementation with VisibilityBehavior, trait checks, etc.
  }
}

// Engine uses interface, stdlib provides implementation
const engine = new GameEngine({
  perceptionService: new PerceptionService(),
  // ...
});
```

**Pros:**

- Engine stays generic (only knows interface)
- Perception logic lives in stdlib with other IF concepts
- Authors can provide custom PerceptionService
- Clean dependency direction

**Cons:**

- Requires service registration/injection pattern
- Another service to configure
- Interface must be stable

---

### Option C: Event Handler Pattern

Use the existing event handler system. A built-in handler listens for room descriptions and transforms them.

```typescript
// Registered as a system handler in stdlib
const perceptionHandler: IEventHandler = {
  id: 'stdlib:perception-filter',
  eventTypes: ['if.event.room.description', 'if.event.contents.listed'],
  priority: EventPriority.SYSTEM_POST, // Runs after author handlers

  handle(event, context) {
    const canSee = PerceptionService.canSeeVisually(
      context.player,
      context.world.getContainingRoom(context.player.id),
      context.world
    );

    if (!canSee && event.type === 'if.event.room.description') {
      // Transform to darkness event
      return {
        ...event,
        type: 'if.event.room.dark',
        data: { reason: 'no_light' },
      };
    }

    return event;
  },
};
```

**Pros:**

- Uses existing event handler infrastructure
- No new systems needed
- Authors can override or extend
- Consistent with how other customizations work

**Cons:**

- Event handlers currently don't transform events (they observe)
- Would need to extend handler contract to allow event modification
- Priority ordering complexity

---

### Option D: Going Action Doesn't Emit Room Description

Remove room description logic from `going` entirely. Let the engine trigger a `look` at end of turn if location changed.

```typescript
// In engine turn processing
async executeTurn(command: string): Promise<TurnResult> {
  const previousLocation = world.getLocation(player.id);

  const result = await this.executeAction(command);

  const currentLocation = world.getLocation(player.id);
  if (currentLocation !== previousLocation) {
    // Player moved - trigger automatic look
    const lookResult = await this.executeAction('look');
    result.events.push(...lookResult.events);
  }

  return result;
}
```

**Pros:**

- Simple - reuses existing `looking` action
- `looking` already handles darkness correctly
- No new systems needed
- Matches Inform 6/7 model

**Cons:**

- Engine hardcodes "look" action name
- Performance: two action executions per movement
- Less control over arrival description framing
- Doesn't solve other perception issues (blindness, etc.)

---

### Option E: VisibilityBehavior Extends to Full Perception

Extend `VisibilityBehavior` to handle all perception checks, add event filtering method.

```typescript
class VisibilityBehavior extends Behavior {
  // Existing
  static isDark(room: IFEntity, world: WorldModel): boolean { ... }

  // New: comprehensive perception check
  static canPerceive(
    actor: IFEntity,
    location: IFEntity,
    world: WorldModel,
    sense: 'sight' | 'hearing' | 'smell' = 'sight'
  ): boolean {
    if (sense === 'sight') {
      if (actor.hasTrait(TraitType.BLIND)) return false;
      if (this.isWearingBlindfold(actor, world)) return false;
      if (this.isDark(location, world)) return false;
    }
    // ... other senses
    return true;
  }

  // New: filter events based on perception
  static filterEventsByPerception(
    events: ISemanticEvent[],
    actor: IFEntity,
    world: WorldModel
  ): ISemanticEvent[] {
    const location = world.getContainingRoom(actor.id);
    const canSee = this.canPerceive(actor, location, world, 'sight');

    return events.flatMap(event => {
      if (event.type === 'if.event.room.description' && !canSee) {
        return [{
          ...event,
          type: 'if.event.perception.blocked',
          data: {
            originalType: 'if.event.room.description',
            reason: this.getBlockReason(actor, location, world),
            sense: 'sight'
          }
        }];
      }
      return [event];
    });
  }
}
```

**Pros:**

- Builds on existing VisibilityBehavior
- Single location for all visibility/perception logic
- ADR-068 already established this as visibility source of truth

**Cons:**

- VisibilityBehavior becomes very large
- Mixes environmental checks (darkness) with actor state (blind)
- Event filtering feels like different responsibility

---

## Comparison Matrix

| Criteria                  | A: Engine Filter | B: Stdlib Service | C: Event Handler | D: Auto-Look | E: Extend Visibility |
| ------------------------- | :--------------: | :---------------: | :--------------: | :----------: | :------------------: |
| Solves going darkness bug |        ✅        |        ✅         |        ✅        |      ✅      |          ✅          |
| Handles blindness         |        ✅        |        ✅         |        ✅        |      ❌      |          ✅          |
| No engine changes         |        ❌        |        ❌         |        ⚠️        |      ❌      |          ❌          |
| Uses existing patterns    |        ❌        |        ⚠️         |        ✅        |      ✅      |          ⚠️          |
| Author extensible         |        ⚠️        |        ✅         |        ✅        |      ⚠️      |          ⚠️          |
| Clean separation          |        ⚠️        |        ✅         |        ✅        |      ✅      |          ❌          |
| Minimal new concepts      |        ❌        |        ❌         |        ✅        |      ✅      |          ⚠️          |

## Questions to Resolve

1. **Scope**: Do we need full perception system now, or just fix the darkness bug?
2. **Event transformation**: Should handlers be able to modify/replace events?
3. **Text service role**: Should perception filtering happen before or after text service receives events?
4. **Author hooks**: How do authors customize perception (e.g., "player has night vision")?

## Recommendation

**Option B: Stdlib PerceptionService** is the right architecture.

Rationale:

- **Clean separation**: Engine stays generic, IF-specific perception logic lives in stdlib
- **Author extensible**: Custom PerceptionService for night vision, echolocation, etc.
- **Comprehensive**: Handles darkness, blindness, deafness, and future perception blockers
- **Correct abstraction**: Perception is actor + environment, not just room state
- **No quick fixes**: We're greenfield - build it right the first time

Option D (auto-look) is rejected because:

- It only fixes darkness, not other perception blockers
- Hardcodes "look" action name in engine
- Two action executions per movement is inelegant
- Doesn't establish the right pattern for future work

Option E (extend VisibilityBehavior) is rejected because:

- Conflates environmental state (room darkness) with actor perception (can player see?)
- VisibilityBehavior becomes a god class
- Event filtering is a different responsibility than visibility checking

## Implementation Plan

### Phase 1: Core Interface and Service

1. Define `IPerceptionService` interface in `@sharpee/core`:

   ```typescript
   interface IPerceptionService {
     filterEvents(events: ISemanticEvent[], actor: IFEntity, world: WorldModel): ISemanticEvent[];
     canPerceive(actor: IFEntity, location: IFEntity, world: WorldModel, sense: Sense): boolean;
   }

   type Sense = 'sight' | 'hearing' | 'smell' | 'touch';
   ```

2. Create `PerceptionService` implementation in `@sharpee/stdlib`:

   - `canSeeVisually()` - checks blindness, blindfold, darkness
   - `filterEvents()` - transforms visual events when can't see

3. Add required traits to `@sharpee/world-model`:
   - `BlindTrait` - actor cannot see
   - `DeafTrait` - actor cannot hear
   - `BlindfoldTrait` on wearables - blocks vision when worn

### Phase 2: Engine Integration

1. Add `perceptionService` to `GameEngineConfig`
2. Call `perceptionService.filterEvents()` after action execution, before returning events
3. Default to pass-through if no service configured (engine stays generic)

### Phase 3: Remove Duplicate Logic

1. Remove room description emission from `going.report()`
2. Add movement-triggered look mechanism (going emits `if.event.needs_room_description`)
3. PerceptionService handles this event → emits appropriate room/darkness event
4. Update looking action to also use PerceptionService for consistency

### Phase 4: Test and Validate

1. Cloak of Darkness: darkness path works correctly
2. Add blindness test story/scenario
3. Verify author can provide custom PerceptionService

## Open Design Questions

1. **Event emission after filtering**: Should going emit `needs_room_description` and let PerceptionService resolve it, or should engine trigger a look?

Going isn't the only thing that fires 'look'. Waiting with a VERBOSE setting would too (as would all actions with VERBOSE on)

2. **Stacking effects**: How do multiple perception blockers interact? (blind + dark room = same result, but messaging differs)

We should let the author handle this. We're only concerned about core use cases.

3. **Partial perception**: Can you hear a room you can't see? Should `going` trigger both visual and audio descriptions?

See #1

## References

- ADR-068: Unified Darkness Checking
- ADR-052: Event Handlers for Custom Logic
- Cloak of Darkness story test logs
- Inform 6/7 end-of-turn room description model
