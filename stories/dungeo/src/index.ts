/**
 * Dungeo - A Sharpee Implementation of Mainframe Zork
 *
 * "WEST OF HOUSE
 * You are standing in an open field west of a white house, with a boarded front door.
 * There is a small mailbox here."
 */

import { Story, StoryConfig } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import {
  WorldModel,
  IFEntity,
  IdentityTrait,
  ActorTrait,
  ContainerTrait,
  RoomTrait,
  OpenableTrait,
  ReadableTrait,
  SceneryTrait,
  EntityType,
  Direction
} from '@sharpee/world-model';

// Import room and object creators
import { createWhiteHouseRooms, WhiteHouseRoomIds } from './regions/white-house';
import { createHouseInteriorRooms, connectHouseInteriorToExterior, HouseInteriorRoomIds } from './regions/house-interior';
import { createForestRooms, connectForestToExterior, ForestRoomIds } from './regions/forest';
import { createUndergroundRooms, connectUndergroundToHouse, UndergroundRoomIds } from './regions/underground';
import { createWhiteHouseObjects } from './objects/white-house-objects';
import { createHouseInteriorObjects } from './objects/house-interior-objects';
import { createForestObjects } from './objects/forest-objects';
import { createUndergroundObjects } from './objects/underground-objects';

/**
 * Dungeo story configuration
 */
export const config: StoryConfig = {
  id: "dungeo",
  title: "Dungeo",
  author: "Based on Zork by MIT (Sharpee implementation)",
  version: "1.0.0-alpha.1",
  description: "A Sharpee implementation of Mainframe Zork. Welcome to the Great Underground Empire!"
};

/**
 * Dungeo story implementation
 */
export class DungeoStory implements Story {
  config = config;

  private world!: WorldModel;
  private whiteHouseIds: WhiteHouseRoomIds = {} as WhiteHouseRoomIds;
  private houseInteriorIds: HouseInteriorRoomIds = {} as HouseInteriorRoomIds;
  private forestIds: ForestRoomIds = {} as ForestRoomIds;
  private undergroundIds: UndergroundRoomIds = {} as UndergroundRoomIds;

  /**
   * Initialize the world for Dungeo
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;

    // Create all rooms
    this.whiteHouseIds = createWhiteHouseRooms(world);
    this.houseInteriorIds = createHouseInteriorRooms(world);
    this.forestIds = createForestRooms(world);
    this.undergroundIds = createUndergroundRooms(world);

    // Connect regions
    connectHouseInteriorToExterior(world, this.houseInteriorIds, this.whiteHouseIds.behindHouse);
    connectForestToExterior(world, this.forestIds, this.whiteHouseIds.northOfHouse, this.whiteHouseIds.behindHouse);
    connectUndergroundToHouse(world, this.undergroundIds, this.houseInteriorIds.livingRoom);

    // Create all objects and place them in rooms
    createWhiteHouseObjects(world, this.whiteHouseIds);
    createHouseInteriorObjects(world, this.houseInteriorIds, this.undergroundIds.cellar);
    createForestObjects(world, this.forestIds);
    createUndergroundObjects(world, this.undergroundIds);

    // Set initial player location to West of House
    const player = world.getPlayer();
    if (player) {
      world.moveEntity(player.id, this.whiteHouseIds.westOfHouse);
    }
  }

  /**
   * Create the player entity
   */
  createPlayer(world: WorldModel): IFEntity {
    // Check if a player already exists
    const existingPlayer = world.getPlayer();
    if (existingPlayer) {
      // Update the existing player with our traits
      existingPlayer.add(new IdentityTrait({
        name: 'yourself',
        description: 'A brave adventurer, ready to explore the Great Underground Empire.',
        aliases: ['self', 'myself', 'me', 'yourself', 'adventurer'],
        properName: true,
        article: ''
      }));

      if (!existingPlayer.has('actor')) {
        existingPlayer.add(new ActorTrait({
          isPlayer: true
        }));
      }

      if (!existingPlayer.has('container')) {
        existingPlayer.add(new ContainerTrait({
          capacity: {
            maxItems: 15,
            maxWeight: 100
          }
        }));
      }

      return existingPlayer;
    }

    // Create a new player
    const player = world.createEntity('yourself', EntityType.ACTOR);

    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'A brave adventurer, ready to explore the Great Underground Empire.',
      aliases: ['self', 'myself', 'me', 'yourself', 'adventurer'],
      properName: true,
      article: ''
    }));

    player.add(new ActorTrait({
      isPlayer: true
    }));

    player.add(new ContainerTrait({
      capacity: {
        maxItems: 15,
        maxWeight: 100
      }
    }));

    return player;
  }

  /**
   * Extend the parser with custom vocabulary for this story
   */
  extendParser(parser: Parser): void {
    // Zork-specific verbs will be added here as needed
  }

  /**
   * Extend the language provider with custom messages for this story
   */
  extendLanguage(language: LanguageProvider): void {
    // Rug/trapdoor puzzle
    language.addMessage('dungeo.rug.moved.reveal_trapdoor', 'Moving the rug reveals a trapdoor.');
  }

  /**
   * Get custom actions for this story
   */
  getCustomActions(): any[] {
    // Story-specific actions will be added here
    return [];
  }

  /**
   * Story-specific initialization
   */
  initialize(): void {
    // Additional initialization if needed
  }

  /**
   * Check if the story is complete
   */
  isComplete(): boolean {
    // For now, story is never complete (full game completion TBD)
    return false;
  }
}

// Create and export the story instance
export const story = new DungeoStory();

// Default export for convenience
export default story;
