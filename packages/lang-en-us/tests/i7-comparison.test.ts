/**
 * @file Experiment (branch experiment/i7-text-comparison): render the Sharpee
 * equivalents of Inform 7 v10 complex text-output samples and assert the exact
 * output. Only the samples using IMPLEMENTED atoms appear here; the 🔜 future-atom
 * samples are documented in docs/work/experiments/i7-v10-text-comparison.md.
 */

import { describe, it, expect } from 'vitest';
import type { NarrativeAgreement, NounPhrase, Phrase, PhraseList, RenderContext } from '@sharpee/if-domain';
import { parsePhraseTemplate } from '../src/parser';
import { EnglishAssembler } from '../src/assembler';

const asm = new EnglishAssembler();

function makeCtx(params: Record<string, unknown>, narrative: NarrativeAgreement = { person: 'third' }): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative,
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

/** Author template + params → realized text (the runtime path, minus perspective). */
function render(template: string, params: Record<string, unknown> = {}, narrative?: NarrativeAgreement): string {
  const tree: Phrase = parsePhraseTemplate(template, params);
  return asm
    .realize(tree, makeCtx(params, narrative))
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('');
}

// Helpers to build phrase params the way a producer (nounPhraseFor / report layer) would.
const noun = (name: string, over: Partial<NounPhrase> = {}): NounPhrase => ({
  kind: 'noun',
  name,
  number: 'singular',
  articleType: 'indefinite',
  ...over,
});
const list = (conj: 'and' | 'or', ...items: Phrase[]): PhraseList => ({ kind: 'list', conj, items });

describe('Inform 7 v10 → Sharpee phrase algebra (implemented atoms)', () => {
  it('01 definite article — I7 "[The noun]"', () => {
    expect(render('{capitalize the item} is here.', { item: noun('cabinet', { articleType: 'definite' }) }))
      .toBe('The cabinet is here.');
  });

  it('02 indefinite a/an over the rendered head — I7 "[a noun]"', () => {
    expect(render('You see {a item}.', { item: noun('owl') })).toBe('You see an owl.');
    expect(render('You see {a item}.', { item: noun('goat') })).toBe('You see a goat.');
    expect(render('It takes {a item}.', { item: noun('hour') })).toBe('It takes an hour.');
    expect(render('At {a item}.', { item: noun('university') })).toBe('At a university.');
  });

  it('03 capitalized sentence-start indefinite — I7 "[A noun]"', () => {
    expect(render('{capitalize a item} blocks the way.', { item: noun('ogre') })).toBe('An ogre blocks the way.');
  });

  it('04 mass noun — I7 "[some water]"', () => {
    expect(render('There is {some stuff} here.', { stuff: noun('water', { number: 'mass', articleType: 'some' }) }))
      .toBe('There is some water here.');
  });

  it('05 proper noun, no article — I7 printed name of a proper-named thing', () => {
    expect(render('{who} smiles.', { who: noun('Aragorn', { properName: true, articleType: 'none', capitalize: true }) }))
      .toBe('Aragorn smiles.');
  });

  it('06 list with grouping + Oxford comma — I7 "[a list of things]"', () => {
    const items = list('and', noun('goat'), noun('goat'), noun('parrot'));
    expect(render('You can see {items} here.', { items })).toBe('You can see two goats and a parrot here.');
  });

  it('07 serial-comma toggle is an Assembler/locale setting (I7: "use the serial comma")', () => {
    // (serialComma is on in makeCtx; off-variant covered in the assembler suite)
    const items = list('and', noun('lamp', { articleType: 'definite' }), noun('key', { articleType: 'definite' }), noun('coin', { articleType: 'definite' }));
    expect(render('{items}', { items })).toBe('the lamp, the key, and the coin');
  });

  it('08 subject-verb agreement is/are — I7 adaptive "[regarding the noun][are]"', () => {
    expect(render('{capitalize the x} {verb:is x} locked.', { x: noun('door', { articleType: 'definite' }) }))
      .toBe('The door is locked.');
    expect(render('{capitalize the x} {verb:is x} locked.', { x: noun('gate', { number: 'plural', articleType: 'definite' }) }))
      .toBe('The gates are locked.');
  });

  it('09 coordinated subject → plural verb — I7 "[is-are]" over a list subject', () => {
    const subject = list('and', noun('troll', { articleType: 'definite' }), noun('goat', { number: 'plural', articleType: 'definite' }));
    expect(render('{subj} {verb:is subj} watching you.', { subj: subject })).toBe('the troll and the goats are watching you.');
  });

  it('10 second-person player verb — I7 "[We] [are]" in second person', () => {
    const player = noun('you', { referableId: 'player', articleType: 'none', properName: true });
    expect(render('{verb:is actor} carrying too much.', { actor: player }, { person: 'second', playerId: 'player' }))
      .toBe('are carrying too much.'); // subject pronoun supplied by the perspective layer; verb agrees 2nd-person
  });

  it('11 has/have agreement — I7 "[have]"', () => {
    expect(render('{capitalize the x} {verb:has x} a lid.', { x: noun('box', { articleType: 'definite' }) }))
      .toBe('The box has a lid.');
    expect(render('{capitalize the x} {verb:has x} lids.', { x: noun('box', { number: 'plural', articleType: 'definite' }) }))
      .toBe('The boxes have lids.');
  });

  it('12 static adjectives, article agrees over leading adjective — I7 "[a noun]" with printed adjectives', () => {
    expect(render('You find {a item}.', { item: noun('chest', { adjectives: ['small', 'iron'] }) }))
      .toBe('You find a small iron chest.');
    expect(render('You find {a item}.', { item: noun('box', { adjectives: ['old', 'empty'] }) }))
      .toBe('You find an old empty box.'); // "an" agrees over "old"
  });

  it('13 verbatim / preformatted pass-through — I7 "[fixed letter spacing]" banner', () => {
    const banner = '  *  *  *\n GAME OVER\n  *  *  *';
    const out = asm
      .realize(parsePhraseTemplate('{verbatim:banner}', { banner }), makeCtx({ banner }))
      .map((b) => b.content.map((c) => (typeof c === 'string' ? c : '')).join(''))
      .join('\n');
    expect(out).toBe(banner); // internal spaces preserved; newlines → blocks
  });

  it('14 regular verb agreement — I7 adaptive "[open]"/"[opens]"', () => {
    expect(render('{capitalize the x} {verb:opens x} slowly.', { x: noun('door', { articleType: 'definite' }) }))
      .toBe('The door opens slowly.');
    expect(render('{capitalize the x} {verb:opens x} slowly.', { x: noun('door', { number: 'plural', articleType: 'definite' }) }))
      .toBe('The doors open slowly.');
  });

  it('15 number-driven grouping uses spelled counts 2–10 — I7 "[number] in words" (partial)', () => {
    // The list authority already spells small counts; the standalone Numeral atom (ADR-198) is future.
    const items = list('and', noun('coin'), noun('coin'), noun('coin'));
    expect(render('{items}', { items })).toBe('three coins');
  });
});
