/**
 * Mirror Room State Toggle Handler (ADR-075 Effects Pattern)
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

import { WorldModel, Direction, Effect, WorldQuery, IGameEvent, StoryEventHandler } from '@sharpee/world-model';

export const MirrorRoomMessages = {
  MIRROR_RUBBED: 'dungeo.mirror_room.rubbed',
  ROOM_SHAKES: 'dungeo.mirror_room.shakes',
} as const;

// State key for mirror room state
const MIRROR_STATE_KEY = 'dungeo.mirror_room.state';

// Mirror states
export type MirrorState = 'A' | 'B';

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
 * Get the current mirror state from world query
 */
export function getMirrorState(query: WorldQuery): MirrorState {
  const state = query.getStateValue(MIRROR_STATE_KEY);
  return (state === 'B') ? 'B' : 'A';  // Default to A
}

/**
 * Create effects to toggle mirror state and update all exits
 */
function createMirrorToggleEffects(
  currentState: MirrorState,
  config: MirrorRoomConfig
): Effect[] {
  const newState: MirrorState = currentState === 'A' ? 'B' : 'A';
  const effects: Effect[] = [];

  // 1. Update state value
  effects.push({
    type: 'set_state',
    key: MIRROR_STATE_KEY,
    value: newState
  });

  // 2. Update Mirror Room exits
  const destinations = newState === 'A' ? config.stateA : config.stateB;
  effects.push({
    type: 'update_exits',
    roomId: config.mirrorRoomId,
    exits: {
      [Direction.NORTH]: { destination: destinations.north },
      [Direction.WEST]: { destination: destinations.west },
      [Direction.EAST]: { destination: destinations.east }
    }
  });

  // 3. Update reverse connections based on new state
  if (newState === 'A') {
    // State A: Connect from Grail Room area back to Mirror Room
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.north,
      exits: { [Direction.SOUTHWEST]: { destination: config.mirrorRoomId } }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.west,
      exits: { [Direction.EAST]: { destination: config.mirrorRoomId } }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.east,
      exits: { [Direction.WEST]: { destination: config.mirrorRoomId } }
    });

    // Disconnect Coal Mine rooms from Mirror Room
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.north,
      exits: { [Direction.SOUTH]: null }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.west,
      exits: { [Direction.EAST]: null }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.east,
      exits: { [Direction.NORTH]: null }
    });
  } else {
    // State B: Connect from Coal Mine area back to Mirror Room
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.north,
      exits: { [Direction.SOUTH]: { destination: config.mirrorRoomId } }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.west,
      exits: { [Direction.EAST]: { destination: config.mirrorRoomId } }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateB.east,
      exits: { [Direction.NORTH]: { destination: config.mirrorRoomId } }
    });

    // Disconnect Grail Room area from Mirror Room
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.north,
      exits: { [Direction.SOUTHWEST]: null }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.west,
      exits: { [Direction.EAST]: null }
    });
    effects.push({
      type: 'update_exits',
      roomId: config.stateA.east,
      exits: { [Direction.WEST]: null }
    });
  }

  // 4. Emit the rumble/shake message
  effects.push({
    type: 'message',
    id: MirrorRoomMessages.ROOM_SHAKES,
    data: { newState }
  });

  return effects;
}

/**
 * Create a story event handler for mirror touch events (ADR-075)
 *
 * This handler receives WorldQuery (read-only) and returns Effect[] for mutations.
 */
export function createMirrorTouchHandler(config: MirrorRoomConfig): StoryEventHandler {
  return (event: IGameEvent, query: WorldQuery): Effect[] => {
    const data = event.data as { target?: string } | undefined;
    if (!data?.target) return [];

    // Check if the touched entity is the mirror
    if (data.target !== config.mirrorId) return [];

    // Get current state and create toggle effects
    const currentState = getMirrorState(query);
    return createMirrorToggleEffects(currentState, config);
  };
}

/**
 * Initialize Mirror Room to State A
 * Should be called during story setup (before ADR-075 handlers are active)
 */
export function initializeMirrorRoom(
  world: WorldModel,
  config: MirrorRoomConfig
): void {
  // Set initial state
  world.setStateValue(MIRROR_STATE_KEY, 'A');

  // Apply initial exit configuration using the world model directly
  // (during initialization, effects system may not be fully wired)
  const destinations = config.stateA;

  // This is a one-time initialization, so direct mutation is acceptable
  world.updateEntity(config.mirrorRoomId, (room) => {
    const roomTrait = room.get('room') as { exits?: Record<string, any> } | undefined;
    if (roomTrait) {
      if (!roomTrait.exits) roomTrait.exits = {};
      roomTrait.exits[Direction.NORTH] = { destination: destinations.north };
      roomTrait.exits[Direction.WEST] = { destination: destinations.west };
      roomTrait.exits[Direction.EAST] = { destination: destinations.east };
    }
  });
}
