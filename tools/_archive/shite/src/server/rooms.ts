/**
 * @module @sharpee/zifmia/server/rooms
 * @purpose Room lifecycle routes:
 *   - `POST /rooms` — create a room against an admin-installed story
 *     (auth required). The server picks the latest active version of
 *     the supplied `storyId` and pins the room to it per ADR-175
 *     §AC-5 (saves stay with the bundle version that produced them).
 *   - `GET /rooms` — public lobby. Lists open public rooms only.
 *   - `GET /rooms/:id/state` — mid-session state load + WS-reconnect
 *     recovery target. Phase 3b returns a stub
 *     (`{cmgt: null, transcript: [], currentValues: {}}`); Phase 3c
 *     populates from the latest `save_blob` row.
 * @owner Zifmia server (tools/zifmia/server).
 */

import type { FastifyInstance } from 'fastify';

import { authMiddleware } from './auth-middleware';
import {
  captureRoomManifest,
  decodeEnvelope,
  type ChannelCmgtPacket,
  type TranscriptEntry
} from '../engine';
import { loadStoryFromBundle } from '../engine';
import type { StorageAdapter } from '../storage/adapter';
import type { Room } from '../storage/types';

export interface RoomRouteOptions {
  adapter: StorageAdapter;
}

interface CreateRoomBody {
  storyId?: unknown;
  title?: unknown;
  public?: unknown;
}

const TITLE_PATTERN = /^.{1,80}$/;
const STORY_ID_PATTERN = /^[A-Za-z0-9._-]{1,80}$/;

/**
 * Wire shape of `GET /rooms/:id/state`. `cmgt` carries the
 * channel-typed `CmgtPacket` (ADR-163/165) produced by capturing the
 * engine's `'channel:manifest'` emission for the room's pinned bundle.
 * `transcript` is the per-room transcript window from the latest
 * `save_blob`'s envelope, each entry optionally carrying a typed
 * `channelPacket` for clients to replay through their `Renderer`.
 * `currentValues` is reserved for future channel-state snapshots —
 * for now the client computes accumulated state by replaying transcript
 * `channelPacket`s through its `Renderer`.
 */
interface RoomStateBody {
  cmgt: ChannelCmgtPacket | null;
  transcript: TranscriptEntry[];
  currentValues: Record<string, never>;
}

function emptyRoomStateBody(): RoomStateBody {
  return { cmgt: null, transcript: [], currentValues: {} };
}

function roomBodyOk(body: unknown): {
  storyId: string;
  title: string;
  isPublic: boolean;
} | null {
  if (typeof body !== 'object' || body === null) return null;
  const { storyId, title, public: pub } = body as CreateRoomBody;
  if (typeof storyId !== 'string' || !STORY_ID_PATTERN.test(storyId)) return null;
  if (typeof title !== 'string' || !TITLE_PATTERN.test(title)) return null;
  // `public` is optional; default true (joinable lobby is the v1 norm).
  const isPublic = pub === undefined ? true : pub === true;
  return { storyId, title, isPublic };
}

export function registerRoomRoutes(
  app: FastifyInstance,
  options: RoomRouteOptions
): void {
  const auth = authMiddleware({ adapter: options.adapter });

  // ── POST /rooms ────────────────────────────────────────────────
  app.post(
    '/rooms',
    { preHandler: auth },
    async (request, reply) => {
      const parsed = roomBodyOk(request.body);
      if (!parsed) {
        return reply
          .code(400)
          .send({ error: 'invalid_body', detail: 'malformed_create_room' });
      }
      // request.identity is non-null after the auth preHandler.
      const identity = request.identity!;

      // ADR-175 §AC-5 — room pins to the latest active bundle version.
      // Phase 5 lands the install flow; until then the story library
      // is populated by tests / admin-installs and this lookup is
      // the canonical source of truth.
      const stories = await options.adapter.listStories({ activeOnly: true });
      const versionsForStory = stories
        .filter((s) => s.storyId === parsed.storyId)
        // Most-recent install wins; on tie (same millisecond — common
        // in tests, possible in fast batch installs) the higher
        // version string wins so "latest" stays deterministic.
        .sort((a, b) => {
          if (b.installedAt !== a.installedAt) {
            return b.installedAt - a.installedAt;
          }
          return b.version.localeCompare(a.version);
        });
      const latest = versionsForStory[0];
      if (!latest) {
        return reply.code(404).send({ error: 'story_not_found' });
      }

      const room = await options.adapter.createRoom({
        storyId: parsed.storyId,
        bundleVersion: latest.version,
        title: parsed.title,
        public: parsed.isPublic,
        createdBy: identity.id
      });

      // Phase 5b — audit room creation per ADR-175 §Resolved OQ-6.
      // Failure-mode policy: log + continue; the room already exists.
      try {
        await options.adapter.appendAuditEntry({
          actorId: identity.id,
          action: 'room.create',
          targetKind: 'room',
          targetId: room.id,
          detail: JSON.stringify({
            roomId: room.id,
            storyId: room.storyId,
            bundleVersion: room.bundleVersion,
            title: room.title,
            public: room.public
          })
        });
      } catch (auditErr) {
        request.log.error(
          { err: auditErr, roomId: room.id },
          'rooms: audit_write_failed'
        );
      }

      return reply.code(201).send(room);
    }
  );

  // ── GET /rooms ─────────────────────────────────────────────────
  app.get('/rooms', async (): Promise<Room[]> => {
    return options.adapter.listRooms({ publicOnly: true });
  });

  // ── GET /rooms/:id/state ───────────────────────────────────────
  // Phase 4a (ADR-175 §AC-7): the transcript field is populated from
  // the latest `save_blob` row's envelope. CMGT manifest and
  // `currentValues` remain `null` / `{}` until the channel-service
  // Manifest is wired into the state path (Phase 6).
  app.get(
    '/rooms/:id/state',
    { preHandler: auth },
    async (request, reply) => {
      const { id } = request.params as { id: string };
      const room = await options.adapter.getRoom(id);
      if (!room) {
        return reply.code(404).send({ error: 'room_not_found' });
      }
      // Capture the CMGT manifest for the room's pinned bundle.
      // Missing bundle is a server-state inconsistency; surface as 500
      // matching the command-route precedent (`bundle_not_installed`).
      const bundle = await options.adapter.getStoryBundle(
        room.storyId,
        room.bundleVersion
      );
      if (!bundle) {
        request.log.error(
          { roomId: id, storyId: room.storyId, version: room.bundleVersion },
          'rooms/state: bundle_not_installed'
        );
        return reply.code(500).send({ error: 'bundle_not_installed' });
      }
      const story = await loadStoryFromBundle({
        storyId: room.storyId,
        version: room.bundleVersion,
        bundle
      });
      const cmgt = await captureRoomManifest(
        room.storyId,
        room.bundleVersion,
        story
      );

      const latest = await options.adapter.getLatestSaveBlob(id);
      if (!latest) {
        return reply.send({ ...emptyRoomStateBody(), cmgt });
      }
      const envelope = decodeEnvelope(latest.payload);
      const body: RoomStateBody = {
        cmgt,
        transcript: envelope.transcript,
        currentValues: {},
      };
      return reply.send(body);
    }
  );
}
