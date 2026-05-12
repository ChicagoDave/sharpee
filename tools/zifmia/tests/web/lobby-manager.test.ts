// @vitest-environment happy-dom
/**
 * @module tests/web/lobby-manager.test
 * @purpose Behavior tests for `LobbyManager`. Asserts:
 *   - DOM contract: `.sharpee-lobby` > `.sharpee-lobby-list` mounted
 *   - Empty-state row when `GET /rooms` returns `[]`
 *   - One `.sharpee-lobby-item` per room with title + storyId
 *   - Click row → `onEnterRoom(roomId)` fires
 *   - Create-room dialog opens, populates story dropdown from
 *     `GET /stories`, submits to `POST /rooms`, navigates on success
 *   - Server validation errors (`invalid_body`, `story_not_found`)
 *     surface inline without closing the dialog
 *   - ADR-176 vocabulary contract — every `sharpee-*` class rendered
 *     is in the 36-class set (or the LobbyManager's owned namespace).
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import type {
  ApiResult,
  CreatedRoom,
  RoomSummary,
  StoriesResponse
} from '../../web/src/api/types';
import { LobbyManager } from '../../web/src/managers/lobby-manager';

interface Harness {
  root: HTMLElement;
  onEnterRoom: ReturnType<typeof vi.fn<[string], void>>;
  listRooms: ReturnType<typeof vi.fn>;
  createRoom: ReturnType<typeof vi.fn>;
  listStories: ReturnType<typeof vi.fn>;
  manager: LobbyManager;
}

function okRooms(value: RoomSummary[]): ApiResult<RoomSummary[]> {
  return { ok: true, value };
}

function okStories(value: StoriesResponse): ApiResult<StoriesResponse> {
  return { ok: true, value };
}

function okCreated(value: CreatedRoom): ApiResult<CreatedRoom> {
  return { ok: true, value };
}

function errCreated(
  status: number,
  error: string,
  detail?: string
): ApiResult<CreatedRoom> {
  return { ok: false, status, error, detail };
}

function room(overrides: Partial<RoomSummary> = {}): RoomSummary {
  return {
    id: 'room-1',
    storyId: 'zork',
    bundleVersion: '1.0.0',
    title: 'Zork run',
    public: true,
    createdBy: 'id-1',
    createdAt: 0,
    ...overrides
  };
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const onEnterRoom = vi.fn<[string], void>();
  const listRooms = vi.fn();
  const createRoom = vi.fn();
  const listStories = vi.fn();
  const manager = new LobbyManager({
    root,
    httpOptions: { sessionToken: 'tok-1' },
    onEnterRoom,
    api: { listRooms, createRoom, listStories }
  });
  return { root, onEnterRoom, listRooms, createRoom, listStories, manager };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('LobbyManager.mount', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.listRooms.mockResolvedValue(okRooms([]));
  });

  it('appends a .sharpee-lobby with .sharpee-lobby-list and a Create-room button', async () => {
    await h.manager.mount();
    expect(h.root.querySelector('section.sharpee-lobby')).not.toBeNull();
    expect(h.root.querySelector('ul.sharpee-lobby-list')).not.toBeNull();
    expect(
      h.root.querySelector('[data-role="create-button"]')
    ).not.toBeNull();
  });

  it('calls GET /rooms on mount with the provided httpOptions', async () => {
    await h.manager.mount();
    expect(h.listRooms).toHaveBeenCalledWith({ sessionToken: 'tok-1' });
  });

  it('mount is idempotent (re-calling does not duplicate the lobby)', async () => {
    await h.manager.mount();
    await h.manager.mount();
    expect(h.root.querySelectorAll('section.sharpee-lobby')).toHaveLength(1);
  });
});

describe('LobbyManager — rendering rooms', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  it('renders an empty-state row when GET /rooms returns []', async () => {
    h.listRooms.mockResolvedValue(okRooms([]));
    await h.manager.mount();
    const items = h.root.querySelectorAll('.sharpee-lobby-item');
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('data-role')).toBe('lobby-empty');
    expect(items[0].textContent).toContain('No rooms yet');
  });

  it('renders one .sharpee-lobby-item per room with title and storyId', async () => {
    h.listRooms.mockResolvedValue(
      okRooms([
        room({ id: 'r-1', title: 'Zork run', storyId: 'zork' }),
        room({ id: 'r-2', title: 'Dungeo speed', storyId: 'dungeo' })
      ])
    );
    await h.manager.mount();
    const items = h.root.querySelectorAll<HTMLElement>('.sharpee-lobby-item');
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-room-id')).toBe('r-1');
    expect(items[0].textContent).toContain('Zork run');
    expect(items[0].textContent).toContain('zork');
    expect(items[1].getAttribute('data-room-id')).toBe('r-2');
    expect(items[1].textContent).toContain('Dungeo speed');
  });

  it('clicking a room row fires onEnterRoom with the roomId', async () => {
    h.listRooms.mockResolvedValue(okRooms([room({ id: 'r-7' })]));
    await h.manager.mount();
    const row = h.root.querySelector<HTMLElement>('[data-room-id="r-7"]');
    row?.click();
    expect(h.onEnterRoom).toHaveBeenCalledWith('r-7');
  });

  it('refresh() re-fetches and re-renders the list', async () => {
    h.listRooms.mockResolvedValueOnce(okRooms([]));
    await h.manager.mount();
    h.listRooms.mockResolvedValueOnce(okRooms([room({ id: 'r-9' })]));
    await h.manager.refresh();
    const row = h.root.querySelector<HTMLElement>('[data-room-id="r-9"]');
    expect(row).not.toBeNull();
  });

  it('surfaces a list-fetch error inline without breaking the page', async () => {
    h.listRooms.mockResolvedValue({
      ok: false,
      status: 500,
      error: 'internal_error'
    } as ApiResult<RoomSummary[]>);
    await h.manager.mount();
    const error = h.root.querySelector<HTMLElement>(
      '[data-role="lobby-error"]'
    );
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toContain('Could not load rooms');
  });
});

describe('LobbyManager — create dialog', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.listRooms.mockResolvedValue(okRooms([]));
  });

  async function openDialog(): Promise<void> {
    h.listStories.mockResolvedValueOnce(
      okStories({
        stories: [
          { storyId: 'zork', title: 'Zork', version: '1.0.0' },
          { storyId: 'dungeo', title: 'Dungeo', version: '0.5.0' }
        ]
      })
    );
    const button = h.root.querySelector<HTMLButtonElement>(
      '[data-role="create-button"]'
    );
    button?.click();
    await flush();
  }

  it('populates the story dropdown from GET /stories when opened', async () => {
    await h.manager.mount();
    await openDialog();
    const select = h.root.querySelector<HTMLSelectElement>(
      '[data-role="create-story"]'
    );
    expect(select).not.toBeNull();
    // 1 placeholder + 2 stories.
    expect(select!.querySelectorAll('option')).toHaveLength(3);
    const values = Array.from(select!.querySelectorAll('option')).map(
      (o) => o.value
    );
    expect(values).toEqual(['', 'zork', 'dungeo']);
  });

  it('disables submit when no stories are installed', async () => {
    await h.manager.mount();
    h.listStories.mockResolvedValueOnce(okStories({ stories: [] }));
    const button = h.root.querySelector<HTMLButtonElement>(
      '[data-role="create-button"]'
    );
    button?.click();
    await flush();
    const submit = h.root.querySelector<HTMLButtonElement>(
      '[data-role="create-submit"]'
    );
    expect(submit?.disabled).toBe(true);
  });

  it('submits POST /rooms with form values and fires onEnterRoom on success', async () => {
    await h.manager.mount();
    await openDialog();
    const select = h.root.querySelector<HTMLSelectElement>(
      '[data-role="create-story"]'
    )!;
    const title = h.root.querySelector<HTMLInputElement>('[name="title"]')!;
    select.value = 'zork';
    title.value = 'My run';
    h.createRoom.mockResolvedValueOnce(
      okCreated(room({ id: 'r-new', storyId: 'zork', title: 'My run' }))
    );
    const form = h.root.querySelector<HTMLFormElement>(
      '[data-role="create-form"]'
    )!;
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(h.createRoom).toHaveBeenCalledWith(
      { storyId: 'zork', title: 'My run', public: true },
      { sessionToken: 'tok-1' }
    );
    expect(h.onEnterRoom).toHaveBeenCalledWith('r-new');
  });

  it('respects the private radio when submitting', async () => {
    await h.manager.mount();
    await openDialog();
    const select = h.root.querySelector<HTMLSelectElement>(
      '[data-role="create-story"]'
    )!;
    const title = h.root.querySelector<HTMLInputElement>('[name="title"]')!;
    const privateRadio = h.root.querySelector<HTMLInputElement>(
      'input[name="public"][value="false"]'
    )!;
    select.value = 'zork';
    title.value = 'Hidden';
    privateRadio.checked = true;
    h.createRoom.mockResolvedValueOnce(okCreated(room({ id: 'r-p' })));
    h.root
      .querySelector<HTMLFormElement>('[data-role="create-form"]')!
      .dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    await flush();
    expect(h.createRoom).toHaveBeenCalledWith(
      { storyId: 'zork', title: 'Hidden', public: false },
      { sessionToken: 'tok-1' }
    );
  });

  it('blocks empty submission without a network call', async () => {
    await h.manager.mount();
    await openDialog();
    h.root
      .querySelector<HTMLFormElement>('[data-role="create-form"]')!
      .dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    await flush();
    expect(h.createRoom).not.toHaveBeenCalled();
    const error = h.root.querySelector<HTMLElement>(
      '[data-role="create-error"]'
    );
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toContain('Pick a story');
  });

  it('surfaces invalid_body without firing onEnterRoom', async () => {
    await h.manager.mount();
    await openDialog();
    const select = h.root.querySelector<HTMLSelectElement>(
      '[data-role="create-story"]'
    )!;
    const title = h.root.querySelector<HTMLInputElement>('[name="title"]')!;
    select.value = 'zork';
    title.value = 'My run';
    h.createRoom.mockResolvedValueOnce(errCreated(400, 'invalid_body'));
    h.root
      .querySelector<HTMLFormElement>('[data-role="create-form"]')!
      .dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    await flush();
    const error = h.root.querySelector<HTMLElement>(
      '[data-role="create-error"]'
    );
    expect(error?.hidden).toBe(false);
    expect(error?.textContent).toContain('Title or story is invalid');
    expect(h.onEnterRoom).not.toHaveBeenCalled();
  });

  it('surfaces story_not_found with a specific message', async () => {
    await h.manager.mount();
    await openDialog();
    const select = h.root.querySelector<HTMLSelectElement>(
      '[data-role="create-story"]'
    )!;
    const title = h.root.querySelector<HTMLInputElement>('[name="title"]')!;
    select.value = 'zork';
    title.value = 'My run';
    h.createRoom.mockResolvedValueOnce(errCreated(404, 'story_not_found'));
    h.root
      .querySelector<HTMLFormElement>('[data-role="create-form"]')!
      .dispatchEvent(
        new Event('submit', { cancelable: true, bubbles: true })
      );
    await flush();
    const error = h.root.querySelector<HTMLElement>(
      '[data-role="create-error"]'
    );
    expect(error?.textContent).toContain('not installed');
  });

  it('Cancel button closes the dialog without calling createRoom', async () => {
    await h.manager.mount();
    await openDialog();
    const cancel = h.root.querySelector<HTMLButtonElement>(
      '[data-role="create-cancel"]'
    )!;
    cancel.click();
    expect(h.createRoom).not.toHaveBeenCalled();
  });
});

describe('LobbyManager.unmount', () => {
  it('removes the lobby from the DOM', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.listRooms.mockResolvedValue(okRooms([]));
    await h.manager.mount();
    expect(h.root.querySelector('.sharpee-lobby')).not.toBeNull();
    h.manager.unmount();
    expect(h.root.querySelector('.sharpee-lobby')).toBeNull();
  });

  it('unmount before mount is a no-op', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    expect(() => h.manager.unmount()).not.toThrow();
  });
});

describe('ADR-176 contract — every rendered class is in the vocabulary', () => {
  const VOCAB = new Set([
    // ADR-170 (22)
    'sharpee-window',
    'sharpee-window-title',
    'sharpee-window-title-bar',
    'sharpee-window-title-bar-controls',
    'sharpee-menu-bar',
    'sharpee-menu-bar-item',
    'sharpee-menu-bar-trigger',
    'sharpee-menu-dropdown',
    'sharpee-menu-option',
    'sharpee-menu-separator',
    'sharpee-menu-submenu-indicator',
    'sharpee-status-bar',
    'sharpee-prose-pane',
    'sharpee-prose-overlay',
    'sharpee-input-bar',
    'sharpee-input-prompt',
    'sharpee-input-field',
    'sharpee-dialog',
    'sharpee-dialog-title',
    'sharpee-dialog-body',
    'sharpee-dialog-buttons',
    'sharpee-dialog-button',
    // ADR-176 (14)
    'sharpee-presence-panel',
    'sharpee-presence-list',
    'sharpee-presence-item',
    'sharpee-presence-avatar',
    'sharpee-chat-panel',
    'sharpee-chat-history',
    'sharpee-chat-message',
    'sharpee-chat-message-author',
    'sharpee-chat-message-text',
    'sharpee-chat-input',
    'sharpee-lock-banner',
    'sharpee-lobby',
    'sharpee-lobby-list',
    'sharpee-lobby-item',
    'sharpee-saves-panel',
    'sharpee-saves-list',
    'sharpee-saves-item',
    'sharpee-identity-form'
  ]);

  // Internal decoration namespaces — themes target the parent contract
  // class, not these. Matches the IdentityManager precedent
  // (`sharpee-identity-form-*`).
  const INTERNAL_PREFIXES = [
    'sharpee-identity-form-',
    'sharpee-lobby-header',
    'sharpee-lobby-title',
    'sharpee-lobby-error',
    'sharpee-lobby-item-',
    'sharpee-dialog-field',
    'sharpee-dialog-error'
  ];

  function inVocab(cls: string): boolean {
    if (!cls.startsWith('sharpee-')) return true;
    if (cls.endsWith('--hidden') || cls.endsWith('--locked')) return true;
    if (INTERNAL_PREFIXES.some((p) => cls.startsWith(p) || cls === p.replace(/-$/, ''))) {
      return true;
    }
    return VOCAB.has(cls);
  }

  it('LobbyManager only uses contract classes (after mount)', async () => {
    document.body.innerHTML = '';
    const root = document.createElement('div');
    document.body.appendChild(root);
    const listRooms = vi.fn().mockResolvedValue(
      okRooms([room({ id: 'r-1' })])
    );
    const listStories = vi.fn().mockResolvedValue(
      okStories({ stories: [{ storyId: 'zork', title: 'Zork', version: '1.0.0' }] })
    );
    const createRoom = vi.fn();
    const manager = new LobbyManager({
      root,
      httpOptions: {},
      onEnterRoom: () => {},
      api: { listRooms, createRoom, listStories }
    });
    await manager.mount();
    const button = root.querySelector<HTMLButtonElement>(
      '[data-role="create-button"]'
    );
    button?.click();
    await flush();

    const offenders: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('[class]')) {
      for (const cls of el.classList) {
        if (!inVocab(cls)) offenders.push(cls);
      }
    }
    expect(offenders).toEqual([]);
  });
});
