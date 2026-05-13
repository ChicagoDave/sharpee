/**
 * AC-8 — recording_notice surfaces in GET /state from the config
 * table; operator overrides via direct DB write stick.
 */

import { afterEach, beforeEach, describe, it, expect } from 'vitest';
import { buildServer, type ZifmiaServer } from '../src/server.js';
import { DEFAULT_RECORDING_NOTICE } from '../src/rooms/state-routes.js';

const STORIES = [{ slug: 'dungeo', path: '/fake/dungeo.sharpee' }] as const;

describe('AC-8 recording notice from config', () => {
  let server: ZifmiaServer;

  beforeEach(async () => {
    server = await buildServer({
      dbFile: ':memory:',
      stories: STORIES,
      recycleManualOnly: true
    });
  });

  afterEach(async () => {
    await server.close();
  });

  it('seeds the default recording_notice and surfaces it in GET /state', async () => {
    expect(server.config.get('recording_notice')).toBe(DEFAULT_RECORDING_NOTICE);

    await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    const roomRes = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'dungeo', title: 'R1' }
    });
    const roomId = (roomRes.json() as { room: { id: string } }).room.id;

    const stateRes = await server.app.inject({
      method: 'GET',
      url: `/api/rooms/${roomId}/state?handle=alice`
    });
    const body = stateRes.json() as { room: { recording_notice: string } };
    expect(body.room.recording_notice).toBe(DEFAULT_RECORDING_NOTICE);
  });

  it('operator override via config.set() takes effect on the next GET /state', async () => {
    server.config.set('recording_notice', 'Custom operator notice.');

    await server.app.inject({
      method: 'POST',
      url: '/api/identities',
      payload: { handle: 'alice' }
    });
    const roomRes = await server.app.inject({
      method: 'POST',
      url: '/api/rooms',
      payload: { handle: 'alice', story_slug: 'dungeo', title: 'R1' }
    });
    const roomId = (roomRes.json() as { room: { id: string } }).room.id;

    const stateRes = await server.app.inject({
      method: 'GET',
      url: `/api/rooms/${roomId}/state?handle=alice`
    });
    const body = stateRes.json() as { room: { recording_notice: string } };
    expect(body.room.recording_notice).toBe('Custom operator notice.');
  });

  it('seedDefaults is idempotent — existing values are preserved across reboot', async () => {
    server.config.set('recording_notice', 'Custom');
    server.config.seedDefaults();
    expect(server.config.get('recording_notice')).toBe('Custom');
  });
});
