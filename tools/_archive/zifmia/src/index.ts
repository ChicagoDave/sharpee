/**
 * @sharpee/zifmia — Multi-user web product (corrected).
 *
 * Authoritative design: docs/architecture/adrs/adr-177-multiuser-corrected.md
 * Plan: docs/work/multiuser/plan-20260512-adr-177.md
 *
 * Phase 1: identity (claim + erase) over SQLite.
 * Phase 2: rooms, participants, tier-gated governance, story scanner.
 * Phase 3: WS layer (hello / chat / lock / turn broadcast), command-router stub.
 * Phase 4: cascading succession + grace timer + recycle sweeper.
 * Phase 5a: session_events audit log + GET /state hydration + identity-erase 4007 wire.
 * Phase 5b: real engine integration (bundle-loader + per-turn engine + saves/restore).
 * Phase 6: delete (title-confirmed) + mute + DMs + recording-notice config table.
 */

export { buildServer, type BuildServerOptions, type ZifmiaServer } from './server.js';
export { openDatabase, type ZifmiaDatabase, type OpenDatabaseOptions } from './db/connect.js';
export { SCHEMA_V1_DDL, applySchemaV1 } from './db/schema.js';

export {
  createIdentityRepository,
  type IdentityRepository,
  type CreateIdentityResult,
  type EraseIdentityResult,
  type RepositoryOptions as IdentityRepositoryOptions
} from './identity/repository.js';
export { registerIdentityRoutes } from './identity/routes.js';
export {
  validateHandle,
  HANDLE_MIN_LENGTH,
  HANDLE_MAX_LENGTH,
  HANDLE_PATTERN,
  type HandleValidationResult
} from './identity/validation.js';
export type { Identity, IdentityError } from './identity/types.js';

export {
  createRoomsRepository,
  type RoomsRepository,
  type RoomsRepositoryOptions,
  type CreateRoomResult,
  type RenameRoomResult,
  type PinRoomResult
} from './rooms/repository.js';
export {
  createParticipantsRepository,
  type ParticipantsRepository,
  type ParticipantsRepositoryOptions,
  type JoinRoomResult,
  type SetTierResult,
  type NominateSuccessorResult
} from './rooms/participants.js';
export { registerRoomRoutes, type RoomRoutesDeps } from './rooms/routes.js';
export {
  generateJoinCode,
  normalizeJoinCode,
  CROCKFORD_ALPHABET,
  JOIN_CODE_LENGTH
} from './rooms/join-code.js';
export {
  TIERS,
  isTier,
  tierRank,
  type Tier,
  type Room,
  type Participant,
  type RoomSummary,
  type RoomError
} from './rooms/types.js';
export { loadCaller, requireMinTier, type LoadCallerResult } from './rooms/tier-gate.js';

export {
  createStoryScanner,
  type StoryScanner,
  type StoryEntry,
  type CreateStoryScannerOptions
} from './stories/scanner.js';
export { registerStoriesRoutes } from './stories/routes.js';

export {
  readStoredIdentity,
  writeStoredIdentity,
  clearStoredIdentity,
  STORAGE_KEY,
  type StoredIdentity
} from './client/identity-storage.js';

export {
  CLOSE_CODES,
  parseClientFrame,
  type WsCloseCode,
  type HelloFrame,
  type HelloAckFrame,
  type ChatSendFrame,
  type ChatMessageFrame,
  type LockAcquireFrame,
  type LockReleaseFrame,
  type LockStateFrame,
  type TurnPacket,
  type TurnFrame,
  type RoleChangeFrame,
  type PresenceFrame,
  type RoomRestoredFrame,
  type ClientFrame,
  type ServerFrame
} from './ws/types.js';
export {
  createRoomLock,
  LOCK_EXPIRY_MS_DEFAULT,
  LOCK_HEARTBEAT_MS_DEFAULT,
  type RoomLock,
  type LockState,
  type LockAcquireOutcome,
  type LockReleaseOutcome,
  type LockSchedulerOptions
} from './ws/lock.js';
export {
  createRoomsHub,
  newSocketId,
  type RoomsHub,
  type RoomSocket,
  type CreateRoomsHubOptions
} from './ws/rooms-hub.js';
export { registerWebSocketRoute, type WebSocketRouteDeps } from './ws/handler.js';
export {
  createEchoCommandRouter,
  type CommandRouter,
  type CommandSubmission,
  type CommandResult
} from './turns/command-router.js';
export { registerTurnRoutes, type TurnRoutesDeps } from './turns/routes.js';

export {
  createSuccessionService,
  DEFAULT_GRACE_MS,
  type SuccessionService,
  type CreateSuccessionServiceOptions,
  type GraceTimerHandle
} from './succession/service.js';
export {
  createRecycleSweeper,
  DEFAULT_RECYCLE_MS,
  DEFAULT_RECYCLE_CHECK_INTERVAL_MS,
  type RecycleSweeper,
  type CreateRecycleSweeperOptions,
  type RecycleIntervalHandle
} from './succession/recycle.js';

export {
  createSessionEventsRepository,
  TRANSCRIPT_BACKLOG_LIMIT,
  type SessionEventsRepository,
  type SessionEventsRepositoryOptions,
  type AppendInput as SessionEventsAppendInput,
  type ListByRoomOptions as SessionEventsListOptions
} from './sessions/events-repo.js';
export {
  SESSION_EVENT_KINDS,
  type SessionEvent,
  type SessionEventKind
} from './sessions/types.js';
export {
  registerRoomStateRoute,
  DEFAULT_RECORDING_NOTICE,
  type RoomStateRouteDeps
} from './rooms/state-routes.js';

export {
  loadStoryFromBundle,
  loadStoryFromFile,
  clearStoryCacheForTests
} from './engine/bundle-loader.js';
export {
  executeTurnAgainstStory,
  captureManifest,
  ENGINE_RUNTIME,
  type TurnExecutionInput,
  type TurnExecutionResult
} from './engine/turn-executor.js';
export {
  createRoomStateRepository,
  type RoomStateRepository,
  type RoomStateRepositoryOptions
} from './engine/room-state-repo.js';
export {
  createSavesRepository,
  type SavesRepository,
  type SavesRepositoryOptions,
  type SaveRow,
  type SaveRowWithBlob
} from './engine/saves-repo.js';
export {
  createEngineCommandRouter,
  encodeSaveData,
  decodeSaveData,
  type EngineCommandRouter,
  type CreateEngineCommandRouterOptions
} from './engine/engine-router.js';
export { registerSavesRoutes, type SavesRoutesDeps } from './engine/saves-routes.js';
export {
  createManifestCache,
  type ManifestCache,
  type CreateManifestCacheOptions
} from './engine/manifest-cache.js';
export {
  createStoryHealthChecker,
  validateScannerEntries,
  withHealthFilter,
  type StoryHealthChecker,
  type StoryHealthReport
} from './engine/story-health.js';

export {
  createConfigRepository,
  CONFIG_KEYS,
  DEFAULT_CONFIG,
  type ConfigRepository
} from './config/repo.js';
export type { MuteStateFrame, DmMessageFrame } from './ws/types.js';

export const ZIFMIA_VERSION = '0.1.0';
