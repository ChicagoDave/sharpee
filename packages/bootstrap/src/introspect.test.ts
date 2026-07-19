/**
 * Unit tests for buildManifest (ADR-184).
 *
 * Self-contained: constructs a WorldModel with explicit traits — no story build
 * or platform load required. Asserts the manifest projection derived from the
 * Behavior Statement (category derivation, player/door/exit exclusion, sparse
 * trait summary, manifest header).
 */
import { describe, it, expect, beforeAll } from 'vitest';
import {
  WorldModel,
  EntityType,
  IdentityTrait,
  RoomTrait,
  ContainerTrait,
  OpenableTrait,
  ActorTrait,
  RegionTrait,
  DoorTrait,
  ExitTrait,
} from '@sharpee/world-model';
import { isProjectManifest, type ProjectManifest } from '@sharpee/ide-protocol';
import { buildManifest } from './introspect.js';

let world: WorldModel;
let manifest: ProjectManifest;
let ids: Record<string, string>;

beforeAll(() => {
  world = new WorldModel();

  // Player — excluded by id.
  const player = world.createEntity('yourself', EntityType.ACTOR);
  world.setPlayer(player.id);

  // A room with two exits and a description.
  const room = world.createEntity('West of House', EntityType.ITEM);
  room.add(new IdentityTrait({ name: 'West of House', description: '  A white house.  ' }));
  room.add(new RoomTrait({ exits: { north: { destination: 'r-x' }, south: { destination: 'r-y' } } }));

  // An openable, non-lockable container item.
  const box = world.createEntity('small mailbox', EntityType.ITEM);
  box.add(new IdentityTrait({ name: 'small mailbox' }));
  box.add(new ContainerTrait());
  box.add(new OpenableTrait({ isOpen: false }));

  // An NPC (actor trait, not the player).
  const npc = world.createEntity('thief', EntityType.ITEM);
  npc.add(new IdentityTrait({ name: 'thief' }));
  npc.add(new ActorTrait());

  // A region that ALSO carries a room trait — region must win (first match).
  const region = world.createEntity('Underground', EntityType.ITEM);
  region.add(new RegionTrait({ name: 'Underground' }));
  region.add(new RoomTrait({ exits: {} }));

  // A bare entity: identity only, no room/actor/region → object.
  const trinket = world.createEntity('brass lantern', EntityType.ITEM);
  trinket.add(new IdentityTrait({ name: 'brass lantern' }));

  // Door and exit entities — excluded (they surface under room exits).
  const door = world.createEntity('wooden door', EntityType.ITEM);
  door.add(new DoorTrait({ room1: 'r-x', room2: 'r-y' }));
  const exit = world.createEntity('passage', EntityType.ITEM);
  exit.add(new ExitTrait({ from: 'r-x', to: 'r-y', command: 'north' }));

  ids = {
    player: player.id,
    room: room.id,
    box: box.id,
    npc: npc.id,
    region: region.id,
    trinket: trinket.id,
    door: door.id,
    exit: exit.id,
  };

  manifest = buildManifest(world, 'test-story', 'cli');
});

const find = (id: string) => manifest.entities.find((e) => e.id === id);

describe('buildManifest — header', () => {
  it('sets schemaVersion, story, and generatedFrom', () => {
    expect(manifest.schemaVersion).toBe(1);
    expect(manifest.story).toBe('test-story');
    expect(manifest.generatedFrom).toBe('cli');
  });

  it('stamps the hatch staging-surface version (design.md §5.6 IDE contract)', () => {
    expect(manifest.hatchContextVersion).toBe(1);
  });

  it('emits a manifest that passes the ide-protocol guard', () => {
    expect(isProjectManifest(manifest)).toBe(true);
  });

  it('honors the generatedFrom argument', () => {
    expect(buildManifest(world, 'test-story', 'bridge').generatedFrom).toBe('bridge');
  });
});

describe('buildManifest — exclusions', () => {
  it('excludes the player entity', () => {
    expect(find(ids.player)).toBeUndefined();
  });

  it('excludes door and exit entities', () => {
    expect(find(ids.door)).toBeUndefined();
    expect(find(ids.exit)).toBeUndefined();
  });

  it('includes exactly the five authored entities', () => {
    expect(manifest.entities).toHaveLength(5);
  });

  it('emits no source field (positions are IDE-side)', () => {
    expect(manifest.entities.every((e) => e.source === undefined)).toBe(true);
  });
});

describe('buildManifest — category derivation', () => {
  it('categorizes a room', () => {
    expect(find(ids.room)?.category).toBe('room');
  });

  it('categorizes an actor as npc', () => {
    expect(find(ids.npc)?.category).toBe('npc');
  });

  it('region outranks room (first match wins)', () => {
    expect(find(ids.region)?.category).toBe('region');
  });

  it('falls back to object for a bare identity entity', () => {
    expect(find(ids.trinket)?.category).toBe('object');
  });

  it('categorizes a plain container item as object', () => {
    expect(find(ids.box)?.category).toBe('object');
  });
});

describe('buildManifest — trait summary', () => {
  it('projects room exits as direction keys', () => {
    expect(find(ids.room)?.traits.room?.exits.sort()).toEqual(['north', 'south']);
  });

  it('trims an identity description', () => {
    expect(find(ids.room)?.traits.identity?.description).toBe('A white house.');
  });

  it('projects container openable/lockable booleans', () => {
    expect(find(ids.box)?.traits.container).toEqual({ openable: true, lockable: false });
  });

  it('omits trait keys an entity does not carry', () => {
    const trinket = find(ids.trinket);
    expect(trinket?.traits.room).toBeUndefined();
    expect(trinket?.traits.container).toBeUndefined();
  });
});
