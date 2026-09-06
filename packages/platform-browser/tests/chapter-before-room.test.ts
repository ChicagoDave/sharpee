/**
 * chapter-before-room.test.ts — the chapter title is announced before the
 * room (ADR-330 D4 as amended 2026-09-05), on the REAL browser path: a Chord
 * fixture with `use chapters` compiled and loaded the way the shipped entry
 * loads it, driven through a real `BrowserClient` over a real `GameEngine`,
 * observed in the DOM the client renders into. No fixture manifest and no
 * hand-built registry: the order under test is the one the engine's own
 * manifest carries and the client's own renderer dispatches in.
 *
 * Owner context: platform-browser tests (rule 13a real-path gate for the
 * chapter card's position).
 */
import { describe, it, expect, beforeEach } from 'vitest';

import { GameEngine, type Story } from '@sharpee/engine';
import { WorldModel, EntityType } from '@sharpee/world-model';
import { Parser } from '@sharpee/parser-en-us';
import { LanguageProvider } from '@sharpee/lang-en-us';
import { PerceptionService } from '@sharpee/stdlib';
import { compile } from '@sharpee/chord';
import { createStory } from '@sharpee/story-loader';

import { BrowserClient } from '../src/BrowserClient';
import type { DOMElements } from '../src/types';

const SOURCE = `story
  title: Chapters
  authors:
    T
  id: chapters-before-room
  story-version: 0.0.1
  use chapters

define chapters
  market - Chapter I: The Market
    A stolen apple, and a girl the whole city is about to start looking for.
    begins when the game starts
  street - Chapter II: The Street
    begins when the player visits the Street for the first time
end chapters

create the Market
  a room
  east to the Street

  A market.

create the Street
  a room
  west to the Market

  A street.

create Alex
  a person
  playable
  starts in the Market

  You.

before the game starts
  change the player to Alex
end before
`;

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

/** Boot the fixture through a real client and engine; returns the client. */
async function bootClient(): Promise<BrowserClient> {
  const compiled = compile(SOURCE);
  if (!compiled.ok) {
    const errors = compiled.diagnostics.filter((d) => d.severity === 'error');
    throw new Error(
      `fixture failed the Chord load-time gate:\n`
      + errors.map((d) => `  ${d.span.line}:${d.span.column} [${d.code}] ${d.message}`).join('\n'),
    );
  }
  const story = createStory(compiled.ir) as unknown as Story;

  const client = new BrowserClient({
    storagePrefix: `chapter-before-room-${process.pid}-`,
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
  const player = world.createEntity('player', EntityType.ACTOR);
  world.setPlayer(player.id);
  const language = new LanguageProvider();
  const parser = new Parser(language);
  if (story.extendParser) story.extendParser(parser);
  if (story.extendLanguage) story.extendLanguage(language);
  const engine = new GameEngine({ world, player, parser, language, perceptionService: new PerceptionService() });

  client.connectEngine(engine, world);
  engine.setStory(story);
  engine.registerSaveRestoreHooks(client.getSaveRestoreHooks());
  await client.start();
  return client;
}

/** Document order: does `a` come before `b`? */
function precedes(a: Element, b: Element): boolean {
  return (a.compareDocumentPosition(b) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
}

/**
 * The main log's children, in order, filtered to the elements this test
 * reads. The log is whatever element the chapter card, the banner, and the
 * prose share as a parent — the client's own `layout.main`.
 */
function logEntries(): Array<{ kind: 'banner' | 'chapter' | 'room-name' | 'room-description' | 'other'; text: string }> {
  const card = document.querySelector('.sharpee-chapter');
  expect(card).not.toBeNull();
  const main = card!.parentElement!;
  expect(main.querySelector('.prose-room-description'), 'the prose shares the card\'s log').not.toBeNull();
  expect(main.querySelector('.sharpee-banner-title'), 'the banner shares the card\'s log').not.toBeNull();
  return Array.from(main.children).map((el) => {
    const cls = el.className;
    const kind = el.classList.contains('sharpee-chapter')
      ? 'chapter'
      : cls.includes('sharpee-banner')
        ? 'banner'
        : el.classList.contains('prose-room-name')
          ? 'room-name'
          : el.classList.contains('prose-room-description')
            ? 'room-description'
            : 'other';
    return { kind, text: (el.textContent ?? '').trim() };
  });
}

describe('the chapter title is announced before the room (ADR-330 D4, amended 2026-09-05)', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
    delete (window as any).webkit;
  });

  it('turn 1: the opening chapter card follows the banner and precedes the opening room description', async () => {
    await bootClient();

    const card = document.querySelector('.sharpee-chapter');
    expect(card, 'the opening chapter card rendered').not.toBeNull();
    expect(card!.getAttribute('data-chapter')).toBe('market');
    expect(card!.querySelector('.sharpee-chapter-title')?.textContent).toBe('Chapter I: The Market');
    expect(card!.querySelector('.sharpee-chapter-description')?.textContent).toBe(
      'A stolen apple, and a girl the whole city is about to start looking for.',
    );

    const roomName = document.querySelector('.prose-room-name');
    const roomDescription = document.querySelector('.prose-room-description');
    expect(roomName, 'the opening room name rendered').not.toBeNull();
    expect(roomDescription, 'the opening room description rendered').not.toBeNull();
    expect(roomDescription!.textContent).toContain('A market.');

    expect(precedes(card!, roomName!), 'chapter card before the room name').toBe(true);
    expect(precedes(card!, roomDescription!), 'chapter card before the room description').toBe(true);

    const bannerTitle = document.querySelector('.sharpee-banner-title');
    expect(bannerTitle, 'the banner rendered').not.toBeNull();
    expect(precedes(bannerTitle!, card!), 'banner before the chapter card').toBe(true);

    // The whole log, in order: banner lines, then the card, then the room.
    const kinds = logEntries().map((e) => e.kind).filter((k) => k !== 'other');
    expect(kinds.indexOf('chapter')).toBe(kinds.lastIndexOf('banner') + 1);
    expect(kinds.indexOf('room-name')).toBe(kinds.indexOf('chapter') + 1);
  });

  it('a first-visit arrival: the new chapter card precedes that turn\'s room description, after the previous turn\'s prose', async () => {
    const client = await bootClient();
    const openingDescription = document.querySelector('.prose-room-description')!;

    await client.executeCommand('east');

    const cards = document.querySelectorAll('.sharpee-chapter');
    expect(cards).toHaveLength(2);
    const streetCard = cards[1];
    expect(streetCard.getAttribute('data-chapter')).toBe('street');
    expect(streetCard.querySelector('.sharpee-chapter-title')?.textContent).toBe('Chapter II: The Street');

    const descriptions = document.querySelectorAll('.prose-room-description');
    expect(descriptions).toHaveLength(2);
    const streetDescription = descriptions[1];
    expect(streetDescription.textContent).toContain('A street.');
    const streetName = document.querySelectorAll('.prose-room-name')[1];

    expect(precedes(openingDescription, streetCard), 'the market prose stays above the street card').toBe(true);
    expect(precedes(streetCard, streetName), 'street card before the street name').toBe(true);
    expect(precedes(streetCard, streetDescription), 'street card before the street description').toBe(true);

    // The turn's own echo (`> east`) stays above the card: the card opens the
    // turn's OUTPUT, not the turn.
    const echo = Array.from(streetCard.parentElement!.children).find((el) =>
      (el.textContent ?? '').trim() === '> east' || el.classList.contains('command-echo'),
    );
    if (echo) expect(precedes(echo, streetCard), 'command echo before the street card').toBe(true);
  });
});
