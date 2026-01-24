/**
 * Game State Types for React Client
 *
 * Note: We use generic interfaces here instead of importing from @sharpee/engine
 * to avoid bundling issues with esbuild. The actual engine is passed in at runtime.
 */

/**
 * A single entry in the game transcript
 */
export interface TranscriptEntry {
  id: string;
  turn: number;
  command?: string;
  text: string;
  timestamp: number;
}

/**
 * Exit information for a room
 */
export interface RoomExit {
  direction: string;
  destination: string;
  destinationName?: string;
  via?: string; // Door/gate entity ID
}

/**
 * Information about the current room
 */
export interface CurrentRoom {
  id: string;
  name: string;
  exits: RoomExit[];
  firstVisit: boolean;
  /** Direction traveled to reach this room (from previous room) */
  arrivedFrom?: string;
}

/**
 * Generic event interface (matches @sharpee/engine SequencedEvent)
 */
export interface GameEvent {
  type: string;
  data?: unknown;
  turn: number;
}

/**
 * Main game state managed by GameContext
 */
export interface GameState {
  // Engine reference (generic - actual type is GameEngine)
  engine: unknown | null;
  isReady: boolean;
  isPlaying: boolean;

  // Location
  currentRoom: CurrentRoom | null;

  // Scoring
  score: number;
  maxScore: number;
  turns: number;

  // Transcript
  transcript: TranscriptEntry[];

  // Events from current turn (for commentary/map hooks)
  lastTurnEvents: GameEvent[];
}

/**
 * Actions that can update game state
 */
export type GameAction =
  | { type: 'ENGINE_READY'; engine: unknown }
  | { type: 'GAME_STARTED' }
  | { type: 'ROOM_CHANGED'; room: CurrentRoom }
  | { type: 'SCORE_CHANGED'; score: number; maxScore?: number }
  | { type: 'TURN_COMPLETED'; turn: number; text: string; command?: string; events: GameEvent[] }
  | { type: 'TRANSCRIPT_CLEARED' }
  | { type: 'ENGINE_STOPPED' };

/**
 * Initial game state
 */
export const initialGameState: GameState = {
  engine: null,
  isReady: false,
  isPlaying: false,
  currentRoom: null,
  score: 0,
  maxScore: 0,
  turns: 0,
  transcript: [],
  lastTurnEvents: [],
};

/**
 * Game state reducer
 */
export function gameReducer(state: GameState, action: GameAction): GameState {
  switch (action.type) {
    case 'ENGINE_READY':
      return {
        ...state,
        engine: action.engine,
        isReady: true,
      };

    case 'GAME_STARTED':
      return {
        ...state,
        isPlaying: true,
      };

    case 'ROOM_CHANGED':
      return {
        ...state,
        currentRoom: action.room,
      };

    case 'SCORE_CHANGED':
      return {
        ...state,
        score: action.score,
        maxScore: action.maxScore ?? state.maxScore,
      };

    case 'TURN_COMPLETED': {
      const entry: TranscriptEntry = {
        id: `turn-${action.turn}-${Date.now()}`,
        turn: action.turn,
        command: action.command,
        text: action.text,
        timestamp: Date.now(),
      };
      return {
        ...state,
        turns: action.turn,
        transcript: [...state.transcript, entry],
        lastTurnEvents: action.events,
      };
    }

    case 'TRANSCRIPT_CLEARED':
      return {
        ...state,
        transcript: [],
      };

    case 'ENGINE_STOPPED':
      return {
        ...state,
        isPlaying: false,
      };

    default:
      return state;
  }
}
