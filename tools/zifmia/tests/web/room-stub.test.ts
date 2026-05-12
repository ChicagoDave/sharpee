// @vitest-environment happy-dom
/**
 * @module tests/web/room-stub.test
 * @purpose Behavior tests for `RoomStub` — the Phase 6b placeholder
 *   view rendered for `#room/:id` hashes. Phase 6c replaces this
 *   with the full RoomManager; until then the stub owns:
 *     - DOM contract: section.sharpee-window[data-room-id]
 *     - leave-button click → onLeave callback (the only client-side
 *       navigation seam this view exposes)
 *     - unmount removes the section
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

import { RoomStub } from '../../web/src/views/room-stub';

describe('RoomStub', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('mounts a section.sharpee-window with the room id attribute', () => {
    const stub = new RoomStub({ root, roomId: 'r-42', onLeave: () => {} });
    stub.mount();
    const section = root.querySelector<HTMLElement>('section.sharpee-window');
    expect(section).not.toBeNull();
    expect(section?.getAttribute('data-room-id')).toBe('r-42');
    expect(section?.getAttribute('data-role')).toBe('room-stub');
  });

  it('renders the room id inside the title bar and prose pane', () => {
    const stub = new RoomStub({ root, roomId: 'room-xyz', onLeave: () => {} });
    stub.mount();
    expect(root.textContent).toContain('Room room-xyz');
    expect(root.querySelector('.sharpee-prose-pane')?.textContent).toContain(
      'room-xyz'
    );
  });

  it('escapes the room id when interpolated into the DOM', () => {
    const stub = new RoomStub({
      root,
      roomId: '<script>alert(1)</script>',
      onLeave: () => {}
    });
    stub.mount();
    // The literal angle brackets must not produce a real <script> element.
    expect(root.querySelector('script')).toBeNull();
    // Title still includes the (escaped) raw text.
    expect(root.textContent).toContain('<script>alert(1)</script>');
  });

  it('fires onLeave when the leave button is clicked', () => {
    const onLeave = vi.fn();
    const stub = new RoomStub({ root, roomId: 'r-1', onLeave });
    stub.mount();
    const leave = root.querySelector<HTMLButtonElement>('[data-role="leave"]');
    leave?.click();
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it('mount is idempotent (a second mount does not duplicate the section)', () => {
    const stub = new RoomStub({ root, roomId: 'r-1', onLeave: () => {} });
    stub.mount();
    stub.mount();
    expect(root.querySelectorAll('section.sharpee-window')).toHaveLength(1);
  });

  it('unmount removes the section', () => {
    const stub = new RoomStub({ root, roomId: 'r-1', onLeave: () => {} });
    stub.mount();
    expect(root.querySelector('section.sharpee-window')).not.toBeNull();
    stub.unmount();
    expect(root.querySelector('section.sharpee-window')).toBeNull();
  });

  it('unmount before mount is a no-op', () => {
    const stub = new RoomStub({ root, roomId: 'r-1', onLeave: () => {} });
    expect(() => stub.unmount()).not.toThrow();
  });

  it('after unmount, leave-button click no longer fires onLeave', () => {
    const onLeave = vi.fn();
    const stub = new RoomStub({ root, roomId: 'r-1', onLeave });
    stub.mount();
    const leave = root.querySelector<HTMLButtonElement>('[data-role="leave"]');
    stub.unmount();
    // The button is detached from the document; clicking it (held by
    // reference) must not invoke the callback because the listener was
    // removed by unmount.
    leave?.click();
    expect(onLeave).not.toHaveBeenCalled();
  });
});
