/**
 * @file dialogue-attribution.test.ts
 * @description ADR-201 §6 (Phase 1) — the stdlib dialogue catalogs
 *   (talking/asking/telling) use `{verb:… target}` for NPC speech attribution,
 *   so the speech verb agrees with the speaker's number/person instead of a
 *   hardcoded "says". Renders the *real shipped* catalog strings end-to-end
 *   through the provider (template → perspective → parse → Assembler).
 *
 * AC map (ADR-201): AC-3 (speech verb agrees with speaker number/person),
 * AC-7 (talking/asking/telling catalogs use `{verb:…}` for attribution).
 */

import { EnglishLanguageProvider } from '../src/language-provider';
import { talkingLanguage } from '../src/actions/talking';
import { askingLanguage } from '../src/actions/asking';
import { tellingLanguage } from '../src/actions/telling';
import type { LocaleSettings, NarrativeAgreement, NounPhrase, RenderContext } from '@sharpee/if-domain';

/**
 * Minimal render context; narrative defaults to 3rd-person. Mirrors production:
 * the engine's `makeRenderContext(params)` puts the same params on `ctx.params`,
 * which the Verb realizer reads for subject agreement at realize time.
 */
function makeCtx(
  params: Record<string, unknown> = {},
  narrative: NarrativeAgreement = { person: 'third' },
  settings: LocaleSettings = { serialComma: true },
): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings,
    narrative,
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

/** A bound NounPhrase speaker with a controllable number/person. */
function speaker(name: string, over: Partial<NounPhrase> = {}): NounPhrase {
  return { kind: 'noun', name, number: 'singular', articleType: 'definite', ...over };
}

describe('dialogue attribution agreement (ADR-201 §6, AC-3/AC-7)', () => {
  let provider: EnglishLanguageProvider;

  beforeEach(() => {
    provider = new EnglishLanguageProvider();
  });

  /** Register a real catalog string under a test id and render it. */
  function render(template: string, target: NounPhrase, narrative?: NarrativeAgreement): string {
    provider.addMessage('test.attr', template);
    const params = { target };
    return text(provider.renderMessage('test.attr', params, makeCtx(params, narrative)));
  }

  describe('talking catalog — "says" agrees with the speaker (AC-3, AC-7)', () => {
    it('greets_back: singular speaker → "says"', () => {
      expect(render(talkingLanguage.messages.greets_back, speaker('merchant')))
        .toBe('The merchant says, "Hello there!"');
    });

    it('greets_back: plural speaker → "say"', () => {
      expect(render(talkingLanguage.messages.greets_back, speaker('goats', { number: 'plural' })))
        .toBe('The goats say, "Hello there!"');
    });

    it('remembers_you: plural speaker → "say"', () => {
      expect(render(talkingLanguage.messages.remembers_you, speaker('twins', { number: 'plural' })))
        .toBe('The twins say, "Ah, it\'s you again."');
    });

    it('greets_back: 2nd-person speaker → "say" (AC-3 person)', () => {
      // The player subject (referableId === playerId) takes the narrative person.
      const you = speaker('guards', { referableId: 'player', number: 'plural' });
      expect(render(talkingLanguage.messages.greets_back, you, { person: 'second', playerId: 'player' }))
        .toContain(' say, ');
    });
  });

  describe('asking catalog — "says"/"tells"/"explains" agree (AC-3, AC-7)', () => {
    it('unknown_topic: plural speaker → "say"', () => {
      expect(render(askingLanguage.messages.unknown_topic, speaker('elders', { number: 'plural' })))
        .toBe('The elders say, "I don\'t know anything about that."');
    });

    it('responds ("tells"): singular → "tells", plural → "tell"', () => {
      provider.addMessage('test.responds', askingLanguage.messages.responds);
      const sing = { target: speaker('sage'), topic: 'the map' };
      const plur = { target: speaker('sages', { number: 'plural' }), topic: 'the map' };
      const singular = text(provider.renderMessage('test.responds', sing, makeCtx(sing)));
      const plural = text(provider.renderMessage('test.responds', plur, makeCtx(plur)));
      expect(singular).toBe('The sage tells you about the map.');
      expect(plural).toBe('The sages tell you about the map.');
    });

    it('explains ("explains"): singular → "explains", plural → "explain"', () => {
      provider.addMessage('test.explains', askingLanguage.messages.explains);
      const sing = { target: speaker('scholar'), topic: 'the ruins' };
      const plur = { target: speaker('scholars', { number: 'plural' }), topic: 'the ruins' };
      const singular = text(provider.renderMessage('test.explains', sing, makeCtx(sing)));
      const plural = text(provider.renderMessage('test.explains', plur, makeCtx(plur)));
      expect(singular).toBe('The scholar explains about the ruins.');
      expect(plural).toBe('The scholars explain about the ruins.');
    });
  });

  describe('telling catalog — "says" agrees with the speaker (AC-3, AC-7)', () => {
    it('very_interested: singular → "says"', () => {
      expect(render(tellingLanguage.messages.very_interested, speaker('king')))
        .toBe('The king says, "Really? Tell me more!"');
    });

    it('very_interested: plural → "say"', () => {
      expect(render(tellingLanguage.messages.very_interested, speaker('councilors', { number: 'plural' })))
        .toBe('The councilors say, "Really? Tell me more!"');
    });
  });
});
