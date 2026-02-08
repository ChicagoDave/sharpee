# Phase 7: Troll Integration Plan

## Status: READY TO IMPLEMENT

## Goal

Complete troll melee integration — fix broken troll interactions, clean up ISSUE-051, and ensure all troll transcripts pass.

## Discovery: Capability Registry Cross-Module Bug

### Root Cause

The capability behavior registry (`capability-registry.ts`) uses a **module-level `const Map`** for storage:
```typescript
const behaviorRegistry = new Map<string, TraitBehaviorBinding>();
```

The interceptor registry (`interceptor-registry.ts`) uses **`globalThis`** for storage:
```typescript
const INTERCEPTOR_REGISTRY_KEY = '__sharpee_interceptor_registry__';
function getInterceptorRegistry(): Map<string, TraitInterceptorBinding> {
  const global = globalThis as Record<string, unknown>;
  if (!global[INTERCEPTOR_REGISTRY_KEY]) {
    global[INTERCEPTOR_REGISTRY_KEY] = new Map();
  }
  return global[INTERCEPTOR_REGISTRY_KEY] as Map<string, TraitInterceptorBinding>;
}
```

When the CLI bundle (`dist/cli/sharpee.js`) loads a story via `require(storyPath)`, the story gets its own module instance of `@sharpee/world-model`. The story's `registerCapabilityBehavior()` writes to the story's Map, but the platform's `getBehaviorBinding()` reads from the bundle's Map. **Two different Maps = registrations invisible to dispatch.**

Interceptors don't have this problem because `globalThis` is shared across all module instances.

### Evidence

- `TrollAttackingBehavior` IS registered in `initializeWorld()` (index.ts:276-281)
- But at runtime: `"Universal dispatch: trait 'dungeo.trait.troll' claims 'if.action.attacking' but no behavior registered"`
- Only ONE copy of `behaviorRegistry = new Map()` in the bundle (line 11029)
- Story's copy is in `stories/dungeo/dist/index.js` — separate require() scope
- Interceptors (same cross-module path) work perfectly because they use `globalThis`

### Impact

ALL capability behaviors registered by stories are broken in the CLI bundle:
- `TrollTakingBehavior` (TAKE TROLL → should say "spits in your face")
- `TrollAttackingBehavior` (unarmed ATTACK → should say "laughs at puny gesture")
- `TrollTalkingBehavior` (TALK when dead → should say "can't hear you")
- `BasketElevatorTrait` behaviors (lowering/raising)
- `EggOpeningBehavior` (egg opening)
- Potentially others

### Platform Fix (Deferred)

Apply same `globalThis` pattern to `capability-registry.ts`:
```typescript
const CAPABILITY_REGISTRY_KEY = '__sharpee_capability_registry__';
function getBehaviorRegistry(): Map<string, TraitBehaviorBinding> {
  const global = globalThis as Record<string, unknown>;
  if (!global[CAPABILITY_REGISTRY_KEY]) {
    global[CAPABILITY_REGISTRY_KEY] = new Map();
  }
  return global[CAPABILITY_REGISTRY_KEY] as Map<string, TraitBehaviorBinding>;
}
```

This is a one-line-equivalent platform fix but requires discussion per CLAUDE.md rules.

---

## Implementation Steps

### Step 1: Convert Troll Capability Behaviors → Action Interceptors

Convert all three troll capability behaviors to use the interceptor pattern (which works cross-module via `globalThis`).

**File: `stories/dungeo/src/traits/troll-capability-behaviors.ts`**

Rename/restructure to export interceptors instead of capability behaviors:

1. **TrollTakingInterceptor** (replaces TrollTakingBehavior)
   - `preValidate`: Always return `{ valid: false, error: SPITS_AT_PLAYER }`
   - `onBlocked`: Emit the "spits in your face" message

