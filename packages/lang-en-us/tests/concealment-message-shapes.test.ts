/**
 * @file concealment-message-shapes.test.ts
 * @description Platform-issue-sweep Phase 1 — per-shape concealment/hiding
 *   messages render with no stray article. The old single templates bound
 *   bare-string prepositions ({where}/{position}) that the assembler
 *   article-decorated ("Hidden an on…", "can't hide an under…"); the fix is
 *   per-shape message IDs whose preposition lives in the template text and
 *   whose entity params are NounPhrase/PhraseList values.
 *
 *   These tests assert the ACTUAL rendered string for each shape (the phase's
 *   exit gate), not just message-ID emission.
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { LocaleSettings, NounPhrase, RenderContext } from '@sharpee/if-domain';

/** Minimal inert render context (mirrors render-message.test.ts). */
function makeCtx(settings: LocaleSettings = { serialComma: true }): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings,
    narrative: { person: 'second' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

/** Flatten a realized block list to plain text. */
function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('');
}

/** A singular indefinite NounPhrase param, as nounPhraseFor produces. */
function np(name: string): NounPhrase {
  return { kind: 'noun', name, number: 'singular', articleType: 'indefinite' };
}

/** A PhraseList param, as stdlib's phraseListFor produces. */
function list(...names: string[]) {
  return { kind: 'list' as const, conj: 'and' as const, items: names.map(np) };
}

describe('concealment/hiding per-shape messages (platform-issue-sweep Phase 1)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  describe('if.action.searching.found_concealed_*', () => {
    it('container shape renders the preposition from the template, no stray article', () => {
      const blocks = provider.renderMessage(
        'if.action.searching.found_concealed_in_container',
        { target: np('oak desk'), items: list('secret key') },
        makeCtx(),
      );
      expect(text(blocks)).toBe('Hidden inside the oak desk, you discover: a secret key.');
    });

    it('supporter shape renders "on" from the template', () => {
      const blocks = provider.renderMessage(
        'if.action.searching.found_concealed_on_supporter',
        { target: np('stone altar'), items: list('hidden gem') },
        makeCtx(),
      );
      expect(text(blocks)).toBe('Hidden on the stone altar, you discover: a hidden gem.');
    });

    it('bare-"here" shape (location/object) renders with no target slot', () => {
      const blocks = provider.renderMessage(
        'if.action.searching.found_concealed_here',
        { target: np('Test Room'), items: list('silver coin') },
        makeCtx(),
      );
      expect(text(blocks)).toBe('Hidden here, you discover: a silver coin.');
    });

    it('joins multiple concealed items under the punctuation authority', () => {
      const blocks = provider.renderMessage(
        'if.action.searching.found_concealed_on_supporter',
        { target: np('dusty bookshelf'), items: list('hidden lever', 'secret compartment') },
        makeCtx(),
      );
      expect(text(blocks)).toBe(
        'Hidden on the dusty bookshelf, you discover: a hidden lever and a secret compartment.',
      );
    });
  });

  describe('if.action.hiding.cant_hide_there_*', () => {
    const target = np('velvet curtain');

    it.each([
      ['behind', 'You can\'t hide behind the velvet curtain.'],
      ['under', 'You can\'t hide under the velvet curtain.'],
      ['on', 'You can\'t hide on the velvet curtain.'],
      ['inside', 'You can\'t hide inside the velvet curtain.'],
    ])('position %s renders its preposition from the template', (position, expected) => {
      const blocks = provider.renderMessage(
        `if.action.hiding.cant_hide_there_${position}`,
        { target, position },
        makeCtx(),
      );
      expect(text(blocks)).toBe(expected);
    });
  });

  describe('regression: the retired single-template IDs are gone', () => {
    it('found_concealed no longer exists (per-shape IDs replaced it)', () => {
      expect(provider.hasMessage('if.action.searching.found_concealed')).toBe(false);
    });

    it('cant_hide_there no longer exists (per-position IDs replaced it)', () => {
      expect(provider.hasMessage('if.action.hiding.cant_hide_there')).toBe(false);
    });
  });
});
