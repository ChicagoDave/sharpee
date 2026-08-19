/**
 * incomplete.test.ts — AC-7 and the D6b corpus pin.
 *
 * AC-7 drives the canonical adjective cases through real Chord fixtures that
 * declare no `adjectives` field, because ADR-321 D5's claim is precisely that
 * Chord needs no adjective syntax: the name's own words do the work.
 *
 * The corpus pin records what the extractor currently finds in all three
 * stories. Its stop and boundary lists are the specification (D6b), so tuning
 * them must show up here as a diff in expected findings rather than as a silent
 * change in what the author is told.
 *
 * Owner context: @sharpee/world-index — tests.
 *
 * @see ADR-321 D5, D6, D6b, AC-7
 */

import { beforeAll, describe, expect, it } from 'vitest';
import type { StoryIR } from '@sharpee/chord';
import { deriveIncomplete, extractNounPhrases } from '../src/incomplete.js';
import { buildVocabularyIndex, entityVocabulary, resolvePhrase } from '../src/vocabulary.js';
import { CORPUS, compileSource, compileStory, entity } from './corpus.js';

/** A two-room fixture the AC-7 cases hang their objects in. */
const ROOMS = `story
  title: Vocabulary
  authors:
    Test
  id: vocabulary
  story-version: 1.0.0

create the Hall
  a room
  north to the Study

  A hall.

create the Study
  a room

  A study.

create the player
  starts in the Hall
`;

/** Resolve a phrase against a compiled fixture, the way the parser would. */
function resolve(ir: StoryIR, phrase: string): string[] {
  const index = buildVocabularyIndex(ir);
  return resolvePhrase(index, phrase, phrase.split(/\s+/)).sort();
}

describe('AC-7 — the canonical adjective cases, with no `adjectives` declared', () => {
  let balls: StoryIR;
  let plant: StoryIR;

  beforeAll(() => {
    balls = compileSource(`${ROOMS}
create the red ball
  in the Hall

  A red ball.

create the green ball
  in the Hall

  A green ball.

create the blue ball
  in the Hall

  A blue ball.
`);
    plant = compileSource(`${ROOMS}
create the potted plant
  in the Hall

  A potted plant.
`);
  });

  it('raises a disambiguation across the three balls for the bare noun', () => {
    expect(resolve(balls, 'ball')).toEqual(['blue-ball', 'green-ball', 'red-ball']);
  });

  it('resolves each ball by its colour word alone', () => {
    expect(resolve(balls, 'red ball')).toEqual(['red-ball']);
    expect(resolve(balls, 'green ball')).toEqual(['green-ball']);
    expect(resolve(balls, 'blue ball')).toEqual(['blue-ball']);
  });

  it('takes the colour word on its own as the same object', () => {
    expect(resolve(balls, 'red')).toEqual(['red-ball']);
  });

  it('disqualifies a candidate on any word it does not answer to', () => {
    expect(resolve(balls, 'red green')).toEqual([]);
    expect(resolve(balls, 'brass ball')).toEqual([]);
  });

  it('matches the potted plant on all three of its forms', () => {
    expect(resolve(plant, 'plant')).toEqual(['potted-plant']);
    expect(resolve(plant, 'potted plant')).toEqual(['potted-plant']);
    expect(resolve(plant, 'potted')).toEqual(['potted-plant']);
  });

  it('declares no adjectives anywhere — the name words carry it', () => {
    for (const ir of [balls, plant]) {
      for (const declared of ir.entities) {
        expect(Object.keys(declared)).not.toContain('adjectives');
      }
    }
    expect([...entityVocabulary(entity(balls, 'red-ball'))].sort()).toEqual(['ball', 'red']);
  });

  it('says nothing about prose that names a ball by its colour', () => {
    const clean = compileSource(`${ROOMS.replace('  A hall.', '  A hall. On the floor sits the red ball.')}
create the red ball
  in the Hall

  A red ball.
`);
    expect(deriveIncomplete(clean).counts).toEqual({ missingWord: 0, ambiguous: 0, noObject: 0 });
  });

  it('reports the ambiguity when the prose names a ball with three of them present', () => {
    const ambiguous = compileSource(`${ROOMS.replace('  A hall.', '  A hall. Someone left the ball here.')}
create the red ball
  in the Hall

  A red ball.

create the green ball
  in the Hall

  A green ball.

create the blue ball
  in the Hall

  A blue ball.
`);
    const result = deriveIncomplete(ambiguous);
    expect(result.counts.ambiguous).toBe(1);
    expect(result.ambiguous[0]).toMatchObject({
      where: 'hall',
      phrase: 'ball',
      candidates: expect.arrayContaining(['red-ball', 'green-ball', 'blue-ball']),
    });
  });
});

