/**
 * @file A reloaded page shows what the channels were showing, on the real
 * path (GH #798).
 *
 * Purpose: the acceptance test for the browser client's channel restore.
 * A compiled Chord story with an append channel of its own is played
 * through a real `BrowserClient` and a real `GameEngine`, which autosaves
 * each turn; then a second client and engine boot over the same storage,
 * as a page reload does, and restore from that autosave.
 *
 * Nothing this repository owns is faked: the save is the engine's own, the packets are
 * the channel service's, and the status heading and the side panel are
 * written by the client's own renderers.
 * The turn count is checked here at all three restore seams (the boot-time
 * autosave, the Restore menu and a typed RESTORE). `channel-restore-seam.test.ts`
 * covers what this file does not: a Restore-menu restore dropping the panel
 * entries learned since the save, and an envelope without the field.
 *
 * Owner context: platform-browser tests (the real-path gate for channel
 * state across a restore).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

import { GameEngine, type Story } from '@sharpee/engine';
import { WorldModel } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';

import { BrowserClient } from '../src/BrowserClient';
import type { DOMElements } from '../src/types';

const STORAGE_PREFIX = `channel-restore-real-path-${process.pid}-`;

const SOURCE = `story
  title: Reload
  authors:
    T
  id: reload-fixture
  story-version: 0.0.1

define channel findings
  mode append
  return "(what): (note)" from fixture-thing-found
end channel

create the Lodge
  a room
  north to the Library

  A small lodge.

create the Library
  a room
  south to the Lodge

  Shelves to the ceiling.

create the leaf
  a thing
  in the Library

  A loose leaf.

  after the player examining
    emit fixture-thing-found with what "leaf" and note "one line of ink"
  end after

create the bell
  a thing
  in the Library

  A small brass bell.

  after the player examining
    emit fixture-thing-found with what "bell" and note "it has no clapper"
  end after

create Alex
  a person
  playable
  starts in the Lodge

  You.

before the game starts
  change the player to Alex
end before
`;

/** The parts of a mounted page a test reads. */
interface Page {
  client: BrowserClient;
  statusLocation: HTMLElement;
  statusScore: HTMLElement;
  transcript: HTMLElement;
}

/** Mount the element set `chord-browser-entry.ts.template` looks up by id. */
function mountHostElements(): DOMElements {
  const make = <T extends HTMLElement>(tag: string): T => {
    const el = document.createElement(tag) as T;
    document.body.appendChild(el);
    return el;
  };
  const mainWindow = make<HTMLElement>('div');
  const textContent = document.createElement('div');
  mainWindow.appendChild(textContent);
  return {
    statusLocation: make<HTMLElement>('span'),
    statusScore: make<HTMLElement>('span'),
    textContent,
    mainWindow,
    commandInput: make<HTMLInputElement>('input'),
    saveDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    restoreDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    startupDialog: make<HTMLElement>('div') as unknown as HTMLDialogElement,
    saveNameInput: make<HTMLInputElement>('input'),
    saveSlotsListEl: make<HTMLElement>('ul'),
    restoreSlotsListEl: make<HTMLElement>('ul'),
    noSavesMessage: make<HTMLElement>('div'),
    startupSaveInfo: make<HTMLElement>('div'),
    menuBar: make<HTMLElement>('div'),
  };
}

/**
 * Load the page: a fresh document, client, world and engine over whatever
 * the browser's storage holds, which is what a reload is.
 */
async function loadPage(): Promise<Page> {
  document.body.innerHTML = '';
  const compiled = compile(SOURCE);
  if (!compiled.ok) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
    throw new Error(
      `fixture failed the Chord load-time gate:\n`
      + errors.map((d) => `  ${d.span.line}:${d.span.column} [${d.code}] ${d.message}`).join('\n'),
    );
  }
  const story = createStory(compiled.ir) as unknown as Story;

  const elements = mountHostElements();
  const client = new BrowserClient({
    storagePrefix: STORAGE_PREFIX,
    defaultTheme: 'modern-dark',
    themes: [{ id: 'modern-dark', name: 'Modern Dark' }],
    storyInfo: {
      title: story.config.title,
      description: story.config.description || '',
      authors: story.config.authors.join(', '),
      version: '1.0.0',
    },
  });
  client.initialize(elements);

  const world = new WorldModel();
  const language = new LanguageProvider();
  const parser = new Parser(language);
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);
  const engine = new GameEngine({ world, parser, language, perceptionService: new PerceptionService() });

  client.connectEngine(engine, world);
  engine.installStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());
  await client.start();
  return {
    client,
    statusLocation: elements.statusLocation,
    statusScore: elements.statusScore,
    transcript: elements.textContent,
  };
}

/** The client's private restore seam, as these tests reach it. */
interface RestoreSeam {
  performSave(slotName: string): void;
  runRestoreDialog(): Promise<boolean>;
  dialogManager: { showRestoreDialog(): Promise<string | null> };
}

/** Reach the client's restore seam, which is private to it. */
function restoreSeam(client: BrowserClient): RestoreSeam {
  return client as unknown as RestoreSeam;
}

/** The text of the side panel, or '' when no panel is shown. */
function panelText(): string {
  return document.getElementById('sharpee-sidebar')?.textContent ?? '';
}

/** How many times `needle` occurs in `haystack`. */
function count(haystack: string, needle: string): number {
  return haystack.split(needle).length - 1;
}

