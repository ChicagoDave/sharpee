// packages/lang-en-us/tests/ac9-showcase.test.ts
//
// ADR-190 AC-9 (through the ADR-192 phrase path): a room-contents message ID
// rendered through the REAL LanguageProvider pipeline (template + perspective +
// Assembler, no stubs) produces a grammatical sentence. The looking action binds
// `items` as a PhraseList of NounPhrases (see looking-data.ts); this exercises
// the same shape end-to-end.

import { describe, it, expect } from 'vitest';
import { EnglishLanguageProvider } from '../src/language-provider';
import type { NounPhrase, PhraseList, RenderContext } from '@sharpee/if-domain';

function makeCtx(): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params: {},
    settings: { serialComma: true },
    narrative: { person: 'third' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

const np = (name: string): NounPhrase => ({ kind: 'noun', name, number: 'singular', articleType: 'indefinite' });
const list = (...items: NounPhrase[]): PhraseList => ({ kind: 'list', conj: 'and', items });

function render(provider: EnglishLanguageProvider, items: PhraseList): string {
  const blocks = provider.renderMessage('if.action.looking.contents_list', { items }, makeCtx());
  return blocks.flatMap((b) => b.content).map((c) => (typeof c === 'string' ? c : '')).join('');
}

describe('AC-9: room-contents showcase (ADR-190)', () => {
  it('renders distinct items with articles end-to-end', () => {
    const provider = new EnglishLanguageProvider();
    const out = render(provider, list(np('goat'), np('rabbit'), np('parrot')));
    expect(out).toBe('You can see a goat, a rabbit, and a parrot here.');
  });

  it('groups identical items end-to-end', () => {
    const provider = new EnglishLanguageProvider();
    const out = render(provider, list(np('goat'), np('rabbit'), np('rabbit'), np('parrot')));
    expect(out).toBe('You can see a goat, two rabbits, and a parrot here.');
  });
});
