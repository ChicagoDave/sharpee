/**
 * Family Zoo Tutorial — Version 3: Scenery
 *
 * NEW IN THIS VERSION:
 *   - SceneryTrait in detail — what it does, when to use it
 *   - More scenery objects across all rooms
 *   - How scenery appears in room descriptions
 *   - Why some things should NOT be takeable
 *
 * WHAT YOU'LL LEARN:
 *   - SceneryTrait prevents taking ("fixed in place")
 *   - Scenery can still be examined — it has IdentityTrait with a description
 *   - EntityType.SCENERY vs EntityType.ITEM — the difference matters
 *   - Scenery makes rooms feel alive without cluttering the inventory
 *
 * TRY IT:
 *   > look                 (scenery is mentioned in room descriptions)
 *   > examine fence        (you can examine scenery)
 *   > take fence           (can't — scenery is fixed in place)
 *   > examine hay bale     (another scenery object)
 *   > take hay bale        (still can't take it)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS — same as V2, see v01.ts for detailed explanations
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
  ContainerTrait,
  RoomTrait,
  SceneryTrait,    // ← This version's star! See detailed comments below.
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.3.0',
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
    // EXITS — same as V2, see v02.ts for detailed comments
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
    // SCENERY — NEW IN V3
    // ========================================================================
    //
    // SceneryTrait is one of the simplest but most important traits.
    // It does one thing: prevents the player from picking up the entity.
    //
    // Without SceneryTrait, EVERYTHING is portable by default in Sharpee.
    // That's a design choice — items are takeable unless you say otherwise.
    // SceneryTrait is how you say "this is part of the environment."
    //
    // When the player tries "take fence", they'll see:
    //   "iron fence is fixed in place."
    //
    // But "examine fence" still works — SceneryTrait doesn't prevent
    // examining, only taking. The entity still has an IdentityTrait
    // with a description that the player can read.
    //
    // WHEN TO USE SceneryTrait:
    //   ✓ Things bolted to the ground (fences, benches, signs)
    //   ✓ Animals in enclosures (goats, birds, fish)
    //   ✓ Natural features (trees, rocks, waterfalls)
    //   ✓ Architectural features (walls, doors, windows)
    //   ✗ DON'T use for items the player should pick up (maps, keys, tools)
    //
    // EntityType.SCENERY vs SceneryTrait:
    //   EntityType.SCENERY is just a label — it hints at what the entity IS
    //   but doesn't actually DO anything on its own.
    //   SceneryTrait is the actual mechanism that blocks taking.
    //   You need BOTH for a proper scenery object.


    // --- Zoo Entrance Scenery ---

    const sign = world.createEntity('welcome sign', EntityType.SCENERY);
    sign.add(new IdentityTrait({
      name: 'welcome sign',
      description:
        'A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK ' +
        'FAMILY ZOO — Home to over 50 amazing animals! Open daily, ' +
        'rain or shine." Cartoon animals dance along the border.',
      aliases: ['sign', 'welcome sign', 'wooden sign'],
      properName: false,
      article: 'a',
    }));
    sign.add(new SceneryTrait());
    world.moveEntity(sign.id, entrance.id);

    const booth = world.createEntity('ticket booth', EntityType.SCENERY);
    booth.add(new IdentityTrait({
      name: 'ticket booth',
      description:
        'A small wooden booth with a sliding glass window. A sign in the ' +
        'window reads "Self-Guided Tours — No Ticket Needed Today!" ' +
        'A friendly cartoon giraffe is painted on the side.',
      aliases: ['booth', 'ticket booth', 'window'],
      properName: false,
      article: 'a',
    }));
    booth.add(new SceneryTrait());
    world.moveEntity(booth.id, entrance.id);

    // NEW: The iron fence around the zoo grounds
    const fence = world.createEntity('iron fence', EntityType.SCENERY);
    fence.add(new IdentityTrait({
      name: 'iron fence',
      description:
        'A tall wrought-iron fence with decorative animal silhouettes ' +
        'cut into every other bar — a giraffe here, an elephant there. ' +
        'It runs the full perimeter of the zoo grounds.',
      aliases: ['fence', 'iron fence', 'wrought-iron fence', 'railing'],
      properName: false,
      article: 'an',
    }));
    fence.add(new SceneryTrait());
    world.moveEntity(fence.id, entrance.id);


    // --- Main Path Scenery ---

    const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
    directionSigns.add(new IdentityTrait({
      name: 'direction signs',
      description:
        'A cluster of brightly colored arrow signs nailed to a wooden ' +
        'post. They point to: PETTING ZOO (east), AVIARY (west), ' +
        'REPTILE HOUSE (south — coming soon!), and EXIT (north).',
      aliases: ['signs', 'direction signs', 'arrow signs', 'post'],
      properName: false,
      article: 'some',
    }));
    directionSigns.add(new SceneryTrait());
    world.moveEntity(directionSigns.id, mainPath.id);

    // NEW: Benches along the path
    const benches = world.createEntity('wooden benches', EntityType.SCENERY);
    benches.add(new IdentityTrait({
      name: 'wooden benches',
      description:
        'Sturdy park benches painted forest green, each with a small ' +
        'brass plaque thanking a zoo donor. One reads: "In memory of ' +
        'Mr. Whiskers, the world\'s friendliest capybara, 2019–2024."',
      aliases: ['benches', 'bench', 'wooden benches', 'park bench', 'seat'],
      properName: false,
      article: 'some',
    }));
    benches.add(new SceneryTrait());
    world.moveEntity(benches.id, mainPath.id);

    // NEW: Flower beds
    const flowerBeds = world.createEntity('flower beds', EntityType.SCENERY);
    flowerBeds.add(new IdentityTrait({
      name: 'flower beds',
      description:
        'Tidy beds of marigolds and petunias in alternating orange and ' +
        'purple stripes. A hand-painted sign stuck in the soil reads: ' +
        '"Planted by Willowbrook Elementary, Grade 3."',
      aliases: ['flowers', 'flower beds', 'marigolds', 'petunias', 'garden'],
      properName: false,
      article: 'some',
    }));
    flowerBeds.add(new SceneryTrait());
    world.moveEntity(flowerBeds.id, mainPath.id);


    // --- Petting Zoo Scenery ---

    const goats = world.createEntity('pygmy goats', EntityType.SCENERY);
    goats.add(new IdentityTrait({
      name: 'pygmy goats',
      description:
        'Three pygmy goats with stubby legs and expressive faces. They ' +
        'stare at you with their weird rectangular pupils, clearly ' +
        'hoping you have food. One of them is chewing on a visitor\'s ' +
        'dropped map.',
      aliases: ['goats', 'pygmy goats', 'goat'],
      properName: false,
      article: 'some',
    }));
    goats.add(new SceneryTrait());
    world.moveEntity(goats.id, pettingZoo.id);

    // NEW: The hay bale
    const hayBale = world.createEntity('hay bale', EntityType.SCENERY);
    hayBale.add(new IdentityTrait({
      name: 'hay bale',
      description:
        'A large round bale of golden hay, slightly nibbled around the ' +
        'edges by enthusiastic goats. Two rabbits are nestled in a ' +
        'hollow they\'ve carved into the side.',
      aliases: ['hay', 'hay bale', 'bale', 'straw'],
      properName: false,
      article: 'a',
    }));
    hayBale.add(new SceneryTrait());
    world.moveEntity(hayBale.id, pettingZoo.id);

    // NEW: The rabbits
    const rabbits = world.createEntity('rabbits', EntityType.SCENERY);
    rabbits.add(new IdentityTrait({
      name: 'rabbits',
      description:
        'A pair of Holland Lop rabbits with floppy ears and twitching ' +
        'noses. One is pure white, the other a patchwork of brown and ' +
        'cream. They seem utterly unbothered by the goats.',
      aliases: ['rabbits', 'rabbit', 'bunnies', 'bunny'],
      properName: false,
      article: 'some',
    }));
    rabbits.add(new SceneryTrait());
    world.moveEntity(rabbits.id, pettingZoo.id);

    // NEW: The picket fence / pig pen
    const picketFence = world.createEntity('picket fence', EntityType.SCENERY);
    picketFence.add(new IdentityTrait({
      name: 'picket fence',
      description:
        'A low white picket fence separating the main petting area from ' +
        'the pig pen beyond. The fence is splattered with mud on the ' +
        'pig side. A happy-looking potbellied pig snoozes in the mud.',
      aliases: ['picket fence', 'fence', 'pig pen', 'pen', 'pig'],
      properName: false,
      article: 'a',
    }));
    picketFence.add(new SceneryTrait());
    world.moveEntity(picketFence.id, pettingZoo.id);


    // --- Aviary Scenery ---

    const toucan = world.createEntity('toucan', EntityType.SCENERY);
    toucan.add(new IdentityTrait({
      name: 'toucan',
      description:
        'A Toco toucan with an enormous orange-and-black bill. It tilts ' +
        'its head and regards you with one intelligent eye, as if deciding ' +
        'whether you\'re interesting enough to fly closer to.',
      aliases: ['toucan', 'toco toucan'],
      properName: false,
      article: 'a',
    }));
    toucan.add(new SceneryTrait());
    world.moveEntity(toucan.id, aviary.id);

    // NEW: The parrots
    const parrots = world.createEntity('parrots', EntityType.SCENERY);
    parrots.add(new IdentityTrait({
      name: 'parrots',
      description:
        'A raucous flock of scarlet macaws, green Amazons, and grey ' +
        'African parrots. They squabble over perching spots and crack ' +
        'seeds with powerful beaks. One grey parrot bobs its head and ' +
        'mutters something that sounds suspiciously like "budget cuts."',
      aliases: ['parrots', 'parrot', 'macaws', 'macaw', 'birds'],
      properName: false,
      article: 'some',
    }));
    parrots.add(new SceneryTrait());
    world.moveEntity(parrots.id, aviary.id);

    // NEW: The waterfall
    const waterfall = world.createEntity('waterfall', EntityType.SCENERY);
    waterfall.add(new IdentityTrait({
      name: 'waterfall',
      description:
        'A gentle artificial waterfall cascading over smooth rocks into ' +
        'a shallow stone basin. Tiny finches splash and preen in the ' +
        'mist. The quiet sound of running water is almost drowned out ' +
        'by the parrots.',
      aliases: ['waterfall', 'water', 'basin', 'fountain', 'finches'],
      properName: false,
      article: 'a',
    }));
    waterfall.add(new SceneryTrait());
    world.moveEntity(waterfall.id, aviary.id);

    // NEW: Rope perches
    const perches = world.createEntity('rope perches', EntityType.SCENERY);
    perches.add(new IdentityTrait({
      name: 'rope perches',
      description:
        'Thick sisal ropes strung between wooden posts at various ' +
        'heights, creating a jungle gym for the birds. The ropes are ' +
        'frayed and chewed in spots — the parrots treat them as both ' +
        'furniture and snacks.',
      aliases: ['perches', 'rope perches', 'ropes', 'rope'],
      properName: false,
      article: 'some',
    }));
    perches.add(new SceneryTrait());
    world.moveEntity(perches.id, aviary.id);


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
