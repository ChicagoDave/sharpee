// @vitest-environment happy-dom
/**
 * @module tests/web/room-manager.test
 * @purpose Behavior tests for `RoomManager`. Stubs the channel-service
 *   `Renderer` and the `WsClient` so the orchestration logic can be
 *   verified without the full DOM/channel-renderer chain. Asserts:
 *   - enter() fetches GET /rooms/:id/state via the injected api
 *   - on 2xx: applyCmgt called with the manifest; applyTurnPacket
 *     called once per transcript entry with a channelPacket
 *   - mounts a .sharpee-input-bar inside the room view's input row
 *   - opens the WsClient and subscribes turn:broadcast handler
 *   - on incoming turn:broadcast: applyTurnPacket called with frame's
 *     channelPacket
 *   - non-2xx state response → onError called; nothing rendered below
 *   - unmount() tears down view + ws + input + renderer in order
 * @owner Zifmia web client tests.
 */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomManager } from '../../web/src/managers/room-manager';
import type {
  ApiResult,
  ChannelCmgtPacket,
  ChannelTurnPacket,
  RoomStateBody
} from '../../web/src/api/types';
import type { TurnBroadcastFrame } from '../../web/src/ws-client';
import { Renderer } from '@sharpee/channel-service';

interface FakeRenderer {
  applyCmgt: ReturnType<typeof vi.fn>;
  applyTurnPacket: ReturnType<typeof vi.fn>;
  registerRenderer: ReturnType<typeof vi.fn>;
  registerSlot: ReturnType<typeof vi.fn>;
  onCommand: ReturnType<typeof vi.fn>;
  emitCommand: ReturnType<typeof vi.fn>;
  getSlot: ReturnType<typeof vi.fn>;
  getStateSnapshot: ReturnType<typeof vi.fn>;
}

function makeFakeRenderer(): FakeRenderer {
  return {
    applyCmgt: vi.fn(),
    applyTurnPacket: vi.fn(),
    registerRenderer: vi.fn(),
    registerSlot: vi.fn(),
    onCommand: vi.fn(),
    emitCommand: vi.fn(),
    getSlot: vi.fn(() => null),
    getStateSnapshot: vi.fn(() => ({}))
  };
}

interface FakeWs {
  open: ReturnType<typeof vi.fn>;
  close: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  on: ReturnType<typeof vi.fn>;
  fire(frame: TurnBroadcastFrame): void;
  handlers: Map<string, Array<(frame: unknown) => void>>;
}

function makeFakeWs(): FakeWs {
  const handlers = new Map<string, Array<(frame: unknown) => void>>();
  return {
    handlers,
    open: vi.fn(),
    close: vi.fn(),
    send: vi.fn(),
    on: vi.fn((kind: string, handler: (frame: unknown) => void) => {
      const list = handlers.get(kind) ?? [];
      list.push(handler);
      handlers.set(kind, list);
      return () => {
        const i = list.indexOf(handler);
        if (i >= 0) list.splice(i, 1);
      };
    }),
    fire(frame: TurnBroadcastFrame): void {
      for (const h of handlers.get(frame.type) ?? []) h(frame);
    }
  };
}

function makeCmgt(): ChannelCmgtPacket {
  return {
    kind: 'cmgt',
    protocol_version: 1,
    channels: []
  } as ChannelCmgtPacket;
}

function makeChannelPacket(turn: number): ChannelTurnPacket {
  return {
    kind: 'turn',
    turn_id: String(turn),
    payload: {}
  } as ChannelTurnPacket;
}

function okState(state: RoomStateBody): ApiResult<RoomStateBody> {
  return { ok: true, value: state };
}

