/**
 * @file ADR-196 Phase 3 — Optional + Choice realization (English Assembler).
 *
 * Derived from the selectChoice Behavior Statement:
 *   DOES   select an alternative from the persisted (entityId, messageKey) counter
 *          per selector strategy AND advance/encode the counter via textState.set.
 *   WHEN   a Choice node is realized.
 *   BECAUSE repeated triggers must vary and resume after restore (S12–S14).
 *   REJECTS never — always yields one alternative (or Empty).
 *
 * Each selector's DOES becomes a sequence assertion (realize repeatedly against a
 * shared stateful textState and check the emitted order). Optional's present/absent
 * branches become the AC-1 / AC-2 (Empty-parity) tests. AC-6 asserts seeded
 * determinism; AC-7 asserts sticky persistence.
 */

import { describe, it, expect } from 'vitest';
import type {
  Phrase,
  Literal,
  NounPhrase,
  Sequence,
  PhraseList,
  Optional,
  Choice,
  Empty,
  RenderContext,
  TextStateStore,
  LocaleSettings,
  Mentioned,
} from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';
import { plainNode } from '../test-utils/flatten';

// --- harness ---------------------------------------------------------------

/** A real in-memory (entityId, messageKey) → counter store, like the world store. */
function inMemoryTextState(): TextStateStore {
  const m = new Map<string, number>();
  return {
    get: (e, k) => m.get(`${e}\u0000${k}`),
    set: (e, k, v) => { m.set(`${e}\u0000${k}`, v); },
  };
}

function makeCtx(textState: TextStateStore, settings: LocaleSettings = {}): RenderContext {
  let last: Mentioned | undefined;
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings,
    narrative: { person: 'third' },
    reference: { lastMentioned: () => last, note: (m) => { last = m; } },
    textState,
    contribute: () => undefined,
  };
}

const asm = new EnglishAssembler();

function renderWith(tree: Phrase, ctx: RenderContext): string {
  const blocks = asm.realize(tree, ctx);
  if (blocks.length === 0) return '';
  return blocks[0].content.map((c) => (typeof c === 'string' ? c : plainNode(c))).join('');
}

/** Realize `tree` `n` times against a shared ctx (shared textState), collecting output. */
function sequence(tree: Phrase, ctx: RenderContext, n: number): string[] {
  return Array.from({ length: n }, () => renderWith(tree, ctx));
}

const lit = (text: string): Literal => ({ kind: 'literal', text });
const np = (name: string, extra: Partial<NounPhrase> = {}): NounPhrase =>
  ({ kind: 'noun', name, number: 'singular', articleType: 'indefinite', ...extra });
const seq = (parts: Phrase[]): Sequence => ({ kind: 'seq', parts });
const list = (items: Phrase[], conj: 'and' | 'or' = 'and'): PhraseList => ({ kind: 'list', items, conj });
const empty: Empty = { kind: 'empty' };
const opt = (present: boolean, child: Phrase): Optional => ({ kind: 'optional', child, present });
const choice = (
  selector: Choice['selector'],
  alternatives: Phrase[],
  messageKey = 'k',
  entityId = 'e',
): Choice => ({ kind: 'choice', alternatives, selector, entityId, messageKey });

// --- Optional (ADR-196 §1) -------------------------------------------------

describe('Optional realizes child or nothing (ADR-196 §1)', () => {
  it('AC-1: present → child rendered inline', () => {
    const tree = seq([lit('A cabinet'), opt(true, lit(', lid flung wide')), lit('.')]);
    expect(renderWith(tree, makeCtx(inMemoryTextState()))).toBe('A cabinet, lid flung wide.');
  });

  it('AC-2: absent → Empty; no dangling punctuation in a Sequence', () => {
    const tree = seq([lit('A cabinet'), opt(false, lit(', lid flung wide')), lit('.')]);
    expect(renderWith(tree, makeCtx(inMemoryTextState()))).toBe('A cabinet.');
  });

  it('AC-2: absent → absorbed in a PhraseList like Empty (no phantom comma)', () => {
    const ctx = makeCtx(inMemoryTextState());
    expect(renderWith(list([np('key'), opt(true, np('lamp'))]), ctx)).toBe('a key and a lamp');
    expect(renderWith(list([np('key'), opt(false, np('lamp'))]), ctx)).toBe('a key');
    // Every item absent → the list's own Empty-absorption yields "nothing".
    expect(renderWith(list([opt(false, np('key')), opt(false, np('lamp'))]), ctx)).toBe('nothing');
  });
});

