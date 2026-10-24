/**
 * @file A grammar rule crosses as structured parts (ADR-382, parser review step 2)
 * @description The `define(text)` front end parses once into parts and refuses
 * malformed brackets (D3, B4); the compiled pattern carries one record per
 * slot and is the only source of slot facts (D4); `rule(spec)` registers from
 * parts with no text parsed (D2); an optional slot is seated and constrained
 * like a required one (B1). Every test drives the real compiler, engine and
 * parser.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { analyzeBestFailure } from '../src/parse-failure';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { vocabularyRegistry, PatternSyntaxError, SlotType, type Token, type GrammarContext } from '@sharpee/if-domain';

const things = ['coin', 'lamp', 'pear', 'box'].map((name) => ({
  id: name,
  name,
  attributes: { name },
  visible: true,
  portable: true,
}));

/** A room holding every thing; the player carries only the coin. */
class Room {
  getEntity(id: string) {
    return things.find((t) => t.id === id);
  }
  getAllEntities() {
    return things;
  }
  getVisibleEntities() {
    return things;
  }
  getTouchableEntities() {
    return things;
  }
  getCarriedEntities() {
    return things.filter((t) => t.id === 'coin');
  }
  getVisible() {
    return things;
  }
  getReachable() {
    return things;
  }
  getCarriedAndWorn() {
    return { carried: things.filter((t) => t.id === 'coin'), worn: [] };
  }
}

function tokens(words: string[]): Token[] {
  return words.map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 5, candidates: [] }));
}

const context: GrammarContext = { world: {}, actorId: 'a1', currentLocation: 'r1', slots: new Map() };

describe('parse: the define(text) front end (ADR-382 D3)', () => {
  const compiler = new EnglishPatternCompiler();

  it('turns words, alternations, slots, greedy slots and optional elements into parts', () => {
    expect(compiler.parse('put :item [carefully] in|into :container')).toEqual([
      { kind: 'word', word: 'put' },
      { kind: 'slot', name: 'item' },
      { kind: 'word', word: 'carefully', optional: true },
      { kind: 'alt', words: ['in', 'into'] },
      { kind: 'slot', name: 'container' },
    ]);
    expect(compiler.parse('say :message... [:target] [on|off]')).toEqual([
      { kind: 'word', word: 'say' },
      { kind: 'slot', name: 'message', greedy: true },
      { kind: 'slot', name: 'target', optional: true },
      { kind: 'alt', words: ['on', 'off'], optional: true },
    ]);
  });

  it.each([
    ['[look at] :x', 0, /cannot span several words/],
    ['look [at :x', 5, /Unclosed/],
    ['look at] :x', 7, /Stray/],
    ['look [] :x', 5, /Empty/],
    ['look [[at]] :x', 6, /Nested/],
    ['look at :1x', 8, /Invalid slot name/],
    ['look in||into :x', 5, /Empty alternative/],
  ])('refuses %s with PatternSyntaxError at offset %i', (text, offset, message) => {
    let thrown: unknown;
    try {
      compiler.parse(text);
    } catch (e) {
      thrown = e;
    }
    expect(thrown).toBeInstanceOf(PatternSyntaxError);
    expect((thrown as PatternSyntaxError).position).toBe(offset);
    expect((thrown as PatternSyntaxError).message).toMatch(message);
  });

  it('a malformed pattern throws at define(), before anything is registered', () => {
    const engine = new EnglishGrammarEngine();
    expect(() => engine.createBuilder().define('[look at] :x')).toThrow(PatternSyntaxError);
    expect(engine.getRules()).toHaveLength(0);
  });
});

