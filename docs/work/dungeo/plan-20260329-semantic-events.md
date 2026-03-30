# Plan: Dungeo Semantic Event Migration

**Created**: 2026-03-29
**Goal**: Migrate all 47 Dungeo story files from legacy `action.success`/`action.blocked` events to ADR-097 semantic domain events, then remove the legacy handlers from the text service.
**Audit**: `docs/work/dungeo/legacy-event-audit.md`

---

## Phase 1: Migrate 38 Blocked-Only Story Actions (Mechanical)
- **Budget**: 250
- **Domain focus**: Dungeo story actions — blocked phase only
- **Files** (38): inflate, deflate, set-dial, say, press-button, turn-switch, turn-bolt, launch, lift, lower, incant, send, untie, push-dial-button, push-panel, ring, tie, wave, wind, break, burn, melt, dig, fill, light, walk-through, diagnose, grue-death, falls-death, commanding, answer, puzzle-look, raise-basket, lower-basket, objects, room, rname, push-wall (blocked only)
- **Pattern**: `'action.blocked'` → `'dungeo.event.{action_name}_blocked'`; messageId becomes fully-qualified `${ACTION_ID}.${result.error || DEFAULT_MSG}`; drop `actionId` and `reason` fields
- **Exit**: No `'action.blocked'` emissions in any Dungeo action file
- **Verify**: Walkthrough chain passes
- **Status**: PENDING

## Phase 2: Migrate 8 Report-Phase Actions + 2 Handlers (Domain Named)
- **Budget**: 250
- **Domain focus**: Actions/handlers that emit `action.success` in report phase — each needs a domain event type name
- **Files** (10):
  - `talk-to-troll-action.ts` → `dungeo.event.talked_to_troll`
  - `push-wall-action.ts` → `dungeo.event.pushed_wall`
  - `pour-action.ts` → `dungeo.event.poured` (6 variants, different messageIds)
  - `puzzle-take-card-blocked-action.ts` → `dungeo.event.card_examined`
  - `gdt-action.ts` → `dungeo.event.gdt`
  - `gdt-command-action.ts` → `dungeo.event.gdt_command`
  - `balloon-handler.ts` → `dungeo.event.balloon_exit` / `dungeo.event.balloon_exit_blocked`
  - `royal-puzzle/puzzle-handler.ts` → `dungeo.event.puzzle_move` (uses `message` fallback — may need messageId registered in lang-en-us)
- **Exit**: No `'action.success'` or `'action.blocked'` in any Dungeo action or handler file
- **Verify**: Walkthrough chain passes
- **Status**: PENDING

## Phase 3: Migrate 2 Capability Behaviors (createEffect Pattern)
- **Budget**: 100
- **Files** (2):
  - `basket-elevator-behaviors.ts` — 4 `createEffect` calls → `dungeo.event.basket_lowered`, `dungeo.event.basket_raised`, `dungeo.event.basket_lower_blocked`, `dungeo.event.basket_raise_blocked`
  - `egg-behaviors.ts` — 2 `createEffect` calls → `dungeo.event.egg_opened`, `dungeo.event.egg_open_blocked`
- **Exit**: No `createEffect('action.success/blocked', ...)` in any Dungeo trait file
- **Verify**: Walkthrough chain passes (basket + egg puzzles exercised)
- **Status**: PENDING

## Phase 4: Remove Legacy Handlers from Text Service (Platform Change)
- **Budget**: 100
- **Requires**: David's approval (platform change per CLAUDE.md)
- **Prerequisite**: Phases 1-3 complete and verified
- **Changes**:
  - Delete `handleActionSuccess()`, `handleActionFailure()` from `packages/text-service/src/handlers/action.ts`
  - Remove `case 'action.success':` and `case 'action.failure': case 'action.blocked':` from text-service router
  - Remove `if (event.type.startsWith('action.')) { return null; }` guard in `tryProcessDomainEventMessage()`
  - Clean up imports/exports
- **Exit**: Text service has one routing path (domain events with messageId); ADR-097 fully enforced
- **Verify**: Build + walkthrough chain passes
- **Status**: PENDING
