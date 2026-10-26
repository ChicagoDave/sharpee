/**
 * multi-object-matcher.test.ts — the multi-object expander reads the
 * validator's `directObjects` for a list and asks the one noun matcher for
 * `all but` exclusions (ADR-385 D5). A list's entities come back in order,
 * each once; an exclusion removes every candidate the matcher names for it,
 * by name word or alias; an exclusion naming nothing removes nothing.
 *
 * REAL-PATH: real WorldModel, the real context factory, the real taking action.
 */
import { describe, it, expect } from 'vitest';
import { WorldModel, EntityType, ActorTrait, ContainerTrait, RoomTrait, IdentityTrait, type IFEntity, type INounPhrase } from '@sharpee/world-model';
import { takingAction } from '../../../src/actions/standard/taking';
import { IFActions } from '../../../src/actions/constants';
import { createActionContext } from '../../../src/actions/enhanced-context';
import { expandMultiObject } from '../../../src/helpers/multi-object-handler';
import { createCommand } from '../../test-utils';
import { createFixtureRandomService } from '../../test-utils/fixture-random-service';

/** English, handed to hand-built worlds as the language's words (ADR-387 D2). */
const ENGLISH_WORDS = { selfWords: ['me', 'myself', 'self', 'yourself'], nameStopwords: ['the', 'a', 'an', 'of'] };

function buildWorld() {
  const world = new WorldModel();
  world.setLanguageWords(ENGLISH_WORDS);
  const hall = world.createEntity('Hall', EntityType.ROOM);
  hall.add(new RoomTrait());
  const player = world.createEntity('You', EntityType.ACTOR);
  player.add(new ActorTrait({ isPlayer: true }));
  player.add(new ContainerTrait());
  world.moveEntity(player.id, hall.id);
  world.setPlayer(player.id);

  const thing = (name: string, aliases: string[] = []) => {
    const e = world.createEntity(name, EntityType.OBJECT);
    e.add(new IdentityTrait({ name, aliases }));
    world.moveEntity(e.id, hall.id);
    return e;
  };
  const lantern = thing('brass lantern');
  const sword = thing('sword');
  const coins = thing('gold coins', ['coins']);
  return { world, player, lantern, sword, coins };
}

const phrase = (text: string): INounPhrase => {
  const words = text.split(' ');
  return { tokens: [], text, head: words[words.length - 1], modifiers: words.slice(0, -1), articles: [], determiners: [] };
};

const names = (items: ReturnType<typeof expandMultiObject>) => items.map((i) => i.entity.name).sort();

describe('expandMultiObject through the matcher (ADR-385 D5)', () => {
  it('a list yields the validated directObjects in order, each entity once', () => {
    const { world, player, lantern, sword } = buildWorld();
    const command = createCommand(IFActions.TAKING, { entity: sword });
    command.parsed.structure.directObject = { ...phrase('sword and lantern and sword'), isList: true, items: [phrase('sword'), phrase('lantern'), phrase('sword')] };
    command.directObject = undefined;
    command.directObjects = [
      { entity: sword, parsed: phrase('sword') },
      { entity: lantern, parsed: phrase('lantern') },
      { entity: sword, parsed: phrase('sword') }
    ];
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1));

    expect(expandMultiObject(context, { scope: 'reachable' }).map((i) => i.entity.id)).toEqual([sword.id, lantern.id]);
  });

  it('`all but lantern` removes what the matcher names for the exclusion, by name word', () => {
    const { world, player, sword, coins } = buildWorld();
    const command = createCommand(IFActions.TAKING, { all: true });
    command.parsed.excluded = [phrase('lantern')];
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1));

    expect(names(expandMultiObject(context, { scope: 'reachable' }))).toEqual([coins.name, sword.name].sort());
  });

  it('an exclusion matches by alias too: `all but coins`', () => {
    const { world, player, lantern, sword } = buildWorld();
    const command = createCommand(IFActions.TAKING, { all: true });
    command.parsed.excluded = [phrase('coins')];
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1));

    expect(names(expandMultiObject(context, { scope: 'reachable' }))).toEqual([lantern.name, sword.name].sort());
  });

  it('an exclusion naming nothing removes nothing', () => {
    const { world, player, lantern, sword, coins } = buildWorld();
    const command = createCommand(IFActions.TAKING, { all: true });
    command.parsed.excluded = [phrase('widget')];
    const context = createActionContext(world, player, takingAction, command, createFixtureRandomService(1));

    expect(names(expandMultiObject(context, { scope: 'reachable' }))).toEqual([coins.name, lantern.name, sword.name].sort());
  });
});