describe('the three classes are three different problems', () => {
  let story: StoryIR;

  beforeAll(() => {
    story = compileSource(`${ROOMS.replace('  A hall.', '  A hall. The hurricane lamp stands on the scrollwork.')}
create the oil lamp
  in the Hall

  An oil lamp.
`);
  });

  it('names a real thing by a word it does not answer to', () => {
    const result = deriveIncomplete(story);
    expect(result.missingWord).toContainEqual(
      expect.objectContaining({
        where: 'hall',
        phrase: 'hurricane lamp',
        entity: 'oil-lamp',
        missing: ['hurricane'],
        knownAs: expect.arrayContaining(['oil', 'lamp']),
      }),
    );
  });

  it('names something with nothing behind it', () => {
    const result = deriveIncomplete(story);
    expect(result.noObject).toContainEqual(
      expect.objectContaining({ where: 'hall', phrase: 'scrollwork' }),
    );
  });

  it('goes quiet once the object answers to the word', () => {
    const fixed = compileSource(`${ROOMS.replace('  A hall.', '  A hall. The hurricane lamp stands here.')}
create the oil lamp
  aka hurricane lamp
  in the Hall

  An oil lamp.
`);
    expect(deriveIncomplete(fixed).counts.missingWord).toBe(0);
  });
});

describe('the extractor reads noun phrases, not clauses', () => {
  it('starts at an article and stops at a boundary word', () => {
    expect(extractNounPhrases('The brass key lies on the worn doormat.').map((n) => n.phrase)).toEqual([
      'brass key',
      'worn doormat',
    ]);
  });

  it('drops a run longer than three words', () => {
    expect(extractNounPhrases('A very old cracked leather satchel.')).toEqual([]);
  });

  it('drops a head that is a direction, an abstraction, or a participle', () => {
    expect(extractNounPhrases('The quiet moment. The far corner. The shape standing.').map((n) => n.phrase))
      .toEqual([]);
  });

  it('keeps a three-letter head — interactive fiction is full of them', () => {
    expect(extractNounPhrases('The brass key. The tin lid.').map((n) => n.phrase)).toEqual([
      'brass key',
      'tin lid',
    ]);
  });

  it('stops at a locative rather than heading the phrase on it', () => {
    expect(extractNounPhrases('Someone left the ball here.').map((n) => n.phrase)).toEqual(['ball']);
  });

  it('loses a phrase to a verb the boundary list does not name — the documented limit', () => {
    expect(extractNounPhrases('The hurricane lamp burns.').map((n) => n.phrase)).toEqual([
      'hurricane lamp burns',
    ]);
    expect(extractNounPhrases('The hurricane lamp stands.').map((n) => n.phrase)).toEqual([
      'hurricane lamp',
    ]);
  });

  it('reports each distinct phrase once', () => {
    expect(extractNounPhrases('The brass key. The brass key again.').map((n) => n.phrase)).toEqual([
      'brass key',
    ]);
  });
});

describe('D6b — the corpus pin', () => {
  let fernhill: StoryIR;
  let alderman: StoryIR;
  let idesOfMarch: StoryIR;

  beforeAll(() => {
    fernhill = compileStory(CORPUS.fernhill);
    alderman = compileStory(CORPUS.alderman);
    idesOfMarch = compileStory(CORPUS.idesOfMarch);
  });

  it('finds what it currently finds in Fernhill', () => {
    expect(deriveIncomplete(fernhill).counts).toEqual({
      missingWord: 20,
      ambiguous: 9,
      noObject: 58,
    });
  });

  it('finds what it currently finds in the other two stories', () => {
    expect(deriveIncomplete(alderman).counts).toEqual({ missingWord: 4, ambiguous: 0, noObject: 36 });
    expect(deriveIncomplete(idesOfMarch).counts).toEqual({ missingWord: 7, ambiguous: 0, noObject: 30 });
  });

  it('names the sharpest missing-word cases ADR-321 quotes', () => {
    const { missingWord } = deriveIncomplete(fernhill);
    const byPhrase = new Map(missingWord.map((finding) => [finding.phrase, finding]));

    expect(byPhrase.get('hurricane lamp')).toMatchObject({ entity: 'oil-lamp', missing: ['hurricane'] });
    expect(byPhrase.get('long iron poker')).toMatchObject({ entity: 'furnace-poker', missing: ['iron'] });
  });

  it('reports the study door as ambiguous across the three real doors', () => {
    const { ambiguous } = deriveIncomplete(fernhill);
    expect(ambiguous).toContainEqual(
      expect.objectContaining({
        phrase: 'study door',
        candidates: expect.arrayContaining(['folly-door', 'pantry-door', 'cellar-door']),
      }),
    );
  });

  it('reports the four no-object cases ADR-321 quotes', () => {
    const phrases = new Set(deriveIncomplete(fernhill).noObject.map((finding) => finding.phrase));
    for (const phrase of ['scrollwork', 'keyhole', 'bolt', 'cache']) {
      expect(phrases).toContain(phrase);
    }
  });

  it('reads first-visit prose as well as the ordinary description', () => {
    const { noObject } = deriveIncomplete(fernhill);
    const firstVisit = noObject.filter((finding) => finding.where === 'iron-gates');
    expect(firstVisit.map((finding) => finding.phrase).sort()).toEqual(['cab', 'estate', 'lane', 'scrollwork']);
  });
});
