/**
 * turn-events.test.ts — the IDE play-session turn feed (ADR-277 D5, rebuilt
 * for ADR-305 D4).
 *
 * Pins: emitTurnEvent posts the `{turn, command, output, captures}` record to
 * the WKWebView `turnEvents` handler when present, is a true no-op without one
 * (plain browser play — same client bundle), and never throws even if the
 * bridge does. The BrowserClient path is real: executeCommand brackets the
 * turn, stamps `data-turn` on everything the turn rendered (echo included —
 * the anchor contract), and emits the engine-composed output with structured
 * channel captures. Ordinals are page-lifetime monotonic; a reboot posts a
 * restart fence and never resets them (ADR-305 D3/D4).
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { CmgtPacket } from '@sharpee/if-domain';
import { BrowserClient } from '../src/BrowserClient';
import { emitTurnEvent, capturesOf } from '../src/turn-events';
import { packetProseText } from '@sharpee/channel-service';

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
  it('posts the {turn, command, output, captures} record when the bridge is present', () => {
    const posted = installBridge();
    emitTurnEvent({ turn: 3, command: 'take lamp', output: 'Taken.', captures: [] });
    expect(posted).toHaveLength(1);
    expect(JSON.parse(posted[0])).toEqual({
      turn: 3,
      command: 'take lamp',
      output: 'Taken.',
      captures: [],
    });
  });

  it('is a no-op without window.webkit (plain browser play)', () => {
    expect(() =>
      emitTurnEvent({ turn: 1, command: 'look', output: 'A room.', captures: [] })
    ).not.toThrow();
  });

  it('swallows a throwing bridge — play never breaks on observation', () => {
    (window as any).webkit = {
      messageHandlers: {
        turnEvents: { postMessage: () => { throw new Error('bridge gone'); } },
      },
    };
    expect(() =>
      emitTurnEvent({ turn: 1, command: 'look', output: 'A room.', captures: [] })
    ).not.toThrow();
  });
});

describe('capturesOf', () => {
  it('merges packet payloads per channel, structure preserved, scalars wrapped', () => {
    expect(
      capturesOf([
        { 'room-name': ['Den'], score: 5 },
        { 'room-name': [{ content: ['Still the Den'] }] },
      ])
    ).toEqual([
      { channel: 'room-name', values: ['Den', { content: ['Still the Den'] }] },
      { channel: 'score', values: [5] },
    ]);
  });
});

// ── BrowserClient real-path: bracket what the turn actually rendered ──

interface FakeEngine {
  on(event: string, handler: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  executeTurn(command: string): Promise<void>;
  start(options?: unknown): Promise<void>;
  setStory(story: unknown): void;
  stop(reason?: string): void;
}

const MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [
    { id: 'game-message', contentType: 'json', mode: 'append', emit: 'sparse' },
    { id: 'preferred-layout', contentType: 'json', mode: 'replace', emit: 'always' },
    { id: 'prompt', contentType: 'text', mode: 'replace', emit: 'always' },
  ],
};

function makeEngine(responseParagraphs: string[][]): FakeEngine {
  const handlers = new Map<string, Set<(...args: any[]) => void>>();
  let turn = 0;
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
      turn += 1;
      engine.emit('channel:packet', {
        kind: 'turn',
        turn_id: `turn-${turn}`,
        payload: {
          'game-message': responseParagraphs,
          'preferred-layout': responseParagraphs.map(() => 'game-message'),
        },
      }, turn);
    },
    async start() { /* no-op */ },
    setStory() { /* no-op */ },
    stop() { /* no-op */ },
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

function makeClient(engine: FakeEngine, reboot?: () => Promise<void>) {
  const elements = mountHostElements();
  const client = new BrowserClient({
    storagePrefix: 'turn-events-test-',
    defaultTheme: 'classic-light',
    themes: [{ id: 'classic-light', name: 'Classic Light' }],
    storyInfo: { title: 'Test', author: 'Test', version: '1.0' },
    autoSave: false,
    ...(reboot ? { reboot } : {}),
  });
  client.initialize(elements);
  (client as any).audioManager = { unlock: async () => undefined };
  client.connectEngine(engine as never, makeWorld());
  engine.emit('channel:manifest', MANIFEST);
  return { client, elements };
}