function errState(status: number, error: string): ApiResult<RoomStateBody> {
  return { ok: false, status, error };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

interface Harness {
  root: HTMLElement;
  renderer: FakeRenderer;
  ws: FakeWs;
  getRoomState: ReturnType<typeof vi.fn>;
  onError: ReturnType<typeof vi.fn>;
  manager: RoomManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const renderer = makeFakeRenderer();
  const ws = makeFakeWs();
  const getRoomState = vi.fn();
  const onError = vi.fn();
  const manager = new RoomManager({
    root,
    roomId: 'r-1',
    selfIdentityId: 'self-id',
    sessionToken: 't',
    onError,
    deps: {
      getRoomState,
      rendererFactory: () => renderer as unknown as Renderer,
      wsClientFactory: () => ws as unknown as ReturnType<typeof makeFakeWs>['close'] extends never ? never : import('../../web/src/ws-client').WsClient
    }
  });
  return { root, renderer, ws, getRoomState, onError, manager };
}

describe('RoomManager.enter', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  afterEach(() => {
    h.manager.unmount();
  });

  it('fetches GET /rooms/:id/state and mounts the RoomView', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    expect(h.getRoomState).toHaveBeenCalledWith('r-1', expect.objectContaining({
      sessionToken: 't'
    }));
    expect(h.root.querySelector('.sharpee-prose-pane')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-presence-panel')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-chat-panel')).not.toBeNull();
  });

  it('applies CMGT then replays each transcript entry with channelPacket', async () => {
    const cmgt = makeCmgt();
    h.getRoomState.mockResolvedValue(
      okState({
        cmgt,
        transcript: [
          {
            turn: 1,
            command: 'look',
            submitter: { identityId: 'a', handle: 'alice' },
            blocks: [],
            events: [],
            channelPacket: makeChannelPacket(1)
          },
          {
            turn: 2,
            command: 'inv',
            submitter: { identityId: 'a', handle: 'alice' },
            blocks: [],
            events: [],
            channelPacket: makeChannelPacket(2)
          }
        ],
        currentValues: {}
      })
    );
    await h.manager.enter();
    expect(h.renderer.applyCmgt).toHaveBeenCalledWith(cmgt);
    expect(h.renderer.applyTurnPacket).toHaveBeenCalledTimes(2);
    expect(h.renderer.applyTurnPacket).toHaveBeenNthCalledWith(1, makeChannelPacket(1));
    expect(h.renderer.applyTurnPacket).toHaveBeenNthCalledWith(2, makeChannelPacket(2));
  });

  it('skips transcript entries that have no channelPacket (legacy v1)', async () => {
    h.getRoomState.mockResolvedValue(
      okState({
        cmgt: makeCmgt(),
        transcript: [
          {
            turn: 1,
            command: 'look',
            submitter: { identityId: 'a', handle: 'alice' },
            blocks: [],
            events: []
            // no channelPacket
          }
        ],
        currentValues: {}
      })
    );
    await h.manager.enter();
    expect(h.renderer.applyTurnPacket).not.toHaveBeenCalled();
  });

  it('mounts a .sharpee-input-bar inside the room view input row', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    expect(h.root.querySelector('.sharpee-input-bar')).not.toBeNull();
  });

  it('mounts presence + chat + saves managers inside their panels', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    // PresenceManager appends `.sharpee-presence-list` to the panel.
    expect(h.root.querySelector('.sharpee-presence-panel .sharpee-presence-list')).not.toBeNull();
    // ChatManager appends `.sharpee-chat-history` to the panel.
    expect(h.root.querySelector('.sharpee-chat-panel .sharpee-chat-history')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-chat-panel .sharpee-chat-input')).not.toBeNull();
    // SavesManager appends `.sharpee-saves-list` to the panel.
    expect(h.root.querySelector('.sharpee-saves-panel .sharpee-saves-list')).not.toBeNull();
  });

  it('opens the WsClient and registers a turn:broadcast handler', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    expect(h.ws.open).toHaveBeenCalledTimes(1);
    expect(h.ws.on).toHaveBeenCalledWith('turn:broadcast', expect.any(Function));
  });

  it('dispatches incoming turn:broadcast channelPacket through the renderer', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    const pkt = makeChannelPacket(7);
    h.ws.fire({
      type: 'turn:broadcast',
      roomId: 'r-1',
      turn: 7,
      blocks: [],
      events: [],
      channelPacket: pkt,
      submitter: { identityId: 'b', handle: 'bob' }
    });
    expect(h.renderer.applyTurnPacket).toHaveBeenLastCalledWith(pkt);
  });

  it('calls onError on non-2xx state response; does not apply CMGT', async () => {
    h.getRoomState.mockResolvedValue(errState(404, 'room_not_found'));
    await h.manager.enter();
    expect(h.onError).toHaveBeenCalledWith('room_not_found');
    expect(h.renderer.applyCmgt).not.toHaveBeenCalled();
    expect(h.renderer.applyTurnPacket).not.toHaveBeenCalled();
  });

  it('enter() is idempotent', async () => {
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    await h.manager.enter();
    expect(h.getRoomState).toHaveBeenCalledTimes(1);
  });
});

