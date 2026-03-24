/**
 * Family Zoo Tutorial — Version 1: A Single Room
 *
 * WHAT YOU'LL LEARN:
 *   - How to create a Sharpee story from scratch
 *   - How to define the Story interface (config, initializeWorld, createPlayer)
 *   - How to create a room with a name and description
 *   - How to create scenery objects the player can examine
 *   - How to place objects in a room
 *   - How to set the player's starting location
 *
 * TRY IT:
 *   > look               (see the room description)
 *   > examine sign        (read the welcome sign)
 *   > examine booth       (look at the ticket booth)
 *   > take sign           (can't — it's scenery!)
 *
 * BUILD & RUN:
 *   ./build.sh -s familyzoo
 *   node dist/cli/sharpee.js --story tutorials/familyzoo --play
 */

// ============================================================================
// IMPORTS
// ============================================================================

// The Story interface defines the contract every Sharpee story must follow.
// StoryConfig holds metadata like the title, author, and version.
import { Story, StoryConfig } from '@sharpee/engine';

// WorldModel is the central database of everything in your game world.
// Every room, object, and character is an "entity" managed by the WorldModel.
import {
  WorldModel,
  IFEntity,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Traits are components you attach to entities to give them capabilities.
// Think of them like tags with data: "this entity IS a room" or "this entity
// HAS an identity (name + description)."
import {
  IdentityTrait,   // Gives an entity a name, description, and aliases
  ActorTrait,      // Marks an entity as a character (player or NPC)
  ContainerTrait,  // Lets an entity hold other entities (player holds inventory)
  RoomTrait,       // Marks an entity as a room (has exits, can be dark)
  SceneryTrait,    // Marks an entity as fixed scenery (can't be picked up)
} from '@sharpee/world-model';


// ============================================================================
// STORY CONFIGURATION
// ============================================================================

// Every story needs a config object with basic metadata.
// The engine uses this for the title banner when the game starts.
const config: StoryConfig = {
  id: 'familyzoo',                              // Unique identifier
  title: 'Family Zoo',                           // Displayed at game start
  author: 'Sharpee Tutorial',                    // Author credit
  version: '0.1.0',                              // Semantic version
  description: 'A small family zoo — learn Sharpee one concept at a time.',
};


// ============================================================================
// THE STORY CLASS
// ============================================================================

// A Sharpee story is a class that implements the Story interface.
// The engine calls its methods during startup to build the game world.
class FamilyZooStory implements Story {

  // The config property is required. The engine reads it immediately.
  config = config;

  // --------------------------------------------------------------------------
  // createPlayer — called first by the engine
  // --------------------------------------------------------------------------
  // The engine calls this to create the player character entity.
  // Every game needs exactly one player. The player is an entity just like
  // rooms and objects — it has traits that define what it can do.
  createPlayer(world: WorldModel): IFEntity {

    // Create a new entity of type ACTOR (a character in the world).
    // The first argument is the display name.
    const player = world.createEntity('yourself', EntityType.ACTOR);

    // IdentityTrait gives the entity a name, description, and aliases.
    // Aliases are alternative words the parser will recognize.
    // "examine myself" or "examine me" will both work because of these aliases.
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'Just an ordinary visitor to the zoo.',
      aliases: ['self', 'myself', 'me'],
      properName: true,   // Don't prefix with "a" or "the"
      article: '',         // No article (not "a yourself" or "the yourself")
    }));

    // ActorTrait marks this entity as a character who can act in the world.
    // isPlayer: true tells the engine this is THE player character.
    player.add(new ActorTrait({
      isPlayer: true,
    }));

    // ContainerTrait lets the player carry items in their inventory.
    // Without this, "take" and "inventory" wouldn't work.
    player.add(new ContainerTrait({
      capacity: { maxItems: 10 },  // Can carry up to 10 things
    }));

    return player;
  }

  // --------------------------------------------------------------------------
  // initializeWorld — called after createPlayer
  // --------------------------------------------------------------------------
  // This is where you build your game world: rooms, objects, connections.
  // The engine calls this once during startup.
  initializeWorld(world: WorldModel): void {

    // ========================================================================
    // STEP 1: Create a room
    // ========================================================================
    // Rooms are entities of type ROOM. They need two traits:
    //   - RoomTrait: makes it a room (has exits, can be dark/light)
    //   - IdentityTrait: gives it a name and description

    const entrance = world.createEntity('Zoo Entrance', EntityType.ROOM);

    // RoomTrait defines room-specific properties.
    // "exits" is an empty object because V1 has only one room — nowhere to go!
    // "isDark" is false because this is an outdoor area in daylight.
    entrance.add(new RoomTrait({
      exits: {},           // No exits yet — we'll add them in V2!
      isDark: false,       // Well-lit (outdoor area)
    }));

    // IdentityTrait is the most important trait — almost every entity has one.
    // The "description" is what the player sees when they type "look."
    entrance.add(new IdentityTrait({
      name: 'Zoo Entrance',
      description:
        'You stand before the gates of the Willowbrook Family Zoo. ' +
        'A cheerful welcome sign arches over the entrance, and a small ' +
        'ticket booth sits to one side. Beyond the gates, you can hear ' +
        'the distant calls of exotic birds and the chatter of monkeys.',
      aliases: ['entrance', 'gates', 'gate'],
      properName: false,    // Not a proper noun
      article: 'the',      // "the Zoo Entrance"
    }));


    // ========================================================================
    // STEP 2: Create scenery objects
    // ========================================================================
    // Scenery objects are things the player can examine but NOT pick up.
    // They're part of the environment — signs, furniture, walls, etc.

    // --- The Welcome Sign ---
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

    // SceneryTrait prevents the player from picking this up.
    // Without it, "take sign" would put the sign in the player's inventory!
    // (We'll explore SceneryTrait in more detail in V3.)
    sign.add(new SceneryTrait());


    // --- The Ticket Booth ---
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


    // ========================================================================
    // STEP 3: Place objects in the room
    // ========================================================================
    // Every entity exists "somewhere" in the world. To place an object in
    // a room, we move it there. Without this step, objects would exist
    // in limbo and the player would never see them.

    world.moveEntity(sign.id, entrance.id);    // Put sign in the entrance
    world.moveEntity(booth.id, entrance.id);   // Put booth in the entrance


    // ========================================================================
    // STEP 4: Set the player's starting location
    // ========================================================================
    // The player needs to be IN a room to see anything. We move the player
    // entity into the entrance room so the game starts there.

    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, entrance.id);
    }
  }
}


// ============================================================================
// EXPORTS
// ============================================================================

// The engine looks for a named export called "story" or a default export.
// We provide both so it works no matter how the module is loaded.

export const story = new FamilyZooStory();
export default story;
