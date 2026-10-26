/**
 * The gate's answer travels to the validator (ADR-385 D4).
 *
 * A noun phrase that carries `scope` (the entity ids a constrained slot
 * admitted at parse time) resolves only among the validator's own candidates
 * that are also in it: same tiers, same dominance, same disambiguation. The
 * set narrows and never adds. A phrase without `scope` resolves as before.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AuthorModel, EntityType, IFEntity, IParsedCommand, TraitType, WorldModel } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { examiningAction } from '../../../src/actions/standard/examining';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

const language = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: () => true,
  getActionPatterns: (actionId: string) => (actionId === 'if.action.examining' ? ['examine', 'x'] : undefined),
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.examining']
} as unknown as LanguageProvider;

function examine(text: string, scope?: string[]): IParsedCommand {
  const words = text.split(' ');
  return {
    rawInput: `examine ${text}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'examine', head: 'examine' },
      directObject: {
        tokens: words.map((_, i) => i + 1),
        text,
        head: words[words.length - 1],
        modifiers: words.slice(0, -1),
        articles: [],
        determiners: [],
        ...(scope ? { scope } : {})
      }
    },
    pattern: 'VERB_NOUN',
    action: 'if.action.examining'
  };
}

describe('CommandValidator resolves a scoped phrase among the admitted ids (ADR-385 D4)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let room: IFEntity;
  let brassClock: IFEntity;
  let wallClock: IFEntity;
  let validator: CommandValidator;

  beforeEach(() => {
    world = new WorldModel();
    world.setLanguageWords(ENGLISH_WORDS);
    author = new AuthorModel(world.getDataStore(), world);
    const player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Workshop', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);

    brassClock = author.createEntity('brass clock', EntityType.OBJECT);
    brassClock.add({ type: TraitType.IDENTITY, name: 'brass clock' });
    wallClock = author.createEntity('wall clock', EntityType.OBJECT);
    wallClock.add({ type: TraitType.IDENTITY, name: 'wall clock' });
    author.moveEntity(brassClock.id, player.id);
    author.moveEntity(wallClock.id, room.id);

    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(language);
    registry.register(examiningAction);
    validator = new CommandValidator(world, registry);
  });

  test('without `scope`, `clock` ties the two clocks and asks', () => {
    const result = validator.validate(examine('clock'));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('AMBIGUOUS_ENTITY');
  });

  test('with `scope` naming the held clock, `clock` resolves it and the wall clock is never asked about', () => {
    const result = validator.validate(examine('clock', [brassClock.id]));
    expect(result.success).toBe(true);
    if (result.success) expect(result.value.directObject?.entity.id).toBe(brassClock.id);
  });

  test('`scope` narrows and never adds: ids the phrase does not name resolve nothing', () => {
    const result = validator.validate(examine('clock', [room.id]));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ENTITY_NOT_FOUND');
  });

  test('the tiers still apply inside the scope: an unmatched word disqualifies', () => {
    const result = validator.validate(examine('brass sword', [brassClock.id]));
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.code).toBe('ENTITY_NOT_FOUND');
  });
});
