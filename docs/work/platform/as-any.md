# `(entity as any)` Anti-Pattern Audit

**Created**: 2026-01-25
**Status**: Active audit document
**Related**: ADR-117 (pending - Trait Migration Pattern)

## Overview

The `(entity as any).property = value` pattern is used throughout the codebase to add custom properties to entities. This is problematic because:

1. **Checkpoint persistence fails**: The checkpoint system only serializes traits, not custom properties
2. **Type safety lost**: No TypeScript compile-time checking
3. **Discoverability poor**: Properties are invisible to IDE autocomplete
4. **Capability dispatch incompatible**: Behaviors require traits to register capabilities

The ButtonTrait fix (session 2026-01-25) demonstrated this issue when `press yellow button` failed after checkpoint restore.

## Severity Classification

| Severity | Description | Action |
|----------|-------------|--------|
| **CRITICAL** | Property mutations that affect gameplay state | Must migrate to traits |
| **HIGH** | Properties read during actions/handlers | Should migrate to traits |
| **MEDIUM** | Properties set once at world init, never mutated | Consider migration |
| **LOW** | Test-only or example code | Acceptable with comment |

---

## Story Code: `stories/dungeo/`

### CRITICAL: Treasure Properties (28 instances)

These properties are read by scoring system and trophy case logic. If a treasure is saved/restored via checkpoint, it loses treasure status.

**Pattern:**
```typescript
(item as any).isTreasure = true;
(item as any).treasureId = 'unique-id';
(item as any).treasureValue = 10;      // OFVAL
(item as any).trophyCaseValue = 5;     // OTVAL
```

**Recommended Fix:** Create `TreasureTrait`

```typescript
// packages/world-model/src/traits/treasure/TreasureTrait.ts
export class TreasureTrait implements ITrait {
  static readonly type = 'if.trait.treasure';
  treasureId: string;
  treasureValue: number;    // Points for finding/taking
  trophyCaseValue: number;  // Additional points in trophy case
}
```

**Affected Files:**
| File | Items |
|------|-------|
| `regions/bank-of-zork.ts` | portrait, bills, coin, crown |
| `regions/coal-mine.ts` | figurine, bracelet, sphere |
| `regions/dam.ts` | trunk, trident, saffron |
| `regions/forest.ts` | egg, canary |
| `regions/frigid-river.ts` | pot, emerald, statue |
| `regions/house-interior.ts` | (none currently) |
| `regions/maze.ts` | bag |
| `regions/round-room.ts` | violin |
| `regions/temple.ts` | grail, bar |
| `regions/underground.ts` | painting, torch, sphere |
| `regions/volcano.ts` | coffin, emerald, ruby, stamp |
| `regions/well-room.ts` | chalice, necklace, sphere |
| `objects/thiefs-canvas-objects.ts` | canvas |
| `actions/send/send-action.ts` | stamp (dynamically created) |
| `actions/turn-switch/turn-switch-action.ts` | diamond (dynamically created) |
| `actions/wind/wind-action.ts` | bauble (dynamically created) |
| `handlers/coal-machine-handler.ts` | diamond |
| `npcs/thief/thief-behavior.ts` | canary (restored from egg) |

---

### CRITICAL: Room State Properties

These affect navigation and puzzle logic.

#### `riddleSolved` (Riddle Room)
```typescript
(room as any).riddleSolved = false;
```

**Files:** `regions/well-room.ts:69`, `actions/answer/answer-action.ts:58,236`

**Fix:** Create `RiddleRoomTrait` with `solved: boolean`

#### `isFixed` (Round Room)
```typescript
(room as any).isFixed = false;  // Spinning state
```

**Files:** `regions/round-room.ts:31`, `npcs/robot/robot-entity.ts:95`, `handlers/round-room-handler.ts:77`

**Fix:** Create `SpinningRoomTrait` with `isFixed: boolean`

#### `isWaterRoom` / `riverPosition` (Frigid River)
```typescript
(room as any).isWaterRoom = true;
(room as any).riverPosition = 1;
(room as any).isLastBeforeFalls = true;
```

**Files:** `regions/frigid-river.ts:75-129`

**Fix:** Create `RiverRoomTrait` with position, isLastBeforeFalls

#### `canLaunchBoat` / `launchDestination`
```typescript
(room as any).canLaunchBoat = true;
(room as any).launchDestination = frigidRiverIds.frigidRiver1;
```

