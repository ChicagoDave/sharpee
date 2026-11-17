# ISSUE-068: Remove Entity `on` Handler System

**Branch**: issue-068-event-handler-types
**Scope**: Platform + story — world-model, event-processor, engine, stdlib, stories
**Risk**: Medium-High — removing an event dispatch system, but audit shows it's vestigial

## Problem

The entity `on` handler system is architectural damage from a miscommunicated event-driven design. The audit reveals:

1. **19 entity `on` handlers exist** — all could be actions or capability behaviors
2. **The event processor passes `WorldQuery` (read-only)** to handlers, but handlers that mutate bypass this by closing over the real `WorldModel` from setup functions
3. **`world?: any`** in the handler signature hides this mismatch
4. **Dead code**: troll death handler has a comment saying scoring is handled by the melee interceptor
5. **The type infrastructure is over-engineered**: `LegacyEntityEventHandler`, `EntityEventHandler`, `AnyEventHandler`, `StoryEventHandler`, array forms, duplicate definitions, `isEffectArray()` runtime discriminator

### Why removal, not migration

The `on` handlers don't use the event system correctly. They work by closing over `WorldModel` and mutating directly — the event dispatch is just a callback mechanism. The proper patterns already exist:

- **Capability behaviors**: Entity-specific logic for standard verbs (push, open, give, throw)
- **Action execute phases**: Direct mutations in the action that causes the change
- **Interceptors**: Pre/post hooks on actions (melee interceptor already handles combat)

The entity `on` system adds complexity with no architectural benefit.

### What stays

**Story-level `registerHandler()`** (ADR-075 Effect-returning): These ARE properly designed — read-only `WorldQuery`, return `Effect[]`, processed by `EffectProcessor`. Used by mirror handler, death penalty, treasure room scoring, combat disengagement, endgame scoring. These stay.

## Handler Disposition

### Remove (dead code)

| Handler | Entity | Event | Why dead |
|---------|--------|-------|----------|
| Troll `death` | troll | `if.event.death` | Comment says "dead code — scoring handled by melee interceptor". Uses `w.awardScore()` which would fail at runtime anyway (WorldQuery has no awardScore) |

### Move to capability behavior

| Handler | Entity | Event | Proper pattern |
|---------|--------|-------|----------------|
| Troll `knocked_out` | troll | `if.event.knocked_out` | Melee interceptor's UNCONSCIOUS path should do this directly |
| Troll `given` | troll | `if.event.given` | Capability behavior on TrollTrait for `if.action.giving` |
| Troll `thrown` | troll | `if.event.thrown` | Capability behavior on TrollTrait for `if.action.throwing` |
| Rug `pushed` | rug | `if.event.pushed` | Capability behavior on PushableTrait for `if.action.pushing` |
| Red Book `pushed` | red book | `if.event.pushed` | Capability behavior (demo story only) |

### Move to action execute or computed description

| Handler | Entity | Event | Proper pattern |
|---------|--------|-------|----------------|
| Window `opened`/`closed` | window | `if.event.opened/closed` | OpenableTrait description callback or computed description |
| Trapdoor `opened`/`closed` | trapdoor | `if.event.opened/closed` | Same |

### Remove (pure feedback, demo only)

| Handler | Entity | Event | Notes |
|---------|--------|-------|-------|
| Statue handlers (3) | statues | `if.event.pushed` | Demo story — replace with capability behavior or remove |
| Book handlers (2) | books | `if.event.pushed` | Demo story |
| Relic/Treasure handlers (2) | items | `if.event.taken` | Demo story |

## Phases

### Phase 1: Move Dungeo description-update handlers (low risk)

Window and trapdoor `opened`/`closed` handlers just update `identity.description`. These can be handled by passing a description map to OpenableTrait, or by adding open/closed descriptions directly on the trait.

**Check first**: Does OpenableTrait or the opening/closing action already support description updates? If so, just configure it. If not, this might need a small platform addition — discuss before implementing.

