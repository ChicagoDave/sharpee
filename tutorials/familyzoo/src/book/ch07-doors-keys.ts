/**
 * Family Zoo Tutorial — Version 7: Locked Doors & Keys
 *
 * NEW IN THIS VERSION:
 *   - LockableTrait — entities that can be locked and unlocked
 *   - A locked staff gate blocking access to the supply room
 *   - A keycard that unlocks the gate
 *   - The "unlock X with Y" action (built into stdlib)
 *   - Door entities with DoorTrait connecting rooms
 *   - Exit `via` property — gates/doors that block passage
 *
 * WHAT YOU'LL LEARN:
 *   - LockableTrait adds lock/unlock state to any entity
 *   - LockableTrait.keyId wires a specific key to a specific lock
 *   - Exits can reference a door/gate via the `via` property
 *   - The going action checks if the `via` entity is open before allowing passage
 *   - Combining OpenableTrait + LockableTrait = locked door
 *
 * TRY IT:
 *   > take keycard           (pick up the keycard at the entrance)
 *   > south                  (go to Main Path)
 *   > south                  (blocked — the staff gate is locked!)
 *   > unlock gate with keycard  (unlock it)
 *   > open gate              (now open the gate)
 *   > south                  (walk through to the Supply Room)
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
  OpenableTrait,
  LockableTrait,     // ← NEW: makes entities lockable/unlockable
  DoorTrait,         // ← NEW: marks an entity as a door between rooms
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

const config: StoryConfig = {
  id: 'familyzoo',
  title: 'Family Zoo',
  author: 'Sharpee Tutorial',
  version: '0.7.0',
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
    // ROOMS
    // ========================================================================

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);
    entrance.add(new RoomTrait({ exits: {}, isDark: false }));
    entrance.add(new IdentityTrait({ name: 'Zoo Entrance', description: 'You stand before the wrought-iron gates of the Willowbrook Family Zoo. A cheerful welcome sign arches over the entrance, and a small ticket booth sits to one side. A sturdy iron fence runs along either side of the gates. The main path leads south into the zoo grounds.', aliases: ['entrance', 'gates', 'gate'], properName: false, article: 'the' }));

    const mainPath = world.createEntity('Main Path', EntityType.ROOM);
    mainPath.add(new RoomTrait({ exits: {}, isDark: false }));
    mainPath.add(new IdentityTrait({ name: 'Main Path', description: 'A wide gravel path winds through the heart of the zoo. Colorful direction signs point every which way. A park bench sits beside the path. To the east, the petting zoo. To the west, the aviary. A staff gate blocks the path to the south. The entrance is back to the north.', aliases: ['path', 'main path', 'gravel path'], properName: false, article: 'the' }));

    const pettingZoo = world.createEntity('Petting Zoo', EntityType.ROOM);
    pettingZoo.add(new RoomTrait({ exits: {}, isDark: false }));
    pettingZoo.add(new IdentityTrait({ name: 'Petting Zoo', description: 'A cheerful open-air enclosure filled with friendly animals. Pygmy goats trot around nibbling at visitors\' shoelaces, while a pair of fluffy rabbits hop lazily near a hay bale. A feed dispenser is mounted on a post near the entrance. The main path is back to the west.', aliases: ['petting zoo', 'petting area', 'pen'], properName: false, article: 'the' }));

    const aviary = world.createEntity('Aviary', EntityType.ROOM);
    aviary.add(new RoomTrait({ exits: {}, isDark: false }));
    aviary.add(new IdentityTrait({ name: 'Aviary', description: 'You step inside a soaring mesh dome. Brilliantly colored parrots chatter from rope perches, and a toucan eyes you curiously from a branch overhead. A small waterfall splashes into a stone basin. The exit back to the main path is to the east.', aliases: ['aviary', 'bird house', 'dome'], properName: false, article: 'the' }));

    // --- Supply Room (NEW — behind the locked staff gate) ---
    const supplyRoom = world.createEntity('Supply Room', EntityType.ROOM);
    supplyRoom.add(new RoomTrait({ exits: {}, isDark: false }));
    supplyRoom.add(new IdentityTrait({
      name: 'Supply Room',
      description:
        'A cluttered storage room behind the staff gate. Metal shelves ' +
        'line the walls, stacked with bags of feed, cleaning supplies, ' +
        'and spare parts for the exhibits. A cork board on the wall is ' +
        'covered with staff schedules and animal care notes. The staff ' +
        'gate leads back north to the main path.',
      aliases: ['supply room', 'storage room', 'staff room', 'storeroom'],
      properName: false,
      article: 'the',
    }));


    // ========================================================================
    // THE STAFF GATE — NEW IN V7
    // ========================================================================
    //
    // A locked gate is an entity that combines three traits:
    //   1. OpenableTrait — it can be opened and closed
    //   2. LockableTrait — it can be locked and unlocked
    //   3. DoorTrait — it connects two rooms
    //
    // The KEY INSIGHT is how these traits interact:
    //   - LockableTrait PREVENTS opening while locked
    //   - The player must "unlock gate with keycard" FIRST
    //   - Then "open gate" to actually open it
    //   - Only then can they walk through
    //
    // LockableTrait has a `keyId` property that specifies which entity
    // acts as the key. The engine checks: does the player have an entity
    // whose ID matches `keyId`? If yes, the unlock succeeds.

    // First, create the keycard (the key) so we have its ID
    const keycard = world.createEntity('staff keycard', EntityType.ITEM);
    keycard.add(new IdentityTrait({
      name: 'staff keycard',
      description:
        'A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" ' +
        'printed in blue. There\'s a faded photo of a smiling zookeeper ' +
        'on the back.',
      aliases: ['keycard', 'key card', 'card', 'key', 'staff keycard'],
      properName: false,
      article: 'a',
    }));
    world.moveEntity(keycard.id, entrance.id);  // Found near the entrance

    // Now create the staff gate
    const staffGate = world.createEntity('staff gate', EntityType.DOOR);

    staffGate.add(new IdentityTrait({
      name: 'staff gate',
      description:
        'A sturdy metal gate with a "STAFF ONLY — AUTHORIZED PERSONNEL" ' +
        'sign. There\'s a card reader mounted on the post beside it.',
      aliases: ['gate', 'staff gate', 'metal gate', 'staff door'],
      properName: false,
      article: 'a',
    }));

    // DoorTrait marks this entity as a connection between two rooms.
    // room1 and room2 are the IDs of the rooms it connects.
    staffGate.add(new DoorTrait({
      room1: mainPath.id,
      room2: supplyRoom.id,
      bidirectional: true,   // Can go through in both directions
    }));

    // OpenableTrait — the gate can be opened and closed.
    // Starts closed (isOpen: false).
    staffGate.add(new OpenableTrait({
      isOpen: false,
    }));

    // LockableTrait — the gate is locked!
    // keyId points to the keycard entity. Only that specific entity
    // can unlock this gate. The player must have it in their inventory.
    staffGate.add(new LockableTrait({
      isLocked: true,        // Starts locked
      keyId: keycard.id,     // THIS is how you wire a key to a lock
    }));

    // SceneryTrait — can't take the gate itself
    staffGate.add(new SceneryTrait());

    // Place the gate in the main path (it's visible from there)
    world.moveEntity(staffGate.id, mainPath.id);


    // ========================================================================
    // EXITS — including the locked gate passage
    // ========================================================================
    //
    // The `via` property on an exit tells the going action: "before letting
    // the player through, check this door/gate entity." If the `via` entity
    // is closed (or locked), the player is blocked.
    //
    // This is how you create doors that the player must open to pass through.

    entrance.get(RoomTrait)!.exits = {
      [Direction.SOUTH]: { destination: mainPath.id },
    };

    mainPath.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: entrance.id },
      [Direction.EAST]:  { destination: pettingZoo.id },
      [Direction.WEST]:  { destination: aviary.id },
      // The via property references the staff gate entity.
      // The going action will check: is staffGate open?
      //   - If closed/locked → "The staff gate is closed."
      //   - If open → player walks through to the supply room
      [Direction.SOUTH]: { destination: supplyRoom.id, via: staffGate.id },
    };

    pettingZoo.get(RoomTrait)!.exits = {
      [Direction.WEST]: { destination: mainPath.id },
    };

    aviary.get(RoomTrait)!.exits = {
      [Direction.EAST]: { destination: mainPath.id },
    };

    // Return exit from supply room also goes via the gate
    supplyRoom.get(RoomTrait)!.exits = {
      [Direction.NORTH]: { destination: mainPath.id, via: staffGate.id },
    };


    // ========================================================================
    // SCENERY — abbreviated, see v03.ts
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

    // Supply Room scenery
    const shelves = world.createEntity('metal shelves', EntityType.SCENERY);
    shelves.add(new IdentityTrait({
      name: 'metal shelves',
      description:
        'Industrial metal shelving units stacked with supplies: bags of ' +
        'feed, bottles of disinfectant, spare lightbulbs, and rolls of ' +
        'chicken wire. Everything is neatly labeled.',
      aliases: ['shelves', 'metal shelves', 'shelf', 'shelving'],
      properName: false,
      article: 'some',
    }));
    shelves.add(new SceneryTrait());
    world.moveEntity(shelves.id, supplyRoom.id);

    const corkBoard = world.createEntity('cork board', EntityType.SCENERY);
    corkBoard.add(new IdentityTrait({
      name: 'cork board',
      description:
        'A cork board covered with pinned notices: feeding schedules, ' +
        'veterinary check dates, and a photo of the staff holiday party. ' +
        'Someone has written "DON\'T FORGET: nocturnal exhibit lights ' +
        'need new batteries!" in red marker.',
      aliases: ['cork board', 'board', 'notices', 'bulletin board'],
      properName: false,
      article: 'a',
    }));
    corkBoard.add(new SceneryTrait());
    world.moveEntity(corkBoard.id, supplyRoom.id);


    // ========================================================================
    // PORTABLE OBJECTS
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
    // CONTAINERS — from V5/V6
    // ========================================================================

    const backpack = world.createEntity('backpack', EntityType.CONTAINER);
    backpack.add(new IdentityTrait({ name: 'backpack', description: 'A small red canvas backpack with a cartoon monkey patch.', aliases: ['backpack', 'rucksack', 'pack'], properName: false, article: 'a' }));
    backpack.add(new ContainerTrait({ capacity: { maxItems: 5 } }));
    world.moveEntity(backpack.id, entrance.id);

    const parkBench = world.createEntity('park bench', EntityType.SUPPORTER);
    parkBench.add(new IdentityTrait({ name: 'park bench', description: 'A sturdy park bench painted forest green. Plaque: "In memory of Mr. Whiskers."', aliases: ['bench', 'park bench', 'benches', 'seat'], properName: false, article: 'a' }));
    parkBench.add(new SupporterTrait({ capacity: { maxItems: 3 } }));
    parkBench.add(new SceneryTrait());
    world.moveEntity(parkBench.id, mainPath.id);

    const lunchbox = world.createEntity('lunchbox', EntityType.CONTAINER);
    lunchbox.add(new IdentityTrait({ name: 'lunchbox', description: 'A dented metal lunchbox decorated with cartoon zoo animals.', aliases: ['lunchbox', 'lunch box', 'box'], properName: false, article: 'a' }));
    lunchbox.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
    lunchbox.add(new OpenableTrait({ isOpen: false }));
    world.moveEntity(lunchbox.id, mainPath.id);

    lunchbox.get(OpenableTrait)!.isOpen = true;
    const juice = world.createEntity('juice box', EntityType.ITEM);
    juice.add(new IdentityTrait({ name: 'juice box', description: 'A small juice box with a picture of a happy elephant.', aliases: ['juice', 'juice box', 'drink'], properName: false, article: 'a' }));
    world.moveEntity(juice.id, lunchbox.id);
    lunchbox.get(OpenableTrait)!.isOpen = false;

    const dispenser = world.createEntity('feed dispenser', EntityType.CONTAINER);
    dispenser.add(new IdentityTrait({ name: 'feed dispenser', description: 'A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE — Just Turn!"', aliases: ['dispenser', 'feed dispenser', 'machine'], properName: false, article: 'a' }));
    dispenser.add(new ContainerTrait({ capacity: { maxItems: 3 } }));
    dispenser.add(new OpenableTrait({ isOpen: false }));
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
