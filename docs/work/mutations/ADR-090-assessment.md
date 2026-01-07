Assessment of ADR-090: Entity-Centric Action Dispatch
Executive Summary
ADR-090 proposes a solid architectural pattern that addresses a real problem (verb routing to entity-specific logic). The approach aligns well with both TypeScript idioms and traditional IF conventions. However, there are some TypeScript type safety concerns and IF platform edge cases worth addressing.

TypeScript Perspective
Strengths

1. Static capability declaration is elegant

static readonly capabilities = ['if.action.lowering', 'if.action.raising'];

This is compile-time discoverable and makes trait contracts explicit. Good use of TypeScript's static class members.

2. Effect[] return type follows functional patterns
   Behaviors returning Effect[] rather than mutating and emitting directly is a clean functional approach that supports testing and composition.

3. Separation of validation and execution
   The canLower() / lower() split maps well to TypeScript's type narrowing patterns.

Concerns

1. Loose typing in findTraitWithCapability

export function findTraitWithCapability(entity: IFEntity, actionId: string): Trait | undefined {
for (const trait of entity.traits) {
const traitClass = trait.constructor as typeof Trait;
if (traitClass.capabilities?.includes(actionId)) {
return trait;
}
}
return undefined;
}

Issues:

Returns generic Trait, losing the specific trait type
The cast as typeof Trait is unsafe - should use a type guard
No compile-time guarantee that returned trait has the expected behavior methods
Suggested improvement:

interface CapableTrait<TAction extends string> extends Trait {
// Marker interface for traits with capabilities
}

// Or use a type predicate
function hasCapability<T extends Trait>(
trait: Trait,
actionId: string,
traitType: new (...args: any[]) => T
): trait is T {
const traitClass = trait.constructor as typeof Trait;
return traitClass.capabilities?.includes(actionId) && trait instanceof traitType;
}

2. Registry pattern lacks type safety

const traitBehaviorMap = new Map<string, BehaviorClass>();

This is stringly-typed. A behavior registered for BasketElevatorTrait could theoretically be retrieved and called on a different trait type.

Suggested improvement:

// Type-safe registry using branded types or generics
interface TraitBehaviorBinding<T extends Trait, B extends Behavior> {
traitType: string;
behavior: B;
}

// Or use TypeScript's module augmentation for trait → behavior mapping
declare module '@sharpee/world-model' {
interface TraitBehaviorMap {
[BasketElevatorTrait.type]: typeof BasketElevatorBehavior;
}
}

3. Behavior method naming inconsistency

The ADR uses verb-specific methods (canLower, lower, canRaise, raise) but the stdlib action needs to know which method to call. This creates implicit coupling:

// Action must know behavior uses `lower()` not `execute()`
const effects = behavior.lower(entity, context.world, context.player.id);

Suggested improvement: Define a standard interface:

interface CapabilityBehavior<TVerb extends string> {
validate(entity: IFEntity, world: WorldModel, playerId: string): ValidationResult;
execute(entity: IFEntity, world: WorldModel, playerId: string): Effect[];
}

// Or per-capability interfaces
interface LoweringCapability {
canLower(...): ValidationResult;
lower(...): Effect[];
}

4. sharedData usage continues context pollution pattern

context.sharedData.lowerTrait = trait;
context.sharedData.lowerBehavior = behavior;

The CLAUDE.md warns against context pollution. Consider whether validate should just return the trait/behavior in the result, or use a typed sharedData structure.

Interactive Fiction Platform Perspective
Strengths

1. Solves the classic "one verb, many meanings" problem

This is a fundamental IF challenge. In Zork, "lower" means different things for the basket vs the mirror poles. The ADR correctly identifies this as requiring dispatch based on the noun, not just the verb.

2. Aligns with Inform 7's approach (conceptually)

Instead of lowering the basket: ...
Instead of lowering the short pole: ...

The capability system achieves the same dispatch without Inform's pattern matching syntax. Story authors declare "this thing responds to lowering" and provide the logic.

3. Story extensibility without modifying stdlib

Critical for an IF platform. Authors can create new traits with new capabilities without touching engine code.

4. Grammar simplification

One pattern per verb eliminates priority conflicts. This is a significant win for parser maintainability.

Concerns

1. Multiple capabilities on same entity - undefined behavior

The ADR acknowledges this but punts:

