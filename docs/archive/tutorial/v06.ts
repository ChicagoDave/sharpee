/**
 * Family Zoo Tutorial — Version 6: Openable Things
 *
 * NEW IN THIS VERSION:
 *   - OpenableTrait — entities that can be opened and closed
 *   - Containers that must be opened before you can access their contents
 *   - The "open" and "close" actions (built into stdlib)
 *
 * WHAT YOU'LL LEARN:
 *   - OpenableTrait adds open/close state to any entity
 *   - Combining OpenableTrait + ContainerTrait = closeable container
 *   - Closed containers hide their contents
 *   - "open" and "close" are built-in actions — no custom code needed
 *
 * TRY IT:
 *   > south                  (go to Main Path)
 *   > examine lunchbox       (it's closed)
 *   > open lunchbox          (now you can see what's inside)
 *   > look in lunchbox       (see the contents)
 *   > close lunchbox         (shut it again)
 *   > east                   (go to Petting Zoo)
 *   > open dispenser         (open the feed dispenser)
 *   > look in dispenser      (see the feed inside)
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
  ContainerTrait,
  SupporterTrait,
  RoomTrait,
  SceneryTrait,
  OpenableTrait,     // ← NEW: makes entities openable/closeable
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.6.0',
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

class FamilyZooStory implements Story {
  config = config;

  // createPlayer — same as V1, see v01.ts
  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new IdentityTrait({ name: 'yourself', description: 'Just an ordinary visitor to the zoo.', aliases: ['self', 'myself', 'me'], properName: true, article: '' }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait({ capacity: { maxItems: 10 } }));
    return player;
  }

  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // ROOMS — same as V2, see v02.ts
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path, and neat flower beds add splashes of color. To the east, a white picket fence surrounds the petting zoo. To the west, a tall mesh enclosure rises above the treetops — the aviary. The entrance gates are back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

    const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
    pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
    pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', description: 'A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post near the entrance. The main path is back to the west.', aliases: ['petting zoo', 'petting area', 'pen'], properName: false, article: 'the' }));

    const aviary = world.createEntity('Aviary', EntityType.ROOM);
    aviary.add(new RoomTrait({ exits: {}, isDark: false }));
    aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome that stretches high above the treetops. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin where finches bathe. The exit back to the main path is to the east.', aliases: ['aviary', 'bird house', 'bird cage', 'dome'], properName: false, article: 'the' }));


    // ========================================================================
    // EXITS — same as V2
    // ========================================================================

    entrance.get(RoomTrait)!.exits = { [Direction.SOUTH]: { destination: mainPath.id } };
    mainPath.get(RoomTrait)!.exits = { [Direction.NORTH]: { destination: entrance.id }, [Direction.EAST]: { destination: pettingZoo.id }, [Direction.WEST]: { destination: aviary.id } };
    pettingZoo.get(RoomTrait)!.exits = { [Direction.WEST]: { destination: mainPath.id } };
    aviary.get(RoomTrait)!.exits = { [Direction.EAST]: { destination: mainPath.id } };


    // ========================================================================
    // SCENERY — abbreviated, see v03.ts for detailed comments
    // ========================================================================

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

    const directionSigns = world.createEntity('direction signs', EntityType.SCENERY);
    directionSigns.add(new IdentityTrait({ name: 'direction signs', description: 'Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).', aliases: ['signs', 'direction signs', 'arrow signs'], properName: false, article: 'some' }));
    directionSigns.add(new SceneryTrait());
    world.moveEntity(directionSigns.id, mainPath.id);

    const flowerBeds = world.createEntity('flower beds', EntityType.SCENERY);
    flowerBeds.add(new IdentityTrait({ name: 'flower beds', description: 'Tidy beds of marigolds and petunias.', aliases: ['flowers', 'flower beds'], properName: false, article: 'some' }));
    flowerBeds.add(new SceneryTrait());
    world.moveEntity(flowerBeds.id, mainPath.id);

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
    // PORTABLE OBJECTS — same as V4, see v04.ts
    // ========================================================================

    const zooMap = world.createEntity('zoo map', EntityType.ITEM);
    zooMap.add(new IdentityTrait({ name: 'zoo map', description: 'A colorful folding map of the Willowbrook Family Zoo.', aliases: ['map', 'zoo map', 'folding map'], properName: false, article: 'a' }));
    world.moveEntity(zooMap.id, entrance.id);

    const animalFeed = world.createEntity('bag of animal feed', EntityType.ITEM);
    animalFeed.add(new IdentityTrait({ name: 'bag of animal feed', description: 'A small brown paper bag filled with dried corn and pellets.', aliases: ['feed', 'animal feed', 'bag of feed', 'corn'], properName: false, article: 'a' }));
    world.moveEntity(animalFeed.id, pettingZoo.id);

    const penny = world.createEntity('souvenir penny', EntityType.ITEM);
    penny.add(new IdentityTrait({ name: 'souvenir penny', description: 'A shiny copper penny that could fit in a souvenir press machine.', aliases: ['penny', 'souvenir penny', 'coin'], properName: false, article: 'a' }));
    world.moveEntity(penny.id, mainPath.id);


    // ========================================================================
    // CONTAINERS & SUPPORTERS — from V5, with OpenableTrait added
    // ========================================================================

    // --- Backpack (portable container, starts open) ---
    const backpack = world.createEntity('backpack', EntityType.CONTAINER);
    backpack.add(new IdentityTrait({ name: 'backpack', description: 'A small red canvas backpack with a cartoon monkey patch.', aliases: ['backpack', 'bag', 'rucksack', 'pack'], properName: false, article: 'a' }));
    backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    // No OpenableTrait on the backpack — it's always open (like a bag)
    world.moveEntity(backpack.id, entrance.id);

    // --- Park Bench (supporter) ---
    const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
    parkBench.add(new IdentityTrait({ name: 'park bench', description: 'A sturdy park bench painted forest green. Plaque: "In memory of Mr. Whiskers."', aliases: ['bench', 'park bench', 'benches', 'seat'], properName: false, article: 'a' }));
    parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
    parkBench.add(new SceneryTrait());
    world.moveEntity(parkBench.id, mainPath.id);


    // ========================================================================
    // OPENABLE THINGS — NEW IN V6
    // ========================================================================
    //
    // OpenableTrait gives an entity an open/closed state.
    // The player can "open" and "close" it using built-in stdlib actions.
    //
    // OpenableTrait is most useful when COMBINED with other traits:
    //
    //   OpenableTrait + ContainerTrait = closeable container
    //     → Contents are hidden when closed
    //     → "put X in Y" only works when Y is open
    //     → "look in Y" only works when Y is open
    //
    //   OpenableTrait + LockableTrait = lockable door/container (V7!)
    //     → Must unlock before opening
    //
    //   OpenableTrait alone = simple openable (a book, a gate, a lid)
    //
    // KEY PROPERTIES:
    //   isOpen: boolean     — current state (default: false = closed)
    //   canClose: boolean   — can the player close it again? (default: true)
    //   revealsContents: boolean — does opening show what's inside? (default: true)

    // --- Lunchbox (openable portable container on the Main Path) ---
    //
    // The lunchbox is a container that starts CLOSED. The player must
    // "open lunchbox" before they can see or take what's inside.

    const lunchbox = world.createEntity('lunchbox', EntityType.CONTAINER);

    lunchbox.add(new IdentityTrait({
      name: 'lunchbox',
      description:
        'A dented metal lunchbox decorated with cartoon zoo animals. ' +
        'It looks like someone left it behind after a picnic.',
      aliases: ['lunchbox', 'lunch box', 'metal box', 'box'],
      properName: false,
      article: 'a',
    }));

    // ContainerTrait — it can hold things inside
    lunchbox.add(new ContainerTrait({
      capacity: { maxItems: 3 },
    }));

    // OpenableTrait — it can be opened and closed
    // isOpen: false means it starts CLOSED. The player must type "open lunchbox."
    lunchbox.add(new OpenableTrait({
      isOpen: false,       // Starts closed
      canClose: true,      // Player can close it again
      revealsContents: true,  // Opening shows what's inside
    }));

    world.moveEntity(lunchbox.id, mainPath.id);

    // Put something inside the closed lunchbox for the player to discover.
    // We need AuthorModel to bypass the "container is closed" check during
    // world setup. But for this simple tutorial, we'll just set isOpen
    // temporarily to place the item, then close it.
    lunchbox.get(OpenableTrait)!.isOpen = true;
    const juice = world.createEntity('juice box', EntityType.ITEM);
    juice.add(new IdentityTrait({
      name: 'juice box',
      description:
        'A small juice box with a picture of a happy elephant on the ' +
        'front. The straw is still attached.',
      aliases: ['juice', 'juice box', 'drink'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(juice.id, lunchbox.id);
    lunchbox.get(OpenableTrait)!.isOpen = false;  // Close it back up


    // --- Feed Dispenser (openable scenery container at Petting Zoo) ---
    //
    // The dispenser also gets OpenableTrait. It starts closed — the player
    // must "open dispenser" to access the feed pellets inside.

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

    // OpenableTrait on the dispenser — must crank it open first
    dispenser.add(new OpenableTrait({
      isOpen: false,          // Starts closed
      canClose: true,         // Can be closed again
      revealsContents: true,  // Opening reveals the pellets inside
    }));

    // SceneryTrait — can't take the dispenser itself
    dispenser.add(new SceneryTrait());

    world.moveEntity(dispenser.id, pettingZoo.id);


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
