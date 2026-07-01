/**
 * @file ADR-199 — Verb atom subject agreement through the Assembler.
 *
 * Exercises the Agreement authority's verb case: is/are, was/were, has/have, the
 * regular `-s` rule, PhraseList and mass subjects, person handling (2nd-person
 * player), the graceful no-number default, and determinism.
 *
 * AC map (ADR-199): AC-1 is/are, AC-2 was/has, AC-3 regular, AC-4 list→plural,
 * AC-5 mass→singular, AC-6 person, AC-7 graceful default, AC-11 determinism.
 */

import { describe, it, expect } from 'vitest';
import type { NarrativeAgreement, NounPhrase, Phrase, PhraseList, RenderContext, Verb } from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';

// --- harness ---------------------------------------------------------------

/** A render context whose params carry the subjects a Verb agrees with. */
function makeCtx(params: Record<string, unknown> = {}, narrative: NarrativeAgreement = { person: 'third' }): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: {},
    narrative,
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const asm = new EnglishAssembler();

/** Realize a tree and return its single block's flattened text. */
function render(tree: Phrase, params?: Record<string, unknown>, narrative?: NarrativeAgreement): string {
  const blocks = asm.realize(tree, makeCtx(params, narrative));
  return blocks[0].content.map((c) => (typeof c === 'string' ? c : '⟦deco⟧')).join('');
}

const verb = (lemma: string, subjectRef: string, person?: Verb['person']): Verb =>
  person ? { kind: 'verb', lemma, subjectRef, person } : { kind: 'verb', lemma, subjectRef };

const noun = (name: string, over: Partial<NounPhrase> = {}): NounPhrase => ({
  kind: 'noun',
  name,
  number: 'singular',
  articleType: 'definite',
  ...over,
});

const list = (...items: Phrase[]): PhraseList => ({ kind: 'list', conj: 'and', items });

// --- tests -----------------------------------------------------------------

describe('Verb agreement (ADR-199)', () => {
  it('AC-1: {verb:is target} → "is" singular, "are" plural', () => {
    expect(render(verb('is', 'target'), { target: noun('troll') })).toBe('is');
    expect(render(verb('is', 'target'), { target: noun('goats', { number: 'plural' }) })).toBe('are');
  });

  it('AC-2: was/were and has/have', () => {
    expect(render(verb('was', 'x'), { x: noun('troll') })).toBe('was');
    expect(render(verb('was', 'x'), { x: noun('goats', { number: 'plural' }) })).toBe('were');
    expect(render(verb('has', 'x'), { x: noun('troll') })).toBe('has');
    expect(render(verb('has', 'x'), { x: noun('goats', { number: 'plural' }) })).toBe('have');
  });

  it('AC-3: regular verb strips the 3rd-singular -s for the plain form', () => {
    expect(render(verb('opens', 'door'), { door: noun('door') })).toBe('opens');
    expect(render(verb('opens', 'door'), { door: noun('doors', { number: 'plural' }) })).toBe('open');
  });

  it('AC-4: a PhraseList subject with multiple items takes the plural form', () => {
    const subject = list(noun('troll'), noun('goats', { number: 'plural' }));
    expect(render(verb('is', 's'), { s: subject })).toBe('are');
  });

  it('AC-4: a single-item PhraseList agrees with that item', () => {
    expect(render(verb('is', 's'), { s: list(noun('troll')) })).toBe('is');
  });

  it('AC-5: a mass subject agrees as singular', () => {
    expect(render(verb('is', 'w'), { w: noun('water', { number: 'mass', articleType: 'some' }) })).toBe('is');
  });

  it('AC-6: person — 2nd-person subject takes the plural form ("you are")', () => {
    expect(render(verb('is', 'actor'), { actor: noun('you', { person: 'second' }) })).toBe('are');
    expect(render(verb('is', 'actor'), { actor: noun('dwarf', { person: 'third' }) })).toBe('is');
  });

  it('AC-6: person — 1st-person singular suppletive ("I am", "I was")', () => {
    expect(render(verb('is', 'me'), { me: noun('I', { person: 'first' }) })).toBe('am');
    expect(render(verb('was', 'me'), { me: noun('I', { person: 'first' }) })).toBe('was');
  });

  it('AC-6 case B: the player subject (referableId === playerId) takes the narrative person', () => {
    // 2nd-person narration: the player subject → "you are" even with no explicit person stamp.
    const player = noun('you', { referableId: 'player' });
    expect(render(verb('is', 'actor'), { actor: player }, { person: 'second', playerId: 'player' })).toBe('are');
    // A non-player subject in the same turn is unaffected → "is".
    const dwarf = noun('dwarf', { referableId: 'dwarf' });
    expect(render(verb('is', 'actor'), { actor: dwarf }, { person: 'second', playerId: 'player' })).toBe('is');
    // 3rd-person narration: even the player subject is third → "is".
    expect(render(verb('is', 'actor'), { actor: player }, { person: 'third', playerId: 'player' })).toBe('is');
  });

  it('the subject person overrides the Verb-declared person', () => {
    // Verb declares third, but the subject is second → subject wins.
    expect(render(verb('is', 'actor', 'third'), { actor: noun('you', { person: 'second' }) })).toBe('are');
  });

  it('AC-7: a subject with no number renders the unmarked "is" and does not throw', () => {
    expect(render(verb('is', 'thing'), { thing: { kind: 'literal', text: 'everything' } })).toBe('is');
    // A bare string param (no agreement surface) also degrades to singular.
    expect(render(verb('is', 'thing'), { thing: 'everything' })).toBe('is');
  });

  it('realizes in a sequence against a sibling noun ("The troll is dead.")', () => {
    const tree: Phrase = {
      kind: 'seq',
      parts: [noun('troll', { capitalize: true }), { kind: 'literal', text: ' ' }, verb('is', 'target'), { kind: 'literal', text: ' dead.' }],
    };
    expect(render(tree, { target: noun('troll') })).toBe('The troll is dead.');
  });

  it('AC-11: determinism — identical (tree, ctx) → identical surface', () => {
    const tree = verb('is', 'target');
    const params = { target: noun('goats', { number: 'plural' }) };
    const a = render(tree, params);
    const b = render(tree, params);
    expect(a).toBe(b);
    expect(a).toBe('are');
  });
});

