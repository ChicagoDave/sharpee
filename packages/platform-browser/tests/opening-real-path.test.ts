/**
 * opening-real-path.test.ts — how a story opens in the browser, compared
 * word for word with a recording made before the opening stopped being a
 * turn. The `quay` test story is compiled and loaded the way the shipped
 * entry loads it and driven through a real `BrowserClient` over a real
 * `GameEngine`; what is compared is the main log the client renders into.
 *
 * The recording keeps what a reader sees and what a theme styles: each
 * element's tag, its classes and its text, in document order. It leaves out
 * every other attribute, because per-turn stamps are bookkeeping that the
 * change is allowed to move.
 *
 * Record mode: `RECORD_OPENING_BASELINE=1` writes the recording instead of
 * comparing against it. It was run once, on the platform as it stood before
 * the change, and is never run again without a ruling. One ruling has been
 * made: on 2026-11-18 David ruled that the browser prints the prologue into
 * the log in arrival order, and the recording was made again for that one
 * difference (the prologue's paragraph is the log's first entry and no
 * longer sits in a wrapper of its own ahead of it; every other line of the
 * recording is as it was).
 *
 * The second suite is the opening as the engine runs it (ADR-404), on the
 * same real client and engine: the play feed's first record, the turn count
 * that is blank until a command costs a turn, a block's order and omissions,
 * the chapter card, and the four ways a page starts (a first load, a
 * RESTART through the client's real reboot, a restore that fails, and a
 * restored session, which has no opening).
 *
 * Public interface: none (a test file).
 * Owner context: platform-browser tests (rule 13a real-path gate for the
 * opening; `test-stories/quay/quay.test-set.md` OB-46 and OB-49).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
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

const testStories = process.env.SHARPEE_TEST_STORIES;
const baselineDir = process.env.SHARPEE_OPENING_BASELINE;
const recording = process.env.RECORD_OPENING_BASELINE === '1';

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
 * Boot a Chord source through a real client and engine.
 *
 * @param source the story's Chord text
 * @returns the started client
 * @throws Error when the source fails the Chord load-time gate
 */
async function bootClient(source: string): Promise<BrowserClient> {
  const compiled = compile(source);
  if (!compiled.ok) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
    throw new Error(
      `quay failed the Chord load-time gate:\n`
      + errors.map((d) => `  ${d.span.line}:${d.span.column} [${d.code}] ${d.message}`).join('\n'),
    );
  }
  const story = createStory(compiled.ir) as unknown as Story;

  const client = new BrowserClient({
    storagePrefix: `opening-real-path-${process.pid}-`,
    autoSave: false,
    defaultTheme: 'modern-dark',
    themes: [{ id: 'modern-dark', name: 'Modern Dark' }],
    storyInfo: {
      title: story.config.title,
      description: story.config.description || '',
      authors: story.config.authors.join(', '),
      version: '1.0.0',
    },
  });
  client.initialize(mountHostElements());

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
  return client;
}

/** The main log: the element the chapter card, the banner and the prose share. */
function mainLog(): Element {
  const card = document.querySelector('.sharpee-chapter');
  expect(card, 'the opening chapter card rendered').not.toBeNull();
  return card!.parentElement!;
}

/**
 * One element as the recording keeps it: tag, classes and text, with its
 * element children nested one level of indent deeper.
 *
 * @param el the element to write down
 * @param depth the nesting depth, for the indent
 * @returns the element's lines
 */
function recordElement(el: Element, depth: number): string[] {
  const indent = '  '.repeat(depth);
  const tag = el.tagName.toLowerCase();
  const cls = el.className ? ` class="${el.className}"` : '';
  const children = Array.from(el.children);
  if (children.length === 0) {
    return [`${indent}<${tag}${cls}>${(el.textContent ?? '').trim()}</${tag}>`];
  }
  return [
    `${indent}<${tag}${cls}>`,
    ...children.flatMap((child) => recordElement(child, depth + 1)),
    `${indent}</${tag}>`,
  ];
}

