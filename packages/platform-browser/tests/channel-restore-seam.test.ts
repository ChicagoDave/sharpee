/**
 * @file A restore puts back what the channels were showing (GH #798).
 *
 * Purpose: pin the browser client's two halves of that promise. A save
 * carries the renderer host's channel state, and a restore replays it, so
 * the status heading and a story's panels read after a reload as they did
 * before it.
 *
 * The defect this was written against: after a page reload the game came
 * back from its autosave with the room name gone from the status line and
 * a story's append panel empty and hidden. A restore runs between turns
 * and produces no packet, and by design an append channel's packet carries
 * only that turn's new entries, so nothing on the page or in the engine
 * could put either back.
 *
 * The engine here is a scaffolding fake, as in
 * `story-ending-restore-seam.test.ts`: what is under test is the client's
 * save context and its restore seams. The real path, a built story
 * engine and a compiled Chord story across a reload, is
 * `channel-restore-real-path.test.ts`, which also covers the transcript's
 * prose being printed once.
 *
 * Owner context: browser default client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldModel, ActorTrait } from '@sharpee/world-model';
import type { ChannelDefinition, CmgtPacket, TurnPacket } from '@sharpee/if-domain';
import { BrowserClient } from '../src/BrowserClient';

const PREFIX = 'channel-seam-test-';

const storageBacking = new Map<string, string>();
beforeEach(() => {
  storageBacking.clear();
  vi.stubGlobal('localStorage', {
    getItem: (k: string) => storageBacking.get(k) ?? null,
    setItem: (k: string, v: string) => {
      storageBacking.set(k, String(v));
    },
    removeItem: (k: string) => {
      storageBacking.delete(k);
    },
    clear: () => storageBacking.clear(),
    key: (i: number) => [...storageBacking.keys()][i] ?? null,
    get length() {
      return storageBacking.size;
    },
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  storageBacking.clear();
});

const LOCATION: ChannelDefinition = { id: 'location', contentType: 'json', mode: 'replace' };
const WORKINGS: ChannelDefinition = { id: 'workings', contentType: 'text', mode: 'append' };
const ROOM_DESCRIPTION: ChannelDefinition = {
  id: 'room-description',
  contentType: 'json',
  mode: 'append',
};
const MANIFEST: CmgtPacket = {
  kind: 'cmgt',
  protocol_version: 1,
  channels: [LOCATION, ROOM_DESCRIPTION, WORKINGS],
};

/** The page regions a test reads. */
interface Page {
  client: BrowserClient;
  statusLocation: HTMLElement;
  transcript: HTMLElement;
}

/** A client over a fresh DOM. localStorage is left as it is, as on a reload. */
function makePage(): Page {
  document.body.innerHTML = '';
  const mk = (id: string, tag = 'div'): any => {
    const el = document.createElement(tag);
    el.id = id;
    document.body.appendChild(el);
    return el;
  };
  const elements: any = {
    statusLocation: mk('location-name'),
    statusScore: mk('score-turns'),
    textContent: mk('text-content'),
    mainWindow: mk('main-window'),
    commandInput: mk('command-input', 'input'),
    saveDialog: mk('save-dialog', 'dialog'),
    restoreDialog: mk('restore-dialog', 'dialog'),
    startupDialog: mk('startup-dialog', 'dialog'),
    saveNameInput: mk('save-name-input', 'input'),
    saveSlotsListEl: mk('save-slots-list'),
    restoreSlotsListEl: mk('restore-slots-list'),
    noSavesMessage: mk('no-saves-message'),
    startupSaveInfo: mk('startup-save-info'),
    menuBar: mk('menu-bar'),
  };
  const client = new BrowserClient({
    storagePrefix: PREFIX,
    defaultTheme: 'classic',
    themes: [],
    storyInfo: {
      title: 'Channel Seam Test',
      description: '',
      authors: 'tester',
      version: '0.0.0',
      engineVersion: '0.0.0',
      buildDate: '',
    },
  } as any);
  client.initialize(elements);
  return { client, statusLocation: elements.statusLocation, transcript: elements.textContent };
}

function makeWorld(): WorldModel {
  const world = new WorldModel();
  const player = world.createEntity('you', 'actor' as any);
  player.add(new ActorTrait({ isPlayable: true }));
  world.setPlayer(player.id);
  const room = world.createEntity('Library', 'room' as any);
  world.moveEntity(player.id, room.id);
  return world;
}

/**
 * A stand-in engine that keeps the listeners the client registers, so a
 * test can deliver a manifest and packets as the real engine would. Its
 * `start` delivers the manifest, which is the one thing a real engine's
 * start does that the restore seam depends on.
 */
function fakeEngine() {
  const listeners = new Map<string, Array<(...args: any[]) => void>>();
  const emit = (event: string, ...args: any[]): void => {
    for (const listener of listeners.get(event) ?? []) listener(...args);
  };
  const engine: any = {
    on: (event: string, listener: (...args: any[]) => void) => {
      listeners.set(event, [...(listeners.get(event) ?? []), listener]);
    },
    stop: vi.fn(),
    start: vi.fn(async () => emit('channel:manifest', MANIFEST)),
    executeTurn: vi.fn(async () => ({})),
    loadSaveData: vi.fn(),
    createSaveData: vi.fn(() => fakeSave()),
  };
  const turn = (n: number, payload: Record<string, unknown>): void => {
    const packet: TurnPacket = { kind: 'turn', turn_id: `turn-${n}`, payload };
    emit('channel:packet', packet, n);
  };
  return { engine, emit, turn };
}

