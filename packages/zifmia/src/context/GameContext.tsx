/**
 * GameContext - Main game state provider for the Zifmia story runner
 *
 * Manages game engine, transcript, score, and room state.
 * Uses reducer pattern for predictable state updates from engine events.
 */

import React, {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
  type Dispatch,
} from 'react';

import {
  GameState,
  GameAction,
  initialGameState,
  gameReducer,
  CurrentRoom,
  GameEvent,
} from '../types/game-state';

interface GameEngineInterface {
  on(event: string, handler: (...args: unknown[]) => void): void;
  off(event: string, handler: (...args: unknown[]) => void): void;
  executeTurn(input: string): Promise<unknown>;
  start(): void;
  stop(): void;
  getWorld(): WorldInterface;
}

interface WorldInterface {
  getEntity(id: string): EntityInterface | undefined;
  getPlayer(): EntityInterface | undefined;
  getLocation(entityId: string): string | undefined;
}

interface EntityInterface {
  id: string;
  getTrait<T>(type: string): T | undefined;
}

interface IdentityTrait {
  name?: string;
}

interface RoomTrait {
  exits?: Record<string, { destination: string; via?: string }>;
}

/**
 * Context value exposed to consumers
 */
interface GameContextValue {
  state: GameState;
  dispatch: Dispatch<GameAction>;
  executeCommand: (command: string) => Promise<void>;
  assetMap: Map<string, string>;
}

const GameContext = createContext<GameContextValue | null>(null);

/**
 * Hook to access game context
 */
export function useGameContext(): GameContextValue {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error('useGameContext must be used within a GameProvider');
  }
  return context;
}

/**
 * Hook to access just the game state
 */
export function useGameState(): GameState {
  return useGameContext().state;
}

/**
 * Hook to access just the dispatch function
 */
export function useGameDispatch(): Dispatch<GameAction> {
  return useGameContext().dispatch;
}

/**
 * Hook to access the asset map (path → blob URL)
 */
export function useAssetMap(): Map<string, string> {
  return useGameContext().assetMap;
}

/**
 * Handle to GameProvider internals, exposed via ref for save/restore integration
 */
export interface GameProviderHandle {
  getState(): GameState;
  dispatch: Dispatch<GameAction>;
}

/**
 * Props for GameProvider
 */
interface GameProviderProps {
  /** Pre-created game engine (story creates this) */
  engine: GameEngineInterface;
  /** Ref to access state/dispatch from outside the provider (for save/restore) */
  handleRef?: React.MutableRefObject<GameProviderHandle | null>;
  /** Called after each turn completes (for auto-save) */
  onTurnCompleted?: (state: GameState) => void;
  /** Called immediately when the engine emits a save-requested event */
  onSaveRequested?: () => void;
  /** Called immediately when the engine emits a restore-requested event */
  onRestoreRequested?: () => void;
  /** Asset map from bundle (path → blob URL) */
  assetMap?: Map<string, string>;
  children: ReactNode;
}

/**
 * Extract room information from the world model
 */
function extractCurrentRoom(world: WorldInterface, roomId: string): CurrentRoom | null {
  const room = world.getEntity(roomId);
  if (!room) return null;

  // Get room name from identity trait
  const identity = room.getTrait<IdentityTrait>('identity');
  const name = identity?.name || room.id;

  // Get exits from room trait (exits is a Record<DirectionType, IExitInfo>)
  const roomTrait = room.getTrait<RoomTrait>('room');
  const exitsRecord = roomTrait?.exits || {};

  // Convert Record to array
  const exits = Object.entries(exitsRecord).map(([direction, info]) => ({
    direction,
    destination: info.destination,
    via: info.via,
  }));

  return {
    id: room.id,
    name,
    exits,
    firstVisit: false, // Will be set by event data
  };
}

/**
 * GameProvider - Connects to a game engine and manages React state
 *
 * The engine is created externally (by the story's entry point) and passed in.
 * This component subscribes to engine events and updates React state.
 */
const EMPTY_ASSET_MAP = new Map<string, string>();

