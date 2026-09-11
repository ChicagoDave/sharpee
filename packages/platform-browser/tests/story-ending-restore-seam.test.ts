/**
 * @file The input box re-derives from the restored world at both client
 * restore seams (ADR-348 AC-2; ADR-347 D3a).
 *
 * Purpose: pin `BrowserClient.syncEndingFromWorld()` at the two places it
 * is called, which is what makes the input box a *derived view* of the
 * world under ADR-348 D1 rather than a thing the client sets and hopes
 * stays true.
 *
 * These are deliberately not the `story-ending` channel renderer's tests
 * (`story-ending-input.test.ts`). That renderer is the live in-play
 * signal, and it only arrives on a turn's packet. A restore runs
 * *between* turns and produces no packet at all — which is exactly why
 * the client reads the world directly here. Same fact, different
 * delivery, and only this path was untested.
 *
 * Owner context: browser default client.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import type { IStoryEnding } from '@sharpee/if-domain';
import { BrowserClient } from '../src/BrowserClient';

const PREFIX = 'ending-seam-test-';

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

/**
 * A client over a real DOM, initialized far enough that `connectEngine`
 * builds its managers — the boot path the first seam sits on.
 */
function makeClient(): { client: BrowserClient; input: HTMLInputElement } {
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
      title: 'Ending Seam Test',
      description: '',
      authors: 'tester',
      version: '0.0.0',
      engineVersion: '0.0.0',
      buildDate: '',
    },
  } as any);
  client.initialize(elements);

  return { client, input: elements.commandInput };
}

/** A minimally playable world, optionally one that has already ended. */
function makeWorld(ending?: IStoryEnding): WorldModel {
  const world = new WorldModel();
  const player = world.createEntity('you', 'actor' as any);
  world.setPlayer(player.id);
  const room = world.createEntity('Test Room', 'room' as any);
  world.moveEntity(player.id, room.id);
  if (ending) world.setEnding(ending);
  return world;
}

/**
 * A stand-in engine. The engine is an owned dependency, so this is a
 * scaffolding fake and not the acceptance path for engine behavior:
 * ADR-348 AC-1 covers the engine's own derivation against the real
 * `GameEngine` (`packages/engine/tests/unit/engine-lifecycle-phase.test.ts`).
 * What is under test here is the *client's* re-read, and the fake exists
 * only to let a restore land a different world state — which is the one
 * thing a real engine would do that matters to this seam.
 */
function fakeEngine(onLoad?: () => void): any {
  return {
    on: vi.fn(),
    stop: vi.fn(),
    executeTurn: vi.fn(async () => ({})),
    loadSaveData: vi.fn(() => onLoad?.()),
  };
}

function fakeSave(): any {
  return {
    version: '1',
    timestamp: Date.now(),
    metadata: { description: 'test', turnCount: 4 },
    engineState: {},
  };
}

describe('the input box derives from the restored world at the boot seam (ADR-348 D1, AC-2)', () => {
  it('connecting a world that already ended disables the box, with no turn and no packet', () => {
    const { client, input } = makeClient();
    // PRECONDITION: nothing has ended, so the player may type.
    expect(input.disabled).toBe(false);

    client.connectEngine(fakeEngine(), makeWorld({ kind: 'victory', turn: 12 }) as any);

    // POSTCONDITION: the box read the world, not a channel value.
    expect(input.disabled).toBe(true);
    expect(input.getAttribute('data-story-ended')).toBe('victory');
  });

  it('rebooting into a fresh story re-enables the box the old ending had disabled', () => {
    const { client, input } = makeClient();
    client.connectEngine(fakeEngine(), makeWorld({ kind: 'defeat', turn: 3 }) as any);
    expect(input.disabled).toBe(true);

    // Reboot: a second connectEngine with a new engine/world pair. The
    // fresh channel service has no previous value to send, so nothing but
    // this seam can clear the old story's ending off the box.
    client.connectEngine(fakeEngine(), makeWorld() as any);

    expect(input.disabled).toBe(false);
    expect(input.hasAttribute('data-story-ended')).toBe(false);
  });
});

describe('the input box derives from the restored world when a save is applied (ADR-348 D1, AC-2)', () => {
  it('restoring a save whose world has ended disables the box', () => {
    const { client, input } = makeClient();
    const world = makeWorld();
    // The restore lands an ended world — what the engine's loadSaveData
    // does through `world.loadJSON()` on a save taken after the ending.
    const engine = fakeEngine(() => world.setEnding({ kind: 'defeat', turn: 7, cause: 'grue' }));
    client.connectEngine(engine, world as any);
    // PRECONDITION: the live world left the box alone.
    expect(input.disabled).toBe(false);

    (client as any).engineApplySave(fakeSave());

    expect(input.disabled).toBe(true);
    expect(input.getAttribute('data-story-ended')).toBe('defeat');
  });

  it('restoring a save that lands a live turn re-enables the box', () => {
    const { client, input } = makeClient();
    const world = makeWorld({ kind: 'victory', turn: 12 });
    // `WorldModel.loadJSON` clears before it rebuilds, and `clear()` drops
    // the Ending — so a save taken before the ending lands a world with
    // none. `clear()` is that step, not a shortcut around it.
    const engine = fakeEngine(() => world.clear());
    client.connectEngine(engine, world as any);
    expect(input.disabled).toBe(true);

    (client as any).engineApplySave(fakeSave());

    expect(input.disabled).toBe(false);
    expect(input.hasAttribute('data-story-ended')).toBe(false);
  });
});