/**
 * The opening as the recording keeps it: the main log's children, in order.
 * The prologue is one of them, printed where its packet arrived; it has no
 * element of its own ahead of the log (Settle item 11 of the opening-routine
 * plan, ruled "a" by David, 2026-11-18).
 */
function recordLog(): string {
  const main = mainLog();
  expect(document.getElementById('sharpee-prologue'), 'no prologue element outside the log').toBeNull();
  return Array.from(main.children).flatMap((el) => recordElement(el, 0)).join('\n') + '\n';
}

describe.skipIf(!testStories || !baselineDir)('the opening in the browser, against the recording made before the change', () => {
  const source = (): string => readFileSync(join(testStories!, 'quay', 'quay.story'), 'utf-8');
  const baselinePath = (): string => join(baselineDir!, 'quay-browser.html');

  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as { webkit?: object }).webkit;
  });

  it('a story with no opening block opens word for word as recorded (OB-46)', async () => {
    await bootClient(source());
    const log = recordLog();

    if (recording) {
      mkdirSync(dirname(baselinePath()), { recursive: true });
      writeFileSync(baselinePath(), log, 'utf-8');
    }
    expect(existsSync(baselinePath()), `no recording at ${baselinePath()}`).toBe(true);
    expect(log).toBe(readFileSync(baselinePath(), 'utf-8'));

    // The recording is of an opening, not of an empty page: each of its four
    // parts is in it, in the order a reader meets them.
    const prologue = log.indexOf('The last ferry left an hour ago');
    const banner = log.indexOf('The Quay');
    const card = log.indexOf('Chapter I: Dusk');
    const room = log.indexOf('You have not stood here since you were a child');
    expect(prologue).toBeGreaterThanOrEqual(0);
    expect(banner).toBeGreaterThan(prologue);
    expect(card).toBeGreaterThan(banner);
    expect(room).toBeGreaterThan(card);
  });

  it('the opening chapter card is printed once, and the first command does not print it again (OB-49)', async () => {
    const client = await bootClient(source());
    expect(document.querySelectorAll('.sharpee-chapter')).toHaveLength(1);

    await client.executeCommand('take key');

    const cards = document.querySelectorAll('.sharpee-chapter');
    expect(cards).toHaveLength(1);
    expect(cards[0].getAttribute('data-chapter')).toBe('dusk');
  });
});

// ────────────────────────────────────────────────────────────────────
//  The opening the engine runs (ADR-404), as the browser shows it
// ────────────────────────────────────────────────────────────────────

/** One record as the play feed posts it. */
interface PostedRecord {
  turn: number;
  restart?: boolean;
  opening?: boolean;
  command?: string;
  output?: string;
  captures?: { channel: string; values: object[] }[];
  events?: string[];
}

/** A mounted page and what a test reads of it. */
interface Page {
  client: BrowserClient;
  elements: DOMElements;
  /** Every record the play feed posted, in order, fences included. */
  posted: PostedRecord[];
  /** The `turn` channel's value in each packet that carried it, in order. */
  turnValues: number[];
}

/**
 * Load a page the way the shipped entry does: one client for the page's
 * life, and a boot that builds a fresh story, world and engine, connects
 * them and starts the client. The client's `reboot` is that same boot, so a
 * RESTART goes through the real path.
 *
 * @param source the story's Chord text
 * @param storagePrefix the page's storage prefix
 * @param autoSave whether the client autosaves and restores
 * @returns the page
 * @throws Error when the source fails the Chord load-time gate
 */
