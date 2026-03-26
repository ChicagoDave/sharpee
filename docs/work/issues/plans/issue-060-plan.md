# Plan: ISSUE-060 — No "execute but don't assert" transcript assertion

## Problem
No assertion format means "run the command but always pass." Authors writing "don't care" commands (e.g., `wait` to burn turns) must use workarounds like `[OK: contains "Time passes"]`.

## Scope
- Severity: Low (DX)
- Component: transcript-tester
- Blast radius: New assertion type — no existing behavior changes

## Steps

1. **Read the assertion parser**
   - `packages/transcript-tester/src/parser.ts` — how assertions are parsed
   - Understand the existing assertion types: `[OK]`, `[OK: contains "..."]`, `[SKIP]`, etc.

2. **Design the new assertion**
   - Proposed syntax: `[RUN]` — execute the command, always pass regardless of output
   - Alternative: `[OK: any]` — more consistent with existing `[OK: ...]` syntax
   - Decision: `[RUN]` is clearer in intent and shorter to type

3. **Implement in the parser**
   - Add `RUN` as a recognized assertion type
   - When encountered: execute the command, capture output, mark as passed

4. **Implement in the runner**
   - When assertion type is `RUN`: skip all output comparison, always mark pass
   - Still execute the command (unlike `[SKIP]` which skips execution entirely)

5. **Test**
   - Write a test transcript with `[RUN]` assertions
   - Verify commands execute (state changes happen)
   - Verify assertion always passes regardless of output
   - Verify `[RUN]` doesn't interfere with `[SKIP]` or `[OK]`

6. **Document**
   - Add `[RUN]` to the transcript format reference
   - Update any transcript authoring docs

## Effort Estimate
Small — < 1 session. Simple parser + runner addition.

## Dependencies
None.

## Risks
- Overuse could mask bugs (authors using `[RUN]` when they should assert on output)
- Need clear documentation on when to use `[RUN]` vs `[OK]` vs `[SKIP]`
