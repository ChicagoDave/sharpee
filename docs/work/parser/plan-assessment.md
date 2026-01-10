# Parser Refactor Plan Assessment

**Author**: Claude (as IF Platform Designer)
**Date**: 2026-01-10
**Reference Systems**: TADS 3, Inform 6/7, Hugo

## Executive Summary

The proposed parser refactor aligns well with established IF platform patterns while making some intentional simplifications. The 4-tier scope system (AWARE/VISIBLE/REACHABLE/CARRIED) maps closely to TADS 3's sensory model and Inform 7's "in scope" concepts. The trait-based grammar constraints are a clean modernization that TypeScript enables.

**Overall Assessment**: Sound architecture with a few areas needing clarification.

---

## Comparison with Established Systems

### Scope Models

| System | Scope Concept | Our Equivalent |
|--------|---------------|----------------|
| **Inform 7** | "in scope" (can be referred to) | AWARE |
| **Inform 7** | "visible" (can be seen) | VISIBLE |
| **Inform 7** | "touchable" (can be touched) | REACHABLE |
| **TADS 3** | "known" (player has encountered) | AWARE |
| **TADS 3** | sensory model (see/hear/smell) | VISIBLE + future AUDIBLE |
| **Hugo** | FindObject scope | AWARE |

**Assessment**: Our 4-tier model is most similar to TADS 3's approach, which separates "known to exist" from "currently perceivable". This is more sophisticated than Inform 6's simpler binary scope, and cleaner than Inform 7's sometimes-confusing scope rules.

### Inform 7's Scope System

Inform 7 uses:
```inform7
if the noun is in scope...
if the player can see the noun...
if the player can touch the noun...
```

Our system maps directly:
- `in scope` → AWARE (entity in scope, may not be visible)
- `can see` → VISIBLE
- `can touch` → REACHABLE

**Key I7 Feature We Should Consider**: Inform 7's "deciding the scope" activity lets authors dynamically add things to scope during parsing. Our `author.setInScope()` approach is similar but less declarative.

### TADS 3's Sensory Model

TADS 3 has a rich sensory model:
```tads3
canSee(obj)      // visual perception
canHear(obj)     // auditory perception
canSmell(obj)    // olfactory perception
canReach(obj)    // physical access
isKnown(obj)     // player has encountered
```

**Assessment**: Our AWARE/VISIBLE/REACHABLE model captures the essential tiers. The plan correctly defers AUDIBLE to a future enhancement. TADS 3's `isKnown` exactly matches our AWARE concept.

**TADS 3 Innovation We're Adopting**: The separation of "known" from "visible" is a TADS 3 strength that Inform 7 lacks. A player can think about the Eiffel Tower without it being "in scope" in the I7 sense. Our AWARE tier handles this correctly.

### Hugo's Simpler Model

Hugo uses a more procedural approach:
```hugo
FindObject(obj, location)
player_character.scope
```

Hugo's simplicity is both strength and weakness. Our system is more like TADS 3/Inform 7 in sophistication, which is appropriate for a modern platform.

---

## Trait-Based Grammar Constraints

### Comparison

| System | Grammar Constraint Model |
|--------|-------------------------|
| **Inform 6** | `noun=creature` attribute checks |
| **Inform 7** | `something enterable` kind/property matching |
| **TADS 3** | `verify()` method on objects |
| **Sharpee** | `.hasTrait(TraitType.VEHICLE)` |

**Assessment**: Our approach is closest to Inform 7's "something [adjective]" pattern but with explicit trait typing. This is cleaner than Inform 6's attribute flags and more declarative than TADS 3's verify methods.

### Strengths of Our Approach

1. **Type Safety**: TraitType enum prevents typos (`VEHICEL` would fail at compile time)
2. **Composability**: Traits can be combined without class hierarchy issues
3. **Discoverability**: IDE autocomplete shows available traits
4. **Separation of Concerns**: Grammar declares what, not how

### Potential Weakness

Inform 7 allows arbitrary property matching:
```inform7
Understand "ride [something rideable]" as mounting.
```

