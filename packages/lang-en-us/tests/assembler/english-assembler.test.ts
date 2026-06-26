/**
 * @file ADR-192 Phase 2 — English Assembler realization.
 *
 * Exercises the five foundational kinds and the ADR-190 list parity through the
 * phrase path (not the old formatter chain), the named-error refusal of the
 * seven stub kinds, determinism, and the AC-10 boundary regression guard.
 *
 * AC map (ADR-192): AC-1 literal round-trip, AC-2 definite article, AC-3 a/an
 * agreement, AC-4 static adjectives, AC-5 list parity (ADR-190), AC-6 Empty
 * absorption, AC-7 ITextBlock[] contract, AC-9 determinism, AC-10 boundary.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import type {
  Phrase,
  Literal,
  NounPhrase,
  PhraseList,
  Sequence,
  Empty,
  RenderContext,
  LocaleSettings,
} from '@sharpee/if-domain';
import { EnglishAssembler, ASSEMBLER_DEFAULT_BLOCK_KEY, PhraseNotImplementedError } from '../../src/assembler';

// --- harness ---------------------------------------------------------------

function makeCtx(settings: LocaleSettings = {}): RenderContext {
  const noted: string[] = [];
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings,
    reference: { lastMentioned: () => noted[noted.length - 1], note: (id) => void noted.push(id) },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const asm = new EnglishAssembler();

/** Realize a tree and return its single block's flattened text. */
function render(tree: Phrase, settings?: LocaleSettings): string {
  const blocks = asm.realize(tree, makeCtx(settings));
  expect(blocks).toHaveLength(1);
  return blocks[0].content.map((c) => (typeof c === 'string' ? c : '⟦deco⟧')).join('');
}

const lit = (text: string, whitespace?: 'verbatim'): Literal => ({ kind: 'literal', text, ...(whitespace ? { whitespace } : {}) });
const np = (name: string, extra: Partial<NounPhrase> = {}): NounPhrase => ({ kind: 'noun', name, number: 'singular', articleType: 'indefinite', ...extra });
const list = (items: Phrase[], conj: 'and' | 'or' = 'and'): PhraseList => ({ kind: 'list', items, conj });
const seq = (parts: Phrase[]): Sequence => ({ kind: 'seq', parts });
const empty: Empty = { kind: 'empty' };

// --- foundational kinds ----------------------------------------------------

describe('AC-1: Literal round-trip', () => {
  it('passes literal text through byte-identical', () => {
    expect(render(lit('You see a lamp.'))).toBe('You see a lamp.');
  });
});

describe('AC-2 / AC-3: article authority over the rendered head', () => {
  it('AC-2: definite article', () => {
    expect(render(np('cabinet', { articleType: 'definite' }))).toBe('the cabinet');
  });

  it('AC-3: a/an agrees over the leading sound', () => {
    expect(render(np('owl'))).toBe('an owl');
    expect(render(np('goat'))).toBe('a goat');
    expect(render(np('hour'))).toBe('an hour');
  });

  it('proper names suppress the article; mass takes "some"', () => {
    expect(render(np('Alice', { properName: true, articleType: 'none' }))).toBe('Alice');
    expect(render(np('sand', { number: 'mass', articleType: 'some' }))).toBe('some sand');
  });
});

describe('AC-4: static adjectives, article agrees over leading adjective', () => {
  it('renders adjectives before the noun', () => {
    expect(render(np('chest', { adjectives: ['small', 'iron'] }))).toBe('a small iron chest');
  });

  it('article agrees over the leading adjective, not the noun', () => {
    expect(render(np('apple', { adjectives: ['old'] }))).toBe('an old apple');
    expect(render(np('owl', { adjectives: ['brown'] }))).toBe('a brown owl');
  });
});

describe('Case authority: the capitalize hint upper-cases the rendered head', () => {
  it('capitalizes the article when present', () => {
    expect(render(np('cabinet', { articleType: 'definite', capitalize: true }))).toBe('The cabinet');
  });

  it('capitalizes the leading adjective, not the noun', () => {
    expect(render(np('chest', { adjectives: ['small'], capitalize: true }))).toBe('A small chest');
  });

  it('is off by default (author case preserved)', () => {
    expect(render(np('cabinet', { articleType: 'definite' }))).toBe('the cabinet');
  });
});

// --- AC-5: ADR-190 list parity through the phrase path ---------------------

