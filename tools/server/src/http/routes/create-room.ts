/**
 * POST /api/rooms — creates a room and issues a Primary Host token.
 *
 * Public interface: {@link createRoomRoute}, {@link CreateRoomDeps},
 * {@link CreateRoomResponse}.
 * Bounded context: HTTP layer (ADR-153 Decision 3, Decision 4, Decision 11).
 *
 * Atomicity: the room row, Primary Host participant row, and both
 * `lifecycle(created)` + `join(reconnect=false)` events are written in
 * one `db.transaction`. If any step fails, none are committed.
 */

import type { Hono } from 'hono';
import { randomUUID } from 'node:crypto';
import type { Database } from 'better-sqlite3';
import type { RoomsRepository } from '../../repositories/rooms.js';
import type { ParticipantsRepository } from '../../repositories/participants.js';
import type { SessionEventsRepository } from '../../repositories/session-events.js';
import type { StoryScanner } from '../../stories/scanner.js';
import type { StoryHealth } from '../../stories/story-health.js';
import type { CaptchaVerifier } from '../middleware/captcha.js';
import { HttpError } from '../middleware/error-envelope.js';
import { generateToken } from '../tokens.js';

export interface CreateRoomDeps {
  db: Database;
  rooms: RoomsRepository;
  participants: ParticipantsRepository;
  sessionEvents: SessionEventsRepository;
  stories: StoryScanner;
  /**
   * Optional boot-time validator (ADR-153 N-6). When present, a story whose
   * recorded status is unhealthy causes the request to fail fast with
   * `story_load_failed`, before any DB writes. When absent, the legacy
   * "trust the scanner" behaviour is preserved.
   */
  storyHealth?: StoryHealth;
  captcha: CaptchaVerifier;
}

export interface CreateRoomResponse {
  room_id: string;
  join_code: string;
  join_url: string;
  token: string;
  tier: 'primary_host';
  participant_id: string;
}

interface CreateRoomBody {
  story_slug?: unknown;
  title?: unknown;
  display_name?: unknown;
  captcha_token?: unknown;
}

export function registerCreateRoomRoute(app: Hono, deps: CreateRoomDeps): void {
  app.post('/api/rooms', async (c) => {
    const body = (await c.req.json().catch(() => null)) as CreateRoomBody | null;
    if (!body) throw new HttpError(400, 'bad_request', 'JSON body required');

    const story_slug = typeof body.story_slug === 'string' ? body.story_slug : '';
    const display_name = typeof body.display_name === 'string' ? body.display_name.trim() : '';
    const rawTitle = typeof body.title === 'string' ? body.title.trim() : '';
    const captchaToken = typeof body.captcha_token === 'string' ? body.captcha_token : undefined;

    if (!story_slug) throw new HttpError(400, 'missing_field', 'story_slug is required');
    if (!display_name) throw new HttpError(400, 'missing_field', 'display_name is required');

    // CAPTCHA runs BEFORE any DB work — a rejected challenge leaves no trace.
    await deps.captcha.verify(captchaToken);

    const story = deps.stories.findBySlug(story_slug);
    if (!story) throw new HttpError(400, 'unknown_story', `No story with slug ${story_slug}`);

    // N-6: if boot-time validation recorded this story as broken, reject
    // here — before any DB write or sandbox spawn — so no partial room
    // ever exists for an unloadable story.
    const health = deps.storyHealth?.check(story_slug);
    if (health && !health.healthy) {
      throw new HttpError(
        500,
        'story_load_failed',
        health.error ?? 'story failed to load at server startup'
      );
    }

    const title = rawTitle || `${story.title} — ${new Date().toISOString().slice(0, 10)}`;

    // Pre-generate ids so we can insert room + participant + events in one transaction.
    const participant_id = randomUUID();
    const token = generateToken();

    const tx = deps.db.transaction(() => {
      const room = deps.rooms.create({ title, story_slug, primary_host_id: participant_id });
      deps.participants.createWithId({
        participant_id,
        room_id: room.room_id,
        token,
        display_name,
        tier: 'primary_host',
      });
      deps.sessionEvents.append({
        room_id: room.room_id,
        participant_id: null,
        kind: 'lifecycle',
        payload: { kind: 'lifecycle', op: 'created' },
      });
      deps.sessionEvents.append({
        room_id: room.room_id,
        participant_id,
        kind: 'join',
        payload: { kind: 'join', display_name, reconnect: false },
      });
      return room;
    });
    const room = tx();

    const response: CreateRoomResponse = {
      room_id: room.room_id,
      join_code: room.join_code,
      join_url: `/r/${room.join_code}`,
      token,
      tier: 'primary_host',
      participant_id,
    };
    return c.json(response, 201);
  });
}
