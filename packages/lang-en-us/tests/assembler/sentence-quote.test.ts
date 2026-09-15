/**
 * @file sentence-quote.test.ts
 * @description ADR-201 Phase 4 — Sentence/Quote realization, Pronoun S40
 *   capitalization, and the structural reconciliation pass, through the Assembler.
 *
 * AC map (ADR-201): AC-1 (sentence-initial / explicit Pronoun cap), AC-2 (Quote
 * glyphs + first-word cap + terminal inside), AC-4 (leading tag + quote → one
 * comma, period inside), AC-5 (empty utterance absorbs the whole quote), AC-8
 * (quote glyphs from LocaleSettings); plus the ellipsis/terminal no-double-punct
 * edge (plan Phase 4 note). ADR-202 AC-3 (structure flows as run metadata).
 */

import { describe, it, expect } from 'vitest';
import type {
  LocaleSettings, Mentioned, NounPhrase, Phrase, RenderContext, RenderPosition, Verb,
} from '@sharpee/if-domain';
import { EnglishAssembler } from '../../src/assembler';
import { markedNode } from '../test-utils/flatten';

// --- harness ---------------------------------------------------------------

function makeTextState() {
  const store = new Map<string, number>();
  return {
    get: (e: string, k: string) => store.get(`${e}\u0000${k}`),
    set: (e: string, k: string, v: number) => void store.set(`${e}\u0000${k}`, v),
  };
}

interface CtxOpts {
  params?: Record<string, unknown>;
  settings?: LocaleSettings;
  ref?: Mentioned;
  position?: RenderPosition;
}

function makeCtx(opts: CtxOpts = {}): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: opts.params ?? {},
    settings: opts.settings ?? { serialComma: true },
    narrative: { person: 'third' },
    reference: { lastMentioned: () => opts.ref, note: () => undefined },
    textState: makeTextState(),
    contribute: () => undefined,
    position: opts.position,
  };
}

const asm = new EnglishAssembler();

/** Realize a tree and flatten its blocks to text. */
function render(tree: Phrase, opts?: CtxOpts): string {
  return asm.realize(tree, makeCtx(opts))
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : markedNode(c)))
    .join('');
}

// --- phrase constructors ---------------------------------------------------

const lit = (text: string): Phrase => ({ kind: 'literal', text });
const seq = (...parts: Phrase[]): Phrase => ({ kind: 'seq', parts });
const empty = (): Phrase => ({ kind: 'empty' });
const sentence = (child: Phrase, terminal?: '.' | '?' | '!'): Phrase =>
  terminal ? { kind: 'sentence', child, terminal } : { kind: 'sentence', child };
const quote = (utterance: Phrase, terminal?: '.' | '?' | '!'): Phrase =>
  terminal ? { kind: 'quote', utterance, terminal } : { kind: 'quote', utterance };
const pronoun = (c: 'subject' | 'object', cap?: boolean): Phrase =>
  cap === undefined ? { kind: 'pronoun', case: c } : { kind: 'pronoun', case: c, capitalize: cap };
const noun = (name: string, over: Partial<NounPhrase> = {}): NounPhrase =>
  ({ kind: 'noun', name, number: 'singular', articleType: 'definite', ...over });
const verb = (lemma: string, subjectRef: string): Verb => ({ kind: 'verb', lemma, subjectRef });

const HE: Mentioned = { number: 'singular', pronounSet: 'he' } as Mentioned;

// --- tests -----------------------------------------------------------------

describe('Sentence / Quote realization (ADR-201 Phase 4)', () => {
  it('reconciliation is a no-op for a plain literal (no cap, no terminal added)', () => {
    expect(render(lit('hello world'))).toBe('hello world');
  });

  describe('Sentence', () => {
    it('caps the first word and appends the default terminal period', () => {
      expect(render(sentence(lit('hello world')))).toBe('Hello world.');
    });

    it('honors an explicit terminal', () => {
      expect(render(sentence(lit('really'), '?'))).toBe('Really?');
    });

    it('does NOT double-punctuate when the child already ends in a terminal/ellipsis', () => {
      expect(render(sentence(lit('wait...')))).toBe('Wait...');
      expect(render(sentence(lit('stop!')))).toBe('Stop!');
    });
  });

  describe('Quote (AC-2)', () => {
    it('wraps in glyphs, caps the first word, and puts the period INSIDE the closing quote', () => {
      expect(render(quote(lit('hello')))).toBe('"Hello."');
    });

    it('honors an explicit terminal inside the quote', () => {
      expect(render(quote(lit('really'), '?'))).toBe('"Really?"');
    });

    it('does NOT append a second terminal when the utterance ends in an ellipsis (plan Phase 4 note)', () => {
      expect(render(quote(lit('wait...')))).toBe('"Wait..."');
    });

    it('reads quote glyphs from LocaleSettings (AC-8)', () => {
      expect(render(quote(lit('bonjour')), { settings: { openQuote: '«', closeQuote: '»' } }))
        .toBe('«Bonjour.»');
    });

    it('an utterance that absorbs to nothing absorbs the whole quote — no empty "" (AC-5)', () => {
      const emptyChoice: Phrase = {
        kind: 'choice', alternatives: [empty()], selector: 'cycling', entityId: 'e1', messageKey: 'm1',
      };
      expect(render(quote(emptyChoice))).toBe('');
    });
  });

  describe('leading dialogue tag + Quote (AC-4)', () => {
    it('yields exactly one comma and the period inside the quote', () => {
      const tree = seq(lit('She '), verb('says', 'actor'), lit(', '), quote(lit('hello')));
      expect(render(tree, { params: { actor: noun('she') } })).toBe('She says, "Hello."');
    });

    it('the speech verb still agrees with a plural speaker', () => {
      const tree = seq(lit('They '), verb('says', 'actor'), lit(', '), quote(lit('hello')));
      expect(render(tree, { params: { actor: noun('they', { number: 'plural' }) } }))
        .toBe('They say, "Hello."');
    });
  });

  describe('Pronoun S40 capitalization (AC-1)', () => {
    it('capitalize:true caps even mid-sentence (explicit override)', () => {
      expect(render(seq(lit('go to '), pronoun('object', true)), { ref: HE })).toBe('go to Him');
    });

    it('absent capitalize + sentence-initial position auto-caps (S40 falls out)', () => {
      expect(render(sentence(seq(pronoun('subject'), lit(' runs'))), { ref: HE })).toBe('He runs.');
    });

    it('capitalize:false stays lowercase even sentence-initial (explicit opt-out wins)', () => {
      expect(render(sentence(seq(pronoun('subject', false), lit(' waits'))), { ref: HE })).toBe('he waits.');
    });

    it('absent capitalize stays lowercase when NOT sentence-initial', () => {
      expect(render(seq(lit('and '), pronoun('subject')), { ref: HE })).toBe('and he');
    });
  });

  describe('RenderContext.position seam (ADR-201 §4)', () => {
    it('a top-level sentence-initial position caps the first word', () => {
      const pos: RenderPosition = { sentenceInitial: true, insideQuote: false };
      expect(render(seq(pronoun('subject'), lit(' left')), { ref: HE, position: pos })).toBe('He left');
    });

    it('absent position leaves the first word as authored (today\'s behavior)', () => {
      expect(render(seq(pronoun('subject'), lit(' left')), { ref: HE })).toBe('he left');
    });
  });
});