Our system requires pre-defined traits. Should we support ad-hoc property matching too?

**Recommendation**: Keep trait-based as primary, but allow `.matching()` for edge cases:
```typescript
grammar.define('polish :target')
  .hasTrait(TraitType.PORTABLE)
  .matching({ material: 'metal' })  // ad-hoc property check
```

---

## Implicit Actions

### Comparison

| System | Implicit Action Approach |
|--------|-------------------------|
| **Inform 6** | `before` rules with `<Take noun>` |
| **Inform 7** | "Before" rules, "implicitly taking" activity |
| **TADS 3** | `preCondition` on actions |
| **Sharpee** | `if.events.implicit-take` |

**Assessment**: Our approach is most similar to TADS 3's precondition system. TADS 3 declares preconditions on action definitions:

```tads3
class EatAction: Action
    preCond = [objHeld]  // must be holding the object
;
```

The system automatically attempts implicit take if precondition fails.

### Our Design vs TADS 3

TADS 3:
```
1. Check preconditions (objHeld, objVisible, etc.)
2. If precondition fails, try implicit action
3. If implicit action succeeds, retry main action
4. If implicit action fails, report precondition failure
```

Our Design:
```
1. Action requires CARRIED scope
2. Entity is REACHABLE but not CARRIED
3. Attempt if.events.implicit-take
4. If succeeds: "(first taking the X)" + main action
5. If fails: Report take's blocked message
```

**Assessment**: Very similar. Our design correctly reports the take failure with its own message (including authored responses like the gnome), which TADS 3 also supports via `failCheck`.

### Recommendation: Precondition System

Consider formalizing preconditions like TADS 3:

```typescript
const eatAction: Action = {
  id: 'if.action.eating',
  preconditions: [
    { scope: ScopeLevel.CARRIED, implicitAction: 'if.action.taking' }
  ],
  // ...
};
```

This makes implicit actions declarative rather than scattered through code.

---

## Disambiguation

### Comparison

| System | Disambiguation Approach |
|--------|------------------------|
| **Inform 6** | `ChooseObjects` routine, manual scoring |
| **Inform 7** | "Does the player mean" rules |
| **TADS 3** | `logicalRank`, `verify()` scoring |
| **Sharpee** | Return `DisambiguationNeeded`, prompt user |

### TADS 3's Elegant Solution

TADS 3 uses a ranking system:
```tads3
verify() {
    if (!isEdible) illogical('That\'s not edible.');
    if (isDelicious) logicalRank(150);  // prefer delicious food
}
```

Actions with `illogical` responses are deprioritized. Among remaining candidates, `logicalRank` scores determine preference.

### Inform 7's Author-Friendly Approach

```inform7
Does the player mean eating the apple: it is very likely.
Does the player mean eating the wax apple: it is unlikely.
```

### Our Current Plan

We return `DisambiguationNeeded` with options and prompt the user. This is correct but incomplete.

**Recommendation**: Add author-controlled ranking before prompting:

```typescript
// Phase 1: Filter by trait (EDIBLE)
// Phase 2: Apply author preferences (real apple > wax apple)
// Phase 3: If still ambiguous, auto-select if confidence gap is high enough
// Phase 4: Otherwise, prompt user
```

Add to grammar:
```typescript
grammar.define('eat :food')
  .hasTrait(TraitType.EDIBLE)
  .prefer((entity) => entity.get(EdibleTrait)?.isDelicious ? 150 : 100)
```

Or as entity-level hints:
```typescript
apple.setDisambiguationScore('if.action.eating', 150);
waxApple.setDisambiguationScore('if.action.eating', 50);
```

---

## Scope Failure Messages

### Comparison

| System | Failure Message Approach |
|--------|-------------------------|
| **Inform 6** | Hardcoded messages, `cant_see` etc. |
| **Inform 7** | "You can't see any such thing." customizable |
| **TADS 3** | `illogical()`, `failCheck()` with messages |
| **Sharpee** | Contextual messages based on scope level |

