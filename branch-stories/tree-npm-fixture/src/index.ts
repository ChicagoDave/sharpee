/**
 * Tree npm fixture — the smallest module story that forms a transcript TREE.
 *
 * Purpose: `./repokit test:npm --tree` needs a story it can install from npm
 * tarballs and run as an ADR-302 tree. Fernhill cannot serve — it is a bare
 * Chord `.story` with no `package.json` and no `src/`, and `test:npm` requires
 * both. This fixture exists solely to prove the tree path survives a real npm
 * install; it is not a game and has no content beyond what its three
 * transcripts assert.
 *
 * Shape (one root, two children — so a prefix is REPLAYED, not merely run):
 *   spine ──┬── lamp      examines the lamp from the Vestibule
 *           └── gallery   walks north
 *
 * That is 3 authored commands and 1 replayed, which is the D17 arithmetic the
 * consumer run asserts. A single-child tree would not exercise replay at all.
 *
 * Public interface: TreeNpmFixtureStory (default story export).
 * Owner context: platform test infrastructure (branch-stories/, ADR-302 D16).
 */
import type { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  IdentityTrait,
  ActorTrait,
  RoomTrait,
  ContainerTrait,
  SceneryTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

export class TreeNpmFixtureStory implements Story {
  config: StoryConfig = {
    id: 'tree-npm-fixture',
    title: 'Tree npm Fixture',
    authors: ['Sharpee platform tests'],
    version: '1.0.0',
    description: 'Minimal tree-shaped story for the npm consumer proof (ADR-302)',
  };

  createPlayer(world: WorldModel) {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    player.add(
      new IdentityTrait({
        name: 'yourself',
        description: 'As good-looking as ever.',
      }),
    );
    return player;
  }

  initializeWorld(world: WorldModel): void {
    const vestibule = world.createEntity('vestibule', EntityType.ROOM);
    vestibule.add(new RoomTrait());
    vestibule.add(
      new IdentityTrait({
        name: 'Vestibule',
        description: 'A narrow vestibule with a brass lamp on a bracket.',
      }),
    );

    const gallery = world.createEntity('gallery', EntityType.ROOM);
    gallery.add(new RoomTrait());
    gallery.add(
      new IdentityTrait({
        name: 'Gallery',
        description: 'A long gallery, entirely empty.',
      }),
    );

    const vestibuleRoom = vestibule.get(RoomTrait) as RoomTrait;
    const galleryRoom = gallery.get(RoomTrait) as RoomTrait;
    vestibuleRoom.exits = { [Direction.NORTH]: { destination: gallery.id } };
    galleryRoom.exits = { [Direction.SOUTH]: { destination: vestibule.id } };

    const lamp = world.createEntity('lamp', EntityType.SCENERY);
    lamp.add(new SceneryTrait());
    lamp.add(
      new IdentityTrait({
        name: 'brass lamp',
        aliases: ['lamp', 'brass'],
        description: 'A brass lamp, unlit and slightly tarnished.',
      }),
    );
    world.moveEntity(lamp.id, vestibule.id);

    world.moveEntity(world.getPlayer()!.id, vestibule.id);
  }
}

/**
 * Story factory (ADR-248): the module's sole story export. Each call returns a
 * fully fresh instance — which is exactly what a tree run needs, since D17
 * boots a new game per root and per fork rather than restoring one.
 */
export function createStory(): TreeNpmFixtureStory {
  return new TreeNpmFixtureStory();
}
