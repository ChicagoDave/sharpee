/**
 * @module @sharpee/zifmia/storage/postgres/postgres-adapter
 * @purpose Interface-conformant stub of the Postgres `StorageAdapter`.
 *   Every method throws `Error('PostgresAdapter not implemented')`.
 *   Phase 7 of the ADR-175 implementation plan fills it in with a real
 *   `pg` client and Postgres advisory locks for the room lease.
 * @owner Zifmia server (tools/zifmia/storage).
 *
 * This stub exists so the rest of the codebase (request handlers,
 * tests, config wiring) can already typecheck against the adapter
 * factory pattern. Constructing it is a no-op; calling any method
 * is an explicit error so accidental Postgres routing in v1 fails
 * loudly instead of silently bypassing storage.
 */

import type {
  AdapterDescription,
  AuditEntry,
  ChatMessage,
  Identity,
  NamedSave,
  Room,
  SaveBlob,
  StoryLibraryEntry
} from '../types';
import type { RoomLease, StorageAdapter } from '../adapter';

export interface PostgresAdapterOptions {
  /** Postgres connection URL (`postgres://user:pass@host:port/db`). */
  url: string;
  /** Maximum connection pool size; defaults to 10 once implemented. */
  poolMax?: number;
}

function unimplemented(method: string): never {
  throw new Error(
    `PostgresAdapter.${method} not implemented — Phase 7 of ADR-175 plan`
  );
}

export class PostgresAdapter implements StorageAdapter {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(private readonly options: PostgresAdapterOptions) {}

  describe(): AdapterDescription {
    return { kind: 'postgres', driverVersion: 'stub' };
  }

  async migrate(): Promise<void> {
    unimplemented('migrate');
  }
  async close(): Promise<void> {
    unimplemented('close');
  }

  async createIdentity(_input: { handle: string }): Promise<Identity> {
    unimplemented('createIdentity');
  }
  async getIdentityByHandle(_handle: string): Promise<Identity | null> {
    unimplemented('getIdentityByHandle');
  }
  async getIdentityById(_id: string): Promise<Identity | null> {
    unimplemented('getIdentityById');
  }
  async deleteIdentityByHandle(_handle: string): Promise<void> {
    unimplemented('deleteIdentityByHandle');
  }
  async setIdentityAdmin(_id: string, _isAdmin: boolean): Promise<void> {
    unimplemented('setIdentityAdmin');
  }

  async createRoom(_input: {
    storyId: string;
    bundleVersion: string;
    title: string;
    public: boolean;
    createdBy: string;
  }): Promise<Room> {
    unimplemented('createRoom');
  }
  async getRoom(_id: string): Promise<Room | null> {
    unimplemented('getRoom');
  }
  async listRooms(_options?: { publicOnly?: boolean }): Promise<Room[]> {
    unimplemented('listRooms');
  }
  async closeRoom(_id: string): Promise<void> {
    unimplemented('closeRoom');
  }

  async appendSaveBlob(_input: {
    roomId: string;
    turn: number;
    formatVersion: number;
    bundleVersion: string;
    payload: Uint8Array;
  }): Promise<void> {
    unimplemented('appendSaveBlob');
  }
  async getSaveBlobAt(
    _roomId: string,
    _turn: number
  ): Promise<SaveBlob | null> {
    unimplemented('getSaveBlobAt');
  }
  async getLatestSaveBlob(_roomId: string): Promise<SaveBlob | null> {
    unimplemented('getLatestSaveBlob');
  }
  async listSaveBlobTurns(_roomId: string): Promise<number[]> {
    unimplemented('listSaveBlobTurns');
  }
  async deleteSaveBlob(_roomId: string, _turn: number): Promise<void> {
    unimplemented('deleteSaveBlob');
  }

  async createNamedSave(_input: {
    roomId: string;
    atTurn: number;
    label: string;
    createdBy: string;
  }): Promise<NamedSave> {
    unimplemented('createNamedSave');
  }
  async listNamedSaves(_roomId: string): Promise<NamedSave[]> {
    unimplemented('listNamedSaves');
  }
  async getNamedSave(_saveId: string): Promise<NamedSave | null> {
    unimplemented('getNamedSave');
  }
  async deleteNamedSave(_saveId: string): Promise<void> {
    unimplemented('deleteNamedSave');
  }
  async truncateRoomHistory(_input: {
    roomId: string;
    keepThroughTurn: number;
  }): Promise<void> {
    unimplemented('truncateRoomHistory');
  }
  async compactRoomSaveBlobs(_roomId: string): Promise<{ deleted: number }> {
    unimplemented('compactRoomSaveBlobs');
  }

  async appendChatMessage(_input: {
    roomId: string;
    fromId: string;
    fromHandle: string;
    text: string;
    ts: number;
  }): Promise<ChatMessage> {
    unimplemented('appendChatMessage');
  }
  async listChatMessages(
    _roomId: string,
    _options?: { sinceTs?: number; limit?: number }
  ): Promise<ChatMessage[]> {
    unimplemented('listChatMessages');
  }

  async appendAuditEntry(_input: {
    actorId: string | null;
    action: string;
    targetKind: AuditEntry['targetKind'];
    targetId: string;
    detail: string;
  }): Promise<AuditEntry> {
    unimplemented('appendAuditEntry');
  }
  async listAuditEntries(_options?: {
    sinceTs?: number;
    limit?: number;
  }): Promise<AuditEntry[]> {
    unimplemented('listAuditEntries');
  }

  async installStoryBundle(_input: {
    storyId: string;
    version: string;
    ifid: string;
    title: string;
    installedBy: string;
    bundle: Uint8Array;
  }): Promise<StoryLibraryEntry> {
    unimplemented('installStoryBundle');
  }
  async getStoryLibraryEntry(
    _storyId: string,
    _version: string
  ): Promise<StoryLibraryEntry | null> {
    unimplemented('getStoryLibraryEntry');
  }
  async getStoryBundle(
    _storyId: string,
    _version: string
  ): Promise<Uint8Array | null> {
    unimplemented('getStoryBundle');
  }
  async listStories(_options?: {
    activeOnly?: boolean;
  }): Promise<StoryLibraryEntry[]> {
    unimplemented('listStories');
  }
  async removeStory(_storyId: string): Promise<void> {
    unimplemented('removeStory');
  }

  async acquireRoomLease(_roomId: string): Promise<RoomLease> {
    unimplemented('acquireRoomLease');
  }
}
