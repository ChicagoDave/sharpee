/**
 * ADR-353 D4 Phase 1 — run provenance and its wire carriage.
 *
 * The mechanism: a run whose text was SELECTED FROM ALTERNATIVES by consulting
 * world state is flagged while realizing, and reaches the wire as an `IChosen`
 * span so auto-assertion can pin the stable text around it and skip it.
 *
 * These test the assembler layer only — no consumer of the flag exists yet.
 * The shape AC-8 needs (a stable segment beside a chosen one, separable) is
 * proven here before anything depends on it.
 */

import { describe, expect, it } from 'vitest';
import type {
  Phrase,
  Literal,
  Sequence,
  PhraseList,
  Choice,
  Optional,
  Slot,
  RenderContext,
  Mentioned,
  TextStateStore,
} from '@sharpee/if-domain';
import type { TextContent } from '@sharpee/text-blocks';
import { isChosen, isDecoration } from '@sharpee/text-blocks';
import { EnglishAssembler } from '../../src/assembler';

// --- harness ---------------------------------------------------------------

function inMemoryTextState(): TextStateStore {
  const store = new Map<string, unknown>();
  return {
    get: (entityId, key) => store.get(`${entityId}:${key}`),
    set: (entityId, key, value) => {
      store.set(`${entityId}:${key}`, value);
    },
  } as TextStateStore;
}

function makeCtx(over: Partial<RenderContext> = {}): RenderContext {
  let last: Mentioned | undefined;
  return {
    world: {
      getEntity: () => undefined,
      getEntityContents: () => [],
      getContainingRoom: () => undefined,
    },
    params: {},
    settings: {},
    narrative: { person: 'third' },
    reference: { lastMentioned: () => last, note: (m) => { last = m; } },
    textState: inMemoryTextState(),
    contribute: () => undefined,
    ...over,
  };
}

const asm = new EnglishAssembler();

/** The single realized block's content nodes. */
function contentOf(tree: Phrase, ctx: RenderContext = makeCtx()): ReadonlyArray<TextContent> {
  const blocks = asm.realize(tree, ctx);
  expect(blocks).toHaveLength(1);
  return blocks[0].content;
}

/** Flatten a node to its plain text, ignoring every wrapper. */
function flat(node: TextContent): string {
  if (typeof node === 'string') return node;
  return node.content.map(flat).join('');
}

/** The text of the spans the world chose, and the text of the spans it did not. */
function split(content: ReadonlyArray<TextContent>): { chosen: string[]; stable: string[] } {
  const chosen: string[] = [];
  const stable: string[] = [];
  for (const node of content) {
    (isChosen(node) ? chosen : stable).push(flat(node));
  }
  return { chosen, stable };
}

const lit = (text: string): Literal => ({ kind: 'literal', text });
const seq = (parts: Phrase[]): Sequence => ({ kind: 'seq', parts });

describe('ADR-353 D4 — the four combinators that consult world state', () => {
  it('a Choice marks its winning arm', () => {
    const choice: Choice = {
      kind: 'choice',
      entityId: 'r1',
      messageKey: 'k',
      alternatives: [lit('first'), lit('second')],
      selector: 'cycling',
    };
    const { chosen, stable } = split(contentOf(choice));
    expect(chosen).toEqual(['first']);
    expect(stable).toEqual([]);
  });

  it('a present Optional marks its child; an absent one produces nothing', () => {
    const present: Optional = { kind: 'optional', present: true, child: lit('gated') } as Optional;
    expect(split(contentOf(present)).chosen).toEqual(['gated']);

    const absent: Optional = { kind: 'optional', present: false, child: lit('gated') } as Optional;
    expect(contentOf(absent)).toEqual(['']);
  });

  it('a filled Slot marks its contribution; an empty Slot produces no run', () => {
    const slot: Slot = { kind: 'slot', key: 'here' } as Slot;
    const filled = makeCtx({ slotContributions: () => [lit('Bob is here.')] });
    expect(split(contentOf(slot, filled)).chosen).toEqual(['Bob is here.']);

    const empty = makeCtx({ slotContributions: () => [] });
    expect(contentOf(slot, empty)).toEqual(['']);
  });
});

