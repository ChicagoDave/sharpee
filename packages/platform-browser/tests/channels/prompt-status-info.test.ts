import { describe, it, expect, beforeEach } from 'vitest';
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
    r.onValue({ title: 'Cloak', author: 'RP', version: '1.0' }, replaceJson);
    expect(document.title).toBe('Cloak');
    expect(meta.getAttribute('data-title')).toBe('Cloak');
    expect(meta.getAttribute('data-author')).toBe('RP');
    expect(meta.getAttribute('data-version')).toBe('1.0');
  });

  it('ifid writes data-ifid', () => {
    const r = createIfidChannelRenderer(meta);
    r.onValue('ABCD-1234', replaceText);
    expect(meta.getAttribute('data-ifid')).toBe('ABCD-1234');
  });
});
