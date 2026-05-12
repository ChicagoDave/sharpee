// @vitest-environment happy-dom
/**
 * @module tests/web/command-input-manager.test
 * @purpose Behavior tests for `CommandInputManager`. Asserts:
 *   - DOM contract: `.sharpee-input-bar` mounted with field + prompt
 *   - submit POSTs the trimmed command + fires onTurn on 200
 *   - submit clears the field on success
 *   - non-2xx surfaces inline error; does NOT fire onTurn
 *   - empty submit is a no-op (no network)
 *   - focus/blur hooks fire (Phase 6e seam)
 *   - first keystroke fires onFirstKey once per focus
 *   - setDisabled toggles input readonly + disabled
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { CommandInputManager } from '../../web/src/managers/command-input-manager';
import type { ApiResult, TurnPacketResponse } from '../../web/src/api/types';

interface Harness {
  root: HTMLElement;
  postCommand: ReturnType<typeof vi.fn>;
  onTurn: ReturnType<typeof vi.fn>;
  onFirstKey: ReturnType<typeof vi.fn>;
  onBlur: ReturnType<typeof vi.fn>;
  manager: CommandInputManager;
}

function makeHarness(): Harness {
  const root = document.createElement('div');
  document.body.appendChild(root);
  const postCommand = vi.fn();
  const onTurn = vi.fn();
  const onFirstKey = vi.fn();
  const onBlur = vi.fn();
  const manager = new CommandInputManager({
    root,
    roomId: 'r-1',
    httpOptions: { sessionToken: 't' },
    onTurn,
    onFirstKey,
    onBlur,
    api: { postCommand }
  });
  return { root, postCommand, onTurn, onFirstKey, onBlur, manager };
}

function okPacket(): ApiResult<TurnPacketResponse> {
  return {
    ok: true,
    value: {
      turn: 1,
      blocks: [],
      events: [],
      channelPacket: { kind: 'turn', turn_id: '1', payload: {} }
    }
  };
}

function errResult(status: number, error: string): ApiResult<TurnPacketResponse> {
  return { ok: false, status, error };
}

async function flush(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
}

function submit(root: HTMLElement, text: string): void {
  const form = root.querySelector('form');
  const field = root.querySelector(
    'input.sharpee-input-field'
  ) as HTMLInputElement;
  field.value = text;
  form?.dispatchEvent(new Event('submit', { cancelable: true, bubbles: true }));
}

describe('CommandInputManager.mount', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
  });

  it('mounts a .sharpee-input-bar with field + prompt', () => {
    h.manager.mount();
    expect(h.root.querySelector('.sharpee-input-bar')).not.toBeNull();
    expect(h.root.querySelector('.sharpee-input-prompt')).not.toBeNull();
    expect(h.root.querySelector('input.sharpee-input-field')).not.toBeNull();
  });

  it('mount is idempotent', () => {
    h.manager.mount();
    h.manager.mount();
    expect(h.root.querySelectorAll('.sharpee-input-bar')).toHaveLength(1);
  });
});

describe('CommandInputManager.submit', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('POSTs the trimmed command and fires onTurn on 200 with the packet + command', async () => {
    const packet = okPacket();
    h.postCommand.mockResolvedValue(packet);
    submit(h.root, '  look  ');
    await flush();
    expect(h.postCommand).toHaveBeenCalledWith('r-1', 'look', { sessionToken: 't' });
    // Payload assertion — the packet body and the original command
    // (post-trim) must reach the upstream handler verbatim so the
    // RoomManager can dispatch the channelPacket through its renderer.
    expect(h.onTurn).toHaveBeenCalledWith(packet.value, 'look');
  });

  it('clears the input on success', async () => {
    h.postCommand.mockResolvedValue(okPacket());
    submit(h.root, 'look');
    await flush();
    const field = h.root.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement;
    expect(field.value).toBe('');
  });

  it('does not call postCommand on empty submit', async () => {
    submit(h.root, '   ');
    await flush();
    expect(h.postCommand).not.toHaveBeenCalled();
  });

  it('surfaces error inline; does not fire onTurn', async () => {
    h.postCommand.mockResolvedValue(errResult(410, 'room_closed'));
    submit(h.root, 'look');
    await flush();
    const error = h.root.querySelector('[data-role="input-error"]') as HTMLElement;
    expect(error.hidden).toBe(false);
    expect(error.textContent).toContain('closed');
    expect(h.onTurn).not.toHaveBeenCalled();
  });

  it('surfaces turn_failed with a friendly message', async () => {
    h.postCommand.mockResolvedValue(errResult(500, 'turn_failed'));
    submit(h.root, 'look');
    await flush();
    const error = h.root.querySelector('[data-role="input-error"]') as HTMLElement;
    expect(error.textContent).toContain('could not finish');
  });

  it('does not double-submit while a request is in flight', async () => {
    let resolveIt: (r: ApiResult<TurnPacketResponse>) => void;
    h.postCommand.mockImplementation(
      () => new Promise<ApiResult<TurnPacketResponse>>((res) => (resolveIt = res))
    );
    submit(h.root, 'look');
    submit(h.root, 'look');
    expect(h.postCommand).toHaveBeenCalledTimes(1);
    resolveIt!(okPacket());
    await flush();
  });
});

describe('CommandInputManager — focus / first-key / blur hooks', () => {
  let h: Harness;
  beforeEach(() => {
    document.body.innerHTML = '';
    h = makeHarness();
    h.manager.mount();
  });

  it('emits onFirstKey on the first keydown after focus', () => {
    const field = h.root.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement;
    field.dispatchEvent(new Event('focus'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    expect(h.onFirstKey).toHaveBeenCalledTimes(1);
  });

  it('re-arms onFirstKey after blur + refocus', () => {
    const field = h.root.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement;
    field.dispatchEvent(new Event('focus'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'a' }));
    field.dispatchEvent(new Event('blur'));
    field.dispatchEvent(new Event('focus'));
    field.dispatchEvent(new KeyboardEvent('keydown', { key: 'b' }));
    expect(h.onFirstKey).toHaveBeenCalledTimes(2);
  });

  it('emits onBlur on input blur', () => {
    const field = h.root.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement;
    field.dispatchEvent(new Event('blur'));
    expect(h.onBlur).toHaveBeenCalledTimes(1);
  });
});

describe('CommandInputManager.setDisabled', () => {
  it('toggles disabled + readonly on the input field', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    const field = h.root.querySelector(
      'input.sharpee-input-field'
    ) as HTMLInputElement;
    h.manager.setDisabled(true);
    expect(field.disabled).toBe(true);
    expect(field.readOnly).toBe(true);
    h.manager.setDisabled(false);
    expect(field.disabled).toBe(false);
    expect(field.readOnly).toBe(false);
  });
});

describe('CommandInputManager.unmount', () => {
  it('removes the input bar', () => {
    document.body.innerHTML = '';
    const h = makeHarness();
    h.manager.mount();
    expect(h.root.querySelector('.sharpee-input-bar')).not.toBeNull();
    h.manager.unmount();
    expect(h.root.querySelector('.sharpee-input-bar')).toBeNull();
  });
});
