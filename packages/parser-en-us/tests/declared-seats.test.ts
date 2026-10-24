/**
 * @file Every entity slot carries a seat, settled at build (ADR-383 D1, D2, parser review step 3)
 * @description The compiled slot record gains `seat`: declared seats are taken
 * first, then each undeclared entity slot takes the first free of direct and
 * indirect, in pattern order, optional slots counted. Every other slot type
 * carries no seat. A seat on a non-entity slot, two slots in one seat, and a
 * third entity slot are build errors that register nothing. The parser does
 * not read the seat yet (Phase 4), so these tests assert on the records the
 * real engine builds, and on the whole standard grammar through the real
 * parser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry, SlotType, type GrammarRule } from '@sharpee/if-domain';

/** Each slot's seat on a registered rule, by name; `-` for a slot with none. */
function seats(rule: GrammarRule): Record<string, string> {
  return Object.fromEntries(rule.compiledPattern!.slots.map((slot) => [slot.name, slot.seat ?? '-']));
}

describe('the positional default (ADR-383 D2)', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
  });

  it('seats the first entity slot direct and the second indirect', () => {
    engine.createBuilder().define('put :item in :container').mapsTo('story.put').build();
    expect(seats(engine.getRules()[0])).toEqual({ item: 'direct', container: 'indirect' });
  });

  it('counts an optional slot like a required one', () => {
    engine.createBuilder().define('wave [:flag] at :target').mapsTo('story.wave').build();
    expect(seats(engine.getRules()[0])).toEqual({ flag: 'direct', target: 'indirect' });
  });

  it('skips an instrument slot, which is seated by its type, wherever it sits', () => {
    engine.createBuilder().define('hang :item on :target').instrument('item').mapsTo('story.hang').build();
    expect(seats(engine.getRules()[0])).toEqual({ item: '-', target: 'direct' });
  });

  it('gives no seat to text, topic, greedy or number slots', () => {
    const builder = engine.createBuilder();
    builder.define('ask :recipient about :subject').topic('subject').mapsTo('story.ask').build();
    builder.define('say :message... to :listener').mapsTo('story.say').build();
    builder.define('set :dial to :value').number('value').mapsTo('story.set').build();
    builder.define('write :word on :page').text('word').mapsTo('story.write').build();
    expect(engine.getRules().map(seats)).toEqual([
      { recipient: 'direct', subject: '-' },
      { message: '-', listener: 'direct' },
      { dial: 'direct', value: '-' },
      { word: '-', page: 'direct' },
    ]);
  });

  it('seats a rule registered through rule(spec) the same way as its text twin', () => {
    const builder = engine.createBuilder();
    builder.define('tie :item to :anchor').mapsTo('story.tie').build();
    builder.rule({
      action: 'story.tie',
      pattern: 'tie :item to :anchor',
      parts: [
        { kind: 'word', word: 'tie' },
        { kind: 'slot', name: 'item' },
        { kind: 'word', word: 'to' },
        { kind: 'slot', name: 'anchor' },
      ],
    });
    const [fromText, fromSpec] = engine.getRules();
    expect(seats(fromSpec)).toEqual(seats(fromText));
    expect(seats(fromSpec)).toEqual({ item: 'direct', anchor: 'indirect' });
  });
});

describe('a declared seat (ADR-383 D1, D2)', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
  });

  it('`.seat` seats an indirect-first line, and the other slot takes the seat left free', () => {
    engine.createBuilder().define('hand :recipient :item').seat('item', 'direct').mapsTo('if.action.giving').build();
    expect(seats(engine.getRules()[0])).toEqual({ recipient: 'indirect', item: 'direct' });
  });

  it('a spec`s `slots[name].seat` does the same', () => {
    engine.createBuilder().rule({
      action: 'if.action.giving',
      pattern: 'hand :recipient :item',
      parts: [
        { kind: 'word', word: 'hand' },
        { kind: 'slot', name: 'recipient' },
        { kind: 'slot', name: 'item' },
      ],
      slots: { recipient: { seat: 'indirect' } },
    });
    expect(seats(engine.getRules()[0])).toEqual({ recipient: 'indirect', item: 'direct' });
  });

  it('a seat declared on a one-slot rule is kept, even indirect', () => {
    engine.createBuilder().define('feed :animal').seat('animal', 'indirect').mapsTo('story.feed').build();
    expect(seats(engine.getRules()[0])).toEqual({ animal: 'indirect' });
  });
});

