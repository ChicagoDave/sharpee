/**
 * @file A gate failure names the phrase and the reason (ADR-385 D8)
 * @description Against a REAL WorldModel: when a constrained slot admits
 *   nothing, the gate asks the matcher over everything the actor can see. A
 *   name found is a SCOPE_VIOLATION carrying the base the slot required and
 *   the entity found; nothing found is ENTITY_NOT_FOUND naming the phrase's
 *   content words, never its first token. A pronoun whose referent is in
 *   view but outside the base fails the same way.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import { WorldModel, IFEntity, RoomTrait, ActorTrait, ContainerTrait, OpenableTrait, IdentityTrait } from '@sharpee/world-model';
import { vocabularyRegistry } from '@sharpee/if-domain';
import { EnglishLanguageProvider } from '@sharpee/lang-en-us';
import { EnglishParser } from '../src/english-parser';
import { getPronounContextManager } from '../src/pronoun-context';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

describe('a gate failure names the phrase and the reason (ADR-385 D8)', () => {
  let world: WorldModel;
  let parser: EnglishParser;
  let room: IFEntity;
  let player: IFEntity;
  let lantern: IFEntity;
  let firefly: IFEntity;

  const thing = (name: string): IFEntity => {
    const entity = world.createEntity(name, 'item');
    entity.add(new IdentityTrait({ name }));
    return entity;
  };

  beforeEach(() => {
    vocabularyRegistry.clear();
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    room = world.createEntity('Workshop', 'room');
    room.add(new RoomTrait());
    room.add(new ContainerTrait());
    player = world.createEntity('Alex', 'actor');
    player.add(new ActorTrait());
    player.add(new ContainerTrait());
    world.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    lantern = thing('brass lantern');
    world.moveEntity(lantern.id, room.id);
    // a closed transparent jar: its firefly is visible and not touchable
    const jar = world.createEntity('jar', 'container');
    jar.add(new ContainerTrait({ isTransparent: true }));
    jar.add(new OpenableTrait({ isOpen: true }));
    world.moveEntity(jar.id, room.id);
    firefly = thing('firefly');
    world.moveEntity(firefly.id, jar.id);
    jar.getTrait(OpenableTrait)!.isOpen = false;

    parser = new EnglishParser(new EnglishLanguageProvider());
    parser.setWorldContext(world, player.id, room.id);
    const grammar = parser.getStoryGrammar();
    grammar.define('wind :target').where('target', (s) => s.carried()).mapsTo('story.winding').build();
    grammar.define('tickle :target').where('target', (s) => s.touchable()).mapsTo('story.tickling').build();
  });

  const failure = (input: string) => {
    const result = parser.parse(input);
    expect(result.success, input).toBe(false);
    if (result.success) throw new Error(input);
    return result.error;
  };

  it('`wind lantern` with the lantern in view and not held: a scope violation naming the lantern, base carried', () => {
    const error = failure('wind lantern');
    expect(error.code).toBe('SCOPE_VIOLATION');
    expect(error.messageId).toBe('parser.error.scopeViolation.carried');
    expect(error.entityId).toBe(lantern.id);
    expect(error.requiredScope).toBe('carried');
  });

  it('`wind the lantern` fails the same way: the article is not the noun', () => {
    const error = failure('wind the lantern');
    expect(error.code).toBe('SCOPE_VIOLATION');
    expect(error.entityId).toBe(lantern.id);
  });

  it('`tickle firefly` behind closed glass: a scope violation, base touchable', () => {
    const error = failure('tickle firefly');
    expect(error.code).toBe('SCOPE_VIOLATION');
    expect(error.messageId).toBe('parser.error.scopeViolation.touchable');
    expect(error.entityId).toBe(firefly.id);
    expect(error.requiredScope).toBe('touchable');
  });

  it('`wind the widget`: nothing found anywhere in view, so ENTITY_NOT_FOUND naming the content words', () => {
    const error = failure('wind the widget');
    expect(error.code).toBe('ENTITY_NOT_FOUND');
    expect(error.failedWord).toBe('widget');
    expect(error.entityId).toBeUndefined();
  });

  it('`wind it` with `it` the unheld lantern: a scope violation naming the lantern', () => {
    getPronounContextManager()!.registerEntity(lantern.id, 'brass lantern', world);
    const error = failure('wind it');
    expect(error.code).toBe('SCOPE_VIOLATION');
    expect(error.entityId).toBe(lantern.id);
    expect(error.requiredScope).toBe('carried');
  });
});
