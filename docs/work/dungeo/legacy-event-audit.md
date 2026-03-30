# Dungeo Legacy Event Pattern Audit

All 43 stdlib actions have been migrated to the ADR-097 pattern (domain events carry `messageId` directly). Dungeo story-specific actions and capability behaviors still use the legacy `action.success` / `action.blocked` event types, which route through `handleActionSuccess()` and `handleActionFailure()` in the text service.

## Migration Pattern

**Legacy (current Dungeo):**
```typescript
// blocked phase
return [context.event('action.blocked', {
  actionId: MY_ACTION_ID,
  messageId: result.error || Messages.DEFAULT,
  reason: result.error
})];

// report phase
return [context.event('action.success', {
  actionId: MY_ACTION_ID,
  messageId: Messages.SUCCESS
})];
```

**New (ADR-097):**
```typescript
// blocked phase — use a domain event type, embed messageId
return [context.event('dungeo.event.my_action_blocked', {
  messageId: `${MY_ACTION_ID}.${result.error || Messages.DEFAULT}`,
  params: { ... }
})];

// report phase — same pattern
return [context.event('dungeo.event.my_action', {
  messageId: `${MY_ACTION_ID}.${Messages.SUCCESS}`,
  params: { ... }
})];
```

The key difference: the event `type` changes from `action.success`/`action.blocked` (generic, routed through legacy handlers) to a domain-specific type like `dungeo.event.poured` (caught by `tryProcessDomainEventMessage()`).

## Story Actions Using Legacy Pattern

### `action.blocked` only (blocked phase)

These actions only use the legacy pattern in their `blocked()` phase. Their `report()` phases either don't exist or use a different approach.

| File | Action | Notes |
|------|--------|-------|
| `actions/inflate/inflate-action.ts` | inflate | blocked only |
| `actions/deflate/deflate-action.ts` | deflate | blocked only |
| `actions/set-dial/set-dial-action.ts` | set-dial | blocked only |
| `actions/say/say-action.ts` | say | blocked only |
| `actions/press-button/press-button-action.ts` | press-button | blocked only |
| `actions/turn-switch/turn-switch-action.ts` | turn-switch | blocked only |
| `actions/turn-bolt/turn-bolt-action.ts` | turn-bolt | blocked only |
| `actions/launch/launch-action.ts` | launch | blocked only |
| `actions/lift/lift-action.ts` | lift | blocked only |
| `actions/lower/lower-action.ts` | lower | blocked only |
| `actions/incant/incant-action.ts` | incant | blocked only |
| `actions/send/send-action.ts` | send | blocked only |
| `actions/untie/untie-action.ts` | untie | blocked only |
| `actions/push-wall/push-wall-action.ts` | push-wall | blocked + success |
| `actions/push-dial-button/push-dial-button-action.ts` | push-dial-button | blocked only |
| `actions/push-panel/push-panel-action.ts` | push-panel | blocked only |
| `actions/ring/ring-action.ts` | ring | blocked only |
| `actions/tie/tie-action.ts` | tie | blocked only |
| `actions/wave/wave-action.ts` | wave | blocked only |
| `actions/wind/wind-action.ts` | wind | blocked only |
| `actions/break/break-action.ts` | break | blocked only |
| `actions/burn/burn-action.ts` | burn | blocked only |
| `actions/melt/melt-action.ts` | melt | blocked only |
| `actions/dig/dig-action.ts` | dig | blocked only |
| `actions/fill/fill-action.ts` | fill | blocked only |
| `actions/light/light-action.ts` | light | blocked only |
| `actions/walk-through/walk-through-action.ts` | walk-through | blocked only |
| `actions/diagnose/diagnose-action.ts` | diagnose | blocked only |
| `actions/grue-death/grue-death-action.ts` | grue-death | blocked only |
| `actions/falls-death/falls-death-action.ts` | falls-death | blocked only |
| `actions/commanding/commanding-action.ts` | commanding | blocked only |
| `actions/answer/answer-action.ts` | answer | blocked only |
| `actions/puzzle-look/puzzle-look-action.ts` | puzzle-look | blocked only |
| `actions/basket/raise-basket-action.ts` | raise-basket | blocked only |
| `actions/basket/lower-basket-action.ts` | lower-basket | blocked only |
| `actions/room-info/objects-action.ts` | objects (GDT) | blocked only |
| `actions/room-info/room-action.ts` | room (GDT) | blocked only |
| `actions/room-info/rname-action.ts` | rname (GDT) | blocked only |

### `action.success` + `action.blocked` (both phases)

| File | Action | Notes |
|------|--------|-------|
| `actions/talk-to-troll/talk-to-troll-action.ts` | talk-to-troll | report emits `action.success`, blocked emits `action.blocked` |
| `actions/push-wall/push-wall-action.ts` | push-wall | report emits `action.success`, blocked emits `action.blocked` |
| `actions/pour/pour-action.ts` | pour | report emits 6 different `action.success` variants, blocked emits `action.blocked` |
| `actions/puzzle-take-card-blocked/puzzle-take-card-blocked-action.ts` | puzzle-take-card | report emits `action.success` (manually constructed event) |
| `actions/gdt/gdt-action.ts` | gdt | uses `action.success` |
| `actions/gdt/gdt-command-action.ts` | gdt-command | uses `action.success` |

### Handlers (not actions, emit events directly)

| File | Context | Notes |
|------|---------|-------|
| `handlers/balloon-handler.ts` | balloon exit action | blocked emits `action.blocked`, report emits `action.success` |
| `handlers/royal-puzzle/puzzle-handler.ts` | puzzle movement | 2 × `action.success` with `message` fallback (messageId not registered) |

### Capability Behaviors (via `createEffect()`)

| File | Trait | Notes |
|------|-------|-------|
| `traits/basket-elevator-behaviors.ts` | BasketElevatorTrait | report: `createEffect('action.success', ...)` for lower + raise; blocked: `createEffect('action.blocked', ...)` |
| `traits/egg-behaviors.ts` | EggTrait | report: `createEffect('action.success', ...)` for opening; blocked: `createEffect('action.blocked', ...)` |

## Summary

- **47 files** reference the legacy pattern
- **38 actions** use `action.blocked` in their blocked phase (the most common pattern)
- **8 actions/handlers** use `action.success` in their report phase
- **2 capability behaviors** use `createEffect('action.success/blocked', ...)`

The `action.blocked` usages are the most mechanical to migrate — they follow an identical pattern across all 38 actions. The `action.success` usages in report phases require slightly more thought because the domain event type name needs to be chosen.

## When to Migrate

This is not urgent. The text service handles both patterns correctly. Migration would:
1. Allow removing `handleActionSuccess()` and `handleActionFailure()` from the text service
2. Give story events proper domain types (useful for event sourcing, debugging)
3. Align Dungeo with the stdlib pattern

The mechanical `action.blocked` cases could be batch-migrated. The `action.success` cases should be done individually since each needs a meaningful domain event type.
