// @vitest-environment happy-dom
/**
 * @module tests/web/chat-manager.test
 * @purpose Behavior tests for `ChatManager`. Asserts:
 *   - DOM contract: `.sharpee-chat-history` + `.sharpee-chat-input`
 *     mounted; one `.sharpee-chat-message` row per inbound frame
 *   - `--self` applied only when packet.fromId === selfIdentityId
 *   - `send(text)` emits a `chat:send` frame via the WS, clears input
 *   - send() is a no-op on empty / whitespace-only input
 *   - scroll-pin: at-bottom auto-scrolls on new message; scrolled-up
 *     leaves scrollTop alone
 *   - unmount detaches WS handler + removes DOM
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ChatManager } from '../../web/src/managers/chat-manager';
import type { ChatMessageFrame, OutboundFrame, WsClient } from '../../web/src/ws-client';

interface FakeWs {
  sent: OutboundFrame[];
  on: ReturnType<typeof vi.fn>;
  send: ReturnType<typeof vi.fn>;
  fire(frame: ChatMessageFrame): void;
}

function makeFakeWs(): FakeWs {
  const sent: OutboundFrame[] = [];
  const handlers = new Map<string, Array<(frame: unknown) => void>>();
  return {
    sent,
    send: vi.fn((frame: OutboundFrame) => {
      sent.push(frame);
    }),
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
  manager: ChatManager;
}

function makeHarness(selfId = 'self-id'): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const ws = makeFakeWs();
  const manager = new ChatManager({
    root,
    roomId: 'r-1',
    ws: ws as unknown as WsClient,
    selfIdentityId: selfId
  });
  return { root, ws, manager };
}

function messageFrame(
  fromId: string,
  fromHandle: string,
  text: string,
  id = 'm-' + text
): ChatMessageFrame {
  return {
    type: 'chat:message',
    id,
    roomId: 'r-1',
    fromId,
    fromHandle,
    text,
    ts: 0
  };
}

describe('ChatManager.mount', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('mounts .sharpee-chat-history and .sharpee-chat-input', () => {
    const h = makeHarness();
    h.manager.mount();
    expect(h.root.querySelector('ol.sharpee-chat-history')).not.toBeNull();
    expect(h.root.querySelector('input.sharpee-chat-input')).not.toBeNull();
  });

  it('subscribes to chat:message on the WS', () => {
    const h = makeHarness();
    h.manager.mount();
    expect(h.ws.on).toHaveBeenCalledWith('chat:message', expect.any(Function));
  });

  it('mount is idempotent', () => {
    const h = makeHarness();
    h.manager.mount();
    h.manager.mount();
    expect(h.root.querySelectorAll('ol.sharpee-chat-history')).toHaveLength(1);
  });
});

describe('ChatManager — receive', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness('self-id');
    h.manager.mount();
  });

  it('renders an incoming message as a .sharpee-chat-message row with author + text slots', () => {
    h.ws.fire(messageFrame('b', 'bob', 'hello'));
    const item = h.root.querySelector('.sharpee-chat-message') as HTMLElement;
    expect(item).not.toBeNull();
    expect(item.querySelector('.sharpee-chat-message-author')?.textContent).toBe('bob');
    expect(item.querySelector('.sharpee-chat-message-text')?.textContent).toBe('hello');
  });

  it('applies --self only when fromId matches selfIdentityId', () => {
    h.ws.fire(messageFrame('self-id', 'me', 'hi'));
    h.ws.fire(messageFrame('b', 'bob', 'hi'));
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-chat-message')
    );
    expect(items[0].classList.contains('sharpee-chat-message--self')).toBe(true);
    expect(items[1].classList.contains('sharpee-chat-message--self')).toBe(false);
  });

  it('appends in arrival order', () => {
    h.ws.fire(messageFrame('a', 'alice', 'first'));
    h.ws.fire(messageFrame('a', 'alice', 'second'));
    const items = Array.from(
      h.root.querySelectorAll<HTMLElement>('.sharpee-chat-message-text')
    );
    expect(items.map((el) => el.textContent)).toEqual(['first', 'second']);
  });
});

describe('ChatManager.send', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('emits a chat:send frame with trimmed text and clears the input', () => {
    const field = h.root.querySelector(
      'input.sharpee-chat-input'
    ) as HTMLInputElement;
    field.value = '  hey  ';
    h.manager.send(field.value);
    expect(h.ws.send).toHaveBeenCalledWith({
      type: 'chat:send',
      roomId: 'r-1',
      text: 'hey'
    });
    expect(field.value).toBe('');
  });

  it('does NOT locally render the sent message (server echo is canonical)', () => {
    h.manager.send('hello');
    // Confirm send() actually engaged (the WS frame fired) so the
    // assertion below isn't vacuously true on a guarded no-op path.
    expect(h.ws.send).toHaveBeenCalledWith({
      type: 'chat:send',
      roomId: 'r-1',
      text: 'hello'
    });
    expect(h.root.querySelectorAll('.sharpee-chat-message')).toHaveLength(0);
  });

  it('is a no-op on empty input', () => {
    h.manager.send('');
    h.manager.send('   ');
    expect(h.ws.send).not.toHaveBeenCalled();
  });

  it('submits via form Enter (preventDefault honored)', () => {
    const form = h.root.querySelector('form') as HTMLFormElement;
    const field = h.root.querySelector(
      'input.sharpee-chat-input'
    ) as HTMLInputElement;
    field.value = 'enter test';
    form.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
    expect(h.ws.send).toHaveBeenCalledWith({
      type: 'chat:send',
      roomId: 'r-1',
      text: 'enter test'
    });
  });
});

describe('ChatManager — scroll pin', () => {
  let h: Harness;
  let history: HTMLOListElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
    history = h.root.querySelector('ol.sharpee-chat-history') as HTMLOListElement;
    // happy-dom doesn't model scrolling; stub the geometry. Treat any
    // scrollHeight > clientHeight as overflowing, and let the manager
    // compare scrollTop against scrollHeight-clientHeight.
    Object.defineProperty(history, 'scrollHeight', {
      configurable: true,
      get: () => 1000
    });
    Object.defineProperty(history, 'clientHeight', {
      configurable: true,
      get: () => 200
    });
    // scrollTop is mutable by default.
  });

  it('auto-scrolls to bottom when pinned (scrollTop at max)', () => {
    history.scrollTop = 800; // scrollHeight - clientHeight = 800
    h.ws.fire(messageFrame('a', 'alice', 'pin-1'));
    expect(history.scrollTop).toBe(1000);
  });

  it('leaves scrollTop alone when user has scrolled up', () => {
    history.scrollTop = 100; // far above pinned-bottom
    h.ws.fire(messageFrame('a', 'alice', 'no-pin'));
    expect(history.scrollTop).toBe(100);
  });

  it('treats within-slack range as pinned', () => {
    history.scrollTop = 798; // 2px from max — within 4px slack
    h.ws.fire(messageFrame('a', 'alice', 'edge-pin'));
    expect(history.scrollTop).toBe(1000);
  });
});

describe('ChatManager.unmount', () => {
  it('removes history + form and detaches WS handler', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    h.ws.fire(messageFrame('a', 'alice', 'pre'));
    h.manager.unmount();
    expect(h.root.querySelector('.sharpee-chat-history')).toBeNull();
    expect(h.root.querySelector('.sharpee-chat-input')).toBeNull();
    // After unmount further frames must not cause a DOM mutation.
    h.ws.fire(messageFrame('b', 'bob', 'post'));
    expect(h.root.querySelector('.sharpee-chat-message')).toBeNull();
  });
});
