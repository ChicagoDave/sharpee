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
  Spliced,
  RenderContext,
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
  isSpliced,
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
const slot: Slot = { kind: 'slot', slotKey: 'here' };
const optional: Optional = {
  kind: 'optional',
  child: { kind: 'literal', text: 'lid flung wide' },
  present: true,
};
const choice: Choice = {
  kind: 'choice',
  alternatives: [{ kind: 'literal', text: "You can't go that way." }],
  selector: 'cycling',
  entityId: 'exit-1',
  messageKey: 'cant_go',
};

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

describe('ADR-195 Phase 1 — enriched Slot contract + RenderContext read seam', () => {
  it('Slot carries slotKey and optional mode/conj, still discriminated by kind', () => {
    const sentenceSlot: Slot = { kind: 'slot', slotKey: 'here' };
    const clauseSlot: Slot = { kind: 'slot', slotKey: 'detail', mode: 'clause', conj: 'or' };
    expect(isSlot(sentenceSlot)).toBe(true);
    expect(isSlot(clauseSlot)).toBe(true);
    expect(sentenceSlot.slotKey).toBe('here');
    // mode/conj are optional — absent means the Assembler's defaults (sentence/and).
    expect(sentenceSlot.mode).toBeUndefined();
    expect(clauseSlot.mode).toBe('clause');
    expect(clauseSlot.conj).toBe('or');
  });

  it('slotContributions is an optional peek accessor structurally present on RenderContext', () => {
    // A context that wired the read seam: peek returns the same list on repeated
    // reads (non-draining) and yields [] for an unstaged key.
    const staged: Record<string, Phrase[]> = { here: [{ kind: 'literal', text: 'Sam is here.' }] };
    const wired: Pick<RenderContext, 'contribute' | 'slotContributions'> = {
      contribute: () => {},
      slotContributions: (key) => staged[key] ?? [],
    };
    expect(wired.slotContributions?.('here')).toHaveLength(1);
    expect(wired.slotContributions?.('here')).toBe(wired.slotContributions?.('here')); // peek, stable
    expect(wired.slotContributions?.('missing')).toEqual([]);

    // A world-less stub omits the optional accessor; `?.` yields undefined, which
    // the Assembler reads as no contributions (ADR-195 §2).
    const worldless: Pick<RenderContext, 'contribute'> = { contribute: () => {} };
    expect((worldless as Partial<RenderContext>).slotContributions?.('here')).toBeUndefined();
  });
});

describe('ADR-196 Phase 1 — enriched Optional + Choice contract', () => {
  it('Optional carries child + a producer-resolved present boolean, discriminated by kind', () => {
    const present: Optional = { kind: 'optional', child: { kind: 'literal', text: ', lid flung wide' }, present: true };
    const absent: Optional = { kind: 'optional', child: { kind: 'literal', text: ', lid flung wide' }, present: false };
    expect(isOptional(present)).toBe(true);
    expect(isOptional(absent)).toBe(true);
    // `present` is a resolved boolean (no realize-time read); `child` is any Phrase.
    expect(present.present).toBe(true);
    expect(absent.present).toBe(false);
    expect(present.child.kind).toBe('literal');
  });

  it('Choice carries alternatives, a selector, and the (entityId, messageKey) store key', () => {
    const choice196: Choice = {
      kind: 'choice',
      alternatives: [
        { kind: 'literal', text: "You can't go that way." },
        { kind: 'literal', text: 'There is no exit there.' },
      ],
      selector: 'random',
      entityId: 'room-hall',
      messageKey: 'blocked_exit',
    };
    expect(isChoice(choice196)).toBe(true);
    expect(choice196.alternatives).toHaveLength(2);
    expect(choice196.selector).toBe('random');
    // The two keys that index the persistent text-state store (ADR-196 §2/§4).
    expect(choice196.entityId).toBe('room-hall');
    expect(choice196.messageKey).toBe('blocked_exit');
  });

  it('an alternative MAY be Empty (once-only text, ADR-196 §2)', () => {
    const onceOnly: Choice = {
      kind: 'choice',
      alternatives: [{ kind: 'literal', text: 'A brass key glints here.' }, { kind: 'empty' }],
      selector: 'firstTime',
      entityId: 'key-1',
      messageKey: 'first_glint',
    };
    expect(isChoice(onceOnly)).toBe(true);
    expect(onceOnly.alternatives[1].kind).toBe('empty');
  });
});

describe('ADR-211 Phase 1 — Spliced wrapper contract', () => {
  const clauseSpliced: Spliced = {
    kind: 'spliced',
    mode: 'clause',
    content: { kind: 'literal', text: 'and a spinning rack of enamel pins wobbles by the register' },
  };
  const sentenceSpliced: Spliced = {
    kind: 'spliced',
    mode: 'sentence',
    content: choice, // content is any Phrase — a Choice carries the variant machinery
  };

  it('isSpliced accepts both modes and rejects every other kind', () => {
    expect(isSpliced(clauseSpliced)).toBe(true);
    expect(isSpliced(sentenceSpliced)).toBe(true);
    for (const other of all) {
      expect(isSpliced(other.phrase), `isSpliced(${other.phrase.kind})`).toBe(false);
    }
  });

  it('other guards reject a Spliced value', () => {
    for (const other of all) {
      expect(other.guard(clauseSpliced), `${other.name}(spliced)`).toBe(false);
    }
  });

  it('mode is a two-value enum and content is a bare Phrase (no separator fields exist)', () => {
    // The separator is platform-owned at realize time (ADR-211 Decision 2); the
    // wrapper carries only site mode + content — no separator/boundary field.
    expect(clauseSpliced.mode).toBe('clause');
    expect(sentenceSpliced.mode).toBe('sentence');
    expect(clauseSpliced.content.kind).toBe('literal');
    expect(sentenceSpliced.content.kind).toBe('choice');
    expect(Object.keys(clauseSpliced).sort()).toEqual(['content', 'kind', 'mode']);
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