describe('RoomManager.refresh (Phase 6e — reconnect)', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  afterEach(() => {
    h.manager.unmount();
  });

  it('re-fetches state and replays transcript through the renderer', async () => {
    h.getRoomState.mockResolvedValueOnce(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    expect(h.getRoomState).toHaveBeenCalledTimes(1);

    // Seed the prose pane with a stale-looking row so the clear-before-
    // replay invariant has an observable state change to verify, not
    // just mock counts.
    const prose = h.root.querySelector('.sharpee-prose-pane') as HTMLElement;
    const stale = document.createElement('p');
    stale.textContent = 'stale';
    prose.appendChild(stale);
    expect(prose.children).toHaveLength(1);

    const cmgt2 = makeCmgt();
    h.getRoomState.mockResolvedValueOnce(
      okState({
        cmgt: cmgt2,
        transcript: [
          {
            turn: 1,
            command: 'look',
            submitter: { identityId: 'a', handle: 'alice' },
            blocks: [],
            events: [],
            channelPacket: makeChannelPacket(1)
          }
        ],
        currentValues: {}
      })
    );
    await h.manager.refresh();
    expect(h.getRoomState).toHaveBeenCalledTimes(2);
    expect(h.renderer.applyCmgt).toHaveBeenLastCalledWith(cmgt2);
    expect(h.renderer.applyTurnPacket).toHaveBeenCalledWith(makeChannelPacket(1));
    // DOM-state assertion: the stale row is gone (refresh cleared the
    // prose pane). The stub renderer doesn't re-render rows itself, so
    // the post-refresh DOM should be empty — proving the clear step
    // actually mutated the DOM rather than only mock methods firing.
    expect(prose.contains(stale)).toBe(false);
    expect(prose.children).toHaveLength(0);
  });

  it('clears the .sharpee-prose-pane before re-replaying transcript', async () => {
    h.getRoomState.mockResolvedValueOnce(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    const prose = h.root.querySelector('.sharpee-prose-pane') as HTMLElement;
    // Simulate a previously-rendered transcript row sitting in the DOM.
    prose.appendChild(document.createElement('p'));
    expect(prose.children).toHaveLength(1);

    h.getRoomState.mockResolvedValueOnce(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.refresh();
    expect(prose.children).toHaveLength(0);
  });

  it('refresh on non-2xx surfaces onError without throwing', async () => {
    h.getRoomState.mockResolvedValueOnce(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    h.onError.mockClear();
    h.getRoomState.mockResolvedValueOnce(errState(500, 'internal_error'));
    await expect(h.manager.refresh()).resolves.not.toThrow();
    expect(h.onError).toHaveBeenCalledWith('internal_error');
  });
});

describe('RoomManager.unmount', () => {
  it('closes the ws + unmounts the view + removes the input bar', async () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.getRoomState.mockResolvedValue(
      okState({ cmgt: makeCmgt(), transcript: [], currentValues: {} })
    );
    await h.manager.enter();
    expect(h.root.querySelector('section.sharpee-window')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-input-bar')).not.toBeNull();
    h.manager.unmount();
    expect(h.ws.close).toHaveBeenCalled();
    expect(h.root.querySelector('section.sharpee-window')).toBeNull();
    // Input bar is owned by CommandInputManager; unmount must tear it
    // down so a subsequent room entry does not leak duplicate inputs.
    expect(h.root.querySelector('.sharpee-input-bar')).toBeNull();
  });

  it('unmount before enter is a no-op', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    expect(() => h.manager.unmount()).not.toThrow();
  });
});