"First match wins, document that this is undefined behavior"

In IF, this matters. Consider:

A magic lamp that's both RubbableTrait (to summon genie) and SwitchableTrait (on/off)
"rub lamp" should dispatch to RubbableTrait even though both might claim if.action.rubbing
Suggestion: Either:

Define explicit priority ordering on traits
Require disambiguation ("rub" vs "switch on")
Allow capability declarations to specify exclusivity 2. Missing validation of trait-behavior consistency

Nothing prevents registering BasketElevatorBehavior for MirrorPoleTrait. In IF, mismatches here cause confusing behavior.

Suggestion: Add runtime or compile-time checks:

// Behavior declares which trait it works with
class BasketElevatorBehavior extends Behavior {
static readonly forTrait = BasketElevatorTrait.type;
static requiredTraits = [BasketElevatorTrait.type]; // Already exists but not enforced
}

3. "Standard" vs "Custom" mutation distinction is useful but implicit

The ADR distinguishes common mutations (TAKE, OPEN) from custom ones (LOWER, TURN), but this isn't formalized. A new contributor might not know which verbs are "custom mutation verbs."

Suggestion: Document or codify which stdlib actions use capability dispatch:

// In stdlib
export const CAPABILITY_DISPATCH_ACTIONS = [
'if.action.lowering',
'if.action.raising',
'if.action.turning',
'if.action.waving',
// ... verbs with no standard semantics
] as const;

4. Event naming could use more IF-specific structure

IFEvents.LOWERED is generic. IF traditionally has richer event semantics:

Before the action (can prevent)
Instead of the action (replace)
After the action (react)
Report the action (describe)
The Effect pattern supports this, but the ADR doesn't show how story authors hook into "before lowering the basket."

Suggestion: Clarify how ADR-052 event handlers interact with capability dispatch:

// Can story do this?
world.on('if.action.lowering.before', (ctx) => {
if (ctx.target === basketId && playerHasGremlin) {
ctx.prevent('The gremlin grabs your hand!');
}
});

5. NPC implications

The ADR focuses on player actions. What happens when an NPC "lowers the basket"? Does capability dispatch work the same way?

Recommendations
Must Address Before Implementation
~~Type-safe trait→behavior binding - Add compile-time or runtime validation~~ ✅ RESOLVED: `TraitBehaviorBinding<T>` interface with `validateBinding` + type-safe `EntityBuilder` with compile-time capability conflict detection
~~Multiple capability conflict resolution - Define explicit behavior, not "first match"~~ ✅ RESOLVED: Scope math handles entity resolution; parser picks which entity before capability dispatch runs
~~Standard behavior interface - Avoid verb-specific method names in the generic dispatch~~ ✅ RESOLVED: `CapabilityBehavior` interface with standard 4-phase pattern (validate/execute/report/blocked)
Should Address
~~Document which verbs use capability dispatch - Clear guidance for story authors~~ ✅ RESOLVED: "Capability Dispatch Verbs" section with tables for Fixed Semantics vs No Standard Semantics
~~Clarify event handler interaction - How do before/after hooks work with capability dispatch?~~ ⏸️ DEFERRED: Action-level hooks (ADR-052) may suffice; revisit if real use cases emerge
~~Reduce sharedData usage - Return capability metadata from validate, not via context pollution~~ ✅ RESOLVED: Stdlib action example uses `ValidationResult.data` pattern
Nice to Have
~~NPC action dispatch - Ensure the pattern works for NPC-initiated actions~~ ✅ RESOLVED: `actorId` parameter in all behavior methods supports both player and NPC actions
~~Debugging support - Log which trait handled a capability for easier troubleshooting~~ ✅ RESOLVED: Debug event `debug.capability.dispatched` fired when debug mode enabled
Verdict
The core pattern is sound and should be accepted. Entity-centric dispatch via trait capabilities is the right architectural direction for handling verbs with no standard semantics. The pattern:

Eliminates grammar priority conflicts
Keeps logic co-located with entity definitions
Enables story extensibility without stdlib modifications
The TypeScript type safety concerns are addressable with targeted improvements to the registry and lookup mechanisms. The IF edge cases (multiple capabilities, event hooks) should be clarified in the ADR before implementation proceeds.

Recommended status: PROPOSED → ACCEPTED with revisions addressing the type safety and capability conflict issues.
