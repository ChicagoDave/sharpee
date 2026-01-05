# Dam Puzzle Implementation Plan

## Overview

The Maintenance Room contains a control panel with 4 colored buttons and a bolt. The bolt controls the dam's sluice gates, which drain/fill the reservoir.

## Current State

**Implemented:**
- `dam-fuse.ts` - Multi-stage draining sequence (10 turns)
- Event handlers for `dungeo.button.yellow.pressed` and `dungeo.bolt.turned`
- Reservoir state changes (description, walkable, trunk visible)
- Control panel entity (scenery) with description mentioning buttons/bolt
- Wrench and screwdriver in Maintenance Room

**Not Implemented:**
- Individual button entities
- Bolt entity at Dam
- Player actions to press buttons or turn bolt
- Blue button flooding mechanic
- Red/brown button effects

---

## Authentic FORTRAN Behavior

### Buttons (in Maintenance Room)

| Button | FORTRAN Effect | Message |
|--------|----------------|---------|
| **Red** | Toggles RLIGHT flag (room lights) | 230: "The lights are now off" / 231: "The lights are now on" |
| **Yellow** | Sets GATEF=TRUE | 232: "Click" |
| **Brown** | Sets GATEF=FALSE | 232: "Click" |
| **Blue** | Starts CEVMNT flooding timer | 233: "The blue button starts a leak..." |

### Blue Button Flooding Sequence

When blue button pressed (and not already leaking):
1. RVMNT counter starts at 1
2. Each turn: RVMNT increments, message displayed if player in room
3. Messages 71-79 show water rising (ankles → shins → knees → hips → waist → chest → neck → over head → in lungs)
4. At RVMNT=16: Room is "munged" (destroyed), player drowns if present
5. Message 80: "The room is full of water and cannot be entered"
6. If already leaking, button is jammed (message 234)

### Bolt (at Dam)

| Action | Condition | Result |
|--------|-----------|--------|
| TURN BOLT | No wrench | Message 299: "The bolt can't be turned with your #" |
| TURN BOLT WITH WRENCH | GATEF=FALSE | Message 210: "The bolt won't turn with your best effort" |
| TURN BOLT WITH WRENCH | GATEF=TRUE, dam closed | Message 211: "The sluice gates open..." → drain reservoir |
| TURN BOLT WITH WRENCH | GATEF=TRUE, dam open | Message 212: "The sluice gates close..." → fill reservoir |
| OIL BOLT | Any | Message 906: Trouble (joke response) |

### Dam State

When dam opens (LWTIDF=TRUE):
- Trunk becomes visible in reservoir
- Reservoir gets RLAND flag (walkable without boat)
- Coffin loses SCRDBT flag (can be carried?)

When dam closes (LWTIDF=FALSE):
- Trunk hidden if still in reservoir
- Reservoir gets RWATER flag (requires boat)

---

## Implementation Plan

### Phase 1: Core Dam Puzzle (Minimum Viable)

**Goal:** Player can drain reservoir and get trunk of jewels.

#### 1.1 Create Button Entities

In `regions/dam/objects/index.ts`, add individual button entities:

```typescript
function createMaintenanceButtons(world: WorldModel, roomId: string): void {
  // Yellow button - enables bolt
  const yellowButton = world.createEntity('yellow button', EntityType.ITEM);
  yellowButton.add(new IdentityTrait({
    name: 'yellow button',
    aliases: ['yellow', 'danger button', 'danger'],
    description: 'A yellow button labeled "DANGER".',
  }));
  yellowButton.add(new SceneryTrait());
  world.moveEntity(yellowButton.id, roomId);

  // Similar for red, brown, blue buttons
}
```

#### 1.2 Create Bolt Entity

In `regions/dam/objects/index.ts`, add bolt to Dam room:

```typescript
function createDamBolt(world: WorldModel, roomId: string): void {
  const bolt = world.createEntity('bolt', EntityType.ITEM);
  bolt.add(new IdentityTrait({
    name: 'bolt',
    aliases: ['large bolt', 'metal bolt'],
    description: 'A large metal bolt on the control panel. Above it is a small green plastic bubble.',
  }));
  bolt.add(new SceneryTrait());
  world.moveEntity(bolt.id, roomId);
}
```

#### 1.3 Create Press Button Action

New story action: `actions/press-button/`

- Grammar: `press :target`, `push :target` (with button constraint)
- Validate: Target is a button, player in Maintenance Room
- Execute:
  - Yellow: Emit `dungeo.button.yellow.pressed`, show "Click"
  - Brown: Emit `dungeo.button.brown.pressed`, show "Click"
  - Red: Toggle room light state
  - Blue: Start flooding (Phase 2)

**Alternative:** Intercept stdlib `pushing` action for button entities.

#### 1.4 Create Turn Bolt Action

New story action: `actions/turn-bolt/`