**Files:** `regions/frigid-river.ts:136-300`

**Fix:** Add to `RiverRoomTrait` or create `BoatLaunchTrait`

#### `isRainbowRoom`
```typescript
(room as any).isRainbowRoom = true;
```

**Files:** `regions/frigid-river.ts:198,202`, `handlers/river-handler.ts:94`

**Fix:** Create `RainbowRoomTrait` or add flag to RoomTrait

#### `spiritsBlocking` (Entry to Hades)
```typescript
(room as any).spiritsBlocking = true;
```

**Files:** `regions/endgame.ts:137`, `handlers/exorcism-handler.ts:124`

**Fix:** Create `BlockedBySpirits` trait or use existing guard pattern

#### `hasGas` (Gas Room)
```typescript
(room as any).hasGas = true;
```

**Files:** `regions/coal-mine.ts:159`

**Fix:** Create `GasRoomTrait` with `hasGas: boolean`

#### `mirrorRubCount`
```typescript
(room as any).mirrorRubCount = 0;
```

**Files:** `regions/temple.ts:78`, `regions/well-room.ts:97`

**Fix:** Create `MirrorRoomTrait` with rubCount

#### `awardsPointsOnEntry` / `isVictoryRoom`
```typescript
(room as any).awardsPointsOnEntry = 20;
(room as any).isVictoryRoom = true;
```

**Files:** `regions/endgame.ts:97,120,121`

**Fix:** Create `EndgameRoomTrait`

#### `ropeAttached` / `hasRailing` / `torchRoomId`
```typescript
(room as any).ropeAttached = false;
(room as any).hasRailing = true;
(room as any).torchRoomId = torchRoom.id;
```

**Files:** `regions/underground.ts:96-115`, `actions/tie/tie-action.ts:82-227`

**Fix:** Create `DomeRoomTrait`

#### `basinState`
```typescript
(room as any).basinState = 'disarmed';
```

**Files:** `actions/burn/burn-action.ts:187`, `scheduler/incense-fuse.ts:57,59`

**Fix:** Create `TempleBasinTrait`

---

### CRITICAL: Object State Properties

#### Boat / Balloon Inflation
```typescript
(boat as any).isInflated = false;
(clothBag as any).isInflated = false;
```

**Files:**
- `regions/dam.ts:441`
- `regions/volcano.ts:469`
- `actions/deflate/deflate-action.ts:100`
- `actions/inflate/inflate-action.ts:116`
- `handlers/balloon-handler.ts:62`
- `handlers/boat-puncture-handler.ts:55`

**Fix:** Create `InflatableTrait` with `isInflated: boolean`

#### Burning State (Candles, Incense, etc.)
```typescript
(target as any).isBurning = true;
(target as any).burnTurnsRemaining = 20;
(target as any).burnedOut = false;
```

**Files:**
- `actions/burn/burn-action.ts:174`
- `actions/light/light-action.ts:152,157`
- `objects/thiefs-canvas-objects.ts:83-85`
- `handlers/balloon-handler.ts:112,155,194,202,206-208`
- `scheduler/candle-fuse.ts:73`
- `scheduler/incense-fuse.ts:45,46`

**Fix:** Create `BurnableTrait` with `isBurning`, `burnTurnsRemaining`, `burnedOut`

#### Bucket Water State
```typescript
(bucket as any).hasWater = false;
```

**Files:** `regions/well-room.ts:264`, `actions/fill/fill-action.ts:149`, `actions/pour/pour-action.ts:127`

**Fix:** Create `LiquidContainerTrait` or add to ContainerTrait

#### Machine State
```typescript
(machine as any).machineActivated = false;
```

**Files:** `regions/coal-mine.ts:535`, `actions/turn-switch/turn-switch-action.ts:147`

**Fix:** Create `CoalMachineTrait`

#### Glacier State
```typescript
(glacier as any).isMelted = false;
```

**Files:** `regions/volcano.ts:323`, `handlers/glacier-handler.ts:118`

**Fix:** Create `GlacierTrait`

#### Rainbow Solidity
```typescript
(rainbow as any).isSolid = false;
```

**Files:** `regions/frigid-river.ts:484`

**Fix:** Create `RainbowTrait` with `isSolid: boolean`

