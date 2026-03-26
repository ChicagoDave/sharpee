# Plan: ISSUE-067 — Trace commands as individual literal patterns

## Problem
10 individual `.define()` grammar rules for what is one command with two optional parameters (subsystem + on/off).

## Scope
- Severity: Low
- Component: parser-en-us (grammar.ts)
- Blast radius: None — no Dungeo transcripts use trace commands

## Steps

1. **Read current trace grammar patterns**
   - Find all trace-related `.define()` calls in grammar.ts
   - Confirm all map to `author.trace`

2. **Read the trace action handler**
   - Find where `author.trace` is handled
   - Understand how it currently parses the subsystem and state from the matched pattern
   - Likely: the action receives the full command string and parses it, or the grammar passes slot values

3. **Design the parameterized pattern**
   - Option A: Vocabulary slots — `trace [:subsystem] [:state]` with vocabulary `parser|validation|system|all` and `on|off`
   - Option B: Text slot with validation in the action — `trace :args...` and parse in handler
   - Option A is cleaner if the grammar supports vocabulary slots; Option B is simpler

4. **Implement**
   - Replace 10 `.define()` calls with 1 parameterized pattern
   - Update the trace action handler to accept slot values instead of pattern matching
   - Handle defaults: `trace` alone = toggle all, `trace parser` = toggle parser, etc.

5. **Test**
   - Manually test: `trace`, `trace on`, `trace off`, `trace parser on`, `trace parser off`
   - Test: `trace system on`, `trace validation off`, `trace all on`
   - Verify: invalid subsystems are handled gracefully

## Effort Estimate
Small — < 1 session. Straightforward grammar refactor.

## Dependencies
None.

## Risks
- Must ensure the action handler can extract slot values from the new pattern
- If vocabulary slots aren't supported, may need to use text slots with validation
- Zero Dungeo transcript risk since no tests use trace commands
