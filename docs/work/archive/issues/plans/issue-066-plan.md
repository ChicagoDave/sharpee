# Plan: ISSUE-066 — Entering/exiting grammar explosion

## Problem
14+ individual `.define()` patterns for entering/exiting actions because `.forAction()` doesn't support phrasal verbs (multi-word verb phrases like "get in", "climb into").

## Scope
- Severity: Low
- Component: parser-en-us (grammar.ts)
- Blast radius: 51 transcript files use entering/exiting commands (141 occurrences)

## Steps

1. **Read the current grammar patterns**
   - `packages/parser-en-us/src/grammar.ts` — find all entering/exiting `.define()` calls
   - Count exact patterns and their constraints

2. **Read the `.forAction()` implementation**
   - `packages/parser-en-us/src/` — understand how `.forAction()` generates rules
   - Identify why it only accepts single-word verbs
   - Determine what needs to change to support phrasal verbs

3. **Design the `.phrasalVerbs()` extension**
   - Add to the grammar builder: `.phrasalVerbs(['get in', 'get into', 'climb in', ...])`
   - Each phrasal verb generates a pattern like the current `.define()` does
   - The pattern + constraint + action mapping come from the builder context

4. **Implement**
   - Extend the grammar builder API with `.phrasalVerbs()`
   - Update `.build()` to generate rules for both `.verbs()` and `.phrasalVerbs()`
   - Phrasal verbs get the same constraints and action mapping as single-word verbs

5. **Refactor entering/exiting patterns**
   - Replace 14+ `.define()` calls with 2 `.forAction()` calls using `.phrasalVerbs()`
   - Keep vehicle variants (board, disembark) if they have different constraints

6. **Test**
   - Run stdlib grammar tests
   - Run all 51 transcript files that use entering/exiting
   - Test the inflatable boat scenario (dynamic EnterableTrait)
   - Test the basket, balloon, and bucket scenarios
   - Verify priority/confidence is preserved

## Effort Estimate
Medium — 1 session. Grammar builder extension + pattern refactor.

## Dependencies
- None technically, but should be done after ISSUE-057 (parser changes) to avoid merge conflicts in grammar.ts

## Risks
- Phrasal verb patterns must generate identical grammar rules to the current `.define()` calls
- Priority ordering between phrasal verbs and single-word verbs needs testing
- The inflatable entering interceptor dynamically adds/removes EnterableTrait — test this path
