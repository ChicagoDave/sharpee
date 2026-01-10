# Parser Refactor Plan: Trait-Based Semantic Constraints

**Date**: 2026-01-10
**Status**: Draft
**Branch**: dungeo

## Problem Statement

The parser conflates two separate concerns:

1. **Scope** (visibility/reachability) - determined by world state
2. **Semantic constraints** (what kind of entity) - declared by grammar

Currently, grammar patterns like this mix both:
```typescript
grammar
  .define('board :vehicle')
  .where('vehicle', (scope) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
```

This is wrong because:
- Grammar declares `.visible()` - but parser should determine visibility from world state
- `.matching({ enterable: true })` checks `entity.enterable` property - but entities have **traits**, not boolean properties
- The boat has `VehicleTrait` but `entity.enterable` may be undefined

## Desired Architecture

**Grammar declares only semantic constraints:**
```typescript
grammar
  .define('board :target')
  .hasTrait(TraitType.VEHICLE)
  .mapsTo('if.action.entering')
```

**Parser automatically handles:**
1. Find all entities with required trait
2. Filter by visibility (from `world.getVisibleEntities()`)
3. Filter by reachability if action requires touch
4. Handle implicit takes if needed (player says "eat apple" but apple is on table)
5. Disambiguate if multiple matches ("Do you mean the red boat or the blue boat?")

---

## Current Architecture Analysis

### Grammar Pattern Flow
```
grammar.ts defines pattern
    -> PatternBuilder.where(slot, scopeConstraint)
    -> ScopeBuilderImpl builds ScopeConstraint
    -> entity-slot-consumer evaluates constraints
    -> ScopeEvaluator.findEntitiesByName() filters entities
```

### Key Files
| File | Current Role |
|------|--------------|
| `packages/if-domain/src/grammar/grammar-builder.ts` | PatternBuilder, ScopeBuilder interfaces |
| `packages/if-domain/src/grammar/scope-builder.ts` | ScopeBuilderImpl with `.visible()`, `.matching()` |
| `packages/parser-en-us/src/scope-evaluator.ts` | Evaluates scope constraints against world |
| `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` | Resolves entity slots during parsing |
| `packages/parser-en-us/src/grammar.ts` | All grammar pattern definitions |

### Current Scope Methods
- `.visible()` - sets base to visible entities
- `.touchable()` - sets base to touchable entities
- `.carried()` - sets base to carried items
- `.matching({ prop: value })` - filters by entity property (NOT trait)

### The `.matching()` Problem

In `scope-evaluator.ts:149-156`:
```typescript
// Property constraint - checks entity[key] === value
for (const [key, value] of Object.entries(filter)) {
  const entityValue = (entity as any)[key];
  if (entityValue !== value) {
    return false;
  }
}
```

This checks `entity.enterable`, but traits don't expose themselves as direct properties. The boat has:
- `boat.has(TraitType.VEHICLE)` = true
- `boat.enterable` = undefined (unless getter exists)

---

## Implementation Plan

### Phase 1: Add `.hasTrait()` to Grammar API

**Goal**: Allow grammar to declare trait requirements cleanly.

**Changes to `packages/if-domain/src/grammar/grammar-builder.ts`:**

```typescript
// Add to PatternBuilder interface
export interface PatternBuilder {
  // ... existing methods ...

  /**
   * Require matched entity to have a trait
   * @param traitType TraitType constant (e.g., TraitType.VEHICLE)
   */
  hasTrait(traitType: string): PatternBuilder;

  /**
   * Require matched entity for a specific slot to have a trait
   * @param slotName The slot name from pattern
   * @param traitType TraitType constant
   */
  hasTrait(slotName: string, traitType: string): PatternBuilder;
}
```

**Changes to `packages/if-domain/src/grammar/scope-builder.ts`:**

```typescript
// Add to ScopeConstraint
export interface ScopeConstraint {
  base: 'visible' | 'touchable' | 'carried' | 'nearby' | 'all';
  filters: Array<PropertyConstraint | FunctionConstraint>;
  traitFilters: string[];  // NEW: required trait types
  explicitEntities: string[];
  includeRules: string[];
}

// Add to ScopeBuilderImpl
hasTrait(traitType: string): ScopeBuilder {
  this.constraint.traitFilters.push(traitType);
  return this;
}
```

### Phase 2: Update ScopeEvaluator for Trait Filtering

**Changes to `packages/parser-en-us/src/scope-evaluator.ts`:**

```typescript
static getEntitiesInScope(constraint: ScopeConstraint, context: GrammarContext): IEntity[] {
  // ... existing base scope logic ...

  // Apply property filters (existing)
  for (const filter of constraint.filters) {
    entities = entities.filter(entity => this.matchesFilter(entity, filter, context));
  }

  // NEW: Apply trait filters
  if (constraint.traitFilters?.length > 0) {
    entities = entities.filter(entity =>
      constraint.traitFilters.every(traitType =>
        typeof entity.has === 'function' && entity.has(traitType)
      )
    );
  }

  // ... rest of method ...
}
```

