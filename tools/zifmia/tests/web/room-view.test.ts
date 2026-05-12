// @vitest-environment happy-dom
/**
 * @module tests/web/room-view.test
 * @purpose Behavior tests for `RoomView`. Asserts the ADR-176 4-pane
 *   layout: `.sharpee-presence-panel`, `.sharpee-prose-pane`,
 *   `.sharpee-chat-panel`, plus `.sharpee-lock-banner--hidden`,
 *   `.sharpee-status-bar`. Vocabulary contract: every contract class
 *   rendered is in the 36-class ADR-170/176 set.
 * @owner Zifmia web client tests.
 */

import { beforeEach, describe, expect, it } from 'vitest';

import { RoomView } from '../../web/src/views/room';

describe('RoomView', () => {
  let root: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    root = document.createElement('div');
    document.body.appendChild(root);
  });

  it('mounts the full ADR-176 layout (presence/prose/chat/saves/status)', () => {
    const view = new RoomView({ root, roomId: 'r-1' });
    view.mount();
    expect(root.querySelector('section.sharpee-window')).not.toBeNull();
    expect(root.querySelector('.sharpee-presence-panel')).not.toBeNull();
    expect(root.querySelector('.sharpee-prose-pane')).not.toBeNull();
    expect(root.querySelector('.sharpee-chat-panel')).not.toBeNull();
    expect(root.querySelector('.sharpee-saves-panel')).not.toBeNull();
    expect(root.querySelector('.sharpee-status-bar')).not.toBeNull();
  });

  it('renders the lock banner with --hidden by default', () => {
    const view = new RoomView({ root, roomId: 'r-1' });
    view.mount();
    const banner = root.querySelector(
      '.sharpee-lock-banner'
    ) as HTMLElement | null;
    expect(banner).not.toBeNull();
    expect(banner!.classList.contains('sharpee-lock-banner--hidden')).toBe(true);
  });

  it('returns slot handles after mount', () => {
    const view = new RoomView({ root, roomId: 'r-7' });
    const slots = view.mount();
    expect(slots.main.classList.contains('sharpee-prose-pane')).toBe(true);
    expect(slots.presencePanel.classList.contains('sharpee-presence-panel')).toBe(
      true
    );
    expect(slots.chatPanel.classList.contains('sharpee-chat-panel')).toBe(true);
    expect(slots.root.getAttribute('data-room-id')).toBe('r-7');
  });

  it('mount is idempotent', () => {
    const view = new RoomView({ root, roomId: 'r-1' });
    view.mount();
    view.mount();
    expect(root.querySelectorAll('section.sharpee-window')).toHaveLength(1);
  });

  it('unmount removes the frame', () => {
    const view = new RoomView({ root, roomId: 'r-1' });
    view.mount();
    view.unmount();
    expect(root.querySelector('section.sharpee-window')).toBeNull();
  });

  it('renders title with custom value when supplied', () => {
    const view = new RoomView({ root, roomId: 'r-1', title: 'Adventure HQ' });
    view.mount();
    expect(root.textContent).toContain('Adventure HQ');
  });
});

describe('RoomView — ADR-176 vocabulary contract', () => {
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

  // RoomView's owned decoration namespace. Themes target the contract
  // classes, not these.
  const INTERNAL_PREFIXES = [
    'sharpee-status-bar-',
    'sharpee-room-frame',
    'sharpee-room-hidden-sidebar',
    'sharpee-room-input',
    'sharpee-room-media',
    'sharpee-room-notify',
    'sharpee-room-meta'
  ];

  function inVocab(cls: string): boolean {
    if (!cls.startsWith('sharpee-')) return true;
    if (cls.endsWith('--hidden') || cls.endsWith('--locked')) return true;
    if (INTERNAL_PREFIXES.some((p) => cls.startsWith(p) || cls === p.replace(/-$/, ''))) {
      return true;
    }
    return VOCAB.has(cls);
  }

  it('every rendered class is in the contract vocabulary', () => {
    const root = document.createElement('div');
    document.body.appendChild(root);
    const view = new RoomView({ root, roomId: 'r-1' });
    view.mount();
    const offenders: string[] = [];
    for (const el of root.querySelectorAll<HTMLElement>('[class]')) {
      for (const cls of el.classList) {
        if (!inVocab(cls)) offenders.push(cls);
      }
    }
    expect(offenders).toEqual([]);
  });
});
