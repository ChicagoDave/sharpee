// @vitest-environment happy-dom
/**
 * @module tests/web/admin-rooms-manager.test
 * @purpose Behavior tests for `AdminRoomsManager`. Asserts list,
 *   kill (DELETE), error surfaces, refresh button.
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminRoomsManager } from '../../web/src/managers/admin-rooms-manager';
import type { ApiResult, RoomSummary } from '../../web/src/api/types';

function ok<T>(value: T): ApiResult<T> {
  return { ok: true, value };
}
function err<T>(status: number, error: string): ApiResult<T> {
  return { ok: false, status, error };
}

function room(overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    id: 'r-1',
    storyId: 'zork',
    bundleVersion: '1.0.0',
    title: 'Room',
    public: true,
    createdBy: 'me',
    createdAt: 0,
    ...overrides
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('AdminRoomsManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one row per active room on mount', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listRooms = vi.fn().mockResolvedValue(
      ok<RoomSummary[]>([
        room({ id: 'r-1', title: 'A' }),
        room({ id: 'r-2', title: 'B' })
      ])
    );
    const killAdminRoom = vi.fn();
    const manager = new AdminRoomsManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listRooms, killAdminRoom }
    });
    await manager.mount();
    const rows = root.querySelectorAll('[data-room-id]');
    expect(rows).toHaveLength(2);
    expect(rows[0].textContent).toContain('A');
  });

  it('kill → DELETE called, row removed from DOM', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listRooms = vi.fn().mockResolvedValue(
      ok<RoomSummary[]>([room({ id: 'r-1', title: 'A' })])
    );
    const killAdminRoom = vi.fn().mockResolvedValue(ok(undefined));
    const manager = new AdminRoomsManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listRooms, killAdminRoom }
    });
    await manager.mount();
    (
      root.querySelector(
        '[data-room-id="r-1"] [data-action="kill"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    expect(killAdminRoom).toHaveBeenCalledWith('r-1', { sessionToken: 't' });
    expect(root.querySelector('[data-room-id="r-1"]')).toBeNull();
  });

  it('kill error surfaces inline; row remains', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listRooms = vi.fn().mockResolvedValue(
      ok<RoomSummary[]>([room({ id: 'r-1' })])
    );
    const killAdminRoom = vi.fn().mockResolvedValue(err(500, 'internal_error'));
    const manager = new AdminRoomsManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listRooms, killAdminRoom }
    });
    await manager.mount();
    (
      root.querySelector(
        '[data-room-id="r-1"] [data-action="kill"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    const errEl = root.querySelector(
      '[data-role="admin-rooms-error"]'
    ) as HTMLElement;
    expect(errEl.hidden).toBe(false);
    expect(root.querySelector('[data-room-id="r-1"]')).not.toBeNull();
  });
});
