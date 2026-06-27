/**
 * @file ADR-192 Phase 3 — parsePhraseTemplate parsing + rejection contract.
 *
 * Covers AC-8 (legacy `:`-chain rejected) and AC-11 (unknown kind-prefix and
 * unbound param rejected at parse time), plus the round-trip parsing of bare /
 * hinted NounPhrase placeholders, kind-head routing, and end-to-end realization
 * through the Assembler.
 */

import { describe, it, expect } from 'vitest';
import type { Phrase, NounPhrase, Sequence, RenderContext, LocaleSettings } from '@sharpee/if-domain';
import { parsePhraseTemplate, PhraseParseError } from '../../src/parser';
import { EnglishAssembler } from '../../src/assembler';

function makeCtx(settings: LocaleSettings = {}): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings,
    narrative: { person: 'third' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const asm = new EnglishAssembler();
const realize = (tree: Phrase): string =>
  asm.realize(tree, makeCtx())[0].content.map((c) => (typeof c === 'string' ? c : '⟦deco⟧')).join('');

// --- bare / hinted NounPhrase parsing --------------------------------------

describe('NounPhrase placeholders', () => {
  it('bare {item} (string value) → indefinite NounPhrase', () => {
    const tree = parsePhraseTemplate('{item}', { item: 'cabinet' }) as NounPhrase;
    expect(tree.kind).toBe('noun');
    expect(tree.articleType).toBe('indefinite');
    expect(tree.name).toBe('cabinet');
    expect(realize(tree)).toBe('a cabinet');
  });

  it('{the item} → definite article hint', () => {
    const tree = parsePhraseTemplate('{the item}', { item: 'cabinet' }) as NounPhrase;
    expect(tree.articleType).toBe('definite');
    expect(realize(tree)).toBe('the cabinet');
  });

  it('{some item} → partitive hint', () => {
    expect(realize(parsePhraseTemplate('{some item}', { item: 'sand' }))).toBe('some sand');
  });

  it('{capitalize the item} → definite + capitalize', () => {
    const tree = parsePhraseTemplate('{capitalize the item}', { item: 'cabinet' }) as NounPhrase;
    expect(tree.articleType).toBe('definite');
    expect(tree.capitalize).toBe(true);
    expect(realize(tree)).toBe('The cabinet');
  });

  it('a hint overrides the articleType of a bound NounPhrase value', () => {
    const bound: NounPhrase = { kind: 'noun', name: 'owl', number: 'singular', articleType: 'indefinite' };
    const tree = parsePhraseTemplate('{the item}', { item: bound }) as NounPhrase;
    expect(tree.articleType).toBe('definite');
    expect(realize(tree)).toBe('the owl');
  });

  it('mixes literal text and a placeholder into a Sequence', () => {
    const tree = parsePhraseTemplate('You take {the item}.', { item: 'lamp' }) as Sequence;
    expect(tree.kind).toBe('seq');
    expect(realize(tree)).toBe('You take the lamp.');
  });

  it('a pure-literal template parses to a single Literal', () => {
    const tree = parsePhraseTemplate('You see nothing special.', {});
    expect(tree.kind).toBe('literal');
    expect(realize(tree)).toBe('You see nothing special.');
  });
});

// --- kind-head routing ------------------------------------------------------

describe('kind-head routing to reserved stub kinds', () => {
  const cases: Array<[string, Phrase['kind']]> = [
    ['{pronoun:it}', 'pronoun'],
    ['{number:coins words}', 'number'],
    ['{contents:box}', 'contents'],
    ['{slot:detail}', 'slot'],
    ['{verbatim:banner}', 'verbatim'],
  ];
  for (const [template, kind] of cases) {
    it(`${template} → kind '${kind}'`, () => {
      expect(parsePhraseTemplate(template, {}).kind).toBe(kind);
    });
  }
});

// --- AC-8: legacy ':'-chain rejected ---------------------------------------

describe('AC-8: legacy :-chain syntax is rejected at parse time', () => {
  it('{cap:the:item} throws PhraseParseError naming the token', () => {
    expect(() => parsePhraseTemplate('{cap:the:item}', { item: 'x' })).toThrow(PhraseParseError);
    try {
      parsePhraseTemplate('{cap:the:item}', { item: 'x' });
    } catch (e) {
      expect((e as PhraseParseError).offendingToken).toBe('cap:the:item');
      expect((e as PhraseParseError).message).toContain('cap');
    }
  });

  it('{the:item} (legacy single chain) is rejected — "the" is not a kind prefix', () => {
    expect(() => parsePhraseTemplate('{the:item}', { item: 'x' })).toThrow(PhraseParseError);
  });
});

// --- AC-11: unknown kind-prefix and unbound param ---------------------------

describe('AC-11: parse-time rejection (never a silent Empty)', () => {
  it('unknown kind-prefix throws, naming the prefix', () => {
    expect(() => parsePhraseTemplate('{unknownkind:foo}', {})).toThrow(PhraseParseError);
    try {
      parsePhraseTemplate('{unknownkind:foo}', {});
    } catch (e) {
      expect((e as PhraseParseError).message).toContain('unknownkind');
    }
  });

  it('unbound param throws, naming the param', () => {
    expect(() => parsePhraseTemplate('{the unbound_param}', {})).toThrow(PhraseParseError);
    try {
      parsePhraseTemplate('{the unbound_param}', {});
    } catch (e) {
      expect((e as PhraseParseError).offendingToken).toBe('unbound_param');
      expect((e as PhraseParseError).message).toContain('unbound_param');
    }
  });

  it('unknown leading hint throws, naming the hint', () => {
    expect(() => parsePhraseTemplate('{frobnicate item}', { item: 'x' })).toThrow(PhraseParseError);
  });
});
