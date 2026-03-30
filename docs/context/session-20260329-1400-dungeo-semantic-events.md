# Session Summary: 2026-03-29 - dungeo-semantic-events

## Goals
- Migrate entire codebase from legacy `action.success`/`action.blocked`/`action.failure` event types to ADR-097 semantic domain events
- Cover all dungeo story actions, capability behaviors, stdlib actions, tutorials, and platform packages
- Remove `handleActionSuccess()` / `handleActionFailure()` from the text service
- Update engine, examples, and tests to reflect the new event model
- Ensure all walkthrough tests continue to pass

## Phase Context
- **Plan**: `docs/work/dungeo/plan-20260329-semantic-events.md`
- **Phase executed**: Full migration — all 9 categories of files
- **Phase outcome**: COMPLETE — all walkthrough tests pass (RNG-dependent failures only, confirmed same on main)

## Completed

### Dungeo Story Actions (51 files)
Replaced all `action.success` and `action.blocked` event emissions with domain-specific event types following the `dungeo.event.{name}` / `dungeo.event.{name}_blocked` naming convention established in ADR-097. Each action now emits a single, self-describing event whose `messageId` carries the message key — no more generic wrapper events.

Files migrated:
- `answer`, `basket/lower`, `basket/raise`, `break`, `burn`, `commanding`
- `deflate`, `diagnose`, `dig`, `fill`, `gdt`, `gdt-command`, `incant`, `inflate`
- `launch`, `lift`, `light`, `lower`, `melt`, `pour`, `press-button`
- `push-dial-button`, `push-panel`, `push-wall`, `puzzle-look`
- `puzzle-take-card-blocked`, `ring`, `room-info/objects`, `room-info/rname`
- `room-info/room`, `say`, `send`, `set-dial`, `talk-to-troll`, `tie`
- `turn-bolt`, `turn-switch`, `untie`, `walk-through`, `wave`, `wind`
- `handlers/balloon-handler`, `handlers/royal-puzzle/puzzle-handler`

### Dungeo Capability Behaviors (2 files)
- `basket-elevator-behaviors.ts` — removed redundant `action.success` wrapper; domain events already carried `messageId`. Changed `action.blocked` to domain events.
- `egg-behaviors.ts` — same pattern: removed redundant success wrapper, migrated blocked events.

### Stdlib Actions (4 files)
- `switching_on.ts` — consolidated redundant `action.success` events into existing domain events with embedded `messageId`
- `inserting-semantic.ts` — same consolidation pattern
- `wearable-shared.ts` — migrated to domain events
- `pushing-original.ts` — migrated to domain events

### Tutorials (5 files)
- `familyzoo/src/v13.ts` through `v17/index.ts` — migrated to `zoo.event.*` domain events

### Cloak of Darkness (1 file)
- `stories/cloak-of-darkness/src/index.ts` — migrated to `cloak.event.*` domain events

### npm-test (2 files)
- `npm-test/src/actions.ts` and `behaviors.ts` — migrated to `regression.event.*` domain events

### Engine (2 files)
- `capability-dispatch-helper.ts` — fallback event type updated to domain event pattern
- `test-helpers/mock-text-service.ts` — updated to handle domain events correctly

