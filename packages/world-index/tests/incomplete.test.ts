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
import { deriveIncomplete, extractNounPhrases, publishFilters, readsAsThing } from '../src/incomplete.js';
import { buildVocabularyIndex, entityVocabulary, resolvePhrase } from '../src/vocabulary.js';
import { collectProse } from '../src/prose.js';
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
    expect(deriveIncomplete(clean).counts).toEqual({ missingWord: 0, ambiguous: 0, noObject: 0, undescribed: 0 });
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
      site: expect.objectContaining({ owner: 'hall' }),
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
        site: expect.objectContaining({ owner: 'hall' }),
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
      expect.objectContaining({ site: expect.objectContaining({ owner: 'hall' }), phrase: 'scrollwork' }),
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

  /** The three classes, counted over the passages of one kind (D10). */
  function countsFrom(ir: StoryIR, source: 'description' | 'response') {
    const result = deriveIncomplete(ir);
    const of = (list: Array<{ site: { kind: string } }>) =>
      list.filter((finding) => (finding.site.kind === 'response') === (source === 'response')).length;
    return { missingWord: of(result.missingWord), ambiguous: of(result.ambiguous), noObject: of(result.noObject) };
  }

  // D10 SPLIT THE PIN IN TWO, and the description half is the regression that matters:
  // reading response prose must ADD findings, never move or lose one.
  //
  // THE FIGURES MOVED ONCE, deliberately, when the extractor stopped breaking phrases at
  // a hyphen and stopped reading a possessive as a name (2026-08-19). Both were reporting
  // things the author never wrote: `tiring-house door` is the door's own name, and no
  // player types "house's first play". Fernhill's descriptions went 20/9/58 → 27/10/51 —
  // the seven added missing-word findings are compound-adjective phrases the hyphen
  // boundary used to shred (*cast-iron estate boiler*, *long-handled primer plunger*,
  // *wooden-handled tin opener*), and the seven lost no-object rows are their fragments.
  it("finds in Fernhill's descriptions what the compound-aware extractor sees", () => {
    expect(countsFrom(fernhill, 'description')).toEqual({ missingWord: 27, ambiguous: 10, noObject: 48 });
  });

  it("finds in Fernhill's response prose what only D10 can see", () => {
    expect(countsFrom(fernhill, 'response')).toEqual({ missingWord: 3, ambiguous: 5, noObject: 67 });
    expect(deriveIncomplete(fernhill).counts).toEqual({
      missingWord: 30,
      ambiguous: 15,
      noObject: 115,
      undescribed: 0,
    });
  });

  // IDES OF MARCH MOVED ON 2026-08-20 because its AUTHOR moved it, not because this
  // extractor did: accepting two `+ word` offers in Chord Writer wrote `aka door, oak,
  // stout` and `aka ale, pot, leather, small` into the story, which is exactly what
  // those two findings asked for. Two missing-word rows became resolved edges (the
  // roles pin moved with them). A pin that drops when the author fixes what it
  // reported is the pin working.
  //
  // Ides of March is the case the section split exists for: 94 of its 113 passages are
  // response prose, so its candidate list is 7x its description list. Merged into one
  // list the description findings would be unfindable.
  it('finds what it currently finds in the other two stories, both halves', () => {
    expect(countsFrom(alderman, 'description')).toEqual({ missingWord: 5, ambiguous: 0, noObject: 30 });
    expect(countsFrom(alderman, 'response')).toEqual({ missingWord: 1, ambiguous: 0, noObject: 80 });

    expect(countsFrom(idesOfMarch, 'description')).toEqual({ missingWord: 3, ambiguous: 0, noObject: 27 });
    expect(countsFrom(idesOfMarch, 'response')).toEqual({ missingWord: 11, ambiguous: 1, noObject: 150 });
  });

  it('names the sharpest missing-word cases ADR-321 quotes', () => {
    const { missingWord } = deriveIncomplete(fernhill);
    const byPhrase = new Map(missingWord.map((finding) => [finding.phrase, finding]));

    expect(byPhrase.get('hurricane lamp')).toMatchObject({ entity: 'oil-lamp', missing: ['hurricane'] });
    expect(byPhrase.get('long iron poker')).toMatchObject({ entity: 'furnace-poker', missing: ['iron'] });
  });

  // A HYPHEN JOINS. The author writes *the tiring-house door* and that IS the door's
  // name; breaking at the hyphen made the analyzer blind to the compound and left the
  // IDE's own pass reporting a phrase — "tiring house door" — nobody ever wrote.
  it('reads a hyphenated compound as the one word the author wrote', () => {
    const phrases = extractNounPhrases('The tiring-house door stands west; the yard is south.');
    expect(phrases.map((found) => found.phrase)).toContain('tiring-house door');

    const { missingWord, noObject } = deriveIncomplete(idesOfMarch);
    const bogus = [...missingWord, ...noObject].filter((finding) => finding.phrase.includes('tiring house'));
    expect(bogus).toEqual([]);
  });

  // A POSSESSIVE NAMES ITS OWNER. No player types "house's first play", so reporting
  // the play-book for not answering to "house's" is a finding about nothing.
  it('stops a phrase at a possessive rather than naming one', () => {
    const phrases = extractNounPhrases("The house's first play is chalked on the plot-board.");
    expect(phrases.map((found) => found.phrase)).not.toContain("house's first play");

    const { missingWord } = deriveIncomplete(idesOfMarch);
    expect(missingWord.filter((finding) => finding.phrase.includes("'s"))).toEqual([]);
  });

  // NAMING HOW SOMETHING WAS DONE IS NOT NAMING A THING (Amendment 2). `No object`
  // is a class defined by a negative — "nothing answers to this" — so it catches every
  // noun in the prose that is not an object, which is most of English.
  it('does not report a manner or an act as a missing thing', () => {
    const { noObject, notThings } = deriveIncomplete(idesOfMarch);
    const phrases = noObject.map((finding) => finding.phrase);

    expect(phrases).not.toContain('flourish');
    expect(phrases).not.toContain('errand');
    expect(notThings).toBeGreaterThan(0);
  });

  // A STATUS CAN BE A THING (David's ruling). `knighthood`, `ladyship`, `fellowship`
  // look like the purest abstractions morphology can find — and a story can hand one
  // to the player, name it in prose, and mean an object. The `-ship`/`-hood` families
  // are dropped from the shape rule for this, not patched word by word.
  it('keeps a status the story could confer', () => {
    const thing = (word: string) => readsAsThing({ phrase: word, words: [word] });

    for (const status of ['knighthood', 'ladyship', 'lordship', 'fellowship',
                          'apprenticeship', 'priesthood']) {
      expect(thing(status), `${status} is a thing a story can give someone`).toBe(true);
    }

    const { noObject } = deriveIncomplete(idesOfMarch);
    expect(noObject.map((finding) => finding.phrase)).toContain('knighthood');
  });

  // THE COST OF THE RULE IS A ROW LOST, so it is drawn to lose as few as possible:
  // an unimplemented physical thing must survive it, whatever the sentence around it.
  it('keeps a physical thing the author has not implemented', () => {
    const thing = (phrase: string) => readsAsThing({ phrase, words: phrase.split(' ') });

    expect(thing('bolt')).toBe(true);
    expect(thing('coat pocket')).toBe(true);
    expect(thing('bright slot')).toBe(true);
    expect(thing('monument')).toBe(true);
    expect(thing('flourish')).toBe(false);
    expect(thing('hesitation')).toBe(false);
  });

  // THE PROPS WORDNET FILES UNDER `communication` AND `measure` (ADR-321 Amendment 2).
  // A deed is a piece of paper, a coin is metal, a ticket is card — every one is a
  // thing an interactive fiction hands the player, and every one is classed as an
  // abstraction by the lexicon. The three branches are dropped for exactly this.
  it('never suppresses a written prop or a coin', () => {
    const thing = (word: string) => readsAsThing({ phrase: word, words: [word] });

    for (const prop of ['coin', 'deed', 'ticket', 'receipt', 'playbill', 'warrant',
                        'charter', 'contract', 'passport', 'scroll', 'certificate']) {
      expect(thing(prop), `${prop} is a thing an author implements`).toBe(true);
    }
    // And the group branch, which is where the crowd stands.
    for (const gathering of ['crowd', 'audience', 'company']) {
      expect(thing(gathering), `${gathering} is scenery, not an abstraction`).toBe(true);
    }
  });

  // MORPHOLOGY READS SHAPE, AND SHAPE LIES. English gives physical objects abstract
  // endings freely — a potion is a liquid, a harness is leather, an airship flies.
  // The lexicon runs first for exactly this reason, and what it does not know, the
  // exception list must.
  it('keeps the physical nouns whose endings lie', () => {
    const thing = (word: string) => readsAsThing({ phrase: word, words: [word] });

    for (const object of ['potion', 'station', 'harness', 'wilderness', 'airship',
                          'audience', 'entrance', 'partition', 'instrument', 'parchment']) {
      expect(thing(object), `${object} is a thing, whatever its ending`).toBe(true);
    }
  });

  // THE LEXICON ANSWERS ON EVIDENCE, the suffix rule on shape, and the shape rule is
  // the one that survives words no dictionary lists — `-ness` attaches to any adjective,
  // so the class is open and 12,444 lemmas can only ever be a snapshot of it.
  it('reads a word no dictionary lists', () => {
    const thing = (word: string) => readsAsThing({ phrase: word, words: [word] });

    expect(thing('saltiness')).toBe(false);
    expect(thing('enterprisingness')).toBe(false);
    expect(thing('rhythmicity')).toBe(false);
  });

  // THE WIRE CARRIES THE ANSWERS, NEVER THE LEXICON. 12,444 words is ~180KB of JSON
  // on a document that describes one story; the IDE only ever asks about words this
  // story contains, so those are answered in advance and the dictionary stays here.
  it('publishes verdicts for this story rather than the lexicon', () => {
    const filters = publishFilters(collectProse(idesOfMarch));

    expect(filters.notThingHeads.length).toBeGreaterThan(0);
    expect(filters.notThingHeads.length).toBeLessThan(500);
    expect(JSON.stringify(filters.notThingHeads).length).toBeLessThan(8_000);
    expect(filters.notThingHeads).not.toContain('coin');
    expect(filters.notThingHeads.every((word) => !readsAsThing({ phrase: word, words: [word] }))).toBe(true);
  });

  // A THING IS A THING BY DEMONSTRATION. A story that implements `the flourish` as
  // an object never meets this rule: it is asked only of phrases that reached nothing.
  it('never suppresses a phrase that resolves', () => {
    const { edges } = deriveIncomplete(fernhill);
    expect(edges.length).toBeGreaterThan(0);
    expect(edges.every((edge) => edge.phrase.length > 0)).toBe(true);
  });

  // THE FOURTH CLASS (Amendment 3): declared, and says nothing.
  //
  // A candidate, never an error — Chord compiles and plays without a word of
  // description, and *"You see nothing special about the sign"* is a fine answer for
  // a thing that exists to be mentioned. It exists because the IDE can now CREATE
  // things: the surface that writes a declaration and stops at the description is the
  // one that should remember the hole.
  it('reports a thing that says nothing, and excludes what is never examined', () => {
    const story = compileSource(`${ROOMS}
create the bankside sign
  scenery
  in the Hall

create the lantern
  in the Hall

  A tin lantern.
`);

    const { undescribed, counts } = deriveIncomplete(story);
    expect(undescribed).toContain('bankside-sign');
    expect(undescribed).not.toContain('lantern');
    expect(undescribed).not.toContain('hall');
    expect(undescribed).not.toContain('player');
    expect(counts.undescribed).toBe(undescribed.length);
  });

  // The corpus is well described, and that is the pin: a class that fires on a clean
  // story is a class nobody will trust when it fires on a dirty one.
  it('finds nothing to report in two finished stories', () => {
    expect(deriveIncomplete(fernhill).undescribed).toEqual([]);
    expect(deriveIncomplete(idesOfMarch).undescribed).toEqual([]);
  });

  // SAY WHICH WORD REACHED IT (Amendment 2). The target is otherwise an assertion the
  // reader cannot check: `play-book` for *roman play* is arbitrary until the row says
  // the head word `play` is the one in its vocabulary.
  it('carries the word that reached the target', () => {
    const { missingWord } = deriveIncomplete(fernhill);
    const lamp = missingWord.find((finding) => finding.phrase === 'hurricane lamp');
    expect(lamp).toMatchObject({ entity: 'oil-lamp', matched: 'lamp' });
    expect(missingWord.every((finding) => finding.knownAs.includes(finding.matched))).toBe(true);
  });

  // SAY WHERE, EXACTLY (Amendment 2). A description spans several lines and the phrase
  // sits in one of them; publishing only the first line can only ever select the wrong
  // one. Stage's description runs 34-38 and holds *tiring-house door* on 37.
  it('publishes the whole passage span, not its first line', () => {
    const stage = deriveIncomplete(idesOfMarch)
      .edges.map((edge) => edge.site)
      .find((site) => site.key === 'stage.description');

    expect(stage?.span).toMatchObject({ line: 34, endLine: 38 });
    expect(stage?.span?.endLine).toBeGreaterThan(stage?.span?.line ?? 0);
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
    const firstVisit = noObject.filter((finding) => finding.site.kind === 'first-visit');
    expect(firstVisit.map((finding) => finding.phrase).sort()).toEqual(['cab', 'estate', 'lane']);
  });

  // D10: the passage, not the entity, is the unit — and both attribution fields are
  // independently optional, which is why the phrase key is the attribution of record.
  it('reads response prose and attributes it to the clause that fires it', () => {
    const findings = [...deriveIncomplete(fernhill).noObject, ...deriveIncomplete(fernhill).ambiguous];
    const responses = findings.filter((finding) => finding.site.kind === 'response');
    expect(responses.length).toBeGreaterThan(0);

    const fired = responses.find((finding) => finding.site.firedBy !== null);
    expect(fired?.site.firedBy).toMatch(/^(on|after|before|topic|action)\b/);
    expect(fired?.site.key).not.toBe('');

    // Story-level prose hangs off no entity at all — 22 of Fernhill's passages.
    expect(responses.some((finding) => finding.site.owner === null)).toBe(true);
  });
});
