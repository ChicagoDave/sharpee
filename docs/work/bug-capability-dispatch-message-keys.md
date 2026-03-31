# Bug: Capability Dispatch Actions Produce Blank Output

**Reported**: 2026-03-31
**Severity**: High — affected actions silently produce no output
**Status**: Open

## Summary

Capability dispatch actions (lowering, raising) produce blank output because their
language message keys are double-prefixed. The language provider's `loadActionMessages()`
prepends `${actionId}.` to every key, but lowering/raising define fully-qualified keys
like `'if.lower.lowered'` instead of the short keys (`'lowered'`) that every other action
uses. The stored key becomes `if.action.lowering.if.lower.lowered`, which nothing ever
looks up.

## Reproduction

1. Play dungeo, navigate to the Shaft Room
2. Type `lower basket`
3. Expected: "{You} {lower} {target}." or similar
4. Actual: blank line (no output)

## Root Cause

### How it works for standard actions (correct)

```
Language file key:    'taken'
loadActionMessages:   'if.action.taking' + '.' + 'taken' = 'if.action.taking.taken'
Action report emits:  `${context.action.id}.${messageKey}` = 'if.action.taking.taken'
text-service lookup:  getMessage('if.action.taking.taken') → MATCH ✓
```

### How it fails for capability dispatch actions

```
Language file key:    'if.lower.lowered'
loadActionMessages:   'if.action.lowering' + '.' + 'if.lower.lowered' = 'if.action.lowering.if.lower.lowered'
Behavior report emits: messageId = 'if.lower.lowered'
text-service lookup:   getMessage('if.lower.lowered') → NO MATCH ✗
```

The event and the message text both exist — they just can't find each other.

## Affected Files

### Language definitions (keys are wrong)

| File | Bad keys | Should be |
|------|----------|-----------|
| `packages/lang-en-us/src/actions/lowering.ts` | `'if.lower.no_target'`, `'if.lower.cant_lower_that'`, `'if.lower.already_down'`, `'if.lower.lowered'` | `'no_target'`, `'cant_lower_that'`, `'already_down'`, `'lowered'` |
| `packages/lang-en-us/src/actions/raising.ts` | `'if.raise.no_target'`, `'if.raise.cant_raise_that'`, `'if.raise.already_up'`, `'if.raise.raised'` | `'no_target'`, `'cant_raise_that'`, `'already_up'`, `'raised'` |

### Stdlib action configs (error strings are wrong)

| File | Bad value | Should be |
|------|-----------|-----------|
| `packages/stdlib/src/actions/standard/lowering/lowering.ts:50-51` | `noTargetError: 'if.lower.no_target'` | `noTargetError: 'no_target'` |
| `packages/stdlib/src/actions/standard/raising/raising.ts:26-27` | `noTargetError: 'if.raise.no_target'` | `noTargetError: 'no_target'` |

### Capability dispatch factory (blocked path doesn't prefix)

| File | Line | Issue |
|------|------|-------|
| `packages/stdlib/src/actions/capability-dispatch.ts:188` | `messageId: result.error \|\| config.cantDoThatError` | Should prefix with `${config.actionId}.` |

### Story behavior code (uses wrong message IDs)

| File | Bad references |
|------|----------------|
| `stories/dungeo/src/traits/basket-elevator-behaviors.ts:27-33` | `'if.lower.lowered'`, `'if.lower.already_down'`, `'if.raise.raised'`, `'if.raise.already_up'` |
| Same file, validate() error returns (lines 77, 179) | `'if.lower.cant_lower_that'`, `'if.raise.cant_raise_that'` |

## Fix Plan

### Step 1: Fix language keys (lang-en-us)

Change `lowering.ts` and `raising.ts` to use short keys matching every other action:

```typescript
// lowering.ts — BEFORE
messages: {
  'if.lower.no_target': "Lower what?",
  'if.lower.cant_lower_that': "{You} {can't} lower {target}.",
  'if.lower.already_down': "That's already lowered.",
  'if.lower.lowered': "{You} {lower} {target}."
}

// lowering.ts — AFTER
messages: {
  'no_target': "Lower what?",
  'cant_lower_that': "{You} {can't} lower {target}.",
  'already_down': "That's already lowered.",
  'lowered': "{You} {lower} {target}."
}
```

### Step 2: Fix stdlib action configs

Change error strings to short keys:

```typescript
// lowering.ts — BEFORE
noTargetError: 'if.lower.no_target',
cantDoThatError: 'if.lower.cant_lower_that'

// lowering.ts — AFTER
noTargetError: 'no_target',
cantDoThatError: 'cant_lower_that'
```

### Step 3: Fix capability dispatch blocked path

Prefix messageId with actionId in the default blocked handler:

```typescript
// capability-dispatch.ts blocked() — BEFORE
messageId: result.error || config.cantDoThatError,

// capability-dispatch.ts blocked() — AFTER
messageId: `${config.actionId}.${result.error || config.cantDoThatError}`,
```

### Step 4: Fix story behavior message references

Update `BasketElevatorMessages` and behavior validate() returns to use short keys.
Behaviors' report() phases must emit `${actionId}.${shortKey}` as the messageId:

```typescript
// BEFORE
messageId: BasketElevatorMessages.LOWERED  // = 'if.lower.lowered'

// AFTER
messageId: 'if.action.lowering.lowered'    // full key matching stored format
```

### Step 5: Verify

- Build platform + dungeo
- `lower basket` / `raise basket` in Shaft Room should produce text
- Run existing transcript tests to confirm no regressions

## Scope

- 2 lang-en-us files (lowering, raising)
- 1 stdlib file (capability-dispatch.ts)
- 2 stdlib action files (lowering, raising configs)
- 1 story file (basket-elevator-behaviors.ts)
- No new files needed