### Phase 3: Make Visibility Implicit

**Key Change**: Parser should automatically filter by visibility without grammar declaring it.

**Changes to `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts`:**

When evaluating slot constraints:
1. If grammar provides explicit scope base (`.touchable()`, `.carried()`), use it
2. If grammar only provides trait filters, default to `'visible'` scope
3. Always apply trait filters after scope filtering

```typescript
private evaluateSlotConstraints(...) {
  // Build scope constraint
  const scopeConstraint = scope.build();

  // Default to visible if no explicit base and we have trait filters
  if (scopeConstraint.base === 'all' && scopeConstraint.traitFilters?.length > 0) {
    scopeConstraint.base = 'visible';
  }

  // Find matching entities
  const matchingEntities = ScopeEvaluator.findEntitiesByName(
    slotText, scopeConstraint, context
  );

  // ... rest of method ...
}
```

### Phase 4: Update Grammar Patterns

**Changes to `packages/parser-en-us/src/grammar.ts`:**

Replace all `.matching({ property: true })` with `.hasTrait()`:

| Before | After |
|--------|-------|
| `.matching({ enterable: true })` | `.hasTrait(TraitType.ENTERABLE)` or `.hasTrait(TraitType.VEHICLE)` |
| `.matching({ portable: true })` | `.hasTrait(TraitType.PORTABLE)` |
| `.matching({ openable: true })` | `.hasTrait(TraitType.OPENABLE)` |
| `.matching({ switchable: true })` | `.hasTrait(TraitType.SWITCHABLE)` |
| `.matching({ container: true })` | `.hasTrait(TraitType.CONTAINER)` |
| `.matching({ supporter: true })` | `.hasTrait(TraitType.SUPPORTER)` |
| `.matching({ animate: true })` | `.hasTrait(TraitType.ACTOR)` or `.hasTrait(TraitType.NPC)` |

**Example migration:**

Before:
```typescript
grammar
  .define('board :vehicle')
  .where('vehicle', (scope: ScopeBuilder) => scope.visible().matching({ enterable: true }))
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();
```

After:
```typescript
grammar
  .define('board :target')
  .hasTrait('target', TraitType.VEHICLE)
  .mapsTo('if.action.entering')
  .withPriority(100)
  .build();
```

### Phase 5: Add Disambiguation Support

**Goal**: When multiple entities match, ask user to clarify.

**New type in `packages/if-domain/src/grammar/grammar-builder.ts`:**

```typescript
export interface DisambiguationNeeded {
  type: 'disambiguation';
  question: string;
  options: Array<{
    entityId: string;
    displayName: string;
  }>;
  originalInput: string;
  slotName: string;
}
```

**Changes to entity resolution flow:**
1. If multiple entities match after trait + visibility filtering
2. Try auto-disambiguation (adjectives, context)
3. If still ambiguous, return `DisambiguationNeeded` result
4. Engine/client prompts user, re-parses with selection

### Phase 6: Add Implicit Takes

**Goal**: Auto-take items when needed for an action.

**Implementation location**: Engine turn cycle or action validation phase.

**Event**: `if.events.implicit-take` (distinct from regular `if.events.take`)

**Logic:**
1. Action declares if it requires carried item (e.g., `EAT`, `INSERT`, `WEAR`)
2. If referenced entity is not carried but is takeable and reachable
3. Attempt implicit TAKE with `if.events.implicit-take`
4. TAKE goes through full validate/blocked phases
5. If TAKE succeeds: report "(first taking the X)" then proceed with main action
6. If TAKE blocked: report the TAKE's blocked message, main action never executes

**Success Example:**
```
> eat apple
(first taking the apple)
You eat the apple. Delicious!
```

**Failure Examples:**
```
> eat apple
You reached for the apple, but a small gnome slashes at your hand, leaving you hungry and desperate.

> eat apple
The apple is stuck to the table.
```

**Key Points:**
- Implicit take is a real action attempt with full blocked-phase semantics
- The blocked message comes from whatever prevented the take (authored or generic)
- Authors can hook into `if.events.implicit-take` specifically (e.g., gnome only attacks on implicit takes, not explicit TAKE commands)
- The original action's failure doesn't need separate reporting - the blocked take IS the response

---

## Patterns to Migrate

### Entering/Exiting (Lines 570-690)
- `enter :portal` - `.hasTrait(TraitType.ENTERABLE)`
- `get in :portal` - `.hasTrait(TraitType.ENTERABLE)`
- `board :vehicle` - `.hasTrait(TraitType.VEHICLE)`
- `get on :vehicle` - `.hasTrait(TraitType.VEHICLE)`
- `exit :container` - `.hasTrait(TraitType.ENTERABLE)`
- `disembark :vehicle` - `.hasTrait(TraitType.VEHICLE)`