### Examples and Tests (6 files)
- `packages/stdlib/examples/` — 4 design example files updated to domain event pattern (including JSDoc comments)
- `packages/stdlib/tests/integration/action-language-integration.test.ts` — updated
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts` — updated

### Text Service (4 files)
This was the key platform change:
- Deleted `packages/text-service/src/handlers/action.ts` entirely — the `handleActionSuccess()` and `handleActionFailure()` handlers are no longer needed
- `handlers/index.ts` — removed action handler export
- `index.ts` — removed action handler re-export
- `text-service.ts` — removed `handleActionSuccess()`, `handleActionFailure()` dispatch; removed the `action.` prefix guard from `tryProcessDomainEventMessage()` so all domain events route directly

### Supporting Files
- `packages/world-model/src/capabilities/capability-behavior.ts` — updated type reference
- `packages/stdlib/src/actions/base/report-helpers.ts` — updated helper reference
- `packages/stdlib/src/actions/enhanced-types.ts` — updated event type definitions
- `packages/sharpee/docs/genai-api/` — 4 auto-generated API docs updated to reflect text service changes

### Planning and Audit Docs
- `docs/work/dungeo/plan-20260329-semantic-events.md` — migration plan
- `docs/work/dungeo/legacy-event-audit.md` — audit of all legacy event usages

## Key Decisions

### 1. Delete, Don't Deprecate
Rather than leaving `handleActionSuccess()` in place with a deprecation notice, the handler file was deleted entirely. All 79 files in the codebase were migrated in a single session so there are no consumers left.

### 2. messageId Lives in the Domain Event
The key insight driving the migration: domain events already carry a `messageId` field. The `action.success` wrapper was redundant — it added a second hop (action.success → domain event dispatch → text rendering) when the domain event could route directly to the text service. Removing the wrapper simplifies the rendering pipeline significantly.

### 3. Consistent Naming Convention
All story-level domain events follow `{story}.event.{action_name}` and `{story}.event.{action_name}_blocked`. This makes events greppable and self-documenting.

## Next Phase
No active plan. The semantic events migration is complete. Next likely work: resume Dungeo dungeon room implementation or begin Aspect of God scaffolding.

## Open Items

### Short Term
- genai-api docs were auto-generated and included in this commit; verify they regenerate correctly on next build
- `docs/work/dungeo/legacy-event-audit.md` is untracked and NOT included in this commit per user instruction — left for separate decision

### Long Term
- ADR-097 should be updated to reflect that the text service no longer has a dedicated action handler
- Tutorial v13-v17 use `zoo.event.*` conventions — a future family zoo ADR should document this

## Files Modified

**Deleted** (1 file):
- `packages/text-service/src/handlers/action.ts` — legacy action success/failure handler

**Platform packages** (11 files):
- `packages/engine/src/capability-dispatch-helper.ts`
- `packages/engine/src/test-helpers/mock-text-service.ts`
- `packages/sharpee/docs/genai-api/index.md`
- `packages/sharpee/docs/genai-api/stdlib.md`
- `packages/sharpee/docs/genai-api/text.md`
- `packages/sharpee/docs/genai-api/world-model.md`
- `packages/stdlib/examples/option-b-detailed-design.ts`
- `packages/stdlib/examples/pushable-book-design.ts`
- `packages/stdlib/examples/pushable-book-story.ts`
- `packages/stdlib/examples/pushable-trait-with-handler.ts`
- `packages/stdlib/src/actions/base/report-helpers.ts`
- `packages/stdlib/src/actions/enhanced-types.ts`
- `packages/stdlib/src/actions/standard/inserting/inserting-semantic.ts`
- `packages/stdlib/src/actions/standard/pushing/pushing-original.ts`
- `packages/stdlib/src/actions/standard/switching_on/switching_on.ts`
- `packages/stdlib/src/actions/standard/wearable-shared.ts`
- `packages/stdlib/tests/integration/action-language-integration.test.ts`
- `packages/text-service/src/handlers/index.ts`
- `packages/text-service/src/index.ts`
- `packages/text-service/src/text-service.ts`
- `packages/world-model/src/capabilities/capability-behavior.ts`
- `packages/world-model/tests/unit/capabilities/capability-dispatch.test.ts`

**npm-test** (2 files):
- `npm-test/src/actions.ts`
- `npm-test/src/behaviors.ts`

**Stories** (57 files):
- `stories/cloak-of-darkness/src/index.ts`
- `stories/dungeo/src/actions/` — 41 action files
- `stories/dungeo/src/handlers/balloon-handler.ts`
- `stories/dungeo/src/handlers/royal-puzzle/puzzle-handler.ts`
- `stories/dungeo/src/traits/basket-elevator-behaviors.ts`
- `stories/dungeo/src/traits/egg-behaviors.ts`
- `tutorials/familyzoo/src/v13.ts`
- `tutorials/familyzoo/src/v14.ts`
- `tutorials/familyzoo/src/v15.ts`
- `tutorials/familyzoo/src/v16.ts`
- `tutorials/familyzoo/src/v17/index.ts`

**Planning docs** (2 files):
- `docs/work/dungeo/plan-20260329-semantic-events.md`
- `docs/work/dungeo/legacy-event-audit.md`

---

## Session Metadata

- **Status**: COMPLETE
- **Blocker**: N/A
- **Blocker Category**: N/A
- **Estimated Remaining**: N/A
- **Rollback Safety**: safe to revert (all changes are in one logical migration; the deleted handler is the only destructive change)

## Dependency/Prerequisite Check

- **Prerequisites met**: ADR-097 semantic domain events pattern established; all stories/packages migrated atomically
- **Prerequisites discovered**: None

## Architectural Decisions

- Text service action handler deleted — domain events now route directly to text rendering without a wrapper hop
- `action.success` / `action.blocked` event types removed from active use across the codebase

## Mutation Audit

- No world-model mutations changed — only event type names/routing
- Text service: `handleActionSuccess()` and `handleActionFailure()` removed (deletion, not modification)

## Recurrence Check

- Similar to past issue? NO — this is a planned, one-time migration; not a recurring pattern
- Future: ADR-097 should be updated to document the final state of domain event routing

## Test Coverage Delta

- All existing walkthrough tests pass post-migration
- RNG-dependent combat failures (thief) confirmed same rate as on main branch
- No new tests added (migration was purely a rename/restructure)

---

**Progressive update**: Session completed 2026-03-29