### Assessment

Our plan for contextual failure messages is good:
- "You can't see any X here." (not visible)
- "The X is too far away." (visible but not reachable)
- "You don't have the X." (not carried)

**Recommendation**: Allow entity-specific and barrier-specific messages:

```typescript
// Entity-specific
boat.scopeFailureMessage = {
  reachable: "The boat is beached too far up the shore to reach."
};

// Barrier-specific (glass case)
case.containedScopeFailureMessage = {
  reachable: "The {entity} is locked inside the display case."
};
```

This matches TADS 3's ability to customize `cannotReachObject` per container.

---

## Areas of Concern

### 1. Parser vs Validator Responsibility

The plan mixes parser and validation concerns. In TADS 3 and Inform 7, scope is resolved in two phases:

1. **Parser Phase**: Find candidates matching grammar (in scope = AWARE)
2. **Validation Phase**: Check if action is logical (visibility, reachability)

Our plan seems to do both in the parser.

**Recommendation**: Clarify the boundary:
- Parser resolves entities from AWARE scope (can be referred to)
- Validation checks VISIBLE/REACHABLE based on action requirements
- This matches TADS 3's object resolution → verify → check flow

### 2. Multi-Object Commands

The plan doesn't address:
```
> take all
> drop everything except the lamp
> put coins in box
```

Inform and TADS handle these with:
- `all` keyword resolving to multiple entities
- Filtering by trait/scope
- Processing each entity separately

**Recommendation**: Add section on multi-object handling, or note it as future work.

### 3. Pronouns and Context

No mention of:
```
> examine the red box
> open it
```

Where "it" refers to the most recently mentioned entity.

**Recommendation**: Add pronoun resolution section. TADS 3 and Inform both track "the noun" and "the second noun" for pronoun binding.

### 4. Containers and Nested Scope

The plan doesn't fully address:
```
> look in box
> take the coin (which is in the box which is on the table)
```

How does scope propagate through container hierarchies?

**Recommendation**: Clarify that:
- Open containers expose their contents to VISIBLE
- Closed transparent containers expose contents to VISIBLE but not REACHABLE
- Closed opaque containers hide contents entirely
- This should be handled by `world.getVisibleEntities()` implementation

---

## Strengths of Our Design

### 1. TypeScript Type Safety
Unlike Inform 6/7's stringly-typed approach, our traits are type-checked. This catches errors at compile time.

### 2. Clean Separation of Grammar and Scope
Inform 7 conflates "understanding" (grammar) with scope. Our explicit `.hasTrait()` on grammar plus separate scope validation is cleaner.

### 3. Event-Based Implicit Actions
`if.events.implicit-take` allows authors to hook into the process, unlike Inform 6's monolithic approach.

### 4. 4-Tier Scope Model
More nuanced than Inform 7's binary "in scope or not", matching TADS 3's sophistication.

---

## Recommendations Summary

1. **Clarify Parser vs Validator boundary**: Parser resolves from AWARE, validator checks scope level

2. **Add disambiguation ranking**: Author-controlled preferences before prompting user

3. **Formalize preconditions**: Declare implicit action requirements on action definitions

4. **Document container scope rules**: How scope propagates through open/closed containers

5. **Address multi-object commands**: "take all", "drop everything except X"

6. **Add pronoun resolution**: Track antecedents for "it", "them", etc.

7. **Allow entity-specific failure messages**: Beyond generic scope level messages

---

## Conclusion

The parser refactor plan is architecturally sound and draws from the best aspects of TADS 3 (4-tier scope, preconditions) and Inform 7 (declarative grammar constraints). The trait-based approach is a clean modernization enabled by TypeScript.

Key areas to address before implementation:
1. Parser vs validator responsibility split
2. Disambiguation ranking system
3. Multi-object and pronoun handling

The plan is **ready for implementation** with the understanding that multi-object commands and pronoun resolution can be added as follow-up work. The core scope system and trait-based grammar are well-designed.

**Verdict**: Approve with minor clarifications needed.