describe('compile: one record per slot (ADR-382 D4)', () => {
  const compiler = new EnglishPatternCompiler();

  it('records every slot in order with its token index, optionality, greediness and type', () => {
    const compiled = compiler.compile(compiler.parse('say :message... to [:target]'));
    expect(compiled.slots).toEqual([
      { name: 'message', tokenIndex: 1, optional: false, greedy: true, slotType: SlotType.TEXT_GREEDY },
      { name: 'target', tokenIndex: 3, optional: true, greedy: false, slotType: SlotType.ENTITY },
    ]);
    expect(compiled.slotsByName.get('target')).toBe(compiled.slots[1]);
    expect(compiled.minTokens).toBe(3);
  });

  it('`:items` and `:item` are two slots', () => {
    const compiled = compiler.compile(compiler.parse('put :items in :item'));
    expect(compiled.slots.map((s) => s.name)).toEqual(['items', 'item']);
  });

  it('the same pattern as text and as parts compiles to identical slots and tokens', () => {
    const fromText = compiler.compile(compiler.parse('poke [:target] with :tool'));
    const fromParts = compiler.compile([
      { kind: 'word', word: 'poke' },
      { kind: 'slot', name: 'target', optional: true },
      { kind: 'word', word: 'with' },
      { kind: 'slot', name: 'tool' },
    ]);
    expect(fromParts.slots).toEqual(fromText.slots);
    expect(fromParts.tokens).toEqual(fromText.tokens);
  });

  it('refuses a duplicate slot and an empty pattern', () => {
    expect(() => compiler.compile(compiler.parse('tie :x to :x'))).toThrow(/Duplicate slot name/);
    expect(() => compiler.compile([])).toThrow(PatternSyntaxError);
  });
});

describe('slot configuration attaches by compiled slot (ADR-382 D4)', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
  });

  it('a type set on a slot lands on its compiled record', () => {
    engine.createBuilder().define('slice :branch with :blade').instrument('blade').mapsTo('story.slice').build();
    const rule = engine.getRules()[0];
    expect(rule.compiledPattern!.slotsByName.get('blade')!.slotType).toBe(SlotType.INSTRUMENT);
    expect(rule.compiledPattern!.slotsByName.get('branch')!.slotType).toBe(SlotType.ENTITY);
  });

  it('configuration naming a slot the pattern lacks throws and registers nothing', () => {
    expect(() =>
      engine.createBuilder().define('poke :target').where('nope', (s) => s.visible()).mapsTo('story.poke').build(),
    ).toThrow(/configures slot 'nope'/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('a greedy slot typed as anything but TEXT_GREEDY throws', () => {
    expect(() => engine.createBuilder().define('say :message...').text('message').mapsTo('story.say').build()).toThrow(
      /greedy slot 'message'/,
    );
    expect(engine.getRules()).toHaveLength(0);
  });
});

describe('rule(spec): registration from parts (ADR-382 D2)', () => {
  it('registers at the builder tier with the spec`s parts, display text, slot types and defaults', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder('story').rule({
      action: 'story.cut',
      pattern: 'cut :branch with :blade',
      parts: [
        { kind: 'word', word: 'cut' },
        { kind: 'slot', name: 'branch' },
        { kind: 'word', word: 'with' },
        { kind: 'slot', name: 'blade' },
      ],
      slots: { blade: { type: SlotType.INSTRUMENT } },
      defaults: { manner: 'careful' },
    });
    const [rule] = engine.getRules();
    expect(rule.tier).toBe('story');
    expect(rule.pattern).toBe('cut :branch with :blade');
    expect(rule.compiledPattern!.slotsByName.get('blade')!.slotType).toBe(SlotType.INSTRUMENT);
    expect(rule.defaultSemantics).toEqual({ manner: 'careful' });

    const match = engine.findMatches(tokens(['cut', 'stick', 'with', 'knife']), context)[0];
    expect(match?.rule).toBe(rule);
  });

  it('carries the spec`s gate, and registers specs in the order they arrive', () => {
    const engine = new EnglishGrammarEngine();
    const builder = engine.createBuilder('story');
    const gate = () => false;
    builder.rule({ action: 'story.a', pattern: 'alpha', parts: [{ kind: 'word', word: 'alpha' }], when: gate });
    builder.rule({ action: 'story.b', pattern: 'beta', parts: [{ kind: 'word', word: 'beta' }] });
    builder.rule({ action: 'story.a', pattern: 'gamma', parts: [{ kind: 'word', word: 'gamma' }] });
    expect(engine.getRules().map((r) => r.pattern)).toEqual(['alpha', 'beta', 'gamma']);
    expect(engine.getRules()[0].when).toBe(gate);
    expect(engine.getRulesForAction('story.a').map((r) => r.pattern)).toEqual(['alpha', 'gamma']);
    expect(engine.findMatches(tokens(['alpha']), context)).toHaveLength(0);
  });

  it('refuses a spec with no action, or a greedy slot typed as anything but TEXT_GREEDY', () => {
    const engine = new EnglishGrammarEngine();
    const builder = engine.createBuilder('story');
    expect(() => builder.rule({ action: '', pattern: 'alpha', parts: [{ kind: 'word', word: 'alpha' }] })).toThrow(
      /must have an action/,
    );
    expect(() =>
      builder.rule({
        action: 'story.say',
        pattern: 'say :message...',
        parts: [{ kind: 'word', word: 'say' }, { kind: 'slot', name: 'message', greedy: true }],
        slots: { message: { type: SlotType.TOPIC } },
      }),
    ).toThrow(/greedy slot 'message'/);
    expect(engine.getRules()).toHaveLength(0);
  });

  it('refuses a spec whose slot configuration names a missing slot', () => {
    const engine = new EnglishGrammarEngine();
    expect(() =>
      engine.createBuilder('story').rule({
        action: 'story.cut',
        pattern: 'cut :branch',
        parts: [{ kind: 'word', word: 'cut' }, { kind: 'slot', name: 'branch' }],
        slots: { blade: { type: SlotType.INSTRUMENT } },
      }),
    ).toThrow(/configures slot 'blade'/);
    expect(engine.getRules()).toHaveLength(0);
  });
});

