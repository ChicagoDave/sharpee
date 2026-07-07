/**
 * @file ADR-209 Phase 1 — Sequence as the snippet splice carrier.
 *
 * ADR-209's provisional `Seq` kind was NOT added: the existing `Sequence`
 * (`kind: 'seq'`) already realizes as in-order run concatenation with no
 * joining punctuation (see the decision comment in if-domain `phrase.ts`).
 * These tests pin that contract in the exact shape Phase 3's resolver will
 * build — `Verbatim` prose segments interleaved with `Literal` / `Choice`
 * snippet values — so a later Assembler change can't silently break splicing.
 *
 * Covers the assembler half of AC-1 (byte-exact study render, first visit)
 * and AC-2 (cycling advances in declaration order and wraps).
 */

import { describe, it, expect } from 'vitest';
import type {
  Phrase,
  Literal,
  Verbatim,
  Sequence,
  Choice,
  Empty,
  RenderContext,
  TextStateStore,
} from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';

// --- harness (matches optional-choice.test.ts conventions) ------------------

function inMemoryTextState(): TextStateStore {
  const m = new Map<string, number>();
  return {
    get: (e, k) => m.get(`${e} ${k}`),
    set: (e, k, v) => { m.set(`${e} ${k}`, v); },
  };
}

function makeCtx(textState: TextStateStore = inMemoryTextState()): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings: {},
    narrative: { person: 'third' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState,
    contribute: () => undefined,
  };
}

const asm = new EnglishAssembler();

function renderWith(tree: Phrase, ctx: RenderContext): string {
  const blocks = asm.realize(tree, ctx);
  if (blocks.length === 0) return '';
  return blocks[0].content.map((c) => (typeof c === 'string' ? c : '')).join('');
}

const verbatim = (text: string): Verbatim => ({ kind: 'verbatim', text });
const lit = (text: string): Literal => ({ kind: 'literal', text });
const seq = (parts: Phrase[]): Sequence => ({ kind: 'seq', parts });
const empty: Empty = { kind: 'empty' };
const choice = (
  selector: Choice['selector'],
  alternatives: Phrase[],
  messageKey: string,
  entityId: string,
): Choice => ({ kind: 'choice', alternatives, selector, entityId, messageKey });

// --- the ADR-209 study example, spliced at the assembler level ---------------

// Author prose split at the two markers; snippet entries per the ADR.
const studyParts = (roomId: string): Phrase[] => [
  verbatim('The study has a doorway to the north'),
  lit(', next to a cabinet'), // string entry: spliced verbatim, every render
  verbatim(
    ' and encompassing the entire south wall is a custom designed marble ' +
      'fireplace with nymphs holding poker and broom',
  ),
  choice(
    'cycling',
    [
      lit(', the mantel holding sentimental items'),
      lit(', its mantel crowded with keepsakes'),
      lit(', a few sentimental items on the mantel'),
    ],
    'mantel',
    roomId,
  ),
  verbatim('.'),
];

describe('Sequence splices snippets byte-exactly (ADR-209 Phase 1)', () => {
  it('AC-1 (assembler half): study example renders byte-exact on first visit', () => {
    const ctx = makeCtx();
    expect(renderWith(seq(studyParts('room:study')), ctx)).toBe(
      'The study has a doorway to the north, next to a cabinet and ' +
        'encompassing the entire south wall is a custom designed marble ' +
        'fireplace with nymphs holding poker and broom, the mantel holding ' +
        'sentimental items.',
    );
  });

  it('AC-2 (assembler half): cycling advances in declaration order and wraps, keyed (roomId, marker)', () => {
    const ctx = makeCtx();
    const renders = Array.from({ length: 4 }, () => renderWith(seq(studyParts('room:study')), ctx));
    expect(renders[0]).toContain(', the mantel holding sentimental items.');
    expect(renders[1]).toContain(', its mantel crowded with keepsakes.');
    expect(renders[2]).toContain(', a few sentimental items on the mantel.');
    expect(renders[3]).toContain(', the mantel holding sentimental items.'); // wrap
  });

  it('an Empty part is absorbed — no stray whitespace where a snippet was gated out', () => {
    // A gated-out (or empty-string) snippet becomes Empty in the Sequence.
    const tree = seq([
      verbatim('The study has a doorway to the north'),
      empty,
      verbatim(' and a marble fireplace.'),
    ]);
    expect(renderWith(tree, makeCtx())).toBe(
      'The study has a doorway to the north and a marble fireplace.',
    );
  });

  it('an empty-string Literal entry renders as nothing (absent-on-some-visits)', () => {
    const ctx = makeCtx();
    const tree = seq([
      verbatim('Dust motes drift'),
      choice('cycling', [lit(', catching the light'), lit('')], 'motes', 'room:attic'),
      verbatim('.'),
    ]);
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, catching the light.');
    expect(renderWith(tree, ctx)).toBe('Dust motes drift.');
  });

  it('concatenation inserts nothing between parts — no separator, no collapse across verbatim prose', () => {
    // Adjacent parts abut exactly; author-controlled spacing survives.
    const tree = seq([verbatim('a'), lit('b'), verbatim('  c')]);
    expect(renderWith(tree, makeCtx())).toBe('ab  c');
  });

  it('AC-8: a duplicate marker (same-key Choice at two sites) splices the same text and advances once', () => {
    const textState = inMemoryTextState();
    const ctx = makeCtx(textState);
    const dust = choice(
      'cycling',
      [lit(', thick'), lit(', thin')],
      'dust',
      'room:cellar',
    );
    // The resolver reuses ONE node for a duplicate marker; both sites realize it.
    const tree = seq([verbatim('Dust'), dust, verbatim(' everywhere; dust'), dust, verbatim('.')]);
    expect(renderWith(tree, ctx)).toBe('Dust, thick everywhere; dust, thick.');
    // One advance for the whole render: the next render picks the NEXT variant.
    expect(renderWith(tree, makeCtx(textState))).toBe('Dust, thin everywhere; dust, thin.');
  });

  it('distinct-key Choices in one render advance independently (existing behavior preserved)', () => {
    const ctx = makeCtx();
    const a = choice('cycling', [lit('A1'), lit('A2')], 'a', 'r1');
    const b = choice('cycling', [lit('B1'), lit('B2')], 'b', 'r1');
    expect(renderWith(seq([a, verbatim(' '), b]), ctx)).toBe('A1 B1');
  });
});

// --- end-to-end: the real `if.room.description_body` template ----------------

describe('spliced Sequence bound as the description param (ADR-209, real template)', () => {
  it('renders through renderMessage: {verbatim:description} passes the Sequence through', async () => {
    const { EnglishLanguageProvider } = await import('../../src/language-provider');
    const provider = new EnglishLanguageProvider();
    const ctx = makeCtx();
    const blocks = provider.renderMessage!(
      'if.room.description_body',
      { description: seq(studyParts('room:study')) },
      ctx,
    );
    const rendered = blocks
      .flatMap((b) => b.content)
      .map((c) => (typeof c === 'string' ? c : ''))
      .join('');
    expect(rendered).toBe(
      'The study has a doorway to the north, next to a cabinet and ' +
        'encompassing the entire south wall is a custom designed marble ' +
        'fireplace with nymphs holding poker and broom, the mantel holding ' +
        'sentimental items.',
    );
  });
});
