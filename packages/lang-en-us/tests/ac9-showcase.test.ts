// packages/lang-en-us/tests/ac9-showcase.test.ts
//
// ADR-190 AC-9: a room-contents message ID rendered through the REAL
// LanguageProvider pipeline (template + perspective + formatters, no stubs)
// produces a grammatical sentence.

import { describe, it, expect } from 'vitest';
import { EnglishLanguageProvider } from '../src/language-provider';
import type { EntityInfo } from '../src/formatters/types';

describe('AC-9: room-contents showcase (ADR-190)', () => {
  it('renders distinct items with articles end-to-end', () => {
    const provider = new EnglishLanguageProvider();
    const items: EntityInfo[] = [{ name: 'goat' }, { name: 'rabbit' }, { name: 'parrot' }];

    const out = provider.getMessage('if.action.looking.contents_list', { items });

    expect(out).toBe('You can see a goat, a rabbit, and a parrot here.');
  });

  it('groups identical items end-to-end', () => {
    const provider = new EnglishLanguageProvider();
    const items: EntityInfo[] = [{ name: 'goat' }, { name: 'rabbit' }, { name: 'rabbit' }, { name: 'parrot' }];

    const out = provider.getMessage('if.action.looking.contents_list', { items });

    expect(out).toBe('You can see a goat, two rabbits, and a parrot here.');
  });
});
