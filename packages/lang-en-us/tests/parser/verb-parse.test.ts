/**
 * @file ADR-199 — parsing the {verb:lemma subject} head into a Verb atom.
 *
 * Covers the parse rule (lemma + subject extraction), the parse-time unbound
 * check (AC-7/AC-11), the arity guard, and that legacy {is:x} stays rejected
 * (ADR-192 AC-8 clean break is preserved).
 */

import { describe, it, expect } from 'vitest';
import type { Verb, Sequence } from '@sharpee/if-domain';
import { parsePhraseTemplate, PhraseParseError } from '../../src/parser';

describe('parsePhraseTemplate — Verb atom (ADR-199)', () => {
  it('parses {verb:is target} into a Verb with lemma and subjectRef', () => {
    const tree = parsePhraseTemplate('{verb:is target}', { target: 'troll' }) as Verb;
    expect(tree).toEqual({ kind: 'verb', lemma: 'is', subjectRef: 'target' });
  });

  it('parses {verb:has goats} → lemma "has", subjectRef "goats"', () => {
    const tree = parsePhraseTemplate('{verb:has goats}', { goats: 'goats' }) as Verb;
    expect(tree).toMatchObject({ kind: 'verb', lemma: 'has', subjectRef: 'goats' });
  });

  it('embeds the Verb among literals and nouns in a mixed template', () => {
    const tree = parsePhraseTemplate('{capitalize the target} {verb:is target} dead.', { target: 'troll' }) as Sequence;
    expect(tree.kind).toBe('seq');
    const verbNode = tree.parts.find((p) => p.kind === 'verb') as Verb;
    expect(verbNode).toMatchObject({ kind: 'verb', lemma: 'is', subjectRef: 'target' });
  });

  it('throws PhraseParseError at parse time for an unbound verb subject (AC-11)', () => {
    expect(() => parsePhraseTemplate('{verb:is target}', {})).toThrow(PhraseParseError);
  });

  it('throws PhraseParseError when the verb head lacks a subject', () => {
    expect(() => parsePhraseTemplate('{verb:is}', { is: 'x' })).toThrow(PhraseParseError);
  });

  it('still rejects the legacy {is:target} chain at parse time (ADR-192 AC-8)', () => {
    expect(() => parsePhraseTemplate('{is:target}', { target: 'troll' })).toThrow(PhraseParseError);
  });
});
