// @vitest-environment happy-dom
/**
 * @module tests/web/admin-stories-manager.test
 * @purpose Behavior tests for `AdminStoriesManager`. Asserts list,
 *   upload (file → octet-stream POST), remove. Empty state + error
 *   surfaces. No vocabulary-contract test here — the admin tab
 *   surfaces are deliberately decoration-namespaced under
 *   `.sharpee-admin-content` per the AdminView convention.
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { AdminStoriesManager } from '../../web/src/managers/admin-stories-manager';
import type {
  AdminStoriesResponse,
  AdminStoryEntry,
  ApiResult
} from '../../web/src/api/types';

function ok<T>(value: T): ApiResult<T> {
  return { ok: true, value };
}

function err<T>(status: number, error: string): ApiResult<T> {
  return { ok: false, status, error };
}

function story(overrides: Partial<AdminStoryEntry> = {}): AdminStoryEntry {
  return {
    storyId: 'zork',
    version: '1.0.0',
    ifid: 'IFID-Z',
    title: 'Zork',
    installedBy: 'admin',
    installedAt: 1,
    active: true,
    ...overrides
  };
}

interface Harness {
  root: HTMLElement;
  listAdminStories: ReturnType<typeof vi.fn>;
  uploadAdminStory: ReturnType<typeof vi.fn>;
  removeAdminStory: ReturnType<typeof vi.fn>;
  manager: AdminStoriesManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const listAdminStories = vi.fn();
  const uploadAdminStory = vi.fn();
  const removeAdminStory = vi.fn();
  const manager = new AdminStoriesManager({
    root,
    httpOptions: { sessionToken: 't' },
    api: { listAdminStories, uploadAdminStory, removeAdminStory }
  });
  return { root, listAdminStories, uploadAdminStory, removeAdminStory, manager };
}

async function flush(): Promise<void> {
  for (let i = 0; i < 8; i++) await Promise.resolve();
}

describe('AdminStoriesManager', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('renders one row per story on mount', async () => {
    const h = makeHarness();
    h.listAdminStories.mockResolvedValue(
      ok<AdminStoriesResponse>({
        stories: [
          story({ storyId: 'zork', title: 'Zork' }),
          story({ storyId: 'dungeo', title: 'Dungeo' })
        ]
      })
    );
    await h.manager.mount();
    const rows = h.root.querySelectorAll('[data-story-id]');
    expect(rows).toHaveLength(2);
    expect(rows[0].getAttribute('data-story-id')).toBe('zork');
    expect(rows[0].textContent).toContain('Zork');
  });

  it('renders empty-state when no stories installed', async () => {
    const h = makeHarness();
    h.listAdminStories.mockResolvedValue(ok({ stories: [] }));
    await h.manager.mount();
    expect(
      h.root.querySelector('[data-role="admin-stories-empty"]')
    ).not.toBeNull();
  });

  it('list error surfaces inline', async () => {
    const h = makeHarness();
    h.listAdminStories.mockResolvedValue(err<AdminStoriesResponse>(500, 'internal_error'));
    await h.manager.mount();
    const errEl = h.root.querySelector(
      '[data-role="admin-stories-error"]'
    ) as HTMLElement;
    expect(errEl.hidden).toBe(false);
    expect(errEl.textContent).toContain('Could not load stories');
  });

  it('remove → DELETE called with storyId; row refreshes', async () => {
    const h = makeHarness();
    h.listAdminStories
      .mockResolvedValueOnce(
        ok<AdminStoriesResponse>({
          stories: [story({ storyId: 'zork', title: 'Zork' })]
        })
      )
      .mockResolvedValueOnce(ok<AdminStoriesResponse>({ stories: [] }));
    h.removeAdminStory.mockResolvedValueOnce(ok(undefined));
    await h.manager.mount();
    (
      h.root.querySelector(
        '[data-story-id="zork"] [data-action="remove"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    expect(h.removeAdminStory).toHaveBeenCalledWith('zork', { sessionToken: 't' });
    expect(h.listAdminStories).toHaveBeenCalledTimes(2);
    expect(h.root.querySelector('[data-story-id="zork"]')).toBeNull();
  });

  it('upload posts the file bytes and refreshes', async () => {
    const h = makeHarness();
    h.listAdminStories
      .mockResolvedValueOnce(ok<AdminStoriesResponse>({ stories: [] }))
      .mockResolvedValueOnce(
        ok<AdminStoriesResponse>({
          stories: [story({ storyId: 'new-story', title: 'New' })]
        })
      );
    h.uploadAdminStory.mockResolvedValueOnce(ok(story({ storyId: 'new-story' })));
    await h.manager.mount();

    const file = new File([new Uint8Array([1, 2, 3])], 'bundle.sharpee', {
      type: 'application/octet-stream'
    });
    const input = h.root.querySelector(
      '[data-role="admin-stories-file"]'
    ) as HTMLInputElement;
    Object.defineProperty(input, 'files', {
      configurable: true,
      get: () => [file] as unknown as FileList
    });
    input.dispatchEvent(new Event('change'));
    const uploadBtn = h.root.querySelector(
      '[data-role="admin-stories-upload"]'
    ) as HTMLButtonElement;
    expect(uploadBtn.disabled).toBe(false);
    uploadBtn.click();
    await flush();

    expect(h.uploadAdminStory).toHaveBeenCalled();
    // Refresh fired after upload.
    expect(h.listAdminStories).toHaveBeenCalledTimes(2);
    expect(h.root.querySelector('[data-story-id="new-story"]')).not.toBeNull();
  });

  it('unmount removes the panel from the DOM', async () => {
    const h = makeHarness();
    h.listAdminStories.mockResolvedValue(ok({ stories: [] }));
    await h.manager.mount();
    h.manager.unmount();
    expect(h.root.querySelector('[data-role="admin-stories"]')).toBeNull();
  });
});
