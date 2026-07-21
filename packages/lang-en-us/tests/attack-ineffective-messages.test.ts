/**
 * @file attack-ineffective-messages.test.ts
 * @description Platform-issue-sweep Phase 3c — the per-reason ineffective-
 *   attack templates render real sentences (world-model emits reason codes;
 *   stdlib maps them to these IDs; nothing renders blank).
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import type { NounPhrase, RenderContext } from '@sharpee/if-domain';

function makeCtx(params: Record<string, unknown> = {}): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings: { serialComma: true },
    narrative: { person: 'second' },
    reference: { lastMentioned: () => undefined, note: () => undefined },
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

function np(name: string): NounPhrase {
  return { kind: 'noun', name, number: 'singular', articleType: 'indefinite' };
}

describe('if.action.attacking ineffective-reason templates (Phase 3c)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  it.each([
    ['attack_ineffective', 'Your attack has no effect on the bronze statue.'],
    ['attack_requires_weapon', 'You need a weapon to damage the cracked wall.'],
    ['attack_wrong_weapon_type', "That weapon won't work on the cracked wall."],
    ['attack_invulnerable', 'The black monolith cannot be damaged.'],
  ])('%s renders a real sentence', (key, expected) => {
    const target =
      key === 'attack_ineffective' ? np('bronze statue')
      : key === 'attack_invulnerable' ? np('black monolith')
      : np('cracked wall');
    const params = { target };
    const blocks = provider.renderMessage(`if.action.attacking.${key}`, params, makeCtx(params));
    expect(text(blocks)).toBe(expected);
  });
});
