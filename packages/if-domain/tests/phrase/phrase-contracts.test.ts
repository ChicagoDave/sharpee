/**
 * @file ADR-192 Phase 1 — phrase contract verification.
 *
 * Two tiers, matching the plan's Phase 1 test deliverable:
 *  - Kind type guards (`isLiteral`, `isNounPhrase`, …) discriminate the closed
 *    `Phrase` union correctly — each guard accepts its own kind and rejects others.
 *  - AC-10 boundary: `phrase.ts` carries no locale realization — no article
 *    surface string literals (`'a'`, `'an'`, `'the'`) and no import from
 *    `@sharpee/lang-en-us`. This is the structural guarantee that realization
 *    lives in the Assembler, not the language-neutral contract.
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';
import { describe, it, expect } from 'vitest';
import {
  Phrase,
  Literal,
  NounPhrase,
  PhraseList,
  Sequence,
  Empty,
  Pronoun,
  Numeral,
  Verbatim,
  Contents,
  Slot,
  Optional,
  Choice,
  isLiteral,
  isNounPhrase,
  isPhraseList,
  isSequence,
  isEmpty,
  isPronoun,
  isNumeral,
  isVerbatim,
  isContents,
  isSlot,
  isOptional,
  isChoice,
} from '../../src/phrase';

// One representative value per kind (foundational kinds carry their full
// contract; stub kinds carry only their reserved discriminant).
const literal: Literal = { kind: 'literal', text: 'You see a lamp.' };
const noun: NounPhrase = { kind: 'noun', name: 'cabinet', number: 'singular', articleType: 'definite' };
const list: PhraseList = { kind: 'list', items: [], conj: 'and' };
const seq: Sequence = { kind: 'seq', parts: [] };
const empty: Empty = { kind: 'empty' };
const pronoun: Pronoun = { kind: 'pronoun' };
const numeral: Numeral = { kind: 'number' };
const verbatim: Verbatim = { kind: 'verbatim' };
const contents: Contents = { kind: 'contents' };
const slot: Slot = { kind: 'slot' };
const optional: Optional = { kind: 'optional' };
const choice: Choice = { kind: 'choice' };

const all: Array<{ phrase: Phrase; guard: (p: Phrase) => boolean; name: string }> = [
  { phrase: literal, guard: isLiteral, name: 'isLiteral' },
  { phrase: noun, guard: isNounPhrase, name: 'isNounPhrase' },
  { phrase: list, guard: isPhraseList, name: 'isPhraseList' },
  { phrase: seq, guard: isSequence, name: 'isSequence' },
  { phrase: empty, guard: isEmpty, name: 'isEmpty' },
  { phrase: pronoun, guard: isPronoun, name: 'isPronoun' },
  { phrase: numeral, guard: isNumeral, name: 'isNumeral' },
  { phrase: verbatim, guard: isVerbatim, name: 'isVerbatim' },
  { phrase: contents, guard: isContents, name: 'isContents' },
  { phrase: slot, guard: isSlot, name: 'isSlot' },
  { phrase: optional, guard: isOptional, name: 'isOptional' },
  { phrase: choice, guard: isChoice, name: 'isChoice' },
];

describe('Phrase kind type guards (ADR-192 §1)', () => {
  it('each guard accepts exactly its own kind across all 12 members', () => {
    for (const subject of all) {
      // The matching guard accepts.
      expect(subject.guard(subject.phrase), `${subject.name}(${subject.phrase.kind})`).toBe(true);
      // Every other guard rejects this phrase.
      for (const other of all) {
        if (other.name === subject.name) continue;
        expect(other.guard(subject.phrase), `${other.name}(${subject.phrase.kind})`).toBe(false);
      }
    }
  });

  it('covers all 12 members of the closed union', () => {
    const kinds = all.map((a) => a.phrase.kind);
    expect(new Set(kinds).size).toBe(12);
  });
});

describe('AC-10 boundary — no locale realization in if-domain phrase.ts', () => {
  const src = readFileSync(
    resolve(dirname(fileURLToPath(import.meta.url)), '../../src/phrase.ts'),
    'utf8',
  );

  it('contains no article surface string literals (a / an / the)', () => {
    // Article SURFACES as quoted literals would mean realization leaked here.
    // `'some'` / `'none'` are language-neutral `articleType` selectors (ADR-192
    // §1) and are intentionally permitted — only the realized surfaces are banned.
    const articleSurfaceLiteral = /(['"])(a|an|the)\1/g;
    const hits = src.match(articleSurfaceLiteral) ?? [];
    expect(hits).toEqual([]);
  });

  it('does not import from @sharpee/lang-en-us', () => {
    // Only `from '…'` import/export statements count — doc-comment mentions of
    // where realization lives are expected and permitted.
    const localeImport = /\bfrom\s+['"][^'"]*lang-en-us[^'"]*['"]/;
    expect(src).not.toMatch(localeImport);
  });
});
