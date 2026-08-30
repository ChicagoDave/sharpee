import { describe, it, expect, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import type { ChannelDefinition } from '@sharpee/if-domain';
import { createPromptChannelRenderer } from '../../src/channels/prompt';
import {
  createLocationChannelRenderer,
  createScoreChannelRenderer,
  createTurnChannelRenderer,
} from '../../src/channels/status';
import {
  createInfoChannelRenderer,
  createIfidChannelRenderer,
  createPrologueChannelRenderer,
  createBannerChannelRenderer,
  createChapterChannelRenderer,
} from '../../src/channels/info';

const replaceJson: ChannelDefinition = { id: 'x', contentType: 'json', mode: 'replace' };
const replaceText: ChannelDefinition = { id: 'x', contentType: 'text', mode: 'replace' };
const replaceNum: ChannelDefinition = { id: 'x', contentType: 'number', mode: 'replace' };

describe('promptChannelRenderer', () => {
  let input: HTMLInputElement;
  let label: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    input = document.createElement('input');
    label = document.createElement('span');
    document.body.append(input, label);
  });

  it('updates input.placeholder', () => {
    const r = createPromptChannelRenderer(input);
    r.onValue('> ', replaceText);
    expect(input.placeholder).toBe('> ');
  });

  it('updates the optional sibling label', () => {
    const r = createPromptChannelRenderer(input, { promptLabel: label });
    r.onValue('? ', replaceText);
    expect(label.textContent).toBe('? ');
    expect(input.placeholder).toBe('? ');
  });

  it('ignores non-string values', () => {
    const r = createPromptChannelRenderer(input);
    r.onValue({} as unknown, replaceText);
    expect(input.placeholder).toBe('');
  });
});

describe('status renderers', () => {
  let location: HTMLElement;
  let score: HTMLElement;
  let turn: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    location = document.createElement('span');
    score = document.createElement('span');
    turn = document.createElement('span');
    document.body.append(location, score, turn);
  });

  it('location writes the room name', () => {
    const r = createLocationChannelRenderer(location);
    r.onValue('Cave Entrance', replaceText);
    expect(location.textContent).toBe('Cave Entrance');
  });

  it('score formats current/max', () => {
    const r = createScoreChannelRenderer(score);
    r.onValue({ current: 42, max: 100 }, replaceJson);
    expect(score.textContent).toBe('Score: 42 / 100');
  });

  it('score formats current alone when max is null', () => {
    const r = createScoreChannelRenderer(score);
    r.onValue({ current: 5, max: null }, replaceJson);
    expect(score.textContent).toBe('Score: 5');
  });

  it('turn writes Turns: N', () => {
    const r = createTurnChannelRenderer(turn);
    r.onValue(7, replaceNum);
    expect(turn.textContent).toBe('Turns: 7');
  });

  it('non-matching values are ignored defensively', () => {
    const r = createScoreChannelRenderer(score);
    r.onValue('not an object', replaceJson);
    expect(score.textContent).toBe('');
  });
});