describe('seat build errors register nothing (ADR-383 D1)', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
  });

  it('a seat on a topic slot throws', () => {
    expect(() =>
      engine
        .createBuilder()
        .define('ask :recipient about :subject')
        .topic('subject')
        .seat('subject', 'indirect')
        .mapsTo('story.ask')
        .build(),
    ).toThrow(/seats slot 'subject' as indirect, but its type is topic/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('a seat on an instrument slot, through rule(spec), throws', () => {
    expect(() =>
      engine.createBuilder().rule({
        action: 'story.cut',
        pattern: 'cut :branch with :blade',
        parts: [
          { kind: 'word', word: 'cut' },
          { kind: 'slot', name: 'branch' },
          { kind: 'word', word: 'with' },
          { kind: 'slot', name: 'blade' },
        ],
        slots: { blade: { type: SlotType.INSTRUMENT, seat: 'indirect' } },
      }),
    ).toThrow(/seats slot 'blade' as indirect, but its type is instrument/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('two slots declared in one seat throw', () => {
    expect(() =>
      engine
        .createBuilder()
        .define('swap :first with :second')
        .seat('first', 'direct')
        .seat('second', 'direct')
        .mapsTo('story.swap')
        .build(),
    ).toThrow(/seats both 'first' and 'second' as direct/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('a third entity slot throws', () => {
    expect(() =>
      engine.createBuilder().define('trade :item to :merchant for :price').mapsTo('story.trade').build(),
    ).toThrow(/'price' has none left/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('a seat on a slot the pattern lacks throws', () => {
    expect(() =>
      engine.createBuilder().define('poke :target').seat('nope', 'direct').mapsTo('story.poke').build(),
    ).toThrow(/configures slot 'nope'/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('through rule(spec): two slots in one seat, and a spec seat on a missing slot, throw', () => {
    const builder = engine.createBuilder();
    const parts = [
      { kind: 'word' as const, word: 'swap' },
      { kind: 'slot' as const, name: 'first' },
      { kind: 'word' as const, word: 'with' },
      { kind: 'slot' as const, name: 'second' },
    ];
    expect(() =>
      builder.rule({
        action: 'story.swap',
        pattern: 'swap :first with :second',
        parts,
        slots: { first: { seat: 'indirect' }, second: { seat: 'indirect' } },
      }),
    ).toThrow(/seats both 'first' and 'second' as indirect/);
    expect(() =>
      builder.rule({ action: 'story.swap', pattern: 'swap :first with :second', parts, slots: { third: { seat: 'direct' } } }),
    ).toThrow(/configures slot 'third'/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('one declared seat leaves one free: two more entity slots throw on the second', () => {
    expect(() =>
      engine
        .createBuilder()
        .define('trade :item to :merchant for :price')
        .seat('price', 'indirect')
        .mapsTo('story.trade')
        .build(),
    ).toThrow(/'merchant' has none left/);
    expect(engine.getRules()).toHaveLength(0);
  });
});

describe('a pre-compiled pattern is seated afresh on each add (ADR-383 D2)', () => {
  it('a second rule sharing the pattern takes its own declaration, and a refused add leaves the seats as they were', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('hand :recipient :item').mapsTo('if.action.giving').build();
    const first = engine.getRules()[0];
    const compiled = first.compiledPattern!;
    expect(seats(first)).toEqual({ recipient: 'direct', item: 'indirect' });

    // Re-add the same compiled pattern with a declaration: the stale seats are replaced.
    engine.addRule({
      ...first,
      id: 'second',
      slots: new Map([['item', { name: 'item', constraints: [], seat: 'direct' as const }]]),
      compiledPattern: compiled,
    });
    expect(engine.getRules()).toHaveLength(2);
    expect(seats(engine.getRules()[1])).toEqual({ recipient: 'indirect', item: 'direct' });

    // A refused add (two slots in one seat) registers nothing and does not touch the shared records.
    expect(() =>
      engine.addRule({
        ...first,
        id: 'third',
        slots: new Map([
          ['item', { name: 'item', constraints: [], seat: 'indirect' as const }],
          ['recipient', { name: 'recipient', constraints: [], seat: 'indirect' as const }],
        ]),
        compiledPattern: compiled,
      }),
    ).toThrow(/seats both/);
    expect(engine.getRules()).toHaveLength(2);
    expect(seats(engine.getRules()[1])).toEqual({ recipient: 'indirect', item: 'direct' });
  });
});

describe('the standard grammar, seated through the real parser', () => {
  let rules: GrammarRule[];

  beforeEach(() => {
    vocabularyRegistry.clear();
    const parser = new EnglishParser(new EnglishLanguageProvider());
    rules = parser.getStoryGrammar().getRules();
  });

  it('seats every entity slot of every rule by position, and nothing else', () => {
    expect(rules.length).toBeGreaterThan(500);
    for (const rule of rules) {
      const entity = rule.compiledPattern!.slots.filter((slot) => slot.slotType === SlotType.ENTITY);
      expect(entity.length, rule.pattern).toBeLessThanOrEqual(2);
      expect(
        entity.map((slot) => slot.seat),
        rule.pattern,
      ).toEqual(['direct', 'indirect'].slice(0, entity.length));
      for (const slot of rule.compiledPattern!.slots) {
        if (slot.slotType !== SlotType.ENTITY) expect(slot.seat, `${rule.pattern} :${slot.name}`).toBeUndefined();
      }
    }
  });

  it('`hand :recipient :item` still seats the recipient direct: the table that fixes it is Phase 3`s', () => {
    const hand = rules.find((rule) => rule.pattern === 'hand :recipient :item')!;
    expect(seats(hand)).toEqual({ recipient: 'direct', item: 'indirect' });
  });
});
