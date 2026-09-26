/**
 * pin-grammar.test.ts — `parsePin`, the one parser of the pin grammar
 * (ADR-356 D2): one case per form it recognizes — five floor forms, four
 * named non-floor shapes, and the unrecognized fall-through — each asserting
 * the structured result, plus the properties the two consumers rely on: the
 * same text parses the same way twice, a hyphenated IR id is a valid head,
 * and a negated form is recognized as the form it negates.
 *
 * Owner context: story-loader test suite.
 */
import { describe, expect, it } from 'vitest';
import { parsePin } from '../src/pin-grammar';

describe('parsePin — the five floor forms', () => {
  it('story.state = <phase>, and its negation', () => {
    expect(parsePin('story.state = hunted')).toEqual({ kind: 'story-state', operator: '=', state: 'hunted' });
    expect(parsePin('story.state != calm')).toEqual({ kind: 'story-state', operator: '!=', state: 'calm' });
  });

  it('<entity>.location = <place>, a place name with spaces kept whole', () => {
    expect(parsePin('player.location = Greenhouse')).toEqual({
      kind: 'location',
      entity: 'player',
      operator: '=',
      place: 'Greenhouse',
    });
    expect(parsePin('cat.location != the back garden')).toEqual({
      kind: 'location',
      entity: 'cat',
      operator: '!=',
      place: 'the back garden',
    });
  });

  it('<entity>.inventory contains <item>, and not-contains', () => {
    expect(parsePin('player.inventory contains garden shears')).toEqual({
      kind: 'contains',
      entity: 'player',
      collection: 'inventory',
      operator: 'contains',
      item: 'garden shears',
    });
    expect(parsePin('chest.contents not-contains key')).toEqual({
      kind: 'contains',
      entity: 'chest',
      collection: 'contents',
      operator: 'not-contains',
      item: 'key',
    });
  });

  it('[the] <name> is <state>, the article optional, the name allowed spaces', () => {
    expect(parsePin('the vine is flowering')).toEqual({ kind: 'declared-state', name: 'vine', negated: false, state: 'flowering' });
    expect(parsePin('vine is flowering')).toEqual({ kind: 'declared-state', name: 'vine', negated: false, state: 'flowering' });
    expect(parsePin('the first partner is not dancing')).toEqual({
      kind: 'declared-state',
      name: 'first partner',
      negated: true,
      state: 'dancing',
    });
    expect(parsePin('the story is alarmed')).toEqual({ kind: 'declared-state', name: 'story', negated: false, state: 'alarmed' });
  });

  it('<entity>.<property> = <value> — the trait flags ride the property form', () => {
    expect(parsePin('chest.isOpen = true')).toEqual({ kind: 'property', entity: 'chest', property: 'isOpen', operator: '=', value: 'true' });
    expect(parsePin('lantern.isOn != false')).toEqual({ kind: 'property', entity: 'lantern', property: 'isOn', operator: '!=', value: 'false' });
  });
});

describe('parsePin — the four shapes named and not written', () => {
  it('occurrence', () => {
    expect(parsePin('vine.pruning occurrence = 2')).toEqual({ kind: 'occurrence', key: 'vine.pruning', count: 2 });
  });

  it('topic-history', () => {
    expect(parsePin('the weather asked once')).toEqual({ kind: 'topic-history', topic: 'the weather', history: 'once' });
    expect(parsePin('the weather asked many times')).toEqual({ kind: 'topic-history', topic: 'the weather', history: 'many-times' });
    expect(parsePin('the letter was discussed')).toEqual({ kind: 'topic-history', topic: 'the letter', history: 'discussed' });
  });

  it('timer-phase', () => {
    expect(parsePin('player.bell has expired')).toEqual({ kind: 'timer-phase', timer: 'player.bell', what: 'expired' });
    expect(parsePin('flicker has started')).toEqual({ kind: 'timer-phase', timer: 'flicker', what: 'started' });
  });

  it('timer-position', () => {
    expect(parsePin('player.bell at dusk')).toEqual({ kind: 'timer-position', timer: 'player.bell', turn: 'dusk' });
  });
});

describe('parsePin — what no form matches', () => {
  it('is unrecognized, not an error', () => {
    expect(parsePin('')).toEqual({ kind: 'unrecognized' });
    expect(parsePin('prune the vine')).toEqual({ kind: 'unrecognized' });
    expect(parsePin('first partner.location = anywhere')).toEqual({ kind: 'unrecognized' });
  });

  it('does not read a phrase with "at" in it as a timer', () => {
    expect(parsePin('the cat at the door is asleep')).toEqual({
      kind: 'declared-state',
      name: 'cat at the door',
      negated: false,
      state: 'asleep',
    });
  });
});

describe('parsePin — properties the consumers rely on', () => {
  it('is deterministic: the same text yields the same structure twice', () => {
    const texts = ['story.state = calm', 'player.location = Hall', 'the vine is flowering', 'x.y contains z', 'a.b = c'];
    for (const text of texts) {
      expect(JSON.stringify(parsePin(text))).toBe(JSON.stringify(parsePin(text)));
    }
  });

  it('accepts a compiled IR id as the head of a dotted form', () => {
    expect(parsePin('garden-shears.location = Shed')).toEqual({
      kind: 'location',
      entity: 'garden-shears',
      operator: '=',
      place: 'Shed',
    });
    expect(parsePin('brass-lamp.isOn = true')).toEqual({
      kind: 'property',
      entity: 'brass-lamp',
      property: 'isOn',
      operator: '=',
      value: 'true',
    });
  });

  it('keeps story.state as the story head and story.<other> as an entity head', () => {
    expect(parsePin('story.location = r_01').kind).toBe('location');
    expect(parsePin('story.state = calm').kind).toBe('story-state');
  });
});
