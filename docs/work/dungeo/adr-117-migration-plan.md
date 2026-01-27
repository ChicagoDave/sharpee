# ADR-117 Migration Plan: Handler to Behavior/Extension Migration

## Overview

This plan migrates event handlers to the architectural patterns defined in ADR-117:
- **Capability Behaviors** - Entity-specific logic that can block/customize actions
- **Extensions** - Cross-cutting read-only observers
- **Daemons/Fuses** - Time-based scheduler events (already correct)

## Critical Decision: Platform Change Required

### The Problem

ADR-117 envisions handlers becoming capability behaviors, but **stdlib actions don't check for capability behaviors** on standard actions like ENTER, THROW, PUT.

| Action Type | Current State | ADR-117 Vision |
|-------------|---------------|----------------|
| LOWER/RAISE | Pure capability dispatch | Already done |
| ENTER | Standard logic → event | Behavior could customize |
| THROW | Standard logic → event | Behavior could customize |
| PUT | Standard logic → event | Behavior could customize |

### Example: Boat Puncture

**Current flow:**
1. Player: "enter boat" (with sharp object)
2. Stdlib entering action executes (moves player into boat)
3. Emits `if.event.entered`
4. `boat-puncture-handler` listens, detects sharp object, punctures boat

**ADR-117 vision:**
1. Player: "enter boat" (with sharp object)
2. Stdlib entering action checks for capability behavior
3. Finds `InflatableTrait` claims `if.action.entering`
4. Delegates to `InflatableEnteringBehavior.validate()` → sees sharp object, **blocks** or modifies
5. Boat controls its own entering logic

### Platform Change Options

**Option A: Modify stdlib actions to support entity behaviors**
- Add capability behavior check to ENTER, THROW, PUT, etc.
- If entity has behavior for action, delegate to it
- Behavior can extend/override standard semantics
- **Pros**: Clean ownership, matches ADR-117 vision
- **Cons**: Platform change, requires discussion

**Option B: Keep event handlers for standard actions**
- Use `EventProcessor.registerHandler` (cleaner API)
- Event handlers remain for post-action reactions
- Only pure capability dispatch actions (LOWER, RAISE) use behaviors
- **Pros**: No platform change needed
- **Cons**: Doesn't achieve full ADR-117 vision

**Option C: Hybrid - behaviors that intercept, not replace**
- Stdlib actions check for "interceptor" behaviors after validation
- Interceptor can add conditions or post-execute effects
- Standard action still runs if interceptor allows
- **Pros**: Gradual migration path
- **Cons**: More complex, two behavior patterns

### Recommendation

Start with **Option B** (no platform change) for immediate cleanup:
1. Migrate to `EventProcessor.registerHandler` for cleaner code
2. Keep handlers organized but functional

Then discuss **Option A** (platform change) as a separate work item:
- Create ADR for "Stdlib Action Capability Extension"
- Prototype with entering action
- If successful, apply to other standard actions

---

## Actionable Work (No Platform Change Needed)

### Immediate Cleanup Tasks

These can be done now without any platform changes:

#### 1. Handler API Migration

Migrate `world.registerEventHandler()` to `eventProcessor.registerHandler()` for consistency.

**Files to update:**
- `ghost-ritual-handler.ts`
- `exorcism-handler.ts`
- `glacier-handler.ts`
- `dam-handler.ts`
- `boat-puncture-handler.ts`
- `coal-machine-handler.ts`
- `endgame-laser-handler.ts`
- `reality-altered-handler.ts`

**Pattern:**
```typescript
// Before
world.registerEventHandler('if.event.entered', (event, w) => { ... });

// After
const eventProcessor = engine.getEventProcessor();
eventProcessor.registerHandler('if.event.entered', (event) => { ... });
```

#### 2. Handler Directory Reorganization

The `handlers/` directory is misleading - many files are actually Daemons. Propose:

```
stories/dungeo/src/
├── mechanics/
│   ├── daemons/           # Scheduler-based (Daemon)
│   │   ├── bat-daemon.ts
│   │   ├── round-room-daemon.ts
│   │   ├── trapdoor-daemon.ts
│   │   ├── victory-daemon.ts
│   │   └── ...
│   ├── handlers/          # Event-based (registerHandler)
│   │   ├── boat-puncture.ts
│   │   ├── glacier-melt.ts
│   │   └── ...
│   ├── transformers/      # Command transformers
│   │   ├── grue-death.ts
│   │   └── chimney-climb.ts
│   └── index.ts           # Re-exports everything
```