#### Dam State
```typescript
(dam as any).damOpen = true;
```

**Files:** `handlers/dam-handler.ts:60,77`

**Fix:** Use existing `DamStateTrait` or create `DamGateTrait`

---

### HIGH: Tiny Room Door Puzzle

Complex puzzle state that must persist:

```typescript
(door as any).keyInLock = true;
(door as any).matUnderDoor = false;
(door as any).keyOnMat = false;
(door as any).connectsRooms = [tinyRoomId, drearyRoomId];
(door as any).blocksDirection = { from: tinyRoomId, direction: 'west' };
(door as any).isTinyRoomDoor = true;

(key as any).isHidden = true;
(key as any).isTinyRoomKey = true;

(mat as any).isUnderDoor = true;
```

**Files:** `regions/underground.ts:632-676`, `handlers/tiny-room-handler.ts:49-500`

**Fix:** Create `TinyRoomDoorTrait`, `TinyRoomKeyTrait`, `TinyRoomMatTrait`

---

### HIGH: Exorcism Items

```typescript
(bell as any).isExorcismItem = true;
(bell as any).exorcismRole = 'bell';
```

**Files:** `regions/temple.ts:257-302`, `actions/ring/ring-action.ts:135`

**Fix:** Create `ExorcismItemTrait` with `role: 'bell' | 'book' | 'candles'`

---

### HIGH: Endgame Puzzle Objects

```typescript
// Poles
(pole as any).isPole = true;
(pole as any).poleType = 'short' | 'long';

// Panels
(panel as any).isPanel = true;
(panel as any).panelType = 'mahogany' | 'pine' | 'red' | 'yellow';

// Buttons
(button as any).isPushable = true;
(button as any).buttonType = 'stone' | 'dial';

// Sundial
(sundial as any).isDial = true;

// Laser beam
(beam as any).isLaserBeam = true;

// Treasury door
(door as any).isTreasuryDoor = true;
```

**Files:** `regions/endgame.ts:284-491`, `actions/lift/lift-action.ts:22`, `actions/lower/lower-action.ts:22`, `actions/push-panel/push-panel-action.ts:27`

**Fix:** Create `EndgamePoleTrait`, `EndgamePanelTrait`, `EndgameButtonTrait`, `SundialTrait`

---

### HIGH: Balloon System

```typescript
(balloon as any).balloonState = balloonState;
(hook1 as any).hookId = 'hook1';
(wire as any).tiedTo = null;
```

**Files:** `regions/volcano.ts:442-508`

**Fix:** Create `BalloonTrait`, `BalloonHookTrait`, `BalloonWireTrait`

---

### HIGH: Royal Puzzle

```typescript
(controller as any).puzzleState = state;
```

**Files:** `regions/royal-puzzle.ts:123`

**Fix:** Create `RoyalPuzzleTrait`

---

### MEDIUM: Miscellaneous Object Properties

```typescript
// Stick/Sceptre
(stick as any).isPointy = true;
(stick as any).puncturesBoat = true;
(stick as any).isSceptre = true;

// Explosive brick
(brick as any).isExplosive = true;
(brick as any).hasFuse = true;

// Key unlocks
(key as any).unlocksId = 'metal grating';

// Bolt
(bolt as any).turnable = true;
(panel as any).boltLoose = false;

// Bat
(bat as any).repelledBy = 'garlic';

// Water body
(river as any).isWaterBody = true;

// Curtain
(curtain as any).isPassable = true;

// Paper
(paper as any).readText = `...`;

// Cakes (Alice in Wonderland)
(eatMeCake as any).isEdible = true;
(eatMeCake as any).onEatEffect = 'grow';

// Cage
(cage as any).isLifted = false;

// Button
(button as any).isPushed = false;

// Statue buried state
(statue as any).isBuried = true;
(statue as any).isVisible = false;

// Frame
(frame as any).isEmptyFrame = true;
(frame as any).isBreakable = true;
(frame as any).backDescription = '...';

// Incense
(incense as any).isIncense = true;

// Leak visibility
(leak as any).isHidden = false;

// Trunk revealed
(trunk as any).revealed = true;
```

---

### MEDIUM: NPC Event Handlers

```typescript
(cyclops as any).on = { ... };
(thief as any).on = { ... };
(troll as any).on = { ... };
```