describe('an optional slot is seated and constrained (B1)', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    vocabularyRegistry.clear();
    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(new Room(), 'player', 'room');
    parser.getStoryGrammar().rule({
      action: 'story.poke',
      pattern: 'poke [:target]',
      parts: [
        { kind: 'word', word: 'poke' },
        { kind: 'slot', name: 'target', optional: true },
      ],
      slots: { target: { constraints: [(scope) => scope.carried()] } },
    });
  });

  it('`poke coin` (carried) seats the coin as the direct object of the story rule', () => {
    const result = parser.parse('poke coin');
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.value.action).toBe('story.poke');
      expect(result.value.structure.directObject?.text).toBe('coin');
      expect(result.value.structure.directObject?.slot).toBe('target');
      expect(result.value.extras?.target).toBeUndefined();
    }
  });

  it('`poke lamp` (not carried) is refused by the slot`s constraint', () => {
    const result = parser.parse('poke lamp');
    expect(result.success ? result.value.action : 'not understood').not.toBe('story.poke');
  });

  it('the constraint reached the optional slot`s rule', () => {
    const rule = parser.getStoryGrammar().getRules().find((r) => r.action === 'story.poke')!;
    expect(rule.slots.get('target')?.constraints).toHaveLength(1);
  });
});

describe('a failure names what it stopped short of, from the compiled pattern', () => {
  it('`put pear` against `put :item in :container` asks for the container', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('put :item in :container').mapsTo('if.action.inserting').build();
    engine.findMatches(tokens(['put', 'pear']), context);
    const failures = engine.getLastFailures();
    expect(failures[0].expected).toEqual({ kind: 'word', word: 'in' });
    expect(failures[0].followingSlot).toBe('container');
    const error = analyzeBestFailure(failures, 'put pear', true);
    expect(error.code).toBe('MISSING_INDIRECT');
    expect(error.context).toMatchObject({ verb: 'put', slot: 'container', preposition: 'in' });
  });

  it('a bare verb against `drop :item` expects the slot itself', () => {
    const engine = new EnglishGrammarEngine();
    engine.createBuilder().define('drop :item').mapsTo('if.action.dropping').build();
    engine.findMatches(tokens(['drop']), context);
    expect(engine.getLastFailures()[0].expected).toEqual({ kind: 'slot', name: 'item' });
  });
});