async function loadPage(source: string, storagePrefix: string, autoSave = false): Promise<Page> {
  document.body.innerHTML = '';
  const posted: PostedRecord[] = [];
  const turnValues: number[] = [];
  // The bridge the IDE's Testing surface installs: same shape, same name.
  (window as { webkit?: object }).webkit = {
    messageHandlers: {
      turnEvents: { postMessage: (body: string) => posted.push(JSON.parse(body) as PostedRecord) },
    },
  };

  const elements = mountHostElements();
  let client: BrowserClient | undefined;

  const start = async (): Promise<void> => {
    const compiled = compile(source);
    if (!compiled.ok) {
      const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
      throw new Error(
        `the story failed the Chord load-time gate:\n`
        + errors.map((d) => `  ${d.span.line}:${d.span.column} [${d.code}] ${d.message}`).join('\n'),
      );
    }
    const story = createStory(compiled.ir) as unknown as Story;
    if (!client) {
      client = new BrowserClient({
        storagePrefix,
        autoSave,
        defaultTheme: 'modern-dark',
        themes: [{ id: 'modern-dark', name: 'Modern Dark' }],
        storyInfo: {
          title: story.config.title,
          description: story.config.description || '',
          authors: story.config.authors.join(', '),
          version: '1.0.0',
        },
        reboot: () => start(),
      });
      client.initialize(elements);
    }

    const world = new WorldModel();
    const language = new LanguageProvider();
    const parser = new Parser(language);
    if (story.extendParser) story.extendParser(parser);
    if (story.extendLanguage) story.extendLanguage(language);
    const engine = new GameEngine({ world, parser, language, perceptionService: new PerceptionService() });
    engine.on('channel:packet', (packet: { payload: Record<string, unknown> }) => {
      const value = packet.payload.turn;
      if (typeof value === 'number') turnValues.push(value);
    });

    client.connectEngine(engine, world);
    engine.installStory(story);
    engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());
    await client.start();
  };

  await start();
  return { client: client!, elements, posted, turnValues };
}

/** The prologue as the log holds it: its paragraphs' text, joined. */
function prologueInLog(elements: DOMElements): string {
  return Array.from(elements.textContent.querySelectorAll('p.sharpee-prologue'))
    .map((el) => el.textContent ?? '')
    .join('\n');
}

/** The log's elements, each named by what it is, in document order. */
function logKinds(elements: DOMElements): string[] {
  return Array.from(elements.textContent.children).map((el) => {
    if (el.classList.contains('sharpee-prologue')) return 'prologue';
    if (el.classList.contains('sharpee-chapter')) return 'chapter';
    if (el.className.includes('sharpee-banner')) return 'banner';
    if (el.classList.contains('prose-room-name')) return 'room-name';
    if (el.classList.contains('prose-room-description')) return 'room-description';
    if (el.classList.contains('command-echo')) return 'echo';
    return 'other';
  });
}

const PROLOGUE = 'The last ferry left an hour ago';
const BANNER_VERSION = 'Story v0.0.1';
const ROOM = 'You have not stood here since you were a child';