describe('a reloaded page shows what the channels were showing (GH #798)', () => {
  // The browser's storage, which outlives a page: the test environment has
  // none that works, so this is the one stand-in here. It is the browser's,
  // not a dependency this repository owns.
  const storageBacking = new Map<string, string>();
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as any).webkit;
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
  });

  it('the room name and a story panel built over two turns survive the reload', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    await before.client.executeCommand('examine leaf');
    await before.client.executeCommand('examine bell');
    // PRECONDITION: the page shows the room and both findings before the reload.
    expect(before.statusLocation.textContent).toBe('Library');
    expect(panelText()).toContain('leaf: one line of ink');
    expect(panelText()).toContain('bell: it has no clapper');

    const after = await loadPage();

    expect(after.transcript.textContent).toContain('[Session restored]');
    expect(after.statusLocation.textContent).toBe('Library');
    expect(panelText()).toContain('leaf: one line of ink');
    expect(panelText()).toContain('bell: it has no clapper');
    // Each finding once: the panel was rebuilt, not appended to twice.
    expect(count(panelText(), 'leaf: one line of ink')).toBe(1);
  });

  it('the save leaves out every channel the client restores by other means', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    await before.client.executeCommand('examine leaf');

    const envelope = (before.client as any).saveManager.loadAutosaveEnvelope();
    const saved = Object.keys(envelope.channelState);

    // What a real engine sent and the save kept.
    expect(saved).toContain('location');
    expect(saved).toContain('findings');
    // What it sent and the save must not keep: the transcript's channels
    // would print twice, and the client's own fields, which the envelope
    // sets, would be blanked.
    for (const id of [
      'room-name',
      'room-description',
      'action-result',
      'preferred-layout',
      'banner',
      'story.chapter',
      'score',
      'turn',
      'story-ending',
    ]) {
      expect(saved, `the save should not hold "${id}"`).not.toContain(id);
    }
  });

  it('the restored prose is printed once, by the transcript alone', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    // PRECONDITION: the Library was described once.
    expect(count(before.transcript.textContent ?? '', 'Shelves to the ceiling.')).toBe(1);

    const after = await loadPage();

    expect(after.transcript.textContent).toContain('[Session restored]');
    expect(count(after.transcript.textContent ?? '', 'Shelves to the ceiling.')).toBe(1);
    expect(count(after.transcript.textContent ?? '', 'A small lodge.')).toBe(1);
    // The banner too, which is not a prose channel but is printed in the log.
    expect(count(after.transcript.textContent ?? '', 'Story v0.0.1')).toBe(1);
  });

  it('play goes on after the reload, and the panel grows from where it was', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    await before.client.executeCommand('examine leaf');

    const after = await loadPage();
    // PRECONDITION: restored with one finding.
    expect(panelText()).toContain('leaf: one line of ink');
    expect(panelText()).not.toContain('bell: it has no clapper');

    await after.client.executeCommand('examine bell');

    expect(count(panelText(), 'leaf: one line of ink')).toBe(1);
    expect(panelText()).toContain('bell: it has no clapper');
    expect(after.statusLocation.textContent).toBe('Library');
  });

  it('the turn count survives the reload and goes on by one a command (the boot seam)', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    await before.client.executeCommand('examine leaf');
    await before.client.executeCommand('examine bell');
    // PRECONDITION: three commands, three turns.
    expect(before.statusScore.textContent).toBe('Score: 0 | Turns: 3');

    const after = await loadPage();

    expect(after.transcript.textContent).toContain('[Session restored]');
    expect(after.statusScore.textContent).toBe('Score: 0 | Turns: 3');

    await after.client.executeCommand('south');

    expect(after.statusScore.textContent).toBe('Score: 0 | Turns: 4');
  });

  it('a restored session prints no opening after "[Session restored]"', async () => {
    const before = await loadPage();
    await before.client.executeCommand('north');
    // PRECONDITION: the new game opened with its banner, once.
    expect(count(before.transcript.textContent ?? '', 'Story v0.0.1')).toBe(1);

    const after = await loadPage();

    const log = after.transcript.textContent ?? '';
    expect(log.trimEnd().endsWith('[Session restored]')).toBe(true);
    expect(count(log, 'Story v0.0.1')).toBe(1);
    expect(count(log, 'A small lodge.')).toBe(1);
  });

  it('the Restore menu puts the turn count back to the save\'s, and it goes on by one a command (the menu seam)', async () => {
    const page = await loadPage();
    await page.client.executeCommand('north');
    await page.client.executeCommand('examine leaf');
    restoreSeam(page.client).performSave('early');
    await page.client.executeCommand('examine bell');
    await page.client.executeCommand('south');
    // PRECONDITION: the page has played on past the save.
    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 4');
    expect(page.statusLocation.textContent).toBe('Lodge');

    // The dialog waits on a person's click; the choice is the one stand-in.
    restoreSeam(page.client).dialogManager.showRestoreDialog = async () => 'early';
    const restored = await restoreSeam(page.client).runRestoreDialog();

    expect(restored).toBe(true);
    expect(page.statusLocation.textContent).toBe('Library');
    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 2');

    await page.client.executeCommand('examine bell');

    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 3');
  });

  it('a typed RESTORE puts the turn count back to the save\'s, and it goes on by one a command (the command seam)', async () => {
    const page = await loadPage();
    await page.client.executeCommand('north');
    await page.client.executeCommand('examine leaf');
    restoreSeam(page.client).performSave('early');
    await page.client.executeCommand('examine bell');
    await page.client.executeCommand('south');
    // PRECONDITION: the page has played on past the save.
    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 4');

    // The dialog waits on a person's click; the choice is the one stand-in.
    restoreSeam(page.client).dialogManager.showRestoreDialog = async () => 'early';
    await page.client.executeCommand('restore');

    // The command's own packet follows the restore and says the save's count.
    expect(page.statusLocation.textContent).toBe('Library');
    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 2');

    await page.client.executeCommand('examine bell');

    expect(page.statusScore.textContent).toBe('Score: 0 | Turns: 3');
  });
});
