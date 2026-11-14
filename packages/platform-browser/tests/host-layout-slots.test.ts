/**
 * host-layout-slots.test.ts — where `BrowserClient` puts the sidebar and
 * media slots on a page that has none, and which element it takes as the
 * layout root (GH #718).
 *
 * A custom `browser/index.html` may omit both slots. The client then makes
 * them, hidden, as siblings of the prose pane — media before it, sidebar
 * after — so a renderer that reveals one shows it outside the scrolling
 * prose. The default page wraps the pane and the sidebar in a row; the
 * root must still be the window shell, because layout, transition and
 * clear signals are written on the root.
 *
 * Drives a real `BrowserClient` and its real renderers; the engine is the
 * packet source only, as in shadow-renderer.test.ts.
 *
 * Owner context: platform-browser test suite.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import type { CmgtPacket } from '@sharpee/if-domain';
import { BrowserClient } from '../src/BrowserClient';

type Handler = (...args: never[]) => void;

/** An engine that only carries packets to whoever subscribed. */
function makePacketSource() {
  const handlers = new Map<string, Set<Handler>>();
  return {
    on(event: string, handler: Handler): void {
      if (!handlers.has(event)) handlers.set(event, new Set());
      handlers.get(event)!.add(handler);
    },
    emit(event: string, ...args: object[]): void {
      handlers.get(event)?.forEach((handler) => (handler as (...a: object[]) => void)(...args));
    },
    async executeTurn(): Promise<void> {},
    async start(): Promise<void> {},
    installStory(): void {},
  };
}

/** The world queries the client makes on connect; none matter here. */
function makeWorld() {
  return {
    getCapability: () => undefined,
    findByTrait: () => [],
    findByType: () => [],
    getEntity: () => undefined,
    hasPlayerCharacter: false,
    getContainingRoom: () => undefined,
    getLocation: () => undefined,
    getEnding: () => undefined,
  };
}

/** Build the host elements with the prose pane inside `paneParent`. */
function mountHost(paneParent: HTMLElement) {
  const make = <T extends HTMLElement>(tag: string): T => {
    const el = document.createElement(tag) as T;
    document.body.appendChild(el);
    return el;
  };
  const mainWindow = document.createElement('div');
  mainWindow.id = 'main-window';
  const textContent = document.createElement('div');
  textContent.id = 'text-content';
  mainWindow.appendChild(textContent);
  paneParent.appendChild(mainWindow);
  return {
    modalOverlay: make<HTMLElement>('div'),
    saveDialog: make<HTMLElement>('div'),
    restoreDialog: make<HTMLElement>('div'),
    startupDialog: make<HTMLElement>('div'),
    saveNameInput: make<HTMLInputElement>('input'),
    saveSlotsListEl: make<HTMLElement>('ul'),
    restoreSlotsListEl: make<HTMLElement>('ul'),
    noSavesMessage: make<HTMLElement>('div'),
    startupSaveInfo: make<HTMLElement>('div'),
    textContent,
    mainWindow,
    commandInput: make<HTMLInputElement>('input'),
    statusLocation: make<HTMLElement>('span'),
    statusScore: make<HTMLElement>('span'),
    menuBar: make<HTMLElement>('div'),
  };
}

const MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'image:main', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'clock', contentType: 'json', mode: 'replace', emit: 'sparse' },
    { id: 'layout', contentType: 'json', mode: 'replace', emit: 'sparse' },
  ],
};

/** Connect a client to the page and return the packet source. */
function connect(elements: ReturnType<typeof mountHost>) {
  const source = makePacketSource();
  const client = new BrowserClient({
    storagePrefix: 'test-',
    defaultTheme: 'classic-light',
    themes: [{ id: 'classic-light', name: 'Classic Light' }],
    storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
    autoSave: false,
  });
  client.initialize(elements);
  client.connectEngine(source as never, makeWorld() as never);
  source.emit('channel:manifest', MANIFEST);
  return source;
}

const sendTurn = (source: ReturnType<typeof makePacketSource>, payload: Record<string, object | string | null>): void =>
  source.emit('channel:packet', { kind: 'turn', turn_id: 'turn-1', payload }, new Number(1));

function shell(className: string, parent: HTMLElement = document.body): HTMLElement {
  const el = document.createElement('div');
  el.className = className;
  parent.appendChild(el);
  return el;
}

beforeEach(() => {
  document.body.innerHTML = '';
});

describe('a page with no sidebar or media slot', () => {
  it('gets both as hidden siblings of the prose pane: media before it, sidebar after', () => {
    const elements = mountHost(shell('sharpee-window'));
    connect(elements);

    const media = document.getElementById('sharpee-media')!;
    const sidebar = document.getElementById('sharpee-sidebar')!;
    expect(elements.mainWindow.previousElementSibling).toBe(media);
    expect(elements.mainWindow.nextElementSibling).toBe(sidebar);
    expect(sidebar.tagName).toBe('ASIDE');
    expect(media.hidden).toBe(true);
    expect(sidebar.hidden).toBe(true);
    expect(elements.mainWindow.contains(media)).toBe(false);
    expect(elements.mainWindow.contains(sidebar)).toBe(false);
  });

  it('a shown image reveals the media slot the client made', () => {
    const elements = mountHost(shell('sharpee-window'));
    const source = connect(elements);
    sendTurn(source, { 'image:main': { src: 'img/chart.png' } });

    const media = document.getElementById('sharpee-media')!;
    expect(media.hidden).toBe(false);
    expect(media.querySelector('#img-layer-main img')!.getAttribute('src')).toBe('img/chart.png');
  });

  it('a channel value reveals the sidebar the client made', () => {
    const elements = mountHost(shell('sharpee-window'));
    const source = connect(elements);
    sendTurn(source, { clock: { hour: 'evening' } });

    const sidebar = document.getElementById('sharpee-sidebar')!;
    expect(sidebar.hidden).toBe(false);
    expect(sidebar.querySelector('#channel-panel-clock')).not.toBeNull();
  });

  it('keeps slots the page already has, where the page put them', () => {
    const window = shell('sharpee-window');
    const ownMedia = document.createElement('div');
    ownMedia.id = 'sharpee-media';
    const footer = shell('page-footer');
    footer.appendChild(ownMedia);
    const elements = mountHost(window);
    connect(elements);

    expect(document.querySelectorAll('#sharpee-media')).toHaveLength(1);
    expect(ownMedia.parentElement).toBe(footer);
    expect(ownMedia.hidden).toBe(false);
  });
});

describe('the layout root', () => {
  it('is the window shell when the prose pane sits in a row inside it', () => {
    const window = shell('sharpee-window');
    const body = shell('sharpee-body', window);
    const source = connect(mountHost(body));
    sendTurn(source, { layout: { mode: 'split' } });

    expect(window.getAttribute('data-layout')).toBe(JSON.stringify({ mode: 'split' }));
    expect(body.hasAttribute('data-layout')).toBe(false);
  });

  it('is the prose pane parent on a page with no window shell', () => {
    const wrapper = shell('custom-wrapper');
    const source = connect(mountHost(wrapper));
    sendTurn(source, { layout: { mode: 'split' } });

    expect(wrapper.getAttribute('data-layout')).toBe(JSON.stringify({ mode: 'split' }));
  });
});
