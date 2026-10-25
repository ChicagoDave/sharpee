/**
 * Lists resolve in the validator, through the matcher (ADR-385 D5).
 *
 * Each item of `take X and Y` resolves by the single-noun path and the
 * validated command carries the results in order as `directObjects`. An
 * item that names nothing fails the command with ENTITY_NOT_FOUND naming
 * that item; a tied item asks, with that item's candidates and token span.
 * `all` is still the action's to expand: no `directObject`, no `directObjects`.
 */

import { describe, test, expect, beforeEach } from 'vitest';
import { AuthorModel, EntityType, IFEntity, INounPhrase, IParsedCommand, TraitType, WorldModel } from '@sharpee/world-model';
import { LanguageProvider } from '@sharpee/if-domain';
import { CommandValidator } from '../../../src/validation/command-validator';
import { StandardActionRegistry } from '../../../src/actions/registry';
import { takingAction } from '../../../src/actions/standard/taking';

const language = {
  languageCode: 'en-US',
  getMessage: (id: string) => id,
  hasMessage: () => true,
  getActionPatterns: (actionId: string) => (actionId === 'if.action.taking' ? ['take', 'get'] : undefined),
  getActionHelp: () => undefined,
  getSupportedActions: () => ['if.action.taking']
} as unknown as LanguageProvider;

/** A noun phrase as the parser builds it, its tokens placed from `at`. */
function phrase(text: string, at: number): INounPhrase {
  const words = text.split(' ');
  return {
    tokens: words.map((_, i) => at + i),
    text,
    head: words[words.length - 1],
    modifiers: words.slice(0, -1),
    articles: [],
    determiners: []
  };
}

function takeList(...items: string[]): IParsedCommand {
  let at = 1;
  const parts = items.map((text) => {
    const np = phrase(text, at);
    at += text.split(' ').length + 1;
    return np;
  });
  return {
    rawInput: `take ${items.join(' and ')}`,
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'take', head: 'take' },
      directObject: {
        tokens: parts.flatMap((p) => p.tokens),
        text: items.join(' and '),
        head: '',
        modifiers: [],
        articles: [],
        determiners: [],
        isList: true,
        items: parts
      }
    },
    pattern: 'VERB_NOUN',
    action: 'if.action.taking'
  };
}

function takeAll(): IParsedCommand {
  return {
    rawInput: 'take all',
    tokens: [],
    structure: {
      verb: { tokens: [0], text: 'take', head: 'take' },
      directObject: { tokens: [1], text: '', head: '', modifiers: [], articles: [], determiners: ['all'], isAll: true }
    },
    pattern: 'VERB_NOUN',
    action: 'if.action.taking'
  };
}

describe('CommandValidator resolves a list through the matcher (ADR-385 D5)', () => {
  let world: WorldModel;
  let author: AuthorModel;
  let room: IFEntity;
  let lantern: IFEntity;
  let sword: IFEntity;
  let brassKey: IFEntity;
  let silverKey: IFEntity;
  let validator: CommandValidator;

  const thing = (name: string, aliases: string[] = []): IFEntity => {
    const e = author.createEntity(name, EntityType.OBJECT);
    e.add({ type: TraitType.IDENTITY, name, aliases });
    author.moveEntity(e.id, room.id);
    return e;
  };

  beforeEach(() => {
    world = new WorldModel();
    author = new AuthorModel(world.getDataStore(), world);
    const player = author.createEntity('yourself', EntityType.ACTOR);
    room = author.createEntity('Workshop', EntityType.ROOM);
    room.add({ type: TraitType.ROOM });
    author.moveEntity(player.id, room.id);
    world.setPlayer(player.id);
    lantern = thing('brass lantern');
    sword = thing('sword');
    brassKey = thing('brass key', ['key']);
    silverKey = thing('silver key', ['key']);

    const registry = new StandardActionRegistry();
    registry.setLanguageProvider(language);
    registry.register(takingAction);
    validator = new CommandValidator(world, registry);
  });

  test('each item resolves by the single-noun path, in order, into directObjects', () => {
    const result = validator.validate(takeList('brass lantern', 'sword'));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.directObjects?.map((r) => r.entity.id)).toEqual([lantern.id, sword.id]);
    expect(result.value.directObject).toBeUndefined();
  });

  test('a one-word item resolves at the words tier like a single noun: `sword and lantern`', () => {
    const result = validator.validate(takeList('sword', 'lantern'));
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.directObjects?.map((r) => r.entity.id)).toEqual([sword.id, lantern.id]);
  });

  test('an item that names nothing fails the command, naming that item', () => {
    const result = validator.validate(takeList('lantern', 'widget'));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('ENTITY_NOT_FOUND');
    expect(result.error.details).toMatchObject({ searchText: 'widget', listItem: true });
  });

  test('a tied item asks, with that item\'s candidates and token span', () => {
    const result = validator.validate(takeList('sword', 'key'));
    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.code).toBe('AMBIGUOUS_ENTITY');
    const ids = (result.error.details!.ambiguousEntities as Array<{ id: string }>).map((c) => c.id).sort();
    expect(ids).toEqual([brassKey.id, silverKey.id].sort());
    expect(result.error.details!.tokens).toEqual([3]);
  });

  test('`all` stays the action\'s to expand: no directObject and no directObjects', () => {
    const result = validator.validate(takeAll());
    expect(result.success).toBe(true);
    if (!result.success) return;
    expect(result.value.directObject).toBeUndefined();
    expect(result.value.directObjects).toBeUndefined();
  });
});
