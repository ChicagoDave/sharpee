# Next Chat: Implement Language-Agnostic Actions

## Context
We've identified that several actions in the stdlib (pulling, pushing, turning, etc.) are using English string detection to determine object behaviors, which violates our language-agnostic design principles. We've documented this in ADR-038.

## Current Status
- ADR-003 written and accepted
- Identified problem actions: pulling.ts, pushing.ts, turning.ts, and likely others
- Test failures in pulling-golden.test.ts partially due to this issue

## Next Steps
1. Define behavioral traits in world-model (PULLABLE, PUSHABLE, TURNABLE, etc.)
2. Refactor pulling.ts to use traits instead of string detection
3. Update pulling-golden.test.ts to use explicit traits
4. Identify and fix other actions with similar issues

## Key Files
- `/decisions/adr-038-language-agnostic-actions.md` - The ADR
- `/packages/stdlib/src/actions/standard/pulling.ts` - First action to refactor
- `/packages/stdlib/tests/unit/actions/pulling-golden.test.ts` - Tests to update
- `/packages/world-model/src/traits/` - Where to add new trait types

## Design Decision
Objects must explicitly declare behaviors through traits rather than relying on name/description detection.

## Example Pattern
```typescript
// Instead of: if (name.includes('lever'))
// Use: if (target.has(TraitType.PULLABLE))
```