describe('AC-5: PhraseList parity with ADR-190 (through the phrase path)', () => {
  it('AC-190.1: empty list → "nothing"', () => {
    expect(render(list([]))).toBe('nothing');
  });

  it('AC-190.2: single common noun gets a/an', () => {
    expect(render(list([np('goat')]))).toBe('a goat');
    expect(render(list([np('apple')]))).toBe('an apple');
  });

  it('AC-190.3: two items join with "and", no serial comma', () => {
    expect(render(list([np('goat'), np('parrot')]))).toBe('a goat and a parrot');
  });

  it('AC-190.4: three items use the Oxford comma (default on)', () => {
    expect(render(list([np('goat'), np('rabbit'), np('parrot')]))).toBe('a goat, a rabbit, and a parrot');
  });

  it('AC-190.5: identical common nouns group and pluralize', () => {
    expect(render(list([np('goat'), np('goat'), np('parrot')]))).toBe('two goats and a parrot');
  });

  it('AC-190.6: proper names take no article', () => {
    expect(render(list([np('Alice', { properName: true, articleType: 'none' }), np('Bob', { properName: true, articleType: 'none' })]))).toBe('Alice and Bob');
  });

  it('AC-190.7: mass nouns use "some" and never count-group', () => {
    expect(render(list([np('sand', { number: 'mass', articleType: 'some' }), np('lamp'), np('coin'), np('coin')]))).toBe('some sand, a lamp, and two coins');
  });

  it('AC-190.8: definite items render the definite variant, no grouping', () => {
    expect(render(list([np('goat', { articleType: 'definite' }), np('rabbit', { articleType: 'definite' }), np('parrot', { articleType: 'definite' })]))).toBe('the goat, the rabbit, and the parrot');
  });

  it('AC-190.11: serial-comma off drops the comma before "and"', () => {
    expect(render(list([np('goat'), np('rabbit'), np('parrot')]), { serialComma: false })).toBe('a goat, a rabbit and a parrot');
  });

  it('AC-190.12: count threshold — ten spelled, eleven numeric', () => {
    expect(render(list(Array.from({ length: 10 }, () => np('goat'))))).toBe('ten goats');
    expect(render(list(Array.from({ length: 11 }, () => np('goat'))))).toBe('11 goats');
  });

  it('AC-190.13: plural override beats the heuristic', () => {
    expect(render(list([np('goose', { pluralForm: 'geese' }), np('goose', { pluralForm: 'geese' })]))).toBe('two geese');
  });

  it('AC-190.14 (plural surface): count-grouping renders the real pluralized noun', () => {
    expect(render(list([np('coin'), np('coin'), np('coin')]))).toBe('three coins');
    expect(render(list([np('box'), np('box')]))).toBe('two boxes');
  });

  it('"or" conjunction joins with or', () => {
    expect(render(list([np('goat'), np('rabbit'), np('parrot')], 'or'))).toBe('a goat, a rabbit, or a parrot');
  });

  it('Literal items render as-is (plain name lists)', () => {
    expect(render(list([lit('north'), lit('south'), lit('east')]))).toBe('north, south, and east');
  });
});

// --- AC-6: Empty absorption -------------------------------------------------

describe('AC-6: Empty leaves no dangling comma or whitespace', () => {
  it('Empty inside a PhraseList is absorbed (no dangling comma)', () => {
    expect(render(list([np('goat'), empty, np('rabbit')]))).toBe('a goat and a rabbit');
  });

  it('Empty inside a Sequence is absorbed (no double space)', () => {
    expect(render(seq([lit('You see '), empty, lit('.')]))).toBe('You see .');
  });

  it('a lone Empty realizes to nothing', () => {
    expect(render(empty)).toBe('');
  });
});

// --- AC-7: ITextBlock[] contract -------------------------------------------

describe('AC-7: Assembler emits ITextBlock[]', () => {
  it('returns an array of blocks under the default channel key', () => {
    const blocks = asm.realize(seq([lit('You take '), np('lamp', { articleType: 'definite' }), lit('.')]), makeCtx());
    expect(Array.isArray(blocks)).toBe(true);
    expect(blocks).toHaveLength(1);
    expect(blocks[0].key).toBe(ASSEMBLER_DEFAULT_BLOCK_KEY);
    expect(blocks[0].content).toEqual(['You take the lamp.']);
  });
});

// --- AC-9: determinism ------------------------------------------------------

describe('AC-9: determinism', () => {
  it('identical (tree, ctx) yields byte-identical output across runs', () => {
    const tree = seq([lit('You see '), list([np('goat'), np('goat'), np('lamp')]), lit(' here.')]);
    const a = JSON.stringify(asm.realize(tree, makeCtx()));
    const b = JSON.stringify(asm.realize(tree, makeCtx()));
    const c = JSON.stringify(asm.realize(tree, makeCtx()));
    expect(a).toBe(b);
    expect(b).toBe(c);
  });
});

// --- stub kinds: named refusal ---------------------------------------------

describe('stub kinds throw PhraseNotImplementedError naming the kind', () => {
  const stubs: Array<Phrase['kind']> = ['pronoun', 'number', 'verbatim', 'contents', 'slot', 'optional', 'choice'];
  for (const kind of stubs) {
    it(`refuses kind '${kind}'`, () => {
      expect(() => asm.realize({ kind } as Phrase, makeCtx())).toThrow(PhraseNotImplementedError);
      try {
        asm.realize({ kind } as Phrase, makeCtx());
      } catch (e) {
        expect((e as PhraseNotImplementedError).kind).toBe(kind);
        expect((e as Error).message).toContain(kind);
      }
    });
  }
});

// --- isolation: Assembler does not call the legacy formatter chain ----------

describe('isolation: the Assembler does not use the old formatter chain', () => {
  it('english-assembler.ts imports no legacy formatter module', () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../src/assembler/english-assembler.ts'), 'utf8');
    // No import of any formatter module, and no call into the legacy chain.
    // (Doc-comment mentions of what the Assembler replaces are permitted.)
    expect(src).not.toMatch(/from\s+['"][^'"]*formatters[^'"]*['"]/);
    expect(src).not.toMatch(/\bapplyFormatters\s*\(|\bparsePlaceholder\s*\(/);
  });
});

// --- AC-10: boundary regression guard --------------------------------------

describe('AC-10: if-domain phrase.ts carries no locale realization', () => {
  it('contains no article surface string literals (a / an / the)', () => {
    const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), '../../../if-domain/src/phrase.ts'), 'utf8');
    expect(src.match(/(['"])(a|an|the)\1/g) ?? []).toEqual([]);
  });
});
