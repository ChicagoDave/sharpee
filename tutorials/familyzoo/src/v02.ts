/**
 * Family Zoo Tutorial — Version 2: Multiple Rooms & Navigation
 *
 * NEW IN THIS VERSION:
 *   - Creating multiple rooms
 *   - Connecting rooms with exits (Direction enum)
 *   - The player can walk between rooms using compass directions
 *
 * WHAT YOU'LL LEARN:
 *   - How exits work (each room declares where its exits lead)
 *   - How the Direction enum maps compass directions to exits
 *   - Exits must be wired in BOTH directions (south exit needs matching north)
 *   - The "going" action is built into Sharpee — no custom code needed
 *
 * TRY IT:
 *   > look                (see the Zoo Entrance)
 *   > south               (walk to the Main Path)
 *   > look                (see the Main Path)
 *   > east                (walk to the Petting Zoo)
 *   > west                (back to Main Path)
 *   > north               (back to Zoo Entrance)
 *   > south               (Main Path again)
 *   > west                (walk to the Aviary)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS — same as V1, see v01.ts for detailed explanations
// ============================================================================

import { Story, StoryConfig } from '@sharpee/engine';
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,       // NEW: compass directions for room exits
} from '@sharpee/world-model';
import {
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  SceneryTrait,
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION — same as V1
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.2.0',
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
    // STEP 1: Create ALL rooms first (without exits)
    // ========================================================================
    // We create all rooms before wiring exits. Why? Because an exit needs
    // the destination room's ID, and you can't reference a room that doesn't
    // exist yet. Create first, connect second.

    // --- Zoo Entrance (same as V1) ---
    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({
      name: 'Zoo Entrance',
      description:
        'You stand before the gates of the Willowbrook Family Zoo. ' +
        'A cheerful welcome sign arches over the entrance, and a small ' +
        'ticket booth sits to one side. The main path leads south into ' +
        'the zoo grounds.',
      aliases: ['entrance', 'gates', 'gate'],
      properName: false,
      article: 'the',
    }));

    // --- Main Path (NEW) ---
    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({
      name: 'Main Path',
      description:
        'A wide gravel path winds through the heart of the zoo. Colorful ' +
        'direction signs point every which way. To the east, a white ' +
        'picket fence surrounds the petting zoo. To the west, a tall ' +
        'mesh enclosure rises above the treetops — the aviary. The ' +
        'entrance gates are back to the north.',
      aliases: ['path', 'main path', 'gravel path'],
      properName: false,
      article: 'the',
    }));

    // --- Petting Zoo (NEW) ---
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

    // --- Aviary (NEW) ---
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
    // STEP 2: Wire up exits between rooms
    // ========================================================================
    // Exits use the Direction enum: NORTH, SOUTH, EAST, WEST, UP, DOWN, etc.
    // Each exit is an object with a "destination" property — the ID of the
    // room the player will arrive in when they go that direction.
    //
    // IMPORTANT: Exits are one-way! If the entrance has a SOUTH exit to
    // the main path, you ALSO need a NORTH exit on the main path back to
    // the entrance. Forgetting the return exit means the player gets stuck!

    // Get the RoomTrait from each room so we can set its exits.
    // The .get() method retrieves a trait by its class.
    const entranceRoom = entrance.get(RoomTrait)!;
    const mainPathRoom = mainPath.get(RoomTrait)!;
    const pettingZooRoom = pettingZoo.get(RoomTrait)!;
    const aviaryRoom = aviary.get(RoomTrait)!;

    // Entrance ←→ Main Path (north/south)
    entranceRoom.exits = {
      [Direction.SOUTH]: { destination: mainPath.id },
    };

    mainPathRoom.exits = {
      [Direction.NORTH]: { destination: entrance.id },
      [Direction.EAST]:  { destination: pettingZoo.id },
      [Direction.WEST]:  { destination: aviary.id },
    };

    // Petting Zoo → Main Path (back west)
    pettingZooRoom.exits = {
      [Direction.WEST]: { destination: mainPath.id },
    };

    // Aviary → Main Path (back east)
    aviaryRoom.exits = {
      [Direction.EAST]: { destination: mainPath.id },
    };


    // ========================================================================
    // STEP 3: Create scenery objects (same pattern as V1)
    // ========================================================================

    // --- Welcome Sign (Zoo Entrance) ---
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

    // --- Ticket Booth (Zoo Entrance) ---
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

    // --- Direction Signs (Main Path) ---
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

    // --- Goats (Petting Zoo) ---
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

    // --- Toucan (Aviary) ---
    const toucan = world.createEntity('toucan', EntityType.SCENERY);
    toucan.add(new IdentityTrait({
      name: 'toucan',
      description:
        'A Toco toucan with an enormous orange-and-black bill. It tilts ' +
        'its head and regards you with one intelligent eye, as if deciding ' +
        'whether you\'re interesting enough to fly closer to.',
      aliases: ['toucan', 'bird', 'toco toucan'],
      properName: false,
      article: 'a',
    }));
    toucan.add(new SceneryTrait());
    world.moveEntity(toucan.id, aviary.id);


    // ========================================================================
    // STEP 4: Place the player in the starting room
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
