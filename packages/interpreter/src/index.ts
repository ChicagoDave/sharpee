/**
 * @sharpee/interpreter
 *
 * Sharpee story interpreter (legacy Tauri runner). Excluded from the pnpm
 * workspace and not built.
 *
 * The `zifmia` name is RETIRED (2026-08-13) — the multi-user product it was
 * reserved for is archived at tools/_archive/zifmia. Two things here keep it
 * anyway and should NOT be renamed on sight:
 *   - `ZifmiaRunner` / `ZifmiaRunnerProps` are exported identifiers.
 *   - storage/browser-storage-provider.ts builds localStorage keys from the
 *     literal `zifmia-` prefix. Renaming them orphans every save any player
 *     already has, which is a migration, not a cleanup.
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
