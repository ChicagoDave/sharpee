// @vitest-environment happy-dom
/**
 * @module tests/web/admin-audit-manager.test
 * @purpose Behavior tests for `AdminAuditManager`. Asserts list +
 *   pager (sinceTs progression).
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminAuditManager } from '../../web/src/managers/admin-audit-manager';
import type {
  AdminAuditEntry,
  AdminAuditResponse,
  ApiResult
} from '../../web/src/api/types';

function ok<T>(value: T): ApiResult<T> {
  return { ok: true, value };
}

function entry(overrides: Partial<AdminAuditEntry> = {}): AdminAuditEntry {
  return {
    id: 'a-1',
    ts: 1_000_000,
    actorId: 'admin',
    action: 'story.install',
    targetKind: 'story',
    targetId: 'zork',
    detail: '{}',
    ...overrides
  };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('AdminAuditManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one row per entry on mount', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listAdminAudit = vi.fn().mockResolvedValue(
      ok<AdminAuditResponse>({
        entries: [
          entry({ id: 'a-1' }),
          entry({ id: 'a-2', action: 'room.kill' })
        ]
      })
    );
    const manager = new AdminAuditManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listAdminAudit }
    });
    await manager.mount();
    const rows = root.querySelectorAll('[data-audit-id]');
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('data-audit-id')).toBe('a-1');
  });

  it('Load more uses sinceTs of the oldest entry', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    // First page: 50 entries (the page limit). Second page: 1 entry.
    const page1 = Array.from({ length: 50 }, (_, i) =>
      entry({ id: `a-${i}`, ts: 1_000_000 - i })
    );
    const oldestTs = page1[page1.length - 1].ts;
    const listAdminAudit = vi
      .fn()
      .mockResolvedValueOnce(ok<AdminAuditResponse>({ entries: page1 }))
      .mockResolvedValueOnce(
        ok<AdminAuditResponse>({
          entries: [entry({ id: 'a-50', ts: oldestTs - 1 })]
        })
      );
    const manager = new AdminAuditManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listAdminAudit }
    });
    await manager.mount();
    expect(listAdminAudit).toHaveBeenCalledWith(
      { sinceTs: undefined, limit: 50 },
      { sessionToken: 't' }
    );
    expect(
      (root.querySelector('[data-role="admin-audit-more"]') as HTMLButtonElement).disabled
    ).toBe(false);

    (root.querySelector('[data-role="admin-audit-more"]') as HTMLButtonElement).click();
    await flush();
    expect(listAdminAudit).toHaveBeenLastCalledWith(
      { sinceTs: oldestTs, limit: 50 },
      { sessionToken: 't' }
    );
    expect(root.querySelectorAll('[data-audit-id]')).toHaveLength(51);
  });

  it('disables Load more when the page is under the limit', async () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listAdminAudit = vi.fn().mockResolvedValue(
      ok<AdminAuditResponse>({ entries: [entry()] })
    );
    const manager = new AdminAuditManager({
      root,
      httpOptions: { sessionToken: 't' },
      api: { listAdminAudit }
    });
    await manager.mount();
    expect(
      (root.querySelector('[data-role="admin-audit-more"]') as HTMLButtonElement).disabled
    ).toBe(true);
  });
});
