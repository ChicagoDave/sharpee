/**
 * loader.test.ts — Phase 4 gate: loading cloak.story's IR yields a
 * playable-shaped WorldModel.
 *
 * Tests derive from the loader Behavior Statement: every DOES line asserts
 * on actual world state (entities, traits, placement, world-state keys),
 * every REJECTS WHEN line asserts a thrown LoadError.
 */
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { compile, StoryIR } from '@sharpee/chord';
import { STORY_ENDING_FLAG } from '@sharpee/if-domain';
import {
  ContainerTrait,
  Direction,
  IFEntity,
  IdentityTrait,
  RoomTrait,
  SceneryTrait,
  SupporterTrait,
  TraitType,
  WearableTrait,
  WorldModel,
} from '@sharpee/world-model';
import { CHORD_STATE_PREFIX, ChordStory, createStory, LoadError } from '../src';

const CHORD_FIXTURES = join(__dirname, '..', '..', 'chord', 'tests', 'fixtures');

function compileFixture(name: string): StoryIR {
  const result = compile(readFileSync(join(CHORD_FIXTURES, name), 'utf8'));
  if (!result.ok) throw new Error(`fixture ${name} failed to compile`);
  return result.ir;
}

const garbled = () => ({ kind: 'literal', text: 'swept aside' });
const CLOAK_MODULES = { './extras.ts': { garbled } };

describe('cloak.story loads into a playable world', () => {
  let story: ChordStory;
  let world: WorldModel;
  let player: IFEntity;

  const entity = (irId: string): IFEntity => {
    const id = story.entityId(irId);
    expect(id, `world id for ${irId}`).toBeDefined();
    return world.getEntity(id!)!;
  };

  beforeAll(() => {
    story = createStory(compileFixture('cloak.story'), { hatchModules: CLOAK_MODULES });
    world = new WorldModel();
    story.initializeWorld(world);
    player = story.createPlayer(world);
  });

  it('derives the story config from the header', () => {
    expect(story.config).toMatchObject({
      id: 'cloak-of-darkness',
      title: 'Cloak of Darkness',
      author: 'Roger Firth (Sharpee implementation)',
      version: '1.0.0',
    });
  });

  it('creates the rooms with bidirectional exits', () => {
    const foyer = entity('foyer-of-the-opera-house');
    const foyerRoom = foyer.get(TraitType.ROOM) as RoomTrait;
    expect(foyerRoom.exits?.[Direction.WEST]?.destination).toBe(story.entityId('cloakroom'));
    expect(foyerRoom.exits?.[Direction.SOUTH]?.destination).toBe(story.entityId('foyer-bar'));

    const cloakroomRoom = entity('cloakroom').get(TraitType.ROOM) as RoomTrait;
    expect(cloakroomRoom.exits?.[Direction.EAST]?.destination).toBe(foyer.id);
    const barRoom = entity('foyer-bar').get(TraitType.ROOM) as RoomTrait;
    expect(barRoom.exits?.[Direction.NORTH]?.destination).toBe(foyer.id);
  });

  it('writes the blocked north exit with the cant-leave phrase text', () => {
    const foyerRoom = entity('foyer-of-the-opera-house').get(TraitType.ROOM) as RoomTrait;
    expect(foyerRoom.blockedExits?.[Direction.NORTH]).toContain("You've only just arrived");
  });

  it('builds the hook as scenery supporter with capacity 1, in the cloakroom', () => {
    const hook = entity('brass-hook');
    expect(hook.has(TraitType.SCENERY)).toBe(true);
    const supporter = hook.get(TraitType.SUPPORTER) as SupporterTrait;
    expect(supporter.capacity).toMatchObject({ maxItems: 1 });
    expect(world.getLocation(hook.id)).toBe(story.entityId('cloakroom'));
    const identity = hook.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity.aliases).toEqual(expect.arrayContaining(['hook', 'peg']));
  });

  it('seeds the message state machine at its first declared state', () => {
    const message = entity('message-in-the-sawdust');
    expect(message.has(TraitType.SCENERY)).toBe(true);
    expect(world.getLocation(message.id)).toBe(story.entityId('foyer-bar'));
    expect(world.getStateValue(CHORD_STATE_PREFIX + 'message-in-the-sawdust')).toBe('intact');
  });

  it('does not pre-darken the bar (dark-while is a Phase 5 derived property)', () => {
    const barRoom = entity('foyer-bar').get(TraitType.ROOM) as RoomTrait;
    expect(barRoom.isDark ?? false).toBe(false);
  });

  it('creates the default player with the story description, placed in the foyer', () => {
    const identity = player.get(TraitType.IDENTITY) as IdentityTrait;
    expect(identity.name).toBe('yourself');
    expect(identity.aliases).toEqual(expect.arrayContaining(['self', 'me', 'myself']));
    expect(identity.description).toBe('As good-looking as ever.');
    const container = player.get(TraitType.CONTAINER) as ContainerTrait;
    expect(container.capacity).toMatchObject({ maxItems: 10 });
    expect(world.getLocation(player.id)).toBe(story.entityId('foyer-of-the-opera-house'));
  });

  it('marks the cloak worn by the player and carried in inventory', () => {
    const cloak = entity('velvet-cloak');
    expect(world.getLocation(cloak.id)).toBe(player.id);
    const wearable = cloak.get(TraitType.WEARABLE) as WearableTrait;
    expect(wearable.worn).toBe(true);
    expect(wearable.wornBy).toBe(player.id);
  });

  it('registers every phrase key with the language provider', () => {
    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);
    for (const key of ['cant-leave', 'stumble', 'message-intact', 'message-trampled', 'message-obliterated']) {
      expect(registered.has(key), key).toBe(true);
    }
    expect(registered.get('message-trampled')).toContain('{garbled}');
    expect(registered.get('foyer-of-the-opera-house.description')).toContain('spacious hall');
    expect(registered.get('velvet-cloak.description')).toContain('handsome cloak');
  });

  it('maps the hang verb onto PUT_ON vocabulary', () => {
    expect(story.getCustomVocabulary()).toEqual({
      verbs: [
        { actionId: 'PUT_ON', verbs: ['hang', 'hook'], pattern: 'VERB NOUN PREP NOUN', prepositions: ['on'] },
      ],
    });
  });

  it('binds the garbled hatch producer', () => {
    expect(story.producers.get('garbled')).toBe(garbled);
  });

  it('endings: triggerEnding sets the flag, isComplete flips, event carries the contract', () => {
    expect(story.isComplete()).toBe(false);
    const event = story.triggerEnding(world, 'victory', 'message-intact');
    expect(world.getStateValue(STORY_ENDING_FLAG)).toBe('victory');
    expect(story.isComplete()).toBe(true);
    expect(event.type).toBe('story.victory');
    expect(event.data).toMatchObject({ ending: 'victory', messageId: 'message-intact' });

    const defeat = story.triggerEnding(world, 'defeat');
    expect(defeat.type).toBe('story.defeat');
    expect(world.getStateValue(STORY_ENDING_FLAG)).toBe('defeat');
  });
});

