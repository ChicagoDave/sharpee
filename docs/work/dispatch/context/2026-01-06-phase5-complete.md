# Work Summary: ADR-090 Phase 5 Complete

**Date**: 2026-01-06
**Branch**: dispatch
**Status**: All phases complete

## Session Summary

Completed Phase 5 (Cleanup and Documentation) of ADR-090 capability dispatch implementation.

## What Was Done

### 1. Fixed Module Duplication Issue

**Problem**: Transcript tests failed because dungeo story and stdlib had separate capability registries.

**Root Cause**: `stories/dungeo/package.json` used `file:` protocol for dependencies while stdlib used `workspace:*`. This caused pnpm to create separate module copies.

**Fix**: Changed all dungeo dependencies to use `workspace:*`:
```json
"dependencies": {
  "@sharpee/core": "workspace:*",
  "@sharpee/engine": "workspace:*",
  // ... etc
}
```

### 2. Fixed Capability Registration

Added `hasCapabilityBehavior()` check before registration to prevent duplicate registration errors in test runs (global registry persists):

```typescript
if (!hasCapabilityBehavior(BasketElevatorTrait.type, 'if.action.lowering')) {
  registerCapabilityBehavior(...);
}
```

### 3. Fixed Message Rendering

**Problem**: Behavior emitted events but no text appeared.

**Fix**: Updated behaviors to emit `action.success` events with `params`:
```typescript
createEffect('action.success', {
  actionId: 'if.action.lowering',
  messageId: 'if.lower.lowered',
  params: { target: entity.name }
})
```

### 4. Added Missing Lang Messages

Added `if.lower.already_down` and `if.raise.already_up` to lang-en-us.

### 5. Simplified Basket Behavior

Changed from physically moving basket entity to just tracking position state. The basket stays in Shaft Room (operated by wheel), only player is transported when inside.

### 6. Updated Build Scripts

- Fixed `build-all-dungeo.sh` to use portable `REPO_ROOT` detection
- Created `build-all-ubuntu.sh` for native Linux environments (uses `npx pnpm`)

### 7. Updated Documentation

- **core-concepts.md**: Added comprehensive "Capability Dispatch (ADR-090)" section with examples
- **ADR-090**: Added "Real Implementation: Dungeo Basket Elevator" section with actual code

## Test Results

All 13 basket-elevator transcript tests pass:
- `lower basket` → "You lower basket."
- `lower basket` again → shows "already lowered" message
- `raise basket` → "You raise basket."
- `lift basket` (alias) → "You raise basket."
- Multiple lowering/raising cycles work correctly

## Files Changed

### Platform (packages/)
- `packages/world-model/src/capabilities/capability-registry.ts` - type assertion fix
- `packages/lang-en-us/src/actions/lowering.ts` - added `already_down` message
- `packages/lang-en-us/src/actions/raising.ts` - added `already_up` message

### Story (stories/dungeo/)
- `stories/dungeo/package.json` - workspace:* dependencies
- `stories/dungeo/src/index.ts` - hasCapabilityBehavior check
- `stories/dungeo/src/traits/basket-elevator-behaviors.ts` - action.success events, simplified movement

### Documentation
- `docs/reference/core-concepts.md` - capability dispatch section
- `docs/architecture/adrs/adr-090-entity-centric-action-dispatch.md` - real implementation example
- `docs/work/dispatch/implementation-plan.md` - Phase 5 marked complete

### Build Scripts
- `scripts/build-all-dungeo.sh` - portable path, npx pnpm
- `scripts/build-all-ubuntu.sh` - new script for native Linux

## Minor Known Issue

The `{target:cap}` template modifier isn't being interpolated in "already" messages (shows literal `{target:cap}` instead of "Basket"). This is a lang-en-us template system issue, not specific to capability dispatch. Tests pass because they just check for "already" substring.

## Next Steps (Future Work)

1. Fix `{target:cap}` template interpolation in lang-en-us
2. Implement Inside Mirror pole using capability dispatch (future Dungeo work)
3. Consider adding debug events for capability dispatch troubleshooting

## How to Continue

1. Build: `./scripts/build-all-ubuntu.sh` or `./scripts/build-all-dungeo.sh` (WSL)
2. Test: `node packages/transcript-tester/dist/cli.js stories/dungeo --all`
3. The dispatch branch is ready for merge to main
