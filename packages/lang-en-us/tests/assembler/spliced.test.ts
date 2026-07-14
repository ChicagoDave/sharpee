/**
 * @file ADR-211 Phase 2 — the Assembler realizes `Spliced` (isolated).
 *
 * Hand-built `Sequence`/`Spliced` fixtures, deliberately NOT routed through
 * `resolveSnippetDescription` — the resolver still emits its pre-ADR-211 shape
 * until the Phase 4 flag day. These tests pin the separator authority in
 * isolation: the Assembler owns the join CHARACTERS (`', '` clause / `' '`
 * sentence), an absorbed fragment contributes neither text nor separator, and
 * Choice-counter machinery is untouched by the wrapper.
 *
 * Covers the assembler half of AC-1 (byte-exact separator insertion at both
 * site modes), AC-2 (empty variant joins nothing, counter still advances),
 * and AC-9 (adjacent Spliced siblings, all four empty/non-empty combinations).
 */

import { describe, it, expect } from 'vitest';
import type {
  Phrase,
  Literal,
  Verbatim,
  Sequence,
  Spliced,
  Choice,
  RenderContext,
  TextStateStore,
} from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';

// --- harness (matches snippet-splice.test.ts conventions) -------------------

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

function renderWith(tree: Phrase, ctx: RenderContext = makeCtx()): string {
  const blocks = asm.realize(tree, ctx);
  if (blocks.length === 0) return '';
  return blocks[0].content.map((c) => (typeof c === 'string' ? c : '')).join('');
}

const verbatim = (text: string): Verbatim => ({ kind: 'verbatim', text });
const lit = (text: string): Literal => ({ kind: 'literal', text });
const seq = (parts: Phrase[]): Sequence => ({ kind: 'seq', parts });
const spliced = (mode: Spliced['mode'], content: Phrase): Spliced => ({ kind: 'spliced', mode, content });
const choice = (
  selector: Choice['selector'],
  alternatives: Phrase[],
  messageKey: string,
  entityId: string,
): Choice => ({ kind: 'choice', alternatives, selector, entityId, messageKey });

// --- AC-1 (assembler half): byte-exact separator insertion ------------------

describe('Spliced separator insertion (ADR-211 AC-1, assembler half)', () => {
  it('clause mode: a BARE fragment joins with `, ` — byte-identical to the old verbatim entry', () => {
    // The zoo pins site, post-migration shape: bare fragment, platform comma.
    const tree = seq([
      verbatim('shelves of stuffed animals and postcards'),
      spliced('clause', lit('and a spinning rack of enamel pins wobbles by the register')),
      verbatim('. A large souvenir penny press stands in the corner.'),
    ]);
    expect(renderWith(tree)).toBe(
      'shelves of stuffed animals and postcards, and a spinning rack of enamel ' +
        'pins wobbles by the register. A large souvenir penny press stands in the corner.',
    );
  });

  it('sentence mode: a BARE fragment joins with one space — byte-identical to the old leading-space entry', () => {
    // The dungeo rug site shape: sentence fragment after a terminator.
    const tree = seq([
      verbatim('A trophy case leads out of the room through a door.'),
      spliced('sentence', lit('A large oriental rug lies to one side of the room.')),
    ]);
    expect(renderWith(tree)).toBe(
      'A trophy case leads out of the room through a door. ' +
        'A large oriental rug lies to one side of the room.',
    );
  });

  it('a Choice inside Spliced realizes through the normal Choice path (variant selection intact)', () => {
    const ctx = makeCtx();
    const tree = seq([
      verbatim('Dust motes drift'),
      spliced('clause', choice('cycling', [lit('catching the light'), lit('settling slowly')], 'motes', 'room:attic')),
      verbatim('.'),
    ]);
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, catching the light.');
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, settling slowly.');
  });
});

// --- AC-2: the empty variant joins nothing, counter still advances ----------

describe('Spliced empty absorption (ADR-211 AC-2, assembler half)', () => {
  it('an empty variant renders the host as if the marker were absent — no separator, both modes', () => {
    const clauseTree = seq([
      verbatim('shelves of stuffed animals and postcards'),
      spliced('clause', lit('')),
      verbatim('.'),
    ]);
    expect(renderWith(clauseTree)).toBe('shelves of stuffed animals and postcards.');

    const sentenceTree = seq([
      verbatim('A trophy case leads through a door.'),
      spliced('sentence', lit('')),
      verbatim(' Stairs descend into darkness.'),
    ]);
    expect(renderWith(sentenceTree)).toBe(
      'A trophy case leads through a door. Stairs descend into darkness.',
    );
  });

  it('a gated-out fragment (Empty content) absorbs identically', () => {
    const tree = seq([verbatim('Bare walls'), spliced('clause', { kind: 'empty' }), verbatim('.')]);
    expect(renderWith(tree)).toBe('Bare walls.');
  });

  it('the counter still advances when the winner is the empty variant (the gap stays in the cycle)', () => {
    const ctx = makeCtx();
    const tree = seq([
      verbatim('Dust motes drift'),
      spliced('clause', choice('cycling', [lit('catching the light'), lit(''), lit('in lazy spirals')], 'motes', 'room:attic')),
      verbatim('.'),
    ]);
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, catching the light.');
    // Empty winner: no text, no separator — but the pick happened and advanced.
    expect(renderWith(tree, ctx)).toBe('Dust motes drift.');
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, in lazy spirals.');
    expect(renderWith(tree, ctx)).toBe('Dust motes drift, catching the light.'); // wrap
  });
});

// --- AC-9: adjacent markers, all four combinations ---------------------------

describe('adjacent Spliced siblings (ADR-211 AC-9, assembler half)', () => {
  // `…postcards{a}{b}.` — both clause sites from the AUTHORED prose; each
  // non-empty fragment gets its OWN `, `; an empty one renders as if absent.
  const host = (a: Phrase, b: Phrase): Sequence =>
    seq([verbatim('shelves of postcards'), spliced('clause', a), spliced('clause', b), verbatim('.')]);

  it('both non-empty: two independent `, `-joined fragments', () => {
    expect(renderWith(host(lit('one rack wobbling'), lit('another standing bare')))).toBe(
      'shelves of postcards, one rack wobbling, another standing bare.',
    );
  });

  it('first empty: renders as if {a} were absent', () => {
    expect(renderWith(host(lit(''), lit('another standing bare')))).toBe(
      'shelves of postcards, another standing bare.',
    );
  });

  it('second empty: renders as if {b} were absent', () => {
    expect(renderWith(host(lit('one rack wobbling'), lit('')))).toBe(
      'shelves of postcards, one rack wobbling.',
    );
  });

  it('both empty: host prose renders untouched', () => {
    expect(renderWith(host(lit(''), lit('')))).toBe('shelves of postcards.');
  });
});
