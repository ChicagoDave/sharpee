ADR-090 Capability Dispatch - Review

  The Good

  1. Clean abstraction: createCapabilityDispatchAction() is elegant - just 6 lines to define a new capability-dispatching action:
  export const loweringAction = createCapabilityDispatchAction({
    actionId: IFActions.LOWERING,
    group: 'manipulation',
    noTargetError: 'if.lower.no_target',
    cantDoThatError: 'if.lower.cant_lower_that'
  });
  2. Follows existing patterns: Behaviors use the same 4-phase pattern (validate/execute/report/blocked) as stdlib actions. No new concepts to learn.
  3. Proper separation: Traits declare capabilities, behaviors implement mutations, registry binds them. Story code stays in story, platform code stays in platform.
  4. Registry with guards: hasCapabilityBehavior() check prevents double-registration errors in test runs where global state persists.
  5. Good test coverage: 13 transcript tests verify the basket elevator works correctly including edge cases (already up/down, aliases like "lift").

  ---
  The Bad

  1. Temp flag hack: Uses (entity as any)._lastMoveTransportedPlayer to pass state between execute and report phases. Should use the behavior's return value or a proper context object.
  2. ~~sharedData coupling~~: **FIXED** - Now uses ValidationResult.data to pass trait/behavior/entityId from validate() to execute/report phases. Clean data flow, no side effects.
  3. workspace:* gotcha: The module duplication bug (file: vs workspace:) was a subtle trap. It works now but could bite future story authors.
  4. No compile-time safety: ADR describes a type-safe EntityBuilder with compile-time capability conflict detection. Not implemented - conflicts are runtime only.

  ---
  The Ugly

  1. Template interpolation broken: {target:cap} shows literally instead of "Basket" in "already lowered" messages. Tests pass only because they check for "already" substring. Users see broken output.
  2. Dual event emission: Behaviors emit both if.event.lowered and action.success. The relationship between these isn't clear - feels like belt-and-suspenders.
  3. No debug event: ADR mentions debug.capability.dispatched for troubleshooting, but it's not implemented. When something goes wrong, tracing dispatch is opaque.

  ---
  Verdict

  Solid B+. The core pattern is sound and the basket elevator proves it works. The main issues are polish items (temp flag, template bug) not architectural problems. Good foundation for Mirror pole and other Dungeo entities
