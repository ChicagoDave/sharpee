/**
 * @file quote-pronoun-parse.test.ts
 * @description ADR-201 Phase 5 — parser surface: `{quote:utterance}` and
 *   `{capitalize pronoun:case}`, parse-time rejections (AC-10), and an
 *   end-to-end round-trip through the Assembler.
 *
 * AC map (ADR-201): AC-1 (parser half — `{capitalize pronoun:…}` legal),
 * AC-2 (parser half — `{quote:…}` parses), AC-10 (parse-time rejection of an
 * unbound/missing quote param, an unknown pronoun case, `capitalize` on a
 * non-pronoun kind, and `{sentence:…}`).
 */

import { describe, it, expect } from 'vitest';
import type { Mentioned, NounPhrase, Phrase, RenderContext } from '@sharpee/if-domain';
import { parsePhraseTemplate, PhraseParseError } from '../../src/parser';
import { EnglishAssembler } from '../../src/assembler';

describe('parser: {quote:…} (ADR-201 §5, AC-2)', () => {
  it('parses a bound scalar utterance into a Quote over a Literal', () => {
    const tree = parsePhraseTemplate('{quote:line}', { line: 'hello' });
    expect(tree).toEqual({ kind: 'quote', utterance: { kind: 'literal', text: 'hello' } });
  });

  it('uses a bound Phrase value as the utterance directly', () => {
    const choice: Phrase = { kind: 'choice', alternatives: [{ kind: 'literal', text: 'hi' }], selector: 'cycling', entityId: 'e', messageKey: 'm' };
    const tree = parsePhraseTemplate('{quote:line}', { line: choice });
    expect(tree).toEqual({ kind: 'quote', utterance: choice });
  });

  it('accepts an optional trailing terminal', () => {
    expect(parsePhraseTemplate('{quote:line ?}', { line: 'really' }))
      .toEqual({ kind: 'quote', utterance: { kind: 'literal', text: 'really' }, terminal: '?' });
  });

  it('rejects {quote:} with no utterance param at parse time (AC-10)', () => {
    expect(() => parsePhraseTemplate('{quote:}', {})).toThrow(PhraseParseError);
  });

  it('rejects an unbound utterance param, naming it (AC-10)', () => {
    expect(() => parsePhraseTemplate('{quote:missing}', {})).toThrow(/missing/);
  });

  it('rejects an unknown trailing terminal token (AC-10)', () => {
    expect(() => parsePhraseTemplate('{quote:line ;}', { line: 'x' })).toThrow(PhraseParseError);
  });
});

describe('parser: {capitalize pronoun:case} (ADR-201 §5, AC-1)', () => {
  it('parses to a Pronoun with capitalize: true', () => {
    expect(parsePhraseTemplate('{capitalize pronoun:subject}', {}))
      .toEqual({ kind: 'pronoun', case: 'subject', capitalize: true });
  });

  it('still parses a plain {pronoun:object} without capitalize', () => {
    expect(parsePhraseTemplate('{pronoun:object}', {}))
      .toEqual({ kind: 'pronoun', case: 'object' });
  });

  it('rejects an unknown pronoun case at parse time (AC-10)', () => {
    expect(() => parsePhraseTemplate('{capitalize pronoun:bogus}', {})).toThrow(PhraseParseError);
  });
});

describe('parser: capitalize is rejected on non-pronoun kinds (AC-10)', () => {
  it('rejects {capitalize number:coins} with a clear message', () => {
    expect(() => parsePhraseTemplate('{capitalize number:coins}', { coins: 3 }))
      .toThrow(/capitalize is not a valid modifier for 'number'/);
  });

  it('rejects {capitalize verb:says target}', () => {
    expect(() => parsePhraseTemplate('{capitalize verb:says target}', { target: 'x' }))
      .toThrow(/capitalize is not a valid modifier for 'verb'/);
  });

  it('rejects {capitalize quote:line}', () => {
    expect(() => parsePhraseTemplate('{capitalize quote:line}', { line: 'x' }))
      .toThrow(/capitalize is not a valid modifier for 'quote'/);
  });
});

describe('parser: {sentence:…} is not author-facing (AC-10)', () => {
  it('rejects {sentence:content} at parse time', () => {
    expect(() => parsePhraseTemplate('{sentence:content}', { content: 'x' }))
      .toThrow(/not an author-facing kind prefix/);
  });
});

describe('end-to-end: dialogue template round-trips through the Assembler', () => {
  const noun = (name: string, over: Partial<NounPhrase> = {}): NounPhrase =>
    ({ kind: 'noun', name, number: 'singular', articleType: 'definite', ...over });

  function makeCtx(params: Record<string, unknown>, ref?: Mentioned): RenderContext {
    const store = new Map<string, number>();
    return {
      world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
      params,
      settings: { serialComma: true },
      narrative: { person: 'third' },
      reference: { lastMentioned: () => ref, note: () => undefined },
      textState: { get: (e, k) => store.get(`${e} ${k}`), set: (e, k, v) => void store.set(`${e} ${k}`, v) },
      contribute: () => undefined,
    };
  }

  it('{capitalize pronoun:subject} {verb:says speaker}, {quote:line} → He says, "Hello."', () => {
    const params = { speaker: noun('narrator'), line: 'hello' };
    const tree = parsePhraseTemplate('{capitalize pronoun:subject} {verb:says speaker}, {quote:line}', params);
    const text = new EnglishAssembler()
      .realize(tree, makeCtx(params, { number: 'singular', pronounSet: 'he' } as Mentioned))
      .flatMap((b) => b.content)
      .map((c) => (typeof c === 'string' ? c : '⟦deco⟧'))
      .join('');
    expect(text).toBe('He says, "Hello."');
  });

  it('a plural speaker still agrees: They say, "Hello."', () => {
    const params = { speaker: noun('twins', { number: 'plural' }), line: 'hello' };
    const tree = parsePhraseTemplate('{capitalize pronoun:subject} {verb:says speaker}, {quote:line}', params);
    const text = new EnglishAssembler()
      .realize(tree, makeCtx(params, { number: 'plural', pronounSet: 'they' } as Mentioned))
      .flatMap((b) => b.content)
      .map((c) => (typeof c === 'string' ? c : '⟦deco⟧'))
      .join('');
    expect(text).toBe('They say, "Hello."');
  });
});
