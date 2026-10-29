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

describe('parsePin — the clause counter (a floor form since 2026-10-11) and the shapes named and not written', () => {
  it('occurrence — owner, optional trait, the head as words, optional #n, count (ADR-388 D7)', () => {
    expect(parsePin('vine on pruning by player occurrence = 2')).toEqual({ kind: 'occurrence', owner: 'vine', head: { clauseKind: 'on', action: 'pruning', actor: 'player' }, count: 2 });
    expect(parsePin('the group of mercenaries after entering by player #3 occurrence = 4')).toEqual({ kind: 'occurrence', owner: 'group of mercenaries', head: { clauseKind: 'after', action: 'entering', actor: 'player' }, ordinal: 3, count: 4 });
    expect(parsePin('vine trait prunable on pruning by player occurrence = 2')).toEqual({ kind: 'occurrence', owner: 'vine', trait: 'prunable', head: { clauseKind: 'on', action: 'pruning', actor: 'player' }, count: 2 });
    expect(parsePin('story on every-turn #2 occurrence = 0')).toEqual({ kind: 'occurrence', owner: 'story', head: { clauseKind: 'on', action: 'every-turn' }, ordinal: 2, count: 0 });
    // Every tail the id carries, in the id's order: a sound, an actor, a role, a value, a counterpart.
    expect(parsePin('the guard after hearing bell by player occurrence = 1')).toEqual({ kind: 'occurrence', owner: 'guard', head: { clauseKind: 'after', action: 'hearing', actor: 'player', sound: 'bell' }, count: 1 });
    expect(parsePin('the dial on setting by player to titan occurrence = 1')).toEqual({ kind: 'occurrence', owner: 'dial', head: { clauseKind: 'on', action: 'setting', actor: 'player', valueTail: 'titan' }, count: 1 });
    expect(parsePin('the gong on throwing by player as target with rock occurrence = 1')).toEqual({ kind: 'occurrence', owner: 'gong', head: { clauseKind: 'on', action: 'throwing', actor: 'player', role: 'target', counterpart: 'rock' }, count: 1 });
    // A bare head (`self` binding, or every-turn) carries no actor.
    expect(parsePin('the troll on going occurrence = 1')).toEqual({ kind: 'occurrence', owner: 'troll', head: { clauseKind: 'on', action: 'going' }, count: 1 });
    // The retired forms are no form at all.
    expect(parsePin('vine.pruning occurrence = 2')).toEqual({ kind: 'unrecognized' });
    expect(parsePin('vine clause 1 occurrence = 2')).toEqual({ kind: 'unrecognized' });
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
  });

  it('reads a multi-word head in the dotted forms — the Chord spelling (GH #375)', () => {
    expect(parsePin('first partner.location = anywhere')).toEqual({
      kind: 'location', entity: 'first partner', operator: '=', place: 'anywhere',
    });
    expect(parsePin('silver brooch.contents contains pin')).toEqual({
      kind: 'contains', entity: 'silver brooch', collection: 'contents', operator: 'contains', item: 'pin',
    });
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
