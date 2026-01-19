# Session Summary: 2026-01-19 - feature/event-simplification

## Status: Completed

## Goals
- Clarify documentation around domain events vs event handlers
- Address persistent confusion where `if.event.*` events were being treated as pub/sub events
- Establish clear terminology for event sourcing pattern in Sharpee
- Create comprehensive ADR documenting the domain events architecture

## Completed

### Domain Events Documentation Overhaul

Rewrote and clarified documentation across 5 files to establish the correct mental model: domain events are immutable records of "things that have already happened" (event sourcing pattern), NOT messages in a pub/sub system.

**Key files updated:**

1. **docs/reference/core-concepts.md** - Rewrote Event System section
   - Explained domain events as event sourcing records
   - Documented three event sources (game, debug, platform)
   - Clarified flow: actions → domain events → event sources → text service
   - Fixed extensibility example to remove never-implemented `preventDefault`

2. **docs/guides/event-handlers.md** - Enhanced with conceptual clarity
   - Added new "Understanding Domain Events vs Handlers" section
   - Clarified handlers REACT to domain events (past tense facts)
   - Updated "Event Propagation" to "Domain Event Processing Order"
   - Maintained all existing examples with corrected context

3. **docs/guides/creating-stories.md** - Updated Event Handlers section
   - Changed intro to explain domain event vs handler distinction
   - Renamed table to "Common Domain Events to React To"
   - Emphasized reactive nature of handlers

4. **docs/architecture/adrs/adr-052-event-handlers-custom-logic.md** - Corrections
   - Removed `preventDefault` from EventResult (was never implemented)
   - Changed `emit()` to `processEvent()` returning additional events
   - Added reference to ADR-106
   - Added "Domain Events Clarification" section in Notes

5. **docs/architecture/adrs/adr-106-domain-events-and-event-sourcing.md** - NEW ADR
   - Comprehensive explanation of event sourcing pattern in Sharpee
   - Documents "things that have already happened" concept
   - Describes three event sources and their purposes
   - Clarifies domain event flow through the system
   - Distinguishes domain events from event handlers
   - Includes terminology guide to prevent future confusion

## Key Decisions

### 1. Domain Events Are Event Sourcing Records, Not Pub/Sub Messages

**Rationale**: The codebase consistently uses event sourcing terminology (append-only logs, immutable records, past tense naming) but documentation was describing pub/sub patterns (fire/handle, listeners, propagation). This caused confusion about:
- Whether events could be "prevented" (no - they're already done)
- Whether handlers "process" events (no - they react to facts)
- Whether events are "sent" to handlers (no - handlers observe event sources)

**Impact**: All documentation now uses event sourcing mental models consistently. This matches the actual implementation where events are written to event sources (game, debug, platform) and the text service reads from these sources to generate output.

### 2. Terminology Standardization

Established clear terminology:
- **Domain event**: Immutable record of a completed action (past tense: `if.event.item_taken`)
- **Event source**: Append-only log (game, debug, platform)
- **Event handler**: Code that REACTS to domain events after they're recorded
- **"Emit event"**: Write a record to an event source (not "fire a notification")
- **Event processing**: Reading from event sources to generate output

**Rationale**: Mixed terminology was causing conceptual confusion. Developers would think "emit" meant "notify handlers" when it actually means "append to log."

### 3. Created ADR-106 as Canonical Reference

Rather than just fixing scattered documentation, created a comprehensive ADR that explains the architecture, rationale, and terminology.

**Rationale**: ADRs are the authoritative source for architectural decisions. Having ADR-106 means:
- New developers have one place to learn the event model
- Other documentation can reference ADR-106
- Future changes must update/supersede ADR-106 formally
- Prevents documentation drift

## Architectural Notes

### Event Sourcing Pattern in Sharpee

The codebase implements event sourcing where:

1. **Actions generate domain events** (immutable records of what happened)
2. **Events are written to event sources** (append-only logs)
3. **Text service reads event sources** to generate natural language output
4. **Event handlers optionally react** to domain events for game state changes

This is NOT:
- Traditional pub/sub (no subscriptions, no message passing)
- Observer pattern (handlers don't "listen" to events)
- Event-driven architecture (events are records, not triggers)

### Three Event Sources

- **Game**: Player-facing events (actions, state changes)
- **Debug**: Development/debugging information
- **Platform**: Internal system events (rarely used)

Each is an append-only log. The text service reads from game and debug sources to generate output.

### Handler Flow is Separate

Event handlers are a parallel mechanism:
1. Action completes → domain event recorded to event source
2. Simultaneously → action emitter notifies handlers
3. Handlers can return additional domain events
4. Those additional events are also recorded

This allows game logic to react to events without treating the event system as pub/sub.

## Notes

**Session duration**: ~45 minutes

**Approach**:
- Identified the conceptual mismatch between code and documentation
- Created comprehensive ADR-106 first to establish the correct model
- Updated documentation files to reference and align with ADR-106
- Removed incorrect concepts (preventDefault)
- Standardized terminology across all files

**Files Modified** (6 files):
- `docs/architecture/adrs/adr-106-domain-events-and-event-sourcing.md` - NEW
- `docs/architecture/adrs/adr-052-event-handlers-custom-logic.md` - Updated
- `docs/reference/core-concepts.md` - Rewrote Event System section
- `docs/guides/event-handlers.md` - Added conceptual clarity
- `docs/guides/creating-stories.md` - Updated Event Handlers section
- `docs/context/session-20260119-0912-feature-event-simplification.md` - NEW (this file)

**Impact**: This documentation clarification removes a major source of confusion about how events work in Sharpee. Developers will now understand:
- Events are facts, not requests
- Handlers react to facts, they don't process them
- The event sourcing pattern is intentional, not accidental architecture

---

**Progressive update**: Session completed 2026-01-19 09:12