// --- ADR-204: verb-pluralization heuristic (-se/-ze stems + -ie closed set) -----

describe('Verb pluralization heuristic (ADR-204)', () => {
  /** Plural surface for a 3sg lemma: render {verb:lemma s} against a plural subject. */
  const plural = (lemma: string): string =>
    render(verb(lemma, 's'), { s: noun('twins', { number: 'plural' }) });
  /** Singular surface: the authored lemma is returned unchanged. */
  const singular = (lemma: string): string =>
    render(verb(lemma, 's'), { s: noun('one') });

  it('AC-1: -se/-ze stems strip only -s (not -es)', () => {
    const cases: Array<[string, string]> = [
      ['uses', 'use'], ['refuses', 'refuse'], ['raises', 'raise'], ['closes', 'close'],
      ['collapses', 'collapse'], ['freezes', 'freeze'], ['loses', 'lose'],
      ['chooses', 'choose'], ['releases', 'release'],
    ];
    for (const [lemma, want] of cases) {
      expect(plural(lemma), `${lemma} → plural`).toBe(want);
      expect(singular(lemma), `${lemma} → singular`).toBe(lemma); // singular unchanged
    }
  });

  it('AC-2: genuine -es inflections (doubled sibilant / x·ch·sh) still strip -es', () => {
    const cases: Array<[string, string]> = [
      ['kisses', 'kiss'], ['misses', 'miss'], ['passes', 'pass'], ['boxes', 'box'],
      ['buzzes', 'buzz'], ['watches', 'watch'], ['pushes', 'push'], ['approaches', 'approach'],
    ];
    for (const [lemma, want] of cases) expect(plural(lemma), lemma).toBe(want);
  });

  it('AC-3: unaffected classes unchanged (-s, -ces, -ges, -y)', () => {
    const cases: Array<[string, string]> = [
      ['opens', 'open'], ['dances', 'dance'], ['notices', 'notice'], ['changes', 'change'],
      ['carries', 'carry'], ['cries', 'cry'], ['flies', 'fly'],
    ];
    for (const [lemma, want] of cases) expect(plural(lemma), lemma).toBe(want);
  });

  it('AC-3a: the -ie closed set resolves via IRREGULAR_VERBS', () => {
    const cases: Array<[string, string]> = [
      ['dies', 'die'], ['lies', 'lie'], ['ties', 'tie'], ['vies', 'vie'],
    ];
    for (const [lemma, want] of cases) {
      expect(plural(lemma), `${lemma} → plural`).toBe(want);
      expect(singular(lemma), `${lemma} → singular`).toBe(lemma);
    }
  });
});
