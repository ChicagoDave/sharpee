# Plan: ISSUE-057 — Multi-word aliases don't resolve in the parser

## Problem
Entity aliases with spaces (e.g., "bush babies", "brass lantern") don't resolve when used in player commands. The parser's tokenization or slot-matching splits multi-word aliases into separate tokens and fails to match them as a single entity reference.

## Scope
- Severity: Medium (highest player-visible impact)
- Component: parser-en-us
- Blast radius: 171 alias declarations across 22 Dungeo files

## Steps

1. **Trace the parser pipeline for a multi-word alias**
   - Follow the six-stage pipeline from CLAUDE.md: tokenization -> grammar matching -> slot consumption -> parsed command -> validation/disambiguation -> action execution
   - Identify exactly where multi-word aliases fail
   - Likely failure point: slot consumption — the parser consumes one token for `:target` instead of trying multi-token matches

2. **Read the entity resolution code**
   - `packages/parser-en-us/src/scope-evaluator.ts` — `findEntitiesByName()`
   - `packages/parser-en-us/src/english-parser.ts` — how slots consume tokens
   - Understand how single-word aliases currently match

3. **Design the fix**
   - The parser needs to try longer token sequences when matching entity names
   - Approach A: Greedy slot matching — for `:target` slots, try consuming N tokens, then N-1, etc., and check each against entity names/aliases
   - Approach B: Pre-index multi-word aliases and use a lookahead during slot consumption
   - Approach C: Use the entity vocabulary to inform the tokenizer about multi-word phrases
   - Must not break existing single-word matching or introduce ambiguity

4. **Implement the fix**
   - Modify slot consumption to support multi-token entity matching
   - Ensure grammar constraints (`.where()` predicates) still apply
   - Handle edge cases: "brass lantern" where "brass" could also be an adjective

5. **Write tests**
   - Unit test: multi-word alias resolves for `examine bush babies`
   - Unit test: multi-word name resolves for `take brass lantern`
   - Unit test: single-word alias still works alongside multi-word
   - Unit test: disambiguation when multi-word alias overlaps with other entities

6. **Regression test against Dungeo**
   - Run full walkthrough chain
   - Run all unit transcripts
   - Specifically test entities with multi-word aliases: "brass lantern", "nasty knife", "jeweled egg", etc.

7. **Also fixes ISSUE-061**
   - ISSUE-061 (multi-word names in story grammar `:thing` slots) has the same root cause
   - Verify the fix applies to story grammar patterns too, not just stdlib grammar

## Effort Estimate
Medium-large — 1-2 sessions. Requires careful parser work with extensive regression testing.

## Dependencies
None.

## Risks
- Parser performance: trying multiple token lengths for every slot could slow parsing
- Ambiguity: "put brass lantern on brass table" — parser must correctly identify two multi-word entities
- Breaking existing behavior: some commands may currently work by accident due to single-word fallbacks
- The GDT `:arg...` greedy slot workaround shows the parser already has *some* multi-token support — leverage that