// --- Choice selectors (ADR-196 §2) -----------------------------------------

describe('Choice cycling/stopping/firstTime advance a persisted counter (ADR-196 §2)', () => {
  it('AC-3: cycling advances through variants and wraps', () => {
    const ctx = makeCtx(inMemoryTextState());
    const tree = choice('cycling', [lit('A'), lit('B'), lit('C')]);
    expect(sequence(tree, ctx, 7)).toEqual(['A', 'B', 'C', 'A', 'B', 'C', 'A']);
  });

  it('AC-4: stopping advances to the last variant and sticks', () => {
    const ctx = makeCtx(inMemoryTextState());
    const tree = choice('stopping', [lit('A'), lit('B'), lit('C')]);
    expect(sequence(tree, ctx, 5)).toEqual(['A', 'B', 'C', 'C', 'C']);
  });

  it('AC-5: firstTime shows alt[0] once then alt[1]', () => {
    const ctx = makeCtx(inMemoryTextState());
    const tree = choice('firstTime', [lit('You enter a grand hall.'), lit('You are in the hall.')]);
    expect(sequence(tree, ctx, 3)).toEqual([
      'You enter a grand hall.',
      'You are in the hall.',
      'You are in the hall.',
    ]);
  });

  it('AC-5: firstTime with Empty second alternative is once-only text', () => {
    const ctx = makeCtx(inMemoryTextState());
    const tree = seq([choice('firstTime', [lit('A brass key glints here.'), empty])]);
    expect(sequence(tree, ctx, 3)).toEqual(['A brass key glints here.', '', '']);
  });
});

describe('Choice random/sticky are seeded and deterministic (ADR-196 §3)', () => {
  it('AC-6: random selection is identical across runs for the same counter (no Math.random)', () => {
    const tree = choice('random', [lit('A'), lit('B'), lit('C'), lit('D')]);
    // Two independent fresh stores both at counter 0 → identical pick.
    const a = renderWith(tree, makeCtx(inMemoryTextState()));
    const b = renderWith(tree, makeCtx(inMemoryTextState()));
    expect(a).toBe(b);
    expect(['A', 'B', 'C', 'D']).toContain(a);
    // And the whole trigger sequence reproduces byte-identically.
    const s1 = sequence(tree, makeCtx(inMemoryTextState()), 6);
    const s2 = sequence(tree, makeCtx(inMemoryTextState()), 6);
    expect(s1).toEqual(s2);
  });

  it('AC-7: sticky picks once and replays the same alternative', () => {
    const ctx = makeCtx(inMemoryTextState());
    const tree = choice('sticky', [lit('A'), lit('B'), lit('C')]);
    const s = sequence(tree, ctx, 5);
    expect(new Set(s).size).toBe(1); // every trigger identical
    expect(['A', 'B', 'C']).toContain(s[0]);
  });
});

// --- determinism across save/restore (counter snapshot) --------------------

describe('Choice resumes from a restored counter (ADR-196 §3 / AC-8 realize half)', () => {
  it('a store seeded to counter K resumes cycling from K', () => {
    const tree = choice('cycling', [lit('A'), lit('B'), lit('C')]);
    // Simulate a restore: a fresh store whose counter was persisted at 4.
    const restored = inMemoryTextState();
    restored.set('e', 'k', 4); // 4 % 3 === 1 → next emit is 'B'
    expect(renderWith(tree, makeCtx(restored))).toBe('B');
  });

  it('identical (tree, counter, ctx) realizes byte-identically across repeated runs', () => {
    const tree = choice('cycling', [lit('A'), lit('B')]);
    const once = () => renderWith(tree, makeCtx(inMemoryTextState()));
    expect(once()).toBe(once()); // each starts at counter 0 → 'A'
  });
});