#### 3. Handler Consolidation

Some handlers could be merged or simplified:

| Current | Proposal |
|---------|----------|
| `exorcism-handler.ts` (handler + daemon) | Split into `exorcism-daemon.ts` + `exorcism-items.ts` |
| `reality-altered-handler.ts` (handler + daemon) | Split appropriately |
| `endgame-laser-handler.ts` (handler + daemon) | Split appropriately |

#### 4. Dead Handler Removal

After trait migration, check if any handlers are now redundant:

- `coal-machine-handler.ts` - May overlap with `MachineStateTrait` logic
- Review each handler against the traits created in previous session

### Platform Work: ADR-118 Stdlib Action Interceptors

See `docs/architecture/adrs/adr-118-stdlib-action-interceptors.md` for full design.

**Summary:** Add interceptor hooks to stdlib standard actions (ENTER, THROW, PUT, etc.):

```typescript
interface ActionInterceptor {
  preValidate?()   // Block action early
  postValidate?()  // Add custom conditions after standard validation
  postExecute?()   // Add mutations after standard execution
  postReport?()    // Add effects after standard report
  onBlocked?()     // Custom blocked handling
}
```

**Key Design Decisions:**
- **Interceptor pattern** (not full delegation) for standard actions
- Standard logic always runs; interceptors extend it
- Matches Inform 6/7 Before/After pattern
- Keeps **full delegation** for capability-dispatch actions (LOWER, RAISE)

**Implementation Phases:**
1. Core infrastructure (interfaces, registry)
2. Prototype with ENTERING + boat puncture
3. Extend to THROWING, PUTTING, DROPPING, PUSHING
4. Migrate handlers to interceptors

**Prototype target:** Boat puncture → `InflatableTrait` + `InflatableEnteringInterceptor`

---

## Current State Analysis (Updated after as-any refactoring)

### Remaining `(entity as any)` Usage

Only 3 remaining, all in handlers:

| File | Line | Pattern | Type |
|------|------|---------|------|
| `boat-puncture-handler.ts` | 25 | `(entity as any).puncturesBoat` | READ constant |
| `boat-puncture-handler.ts` | 71 | `(boat as any).attributes.displayName` | WRITE display property |
| `grue-handler.ts` | 114 | `(openable as any).isOpen` | READ (should use trait directly) |

These are NOT mutable puzzle state - they're either constant identification properties or display properties.

### Constant Identification Patterns

Several handlers use constant ad-hoc properties for entity identification:

| Property | Used In | Purpose |
|----------|---------|---------|
| `entity.puncturesBoat` | boat-puncture-handler | Marks sharp objects |
| `entity.isPointy` | boat-puncture-handler | Alternative sharp object marker |
| `entity.isFramePiece` | ghost-ritual-handler | Marks frame piece for ritual |
| `entity.exorcismRole` | exorcism-handler | Marks bell/book/candles |

**Options for cleanup:**
1. **Keep as-is** - Constants don't need checkpoint persistence
2. **Create marker traits** - `SharpObjectTrait`, `ExorcismItemTrait { role: 'bell' | 'book' | 'candles' }`
3. **Use IdentityTrait aliases** - Check if entity has specific alias

These are lower priority than the `registerEventHandler` → behavior migration.

### Handler Classification

#### Files Using `registerEventHandler` (8 files)

| Handler | Event(s) | Trait Status | Notes |
|---------|----------|--------------|-------|
| `boat-puncture-handler.ts` | `if.event.entered` | Uses InflatableTrait | Still uses `(entity as any)` for puncture check |
| `glacier-handler.ts` | `if.event.thrown` | Clean - no as-any | Uses IdentityTrait, LightSourceTrait properly |
| `dam-handler.ts` | `dungeo.dam.opened/closed` | Clean - no as-any | Story-specific events, not stdlib events |
| `coal-machine-handler.ts` | `if.event.switched_on` | Clean - uses TreasureTrait | No as-any patterns |
| `ghost-ritual-handler.ts` | `if.event.dropped` | Uses BasinRoomTrait | Uses `entity?.isFramePiece` constant check |
| `exorcism-handler.ts` | `game.message`, `if.event.read`, `if.event.switched_on` | Uses HadesEntryTrait | Uses `entity?.exorcismRole` constant checks |
| `endgame-laser-handler.ts` | `if.event.dropped`, `if.event.pushed` | Check state | Complex mirror mechanics |
| `reality-altered-handler.ts` | `if.event.score_displayed` | Clean | Cross-cutting observer |