export function GameProvider({ engine, children, handleRef, onTurnCompleted, onSaveRequested, onRestoreRequested, assetMap }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const pendingCommand = useRef<string | undefined>();
  const engineRef = useRef(engine);
  const turnEventsBuffer = useRef<GameEvent[]>([]);
  const stateRef = useRef(state);
  stateRef.current = state;

  // Keep callback refs current to avoid stale closures in engine event handlers
  const onSaveRequestedRef = useRef(onSaveRequested);
  onSaveRequestedRef.current = onSaveRequested;
  const onRestoreRequestedRef = useRef(onRestoreRequested);
  onRestoreRequestedRef.current = onRestoreRequested;
  const onTurnCompletedRef = useRef(onTurnCompleted);
  onTurnCompletedRef.current = onTurnCompleted;

  // Expose handle for external access (save/restore)
  useEffect(() => {
    if (handleRef) {
      handleRef.current = {
        getState: () => stateRef.current,
        dispatch,
      };
    }
  }, [handleRef]);

  // Connect to engine on mount
  useEffect(() => {
    const eng = engineRef.current;
    const world = eng.getWorld();

    // Text output handler - fires at end of turn with collected events
    const handleTextOutput = (text: unknown, turn: unknown) => {
      // Log text output to console (matching thin web client behavior)
      console.log('[text:output]', { text, turn });

      // Capture buffered events and clear buffer
      const turnEvents = [...turnEventsBuffer.current];
      turnEventsBuffer.current = [];

      // Detect save/restore by events OR by command (events may not fire if action validate fails)
      const isSaveRestore = turnEvents.some(e =>
        e.type === 'if.event.save_requested' || e.type === 'if.event.restore_requested'
      );
      const cmd = pendingCommand.current?.trim().toLowerCase();
      const isSaveCommand = cmd === 'save';
      const isRestoreCommand = cmd === 'restore';
      const suppressText = isSaveRestore || isSaveCommand || isRestoreCommand;

      // Fire save/restore dialogs from command detection (fallback when events don't fire)
      if (isSaveCommand && !isSaveRestore && onSaveRequestedRef.current) {
        onSaveRequestedRef.current();
      }
      if (isRestoreCommand && !isSaveRestore && onRestoreRequestedRef.current) {
        onRestoreRequestedRef.current();
      }

      dispatch({
        type: 'TURN_COMPLETED',
        turn: turn as number,
        text: suppressText ? '' : text as string,
        command: pendingCommand.current,
        events: turnEvents,
      });
      pendingCommand.current = undefined;

      // Notify parent for auto-save (state updates asynchronously, use next tick)
      if (onTurnCompletedRef.current) {
        setTimeout(() => onTurnCompletedRef.current?.(stateRef.current), 0);
      }
    };

    // Event handler - collects all events during a turn
    const handleEvent = (event: unknown) => {
      const evt = event as GameEvent;

      // Log events to console (matching thin web client behavior)
      console.log('[event]', evt.type, evt.data);

      // Add to buffer for Commentary panel
      turnEventsBuffer.current.push(evt);

      // Handle room changes
      if (evt.type === 'if.event.actor_moved') {
        const data = evt.data as {
          toRoom?: string;
          destinationRoom?: { id: string; name?: string };
          firstVisit?: boolean;
          direction?: string;
          mapHint?: { dx?: number; dy?: number; dz?: number };
        };
        if (data.toRoom || data.destinationRoom?.id) {
          const roomId = data.toRoom || data.destinationRoom!.id;
          const room = extractCurrentRoom(world, roomId);
          if (room) {
            room.firstVisit = data.firstVisit ?? false;
            // Include the direction traveled to reach this room
            room.arrivedFrom = data.direction?.toLowerCase();
            // Include map hint if present (ADR-113)
            if (data.mapHint) {
              room.arrivedViaMapHint = data.mapHint;
            }
            dispatch({ type: 'ROOM_CHANGED', room });
          }
        }
      }

      // Handle score changes (from both score_changed and score_displayed events)
      if (evt.type === 'game.score_changed' || evt.type === 'if.event.score_displayed') {
        const data = evt.data as { newScore?: number; score?: number; maxScore?: number };
        const newScore = data.newScore ?? data.score;
        if (newScore !== undefined) {
          dispatch({
            type: 'SCORE_CHANGED',
            score: newScore,
            maxScore: data.maxScore,
          });
        }
      }

      // Handle save/restore requests — fire immediately (before text:output)
      if (evt.type === 'if.event.save_requested' && onSaveRequestedRef.current) {
        onSaveRequestedRef.current();
      }
      if (evt.type === 'if.event.restore_requested' && onRestoreRequestedRef.current) {
        onRestoreRequestedRef.current();
      }

      // Handle game start
      if (evt.type === 'game.started') {
        dispatch({ type: 'GAME_STARTED' });

        // Get initial room
        const player = world.getPlayer();
        if (player) {
          const locationId = world.getLocation(player.id);
          if (locationId) {
            const room = extractCurrentRoom(world, locationId);
            if (room) {
              room.firstVisit = true;
              dispatch({ type: 'ROOM_CHANGED', room });
            }
          }
        }
      }
    };

    // Subscribe to events
    eng.on('text:output', handleTextOutput);
    eng.on('event', handleEvent);

    // Mark engine as ready
    dispatch({ type: 'ENGINE_READY', engine: eng as unknown as GameState['engine'] });

    // Start engine and execute initial look (if not already started)
    // This ensures React is listening before events fire
    eng.start();
    eng.executeTurn('look');

    return () => {
      eng.off('text:output', handleTextOutput);
      eng.off('event', handleEvent);
      dispatch({ type: 'ENGINE_STOPPED' });
    };
  }, []);

  // Command execution callback
  const executeCommand = useCallback(
    async (command: string) => {
      if (!state.isPlaying) return;
      pendingCommand.current = command;
      await engineRef.current.executeTurn(command);
    },
    [state.isPlaying]
  );

  // Memoize context value
  const resolvedAssetMap = assetMap ?? EMPTY_ASSET_MAP;
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      executeCommand,
      assetMap: resolvedAssetMap,
    }),
    [state, executeCommand, resolvedAssetMap]
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export { GameContext };
