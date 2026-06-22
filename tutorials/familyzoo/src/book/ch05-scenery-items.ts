/**
 * Family Zoo Tutorial — Version 4: Portable Objects
 *
 * NEW IN THIS VERSION:
 *   - Items the player can pick up and carry
 *   - The taking, dropping, and inventory actions
 *   - How portable objects differ from scenery
 *   - EntityType.ITEM — the default portable object type
 *
 * WHAT YOU'LL LEARN:
 *   - Items are portable by default — no special trait needed
 *   - EntityType.ITEM creates a takeable object
 *   - "take", "drop", and "inventory" are built-in actions
 *   - Portable items show up in room descriptions and inventory
 *
 * TRY IT:
 *   > look                 (notice the zoo map on the ground)
 *   > take map             (pick it up)
 *   > inventory            (see what you're carrying)
 *   > south                (walk to Main Path — the map comes with you)
 *   > drop map             (leave it here)
 *   > look                 (the map is now on the ground in Main Path)
 *   > east                 (go to Petting Zoo)
 *   > take feed            (pick up the bag of animal feed)
 *   > inventory            (carrying the feed now)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS — same as V3, see v01.ts for detailed explanations
// ============================================================================

import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,    // NEW focus: EntityType.ITEM for portable objects
  Direction,
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
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
  version: '0.4.0',
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
        'direction signs point every which way. Wooden benches line the ' +
        'path, and neat flower beds add splashes of color. To the east, ' +
        'a white picket fence surrounds the petting zoo. To the west, a ' +
        'tall mesh enclosure rises above the treetops — the aviary. The ' +
        'entrance gates are back to the north.',
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
        'a pair of fluffy rabbits hop lazily near a hay bale. A low ' +
        'wooden fence separates you from a muddy pig pen. The main ' +
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
    // SCENERY — same as V3, see v03.ts for detailed SceneryTrait explanation
    // ========================================================================

    // Zoo Entrance scenery
    const sign = world.createEntity('welcome sign', EntityType.SCENERY);
    sign.add(new IdentityTrait({
      name: 'welcome sign',
      description:
        'A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK ' +
        'FAMILY ZOO — Home to over 50 amazing animals! Open daily, ' +
        'rain or shine." Cartoon animals dance along the border.',
      aliases: ['sign', 'welcome sign', 'wooden sign'],
      properName: false, article: 'a',
    }));
    sign.add(new SceneryTrait());
    world.moveEntity(sign.id, entrance.id);

    const booth = world.createEntity('ticket booth', EntityType.SCENERY);
    booth.add(new IdentityTrait({
      name: 'ticket booth',
      description:
        'A small wooden booth with a sliding glass window. A sign in the ' +
        'window reads "Self-Guided Tours — No Ticket Needed Today!"',
      aliases: ['booth', 'ticket booth'],
      properName: false, article: 'a',
    }));
    booth.add(new SceneryTrait());
    world.moveEntity(booth.id, entrance.id);

    const fence = world.createEntity('iron fence', EntityType.SCENERY);
    fence.add(new IdentityTrait({
      name: 'iron fence',
      description:
        'A tall wrought-iron fence with decorative animal silhouettes ' +
        'cut into every other bar.',
      aliases: ['fence', 'iron fence', 'railing'],
      properName: false, article: 'an',
    }));
    fence.add(new SceneryTrait());
    world.moveEntity(fence.id, entrance.id);

    // Main Path scenery
    const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
    directionSigns.add(new IdentityTrait({
      name: 'direction signs',
      description:
        'A cluster of brightly colored arrow signs nailed to a wooden ' +
        'post. PETTING ZOO (east), AVIARY (west), EXIT (north).',
      aliases: ['signs', 'direction signs', 'arrow signs', 'post'],
      properName: false, article: 'some',
    }));
    directionSigns.add(new SceneryTrait());
    world.moveEntity(directionSigns.id, mainPath.id);

    const benches = world.createEntity('wooden benches', EntityType.SCENERY);
    benches.add(new IdentityTrait({
      name: 'wooden benches',
      description:
        'Sturdy park benches painted forest green, each with a small ' +
        'brass plaque thanking a zoo donor.',
      aliases: ['benches', 'bench', 'wooden benches', 'seat'],
      properName: false, article: 'some',
    }));
    benches.add(new SceneryTrait());
    world.moveEntity(benches.id, mainPath.id);

    const flowerBeds = world.createEntity('flower beds', EntityType.SCENERY);
    flowerBeds.add(new IdentityTrait({
      name: 'flower beds',
      description:
        'Tidy beds of marigolds and petunias in alternating orange and ' +
        'purple stripes.',
      aliases: ['flowers', 'flower beds', 'marigolds', 'petunias'],
      properName: false, article: 'some',
    }));
    flowerBeds.add(new SceneryTrait());
    world.moveEntity(flowerBeds.id, mainPath.id);

    // Petting Zoo scenery
    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({
      name: 'pygmy goats',
      description:
        'Three pygmy goats with stubby legs and expressive faces. They ' +
        'stare at you with their weird rectangular pupils, clearly ' +
        'hoping you have food.',
      aliases: ['goats', 'pygmy goats', 'goat'],
      properName: false, article: 'some',
    }));
    goats.add(new SceneryTrait());
    world.moveEntity(goats.id, pettingZoo.id);

    const hayBale = world.createEntity('hay bale', EntityType.SCENERY);
    hayBale.add(new IdentityTrait({
      name: 'hay bale',
      description:
        'A large round bale of golden hay, slightly nibbled around the ' +
        'edges by enthusiastic goats.',
      aliases: ['hay', 'hay bale', 'bale', 'straw'],
      properName: false, article: 'a',
    }));
    hayBale.add(new SceneryTrait());
    world.moveEntity(hayBale.id, pettingZoo.id);

    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({
      name: 'rabbits',
      description:
        'A pair of Holland Lop rabbits with floppy ears and twitching ' +
        'noses. One is pure white, the other brown and cream.',
      aliases: ['rabbits', 'rabbit', 'bunnies', 'bunny'],
      properName: false, article: 'some',
    }));
    rabbits.add(new SceneryTrait());
    world.moveEntity(rabbits.id, pettingZoo.id);

    // Aviary scenery
    const toucan = world.createEntity('toucan', EntityType.SCENERY);
    toucan.add(new IdentityTrait({
      name: 'toucan',
      description:
        'A Toco toucan with an enormous orange-and-black bill.',
      aliases: ['toucan', 'toco toucan'],
      properName: false, article: 'a',
    }));
    toucan.add(new SceneryTrait());
    world.moveEntity(toucan.id, aviary.id);

    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({
      name: 'parrots',
      description:
        'A raucous flock of scarlet macaws and grey African parrots.',
      aliases: ['parrots', 'parrot', 'macaws', 'macaw', 'birds'],
      properName: false, article: 'some',
    }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    const waterfall = world.createEntity('waterfall', EntityType.SCENERY);
    waterfall.add(new IdentityTrait({
      name: 'waterfall',
      description:
        'A gentle artificial waterfall cascading over smooth rocks into ' +
        'a shallow stone basin.',
      aliases: ['waterfall', 'water', 'basin', 'fountain'],
      properName: false, article: 'a',
    }));
    waterfall.add(new SceneryTrait());
    world.moveEntity(waterfall.id, aviary.id);


    // ========================================================================
    // PORTABLE OBJECTS — NEW IN V4
    // ========================================================================
    //
    // Now for the fun part: items the player can actually pick up!
    //
    // In Sharpee, items are portable BY DEFAULT. You don't need a special
    // "PortableTrait" — just create an entity with EntityType.ITEM and an
    // IdentityTrait, and the player can take it, carry it, and drop it.
    //
    // The built-in actions that handle portable objects:
    //   "take <item>"      → Moves item from room to player's inventory
    //   "drop <item>"      → Moves item from inventory back to current room
    //   "inventory" / "i"  → Lists everything the player is carrying
    //
    // These actions are part of Sharpee's standard library (stdlib).
    // You don't need to write any code to make them work.
    //
    // HOW IT WORKS:
    //   1. Player types "take map"
    //   2. Parser finds the "map" entity in the current room
    //   3. The "taking" action checks if the entity has SceneryTrait
    //      - If yes: "The map is fixed in place." (blocked)
    //      - If no:  Moves entity to player's ContainerTrait (inventory)
    //   4. Player sees "Taken."
    //
    // That's it! The distinction between "takeable" and "not takeable"
    // is simply: does the entity have SceneryTrait?

    // --- Zoo Map (at the Zoo Entrance) ---
    // A simple portable item. No traits besides IdentityTrait needed.
    const zooMap = world.createEntity('zoo map', EntityType.ITEM);

    zooMap.add(new IdentityTrait({
      name: 'zoo map',
      description:
        'A colorful folding map of the Willowbrook Family Zoo. It shows ' +
        'the layout of all the exhibits, with cartoon animals marking ' +
        'each one. Someone has drawn a heart around the petting zoo ' +
        'in crayon.',
      aliases: ['map', 'zoo map', 'folding map'],
      properName: false,
      article: 'a',
    }));

    // Notice: NO SceneryTrait! That's what makes it portable.
    // Just place it in the entrance and the player can take it.
    world.moveEntity(zooMap.id, entrance.id);


    // --- Bag of Animal Feed (at the Petting Zoo) ---
    const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);

    animalFeed.add(new IdentityTrait({
      name: 'bag of animal feed',
      description:
        'A small brown paper bag filled with dried corn and pellets. ' +
        'The label reads "ZOO SNACKS — Safe for goats, rabbits, and ' +
        'birds. Do NOT feed to reptiles." It rustles invitingly.',
      aliases: ['feed', 'animal feed', 'bag of feed', 'bag', 'corn', 'pellets'],
      properName: false,
      article: 'a',
    }));

    world.moveEntity(animalFeed.id, pettingZoo.id);


    // --- Souvenir Penny (on the Main Path) ---
    const penny = world.createEntity('souvenir penny', EntityType.ITEM);

    penny.add(new IdentityTrait({
      name: 'souvenir penny',
      description:
        'A shiny copper penny. It looks like it could fit in one of ' +
        'those souvenir penny press machines — if there were one around.',
      aliases: ['penny', 'souvenir penny', 'coin', 'copper penny'],
      properName: false,
      article: 'a',
    }));

    world.moveEntity(penny.id, mainPath.id);


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
