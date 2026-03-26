# Plan: ISSUE-062 — Fuse `skipNextTick` behavior undocumented at API level

## Problem
When a fuse is set via `scheduler.setFuse()`, it internally sets `skipNextTick: true`, causing a fuse with `turns: 10` to actually fire ~11 ticks after registration. This is undocumented.

## Scope
- Severity: Low (Documentation)
- Component: plugin-scheduler
- Blast radius: Documentation only — no code changes

## Steps

1. **Read the fuse implementation**
   - `packages/plugin-scheduler/src/` — find `setFuse()` and `FuseState`
   - Understand exactly when `skipNextTick` is set and why
   - Determine if this is intentional (avoids double-tick on registration turn) or a bug

2. **Document in the API reference**
   - Add a note to the `Fuse` interface documentation explaining `skipNextTick`
   - Clarify the actual timing: "A fuse with `turns: N` fires after N+1 player turns because the registration turn is skipped"
   - Or if it should be N turns, file a separate bug for the off-by-one

3. **Update genai-api docs**
   - If `plugin-scheduler` has an entry in `packages/sharpee/docs/genai-api/`, update it
   - Add the timing clarification to the `setFuse` method documentation

4. **Add a code comment**
   - In the `setFuse()` implementation, add a clear comment explaining why `skipNextTick` exists

5. **Consider whether this is actually a bug**
   - If `skipNextTick` causes unintuitive timing, maybe the fix is removing it and adjusting the turn count
   - This would be a separate issue if so — document current behavior first

## Effort Estimate
Trivial — < 30 minutes. Documentation-only.

## Dependencies
None.

## Risks
None — documentation only.
