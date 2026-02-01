/**
 * Game State Types for Zifmia Story Runner
 *
 * Note: We use generic interfaces here instead of importing from @sharpee/engine
 * to avoid bundling issues with esbuild. The actual engine is passed in at runtime.
 */

/**
 * ADR-109 play-tester annotation types
 */
export type AnnotationType = 'comment' | 'bug' | 'note' | 'confusing' | 'expected' | 'bookmark';

/**
 * A single entry in the game transcript
 */
/**
 * An illustration associated with a transcript entry (ADR-124)
 */
export interface TranscriptIllustration {
  src: string;       // Asset path (resolved at render time via assetMap)
  alt: string;
  position: string;  // 'right' | 'left' | 'center' | 'full-width'
  width: string;     // e.g. '40%'
}

export interface TranscriptEntry {
  id: string;
  turn: number;
  command?: string;
  text: string;
  timestamp: number;
  /** ADR-109 play-tester annotation (when this entry is an annotation rather than game output) */
  annotation?: {
    type: AnnotationType;
    text: string;
  };
  /** ADR-124 illustrations paired with this entry */
  illustrations?: TranscriptIllustration[];
}

/**
 * Map position hint for auto-mapper (ADR-113)
 */
export interface MapHint {
  dx?: number;  // Grid offset X (-1 = west, +1 = east)
  dy?: number;  // Grid offset Y (-1 = north, +1 = south)
  dz?: number;  // Grid offset Z (-1 = down, +1 = up)
}

/**
 * Exit information for a room
 */
export interface RoomExit {
  direction: string;
  destination: string;
  destinationName?: string;
  via?: string; // Door/gate entity ID
  mapHint?: MapHint; // Map positioning hint (ADR-113)
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
  /** Map hint from the exit used to reach this room (ADR-113) */
  arrivedViaMapHint?: MapHint;
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
  | { type: 'TRANSCRIPT_RESTORED'; transcript: TranscriptEntry[]; turns: number; score: number }
  | { type: 'SYSTEM_MESSAGE'; text: string }
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
      // Extract illustration events (ADR-124)
      const illustrationEvents = action.events.filter(e => e.type === 'if.event.illustrated');
      const illustrations: TranscriptIllustration[] | undefined =
        illustrationEvents.length > 0
          ? illustrationEvents.map(e => {
              const d = e.data as Record<string, unknown>;
              return {
                src: d.src as string,
                alt: (d.alt as string) ?? '',
                position: (d.position as string) ?? 'right',
                width: (d.width as string) ?? '40%',
              };
            })
          : undefined;

      const entry: TranscriptEntry = {
        id: `turn-${action.turn}-${Date.now()}`,
        turn: action.turn,
        command: action.command,
        text: action.text,
        timestamp: Date.now(),
        illustrations,
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

    case 'TRANSCRIPT_RESTORED':
      return {
        ...state,
        transcript: action.transcript,
        turns: action.turns,
        score: action.score,
      };

    case 'SYSTEM_MESSAGE': {
      const sysEntry: TranscriptEntry = {
        id: `sys-${Date.now()}`,
        turn: state.turns,
        text: action.text,
        timestamp: Date.now(),
      };
      return {
        ...state,
        transcript: [...state.transcript, sysEntry],
      };
    }

    case 'ENGINE_STOPPED':
      return {
        ...state,
        isPlaying: false,
      };

    default:
      return state;
  }
}
