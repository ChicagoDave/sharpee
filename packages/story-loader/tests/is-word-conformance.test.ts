/**
 * is-word-conformance.test.ts — every platform word the compiler accepts
 * after `is` has a reader in the evaluator, and a trait adjective reads the
 * entity's composition.
 *
 * The conformance half lists the compiler's accepted platform words (trait
 * adjectives, state adjectives, moods, threats, pressure bands) and asks the
 * reader table for each; a word with no reader would read as a silent false.
 * The instrument's own failing case: a test-only word with no reader must be
 * reported. The behaviour half compiles a story and asserts `is scenery` and
 * `is not scenery` on things that do and do not compose it.
 *
 * References:
 * - ADR-394 D3 — a trait adjective after `is` reads the composition; every accepted word has a reader.
 */
import { describe, expect, it } from 'vitest';
import { CHARACTER_MANIFEST, STATE_ADJECTIVES, TRAIT_ADJECTIVES, compile } from '@sharpee/chord';
import { MOOD_AXES, WorldModel, ActorTrait } from '@sharpee/world-model';
import { createStory, Evaluator } from '../src';
import { isWordReader, STATE_ADJECTIVE_READS, unreadIsWords } from '../src/is-word-readers';

const PLATFORM_MOODS: ReadonlySet<string> = new Set(Object.keys(MOOD_AXES));

/** Every platform word the analyzer accepts after `is` (analyzer `resolveIsObject`). */
const ACCEPTED_PLATFORM_WORDS: readonly string[] = [
  ...TRAIT_ADJECTIVES,
  ...STATE_ADJECTIVES,
  ...CHARACTER_MANIFEST.moods,
  ...CHARACTER_MANIFEST.threats,
  ...CHARACTER_MANIFEST.pressureBands,
];

describe('every accepted `is` word has a reader', () => {
  it('leaves no accepted platform word unread', () => {
    expect(unreadIsWords(ACCEPTED_PLATFORM_WORDS, PLATFORM_MOODS)).toEqual([]);
  });

  it('reports a word with no reader (the instrument\'s failing case)', () => {
    expect(unreadIsWords([...ACCEPTED_PLATFORM_WORDS, 'test-only-unread-word'], PLATFORM_MOODS)).toEqual(['test-only-unread-word']);
  });

  it('reads the state adjectives live, exactly the compiler\'s set', () => {
    expect([...STATE_ADJECTIVE_READS].sort()).toEqual([...STATE_ADJECTIVES].sort());
    for (const word of STATE_ADJECTIVES) expect(isWordReader(word, PLATFORM_MOODS)).toBe('state-adjective');
  });

  it('gives each word one reader: dark is darkness, a trait adjective is its composition, a mood the character model', () => {
    expect(isWordReader('dark', PLATFORM_MOODS)).toBe('darkness');
    expect(isWordReader('scenery', PLATFORM_MOODS)).toBe('composition');
    expect(isWordReader('attached', PLATFORM_MOODS)).toBe('state-adjective');
    expect(isWordReader('panicked', PLATFORM_MOODS)).toBe('character-model');
    expect(isWordReader('haunted', PLATFORM_MOODS)).toBeNull();
    expect(isWordReader('haunted', new Set([...PLATFORM_MOODS, 'haunted']))).toBe('character-model');
  });
});

const SOURCE = `story
  title: Fixtures
  authors:
    T
  id: fixtures
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create Alex
  a person
  playable
  in the Hall

  You.

create the statue
  a thing, scenery
  in the Hall

  A statue.

create the vase
  a thing
  in the Hall

  A vase.

before the game starts
  change the player to Alex
end before
`;

describe('a trait adjective after `is` reads the composition', () => {
  const result = compile(SOURCE);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => `${d.span.line} ${d.code} ${d.message}`).join('; '));
  const story = createStory(result.ir, { seed: 1 });
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  player.add(new ActorTrait({ isPlayable: true }));
  world.setPlayer(player.id);
  const ev = new Evaluator(result.ir, 1);
  const is = (id: string, word: string, negated = false) =>
    ev.evalCondition(
      { kind: 'predicate', pred: 'is', negated, subject: { kind: 'entity', id }, object: { kind: 'symbol', name: word } },
      { world },
    );

  it('holds for the thing that composes it', () => {
    expect(is('statue', 'scenery')).toBe(true);
    expect(is('statue', 'scenery', true)).toBe(false);
  });

  it('fails for the thing that does not, and the negation holds', () => {
    expect(is('vase', 'scenery')).toBe(false);
    expect(is('vase', 'scenery', true)).toBe(true);
  });
});