**Files:** `npcs/cyclops/cyclops-entity.ts:110`, `npcs/thief/thief-entity.ts:133`, `regions/underground.ts:355`

**Note:** These are event handler registrations. Consider whether this should be trait-based or remain as event system usage.

---

### LOW: NPC Custom Properties

```typescript
(npcTrait as any).customProperties = state;
```

**Files:** `npcs/dungeon-master/dungeon-master-behavior.ts:188`, `npcs/robot/robot-behavior.ts:149`

**Note:** Used for saving/restoring NPC-specific state. NPCTrait may need a `customState: Record<string, unknown>` field.

---

### LOW: World/Engine Config

```typescript
(world as any).versionInfo = VERSION_INFO;
(world as any).storyConfig = config;
```

**Files:** `index.ts:165-166`

**Note:** Configuration attachment, not entity state. May be acceptable or move to dedicated config storage.

---

## Package Code: `packages/`

### ACCEPTABLE: Test Fixtures

Test code setting up mock state is acceptable but should be documented:

```typescript
// packages/world-model/tests/fixtures/test-entities.ts
(openableTrait as any).isOpen = isOpen;  // Test setup - OK
```

**Files:** Many test files in `packages/*/tests/`

### NEEDS REVIEW: AuthorModel

```typescript
// packages/world-model/src/world/AuthorModel.ts
(openable as any).isOpen = isOpen;
(lockable as any).isLocked = isLocked;
```

**Note:** AuthorModel is for world setup and may be acceptable, but consider adding proper trait mutation methods.

### NEEDS REVIEW: EdibleBehavior

```typescript
// packages/world-model/src/traits/edible/edibleBehavior.ts
(edible as any).portions = currentServings;
(edible as any).consumed = true;
```

**Note:** EdibleTrait should have these properties defined. Review trait definition.

### NEEDS REVIEW: Scope/Parser

```typescript
// packages/parser-en-us/src/english-parser.ts
(candidate as any).extras = extras;

// packages/parser-en-us/src/slot-consumers/entity-slot-consumer.ts
(result as any).isPronoun = true;
```

**Note:** Parser internals. Consider adding proper type extensions.

### NEEDS REVIEW: VisibilityBehavior

```typescript
// packages/world-model/src/world/VisibilityBehavior.ts
if (scenery && (scenery as any).visible === false)
```

**Note:** SceneryTrait should have `visible` property. Review trait definition.

---

## Migration Priority

### Phase 1: Core Traits (blocks walkthroughs)
1. `TreasureTrait` - affects scoring
2. `InflatableTrait` - affects boat/balloon
3. `BurnableTrait` - affects candles/incense

### Phase 2: Room Traits (affects navigation)
4. `RiverRoomTrait` - frigid river
5. `SpinningRoomTrait` - round room
6. `DomeRoomTrait` - dome/torch room

### Phase 3: Puzzle Traits (affects specific puzzles)
7. `TinyRoomDoorTrait`, `TinyRoomKeyTrait`
8. `ExorcismItemTrait`
9. `EndgamePoleTrait`, `EndgamePanelTrait`
10. `RoyalPuzzleTrait`

### Phase 4: Miscellaneous
- All remaining object properties
- Room state properties

---

## Migration Pattern

When migrating a property to a trait:

1. **Create the trait** in `stories/dungeo/src/traits/` (story-specific) or `packages/world-model/src/traits/` (platform)

2. **Update entity creation** to add trait instead of custom property:
   ```typescript
   // Before
   (item as any).isTreasure = true;

   // After
   item.add(new TreasureTrait({ treasureId: 'x', treasureValue: 10 }));
   ```

3. **Update all readers** to get trait instead of custom property:
   ```typescript
   // Before
   if ((item as any).isTreasure) { ... }

   // After
   const treasure = item.trait<TreasureTrait>(TreasureTrait.type);
   if (treasure) { ... }
   ```

4. **Regenerate checkpoints** that contain affected entities

5. **Run walkthrough chain** to verify persistence

---

## Statistics

| Category | Count |
|----------|-------|
| Treasure properties | 112 |
| Room state properties | 47 |
| Object state properties | 89 |
| Puzzle state properties | 34 |
| NPC properties | 12 |
| Test fixtures | 145 |
| Platform code | 28 |
| **Total** | **467** |

*Counts are approximate based on grep results*
