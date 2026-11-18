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
 * comparing against it. It is run once, on the platform as it stood before
 * the change, and never again without a ruling.
 *
 * Public interface: none (a test file).
 * Owner context: platform-browser tests (rule 13a real-path gate for the
 * opening; `test-stories/quay/quay.test-set.md` OB-46 and OB-49).
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, it, expect, beforeEach } from 'vitest';

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
 * The opening as the recording keeps it: the prologue's own element, which
 * the client places ahead of the main log, and then the main log's children.
 */
function recordLog(): string {
  const main = mainLog();
  const prologue = document.getElementById('sharpee-prologue');
  expect(prologue, 'the prologue element exists').not.toBeNull();
  expect(
    (prologue!.compareDocumentPosition(main) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
    'the prologue element precedes the main log',
  ).toBe(true);
  return [prologue!, ...Array.from(main.children)].flatMap((el) => recordElement(el, 0)).join('\n') + '\n';
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