describe.skipIf(!testStories)('the opening the engine runs, in the browser (ADR-404)', () => {
  const quay = (): string => readFileSync(join(testStories!, 'quay', 'quay.story'), 'utf-8');
  const seeded = (copy: string): string =>
    readFileSync(join(testStories!, 'quay', 'seeded', copy), 'utf-8');
  const prefix = (name: string): string => `opening-${name}-${process.pid}-`;

  // The browser's storage, which outlives a page: the test environment has
  // none that works, so this is the one stand-in here. It is the browser's,
  // not a dependency this repository owns.
  const storageBacking = new Map<string, string>();
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as { webkit?: object }).webkit;
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
    delete (window as { webkit?: object }).webkit;
  });

  it('the feed\'s first record is the opening: no command, no echo, and its ordinal on what it printed', async () => {
    const page = await loadPage(quay(), prefix('feed'));

    expect(page.posted).toHaveLength(1);
    const opening = page.posted[0];
    expect(opening.opening).toBe(true);
    expect('command' in opening).toBe(false);
    expect(opening.output).toContain(ROOM);
    expect(opening.captures?.map((c) => c.channel)).toEqual(
      expect.arrayContaining(['prologue', 'banner', 'room-description']),
    );
    expect(opening.events).toContain('if.event.room.description');
    // Nothing was typed, so nothing is echoed.
    expect(logKinds(page.elements)).not.toContain('echo');
    // The banner and the room carry the record's ordinal.
    const stamped = Array.from(page.elements.textContent.children)
      .filter((el) => el.getAttribute('data-turn') === String(opening.turn));
    expect(stamped.some((el) => el.className.includes('sharpee-banner'))).toBe(true);
    expect(stamped.some((el) => el.classList.contains('prose-room-description'))).toBe(true);

    await page.client.executeCommand('take key');

    expect(page.posted).toHaveLength(2);
    expect(page.posted[1].command).toBe('take key');
    expect(page.posted[1].opening).toBeUndefined();
    expect(page.posted[1].turn).toBe(opening.turn + 1);
  });

  it('the status line shows no turn count before the first command and 1 after it (AC-9)', async () => {
    const page = await loadPage(quay(), prefix('status'));

    // The channel says 0 through the opening, and the page shows no count.
    expect(page.turnValues.length).toBeGreaterThan(0);
    expect(new Set(page.turnValues)).toEqual(new Set([0]));
    expect(page.elements.statusScore.textContent).toBe('Score: 0');
    expect(page.client.getCurrentTurn()).toBe(0);

    await page.client.executeCommand('take key');

    expect(page.turnValues.at(-1)).toBe(1);
    expect(page.elements.statusScore.textContent).toBe('Score: 0 | Turns: 1');

    await page.client.executeCommand('wait');

    expect(page.turnValues.at(-1)).toBe(2);
    expect(page.elements.statusScore.textContent).toBe('Score: 0 | Turns: 2');
  });

  it('a reordered block prints the room before the banner, with the card just ahead of the room (AC-4, AC-6)', async () => {
    const page = await loadPage(seeded('quay-reordered.story'), prefix('reordered'));

    const kinds = logKinds(page.elements).filter((k) => k !== 'other');
    expect(kinds.filter((k) => k === 'chapter')).toHaveLength(1);
    expect(kinds.indexOf('room-name')).toBe(kinds.indexOf('chapter') + 1);
    expect(kinds.indexOf('banner')).toBeGreaterThan(kinds.indexOf('room-description'));
    // The block names the prologue first, and it is the log's first entry.
    expect(kinds[0]).toBe('prologue');
    expect(prologueInLog(page.elements)).toContain(PROLOGUE);

    await page.client.executeCommand('take key');

    expect(document.querySelectorAll('.sharpee-chapter')).toHaveLength(1);
  });

  it('a block that puts the prologue last prints it last, after the banner and the room, and never again', async () => {
    // The reordered copy with its block's three lines turned round: the
    // only difference from it is where `show-prologue` stands.
    const reordered = seeded('quay-reordered.story');
    const block = '  show-prologue\n  do-first-look\n  show-banner\n';
    // PRECONDITION: the copy holds the block this test turns round.
    expect(reordered).toContain(block);
    const source = reordered.replace(block, '  show-banner\n  do-first-look\n  show-prologue\n');

    const page = await loadPage(source, prefix('prologue-last'));

    const kinds = logKinds(page.elements).filter((k) => k !== 'other');
    expect(kinds.at(-1)).toBe('prologue');
    expect(kinds.indexOf('banner')).toBeLessThan(kinds.indexOf('room-name'));
    expect(kinds.indexOf('room-description')).toBeLessThan(kinds.indexOf('prologue'));
    expect(prologueInLog(page.elements).split(PROLOGUE).length - 1).toBe(1);
    // The prologue is the opening's, stamped with the opening's ordinal.
    const prologue = page.elements.textContent.querySelector('p.sharpee-prologue');
    expect(prologue?.getAttribute('data-turn')).toBe(String(page.posted[0].turn));

    await page.client.executeCommand('take key');
    await page.client.executeCommand('wait');

    // Every later packet carries the prologue's value; none prints it again.
    expect(prologueInLog(page.elements).split(PROLOGUE).length - 1).toBe(1);
  });

  it('a RESTART prints the new game\'s prologue again, as part of its opening', async () => {
    vi.stubGlobal('confirm', () => true);
    const page = await loadPage(quay(), prefix('restart-prologue'));
    await page.client.executeCommand('take key');

    await page.client.executeCommand('restart');

    const reopened = page.posted.at(-1)!;
    // PRECONDITION: the last record is the new game's opening.
    expect(reopened.opening).toBe(true);
    const stamped = Array.from(page.elements.textContent.children)
      .filter((el) => el.getAttribute('data-turn') === String(reopened.turn));
    expect(stamped[0]?.classList.contains('sharpee-prologue')).toBe(true);
    expect(stamped[0]?.textContent).toContain(PROLOGUE);
  });

  it('a block with no first look prints no room and no card, and the first command\'s reply opens with the card (AC-4, AC-6)', async () => {
    const page = await loadPage(seeded('quay-no-look.story'), prefix('no-look'));

    const log = page.elements.textContent.textContent ?? '';
    expect(log).toContain(BANNER_VERSION);
    expect(log).not.toContain(ROOM);
    expect(prologueInLog(page.elements)).toContain(PROLOGUE);
    expect(document.querySelectorAll('.sharpee-chapter')).toHaveLength(0);
    expect(page.posted[0].opening).toBe(true);

    await page.client.executeCommand('wait');

    const kinds = logKinds(page.elements);
    expect(kinds.filter((k) => k === 'chapter')).toHaveLength(1);
    expect(kinds.indexOf('chapter')).toBe(kinds.indexOf('echo') + 1);
    expect(page.elements.statusScore.textContent).toBe('Score: 0 | Turns: 1');
  });

  it('a block with no banner never prints the title block', async () => {
    const page = await loadPage(seeded('quay-no-banner.story'), prefix('no-banner'));

    expect(page.elements.textContent.textContent).toContain(ROOM);
    expect(document.querySelectorAll('[class*="sharpee-banner"]')).toHaveLength(0);

    await page.client.executeCommand('wait');

    expect(document.querySelectorAll('[class*="sharpee-banner"]')).toHaveLength(0);
  });

  it('a block with no prologue never prints it', async () => {
    const page = await loadPage(seeded('quay-no-prologue.story'), prefix('no-prologue'));

    expect(page.elements.textContent.textContent).toContain(BANNER_VERSION);
    expect(document.body.textContent).not.toContain(PROLOGUE);

    await page.client.executeCommand('wait');

    expect(document.body.textContent).not.toContain(PROLOGUE);
  });

  it('an empty block prints nothing, and its record is still the opening', async () => {
    const page = await loadPage(seeded('quay-empty.story'), prefix('empty'));

    expect(page.elements.textContent.children).toHaveLength(0);
    expect(document.body.textContent).not.toContain(PROLOGUE);
    expect(page.posted).toHaveLength(1);
    expect(page.posted[0].opening).toBe(true);
    expect(page.posted[0].output).toBe('');
    // No packet carried a count, so the page shows none.
    expect(page.turnValues).toEqual([]);
  });

  it('a RESTART opens the new game: a fence, then the opening again, and the count is blank again (AC-8)', async () => {
    vi.stubGlobal('confirm', () => true);
    const page = await loadPage(quay(), prefix('restart'));
    await page.client.executeCommand('take key');
    // PRECONDITION: one command has cost a turn.
    expect(page.elements.statusScore.textContent).toBe('Score: 0 | Turns: 1');

    await page.client.executeCommand('restart');

    expect(page.posted.map((r) => (r.restart ? 'fence' : r.opening ? 'opening' : r.command))).toEqual([
      'opening',
      'take key',
      'restart',
      'fence',
      'opening',
    ]);
    const reopened = page.posted[4];
    expect(reopened.output).toContain(ROOM);
    expect(reopened.turn).toBe(page.posted[3].turn);
    // The new opening printed its banner and its room, stamped as its own.
    const stamped = Array.from(page.elements.textContent.children)
      .filter((el) => el.getAttribute('data-turn') === String(reopened.turn));
    expect(stamped.some((el) => el.className.includes('sharpee-banner'))).toBe(true);
    expect(stamped.some((el) => el.classList.contains('prose-room-description'))).toBe(true);
    expect(stamped.some((el) => el.classList.contains('command-echo'))).toBe(false);
    // The new game has cost no turn.
    expect(page.elements.statusScore.textContent).toBe('Score: 0');

    await page.client.executeCommand('take key');

    expect(page.elements.statusScore.textContent).toBe('Score: 0 | Turns: 1');
  });

  it('a restore that fails opens a new game (AC-8)', async () => {
    const storagePrefix = prefix('failed-restore');
    const before = await loadPage(quay(), storagePrefix, true);
    await before.client.executeCommand('take key');
    // Spoil the autosave the page just wrote: the envelope is found, and the
    // engine cannot load what it holds.
    const saveManager = (before.client as unknown as {
      saveManager: {
        loadAutosaveEnvelope(): { engineSave: object } | null;
        performAutoSave(engineSave: object, context: object): void;
      };
    }).saveManager;
    // PRECONDITION: there is an autosave to find.
    expect(saveManager.loadAutosaveEnvelope()).not.toBeNull();
    saveManager.performAutoSave(
      { version: '1', timestamp: Date.now(), metadata: { description: 'spoiled', turnCount: 1 }, engineState: {} },
      { turnCount: 1, score: 0, transcriptHtml: '' },
    );
    // PRECONDITION: the spoiled envelope is still one the next page finds,
    // so what follows is a restore that failed and not a page with no save.
    expect(saveManager.loadAutosaveEnvelope()?.engineSave).toMatchObject({
      version: '1',
      metadata: { description: 'spoiled' },
    });

    const after = await loadPage(quay(), storagePrefix, true);

    const log = after.elements.textContent.textContent ?? '';
    expect(log).not.toContain('[Session restored]');
    expect(log).toContain(ROOM);
    expect(after.posted).toHaveLength(1);
    expect(after.posted[0].opening).toBe(true);
    expect(after.elements.statusScore.textContent).toBe('Score: 0');
  });

  it('a restored session posts no opening record and prints no opening (AC-8)', async () => {
    const storagePrefix = prefix('restored');
    const before = await loadPage(quay(), storagePrefix, true);
    await before.client.executeCommand('take key');

    const after = await loadPage(quay(), storagePrefix, true);

    const log = after.elements.textContent.textContent ?? '';
    expect(log.trimEnd().endsWith('[Session restored]')).toBe(true);
    expect(log.split(ROOM).length - 1).toBe(1);
    expect(after.posted).toEqual([]);
    expect(after.elements.statusScore.textContent).toBe('Score: 0 | Turns: 1');
    // The prologue comes back with the save: nothing writes it again.
    expect(prologueInLog(after.elements).split(PROLOGUE).length - 1).toBe(1);

    await after.client.executeCommand('wait');

    // The first command on the restored engine carries the prologue's value
    // again, and the log neither drops the prologue nor prints it twice.
    expect(prologueInLog(after.elements).split(PROLOGUE).length - 1).toBe(1);
    expect(logKinds(after.elements).at(-1)).not.toBe('prologue');

    expect(after.posted).toHaveLength(1);
    expect(after.posted[0].command).toBe('wait');
    expect(after.posted[0].opening).toBeUndefined();
    expect(after.elements.statusScore.textContent).toBe('Score: 0 | Turns: 2');
  });
});
