/**
 * @sharpee/zifmia
 *
 * Zifmia - Sharpee story runner
 */

// Context and providers
export {
  GameProvider,
  GameContext,
  useGameContext,
  useGameState,
  useGameDispatch,
} from './context';

// Hooks
export {
  useCommandHistory,
  useTranscript,
} from './hooks';

// Components
export {
  GameShell,
  Transcript,
  CommandInput,
  StatusLine,
} from './components';

// Loader
export {
  loadBundle,
  releaseBundle,
} from './loader';

export type {
  LoadedBundle,
} from './loader';

// Runner
export { ZifmiaRunner } from './runner';
export type { ZifmiaRunnerProps } from './runner';

// Storage
export type { StorageProvider, SaveSlotInfo } from './storage';
export { BrowserStorageProvider } from './storage';

// Types
export type {
  GameState,
  GameAction,
  TranscriptEntry,
  AnnotationType,
  CurrentRoom,
  RoomExit,
  StoryMetadata,
} from './types';
