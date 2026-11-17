# Plan: Balloon VehicleTrait Refactor

## Context

The balloon daemon tracks position via `BalloonStateTrait.position` but never calls `world.moveEntity()` or `moveVehicle()`. The balloon entity stays in volcanoBottom forever. When the player exits at a ledge, the balloon isn't in the ledge room, so they can't re-enter it. The boat on the Frigid River works correctly because the going action calls `moveVehicle()` — the balloon should work identically.

## Approach

- Remove `BalloonStateTrait.position` — it's redundant with `VehicleTrait.currentPosition`
- Create the missing "Volcano Core" room (VAIR1 from MDL)
- Fix all 8 positionRooms mappings (3 were wrong, 2 were missing)
- Balloon daemon calls `moveVehicle()` to physically move the balloon between rooms
- Tie action calls `moveVehicle()` to dock at ledge rooms

## Corrected positionRooms

| Position | Room | Notes |
|----------|------|-------|
| `vlbot` | volcanoBottom | correct already |
| `vair1` | **volcanoCore** | NEW room to create |
| `vair2` | **volcanoNearSmallLedge** | was wrongly narrowLedge |
| `vair3` | **volcanoNearViewingLedge** | was missing |
| `vair4` | **volcanoNearWideLedge** | was wrongly wideLedge |
| `ledg2` | narrowLedge | correct |
| `ledg3` | **volcanoView** | was wrongly narrowLedge |
| `ledg4` | wideLedge | correct |

All 8 rooms are unique — no reverse-lookup ambiguity in `moveVehicle()`.

## Steps

### 1. volcano.ts — Create Volcano Core room, fix positionRooms
- Add `volcanoCore: string` to `VolcanoRoomIds` interface
- Create room: `'Volcano Core'`, description from MDL, isDark=false, no exits
- Fix positionRooms to map all 8 positions to correct rooms (table above)
- Remove `position: 'vlbot'` from BalloonStateTrait constructor
- Add volcanoCore to return object

### 2. balloon-state-trait.ts — Remove position field
- Remove `position` from `BalloonStateTraitConfig` and `BalloonStateTrait` class
- Keep `BalloonPosition` type, `nextPositionUp/Down`, `isLedgePosition`, `isMidairPosition`, `ledgeToMidair` — still needed

### 3. balloon-daemon.ts — Use moveVehicle()
- Import `moveVehicle` from `@sharpee/world-model`
- Read position from `VehicleTrait.currentPosition` (not `BalloonStateTrait.position`)
- After computing newPosition, look up room from `positionRooms[newPosition]`
- Call `moveVehicle(world, balloonEntityId, roomId)` instead of setting position strings
- Delete `syncVehicleTraitPosition()` function entirely
- Update `getBalloonPosition()` export to read from VehicleTrait

### 4. tie-action.ts — Use VehicleTrait + moveVehicle for docking
- Read position from `vehicleTrait.currentPosition` (already have vehicleTrait at line 146)
- When docking (vair2→ledg2), call `moveVehicle()` to move balloon to ledge room

### 5. balloon-handler.ts — Read from VehicleTrait in exit transformer + action
- Exit transformer: read position from `VehicleTrait.currentPosition`
- Exit action validate/execute: read position from `VehicleTrait.currentPosition`

### 6. thief-behavior.ts — Remove debug console.log
- Remove `[THIEF-TURN]` and `[THIEF-DEPOSIT]` console.log lines

## Verification
- `./build.sh -s dungeo`
- `node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/balloon-full-flight.transcript`
- `node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript`
