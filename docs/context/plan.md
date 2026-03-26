# Plan: Fix Stdlib Golden Tests

**Status**: DONE
**Created**: 2026-03-25
**Scope**: packages/stdlib/tests/ — 352 failing tests across 42 files

## Problem

352 stdlib test failures. 37 golden test files share two root causes plus 5 non-golden files with individual issues.

### Root Cause 1: Wrong `executeAction` helper (3 variants, 2 broken)

| Variant | Count | Failure Path | Success Path |
|---------|-------|-------------|--------------|
| A (correct) | ~18 | `action.blocked(ctx, result)` | `action.report(ctx)` |
| B (broken) | 2 | `action.report(ctx, result)` — calls report instead of blocked | `action.report(ctx, result)` — passes unused param |
| C (hand-rolled) | ~15 | Manually creates `action.error` event | `action.report(ctx)` — correct call |

**Fix**: Replace all local helpers with `executeWithValidation` from test-utils.

### Root Cause 2: Wrong event type assertions

All 37 files assert on `action.success` / `action.error`. Actual actions emit domain events:
- Success: `if.event.taken`, `if.event.opened`, `if.event.dropped`, etc.
- Blocked: `if.event.take_blocked`, `if.event.open_blocked`, `if.event.drop_blocked`, etc.

**Fix**: Update assertions to match actual domain event types per the mapping below.

### Non-golden failures (5 files)

| File | Issue |
|------|-------|
| `scope-integration.test.ts` | Scope API behavior changed |
| `action-language-integration.test.ts` | Asserts `action.success`/`action.error` |
| `report-helpers.test.ts` | Asserts `action.success` |
| `command-validator-golden.test.ts` | Validator API changed |
| `quitting.test.ts` | Query system mismatch |

## Approach

### Phase 1: Fix golden test files (37 files, systematic)

Per file:
1. Remove local `executeAction`/`executeWithValidation` helper
2. Import `executeWithValidation` from `../../test-utils`
3. Replace `expectEvent(events, 'action.success', ...)` with correct domain event
4. Replace `expectEvent(events, 'action.error', ...)` with correct blocked event
5. Update event data shape where needed (messageId/reason → domain-specific data)

### Phase 2: Fix non-golden files (5 files, individual)

### Phase 3: Run full suite, verify

## Event Type Mapping

| Action | Success Event | Blocked Event |
|--------|--------------|---------------|
| about | `if.event.about_displayed` | `if.event.about_displayed` |
| attacking | `if.event.attacked` | `if.event.attacked` |
| climbing | `if.event.climbed` | `if.event.climbed` |
| closing | `if.event.closed` | `if.event.close_blocked` |
| drinking | `if.event.drunk` | `if.event.drunk` |
| dropping | `if.event.dropped` | `if.event.drop_blocked` |
| eating | `if.event.eaten` | `if.event.eaten` |
| entering | `if.event.entered` | `if.event.entered` |
| examining | `if.event.examined` | `if.event.examined` |
| exiting | `if.event.exited` | `if.event.exited` |
| giving | `if.event.given` | `if.event.give_blocked` |
| going | `if.event.went` | `if.event.went` |
| inserting | `if.event.put_in` | `if.event.insert_blocked` |
| inventory | `if.event.inventory` | `if.event.inventory` |
| listening | `if.event.listened` | `if.event.listen_blocked` |
| locking | `if.event.locked` | `if.event.lock_blocked` |
| looking | `if.event.looked` | `if.event.looked` |
| opening | `if.event.opened` | `if.event.open_blocked` |
| pulling | `if.event.pulled` | `if.event.pulled` |
| pushing | `if.event.pushed` | `if.event.pushed` |
| putting | `if.event.put_in`/`if.event.put_on` | `if.event.put_blocked` |
| reading | `if.event.read` | `if.event.read` |
| removing | `if.event.taken` | `if.event.remove_blocked` |
| searching | `if.event.searched` | `if.event.searched` |
| showing | `if.event.shown` | `if.event.show_blocked` |
| smelling | `if.event.smelled` | `if.event.smell_blocked` |
| switching_off | `if.event.switched_off` | `if.event.switch_off_blocked` |
| switching_on | `if.event.switched_on` | `if.event.switch_on_blocked` |
| taking | `if.event.taken` | `if.event.take_blocked` |
| taking_off | `if.event.removed` | `if.event.take_off_blocked` |
| talking | `if.event.talked` | `if.event.talk_blocked` |
| throwing | `if.event.thrown` | `if.event.thrown` |
| touching | `if.event.touched` | `if.event.touch_blocked` |
| unlocking | `if.event.unlocked` | `if.event.unlock_blocked` |
| waiting | `if.event.waited` | `if.event.wait_blocked` |
| wearing | `if.event.worn` | `if.event.wear_blocked` |
