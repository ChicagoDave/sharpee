# Work Summary: ADR-090 Verb Categorization and Extension Vectors

**Date**: 2026-01-06
**Status**: ADR Updated - Ready for review

## Session Focus

Refined ADR-090 to clarify which verbs use capability dispatch and how the pattern aligns across extension vectors.

## Key Decisions Made

### 1. Verb Categorization

**Fixed Semantics (NO capability dispatch):**
- TAKE, DROP, OPEN, CLOSE, LOCK, UNLOCK, WEAR, REMOVE, SWITCH ON/OFF, EAT, DRINK, ENTER, EXIT, PUT
- The mutation is the same for all entities with the right trait
- Traits determine IF it can happen; stdlib determines WHAT happens

**No Standard Semantics (USE capability dispatch):**
- LOWER, RAISE/LIFT, TURN, WAVE, RING, WIND, RUB, PLAY, BLOW
- Each entity defines what the verb means for it
- Story provides trait + behavior; stdlib provides dispatch action

**Edge Cases:**
- PUSH/PULL have standard semantics (move object) but special uses (activate button/lever)
- Standard action handles common case; capability traits handle special cases

### 2. Extension Vector Alignment

**The Key Principle: Stdlib owns verbs, extensions own behaviors.**

| Vector | Creates | Uses |
|--------|---------|------|
| Stdlib | Capability-dispatch actions (`if.action.lowering`) | - |
| Story | Traits claiming capabilities + Behaviors | Stdlib dispatch actions |
| Third-Party | Same as story | Stdlib dispatch actions |

For story-specific verbs (SAY, INCANT), stories create full actions - no need for capability dispatch.

### 3. Stdlib Scope Clarification

User clarified: "stdlib is strictly a cultivated set of Traits, Behaviors, and Actions to enable most IF development"

This means:
- Not everything goes in stdlib
- stdlib covers common patterns, extensions fill gaps
- Capability-dispatch actions for common "no-semantics" verbs live in stdlib

## Files Modified

- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md`
  - Added "Capability Dispatch Verbs" section with categorization tables
  - Added "Extension Vectors" section explaining alignment
  - Updated "Open Questions" to focus on remaining implementation details

## Remaining Open Questions

1. How is `capabilityPriority` surfaced in the trait base class?
2. Should capability dispatch log which trait handled an action?
3. How do before/after hooks interact with capability dispatch?

## Next Steps

1. Stakeholder review of updated ADR
2. If accepted, implement Phase 1 (core infrastructure in world-model)
3. Create lowering/raising actions in stdlib as proof of concept
4. Migrate basket and pole in Dungeo

## Context

This session built on the previous ADR-090 work which:
- Defined the trait capability pattern
- Added 4-phase CapabilityBehavior interface
- Added capabilityPriority for conflict resolution
- Provided complete basket example

The basket puzzle in Dungeo remains blocked pending ADR-090 acceptance.