### Container Operations (Lines 130-160)
- `put :item in :container` - item: `.hasTrait(TraitType.PORTABLE)`, container: `.hasTrait(TraitType.CONTAINER)`
- `put :item on :supporter` - item: `.hasTrait(TraitType.PORTABLE)`, supporter: `.hasTrait(TraitType.SUPPORTER)`

### Taking/Dropping (Lines 90-130)
- `take :item` - `.hasTrait(TraitType.PORTABLE)`
- `pick up :item` - `.hasTrait(TraitType.PORTABLE)`

### Opening/Closing (Lines 205-220)
- `open :door` - `.hasTrait(TraitType.OPENABLE)`
- `close :door` - `.hasTrait(TraitType.OPENABLE)`

### Switching (Lines 220-235)
- `turn on :device` - `.hasTrait(TraitType.SWITCHABLE)`
- `switch off :device` - `.hasTrait(TraitType.SWITCHABLE)`

### Communication (Lines 390-430)
- `give :item to :recipient` - recipient: `.hasTrait(TraitType.ACTOR)`
- `show :item to :recipient` - recipient: `.hasTrait(TraitType.ACTOR)`

---

## Design Decisions

### Q1: Remove `.visible()`, `.touchable()` from grammar API?

**Decision**: Keep as optional overrides.

**Rationale**: Default behavior should be implicit visibility, but some actions need explicit scope:
- `DROP` requires `.carried()` - can only drop what you're holding
- `SMELL` might work across rooms - `.nearby()` override

### Q2: Where do implicit takes happen?

**Decision**: Engine turn cycle or action validation phase.

**Rationale**: Parser's job is to understand intent. Engine handles action sequencing. When an action requires a carried item and the item isn't carried:
1. Attempt implicit take with `if.events.implicit-take`
2. Full validate/blocked phases execute
3. If blocked, report the take's blocked message (authored or generic)
4. If successful, report "(first taking the X)" and proceed with main action
5. Authors can hook `if.events.implicit-take` for special behavior

### Q3: How does disambiguation work?

**Decision**: Return special result type, prompt user.

**Rationale**: Parser returns `DisambiguationNeeded` when multiple matches. Engine/client shows options. User types number or name. Re-parse with explicit entity.

### Q4: What about `.isCarried()` constraint?

**Decision**: No - being carried is location, not trait.

**Rationale**: Use `requiresScope(ScopeLevel.CARRIED)` on PatternBuilder for actions requiring carried items.

---

## Verification

### Test Cases

1. **"board boat"** - Should parse when boat has VehicleTrait and is visible
2. **"board boat"** - Should fail with "no vehicle here" when boat not visible
3. **"board boat"** - Should disambiguate when multiple vehicles present
4. **"eat apple"** - Should implicit-take apple from table, then eat
5. **"take lamp"** - Should work with PortableTrait

### Transcript Tests

```
> board boat
You board the inflatable boat.

> board
What do you want to board?

> board statue
You can't board that.
```

### Running Tests

```bash
# Unit tests
pnpm --filter '@sharpee/parser-en-us' test

# Integration tests
node packages/transcript-tester/dist/cli.js stories/dungeo --all

# Interactive testing
./scripts/play-dungeo.sh
```

---

## Migration Strategy

### Stage 1: Non-Breaking Additions
1. Add `hasTrait()` to PatternBuilder interface
2. Add `traitFilters` to ScopeConstraint
3. Update ScopeEvaluator to handle trait filters
4. **All existing patterns continue working**

### Stage 2: Migrate Patterns
1. Update patterns one-by-one to use `hasTrait()`
2. Remove `.visible()` from patterns that don't need explicit scope
3. Keep `.matching()` working for backward compatibility

### Stage 3: Add Features
1. Implement disambiguation flow
2. Implement implicit takes
3. Add comprehensive tests

### Stage 4: Cleanup
1. Remove deprecated `.matching({ property: true })` patterns
2. Update documentation
3. Consider deprecation warnings for old API

---

## Files to Modify

| File | Changes |
|------|---------|
| `packages/if-domain/src/grammar/grammar-builder.ts` | Add `hasTrait()` to PatternBuilder |
| `packages/if-domain/src/grammar/scope-builder.ts` | Add `traitFilters`, implement `hasTrait()` |
| `packages/parser-en-us/src/scope-evaluator.ts` | Add trait filtering logic |
| `packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts` | Default to visible scope |
| `packages/parser-en-us/src/grammar.ts` | Migrate ~30 patterns |
| `packages/stdlib/src/validation/command-validator.ts` | Disambiguation, implicit takes |
| `packages/engine/src/turn-cycle/` | Execute implicit takes |

---

## Open Questions

1. Should ENTERABLE and VEHICLE be separate traits, or should vehicles automatically be enterable?
2. How should "examine" work - visible or touchable scope?
3. Should disambiguation limit to N options (e.g., 5)?