- Grammar: `turn :target`, `turn :target with :instrument`
- Validate:
  - Target is bolt
  - Player at Dam
  - If no instrument or wrong instrument: "The bolt can't be turned with your [item]"
  - If wrench but GATEF=FALSE: "The bolt won't turn with your best effort"
- Execute:
  - Emit `dungeo.bolt.turned`
  - Dam-fuse.ts handler starts draining sequence

#### 1.5 Wire Up Event Handlers

The handlers already exist in `dam-fuse.ts`:
- `dungeo.button.yellow.pressed` → sets `buttonPressed = true`
- `dungeo.bolt.turned` → starts draining (if buttonPressed)

Just need to ensure they're registered in `onEngineReady()`.

---

### Phase 2: Full Button Implementation

**Goal:** All 4 buttons work authentically.

#### 2.1 Red Button (Lights)

- Toggle `RLIGHT` equivalent on Maintenance Room
- Update room's `isDark` property
- Messages: "The lights are now off/on"

#### 2.2 Brown Button (Disable Bolt)

- Sets `buttonPressed = false` (re-locks bolt)
- Message: "Click"

#### 2.3 Blue Button (Flooding)

Create `scheduler/maintenance-flood-fuse.ts`:

```typescript
interface MaintenanceFloodState {
  waterLevel: number;  // 0-16
  isFlooding: boolean;
  isFlooded: boolean;  // room destroyed
}

// Messages for each water level
const FLOOD_MESSAGES = [
  'MAINTENANCE_WATER_ANKLES',    // level 2
  'MAINTENANCE_WATER_SHINS',     // level 4
  'MAINTENANCE_WATER_KNEES',     // level 6
  'MAINTENANCE_WATER_HIPS',      // level 8
  'MAINTENANCE_WATER_WAIST',     // level 10
  'MAINTENANCE_WATER_CHEST',     // level 12
  'MAINTENANCE_WATER_NECK',      // level 14
  'MAINTENANCE_WATER_OVER_HEAD', // level 16
];
```

Daemon behavior:
- Ticks every turn while flooding
- Increments water level
- If player in room, show appropriate message
- At level 16: Kill player if present, mark room as destroyed
- After flooding, room cannot be entered

#### 2.4 Green Bubble Indicator

- When GATEF=TRUE (yellow pressed), bubble "glows"
- Update bolt/panel description dynamically
- "Above the bolt, the green plastic bubble is glowing."

---

### Phase 3: Polish & Edge Cases

#### 3.1 Dynamic Descriptions

- Dam room: Show different text based on dam state (open/closed)
- Reservoir: Show drained vs filled description
- Maintenance Room: Show flooding state if active

#### 3.2 Reservoir State Transitions

When dam closes (refills):
- If trunk still in reservoir, hide it again
- Change reservoir back to requiring boat

#### 3.3 Messages

Add to `lang-en-us` or story messages:

```typescript
const DamMessages = {
  BUTTON_CLICK: 'Click.',
  BOLT_WONT_TURN: "The bolt won't turn with your best effort.",
  BOLT_WRONG_TOOL: "The bolt can't be turned with your {item}.",
  GATES_OPEN: 'The sluice gates open, and water pours through the dam.',
  GATES_CLOSE: 'The sluice gates close, and water starts to collect behind the dam.',
  LIGHTS_ON: 'The lights are now on.',
  LIGHTS_OFF: 'The lights are now off.',
  BLUE_BUTTON_JAMMED: 'The blue button appears to be jammed.',
  // Flooding messages...
};
```

---

## Testing

### Transcript Tests

`tests/transcripts/dam-puzzle.transcript`:
```
# Test basic dam puzzle
> go to maintenance room
> press yellow button
Click.
> go to dam
> turn bolt
The bolt won't turn with your best effort.
> turn bolt with wrench
The sluice gates open, and water pours through the dam.
# Wait for draining...
> go to reservoir
# Should be able to walk in now
> take trunk
Taken.
```

`tests/transcripts/dam-flooding.transcript`:
```
# Test blue button flooding
> go to maintenance room
> press blue button
# Water starts rising
> wait
The water level is now up to your ankles.
> wait
The water level is now up to your shins.
# ... continue until death or escape
```

---

## Priority

1. **Phase 1** - Core puzzle (yellow button + bolt + draining) - Required for trunk treasure
2. **Phase 2** - Full buttons - Nice to have for authenticity
3. **Phase 3** - Polish - Can be deferred

## Estimated Scope

- Phase 1: ~2-3 hours (entities, 2 actions, wiring)
- Phase 2: ~2 hours (flooding daemon, red/brown buttons)
- Phase 3: ~1 hour (descriptions, edge cases)

---

## Notes

- The dam can be re-closed by turning bolt again (toggles state)
- Brown button can re-lock the bolt after yellow unlocks it
- Blue button flooding is a trap - no gameplay benefit, just death
- Flooding is one-way (can't stop once started, room permanently destroyed)
