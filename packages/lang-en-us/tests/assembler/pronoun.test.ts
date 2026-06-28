/**
 * @file ADR-197 — Pronoun atom: case × number × gender resolution against the
 * last-mentioned referent (the reference seam), and graceful no-antecedent default.
 */

import { describe, it, expect } from 'vitest';
import type { Mentioned, NounPhrase, Phrase, Pronoun, RenderContext } from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';

const asm = new EnglishAssembler();

/** A render context with a real (in-memory) last-mentioned reference store. */
function makeCtx(): RenderContext {
  let last: Mentioned | undefined;
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings: {},
    narrative: { person: 'third' },
    reference: { lastMentioned: () => last, note: (m) => { last = m; } },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const render = (tree: Phrase): string =>
  asm.realize(tree, makeCtx()).flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');

const noun = (name: string, over: Partial<NounPhrase> = {}): NounPhrase => ({
  kind: 'noun', name, number: 'singular', articleType: 'definite', referableId: name, ...over,
});
const pron = (c: Pronoun['case']): Pronoun => ({ kind: 'pronoun', case: c });
const seq = (...parts: Phrase[]): Phrase => ({ kind: 'seq', parts });
const lit = (text: string): Phrase => ({ kind: 'literal', text });

/** "<noun>. <pronoun>" so the noun is noted before the pronoun resolves. */
const after = (n: NounPhrase, p: Pronoun): string => render(seq(n, lit('. '), p));

describe('Pronoun atom (ADR-197)', () => {
  it('AC-1: singular neuter referent → it/it/its/itself', () => {
    expect(after(noun('key'), pron('subject'))).toBe('the key. it');
    expect(after(noun('key'), pron('object'))).toBe('the key. it');
    expect(after(noun('key'), pron('possessive'))).toBe('the key. its');
    expect(after(noun('key'), pron('reflexive'))).toBe('the key. itself');
  });

  it('AC-2: plural referent → they/them/their', () => {
    const papers = noun('paper', { number: 'plural' });
    expect(after(papers, pron('subject'))).toBe('the papers. they');
    expect(after(papers, pron('object'))).toBe('the papers. them');
    expect(after(papers, pron('possessive'))).toBe('the papers. their');
  });

  it('AC-3: gendered via pronounSet → she/her/hers/herself, he/him/his', () => {
    const her = noun('woman', { pronounSet: 'she' });
    expect(after(her, pron('subject'))).toBe('the woman. she');
    expect(after(her, pron('object'))).toBe('the woman. her');
    expect(after(her, pron('possessive-pronoun'))).toBe('the woman. hers');
    expect(after(her, pron('reflexive'))).toBe('the woman. herself');
    const him = noun('man', { pronounSet: 'he' });
    expect(after(him, pron('object'))).toBe('the man. him');
    expect(after(him, pron('possessive'))).toBe('the man. his');
  });

  it('AC-4: tracks the MOST recently realized noun phrase', () => {
    const tree = seq(noun('troll'), lit(' drops '), noun('coin', { number: 'plural' }), lit('. '), pron('subject'));
    expect(render(tree)).toBe('the troll drops the coins. they'); // agrees with "coins", the last noun
  });

  it('AC-5: graceful — no antecedent → "it", no throw', () => {
    expect(render(pron('subject'))).toBe('it');
    expect(render(pron('possessive'))).toBe('its');
  });
});