**Files**: `regions/house-interior.ts`, `regions/white-house.ts`

### Phase 2: Move troll give/throw handlers to capability behaviors (medium risk)

The troll's give and throw handlers need to become capability behaviors on TrollTrait (or a new TrollCombatTrait). These register for `if.action.giving` and `if.action.throwing` and implement the 4-phase pattern.

**Check first**: Do the giving and throwing stdlib actions already check `findTraitWithCapability()`? The troll give/throw logic (catch knife, eat non-knife) fits the capability dispatch pattern.

**Files**: `regions/underground.ts`, new trait/behavior files in `npcs/troll/`

### Phase 3: Move troll knocked_out handler to melee interceptor (medium risk)

The knocked_out handler's mutations (update description, unblock exit, set recovery turns, set unconscious) should happen directly in the melee interceptor's UNCONSCIOUS outcome path. The interceptor already handles combat outcomes — this is just adding the side effects it's missing.

**Check first**: Does the melee interceptor's UNCONSCIOUS path already do some of this? Avoid duplication.

**Files**: `interceptors/melee-interceptor.ts`, `regions/underground.ts`

### Phase 4: Move rug pushed handler to capability behavior (medium risk)

The rug's push handler reveals the trapdoor and wires room exits. This should be a capability behavior on PushableTrait for `if.action.pushing`.

**Files**: `regions/house-interior.ts`, possibly new behavior file

### Phase 5: Remove entity `on` from troll and all Dungeo entities

Delete all `.on = { ... }` assignments. Verify walkthroughs still pass — the migrated logic should handle everything.

**Files**: `regions/underground.ts`, `regions/house-interior.ts`, `regions/white-house.ts`

### Phase 6: Remove troll death handler (dead code)

Already confirmed dead. Just delete.

### Phase 7: Remove entity `on` handler dispatch from EventProcessor

- Remove entity handler invocation from `invokeEntityHandlers()` (keep story handler dispatch)
- Remove `isEffectArray()` discriminator (only Effect-returning handlers remain)
- Remove array-form handling

**Files**: `packages/event-processor/src/processor.ts`

### Phase 8: Remove type infrastructure

- **world-model/src/events/types.ts**: Remove `LegacyEntityEventHandler`, `SimpleEventHandler`, array form from `IEventHandlers`. Possibly remove `IEventHandlers` entirely.
- **world-model/src/entities/if-entity.ts**: Remove `on?: IEventHandlers` property (or keep a simplified version if story handlers still need it)
- **event-processor/src/handler-types.ts**: Remove `LegacyEntityEventHandler`, `AnyEventHandler`. Keep `EntityEventHandler`, `StoryEventHandler` (ADR-075, actively used).
- **stdlib/src/events/helpers.ts**: Audit — are these helpers used? If not, remove. If so, update signatures.

### Phase 9: Fix downstream

- Remove `kl.ts` ISSUE-068 `as any` tags — GDT KL command needs a different approach for killing entities (call `npcTrait.kill()` + emit death event for story handlers, don't try to invoke entity `on` handlers)
- Update demo story (`stories/event-handler-demo/`) — migrate or remove
- Update tests

## Open Questions

1. **OpenableTrait description updates** — does the platform already support open/closed descriptions on the trait? If not, is a small platform addition warranted, or should these be computed?
2. **Demo story** — is `stories/event-handler-demo/` referenced by documentation? Should it be updated or removed?
3. **`IGameEvent.data: Record<string, any>`** — defer to separate issue?
4. **`EventEmitter` / `SimpleEventHandler`** in engine — separate system? Needs its own audit.

## Verification Protocol

After each phase:
1. `./build.sh -s dungeo` — must compile clean
2. `pnpm --filter '@sharpee/engine' test`
3. `pnpm --filter '@sharpee/event-processor' test`
4. `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript` — run twice
