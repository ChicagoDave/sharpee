/**
 * R5-C integration test — `BrowserClient` channel renderer drives the
 * visible host DOM directly (no shadow root).
 *
 * Asserts that:
 *  1. The host's textContent slot receives channel-driven prose.
 *  2. The combined score+turn override writes "Score: X | Turns: Y".
 *  3. Hotspot clicks pump through engine.executeTurn.
 *  4. Auto-save fires on channel:packet (not on text:output).
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { BrowserClient, BROWSER_CAPABILITIES } from '../src/BrowserClient';

interface FakeEngine {
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  executeTurn(command: string): Promise<void>;
  start(options?: unknown): Promise<void>;
  setStory(story: unknown): void;
  createSaveData?(): unknown;
}

function makeFakeEngine(opts: { withSaveData?: boolean } = {}) {
  const handlers = new Map<string, Set<(...args: any[]) => void>>();
  const calls: { executeTurn: string[]; saveData: number } = {
    executeTurn: [],
    saveData: 0,
  };
  const engine: FakeEngine = {
    on(event, handler) {
      let s = handlers.get(event);
      if (!s) {
        s = new Set();
        handlers.set(event, s);
      }
      s.add(handler);
    },
    emit(event, ...args) {
      handlers.get(event)?.forEach((h) => h(...args));
    },
    async executeTurn(command) {
      calls.executeTurn.push(command);
    },
    async start() {
      /* no-op */
    },
    setStory() {
      /* no-op */
    },
  };
  if (opts.withSaveData) {
    engine.createSaveData = () => {
      calls.saveData += 1;
      return { snapshot: 'fake' };
    };
  }
  return { engine, calls };
}

function makeWorld() {
  return {
    getCapability: () => undefined,
    findByTrait: () => [],
    findByType: () => [],
    getEntity: () => undefined,
    getPlayer: () => undefined,
    getContainingRoom: () => undefined,
    getLocation: () => undefined,
  } as any;
}

function mountHostElements() {
  const make = <T extends HTMLElement>(tag: string): T => {
    const el = document.createElement(tag) as T;
    document.body.appendChild(el);
    return el;
  };
  const mainWindow = make<HTMLElement>('div');
  mainWindow.id = 'main-window';
  const textContent = document.createElement('div');
  textContent.id = 'text-content';
  mainWindow.appendChild(textContent);

  const els = {
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
  return els;
}

const STANDARD_MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'main', contentType: 'json', mode: 'append', emit: 'always' },
    { id: 'prompt', contentType: 'text', mode: 'replace', emit: 'always' },
    { id: 'location', contentType: 'text', mode: 'replace', emit: 'always' },
    { id: 'score', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'turn', contentType: 'number', mode: 'replace', emit: 'always' },
    { id: 'image:main', contentType: 'json', mode: 'replace', emit: 'always' },
  ],
};

describe('BrowserClient — channel renderer drives visible DOM (R5-C)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('main channel writes prose to the host textContent element', () => {
    const { engine } = makeFakeEngine();
    const elements = mountHostElements();
    const client = new BrowserClient({
      storagePrefix: 'test-',
      defaultTheme: 'classic-light',
      themes: [{ id: 'classic-light', name: 'Classic Light' }],
      storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
      autoSave: false,
    });
    client.initialize(elements);
    client.connectEngine(engine as never, makeWorld());

    engine.emit('channel:manifest', STANDARD_MANIFEST);
    engine.emit(
      'channel:packet',
      {
        kind: 'turn',
        turn_id: 'turn-1',
        payload: { main: [['You stand at the cave mouth.']] },
      },
      1,
    );
    expect(elements.textContent.querySelector('p')?.textContent).toBe(
      'You stand at the cave mouth.',
    );
  });

  it('combined score+turn override updates statusScore element', () => {
    const { engine } = makeFakeEngine();
    const elements = mountHostElements();
    const client = new BrowserClient({
      storagePrefix: 'test-',
      defaultTheme: 'classic-light',
      themes: [{ id: 'classic-light', name: 'Classic Light' }],
      storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
      autoSave: false,
    });
    client.initialize(elements);
    client.connectEngine(engine as never, makeWorld());

    engine.emit('channel:manifest', STANDARD_MANIFEST);
    engine.emit(
      'channel:packet',
      {
        kind: 'turn',
        turn_id: 'turn-1',
        payload: {
          score: { current: 5, max: 100 },
          turn: 7,
        },
      },
      7,
    );
    expect(elements.statusScore.textContent).toBe('Score: 5 | Turns: 7');
  });

  it('location channel writes to statusLocation element', () => {
    const { engine } = makeFakeEngine();
    const elements = mountHostElements();
    const client = new BrowserClient({
      storagePrefix: 'test-',
      defaultTheme: 'classic-light',
      themes: [{ id: 'classic-light', name: 'Classic Light' }],
      storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
      autoSave: false,
    });
    client.initialize(elements);
    client.connectEngine(engine as never, makeWorld());

    engine.emit('channel:manifest', STANDARD_MANIFEST);
    engine.emit(
      'channel:packet',
      {
        kind: 'turn',
        turn_id: 'turn-1',
        payload: { location: 'Cave Entrance' },
      },
      1,
    );
    expect(elements.statusLocation.textContent).toBe('Cave Entrance');
  });

  it('hotspot click pumps a command through engine.executeTurn', () => {
    const { engine, calls } = makeFakeEngine();
    const elements = mountHostElements();
    const client = new BrowserClient({
      storagePrefix: 'test-',
      defaultTheme: 'classic-light',
      themes: [{ id: 'classic-light', name: 'Classic Light' }],
      storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
      clientCapabilities: BROWSER_CAPABILITIES,
      autoSave: false,
    });
    client.initialize(elements);
    client.connectEngine(engine as never, makeWorld());

    engine.emit('channel:manifest', STANDARD_MANIFEST);
    engine.emit(
      'channel:packet',
      {
        kind: 'turn',
        turn_id: 'turn-1',
        payload: {
          'image:main': {
            src: 'p.png',
            hotspots: [{ x: 0, y: 0, width: 10, height: 10, command: 'press button' }],
          },
        },
      },
      1,
    );
    const btn = document.querySelector('.image-hotspot') as HTMLButtonElement;
    expect(btn).not.toBeNull();
    btn.click();
    expect(calls.executeTurn).toEqual(['press button']);
  });

  it('auto-save fires on channel:packet (not text:output)', () => {
    const { engine, calls } = makeFakeEngine({ withSaveData: true });
    const elements = mountHostElements();
    const client = new BrowserClient({
      storagePrefix: 'test-',
      defaultTheme: 'classic-light',
      themes: [{ id: 'classic-light', name: 'Classic Light' }],
      storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
      autoSave: true,
    });
    client.initialize(elements);
    client.connectEngine(engine as never, makeWorld());

    // text:output alone should NOT trigger auto-save anymore
    engine.emit('text:output', [{ key: 'action.result', content: ['hi'] }], 1);
    expect(calls.saveData).toBe(0);

    // channel:packet triggers auto-save when turn > 0
    engine.emit('channel:manifest', STANDARD_MANIFEST);
    engine.emit('channel:packet', { kind: 'turn', turn_id: 'turn-1', payload: {} }, 1);
    expect(calls.saveData).toBe(1);
  });
});
