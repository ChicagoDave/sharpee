/**
 * @module @sharpee/zifmia/engine
 * @purpose Public barrel for the engine-integration layer.
 * @owner Zifmia server.
 */

export {
  executeTurnStatelessly,
  captureRoomManifest,
  clearManifestCacheForTests,
  RoomNotFoundError,
  RoomClosedError,
  BundleNotInstalledError,
} from './turn-executor';
export type { TurnExecutorInput } from './turn-executor';
export type {
  ChannelCmgtPacket,
  ChannelTurnPacket,
  TurnEvent,
  TurnPacket
} from './types';
export { loadStoryFromBundle, clearStoryCacheForTests } from './bundle-loader';
export {
  TRANSCRIPT_WINDOW,
  appendAndTruncate,
  decodeEnvelope,
  encodeEnvelope,
} from './save-envelope';
export type {
  TranscriptEntry,
  ZifmiaSaveEnvelope,
} from './save-envelope';
