/**
 * actor-voice.test.ts — ADR-328 D4: grammatical person is a rendering property
 * resolved per actor. A message whose bound actor (`ACTOR_PARAM_KEY`) is not the
 * player renders the `{You}` family and bare verbs in the third person, agreed
 * with that actor by the Assembler (ADR-199); the player — or no actor — keeps
 * the ADR-089 pre-pass byte-for-byte, including 3rd-person narration pronouns.
 *
 * Derived from the Behavior Statements for `expandActorPlaceholders` and
 * `EnglishLanguageProvider.renderTemplate` (session d6dc2b, 2026-08-28).
 */
import { describe, expect, it } from 'vitest';
import type { LocaleSettings, NounPhrase, RenderContext } from '@sharpee/if-domain';
import { ACTOR_PARAM_KEY } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '../src/language-provider';
import { expandActorPlaceholders } from '../src/perspective/placeholder-resolver';

const PLAYER_ID = 'player-1';

/**
 * A render context whose narrative names the player (ADR-199 §4 B). `params`
 * must be the message's own bindings: the Assembler agrees a `Verb` with
 * `ctx.params[subjectRef]`, exactly as the engine's per-message factory sets it.
 */
function makeCtx(
  params: Record<string, unknown>,
  person: 'first' | 'second' | 'third' = 'second',
  settings: LocaleSettings = { serialComma: true },
): RenderContext {
  return {
    world: { getEntity: () => undefined, getEntityContents: () => [], getContainingRoom: () => undefined },
    params,
    settings,
    narrative: { person, playerId: PLAYER_ID },
    reference: { lastMentioned: () => undefined, note: () => undefined },
    textState: { get: () => undefined, set: () => undefined },
    contribute: () => undefined,
  };
}

function text(blocks: ReturnType<EnglishLanguageProvider['renderMessage']>): string {
  return blocks.map((b) => b.content.map((c) => (typeof c === 'string' ? c : '')).join('')).join('\n');
}

const lamp: NounPhrase = { kind: 'noun', name: 'lamp', number: 'singular', articleType: 'indefinite', referableId: 'lamp-1' };
const thief: NounPhrase = { kind: 'noun', name: 'thief', number: 'singular', articleType: 'definite', referableId: 'thief-1' };
const jack: NounPhrase = { kind: 'noun', name: 'Jack', number: 'singular', articleType: 'none', properName: true, referableId: 'jack-1' };
const mercenaries: NounPhrase = { kind: 'noun', name: 'mercenaries', number: 'plural', articleType: 'definite', referableId: 'mercs-1' };
const playerAsActor: NounPhrase = { kind: 'noun', name: 'player', number: 'singular', articleType: 'none', referableId: PLAYER_ID };

function provider(): EnglishLanguageProvider {
  const p = new EnglishLanguageProvider();
  p.addMessage('t.take', '{You} {take} {the item}.');
  p.addMessage('t.there', "{You're} already there.");
  p.addMessage('t.load', '{Your} load is too heavy.');
  p.addMessage('t.be', '{You} {be} likely to be eaten by a grue.');
  p.addMessage('t.have', '{You} {have} nothing.');
  return p;
}

describe('expandActorPlaceholders — the rewrite (pure)', () => {
  const key = ACTOR_PARAM_KEY;
  const params = { item: lamp, [key]: thief };

  it('rewrites the subject forms to the actor as a definite noun phrase', () => {
    expect(expandActorPlaceholders('{You} {take} {the item}.', params, key))
      .toBe(`{capitalize the ${key}} {verb:takes ${key}} {the item}.`);
    expect(expandActorPlaceholders('and {you} {see} it', params, key))
      .toBe(`and {the ${key}} {verb:sees ${key}} it`);
  });

  it('rewrites possessives, the to-be contraction, and the reflexive', () => {
    expect(expandActorPlaceholders('{Your} load; {your} hat; {Yours}; {yours}', params, key))
      .toBe(`{capitalize the ${key}}'s load; {the ${key}}'s hat; {capitalize the ${key}}'s; {the ${key}}'s`);
    expect(expandActorPlaceholders("{You're} here. {you're} here.", params, key))
      .toBe(`{capitalize the ${key}} {verb:is ${key}} here. {the ${key}} {verb:is ${key}} here.`);
    expect(expandActorPlaceholders('{You} {hurt} {yourself}. {Yourself}!', params, key))
      .toBe(`{capitalize the ${key}} {verb:hurts ${key}} {pronoun:reflexive}. {capitalize pronoun:reflexive}!`);
  });

  it('uses the 3rd-singular lemma for irregular verbs (ADR-089 table)', () => {
    expect(expandActorPlaceholders('{You} {be} {have} {do} {go}', params, key))
      .toBe(`{capitalize the ${key}} {verb:is ${key}} {verb:has ${key}} {verb:does ${key}} {verb:goes ${key}}`);
  });

  it('leaves bound params, hinted params, and kind-headed placeholders alone', () => {
    const template = '{the item} {item} {verb:is item} {verbatim:item} {actor}';
    expect(expandActorPlaceholders(template, { ...params, actor: 'x' }, key)).toBe(template);
  });
});

