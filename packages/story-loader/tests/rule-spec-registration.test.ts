/**
 * rule-spec-registration.test.ts — the loader registers a Chord story's
 * grammar through `rule(spec)` (parser review step 2, Phase 4): each rule
 * chord's `lowerActionRules` lowers, in definition order with its own
 * `means` defaults and not grouped by them; constraints and slot types on
 * the rules that carry the slot, an optional slot included (B1); bare-verb
 * prefixes after the written patterns; a passage's commands as word parts.
 * Registered rules are read from a real if-domain engine, and the B1 case
 * runs through the real engine, parser and language layer.
 */
import { describe, expect, it } from 'vitest';
import { SlotType } from '@sharpee/if-domain';
import { createStory } from '../src';
import { captureGrammarEngine } from './helpers/grammar-harness';
import { bootTurns, compileSource } from './helpers/boot-turns';

const HEAD = `story
  title: Seam
  authors:
    T
  id: seam
  story-version: 0.0.1

create the Study
  a room

  A quiet study.

create the lamp
  a thing
  in the Study

  A brass lamp.

create the coin
  a thing
  in the Study

  A coin.

create Alex
  a person
  playable
  starts in the Study

  You.

before the game starts
  change the player to Alex
end before

`;

const POKING = `define action poking
  grammar
    poke [the target]
  the target must be held
  phrase poked

  phrases en-US
    poked:
      You poke {the target}.
`;

describe('an optional slot is constrained and seated (B1)', () => {
  it('registers the constraint on the rule whose only slot is optional', () => {
    const engine = captureGrammarEngine(createStory(compileSource(HEAD + POKING)));
    const rule = engine.getRules().find((r) => r.pattern === 'poke [:target]')!;
    expect(rule.action).toBe('chord.action.poking');
    expect(rule.parts).toEqual([
      { kind: 'word', word: 'poke' },
      { kind: 'slot', name: 'target', optional: true },
    ]);
    expect(rule.slots.get('target')?.constraints).toHaveLength(1);
  });

  it('`poke coin` with the coin held binds the coin into the phrase; with the lamp unheld the rule refuses', async () => {
    const b = await bootTurns(HEAD + POKING);
    await b.turn('take coin');
    expect(b.world.getLocation(b.id('coin'))).toBe(b.player.id);

    const held = await b.turnText('poke coin');
    expect(held.text).toContain('You poke the coin.');

    // The story rule's `must be held` refuses the unheld lamp, so the input
    // falls to the standard `poke` (touching), which speaks its own poke line
    // now that the verb phrase is the rule's literal (ADR-383 D7).
    const unheld = await b.turnText('poke lamp');
    expect(unheld.events.map((e) => e.type)).toContain('if.event.touched');
    expect(unheld.events.find((e) => e.type === 'if.event.touched')?.data).toMatchObject({ messageId: 'if.action.touching.poked' });
    expect(unheld.text).toContain('You poke the lamp.');
    expect(b.world.getLocation(b.id('lamp'))).not.toBe(b.player.id);
  });
});

describe('definition order (ADR-382 D7, B7)', () => {
  it('registers an action`s rules as written, `means` groups interleaved, and nothing more (ADR-384 D5)', () => {
    const source = `define action ducking
  grammar
    duck under the target
      means position under
    duck behind the target
      means position behind
    crouch under the target
      means position under
  phrase ducked

  phrases en-US
    ducked:
      You duck.
`;
    const engine = captureGrammarEngine(createStory(compileSource(HEAD + source)));
    const rules = engine.getRules().filter((r) => r.action === 'chord.action.ducking');
    expect(rules.map((r) => [r.pattern, r.defaultSemantics ?? null])).toEqual([
      ['duck under :target', { position: 'under' }],
      ['duck behind :target', { position: 'behind' }],
      ['crouch under :target', { position: 'under' }],
    ]);
    for (const rule of rules) expect(rule.tier).toBe('story');
  });
});

describe('typed slots and directions reach the registered rules', () => {
  it('a typed slot is typed only on the rules that carry it; a directions line registers one rule per alias with its canonical', () => {
    const source = `define action signalling
  grammar
    signal the direction
    signal about the news
    signal
  the news is a topic
  directions
    north or n
    south
  phrase signalled

  phrases en-US
    signalled:
      You signal.
`;
    const engine = captureGrammarEngine(createStory(compileSource(HEAD + source)));
    const rules = engine.getRules().filter((r) => r.action === 'chord.action.signalling');
    expect(rules.map((r) => [r.pattern, r.defaultSemantics ?? null])).toEqual([
      ['signal north', { direction: 'north' }],
      ['signal n', { direction: 'north' }],
      ['signal south', { direction: 'south' }],
      ['signal about :news', null],
      ['signal', null],
    ]);
    const typed = rules.find((r) => r.pattern === 'signal about :news')!;
    expect(typed.slots.get('news')?.slotType).toBe(SlotType.TOPIC);
    for (const rule of rules.filter((r) => r !== typed)) expect(rule.slots.size).toBe(0);
  });
});

describe('passage commands register as word parts (ADR-382 D8)', () => {
  it('each command is a going rule of word parts with the passage key as its direction', () => {
    const source = `create the Loft
  a room

  passage to the Study
    grammar
      climb [down] the ladder
  end passage

  A loft.
`;
    const engine = captureGrammarEngine(createStory(compileSource(HEAD + source)));
    const rules = engine.getRules().filter((r) => r.action === 'if.action.going');
    expect(rules.map((r) => r.pattern)).toEqual(['climb down the ladder', 'climb the ladder']);
    for (const rule of rules) {
      expect(rule.parts.every((part) => part.kind === 'word')).toBe(true);
      expect(rule.defaultSemantics).toEqual({ direction: 'passage:climb-down-the-ladder' });
      expect(rule.when).toBeDefined();
    }
  });
});