function fakeSave(): any {
  return {
    version: '1',
    timestamp: Date.now(),
    metadata: { description: 'test', turnCount: 2 },
    engineState: {},
  };
}

/** The text of the generic side panel for the story's channel, or '' when it is not shown. */
function panelText(): string {
  return document.getElementById('sharpee-sidebar')?.textContent ?? '';
}

/**
 * Play two turns on a fresh page: the player reaches the Library, and the
 * story's `workings` channel gains two entries on separate turns.
 */
function playToTheLibrary(): Page {
  const page = makePage();
  const { engine, emit, turn } = fakeEngine();
  page.client.connectEngine(engine, makeWorld() as any);
  emit('channel:manifest', MANIFEST);
  turn(1, {
    location: { text: 'Library' },
    'room-description': [{ key: 'room.description', content: ['Shelves to the ceiling.'] }],
    workings: ['spark: wakes a flame'],
  });
  turn(2, { workings: ['hush: stills a sound'] });
  return page;
}

describe('a save carries what the channels were showing', () => {
  it('the autosave envelope holds the status heading and the whole of an append channel', () => {
    const page = playToTheLibrary();
    // PRECONDITION: the page shows both, so there is something to save.
    expect(page.statusLocation.textContent).toBe('Library');
    expect(panelText()).toContain('spark: wakes a flame');

    const envelope = (page.client as any).saveManager.loadAutosaveEnvelope();

    expect(envelope.channelState.location).toEqual({ text: 'Library' });
    // Both turns' entries, though each packet carried only its own.
    expect(envelope.channelState.workings).toEqual([
      'spark: wakes a flame',
      'hush: stills a sound',
    ]);
  });

  it('the prose channels are left to the transcript and are not saved twice', () => {
    const page = playToTheLibrary();

    const envelope = (page.client as any).saveManager.loadAutosaveEnvelope();

    expect(Object.keys(envelope.channelState).sort()).toEqual(['location', 'workings']);
  });
});

describe('a reload puts back what the channels were showing (the boot seam)', () => {
  it('the restored page shows the room name and the story panel', async () => {
    playToTheLibrary();

    // The reload: a new document and a new client over the same storage.
    const page = makePage();
    const { engine } = fakeEngine();
    page.client.connectEngine(engine, makeWorld() as any);
    // PRECONDITION: the new page has nothing to show yet.
    expect(page.statusLocation.textContent).toBe('');
    expect(panelText()).toBe('');

    await page.client.start();

    expect(engine.loadSaveData).toHaveBeenCalledTimes(1);
    expect(page.statusLocation.textContent).toBe('Library');
    expect(panelText()).toContain('spark: wakes a flame');
    expect(panelText()).toContain('hush: stills a sound');
  });

  it('an autosave written before the field existed restores as it did before', async () => {
    playToTheLibrary();
    // Rewrite the stored autosave without its channel state.
    const { engine: seed } = fakeEngine();
    const seeded = makePage();
    seeded.client.connectEngine(seed, makeWorld() as any);
    (seeded.client as any).saveManager.performAutoSave(fakeSave(), {
      turnCount: 2,
      score: 0,
      transcriptHtml: '<p>Shelves to the ceiling.</p>',
      channelState: undefined,
    });
    expect((seeded.client as any).saveManager.loadAutosaveEnvelope().channelState).toBeUndefined();

    const page = makePage();
    const { engine } = fakeEngine();
    page.client.connectEngine(engine, makeWorld() as any);
    await page.client.start();

    // The game is restored, and the channels are simply not replayed. The
    // restore ran to its end: a failure inside it is caught and falls back
    // to a new game, which would look the same but for these two.
    expect(engine.loadSaveData).toHaveBeenCalledTimes(1);
    expect(page.transcript.textContent).toContain('[Session restored]');
    expect(engine.executeTurn).not.toHaveBeenCalled();
    expect(page.transcript.textContent).toContain('Shelves to the ceiling.');
    expect(page.statusLocation.textContent).toBe('');
  });
});

describe('the Restore menu puts back what the channels were showing (the menu seam)', () => {
  it('restoring an earlier save drops the entries learned since and shows its room', async () => {
    const page = makePage();
    const { engine, emit, turn } = fakeEngine();
    page.client.connectEngine(engine, makeWorld() as any);
    emit('channel:manifest', MANIFEST);
    turn(1, { location: { text: 'Library' }, workings: ['spark: wakes a flame'] });
    (page.client as any).performSave('early');

    // Play on past the save.
    turn(2, { location: { text: 'Bell Stair' }, workings: ['hush: stills a sound'] });
    // PRECONDITION: the page has moved on.
    expect(page.statusLocation.textContent).toBe('Bell Stair');
    expect(panelText()).toContain('hush: stills a sound');

    (page.client as any).dialogManager.showRestoreDialog = async () => 'early';
    const restored = await (page.client as any).runRestoreDialog();

    expect(restored).toBe(true);
    expect(page.statusLocation.textContent).toBe('Library');
    expect(panelText()).toContain('spark: wakes a flame');
    expect(panelText()).not.toContain('hush: stills a sound');
  });
});
