/**
 * verb-phrase.test.ts — the verb and the preposition come from the rule's
 * matched literals, and a failure's question reads the seats of what is
 * missing (ADR-383 D7, D8; parser review step 3, Phase 6), on the REAL
 * `EnglishParser` with the standard grammar. The vocabulary's verb and
 * preposition tags decide neither; a slot's name never decides which
 * object a failure asks for.
 */
import { describe, it, expect, beforeEach } from 'vitest';
import { EnglishParser } from '../src/english-parser';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';

describe('the verb phrase and preposition are the rule`s matched literals', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  function structureOf(input: string) {
    const result = parser.parse(input);
    if (!result.success) throw new Error(`${input}: did not parse`);
    return result.value.structure;
  }

  it('`examine light` has the verb `examine`, though `light` is also a verb', () => {
    expect(parser.getVocabularyRegistry().hasWord('light', 'verb' as never)).toBe(true);
    expect(structureOf('examine light').verb).toEqual({ tokens: [0], text: 'examine', head: 'examine' });
  });

  it('a story verb the vocabulary does not tag keeps its own word', () => {
    parser.getStoryGrammar().define('frob :target').mapsTo('story.frobbing').build();
    expect(parser.getVocabularyRegistry().hasWord('frob', 'verb' as never)).toBe(false);
    expect(structureOf('frob lamp').verb).toEqual({ tokens: [0], text: 'frob', head: 'frob' });
  });

  it('a two-word verb is the whole phrase: `pick up lamp` has the verb `pick up`', () => {
    expect(structureOf('pick up lamp').verb).toMatchObject({ tokens: [0, 1], text: 'pick up', head: 'pick' });
  });

  it('the preposition is the literal between the two seats: `put coin in box` has `in`', () => {
    expect(structureOf('put coin in box').preposition).toEqual({ tokens: [2], text: 'in' });
  });

  it('a multi-word preposition is every word between the seats: `stack coin on top of box`', () => {
    parser.getStoryGrammar().define('stack :item on top of :base').mapsTo('story.stacking').build();
    expect(structureOf('stack coin on top of box').preposition).toEqual({ tokens: [2, 3, 4], text: 'on top of' });
  });

  it('an indirect-first rule finds its preposition between the seats, and a trailing literal is not it', () => {
    parser.getStoryGrammar().define('tip :recipient with :coin today').seat('coin', 'direct').mapsTo('story.tipping').build();
    const structure = structureOf('tip bob with coin today');
    expect(structure.directObject?.text).toBe('coin');
    expect(structure.preposition).toEqual({ tokens: [2], text: 'with' });
  });

  it('a recipient-first line has no preposition: `give bob coin`', () => {
    const structure = structureOf('give bob coin');
    expect(structure.directObject?.text).toBe('coin');
    expect(structure.preposition).toBeUndefined();
  });
});

describe('a failure asks for the object its missing seats name', () => {
  let parser: EnglishParser;

  beforeEach(() => {
    parser = new EnglishParser(new EnglishLanguageProvider());
  });

  function errorOf(input: string) {
    const result = parser.parse(input);
    if (result.success) throw new Error(`${input}: parsed as ${result.value.action}`);
    return result.error;
  }

  it('`pick up` alone asks what to pick up', () => {
    expect(errorOf('pick up')).toMatchObject({ code: 'MISSING_OBJECT', verb: 'pick up' });
  });

  it('`close` alone asks what to close, though its slot is named `door`', () => {
    expect(errorOf('close')).toMatchObject({ code: 'MISSING_OBJECT', verb: 'close' });
  });

  it('a TS rule whose first slot is named `door` reports a missing direct object', () => {
    parser.getStoryGrammar().define('bash :door').mapsTo('story.bashing').build();
    expect(errorOf('bash')).toMatchObject({ code: 'MISSING_OBJECT', verb: 'bash' });
  });

  it('`give` alone asks the direct question, though `give :recipient :item` opens with the indirect seat', () => {
    expect(errorOf('give')).toMatchObject({ code: 'MISSING_OBJECT', verb: 'give' });
  });

  it('`put coin` still asks for the indirect object', () => {
    expect(errorOf('put coin')).toMatchObject({ code: 'MISSING_INDIRECT', verb: 'put' });
  });

  it('the verb phrase stops at the first slot: `put coin in` asks about `put`, not `put in`', () => {
    expect(errorOf('put coin in')).toMatchObject({ code: 'MISSING_INDIRECT', verb: 'put', slot: 'container' });
  });

  it('an optional direct slot after the failure point is not missing: `flourish at` against `flourish at :crowd [:flag]` asks for the crowd', () => {
    parser.getStoryGrammar().define('flourish at :crowd [:flag]').seat('flag', 'direct').mapsTo('story.flourishing').build();
    expect(errorOf('flourish at')).toMatchObject({ code: 'MISSING_INDIRECT', verb: 'flourish at', slot: 'crowd' });
  });
});