#### Files Using Daemons (11 files - already correct)

| Handler | Type | Notes |
|---------|------|-------|
| `victory-handler.ts` | Daemon | Correct - checks player location each turn |
| `trapdoor-handler.ts` | Daemon | Correct - checks prev/current location |
| `round-room-handler.ts` | Daemon | Correct - randomizes movement |
| `balloon-handler.ts` | EventProcessor + Daemon | Mixed - needs partial migration |
| `bat-handler.ts` | Daemon | Correct - NPC movement |
| `inside-mirror-handler.ts` | Daemon | Correct - mirror room mechanics |
| `endgame-trigger-handler.ts` | Daemon | Correct - endgame state check |
| `royal-puzzle/` | Daemon | Correct - puzzle state management |
| `exorcism-handler.ts` | Daemon + Handler | Mixed - daemon part correct |
| `reality-altered-handler.ts` | Daemon + Handler | Mixed |
| `endgame-laser-handler.ts` | Daemon + Handler | Mixed |

#### Other Mechanisms

| Handler | Type | Notes |
|---------|------|-------|
| `grue-handler.ts` | ParsedCommandTransformer | Keep as-is - transforms commands before execution |
| `chimney-handler.ts` | ParsedCommandTransformer | Keep as-is - transforms climbing commands |
| `basket-handler.ts` | Mixed | Check current state |
| `mirror-room-handler.ts` | Check | May be daemon-based |
| `rainbow-handler.ts` | Check | May be capability behavior |
| `tiny-room-handler.ts` | Check | Complex puzzle state |
| `falls-death-handler.ts` | Check | Death condition check |
| `death-penalty-handler.ts` | Check | Cross-cutting observer? |

## Migration Phases

### Phase 1: Pure Capability Behavior Migrations (Priority: High)

These handlers listen for single action events and mutate a specific entity.

#### 1.1 Boat Puncture → InflatableTrait + EnteringBehavior

**Current**: Listens for `if.event.entered`, checks for sharp objects, deflates boat

**Target**:
- Extend `InflatableTrait` with `capabilities: ['if.action.entering']`
- Create `InflatableEnteringBehavior` that checks for puncture conditions
- Behavior blocks entering if sharp object present, deflates boat

**Files**:
- Create: `stories/dungeo/src/traits/inflatable-behaviors.ts`
- Modify: `stories/dungeo/src/traits/inflatable-trait.ts` (add capabilities)
- Delete: `stories/dungeo/src/handlers/boat-puncture-handler.ts`

#### 1.2 Glacier → GlacierTrait + ThrowingBehavior

**Current**: Listens for `if.event.thrown`, melts glacier if lit torch thrown at it

**Target**:
- Create `GlacierTrait` with `capabilities: ['if.action.throwing']`
- Create `GlacierThrowingBehavior` that handles torch melting logic
- Behavior executes melting, opens passage

**Files**:
- Create: `stories/dungeo/src/traits/glacier-trait.ts`
- Create: `stories/dungeo/src/traits/glacier-behaviors.ts`
- Delete: `stories/dungeo/src/handlers/glacier-handler.ts`

#### 1.3 Coal Machine → MachineStateTrait + PuttingBehavior

**Current**: Listens for `if.event.put_in`, tracks coal in machine

**Target**:
- Extend `MachineStateTrait` with `capabilities: ['if.action.putting']`
- Create `MachinePuttingBehavior` that tracks coal insertion
- Works with existing turn-switch action

**Files**:
- Create: `stories/dungeo/src/traits/machine-behaviors.ts`
- Modify: `stories/dungeo/src/traits/machine-state-trait.ts`
- Delete: `stories/dungeo/src/handlers/coal-machine-handler.ts`

### Phase 2: Complex Behavior Migrations (Priority: Medium)

These handlers have more complex state or multiple triggers.

#### 2.1 Dam Buttons → DamButtonTrait + PushingBehavior

**Current**: Listens for dam opened/closed events, manages reservoir exits

**Target**:
- Create `DamButtonTrait` for button state
- Create `DamButtonPushingBehavior` for button press logic
- Reservoir exit management moves to behavior execute phase

**Files**:
- Create: `stories/dungeo/src/traits/dam-button-trait.ts`
- Create: `stories/dungeo/src/traits/dam-button-behaviors.ts`
- Modify: `stories/dungeo/src/handlers/dam-handler.ts` → Keep utility functions, remove handler