describe('BrowserClient turn feed (real render path)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('emits the record: engine-composed output (echo excluded), structured captures', async () => {
    const posted = installBridge();
    const { client } = makeClient(makeEngine([['You stand at the cave mouth.'], ['A lamp glints.']]));

    await client.executeCommand('look');

    expect(posted).toHaveLength(1);
    const payload = JSON.parse(posted[0]);
    expect(payload.command).toBe('look');
    // The BLANK LINE is load-bearing — do not "tidy" it to a single newline.
    // Two non-tight entries are separate paragraphs, and the headless harness
    // (`@sharpee/bootstrap`, what `sharpee test` compares against) joins them
    // with '\n\n'. A single newline here means every all-emitted-text
    // assertion written from play fails on its first headless replay — the
    // exact bug ADR-282's 2026-07-28 amendment fixed.
    expect(payload.output).toBe('You stand at the cave mouth.\n\nA lamp glints.');
    expect(payload.output).not.toContain('> look');
    // Captures stay structured — flattening is the synthesis module's job.
    expect(payload.captures).toEqual(
      expect.arrayContaining([
        {
          channel: 'game-message',
          values: [['You stand at the cave mouth.'], ['A lamp glints.']],
        },
      ])
    );
  });

  it('continues a tight entry on the next line, not as a new paragraph', () => {
    expect(packetProseText({
      'game-message': [{ content: ['Score: 10'] }],
      'room-name': [{ content: ['Turns: 4'], tight: true }],
      'preferred-layout': ['game-message', 'room-name'],
    })).toBe('Score: 10\nTurns: 4');
  });

  it('stamps data-turn on everything the turn rendered — echo included — matching the record', async () => {
    const posted = installBridge();
    const { client, elements } = makeClient(makeEngine([['Taken.']]));

    await client.executeCommand('take lamp');

    const { turn } = JSON.parse(posted[0]);
    const stamped = elements.textContent.querySelectorAll(`[data-turn="${turn}"]`);
    expect(stamped.length).toBeGreaterThanOrEqual(2); // echo + at least one entry
    expect(stamped[0].textContent).toBe('> take lamp');
    expect([...stamped].map((el) => el.textContent).join(' ')).toContain('Taken.');
  });

  it('ordinals are monotonic across turns; each turn stamps only its own elements', async () => {
    const posted = installBridge();
    const { client, elements } = makeClient(makeEngine([['Done.']]));

    await client.executeCommand('north');
    await client.executeCommand('south');

    const first = JSON.parse(posted[0]);
    const second = JSON.parse(posted[1]);
    expect(second.turn).toBe(first.turn + 1);
    const firstStamped = elements.textContent.querySelectorAll(`[data-turn="${first.turn}"]`);
    expect([...firstStamped].some((el) => el.textContent === '> south')).toBe(false);
    // Every rendered element belongs to exactly one turn.
    expect(elements.textContent.querySelectorAll('[data-turn]').length).toBe(
      elements.textContent.children.length
    );
  });

  it('an in-page reboot posts the restart fence and ordinals do NOT reset', async () => {
    const posted = installBridge();
    const engine = makeEngine([['Done.']]);
    const { client } = makeClient(engine, async () => undefined);

    await client.executeCommand('wait');
    const before = JSON.parse(posted[0]);

    await (client as any).disposeAndReboot();
    const fence = JSON.parse(posted[1]);
    expect(fence).toEqual({ restart: true, turn: before.turn + 1 });

    // The same page keeps counting — the anchor invariant (ADR-305 D4).
    await client.executeCommand('look');
    const after = JSON.parse(posted[2]);
    expect(after.turn).toBe(fence.turn);
  });

  it('runs clean without a bridge — normal play unaffected, anchors still stamped', async () => {
    const { client, elements } = makeClient(makeEngine([['A room.']]));
    await client.executeCommand('look');
    expect(elements.textContent.textContent).toContain('A room.');
    // The anchor is a published client contract, not IDE chrome.
    expect(elements.textContent.querySelectorAll('[data-turn]').length).toBeGreaterThan(0);
  });
});
