/**
 * Family Zoo Tutorial — Version 5: Containers & Supporters
 *
 * NEW IN THIS VERSION:
 *   - ContainerTrait — objects that hold other objects inside them
 *   - SupporterTrait — surfaces you can put things on top of
 *   - "put X in Y" and "put X on Y" actions
 *   - Portable containers (backpack you carry around)
 *   - Scenery containers (feed dispenser bolted to the wall)
 *
 * WHAT YOU'LL LEARN:
 *   - ContainerTrait lets entities hold other entities
 *   - SupporterTrait lets entities have things placed on them
 *   - Containers can be portable (backpack) or scenery (dispenser)
 *   - "put in" and "put on" are built-in stdlib actions
 *   - "look in" / "look on" shows container/supporter contents
 *   - Capacity limits control how much a container can hold
 *
 * TRY IT:
 *   > take backpack         (pick up the backpack)
 *   > take map              (pick up the zoo map)
 *   > put map in backpack   (store the map in the backpack)
 *   > look in backpack      (see what's inside)
 *   > south                 (go to Main Path)
 *   > take penny            (pick up the penny)
 *   > put penny on bench    (place penny on the park bench)
 *   > look                  (penny is visible on the bench)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS
// ============================================================================

import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,    // ← Used for containers (backpack, feed dispenser)
  SupporterTrait,    // ← NEW: surfaces you can put things ON
  RoomTrait,
  SceneryTrait,
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.5.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  // createPlayer — same as V1, see v01.ts for detailed comments
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'Just an ordinary visitor to the zoo.',
      aliases: ['self', 'myself', 'me'],
      properName: true,
      article: '',
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS — same as V2, see v02.ts for detailed comments
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({
      name: 'Zoo Entrance',
      description:
        'You stand before the wrought-iron gates of the Willowbrook ' +
        'Family Zoo. A cheerful welcome sign arches over the entrance, ' +
        'and a small ticket booth sits to one side. A sturdy iron fence ' +
        'runs along either side of the gates. The main path leads south ' +
        'into the zoo grounds.',
      aliases: ['entrance', 'gates', 'gate'],
      properName: false,
      article: 'the',
    }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({
      name: 'Main Path',
      description:
        'A wide gravel path winds through the heart of the zoo. Colorful ' +
        'direction signs point every which way. A park bench sits beside ' +
        'the path, and neat flower beds add splashes of color. To the ' +
        'east, a white picket fence surrounds the petting zoo. To the ' +
        'west, a tall mesh enclosure rises above the treetops — the ' +
        'aviary. The entrance gates are back to the north.',
      aliases: ['path', 'main path', 'gravel path'],
      properName: false,
      article: 'the',
    }));

    const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
    pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
    pettingZoo.add(new IdentityTrait({
      name: 'Petting Zoo',
      description:
        'A cheerful open-air enclosure filled with friendly animals. ' +
        'Pygmy goats trot around nibbling at visitors\' shoelaces, while ' +
        'a pair of fluffy rabbits hop lazily near a hay bale. A feed ' +
        'dispenser is mounted on a post near the entrance. The main ' +
        'path is back to the west.',
      aliases: ['petting zoo', 'petting area', 'pen'],
      properName: false,
      article: 'the',
    }));

    const aviary = world.createEntity('Aviary', EntityType.ROOM);
    aviary.add(new RoomTrait({ exits: {}, isDark: false }));
    aviary.add(new IdentityTrait({
      name: 'Aviary',
      description:
        'You step inside a soaring mesh dome that stretches high above ' +
        'the treetops. Brilliantly colored parrots chatter from rope ' +
        'perches, and a toucan eyes you curiously from a branch ' +
        'overhead. A small waterfall splashes into a stone basin where ' +
        'finches bathe. The exit back to the main path is to the east.',
      aliases: ['aviary', 'bird house', 'bird cage', 'dome'],
      properName: false,
      article: 'the',
    }));


    // ========================================================================
    // EXITS — same as V2
    // ========================================================================

    const entranceRoom = entrance.get(RoomTrait)!;
    const mainPathRoom = mainPath.get(RoomTrait)!;
    const pettingZooRoom = pettingZoo.get(RoomTrait)!;
    const aviaryRoom = aviary.get(RoomTrait)!;

    entranceRoom.exits = {
      [Direction.SOUTH]: { destination: mainPath.id },
    };
    mainPathRoom.exits = {
      [Direction.NORTH]: { destination: entrance.id },
      [Direction.EAST]:  { destination: pettingZoo.id },
      [Direction.WEST]:  { destination: aviary.id },
    };
    pettingZooRoom.exits = {
      [Direction.WEST]: { destination: mainPath.id },
    };
    aviaryRoom.exits = {
      [Direction.EAST]: { destination: mainPath.id },
    };


    // ========================================================================
    // SCENERY — same as V3 (abbreviated), see v03.ts for detailed comments
    // ========================================================================

    // Zoo Entrance scenery
    const sign = world.createEntity('welcome sign', EntityType.SCENERY);
    sign.add(new IdentityTrait({ name: 'welcome sign', description: 'A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY ZOO."', aliases: ['sign', 'welcome sign'], properName: false, article: 'a' }));
    sign.add(new SceneryTrait());
    world.moveEntity(sign.id, entrance.id);

    const booth = world.createEntity('ticket booth', EntityType.SCENERY);
    booth.add(new IdentityTrait({ name: 'ticket booth', description: 'A small wooden booth with a "Self-Guided Tours" sign.', aliases: ['booth', 'ticket booth'], properName: false, article: 'a' }));
    booth.add(new SceneryTrait());
    world.moveEntity(booth.id, entrance.id);

    const ironFence = world.createEntity('iron fence', EntityType.SCENERY);
    ironFence.add(new IdentityTrait({ name: 'iron fence', description: 'A tall wrought-iron fence with animal silhouettes.', aliases: ['fence', 'iron fence', 'railing'], properName: false, article: 'an' }));
    ironFence.add(new SceneryTrait());
    world.moveEntity(ironFence.id, entrance.id);

    // Main Path scenery
    const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
    directionSigns.add(new IdentityTrait({ name: 'direction signs', description: 'Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).', aliases: ['signs', 'direction signs', 'arrow signs'], properName: false, article: 'some' }));
    directionSigns.add(new SceneryTrait());
    world.moveEntity(directionSigns.id, mainPath.id);

    const flowerBeds = world.createEntity('flower beds', EntityType.SCENERY);
    flowerBeds.add(new IdentityTrait({ name: 'flower beds', description: 'Tidy beds of marigolds and petunias.', aliases: ['flowers', 'flower beds'], properName: false, article: 'some' }));
    flowerBeds.add(new SceneryTrait());
    world.moveEntity(flowerBeds.id, mainPath.id);

    // Petting Zoo scenery
    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({ name: 'pygmy goats', description: 'Three pygmy goats hoping you have food.', aliases: ['goats', 'pygmy goats', 'goat'], properName: false, article: 'some' }));
    goats.add(new SceneryTrait());
    world.moveEntity(goats.id, pettingZoo.id);

    const hayBale = world.createEntity('hay bale', EntityType.SCENERY);
    hayBale.add(new IdentityTrait({ name: 'hay bale', description: 'A large round bale of golden hay.', aliases: ['hay', 'hay bale', 'bale'], properName: false, article: 'a' }));
    hayBale.add(new SceneryTrait());
    world.moveEntity(hayBale.id, pettingZoo.id);

    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({ name: 'rabbits', description: 'A pair of Holland Lop rabbits with floppy ears.', aliases: ['rabbits', 'rabbit', 'bunnies'], properName: false, article: 'some' }));
    rabbits.add(new SceneryTrait());
    world.moveEntity(rabbits.id, pettingZoo.id);

    // Aviary scenery
    const toucan = world.createEntity('toucan', EntityType.SCENERY);
    toucan.add(new IdentityTrait({ name: 'toucan', description: 'A Toco toucan with an enormous orange-and-black bill.', aliases: ['toucan', 'toco toucan'], properName: false, article: 'a' }));
    toucan.add(new SceneryTrait());
    world.moveEntity(toucan.id, aviary.id);

    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({ name: 'parrots', description: 'A raucous flock of scarlet macaws and grey African parrots.', aliases: ['parrots', 'parrot', 'macaws', 'birds'], properName: false, article: 'some' }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    const waterfall = world.createEntity('waterfall', EntityType.SCENERY);
    waterfall.add(new IdentityTrait({ name: 'waterfall', description: 'A gentle artificial waterfall cascading into a stone basin.', aliases: ['waterfall', 'water', 'basin'], properName: false, article: 'a' }));
    waterfall.add(new SceneryTrait());
    world.moveEntity(waterfall.id, aviary.id);

    const perches = world.createEntity('rope perches', EntityType.SCENERY);
    perches.add(new IdentityTrait({ name: 'rope perches', description: 'Thick sisal ropes strung between wooden posts — both furniture and snacks for the parrots.', aliases: ['perches', 'rope perches', 'ropes', 'rope'], properName: false, article: 'some' }));
    perches.add(new SceneryTrait());
    world.moveEntity(perches.id, aviary.id);


    // ========================================================================
    // PORTABLE OBJECTS — same as V4, see v04.ts for detailed comments
    // ========================================================================

    const zooMap = world.createEntity('zoo map', EntityType.ITEM);
    zooMap.add(new IdentityTrait({
      name: 'zoo map',
      description:
        'A colorful folding map of the Willowbrook Family Zoo. Someone ' +
        'has drawn a heart around the petting zoo in crayon.',
      aliases: ['map', 'zoo map', 'folding map'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(zooMap.id, entrance.id);

    const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);
    animalFeed.add(new IdentityTrait({
      name: 'bag of animal feed',
      description:
        'A small brown paper bag filled with dried corn and pellets.',
      aliases: ['feed', 'animal feed', 'bag of feed', 'bag', 'corn'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(animalFeed.id, pettingZoo.id);

    const penny = world.createEntity('souvenir penny', EntityType.ITEM);
    penny.add(new IdentityTrait({
      name: 'souvenir penny',
      description:
        'A shiny copper penny that could fit in a souvenir press machine.',
      aliases: ['penny', 'souvenir penny', 'coin', 'copper penny'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(penny.id, mainPath.id);


    // ========================================================================
    // CONTAINERS & SUPPORTERS — NEW IN V5
    // ========================================================================
    //
    // So far we've seen ContainerTrait on the player (for inventory).
    // But containers aren't just for players — ANY entity can hold things.
    //
    // There are two kinds of "things that hold other things":
    //
    // 1. CONTAINERS — things go INSIDE them ("put map in backpack")
    //    - Uses ContainerTrait
    //    - EntityType.CONTAINER (or ITEM with ContainerTrait)
    //    - Examples: bags, boxes, drawers, lockers, pockets
    //
    // 2. SUPPORTERS — things go ON TOP of them ("put penny on bench")
    //    - Uses SupporterTrait
    //    - EntityType.SUPPORTER (or any type with SupporterTrait)
    //    - Examples: tables, shelves, benches, counters
    //
    // Both can be:
    //    - Portable: player can carry them (and their contents!)
    //    - Fixed: scenery that stays put (add SceneryTrait)
    //
    // Both have capacity limits to prevent infinite storage.


    // --- Backpack (portable container at the Zoo Entrance) ---
    //
    // This is a PORTABLE CONTAINER: the player can pick it up, carry it
    // around, and put things inside it. When the player takes the backpack,
    // anything already inside comes along for the ride.

    const backpack = world.createEntity('backpack', EntityType.CONTAINER);

    backpack.add(new IdentityTrait({
      name: 'backpack',
      description:
        'A small red canvas backpack with a cartoon monkey patch on the ' +
        'front pocket. It looks like someone left it behind. There\'s a ' +
        'tag inside that reads "Property of Willowbrook Zoo — Loaner."',
      aliases: ['backpack', 'bag', 'rucksack', 'pack', 'red backpack'],
      properName: false,
      article: 'a',
    }));

    // ContainerTrait makes this entity able to hold other entities INSIDE it.
    // capacity.maxItems limits how many things fit.
    // "put map in backpack" will work because of this trait.
    backpack.add(new ContainerTrait({
      capacity: { maxItems: 5 },  // Can hold up to 5 items
    }));

    // NO SceneryTrait — so the player can pick it up and carry it!
    world.moveEntity(backpack.id, entrance.id);


    // --- Feed Dispenser (scenery container at the Petting Zoo) ---
    //
    // This is a FIXED CONTAINER: it holds things inside, but the player
    // can't pick up the dispenser itself. They CAN take things out of it
    // and put things into it.

    const dispenser = world.createEntity('feed dispenser', EntityType.CONTAINER);

    dispenser.add(new IdentityTrait({
      name: 'feed dispenser',
      description:
        'A coin-operated feed dispenser mounted on a wooden post. It\'s ' +
        'a clear plastic globe filled with animal feed pellets, with a ' +
        'crank handle on the side. A sign reads "FREE — Just Turn!"',
      aliases: ['dispenser', 'feed dispenser', 'machine', 'globe'],
      properName: false,
      article: 'a',
    }));

    dispenser.add(new ContainerTrait({
      capacity: { maxItems: 3 },
    }));

    // SceneryTrait makes it fixed — player can't take the whole dispenser.
    // But they CAN interact with its contents (take things out, put things in).
    dispenser.add(new SceneryTrait());

    world.moveEntity(dispenser.id, pettingZoo.id);


    // --- Park Bench (supporter on the Main Path) ---
    //
    // A SUPPORTER is like a container, but things go ON TOP instead of inside.
    // "put penny on bench" places the penny on the bench's surface.
    // "look on bench" shows what's sitting on it.
    //
    // Supporters use SupporterTrait instead of ContainerTrait.
    // The parser handles "on" vs "in" automatically based on which trait
    // the target entity has.

    const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);

    parkBench.add(new IdentityTrait({
      name: 'park bench',
      description:
        'A sturdy park bench painted forest green. A small brass plaque ' +
        'reads: "In memory of Mr. Whiskers, the world\'s friendliest ' +
        'capybara, 2019–2024."',
      aliases: ['bench', 'park bench', 'benches', 'seat'],
      properName: false,
      article: 'a',
    }));

    // SupporterTrait — things go ON this entity, not IN it.
    // capacity.maxItems limits how many things can sit on the surface.
    parkBench.add(new SupporterTrait({
      capacity: { maxItems: 3 },
    }));

    // SceneryTrait makes the bench itself immovable.
    // But objects ON the bench can still be taken.
    parkBench.add(new SceneryTrait());

    world.moveEntity(parkBench.id, mainPath.id);


    // ========================================================================
    // PLAYER STARTING LOCATION
    // ========================================================================

    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, entrance.id);
    }
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

export const story = new FamilyZooStory();
export default story;
