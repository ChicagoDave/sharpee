/**
 * @file render-message.test.ts
 * @description ADR-192 Phase 3b (W1) — EnglishLanguageProvider phrase path:
 *   getTemplate, getLocaleSettings, and renderMessage (template → perspective →
 *   parse → Assembler → ITextBlock[]).
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import { PhraseParseError } from '../src/parser';
import type { LocaleSettings, RenderContext } from '@sharpee/if-domain';

/** Minimal inert render context (seams are placeholders in W2). */
function makeCtx(settings: LocaleSettings = { serialComma: true }): RenderContext {
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

/** Flatten a realized block list to plain text. */
function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : '⟦deco⟧'))
    .join('');
}

describe('EnglishLanguageProvider phrase path (ADR-192 W1)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('getTemplate', () => {
    it('returns the raw, unresolved template for a registered ID', () => {
      provider.addMessage('test.raw', 'You take {the item}.');
      expect(provider.getTemplate('test.raw')).toBe('You take {the item}.');
    });

    it('returns undefined for an unregistered ID', () => {
      expect(provider.getTemplate('test.missing')).toBeUndefined();
    });
  });

  describe('getLocaleSettings', () => {
    it('reflects the serial-comma setting (default on)', () => {
      expect(provider.getLocaleSettings()).toEqual({ serialComma: true });
    });

    it('reflects a story override of the serial comma', () => {
      provider.setSerialComma(false);
      expect(provider.getLocaleSettings()).toEqual({ serialComma: false });
    });
  });

  describe('renderMessage', () => {
    it('realizes a definite NounPhrase placeholder to blocks (AC-2 through the provider)', () => {
      provider.addMessage('test.take', '{the item}');
      const blocks = provider.renderMessage('test.take', { item: 'cabinet' }, makeCtx());
      expect(text(blocks)).toBe('the cabinet');
    });

    it('agrees a/an over the rendered head for an indefinite placeholder', () => {
      provider.addMessage('test.see', 'You see {a item}.');
      expect(text(provider.renderMessage('test.see', { item: 'owl' }, makeCtx()))).toBe('You see an owl.');
      expect(text(provider.renderMessage('test.see', { item: 'goat' }, makeCtx()))).toBe('You see a goat.');
    });

    it('resolves perspective placeholders BEFORE parsing (ADR-089 pre-pass)', () => {
      // {You} is a fixed perspective word; default narrative context is 2nd person.
      provider.addMessage('test.persp', '{You} take {the item}.');
      expect(text(provider.renderMessage('test.persp', { item: 'lamp' }, makeCtx()))).toBe('You take the lamp.');
    });

    it('honors the serial comma from the render context settings', () => {
      provider.addMessage('test.list', '{items}');
      const items = { kind: 'list' as const, conj: 'and' as const, items: [
        { kind: 'noun' as const, name: 'apple', number: 'singular' as const, articleType: 'indefinite' as const },
        { kind: 'noun' as const, name: 'pear', number: 'singular' as const, articleType: 'indefinite' as const },
        { kind: 'noun' as const, name: 'plum', number: 'singular' as const, articleType: 'indefinite' as const },
      ] };
      const on = text(provider.renderMessage('test.list', { items }, makeCtx({ serialComma: true })));
      const off = text(provider.renderMessage('test.list', { items }, makeCtx({ serialComma: false })));
      expect(on).toBe('an apple, a pear, and a plum');
      expect(off).toBe('an apple, a pear and a plum');
    });

    it('renders a {verbatim:x} scalar param as opaque text (ADR-200, end-to-end)', () => {
      provider.addMessage('test.greet', 'Hello, {verbatim:npcName}.');
      expect(text(provider.renderMessage('test.greet', { npcName: 'Aragorn' }, makeCtx()))).toBe('Hello, Aragorn.');
    });

    it('echoes an unregistered ID as a literal block (getMessage-parity fallback)', () => {
      const blocks = provider.renderMessage('test.missing', {}, makeCtx());
      expect(text(blocks)).toBe('test.missing');
    });

    it('throws PhraseParseError at parse time for an unbound placeholder param', () => {
      provider.addMessage('test.unbound', 'You take {the item}.');
      expect(() => provider.renderMessage('test.unbound', {}, makeCtx())).toThrow(PhraseParseError);
    });

    it('throws PhraseParseError for a legacy :-chain template (AC-8 via provider)', () => {
      provider.addMessage('test.legacy', 'You take {cap:the:item}.');
      expect(() => provider.renderMessage('test.legacy', { item: 'lamp' }, makeCtx())).toThrow(PhraseParseError);
    });
  });
});