2. **TrollAttackingInterceptor** (replaces TrollAttackingBehavior)
   - `preValidate`: Check if player has weapon → if not, return `{ valid: false, error: MOCKS_UNARMED_ATTACK }`
   - `onBlocked`: Emit the "laughs at your puny gesture" message
   - NOTE: Armed attacks fall through to the melee interceptor (registered on CombatantTrait)

3. **TrollTalkingInterceptor** (replaces TrollTalkingBehavior)
   - `preValidate`: If troll is incapacitated, return `{ valid: false, error: CANT_HEAR_YOU }`
   - `onBlocked`: Emit the "can't hear you" message

### Step 2: Update TrollTrait

**File: `stories/dungeo/src/traits/troll-trait.ts`**

- Remove `static readonly capabilities` entirely (no longer needed — interceptors don't use capability declarations)
- Update class docstring to reflect interceptor usage

### Step 3: Update Registration in index.ts

**File: `stories/dungeo/src/index.ts`**

- Replace `registerCapabilityBehavior` calls for TrollTrait with `registerActionInterceptor` calls
- Import the new interceptors instead of old behaviors

### Step 4: Fix troll-recovery.transcript

The transcript has 5 failures — GDT `KO` command doesn't properly trigger troll knockout. Investigate:
- Does `KO troll` set the melee `VILLAIN_UNCONSCIOUS` attribute?
- Does it update the troll's description?
- Does it unblock the north passage?

May need to update the GDT KO handler to set melee state attributes in addition to CombatantTrait.

### Step 5: Verify All Troll Transcripts

Run all 6 troll/combat transcripts:
- `troll-combat.transcript` — 16 tests (currently passing)
- `troll-interactions.transcript` — 18 tests (currently 3 failing)
- `troll-blocking.transcript` — 16 tests (currently passing)
- `troll-recovery.transcript` — 18 tests (currently 5 failing)
- `troll-visibility.transcript` — 16 tests (currently passing with 1 expected failure)
- `combat-disengagement.transcript` — 19 tests (currently passing)

### Step 6: Run Full Walkthrough Chain

Verify no regressions: `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`

### Step 7: Log Platform Bug

Create ISSUE-052 in `docs/work/issues/issues-list-03.md`:
- Capability registry cross-module bug
- Affects all capability behaviors registered by stories
- Fix: apply `globalThis` pattern (same as interceptor registry)

---

## Files Modified

### Story Files
- `stories/dungeo/src/traits/troll-trait.ts` — Remove capabilities declaration
- `stories/dungeo/src/traits/troll-capability-behaviors.ts` — Convert to interceptors
- `stories/dungeo/src/traits/index.ts` — Update exports
- `stories/dungeo/src/index.ts` — Change registration from capability behaviors to interceptors

### Test Files
- `stories/dungeo/tests/transcripts/troll-recovery.transcript` — Fix assertions if GDT KO behavior changed

### Documentation
- `docs/work/issues/issues-list-03.md` — Add ISSUE-052 (capability registry bug)

### Platform Files (Deferred)
- `packages/world-model/src/capabilities/capability-registry.ts` — Apply `globalThis` pattern (ISSUE-052)

---

## Current Test Results (Pre-Fix)

```
troll-combat.transcript:         16 passed
troll-interactions.transcript:   15 passed, 3 failed, 1 expected failure
troll-blocking.transcript:       15 passed, 1 expected failure
troll-recovery.transcript:       13 passed, 5 failed
troll-visibility.transcript:     15 passed, 1 expected failure
combat-disengagement.transcript: 19 passed

Total: 93 passed, 8 failed, 3 expected failures
```

## Risks

- **Interceptor priority**: If both TrollAttackingInterceptor and MeleeInterceptor try to handle the same action, need to ensure correct ordering. TrollAttackingInterceptor blocks unarmed first, then MeleeInterceptor handles armed combat.
- **troll-recovery**: May need deeper investigation into GDT KO command's interaction with melee state.