describe('ADR-353 D4 — composition carries each child\'s own flag', () => {
  it('AC-8 shape: a stable segment beside a chosen one stays separable', () => {
    const slot: Slot = { kind: 'slot', key: 'here' } as Slot;
    const ctx = makeCtx({ slotContributions: () => [lit('Bob is here.')] });
    const tree = seq([lit('A tidy kitchen. '), slot]);

    const { chosen, stable } = split(contentOf(tree, ctx));
    expect(chosen).toEqual(['Bob is here.']);
    // The stable span keeps its trailing space here and loses it in the next
    // test, because the whitespace authority trims only the FINAL non-verbatim
    // run — and which run is final depends on whether the NPC is present.
    // Phase 3's stable-span reader must therefore trim before building a
    // `contains` claim, or AC-8's "the same room with no NPC present pins the
    // same claim" fails on a single space. Pinned here so that obligation is a
    // recorded fact rather than a surprise.
    expect(stable).toEqual(['A tidy kitchen. ']);
    expect(stable.map((t) => t.trim())).toEqual(['A tidy kitchen.']);
  });

  it('the same room with nothing contributed pins the same stable text', () => {
    const slot: Slot = { kind: 'slot', key: 'here' } as Slot;
    const ctx = makeCtx({ slotContributions: () => [] });
    const tree = seq([lit('A tidy kitchen. '), slot]);

    const { chosen, stable } = split(contentOf(tree, ctx));
    expect(stable).toEqual(['A tidy kitchen.']);
    expect(chosen).toEqual([]);
  });

  it('Sequence and PhraseList add no flag of their own', () => {
    const list: PhraseList = { kind: 'list', items: [lit('a'), lit('b')], conj: 'and' };
    const tree = seq([lit('plain '), list]);
    expect(split(contentOf(tree)).chosen).toEqual([]);
    expect(split(contentOf(tree)).stable).toEqual(['plain a and b']);
  });
});

describe('ADR-353 D4 — the wire shape', () => {
  it('an unflagged tree is byte-identical to before: one plain string', () => {
    const content = contentOf(seq([lit('A tidy '), lit('kitchen.')]));
    expect(content).toEqual(['A tidy kitchen.']);
  });

  it('a chosen run that is also decorated nests the decoration inside', () => {
    const decorated: Literal = { kind: 'literal', text: 'lamp', decorations: ['sharpee-item'] } as Literal;
    const opt: Optional = { kind: 'optional', present: true, child: decorated } as Optional;
    const content = contentOf(opt);

    expect(content).toHaveLength(1);
    const node = content[0];
    expect(isChosen(node)).toBe(true);
    const inner = (node as { content: ReadonlyArray<TextContent> }).content[0];
    expect(isDecoration(inner)).toBe(true);
    expect(flat(node)).toBe('lamp');
  });

  it('the two guards do not overlap', () => {
    // `text-blocks` ships no test harness of its own (types and guards only),
    // so the discrimination that keeps provenance out of the presentation path
    // is pinned here: a chosen span must never satisfy `isDecoration`, or every
    // renderer would try to read a `className` off it.
    const opt: Optional = { kind: 'optional', present: true, child: lit('gated') } as Optional;
    const node = contentOf(opt)[0];
    expect(isChosen(node)).toBe(true);
    expect(isDecoration(node)).toBe(false);

    const decorated: Literal = { kind: 'literal', text: 'lamp', decorations: ['sharpee-item'] } as Literal;
    const decoNode = contentOf(decorated)[0];
    expect(isDecoration(decoNode)).toBe(true);
    expect(isChosen(decoNode)).toBe(false);
  });

  it('a chosen span renders to the same plain text as a bare one', () => {
    const opt: Optional = { kind: 'optional', present: true, child: lit('gated') } as Optional;
    const withFlag = contentOf(seq([lit('before '), opt, lit(' after')]));
    const without = contentOf(seq([lit('before '), lit('gated'), lit(' after')]));
    expect(withFlag.map(flat).join('')).toBe(without.map(flat).join(''));
  });
});
