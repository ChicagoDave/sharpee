/**
 * @file examined-self-detail.test.ts
 * @description GH #325 — `examined_self` carries the `{slot:detail}` append,
 *   so the player's own state-gated detail lines (Chord `phrase detail
 *   while …` on the playable character) render on `x me` exactly as they
 *   do when examining any other person. Without a contribution the message
 *   is byte-identical to before.
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { Phrase, RenderContext } from '@sharpee/if-domain';

function makeCtx(
  params: Record<string, unknown> = {},
  slots: Record<string, Phrase[]> = {},
): RenderContext {
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

describe('if.action.examining.examined_self (GH #325)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  it('appends the detail slot after the description', () => {
    const params = { description: 'Jack Toresal, a boy in this market.' };
    const blocks = provider.renderMessage(
      'if.action.examining.examined_self',
      params,
      makeCtx(params, { detail: [{ kind: 'literal', text: 'Jack in the dress and the fashionable hat.' }] }),
    );
    expect(text(blocks)).toBe('Jack Toresal, a boy in this market. Jack in the dress and the fashionable hat.');
  });

  it('renders the bare description when nothing contributes to the slot', () => {
    const params = { description: 'Jack Toresal, a boy in this market.' };
    const blocks = provider.renderMessage('if.action.examining.examined_self', params, makeCtx(params));
    expect(text(blocks)).toBe('Jack Toresal, a boy in this market.');
  });
});