describe('info / ifid renderers', () => {
  let meta: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '';
    meta = document.createElement('div');
    document.body.appendChild(meta);
  });

  it('info sets document.title and data attributes', () => {
    const r = createInfoChannelRenderer(meta);
    r.onValue(
      { title: 'Cloak', authors: ['RP', 'ST'], testers: ['JM'], version: '1.0' },
      replaceJson,
    );
    expect(document.title).toBe('Cloak');
    expect(meta.getAttribute('data-title')).toBe('Cloak');
    expect(meta.getAttribute('data-authors')).toBe('RP, ST');
    expect(meta.getAttribute('data-testers')).toBe('JM');
    expect(meta.getAttribute('data-version')).toBe('1.0');
  });

  it('ifid writes data-ifid', () => {
    const r = createIfidChannelRenderer(meta);
    r.onValue('ABCD-1234', replaceText);
    expect(meta.getAttribute('data-ifid')).toBe('ABCD-1234');
  });

  it('prologue renders one sharpee-prologue paragraph per blank-line chunk', () => {
    const r = createPrologueChannelRenderer(meta);
    r.onValue('Long ago.\n\nFar away.', replaceText);
    const paras = meta.querySelectorAll('p.sharpee-prologue');
    expect(paras.length).toBe(2);
    expect(paras[0].textContent).toBe('Long ago.');
    expect(paras[1].textContent).toBe('Far away.');
  });

  it('prologue ignores empty and non-string values', () => {
    const r = createPrologueChannelRenderer(meta);
    r.onValue('', replaceText);
    r.onValue(undefined, replaceText);
    expect(meta.querySelectorAll('p').length).toBe(0);
  });

  // The bug this pins: ADR-300 D6/D12 moved the banner onto its own channel and
  // this renderer began emitting `sharpee-banner-*` class names, while base.css
  // still styled the prose path's `game-title`/`story-version`/… names. Nothing
  // matched, so the title lost its bold and every piece fell back to the
  // `.sharpee-prose-pane p` margin — a banner spread out instead of stacked.
  // A renderer that emits a class no stylesheet knows about is the defect,
  // whichever half moves next.
  it('every banner class it emits has a rule in base.css', () => {
    const r = createBannerChannelRenderer(meta);
    r.onValue(
      {
        title: 'Aliens in Amberville',
        storyVersion: 'Story v0.1.0',
        platformVersion: 'Sharpee v5.0.1',
        subtitle: 'A story of mis-matched perspectives...',
        credits: ['By David Cornelson'],
        tail: ['Type HELP for instructions.'],
      },
      replaceJson,
    );

    const emitted = [...meta.querySelectorAll('p')].map((p) => p.className);
    expect(emitted.length).toBe(6);

    const base = readFileSync(resolve(__dirname, '../../styles/base.css'), 'utf8');
    for (const className of emitted) {
      expect(base, `base.css has no rule for p.${className}`).toContain(`p.${className}`);
    }
    expect(base).toMatch(/p\.sharpee-banner-title\s*\{[^}]*font-weight:\s*bold/);
  });

  // GH #264: the flush rule that stacks the banner pieces also welded the
  // first room description to whichever piece ended the banner. The gap has
  // to key on the first NON-banner paragraph after any banner piece —
  // `:last-of-type` cannot, because which piece ends the banner varies with
  // what the story declares (tail / credit / subtitle).
  it('base.css separates the banner from the first non-banner paragraph', () => {
    const base = readFileSync(resolve(__dirname, '../../styles/base.css'), 'utf8');
    const rule = /p\[class\*=['"]sharpee-banner-['"]\]\s*\+\s*p:not\(\[class\*=['"]sharpee-banner-['"]\]\)\s*\{[^}]*margin-top:\s*1em/;
    expect(base, 'no sibling rule gives the post-banner paragraph its gap').toMatch(rule);
  });
});

describe('chapter renderer (ADR-330 D4)', () => {
  let main: HTMLElement;
  beforeEach(() => {
    document.body.innerHTML = '';
    main = document.createElement('div');
    document.body.appendChild(main);
  });

  it('renders a title card — title then description — as a block with the name and ordinal as data', () => {
    const r = createChapterChannelRenderer(main);
    r.onValue({ name: 'market', title: 'Chapter I: Grubber\'s Market', description: 'A stolen apple.', ordinal: 0 }, replaceJson);
    const card = main.querySelector('.sharpee-chapter')!;
    expect(card).toBeTruthy();
    expect(card.getAttribute('data-chapter')).toBe('market');
    expect(card.getAttribute('data-chapter-ordinal')).toBe('0');
    const ps = [...card.querySelectorAll('p')].map((p) => [p.className, p.textContent]);
    expect(ps).toEqual([
      ['sharpee-chapter-title', 'Chapter I: Grubber\'s Market'],
      ['sharpee-chapter-description', 'A stolen apple.'],
    ]);
  });

  it('an empty description is not rendered; a packet with no text renders no card', () => {
    const r = createChapterChannelRenderer(main);
    r.onValue({ name: 'commerce', title: 'Chapter II', description: '', ordinal: 1 }, replaceJson);
    expect(main.querySelectorAll('p').length).toBe(1);
    expect(main.querySelector('.sharpee-chapter-description')).toBeNull();
    r.onValue({ name: 'x', title: '', description: '', ordinal: 2 }, replaceJson);
    expect(main.querySelectorAll('.sharpee-chapter').length).toBe(1);
    r.onValue('not an object', replaceJson);
    expect(main.querySelectorAll('.sharpee-chapter').length).toBe(1);
  });

  it('every chapter class it emits has a rule in base.css', () => {
    const r = createChapterChannelRenderer(main);
    r.onValue({ name: 'market', title: 'T', description: 'D', ordinal: 0 }, replaceJson);
    const base = readFileSync(resolve(__dirname, '../../styles/base.css'), 'utf8');
    expect(base).toContain('.sharpee-chapter');
    for (const p of main.querySelectorAll('p')) {
      expect(base, `base.css has no rule for p.${p.className}`).toContain(`p.${p.className}`);
    }
    expect(base).toMatch(/p\.sharpee-chapter-title\s*\{[^}]*font-weight:\s*bold/);
  });
});
