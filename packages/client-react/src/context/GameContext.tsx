/**
 * GameContext - Main game state provider for the React client
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
 * Props for GameProvider
 */
interface GameProviderProps {
  /** Pre-created game engine (story creates this) */
  engine: GameEngineInterface;
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
export function GameProvider({ engine, children }: GameProviderProps) {
  const [state, dispatch] = useReducer(gameReducer, initialGameState);
  const pendingCommand = useRef<string | undefined>();
  const engineRef = useRef(engine);
  // Collect events during a turn for the Commentary panel
  const turnEventsBuffer = useRef<GameEvent[]>([]);

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

      dispatch({
        type: 'TURN_COMPLETED',
        turn: turn as number,
        text: text as string,
        command: pendingCommand.current,
        events: turnEvents,
      });
      pendingCommand.current = undefined;
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
        };
        if (data.toRoom || data.destinationRoom?.id) {
          const roomId = data.toRoom || data.destinationRoom!.id;
          const room = extractCurrentRoom(world, roomId);
          if (room) {
            room.firstVisit = data.firstVisit ?? false;
            dispatch({ type: 'ROOM_CHANGED', room });
          }
        }
      }

      // Handle score changes
      if (evt.type === 'game.score_changed') {
        const data = evt.data as { newScore?: number; maxScore?: number };
        if (data.newScore !== undefined) {
          dispatch({
            type: 'SCORE_CHANGED',
            score: data.newScore,
            maxScore: data.maxScore,
          });
        }
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
  const contextValue = useMemo(
    () => ({
      state,
      dispatch,
      executeCommand,
    }),
    [state, executeCommand]
  );

  return (
    <GameContext.Provider value={contextValue}>
      {children}
    </GameContext.Provider>
  );
}

export { GameContext };
