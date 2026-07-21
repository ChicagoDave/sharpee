/**
 * @sharpee/interpreter
 *
 * Sharpee story interpreter (legacy Tauri runner; the `zifmia` name
 * is reserved for the multi-user web product).
 */

// Context and providers
export {
  GameProvider,
  GameContext,
  useGameContext,
  useGameState,
  useGameDispatch,
} from './context/index.js';

// Hooks
export {
  useCommandHistory,
  useTranscript,
} from './hooks/index.js';

// Components
export {
  GameShell,
  Transcript,
  CommandInput,
  StatusLine,
} from './components/index.js';

// Loader
export {
  loadBundle,
  releaseBundle,
} from './loader/index.js';

export type {
  LoadedBundle,
} from './loader/index.js';

// Runner
export { ZifmiaRunner } from './runner/index.js';
export type { ZifmiaRunnerProps } from './runner/index.js';

// Storage
export type { StorageProvider, SaveSlotInfo } from './storage/index.js';
export { BrowserStorageProvider } from './storage/index.js';

// Types
export type {
  GameState,
  GameAction,
  TranscriptEntry,
  AnnotationType,
  CurrentRoom,
  RoomExit,
  StoryMetadata,
} from './types/index.js';
