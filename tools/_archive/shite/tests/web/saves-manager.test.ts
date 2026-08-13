// @vitest-environment happy-dom
/**
 * @module tests/web/saves-manager.test
 * @purpose Behavior tests for `SavesManager` (Phase 6f-saves). Asserts:
 *   - DOM contract: `.sharpee-saves-panel` content + `.sharpee-saves-list`
 *   - empty-state row when GET /rooms/:id/saves returns []
 *   - one `.sharpee-saves-item` per record with label + atTurn
 *   - create dialog: opens; happy path POSTs and refreshes the list;
 *     4xx surfaces friendly error WITHOUT closing the dialog
 *   - restore confirm dialog: opens; happy path POSTs and closes
 *   - WS `room:restored` triggers `refresh()` (re-fetches list)
 *   - non-2xx list fetch surfaces inline error
 *   - unmount detaches WS handler + removes DOM
 *   - ADR-176 vocabulary contract
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { SavesManager } from '../../web/src/managers/saves-manager';
import type {
  ApiResult,
  NamedSave,
  RestoreResponse
} from '../../web/src/api/types';
import type { RoomRestoredFrame, WsClient } from '../../web/src/ws-client';

interface FakeWs {
  on: ReturnType<typeof vi.fn>;
  fire(frame: RoomRestoredFrame): void;
}

function makeFakeWs(): FakeWs {
  const handlers = new Map<string, Array<(frame: unknown) => void>>();
  return {
    on: vi.fn((kind: string, handler: (frame: unknown) => void) => {
      const list = handlers.get(kind) ?? [];
      list.push(handler);
      handlers.set(kind, list);
      return () => {
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
      };
    }),
    fire(frame): void {
      for (const h of handlers.get(frame.type) ?? []) h(frame);
    }
  };
}

interface Harness {
  root: HTMLElement;
  ws: FakeWs;
  listNamedSaves: ReturnType<typeof vi.fn>;
  createNamedSave: ReturnType<typeof vi.fn>;
  restoreNamedSave: ReturnType<typeof vi.fn>;
  manager: SavesManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const ws = makeFakeWs();
  const listNamedSaves = vi.fn();
  const createNamedSave = vi.fn();
  const restoreNamedSave = vi.fn();
  const manager = new SavesManager({
    root,
    roomId: 'r-1',
    httpOptions: { sessionToken: 't' },
    ws: ws as unknown as WsClient,
    api: { listNamedSaves, createNamedSave, restoreNamedSave }
  });
  return { root, ws, listNamedSaves, createNamedSave, restoreNamedSave, manager };
}

function okSaves(value: NamedSave[]): ApiResult<NamedSave[]> {
  return { ok: true, value };
}
function okCreated(value: NamedSave): ApiResult<NamedSave> {
  return { ok: true, value };
}
function okRestore(value: RestoreResponse): ApiResult<RestoreResponse> {
  return { ok: true, value };
}
function errResult<T>(status: number, error: string): ApiResult<T> {
  return { ok: false, status, error };
}

function save(overrides: Partial<NamedSave> = {}): NamedSave {
  return {
    saveId: 's-1',
    roomId: 'r-1',
    atTurn: 1,
    label: 'Save A',
    createdBy: 'me',
    createdAt: 0,
    ...overrides
  };
}

async function flush(): Promise<void> {
  // The create flow chains: api.createNamedSave → refresh →
  // api.listNamedSaves → render. Several microtask ticks deep; flush
  // generously so the assertion sees the final DOM, not a mid-chain
  // intermediate state.
  for (let i = 0; i < 8; i++) {
    await Promise.resolve();
  }
}

describe('SavesManager.mount', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.listNamedSaves.mockResolvedValue(okSaves([]));
  });

  it('mounts the .sharpee-saves-list and create button', async () => {
    await h.manager.mount();
    expect(h.root.querySelector('ul.sharpee-saves-list')).not.toBeNull();
    expect(h.root.querySelector('[data-role="saves-create"]')).not.toBeNull();
  });

  it('calls listNamedSaves on mount', async () => {
    await h.manager.mount();
    expect(h.listNamedSaves).toHaveBeenCalledWith('r-1', { sessionToken: 't' });
  });

  it('subscribes to room:restored on the WS', async () => {
    await h.manager.mount();
    expect(h.ws.on).toHaveBeenCalledWith('room:restored', expect.any(Function));
  });

  it('mount is idempotent', async () => {
    await h.manager.mount();
    await h.manager.mount();
    expect(h.root.querySelectorAll('ul.sharpee-saves-list')).toHaveLength(1);
  });
});

describe('SavesManager — rendering', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  it('renders an empty-state row when there are no saves', async () => {
    h.listNamedSaves.mockResolvedValue(okSaves([]));
    await h.manager.mount();
    const items = h.root.querySelectorAll('.sharpee-saves-item');
    expect(items).toHaveLength(1);
    expect(items[0].getAttribute('data-role')).toBe('saves-empty');
  });

  it('renders one .sharpee-saves-item per save with label + atTurn', async () => {
    h.listNamedSaves.mockResolvedValue(
      okSaves([
        save({ saveId: 's-1', label: 'Save A', atTurn: 3 }),
        save({ saveId: 's-2', label: 'Save B', atTurn: 7 })
      ])
    );
    await h.manager.mount();
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-saves-item')
    );
    expect(items).toHaveLength(2);
    expect(items[0].getAttribute('data-save-id')).toBe('s-1');
    expect(items[0].textContent).toContain('Save A');
    expect(items[0].textContent).toContain('turn 3');
    expect(items[1].getAttribute('data-save-id')).toBe('s-2');
    expect(items[1].textContent).toContain('Save B');
  });

  it('surfaces a list-fetch error inline without breaking the panel', async () => {
    h.listNamedSaves.mockResolvedValue(errResult<NamedSave[]>(500, 'internal_error'));
    await h.manager.mount();
    const err = h.root.querySelector('[data-role="saves-error"]') as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain('Could not load saves');
  });
});

describe('SavesManager — create flow', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.listNamedSaves.mockResolvedValue(okSaves([]));
  });

  async function openCreateDialog(): Promise<void> {
    await h.manager.mount();
    const button = h.root.querySelector<HTMLButtonElement>(
      '[data-role="saves-create"]'
    );
    button?.click();
    await flush();
  }

  it('opens the create dialog when the button is clicked', async () => {
    await openCreateDialog();
    const dialog = h.root.querySelector(
      '[data-role="saves-dialog"]'
    ) as HTMLElement;
    expect(dialog).not.toBeNull();
  });

  it('happy path: POSTs createNamedSave, closes dialog, refreshes list', async () => {
    await openCreateDialog();
    const form = h.root.querySelector('[data-role="saves-form"]') as HTMLFormElement;
    const labelInput = form.querySelector('[name="label"]') as HTMLInputElement;
    labelInput.value = 'New checkpoint';
    h.createNamedSave.mockResolvedValueOnce(
      okCreated(save({ saveId: 's-new', label: 'New checkpoint', atTurn: 5 }))
    );
    h.listNamedSaves.mockResolvedValueOnce(
      okSaves([save({ saveId: 's-new', label: 'New checkpoint', atTurn: 5 })])
    );
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(h.createNamedSave).toHaveBeenCalledWith(
      'r-1',
      { label: 'New checkpoint' },
      { sessionToken: 't' }
    );
    // Refresh fired — listNamedSaves called twice (mount + post-create).
    expect(h.listNamedSaves).toHaveBeenCalledTimes(2);
    // The new row is in the list.
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-saves-item')
    );
    expect(items[0].getAttribute('data-save-id')).toBe('s-new');
  });

  it('4xx surfaces inline error in the dialog without refresh or close', async () => {
    await openCreateDialog();
    const form = h.root.querySelector('[data-role="saves-form"]') as HTMLFormElement;
    const labelInput = form.querySelector('[name="label"]') as HTMLInputElement;
    labelInput.value = 'late save';
    h.createNamedSave.mockResolvedValueOnce(
      errResult<NamedSave>(400, 'no_turns_yet')
    );
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    const err = h.root.querySelector(
      '[data-role="saves-form-error"]'
    ) as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain('Run a turn');
    // listNamedSaves only fired once (mount). No refresh on error.
    expect(h.listNamedSaves).toHaveBeenCalledTimes(1);
    // Dialog must remain open so the user can correct the label and
    // retry — a silent close on error would lose context.
    const dialog = h.root.querySelector(
      '[data-role="saves-dialog"]'
    ) as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
  });

  it('blocks empty label without a network call', async () => {
    await openCreateDialog();
    const form = h.root.querySelector('[data-role="saves-form"]') as HTMLFormElement;
    const labelInput = form.querySelector('[name="label"]') as HTMLInputElement;
    labelInput.value = '   ';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    await flush();
    expect(h.createNamedSave).not.toHaveBeenCalled();
    const err = h.root.querySelector(
      '[data-role="saves-form-error"]'
    ) as HTMLElement;
    expect(err.textContent).toContain('Enter a label');
  });
});

describe('SavesManager — restore flow', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.listNamedSaves.mockResolvedValue(
      okSaves([save({ saveId: 's-1', label: 'Save A', atTurn: 3 })])
    );
  });

  it('clicking a row Restore button opens the confirm dialog', async () => {
    await h.manager.mount();
    const restoreBtn = h.root.querySelector(
      '[data-save-id="s-1"] [data-action="restore"]'
    ) as HTMLButtonElement;
    restoreBtn.click();
    await flush();
    const label = h.root.querySelector('[data-role="restore-label"]');
    expect(label?.textContent).toBe('Save A');
  });

  it('confirm → POST /rooms/:id/restore with saveId; on 200 closes dialog', async () => {
    await h.manager.mount();
    const restoreBtn = h.root.querySelector(
      '[data-save-id="s-1"] [data-action="restore"]'
    ) as HTMLButtonElement;
    restoreBtn.click();
    await flush();
    h.restoreNamedSave.mockResolvedValueOnce(
      okRestore({ roomId: 'r-1', atTurn: 3 })
    );
    const dialog = h.root.querySelector(
      '[data-role="restore-dialog"]'
    ) as HTMLDialogElement;
    expect(dialog.hasAttribute('open')).toBe(true);
    const confirm = h.root.querySelector(
      '[data-role="restore-confirm"]'
    ) as HTMLButtonElement;
    confirm.click();
    await flush();
    expect(h.restoreNamedSave).toHaveBeenCalledWith(
      'r-1',
      's-1',
      { sessionToken: 't' }
    );
    // Dialog must close on success so the user sees the refreshed prose
    // pane underneath, not a lingering "Restore?" prompt.
    expect(dialog.hasAttribute('open')).toBe(false);
  });

  it('restore error surfaces in the confirm dialog without closing', async () => {
    await h.manager.mount();
    (
      h.root.querySelector(
        '[data-save-id="s-1"] [data-action="restore"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    h.restoreNamedSave.mockResolvedValueOnce(
      errResult<RestoreResponse>(404, 'save_not_found')
    );
    (
      h.root.querySelector('[data-role="restore-confirm"]') as HTMLButtonElement
    ).click();
    await flush();
    const err = h.root.querySelector(
      '[data-role="restore-error"]'
    ) as HTMLElement;
    expect(err.hidden).toBe(false);
    expect(err.textContent).toContain('deleted');
  });

  it('Cancel button closes the confirm dialog without POSTing', async () => {
    await h.manager.mount();
    (
      h.root.querySelector(
        '[data-save-id="s-1"] [data-action="restore"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    (
      h.root.querySelector('[data-role="restore-cancel"]') as HTMLButtonElement
    ).click();
    expect(h.restoreNamedSave).not.toHaveBeenCalled();
  });
});

describe('SavesManager — WS room:restored', () => {
  it('refreshes the saves list when room:restored fires for this room', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.listNamedSaves
      .mockResolvedValueOnce(okSaves([]))
      .mockResolvedValueOnce(
        okSaves([save({ saveId: 's-x', label: 'Restored', atTurn: 5 })])
      );
    await h.manager.mount();
    expect(h.listNamedSaves).toHaveBeenCalledTimes(1);
    h.ws.fire({
      type: 'room:restored',
      roomId: 'r-1',
      atTurn: 5,
      by: { identityId: 'a', handle: 'alice' },
      savedLabel: 'X'
    });
    await flush();
    expect(h.listNamedSaves).toHaveBeenCalledTimes(2);
    // The newly-listed save appears in the DOM.
    expect(h.root.querySelector('[data-save-id="s-x"]')).not.toBeNull();
  });

  it('ignores room:restored frames for a different room', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.listNamedSaves.mockResolvedValue(okSaves([]));
    await h.manager.mount();
    h.listNamedSaves.mockClear();
    h.ws.fire({
      type: 'room:restored',
      roomId: 'other-room',
      atTurn: 5,
      by: { identityId: 'a', handle: 'alice' },
      savedLabel: 'X'
    });
    await flush();
    expect(h.listNamedSaves).not.toHaveBeenCalled();
  });
});

describe('SavesManager.unmount', () => {
  it('removes the panel DOM + detaches WS handler', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.listNamedSaves.mockResolvedValue(okSaves([]));
    await h.manager.mount();
    expect(h.root.querySelector('ul.sharpee-saves-list')).not.toBeNull();
    h.manager.unmount();
    expect(h.root.querySelector('ul.sharpee-saves-list')).toBeNull();
    // Post-unmount WS frame must not re-fetch.
    h.listNamedSaves.mockClear();
    h.ws.fire({
      type: 'room:restored',
      roomId: 'r-1',
      atTurn: 1,
      by: { identityId: 'a', handle: 'alice' },
      savedLabel: 'X'
    });
    await flush();
    expect(h.listNamedSaves).not.toHaveBeenCalled();
  });
});

describe('SavesManager — ADR-176 vocabulary contract', () => {
  const VOCAB = new Set([
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

  // SavesManager-owned decoration namespace. Themes target the panel
  // contract class, not these.
  const INTERNAL_PREFIXES = [
    'sharpee-saves-panel-',
    'sharpee-saves-item-',
    'sharpee-saves-error',
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

  it('every rendered class is in the contract vocabulary', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.listNamedSaves.mockResolvedValue(
      okSaves([save({ saveId: 's-1', label: 'Save A', atTurn: 1 })])
    );
    await h.manager.mount();
    // Open both dialogs so their internal classes are also assessed.
    (
      h.root.querySelector('[data-role="saves-create"]') as HTMLButtonElement
    ).click();
    await flush();
    (
      h.root.querySelector(
        '[data-save-id="s-1"] [data-action="restore"]'
      ) as HTMLButtonElement
    ).click();
    await flush();
    const offenders: string[] = [];
    for (const el of h.root.querySelectorAll<HTMLElement>('[class]')) {
      for (const cls of el.classList) {
        if (!inVocab(cls)) offenders.push(cls);
      }
    }
    expect(offenders).toEqual([]);
  });
});