#### 2.2 Exorcism Items → ExorcismItemTrait + Behaviors

**Current**: Listens for bell.rung, book.read, candles.lit events

**Target**:
- Create `ExorcismItemTrait` with ritual participation tracking
- Create behaviors for each ritual action (ringing, reading, lighting)
- Track ritual progress in trait state

**Files**:
- Create: `stories/dungeo/src/traits/exorcism-item-trait.ts`
- Create: `stories/dungeo/src/traits/exorcism-behaviors.ts`
- Modify: `stories/dungeo/src/handlers/exorcism-handler.ts` → Keep daemon, remove handler

#### 2.3 Ghost Ritual → BasinRoomTrait + BurningBehavior

**Current**: Listens for incense burned, triggers ghost appearance

**Target**:
- Extend `BasinRoomTrait` or create capability for burning
- Ghost appearance logic in behavior report phase

**Files**:
- Create: `stories/dungeo/src/traits/basin-behaviors.ts`
- Modify: `stories/dungeo/src/handlers/ghost-ritual-handler.ts`

### Phase 3: Endgame Migrations (Priority: Lower)

Complex endgame mechanics.

#### 3.1 Endgame Laser → EndgameMirrorTrait + Behaviors

**Current**: Complex mirror/laser mechanics

**Target**:
- Create `EndgameMirrorTrait` for mirror positioning state
- Create behaviors for mirror manipulation actions

**Files**:
- Create: `stories/dungeo/src/traits/endgame-mirror-trait.ts`
- Create: `stories/dungeo/src/traits/endgame-mirror-behaviors.ts`

### Phase 4: Extension System (Priority: Deferred)

Extensions are read-only observers. No handlers currently need this pattern urgently.

**Candidates**:
- `reality-altered-handler.ts` - Could be an extension that tracks reality shifts
- `death-penalty-handler.ts` - Could track death events for scoring

**Deferred**: Implement Extension interface when needed for future stories.

## Handler Disposition Summary

| Handler File | Disposition | Priority |
|--------------|-------------|----------|
| `balloon-handler.ts` | Keep (uses EventProcessor correctly) | - |
| `basket-handler.ts` | Review (may already be behavior-based) | Low |
| `bat-handler.ts` | Keep (Daemon) | - |
| `boat-puncture-handler.ts` | **Migrate to behavior** | High |
| `chimney-handler.ts` | Keep (CommandTransformer) | - |
| `coal-machine-handler.ts` | **Migrate to behavior** | High |
| `dam-handler.ts` | **Partial migrate** (keep utilities) | Medium |
| `death-penalty-handler.ts` | Review | Low |
| `endgame-laser-handler.ts` | **Migrate to behavior** | Low |
| `endgame-trigger-handler.ts` | Keep (Daemon) | - |
| `exorcism-handler.ts` | **Partial migrate** (keep daemon) | Medium |
| `falls-death-handler.ts` | Review | Low |
| `ghost-ritual-handler.ts` | **Migrate to behavior** | Medium |
| `glacier-handler.ts` | **Migrate to behavior** | High |
| `grue-handler.ts` | Keep (CommandTransformer) | - |
| `inside-mirror-handler.ts` | Keep (Daemon) | - |
| `mirror-room-handler.ts` | Review | Low |
| `rainbow-handler.ts` | Review | Low |
| `reality-altered-handler.ts` | Keep or Extension | Low |
| `river-handler.ts` | Review | Low |
| `round-room-handler.ts` | Keep (Daemon) | - |
| `royal-puzzle/` | Keep (Daemon) | - |
| `tiny-room-handler.ts` | Review | Medium |
| `trapdoor-handler.ts` | Keep (Daemon) | - |
| `victory-handler.ts` | Keep (Daemon) | - |

## Implementation Order

### Batch 1 (3 handlers - ~2 hours)
1. `boat-puncture-handler.ts` → InflatableTrait behavior
2. `glacier-handler.ts` → GlacierTrait behavior
3. `coal-machine-handler.ts` → MachineStateTrait behavior

### Batch 2 (2 handlers - ~2 hours)
4. `dam-handler.ts` → DamButtonTrait behavior
5. `ghost-ritual-handler.ts` → BasinRoomTrait behavior

### Batch 3 (2 handlers - ~3 hours)
6. `exorcism-handler.ts` → ExorcismItemTrait behavior
7. `tiny-room-handler.ts` → Review and migrate if needed