describe('ac5-random.story loads (no hatches)', () => {
  it('builds both rooms and registers the strategy phrase as a variants template', () => {
    const story = createStory(compileFixture('ac5-random.story'));
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);
    expect(story.entityId('east-room')).toBeDefined();
    expect(story.entityId('west-room')).toBeDefined();

    const registered = new Map<string, string>();
    story.extendLanguage({ addMessage: (id: string, t: string) => registered.set(id, t) } as never);
    expect(registered.get('crossing-mutter')).toBe('{variants}');
    expect(registered.get('lucky-draught')).toBe('A lucky draught of air sweeps past you.');
  });
});

describe('coverage: container config, plural, non-wearable wears', () => {
  const compileSource = (source: string): StoryIR => {
    const result = compile(source);
    if (!result.ok) throw new Error(result.diagnostics.map((d) => d.message).join('; '));
    return result.ir;
  };

  it('applies max items / max weight config to a container kind', () => {
    const ir = compileSource(`story "Coverage" by "Nobody"
  id: coverage
  version: 0.0.1

create the Pantry
  a room

  A pantry.

create the bread box
  a container with max items 5 and max weight 20
  in the Pantry

  A box.

create the direction signs
  plural, scenery
  in the Pantry

  Painted arrows.

create the player
  starts in the Pantry

  You.
`);
    const story = createStory(ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    story.createPlayer(world);

    const box = world.getEntity(story.entityId('bread-box')!)!;
    const container = box.get(TraitType.CONTAINER) as ContainerTrait;
    expect(container.capacity).toMatchObject({ maxItems: 5, maxWeight: 20 });

    const signs = world.getEntity(story.entityId('direction-signs')!)!;
    const identity = signs.get(TraitType.IDENTITY) as IdentityTrait;
    expect((identity as unknown as Record<string, unknown>).grammaticalNumber).toBe('plural');
    expect(signs.has(TraitType.SCENERY)).toBe(true);
  });

  it('rejects a worn item that is not wearable', () => {
    const ir = compileSource(`story "Coverage" by "Nobody"
  id: coverage-2
  version: 0.0.1

create the Pantry
  a room

  A pantry.

create the anvil
  in the Pantry

  Heavy.

create the player
  starts in the Pantry
  wears the anvil

  You.
`);
    const story = createStory(ir);
    const world = new WorldModel();
    story.initializeWorld(world);
    expect(() => story.createPlayer(world)).toThrow(LoadError);
    expect(() => {
      const s = createStory(ir);
      const w = new WorldModel();
      s.initializeWorld(w);
      s.createPlayer(w);
    }).toThrow(/not wearable/);
  });
});

describe('atomic load rejections', () => {
  const cloakIr = () => compileFixture('cloak.story');

  it('rejects an unknown IR format', () => {
    const ir = { ...cloakIr(), format: 'story language 99' } as unknown as StoryIR;
    expect(() => createStory(ir, { hatchModules: CLOAK_MODULES })).toThrow(LoadError);
    expect(() => createStory(ir, { hatchModules: CLOAK_MODULES })).toThrow(/story language 1/);
  });

  it('rejects a missing hatch module', () => {
    expect(() => createStory(cloakIr())).toThrow(LoadError);
    expect(() => createStory(cloakIr())).toThrow(/\.\/extras\.ts/);
  });

  it('rejects a missing hatch export', () => {
    expect(() => createStory(cloakIr(), { hatchModules: { './extras.ts': {} } })).toThrow(/missing/);
  });

  it('rejects a non-function hatch export', () => {
    expect(() => createStory(cloakIr(), { hatchModules: { './extras.ts': { garbled: 'text' } } })).toThrow(
      /not a function/,
    );
  });
});
