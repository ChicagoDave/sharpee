/**
 * @sharpee/client-react
 *
 * Rich React web client for Sharpee interactive fiction
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
  useNotes,
  useProgress,
  useMap,
  useCommentary,
  type MapRoom,
  type MapConnection,
  type MapState,
  type CommentaryEntry,
  type CommentaryCategory,
  type CommentaryFilter,
} from './hooks';

// Components
export {
  GameShell,
  Transcript,
  CommandInput,
  StatusLine,
  TabPanel,
  NotesPanel,
  ProgressPanel,
  MapPanel,
  CommentaryPanel,
  type TabConfig,
} from './components';

// Types
export type {
  GameState,
  GameAction,
  TranscriptEntry,
  CurrentRoom,
  RoomExit,
} from './types';
