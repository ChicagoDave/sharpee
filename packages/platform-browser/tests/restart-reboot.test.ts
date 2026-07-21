/**
 * ADR-248 restart-reboot boundary tests for BrowserClient.
 *
 * Covers the three required client-side behaviors:
 *  (a) the autosave envelope is deleted the moment restart is confirmed,
 *      before any reboot runs;
 *  (b) a declined restart leaves the envelope untouched and never reboots;
 *  (c) a failed reboot displays the real error text (no parse fallback).
 *
 * Uses the real SaveManager over happy-dom localStorage so assertions hit
 * actual persisted state, with a minimal fake engine/textDisplay where the
 * full boot pipeline isn't under test.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { WorldModel } from '@sharpee/world-model';
import { BrowserClient } from '../src/BrowserClient';
import { SaveManager } from '../src/managers/SaveManager';

const PREFIX = 'rt-test-';

// The happy-dom environment here ships a non-functional localStorage;
// back it with a real in-memory store so SaveManager assertions hit
// actual persisted state.
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
  });
});

function fakeEngineSave(): any {
  return {
    version: '1',
    timestamp: Date.now(),
    metadata: { description: 'test', turnCount: 3 },
    engineState: {},
  };
}

function makeHarness(opts: {
  confirmAnswer: boolean;
  reboot?: () => Promise<void>;
}) {
  vi.stubGlobal('confirm', vi.fn(() => opts.confirmAnswer));

  const client = new BrowserClient({
    storagePrefix: PREFIX,
    defaultTheme: 'classic',
    themes: [],
    storyInfo: {
      title: 'Restart Test',
      description: '',
      authors: 'tester',
      version: '0.0.0',
      engineVersion: '0.0.0',
      buildDate: '',
    },
    reboot: opts.reboot,
  } as any);

  const world = new WorldModel();
  const saveManager = new SaveManager({ storagePrefix: PREFIX, world });
  const engine = {
    executeTurn: vi.fn(async () => ({})),
    stop: vi.fn(),
    on: vi.fn(),
  };
  const textDisplay = {
    displayText: vi.fn(),
    displayCommand: vi.fn(),
  };

  (client as any).saveManager = saveManager;
  (client as any).engine = engine;
  (client as any).world = world;
  (client as any).textDisplay = textDisplay;
  (client as any).audioManager = { unlock: async () => undefined };
  (client as any).syncScoreFromWorld = () => undefined;

  return { client, saveManager, engine, textDisplay };
}

function seedAutosave(saveManager: SaveManager): void {
  saveManager.performAutoSave(fakeEngineSave(), {
    score: 5,
    transcriptHtml: '<p>seed</p>',
    turnCount: 3,
  } as any);
  expect(saveManager.loadAutosaveEnvelope()).not.toBeNull();
}

afterEach(() => {
  vi.unstubAllGlobals();
  storageBacking.clear();
});

describe('ADR-248 restart reboot (BrowserClient)', () => {
  it('deletes the autosave envelope the moment restart is confirmed, before any reboot', async () => {
    const rebootCalls: number[] = [];
    const { client, saveManager } = makeHarness({
      confirmAnswer: true,
      // Never-resolving reboot: proves the envelope is gone strictly
      // before the reboot completes.
      reboot: () => {
        rebootCalls.push(1);
        return new Promise<void>(() => undefined);
      },
    });
    seedAutosave(saveManager);

    const confirmed = await client.getSaveRestoreHooks().onRestartRequested!({} as any);

    expect(confirmed).toBe(true);
    // The envelope is gone at confirm time — the hook never reboots.
    expect(saveManager.loadAutosaveEnvelope()).toBeNull();
    expect(rebootCalls).toHaveLength(0);
    expect((client as any).pendingReboot).toBe(true);
  });

  it('declined restart leaves the autosave intact, never reboots, and keeps the engine untouched', async () => {
    const reboot = vi.fn(async () => undefined);
    const { client, saveManager, engine } = makeHarness({ confirmAnswer: false, reboot });
    seedAutosave(saveManager);

    const confirmed = await client.getSaveRestoreHooks().onRestartRequested!({} as any);
    // A later command completes without triggering any deferred reboot.
    await client.executeCommand('look');

    expect(confirmed).toBe(false);
    expect(saveManager.loadAutosaveEnvelope()).not.toBeNull();
    expect(reboot).not.toHaveBeenCalled();
    expect(engine.stop).not.toHaveBeenCalled();
    expect((client as any).pendingReboot).toBe(false);
  });

  it('reboots via config.reboot after the turn resolves, stopping the old engine with reason restart', async () => {
    const order: string[] = [];
    const reboot = vi.fn(async () => {
      order.push('reboot');
    });
    const { client, saveManager, engine } = makeHarness({ confirmAnswer: true, reboot });
    seedAutosave(saveManager);
    engine.executeTurn.mockImplementation(async () => {
      // Simulate the engine's meta path: the hook fires mid-turn.
      await client.getSaveRestoreHooks().onRestartRequested!({} as any);
      order.push('turn-complete');
      return {};
    });

    await client.executeCommand('restart');

    expect(order).toEqual(['turn-complete', 'reboot']);
    expect(engine.stop).toHaveBeenCalledWith('restart');
    expect((client as any).pendingReboot).toBe(false);
  });

  it('connectEngine called again (reboot path) re-points the world and keeps DOM managers, without recreating them', () => {
    vi.stubGlobal('confirm', vi.fn(() => true));

    // Full DOM so initialize()/connectEngine() build real managers once.
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
        title: 'Reconnect Test',
        description: '',
        authors: 'tester',
        version: '0.0.0',
        engineVersion: '0.0.0',
        buildDate: '',
      },
    } as any);
    client.initialize(elements);

    const fakeEngine = () => ({ on: vi.fn(), executeTurn: vi.fn(async () => ({})), stop: vi.fn() });

    const makeWorld = (roomName: string) => {
      const world = new WorldModel();
      const player = world.createEntity('you', 'actor' as any);
      world.setPlayer(player.id);
      const room = world.createEntity(roomName, 'room' as any);
      world.moveEntity(player.id, room.id);
      return world;
    };

    const engineA = fakeEngine();
    const worldA = makeWorld('Alpha Room');
    client.connectEngine(engineA as any, worldA);

    const saveManager = (client as any).saveManager;
    const dialogManager = (client as any).dialogManager;
    const menuManager = (client as any).menuManager;
    const inputManager = (client as any).inputManager;
    expect(saveManager).toBeTruthy();
    const locationA = saveManager.getCurrentLocation();

    // Reboot: a second connectEngine with a fresh engine/world pair.
    const engineB = fakeEngine();
    const worldB = makeWorld('Beta Room');
    client.connectEngine(engineB as any, worldB);

    // DOM-bound managers are the SAME objects — no recreation, no
    // double-bound listeners.
    expect((client as any).saveManager).toBe(saveManager);
    expect((client as any).dialogManager).toBe(dialogManager);
    expect((client as any).menuManager).toBe(menuManager);
    expect((client as any).inputManager).toBe(inputManager);

    // SaveManager now reads state from the NEW world (setWorld took).
    const locationB = saveManager.getCurrentLocation();
    expect(locationB).not.toBe(locationA);

    // The channel renderer re-subscribed to the NEW engine.
    const subscribedEvents = engineB.on.mock.calls.map((c: unknown[]) => c[0]);
    expect(subscribedEvents).toContain('channel:packet');
    expect(subscribedEvents).toContain('channel:manifest');
  });

  it('a failed reboot displays the real error text, not a parse fallback', async () => {
    const reboot = vi.fn(async () => {
      throw new Error('assignRoom: room r01 not found');
    });
    const { client, engine, textDisplay } = makeHarness({ confirmAnswer: true, reboot });
    engine.executeTurn.mockImplementation(async () => {
      await client.getSaveRestoreHooks().onRestartRequested!({} as any);
      return {};
    });

    await client.executeCommand('restart');

    expect(reboot).toHaveBeenCalledTimes(1);
    const texts = textDisplay.displayText.mock.calls.map((c: unknown[]) => c[0]);
    expect(texts).toContain('[Restart failed: assignRoom: room r01 not found]');
  });
});
