# Domain Events Documentation Clarification

**Date**: 2026-01-19
**Branch**: feature/event-simplification
**Status**: Complete

## Summary

Corrected a fundamental documentation issue where domain events (`if.event.*`) were being described using pub/sub terminology ("fire and handle") when they are actually event sourcing records - "things that have already happened."

## Problem

There was persistent confusion about the nature of `if.event.*` events:
- Documentation described them as events to be "fired and handled"
- This led to assumptions about pub/sub patterns
- The distinction between domain events (records) and event handlers (reactions) was unclear
- ADR-052 proposed `preventDefault` which was never implemented

## Solution

### Created ADR-106: Domain Events and Event Sourcing

New ADR establishing the correct mental model:
- Domain events are immutable records of completed actions (past tense)
- Three event sources: game, debug, platform
- Events flow: actions → event sources → text service
- Event handlers are a separate mechanism that REACTS to facts
- Includes terminology guide and Martin Fowler reference

### Updated Existing Documentation

| File | Changes |
|------|---------|
| `docs/reference/core-concepts.md` | Rewrote Event System section; fixed extensibility example |
| `docs/guides/event-handlers.md` | Added "Understanding Domain Events vs Handlers" section |
| `docs/guides/creating-stories.md` | Updated Event Handlers intro and table header |
| `docs/architecture/adrs/adr-052-*.md` | Removed `preventDefault`, added ADR-106 reference |

## Key Terminology Established

| Term | Meaning |
|------|---------|
| Domain Event | Immutable record of a completed action |
| Event Source | Append-only log (game, debug, platform) |
| Event Handler | Code that REACTS to domain events |
| "Emit event" | Write a record to the event source |

## Files Changed

- `docs/architecture/adrs/adr-106-domain-events-and-event-sourcing.md` (NEW)
- `docs/architecture/adrs/adr-052-event-handlers-custom-logic.md`
- `docs/reference/core-concepts.md`
- `docs/guides/event-handlers.md`
- `docs/guides/creating-stories.md`

## Key Insight

> Domain events are "things that have already happened" - they describe completed actions in past tense. Handlers REACT to these facts; they cannot prevent or undo them.

## Related Work

- Domain events migration (ADR-097 pattern) - ongoing in parallel session
- Event management simplification - `docs/work/platform/event-management.md`
