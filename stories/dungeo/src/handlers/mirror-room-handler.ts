/**
 * Mirror Room State Toggle Handler
 *
 * The Mirror Room has two states that change where its exits lead:
 *
 * State A (default - Grail Room/Hades):
 * - N → Narrow Crawlway
 * - W → Winding Passage
 * - E → Cave (leads down to Hades)
 *
 * State B (Coal Mine):
 * - N → Steep Crawlway
 * - W → Cold Passage
 * - E → Small Cave (leads down to Atlantis)
 *
 * RUB MIRROR (touching the mirror) toggles between states.
 * The room shakes and rumbles when the state changes.
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, RoomTrait, Direction, DirectionType } from '@sharpee/world-model';

export const MirrorRoomMessages = {
  MIRROR_RUBBED: 'dungeo.mirror_room.rubbed',
  ROOM_SHAKES: 'dungeo.mirror_room.shakes',
} as const;

// State key for mirror room state
const MIRROR_STATE_KEY = 'dungeo.mirror_room.state';

// Mirror states
export type MirrorState = 'A' | 'B';

// Event ID counter
let eventCounter = 0;
function generateEventId(): string {
  return `mirror-room-${Date.now()}-${++eventCounter}`;
}

/**
 * Configuration for Mirror Room connections
 */
export interface MirrorRoomConfig {
  mirrorRoomId: string;
  mirrorId: string;

  // State A destinations (Grail Room/Hades)
  stateA: {
    north: string;  // Narrow Crawlway
    west: string;   // Winding Passage
    east: string;   // Cave (Tiny Cave → Hades)
  };

  // State B destinations (Coal Mine)
  stateB: {
    north: string;  // Steep Crawlway
    west: string;   // Cold Passage
    east: string;   // Small Cave (→ Atlantis)
  };
}

/**
 * Get the current mirror state
 */
export function getMirrorState(world: WorldModel): MirrorState {
  const state = world.getStateValue(MIRROR_STATE_KEY);
  return (state === 'B') ? 'B' : 'A';  // Default to A
}

/**
 * Set the mirror state and update exits
 */
export function setMirrorState(
  world: WorldModel,
  state: MirrorState,
  config: MirrorRoomConfig
): void {
  world.setStateValue(MIRROR_STATE_KEY, state);
  updateMirrorRoomExits(world, state, config);
}

/**
 * Toggle the mirror state (A → B, B → A)
 */
export function toggleMirrorState(
  world: WorldModel,
  config: MirrorRoomConfig
): MirrorState {
  const currentState = getMirrorState(world);
  const newState: MirrorState = currentState === 'A' ? 'B' : 'A';
  setMirrorState(world, newState, config);
  return newState;
}

/**
 * Update Mirror Room exits based on state
 */
function updateMirrorRoomExits(
  world: WorldModel,
  state: MirrorState,
  config: MirrorRoomConfig
): void {
  const mirrorRoom = world.getEntity(config.mirrorRoomId);
  if (!mirrorRoom) return;

  const roomTrait = mirrorRoom.get(RoomTrait);
  if (!roomTrait) return;

  const destinations = state === 'A' ? config.stateA : config.stateB;

  // Update exits
  roomTrait.exits = {
    ...roomTrait.exits,
    [Direction.NORTH]: { destination: destinations.north },
    [Direction.WEST]: { destination: destinations.west },
    [Direction.EAST]: { destination: destinations.east }
  };

  // Also update reverse connections from destination rooms
  updateReverseConnections(world, state, config);
}

/**
 * Update reverse connections from destination rooms back to Mirror Room
 */
function updateReverseConnections(
  world: WorldModel,
  state: MirrorState,
  config: MirrorRoomConfig
): void {
  if (state === 'A') {
    // State A: Connect from Grail Room area back to Mirror Room
    updateRoomExit(world, config.stateA.north, Direction.SOUTHWEST, config.mirrorRoomId);  // Narrow Crawlway SW→Mirror
    updateRoomExit(world, config.stateA.west, Direction.EAST, config.mirrorRoomId);         // Winding Passage E→Mirror
    updateRoomExit(world, config.stateA.east, Direction.WEST, config.mirrorRoomId);         // Cave W→Mirror

    // State A: Disconnect Coal Mine rooms from Mirror Room
    // (They still exist but don't lead to Mirror Room)
    removeRoomExit(world, config.stateB.north, Direction.SOUTH);       // Steep Crawlway S→nowhere
    removeRoomExit(world, config.stateB.west, Direction.EAST);          // Cold Passage E→nowhere
    removeRoomExit(world, config.stateB.east, Direction.NORTH);         // Small Cave N→nowhere
  } else {
    // State B: Connect from Coal Mine area back to Mirror Room
    updateRoomExit(world, config.stateB.north, Direction.SOUTH, config.mirrorRoomId);       // Steep Crawlway S→Mirror
    updateRoomExit(world, config.stateB.west, Direction.EAST, config.mirrorRoomId);          // Cold Passage E→Mirror
    updateRoomExit(world, config.stateB.east, Direction.NORTH, config.mirrorRoomId);         // Small Cave N→Mirror

    // State B: Disconnect Grail Room area from Mirror Room
    removeRoomExit(world, config.stateA.north, Direction.SOUTHWEST);   // Narrow Crawlway SW→nowhere
    removeRoomExit(world, config.stateA.west, Direction.EAST);          // Winding Passage E→nowhere
    removeRoomExit(world, config.stateA.east, Direction.WEST);          // Cave W→nowhere
  }
}

/**
 * Update a single exit in a room
 */
function updateRoomExit(
  world: WorldModel,
  roomId: string,
  direction: DirectionType,
  destination: string
): void {
  const room = world.getEntity(roomId);
  if (!room) return;

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait) return;

  if (!roomTrait.exits) {
    roomTrait.exits = {};
  }
  roomTrait.exits[direction] = { destination };
}

/**
 * Remove an exit from a room
 */
function removeRoomExit(
  world: WorldModel,
  roomId: string,
  direction: DirectionType
): void {
  const room = world.getEntity(roomId);
  if (!room) return;

  const roomTrait = room.get(RoomTrait);
  if (!roomTrait || !roomTrait.exits) return;

  delete roomTrait.exits[direction];
}

/**
 * Handle mirror being touched/rubbed
 * Returns events to emit (room shaking message)
 */
export function handleMirrorRubbed(
  world: WorldModel,
  config: MirrorRoomConfig
): ISemanticEvent[] {
  const events: ISemanticEvent[] = [];

  // Toggle the mirror state
  const newState = toggleMirrorState(world, config);

  // Emit the rumble/shake message
  events.push({
    id: generateEventId(),
    type: 'game.message',
    timestamp: Date.now(),
    entities: {},
    data: {
      messageId: MirrorRoomMessages.ROOM_SHAKES,
      newState
    },
    narrate: true
  });

  return events;
}

/**
 * Check if an entity is the mirror
 */
export function isMirror(entityId: string, config: MirrorRoomConfig): boolean {
  return entityId === config.mirrorId;
}

/**
 * Initialize Mirror Room to State A
 * Should be called during story setup
 */
export function initializeMirrorRoom(
  world: WorldModel,
  config: MirrorRoomConfig
): void {
  setMirrorState(world, 'A', config);
}