describe('renderTemplate — voice follows the bound actor (ADR-328 D4)', () => {
  it('a unique NPC actor renders third person with the definite name and an agreeing verb', () => {
    const blocks = provider().renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: thief }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: thief }));
    expect(text(blocks)).toBe('The thief takes the lamp.');
  });

  it('a proper-named actor drops the article', () => {
    expect(text(provider().renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: jack }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: jack }))))
      .toBe('Jack takes the lamp.');
  });

  it('a plural actor takes the plural verb form', () => {
    expect(text(provider().renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: mercenaries }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: mercenaries }))))
      .toBe('The mercenaries take the lamp.');
  });

  it('the contraction, possessive, and irregular forms agree with the actor', () => {
    const p = provider();
    const params = { item: lamp, [ACTOR_PARAM_KEY]: thief };
    expect(text(p.renderMessage('t.there', params, makeCtx(params)))).toBe('The thief is already there.');
    expect(text(p.renderMessage('t.load', params, makeCtx(params)))).toBe("The thief's load is too heavy.");
    expect(text(p.renderMessage('t.be', params, makeCtx(params)))).toBe('The thief is likely to be eaten by a grue.');
    expect(text(p.renderMessage('t.have', params, makeCtx(params)))).toBe('The thief has nothing.');
  });

  it('the player as actor renders exactly as before — second person, base verb', () => {
    const p = provider();
    expect(text(p.renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: playerAsActor }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: playerAsActor }))))
      .toBe('You take the lamp.');
    expect(text(p.renderMessage('t.there', { [ACTOR_PARAM_KEY]: playerAsActor }, makeCtx({ [ACTOR_PARAM_KEY]: playerAsActor }))))
      .toBe("You're already there.");
  });

  it('no actor, a string actor, or an id-less actor all take the player path', () => {
    const p = provider();
    expect(text(p.renderMessage('t.take', { item: lamp }, makeCtx({ item: lamp })))).toBe('You take the lamp.');
    expect(text(p.renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: 'thief' }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: 'thief' })))).toBe('You take the lamp.');
    const idless: NounPhrase = { kind: 'noun', name: 'thief', number: 'singular', articleType: 'definite' };
    expect(text(p.renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: idless }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: idless })))).toBe('You take the lamp.');
  });

  it("3rd-person narration keeps the player's pronoun (ADR-089) while an NPC still gets its name", () => {
    const p = provider();
    p.setNarrativeSettings({
      perspective: '3rd',
      playerPronouns: { subject: 'she', object: 'her', possessive: 'hers', possessiveAdj: 'her', reflexive: 'herself', verbForm: 'singular' },
    });
    expect(text(p.renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: playerAsActor }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: playerAsActor }, 'third'))))
      .toBe('She takes the lamp.');
    expect(text(p.renderMessage('t.take', { item: lamp, [ACTOR_PARAM_KEY]: thief }, makeCtx({ item: lamp, [ACTOR_PARAM_KEY]: thief }, 'third'))))
      .toBe('The thief takes the lamp.');
  });
});

describe('the four shipped templates rewritten from literal second person (Phase 1)', () => {
  const ids = {
    tooDark: 'if.action.going.too_dark',
    tooHeavy: 'if.action.taking.too_heavy',
    nothingToTake: 'if.action.taking.nothing_to_take',
  };

  it('are registered under their action ids', () => {
    const p = new EnglishLanguageProvider();
    for (const id of Object.values(ids)) expect(p.getTemplate?.(id), id).toBeDefined();
  });

  it('render for the player exactly as the old literals did', () => {
    const p = new EnglishLanguageProvider();
    expect(text(p.renderMessage(ids.tooDark, {}, makeCtx({})))).toBe('It is pitch dark. You are likely to be eaten by a grue.');
    expect(text(p.renderMessage(ids.tooHeavy, {}, makeCtx({})))).toBe('Your load is too heavy. You will have to leave something behind.');
    expect(text(p.renderMessage(ids.nothingToTake, {}, makeCtx({})))).toBe('You take in everything you see and enjoy the moment.');
  });

  it('render for a non-player actor in the third person', () => {
    const p = new EnglishLanguageProvider();
    const params = { [ACTOR_PARAM_KEY]: thief };
    expect(text(p.renderMessage(ids.tooDark, params, makeCtx(params)))).toBe('It is pitch dark. The thief is likely to be eaten by a grue.');
    expect(text(p.renderMessage(ids.tooHeavy, params, makeCtx(params)))).toBe("The thief's load is too heavy. The thief will have to leave something behind.");
    expect(text(p.renderMessage(ids.nothingToTake, params, makeCtx(params)))).toBe('The thief takes in everything the thief sees and enjoys the moment.');
  });
});

describe('the witnessed-mover templates (ADR-328 D5) — emitted only for a non-player actor', () => {
  const ids = { departs: 'if.action.going.departs', arrives: 'if.action.going.arrives' };

  it('are registered under the going action id', () => {
    const p = new EnglishLanguageProvider();
    for (const id of Object.values(ids)) expect(p.getTemplate?.(id), id).toBeDefined();
  });

  it('render a non-player mover by name, in the third person, with the surface direction', () => {
    const p = new EnglishLanguageProvider();
    const params = { [ACTOR_PARAM_KEY]: thief, direction: 'north' };
    expect(text(p.renderMessage(ids.departs, params, makeCtx(params)))).toBe('The thief leaves to the north.');
    expect(text(p.renderMessage(ids.arrives, { ...params, direction: 'south' }, makeCtx({ ...params, direction: 'south' })))).toBe('The thief enters from the south.');
  });

  it('agree a plural mover', () => {
    const p = new EnglishLanguageProvider();
    const params = { [ACTOR_PARAM_KEY]: mercenaries, direction: 'east' };
    expect(text(p.renderMessage(ids.departs, params, makeCtx(params)))).toBe('The mercenaries leave to the east.');
  });
});
