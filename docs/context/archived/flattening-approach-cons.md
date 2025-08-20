# Cons of the Flattening Approach

## 1. Data Duplication
- **Problem**: Same data exists in multiple places
  - `command.verb` duplicates `command.parsed.structure.verb.text`
  - `command.extras` duplicates `command.parsed.extras`
- **Risk**: They could get out of sync if modified
- **Impact**: Confusion about which is the "source of truth"

## 2. Increased Interface Size
- **Problem**: IValidatedCommand gets bigger with more fields
- **Risk**: Interface bloat - where do we stop adding convenience fields?
- **Impact**: Less clear what's essential vs convenience

## 3. Mixing Abstraction Levels
- **Problem**: IValidatedCommand now has both:
  - High-level concepts (actionId, directObject)
  - Low-level parser details (verb text, extras)
- **Risk**: Violates single responsibility principle
- **Impact**: Interface serves multiple purposes, harder to reason about

## 4. Parser Coupling Still Exists
- **Problem**: We're still exposing parser concepts, just at a higher level
  - "extras" is a parser implementation detail
  - Different parsers might not have "extras"
- **Risk**: Not really solving the abstraction problem, just making it shallower
- **Impact**: Still coupled to this specific parser's way of thinking

## 5. Type Safety Not Improved
- **Problem**: `extras: Record<string, any>` is still untyped
- **Risk**: Actions still doing `extras?.direction as string`
- **Impact**: No compile-time safety for the most commonly accessed data

## 6. Migration Debt
- **Problem**: Creates technical debt during migration
  - Some actions use `command.verb`
  - Others still use `command.parsed.structure.verb.text`
- **Risk**: Inconsistent codebase, two ways to do the same thing
- **Impact**: Confusion for developers, harder to maintain

## 7. Doesn't Address Root Cause
- **Problem**: Actions still know about parser internals via extras
- **Risk**: If we change parser, extras structure might change
- **Impact**: Actions break if parser implementation changes

## 8. Validator Complexity
- **Problem**: Validator now has to:
  - Resolve entities (its main job)
  - Extract and flatten parser fields (additional responsibility)
- **Risk**: Validator becomes a translation layer
- **Impact**: More complex validator, harder to test

## 9. False Sense of Decoupling
- **Problem**: Looks like we've decoupled from parser, but haven't really
- **Risk**: Future developers think it's OK to add more parser-specific fields
- **Impact**: Problem gets worse over time

## 10. Performance Overhead
- **Problem**: Creating new object with duplicated data
- **Risk**: Memory usage increases (though minimal)
- **Impact**: Negligible, but still unnecessary work

## Alternative Perspectives

### What if actions shouldn't have this data at all?
Maybe the real problem is that actions are making decisions based on:
- Which verb was used ("drop" vs "discard")
- Raw extras from parser

Should these be different actions instead?
- `dropping` vs `discarding` actions
- `going-north` vs parameterized `going` with direction

### What if we need semantic interpretation?
Instead of exposing parser data, maybe we need:
- Semantic properties: `command.isCareless` instead of checking verb === "discard"
- Enumerated values: `command.movementDirection: Direction.NORTH` instead of `extras.direction`

### What if the validator should do more?
Perhaps the validator should:
- Fully interpret the command into semantic meaning
- Not just resolve entities, but resolve ALL parameters
- Produce a fully semantic command with no parser remnants

## The Fundamental Question

**Are we patching symptoms or fixing the disease?**

The disease is: Actions are coupled to parser implementation details.

The flattening approach:
- Makes the coupling less deep (1 level instead of 3)
- But doesn't remove the coupling
- Might make it harder to see the coupling exists

## A Different Perspective

What if the real issue is that we're trying to preserve too much compatibility? 

Since we're greenfield:
- Could we redesign how actions get their parameters?
- Could we make extras strongly typed per action?
- Could we eliminate the need for actions to know about verb variations?

The flattening approach works, but it might be missing an opportunity for a cleaner architecture.