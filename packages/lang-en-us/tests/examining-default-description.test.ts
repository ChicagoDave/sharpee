/**
 * @file examining-default-description.test.ts
 * @description Platform-issue-sweep Phase 3a — the generalized descriptionless
 *   EXAMINE fallback renders David's exact wording ("The {noun} is just a
 *   {noun}.") instead of a silent blank, for any entity shape, with the
 *   {slot:detail} append still following the fallback line.
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { LocaleSettings, NounPhrase, Phrase, RenderContext } from '@sharpee/if-domain';

function makeCtx(
  params: Record<string, unknown> = {},
  slots: Record<string, Phrase[]> = {},
): RenderContext {
  // Production's makeRenderContext(params) mirrors the message params into
  // the render context so {verb:is item} can agree with its subject.
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative: { person: 'second' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
    slotContributions: (key: string) => slots[key] ?? [],
  };
}

function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('');
}

function np(name: string, overrides: Partial<NounPhrase> = {}): NounPhrase {
  return { kind: 'noun', name, number: 'singular', articleType: 'indefinite', ...overrides };
}

describe('if.action.examining.default_description (Phase 3a)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  it('renders David\'s exact wording for a plain singular noun', () => {
    const params = { item: np('pebble') };
    const blocks = provider.renderMessage(
      'if.action.examining.default_description',
      params,
      makeCtx(params),
    );
    expect(text(blocks)).toBe('The pebble is just a pebble.');
  });

  it('agrees the verb and drops the article for a plural noun', () => {
    const params = { item: np('direction signs', { number: 'plural' }) };
    const blocks = provider.renderMessage(
      'if.action.examining.default_description',
      params,
      makeCtx(params),
    );
    expect(text(blocks)).toBe('The direction signs are just direction signs.');
  });

  it('suppresses articles for a proper name', () => {
    const params = { item: np('Floyd', { properName: true, articleType: 'none' }) };
    const blocks = provider.renderMessage(
      'if.action.examining.default_description',
      params,
      makeCtx(params),
    );
    expect(text(blocks)).toBe('Floyd is just Floyd.');
  });

  it('keeps the {slot:detail} append after the fallback line', () => {
    const params = { item: np('lantern') };
    const blocks = provider.renderMessage(
      'if.action.examining.default_description',
      params,
      makeCtx(params, { detail: [{ kind: 'literal', text: 'It hums softly.' }] }),
    );
    expect(text(blocks)).toBe('The lantern is just a lantern. It hums softly.');
  });

  it('renders the self counterpart for descriptionless EXAMINE ME', () => {
    // David's wording ruling 2026-07-20: the player noun does not fit the
    // "just a" phrasing; self gets the classic line instead.
    const blocks = provider.renderMessage(
      'if.action.examining.default_description_self',
      {},
      makeCtx({}),
    );
    expect(text(blocks)).toBe('As good-looking as ever.');
  });
});
