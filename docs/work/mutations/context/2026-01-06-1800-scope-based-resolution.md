# Work Summary: ADR-090 Scope-Based Resolution

**Date**: 2026-01-06
**Status**: ADR ACCEPTED

## Change

Replaced `capabilityPriority` (arbitrary static numbers on traits) with scope-based resolution using the parser's existing scope math.

## Rationale

User feedback: "capability conflicts should be resolved by scope math"

The key insight is that the parser already resolves which entity a command refers to using scope rules:
- **Proximity**: held > in room > visible
- **Recency**: most recently referred-to wins ties
- **Specificity**: more constrained scope wins

By the time capability dispatch runs, the parser has already picked which entity. That entity should have exactly one trait claiming the capability.

## Changes Made

### ADR-090

1. **Removed `capabilityPriority`** from trait example
2. **Simplified `findTraitWithCapability()`** - no longer collects/sorts by priority
3. **Added "Capability Conflict Resolution: Scope Math" section** explaining:
   - How parser scope math already exists
   - How it applies to capability dispatch
   - Edge case handling (multiple traits on same entity = authoring error)
   - Benefits comparison table

### Assessment

Marked "Multiple capability conflict resolution" as ✅ RESOLVED with note that scope math handles entity resolution before capability dispatch runs.

## Benefits

| Aspect | Priority Numbers | Scope Math |
|--------|------------------|------------|
| Based on | Hardcoded trait values | Actual game state |
| Coordination | Authors must coordinate | Automatic |
| Predictability | Arbitrary | Matches noun resolution |
| Player intuition | Opaque | "Same rules as noun picking" |

## Additional Change: Type-Safe Entity Builder

Added compile-time enforcement for "one trait per capability" using a builder pattern with phantom types:

```typescript
// Compile error on duplicate capabilities
const badEntity = createEntity(world, 'bad', EntityType.OBJECT)
  .add(new BasketElevatorTrait({ /* ... */ }))  // claims: lowering, raising
  .add(new MirrorPoleTrait({ /* ... */ }))      // also claims: lowering
  //    ^^^ Type error: CapabilityConflictError<'if.action.lowering'>
  .build();
```

Key components:
- `TraitCapabilities<T>` - extracts capability strings as union type
- `Overlap<A, B>` - detects overlapping string unions
- `CapabilityConflictError<Cap>` - branded error type
- `EntityBuilder<ClaimedCapabilities>` - accumulates capabilities through chain
- Runtime check as backup for JS consumers

Requires `as const` on capability declarations for type inference.

## Assessment Items Resolved

All "Must Address" items from the assessment are now resolved:

| Item | Resolution |
|------|------------|
| Type-safe trait→behavior binding | `TraitBehaviorBinding<T>` + `EntityBuilder` with compile-time checks |
| Multiple capability conflict resolution | Scope math (parser handles entity resolution) |
| Standard behavior interface | `CapabilityBehavior` with 4-phase pattern |
| Document capability dispatch verbs | "Capability Dispatch Verbs" section with tables |
| Reduce sharedData usage | `ValidationResult.data` pattern in stdlib example |
| NPC action dispatch | `actorId` parameter in all behavior methods |

## Final Decisions

1. **Debugging**: Fire `debug.capability.dispatched` event when debug mode enabled
2. **Before/after hooks**: Deferred - action-level hooks (ADR-052) may suffice; revisit if needed

## Next Steps

ADR-090 is ACCEPTED with all assessment items resolved. Ready for Phase 1 implementation:

1. Add `static capabilities: readonly string[]` to Trait base class
2. Add `findTraitWithCapability()` and `hasCapability()` helpers
3. Add `CapabilityBehavior` interface and trait-behavior registry
4. Add type-safe `EntityBuilder` with compile-time capability conflict detection
5. Add runtime capability conflict check as backup