### Batch 4 (Deferred)
8. `endgame-laser-handler.ts` → EndgameMirrorTrait behavior
9. Remaining reviews and cleanups

## Success Criteria

After migration:
- [ ] All `registerEventHandler` calls for entity-specific logic removed
- [ ] Entity behaviors implement 4-phase pattern (validate/execute/report/blocked)
- [ ] All 148 walkthrough tests still pass
- [ ] No `(entity as any)` patterns in new behaviors
- [ ] Trait state properly persists through checkpoints

## Notes

### What NOT to Migrate

1. **Daemons** - Already correct scheduler-based pattern
2. **Command Transformers** - Different mechanism, pre-execution transformation
3. **EventProcessor.registerHandler** - Different from world.registerEventHandler, may be acceptable
4. **Cross-cutting observers** - Will become Extensions later

### Key Insight from Analysis

Many handlers in `handlers/` are actually Daemons, not event handlers. The directory name is misleading. After migration, consider:
- Rename directory to `mechanics/` or similar
- Split into `daemons/` and `behaviors/` subdirectories
- Update index.ts exports accordingly

### Platform Requirements

Current platform state:

| Requirement | Status | Notes |
|-------------|--------|-------|
| `registerCapabilityBehavior()` | ✅ Exists | Full delegation for LOWER, RAISE |
| Pure capability dispatch actions | ✅ Working | LOWERING, RAISING use `createCapabilityDispatchAction` |
| `registerActionInterceptor()` | ❌ Needs ADR-118 | Interceptor hooks for standard actions |
| Standard actions check interceptors | ❌ Needs ADR-118 | ENTERING, THROWING, PUTTING |

**ADR-118 Implementation Plan:**

| Phase | Work | Files |
|-------|------|-------|
| 1 | Core infrastructure | `packages/world-model/src/capabilities/interceptor-registry.ts` |
| 2 | ENTERING prototype | `packages/stdlib/src/actions/standard/entering/entering.ts` |
| 3 | Other actions | THROWING, PUTTING, DROPPING, PUSHING |
| 4 | Migration | Delete handlers, create interceptors |

**After ADR-118, blocked handlers become interceptors:**
- `boat-puncture-handler.ts` → `InflatableEnteringInterceptor`
- `glacier-handler.ts` → `GlacierThrowingInterceptor`
- `coal-machine-handler.ts` → `MachinePuttingInterceptor` (or SwitchingOnInterceptor)

---

## Summary

### Already Complete (Previous Session)
- [x] **Mutable state trait migration** - All `(entity as any).property = value` for puzzle state → traits
- [x] **8 new traits created** - MachineStateTrait, RoundRoomTrait, RopeStateTrait, etc.
- [x] **Pure capability dispatch** - LOWER, RAISE actions delegate to behaviors
- [x] **Daemon-based mechanics** - Most "handlers" are actually Daemons (correct pattern)

### Remaining Work

**Low Priority (Cosmetic):**
- [ ] Handler API cleanup (`registerEventHandler` → `EventProcessor.registerHandler`) - 8 files
- [ ] Directory reorganization (`handlers/` → `mechanics/`) - naming clarity
- [ ] Constant identification properties → marker traits (optional)
- [ ] 3 remaining `(entity as any)` reads - minor cleanup

**Requires Platform Implementation (ADR-118):**
- [ ] Stdlib action interceptor infrastructure
- [ ] ENTERING action interceptor support (prototype)
- [ ] THROWING, PUTTING, DROPPING, PUSHING interceptor support
- [ ] Handler → interceptor migration
- [ ] Extension system implementation (deferred)

### Key Finding

Most ADR-117 migrations require **ADR-118 (Stdlib Action Interceptors)** - a platform change to add interceptor hooks to standard actions.

**Two patterns after ADR-118:**
| Pattern | Actions | Example |
|---------|---------|---------|
| **Full delegation** | LOWER, RAISE, TURN | Basket elevator |
| **Interceptors** | ENTER, THROW, PUT | Boat puncture |

**Actionable now without platform change:**
- API cleanup (cosmetic)
- Directory reorganization (cosmetic)
- Constant property → trait migration (optional type safety)

**Actionable after ADR-118 implementation:**
- boat-puncture-handler → InflatableEnteringInterceptor
- glacier-handler → GlacierThrowingInterceptor
- coal-machine-handler → MachinePuttingInterceptor
- etc.
