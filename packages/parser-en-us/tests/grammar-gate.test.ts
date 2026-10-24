/**
 * The rule gate (ADR-378 D5, GH #317): a grammar rule with a `when`
 * predicate is skipped while the predicate answers false against the live
 * world — neither a match nor a failure — so the input falls through to the
 * rules that remain. `rule(spec)` carries the gate on each rule it registers.
 * Each test asserts on what the engine matched and on the failure list.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishGrammarEngine } from '../src/english-grammar-engine';
import { EnglishPatternCompiler } from '../src/english-pattern-compiler';
import { Token, GrammarContext } from '@sharpee/if-domain';

function tokens(words: string[]): Token[] {
  return words.map((word, index) => ({ word, normalized: word.toLowerCase(), position: index * 5, candidates: [] }));
}

function contextIn(location: string): GrammarContext {
  return { world: {}, actorId: 'a1', currentLocation: location, slots: new Map() };
}

describe('the grammar rule gate (ADR-378 D5)', () => {
  let engine: EnglishGrammarEngine;

  beforeEach(() => {
    engine = new EnglishGrammarEngine();
  });

  it('a gated rule matches where its predicate holds and is skipped where it does not', () => {
    engine
      .createBuilder('story')
      .define('xyzzy')
      .mapsTo('if.action.going')
      .withDefaultSemantics({ direction: 'passage:xyzzy' as never })
      .when((ctx) => ctx.currentLocation === 'r_cellar')
      .build();

    const inCellar = engine.findMatches(tokens(['xyzzy']), contextIn('r_cellar'));
    expect(inCellar).toHaveLength(1);
    expect(inCellar[0].rule.action).toBe('if.action.going');

    const inHall = engine.findMatches(tokens(['xyzzy']), contextIn('r_hall'));
    expect(inHall).toHaveLength(0);
  });

  it('a skipped rule is not recorded as a failure either (no clarification is owed to a rule that is not there)', () => {
    engine.createBuilder('story').define('drop :item').mapsTo('story.releasing').when(() => false).build();
    engine.findMatches(tokens(['drop']), contextIn('r_hall'));
    expect(engine.getLastFailures()).toHaveLength(0);
  });

  it('with the story rule gated off, the standard rule of the same text is what matches', () => {
    engine.createBuilder('standard').define('drop :item').mapsTo('if.action.dropping').build();
    engine
      .createBuilder('story')
      .define('drop :item')
      .mapsTo('story.releasing')
      .when((ctx) => ctx.currentLocation === 'r_wire')
      .build();

    const onTheWire = engine.getBestMatch(tokens(['drop', 'rope']), contextIn('r_wire'));
    expect(onTheWire?.rule.action).toBe('story.releasing');
    const elsewhere = engine.getBestMatch(tokens(['drop', 'rope']), contextIn('r_hall'));
    expect(elsewhere?.rule.action).toBe('if.action.dropping');
  });

  it('rule(spec) carries its gate, on slotted and bare rules alike', () => {
    const story = engine.createBuilder('story');
    const onTheWire = (ctx: GrammarContext) => ctx.currentLocation === 'r_wire';
    for (const pattern of ['let go', 'release :thing', 'let go of :thing']) {
      story.rule({ action: 'story.releasing', parts: new EnglishPatternCompiler().parse(pattern), pattern, when: onTheWire });
    }

    const rules = engine.getRules().filter((r) => r.action === 'story.releasing');
    expect(rules).toHaveLength(3);
    for (const rule of rules) expect(rule.when).toBe(onTheWire);

    expect(engine.findMatches(tokens(['let', 'go']), contextIn('r_wire'))).toHaveLength(1);
    expect(engine.findMatches(tokens(['let', 'go']), contextIn('r_hall'))).toHaveLength(0);
  });

  it('a rule with no gate is unchanged: it matches everywhere', () => {
    engine.createBuilder('standard').define('look').mapsTo('if.action.looking').build();
    expect(engine.getRules()[0].when).toBeUndefined();
    expect(engine.findMatches(tokens(['look']), contextIn('r_anywhere'))).toHaveLength(1);
  });
});
