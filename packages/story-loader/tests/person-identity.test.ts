/**
 * person-identity.test.ts — ADR-242 platform side (D2, D3, D6, D7;
 * AC-1, AC-3, AC-4, AC-5): the loader's person branch maps `proper` to
 * the player's proper-name shape and `pronouns` to
 * `IdentityTrait.pronounSet`; the `article: undefined` pin is gone from
 * every loaded entity; declared pronoun sets register through the REAL
 * `extendLanguage` seam into a REAL EnglishLanguageProvider, and the
 * REAL assembler renders bare proper names and declared pronoun forms.
 * REAL-PATH throughout: real compile → real loader → real WorldModel →
 * real nounPhraseFor → real provider render; no identity/provider stubs.
 */
import { describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { IdentityTrait, TraitType, WorldModel } from '@sharpee/world-model';
import { nounPhraseFor } from '@sharpee/stdlib';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import type { LocaleSettings, Mentioned, NarrativeAgreement, RenderContext } from '@sharpee/if-domain';
import { ChordStory, createStory } from '../src';

function compileSource(source: string): StoryIR {
  const result = compile(source);
  if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
  return result.ir;
}

const STORY = `story "Estate" by "T"
  id: estate
  version: 0.0.1

create the Hall
  a room

  A hall.

create the player
  starts in the Hall

  Fine.

create Tobias
  a person, proper
  in the Hall

create Mrs Kettle
  a person, proper
  pronouns she
  in the Hall

create the zookeeper
  a person
  in the Hall

create Kit
  a person, proper
  pronouns ze
  in the Hall

define pronouns ze
  subject ze
  object zir
  possessive zir
  possessive-pronoun zirs
  reflexive zirself
end pronouns
`;

function load() {
  const story = createStory(compileSource(STORY));
  const world = new WorldModel();
  story.initializeWorld(world);
  const player = story.createPlayer(world);
  world.setPlayer(player.id);
  return { story, world };
}

function identityOf(story: ChordStory, world: WorldModel, irId: string): IdentityTrait {
  const entity = world.getEntity(story.entityId(irId)!)!;
  return entity.get(TraitType.IDENTITY) as IdentityTrait;
}

/** Minimal render context with a LIVE reference buffer (note → lastMentioned). */
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

/** Real provider fed by the story's real extendLanguage registration. */
function providerFor(story: ChordStory): EnglishLanguageProvider {
  const provider = new EnglishLanguageProvider();
  story.extendLanguage(provider);
  provider.addMessage('test.listing', 'You can see {item} here.');
  provider.addMessage('test.cases', '{item}: {pronoun:subject} / {pronoun:object} / {pronoun:possessive} / {pronoun:possessive-pronoun} / {pronoun:reflexive}');
  return provider;
}

function render(provider: EnglishLanguageProvider, id: string, params: Record<string, unknown>): string {
  return text(provider.renderMessage(id, params, makeCtx(params)));
}

describe('proper persons (ADR-242 D2/D3 — AC-1, AC-3)', () => {
  it('AC-1: a `proper` person loads with the proper-name shape and renders bare through the real pipeline', () => {
    const { story, world } = load();
    const identity = identityOf(story, world, 'tobias');
    expect(identity.properName).toBe(true);
    expect(identity.article).toBe('');

    const provider = providerFor(story);
    const tobias = world.getEntity(story.entityId('tobias')!)!;
    expect(render(provider, 'test.listing', { item: nounPhraseFor(tobias) })).toBe('You can see Tobias here.');
  });

  it('AC-3: a plain person keeps the trait defaults — and NO loaded entity carries article: undefined', () => {
    const { story, world } = load();
    const keeper = identityOf(story, world, 'zookeeper');
    expect(keeper.properName).toBe(false);
    expect(keeper.article).toBe('a');

    for (const entity of world.getAllEntities()) {
      if (!entity.has(TraitType.IDENTITY)) continue;
      const identity = entity.get(TraitType.IDENTITY) as IdentityTrait;
      expect(identity.article, `article on ${entity.id}`).not.toBeUndefined();
    }
  });

  it('a plain person renders with contextual articles ("a zookeeper" in listings)', () => {
    const { story, world } = load();
    const provider = providerFor(story);
    const keeper = world.getEntity(story.entityId('zookeeper')!)!;
    expect(render(provider, 'test.listing', { item: nounPhraseFor(keeper) })).toBe('You can see a zookeeper here.');
  });
});

describe('pronouns (ADR-242 D6/D7 — AC-4, AC-5, ruled Q-2)', () => {
  it('AC-4: `pronouns she` round-trips loader → IdentityTrait → nounPhraseFor → real assembler forms', () => {
    const { story, world } = load();
    expect(identityOf(story, world, 'mrs-kettle').pronounSet).toBe('she');

    const provider = providerFor(story);
    const kettle = world.getEntity(story.entityId('mrs-kettle')!)!;
    expect(render(provider, 'test.cases', { item: nounPhraseFor(kettle) })).toBe(
      'Mrs Kettle: she / her / her / hers / herself',
    );
  });

  it('D6: a person with no `pronouns` line has NO pronounSet and keeps the by-number fallback ("it")', () => {
    const { story, world } = load();
    expect(identityOf(story, world, 'tobias').pronounSet).toBeUndefined();
    expect(identityOf(story, world, 'zookeeper').pronounSet).toBeUndefined();

    const provider = providerFor(story);
    const tobias = world.getEntity(story.entityId('tobias')!)!;
    expect(render(provider, 'test.cases', { item: nounPhraseFor(tobias) })).toBe(
      'Tobias: it / it / its / its / itself',
    );
  });

  it('AC-5: a `define pronouns` set registers through the REAL extendLanguage seam and renders its declared forms', () => {
    const { story, world } = load();
    expect(identityOf(story, world, 'kit').pronounSet).toBe('ze');

    const provider = providerFor(story);
    const kit = world.getEntity(story.entityId('kit')!)!;
    expect(render(provider, 'test.cases', { item: nounPhraseFor(kit) })).toBe(
      'Kit: ze / zir / zir / zirs / zirself',
    );
  });

  it('a provider without registerPronounSet is a legible LoadError only when sets are declared', () => {
    const story = createStory(compileSource(STORY));
    const stub = { addMessage: () => undefined } as never;
    expect(() => story.extendLanguage(stub)).toThrow(/registerPronounSet/);
  });
});
