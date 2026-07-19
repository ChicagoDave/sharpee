/**
 * @file pronoun-sets.test.ts
 * @description ADR-242 D6/D7 — the pronoun authority's entity-fed path:
 *   a `NounPhrase.pronounSet` (the ADR-197 seam, now populated from
 *   entities) selects the standard rows by name, a provider-registered
 *   named set (`registerPronounSet`) wins BEFORE the standard rows, and
 *   an absent set keeps the by-number fallback (ruled Q-2: no injected
 *   default). Renders end-to-end through the real provider (template →
 *   parse → Assembler), asserting final strings per the Phrase Algebra
 *   test convention.
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { LocaleSettings, Mentioned, NarrativeAgreement, NounPhrase, RenderContext } from '@sharpee/if-domain';

/**
 * Minimal render context with a LIVE reference buffer (note → lastMentioned),
 * so the noun mention feeds the pronoun atom exactly as the engine's
 * turn-scoped reference seam does.
 */
function makeCtx(params: Record<string, unknown>): RenderContext {
  let last: Mentioned | undefined;
  const narrative: NarrativeAgreement = { person: 'third' };
  const settings: LocaleSettings = { serialComma: true };
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings,
    narrative,
    reference: { lastMentioned: () => last, note: (m) => { last = m; } },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks
    .flatMap((b) => b.content)
    .map((c) => (typeof c === 'string' ? c : ''))
    .join('');
}

function person(name: string, pronounSet?: string): NounPhrase {
  return {
    kind: 'noun',
    name,
    number: 'singular',
    articleType: 'none',
    properName: true,
    referableId: name.toLowerCase(),
    ...(pronounSet !== undefined ? { pronounSet } : {}),
  };
}

const ALL_CASES = '{item}: {pronoun:subject} / {pronoun:object} / {pronoun:possessive} / {pronoun:possessive-pronoun} / {pronoun:reflexive}';

describe('pronoun sets (ADR-242 D6/D7)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
    provider.addMessage('test.cases', ALL_CASES);
  });

  it('a standard set on the noun phrase selects its row (she)', () => {
    const params = { item: person('Mrs Kettle', 'she') };
    expect(text(provider.renderMessage('test.cases', params, makeCtx(params)))).toBe(
      'Mrs Kettle: she / her / her / hers / herself',
    );
  });

  it('no pronounSet keeps the by-number fallback — singular renders "it" (ruled Q-2)', () => {
    const params = { item: person('Tobias') };
    expect(text(provider.renderMessage('test.cases', params, makeCtx(params)))).toBe(
      'Tobias: it / it / its / its / itself',
    );
  });

  it('a registered named set wins before the standard rows (all five cases)', () => {
    provider.registerPronounSet('ze', {
      subject: 'ze',
      object: 'zir',
      possessive: 'zir',
      possessivePronoun: 'zirs',
      reflexive: 'zirself',
    });
    const params = { item: person('Kit', 'ze') };
    expect(text(provider.renderMessage('test.cases', params, makeCtx(params)))).toBe(
      'Kit: ze / zir / zir / zirs / zirself',
    );
  });

  it('an unregistered named set falls through to the by-number fallback (compile gates prevent this in stories)', () => {
    const params = { item: person('Kit', 'xe-not-registered') };
    expect(text(provider.renderMessage('test.cases', params, makeCtx(params)))).toBe(
      'Kit: it / it / its / its / itself',
    );
  });
});
