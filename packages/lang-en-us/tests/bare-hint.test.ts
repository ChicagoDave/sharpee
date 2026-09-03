/**
 * @file bare-hint.test.ts
 * @description GH #337 — the `bare` template hint renders a bound noun with
 *   no article, so a template can supply its own determiner ("another
 *   {bare item}" → "another pear"); the unhinted default (indefinite) and the
 *   article hints are unchanged.
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { RenderContext } from '@sharpee/if-domain';

function makeCtx(params: Record<string, unknown> = {}): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative: { person: 'second' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
    slotContributions: () => [],
  };
}

function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('');
}

describe('the `bare` hint (GH #337)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
    provider.addMessage('test.another', 'No one notices you picking up another {bare item}.');
    provider.addMessage('test.indefinite', 'You pick up {item}.');
    provider.addMessage('test.definite', 'You pick up {the item}.');
  });

  it('renders the bound noun with no article', () => {
    const params = { item: 'pear' };
    expect(text(provider.renderMessage('test.another', params, makeCtx(params)))).toBe(
      'No one notices you picking up another pear.',
    );
  });

  it('leaves the unhinted default and the article hints as they were', () => {
    const params = { item: 'pear' };
    expect(text(provider.renderMessage('test.indefinite', params, makeCtx(params)))).toBe('You pick up a pear.');
    expect(text(provider.renderMessage('test.definite', params, makeCtx(params)))).toBe('You pick up the pear.');
  });
});
