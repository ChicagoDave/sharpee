/**
 * turn-events.test.ts — the IDE recording bridge (ADR-277 D5).
 *
 * Pins: emitTurnEvent posts `{command, response}` JSON to the WKWebView
 * `turnEvents` handler when present, is a true no-op without one (plain
 * browser play — same client bundle), and never throws even if the bridge
 * does. The BrowserClient path is real: executeCommand captures whatever the
 * turn rendered into the main text slot (channel prose AND system messages,
 * echo excluded) and emits it after the turn completes.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CmgtPacket } from '@sharpee/if-domain';
import { BrowserClient } from '../src/BrowserClient';
import { emitTurnEvent } from '../src/turn-events';

function installBridge(): string[] {
  const posted: string[] = [];
  (window as any).webkit = {
    messageHandlers: {
      turnEvents: { postMessage: (body: string) => posted.push(body) },
    },
  };
  return posted;
}

afterEach(() => {
  delete (window as any).webkit;
});

describe('emitTurnEvent', () => {
  it('posts the {command, response} payload when the bridge is present', () => {
    const posted = installBridge();
    emitTurnEvent('take lamp', 'Taken.');
    expect(posted).toHaveLength(1);
    expect(JSON.parse(posted[0])).toEqual({ command: 'take lamp', response: 'Taken.' });
  });

  it('is a no-op without window.webkit (plain browser play)', () => {
    expect(() => emitTurnEvent('look', 'A room.')).not.toThrow();
  });

  it('swallows a throwing bridge — play never breaks on observation', () => {
    (window as any).webkit = {
      messageHandlers: {
        turnEvents: { postMessage: () => { throw new Error('bridge gone'); } },
      },
    };
    expect(() => emitTurnEvent('look', 'A room.')).not.toThrow();
  });
});

// ── BrowserClient real-path: capture what the turn actually rendered ──

interface FakeEngine {
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  executeTurn(command: string): Promise<void>;
  start(options?: unknown): Promise<void>;
  setStory(story: unknown): void;
}

const MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'main', contentType: 'json', mode: 'append', emit: 'always' },
    { id: 'prompt', contentType: 'text', mode: 'replace', emit: 'always' },
  ],
};

function makeEngine(responseParagraphs: string[][]): FakeEngine {
  const handlers = new Map<string, Set<(...args: any[]) => void>>();
  const engine: FakeEngine = {
    on(event, handler) {
      let s = handlers.get(event);
      if (!s) { s = new Set(); handlers.set(event, s); }
      s.add(handler);
    },
    emit(event, ...args) {
      handlers.get(event)?.forEach((h) => h(...args));
    },
    async executeTurn() {
      engine.emit('channel:packet',
        { kind: 'turn', turn_id: 'turn-1', payload: { main: responseParagraphs } }, 1);
    },
    async start() { /* no-op */ },
    setStory() { /* no-op */ },
  };
  return engine;
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
  const textContent = document.createElement('div');
  mainWindow.appendChild(textContent);
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

function makeClient(engine: FakeEngine) {
  const elements = mountHostElements();
  const client = new BrowserClient({
    storagePrefix: 'turn-events-test-',
    defaultTheme: 'classic-light',
    themes: [{ id: 'classic-light', name: 'Classic Light' }],
    storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
    autoSave: false,
  });
  client.initialize(elements);
  (client as any).audioManager = { unlock: async () => undefined };
  client.connectEngine(engine as never, makeWorld());
  engine.emit('channel:manifest', MANIFEST);
  return { client, elements };
}

describe('BrowserClient turn capture (real render path)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('emits the turn with the channel-rendered response, echo excluded', async () => {
    const posted = installBridge();
    const { client } = makeClient(makeEngine([['You stand at the cave mouth.'], ['A lamp glints.']]));

    await client.executeCommand('look');

    expect(posted).toHaveLength(1);
    const payload = JSON.parse(posted[0]);
    expect(payload.command).toBe('look');
    expect(payload.response).toBe('You stand at the cave mouth.\nA lamp glints.');
    expect(payload.response).not.toContain('> look');
  });

  it('captures only the current turn — a second command emits its own response', async () => {
    const posted = installBridge();
    const { client } = makeClient(makeEngine([['Taken.']]));

    await client.executeCommand('take lamp');
    await client.executeCommand('drop lamp');

    expect(posted).toHaveLength(2);
    expect(JSON.parse(posted[1])).toEqual({ command: 'drop lamp', response: 'Taken.' });
  });

  it('runs clean without a bridge — normal play unaffected', async () => {
    const { client, elements } = makeClient(makeEngine([['A room.']]));
    await client.executeCommand('look');
    expect(elements.textContent.textContent).toContain('A room.');
  });
});
