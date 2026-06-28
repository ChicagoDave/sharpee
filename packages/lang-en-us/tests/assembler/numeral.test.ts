/**
 * @file ADR-198 — Numeral atom: digits / words / ordinal realization, the full
 * cardinal speller, and ordinal suffixes (incl. the 11–13 exception).
 */

import { describe, it, expect } from 'vitest';
import type { Phrase, RenderContext } from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';
import { numberToWords, ordinalString } from '../../src/number-words';

const asm = new EnglishAssembler();

function makeCtx(params: Record<string, unknown> = {}): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: {},
    narrative: { person: 'third' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const render = (tree: Phrase): string =>
  asm.realize(tree, makeCtx()).flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');

const num = (value: number, format: 'digits' | 'words' | 'ordinal'): Phrase => ({ kind: 'number', value, format });

describe('Numeral atom realization (ADR-198)', () => {
  it('AC-1: digits / words / ordinal', () => {
    expect(render(num(7, 'digits'))).toBe('7');
    expect(render(num(7, 'words'))).toBe('seven');
    expect(render(num(7, 'ordinal'))).toBe('7th');
  });

  it('realizes inside a sentence (Sequence)', () => {
    const tree: Phrase = { kind: 'seq', parts: [
      { kind: 'literal', text: 'You have ' }, num(21, 'words'), { kind: 'literal', text: ' coins.' },
    ] };
    expect(render(tree)).toBe('You have twenty-one coins.');
  });

  it('a NaN value (param bound to a non-number) renders empty, not a crash', () => {
    expect(render(num(Number('x'), 'words'))).toBe('');
  });
});

describe('numberToWords (AC-2)', () => {
  const cases: Array<[number, string]> = [
    [0, 'zero'],
    [-4, 'minus four'],
    [13, 'thirteen'],
    [21, 'twenty-one'],
    [100, 'one hundred'],
    [105, 'one hundred and five'],
    [999, 'nine hundred and ninety-nine'],
    [1000, 'one thousand'],
    [1234, 'one thousand two hundred and thirty-four'],
    [1_000_000, 'one million'],
    [2_000_021, 'two million and twenty-one'],
  ];
  for (const [n, words] of cases) {
    it(`${n} → "${words}"`, () => expect(numberToWords(n)).toBe(words));
  }
});

describe('ordinalString (AC-3: 11–13 exception)', () => {
  const cases: Array<[number, string]> = [
    [1, '1st'], [2, '2nd'], [3, '3rd'], [4, '4th'],
    [11, '11th'], [12, '12th'], [13, '13th'],
    [21, '21st'], [22, '22nd'], [23, '23rd'], [100, '100th'], [101, '101st'],
  ];
  for (const [n, ord] of cases) {
    it(`${n} → "${ord}"`, () => expect(ordinalString(n)).toBe(ord));
  }
});
