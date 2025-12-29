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
import { ISemanticEvent } from '@sharpee/core';
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
  Direction,
  StandardCapabilities,
  IWorldModel
} from '@sharpee/world-model';
import { DungeoScoringService } from './scoring';

// Import room and object creators
import { createWhiteHouseRooms, createWhiteHouseObjects, WhiteHouseRoomIds } from './regions/white-house';
import { createHouseInteriorRooms, createHouseInteriorObjects, connectHouseInteriorToExterior, HouseInteriorRoomIds } from './regions/house-interior';
import { createForestRooms, createForestObjects, connectForestToExterior, ForestRoomIds } from './regions/forest';
import { createUndergroundRooms, createUndergroundObjects, connectUndergroundToHouse, UndergroundRoomIds } from './regions/underground';
import { createDamRooms, connectDamToUnderground, createDamObjects, DamRoomIds } from './regions/dam';
import { createCoalMineRooms, connectCoalMineToDam, createCoalMineObjects, CoalMineRoomIds } from './regions/coal-mine';
import { createTempleRooms, connectTempleToDam, createTempleObjects, TempleRoomIds } from './regions/temple';
import { createVolcanoRooms, connectVolcanoToCoalMine, createVolcanoObjects, VolcanoRoomIds } from './regions/volcano';
import { createBankRooms, connectBankToUnderground, createBankObjects, BankRoomIds } from './regions/bank-of-zork';
import { createWellRoomRooms, connectWellRoomToTemple, createWellRoomObjects, WellRoomIds } from './regions/well-room';
import { createFrigidRiverRooms, connectFrigidRiverToDam, createFrigidRiverObjects, FrigidRiverRoomIds } from './regions/frigid-river';

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
  private scoringService!: DungeoScoringService;
  private whiteHouseIds: WhiteHouseRoomIds = {} as WhiteHouseRoomIds;
  private houseInteriorIds: HouseInteriorRoomIds = {} as HouseInteriorRoomIds;
  private forestIds: ForestRoomIds = {} as ForestRoomIds;
  private undergroundIds: UndergroundRoomIds = {} as UndergroundRoomIds;
  private damIds: DamRoomIds = {} as DamRoomIds;
  private coalMineIds: CoalMineRoomIds = {} as CoalMineRoomIds;
  private templeIds: TempleRoomIds = {} as TempleRoomIds;
  private volcanoIds: VolcanoRoomIds = {} as VolcanoRoomIds;
  private bankIds: BankRoomIds = {} as BankRoomIds;
  private wellRoomIds: WellRoomIds = {} as WellRoomIds;
  private frigidRiverIds: FrigidRiverRoomIds = {} as FrigidRiverRoomIds;

  /**
   * Initialize the world for Dungeo
   */
  initializeWorld(world: WorldModel): void {
    this.world = world;

    // Register scoring capability (Zork max score is 616)
    world.registerCapability(StandardCapabilities.SCORING, {
      initialData: {
        scoreValue: 0,
        maxScore: 616,
        moves: 0,
        achievements: [],
        scoredTreasures: []
      }
    });

    // Create scoring service
    this.scoringService = new DungeoScoringService(world);

    // Register trophy case scoring handler
    this.registerTrophyCaseHandler(world);

    // Create all rooms
    this.whiteHouseIds = createWhiteHouseRooms(world);
    this.houseInteriorIds = createHouseInteriorRooms(world);
    this.forestIds = createForestRooms(world);
    this.undergroundIds = createUndergroundRooms(world);
    this.damIds = createDamRooms(world);
    this.coalMineIds = createCoalMineRooms(world);
    this.templeIds = createTempleRooms(world);
    this.volcanoIds = createVolcanoRooms(world);
    this.bankIds = createBankRooms(world);
    this.wellRoomIds = createWellRoomRooms(world);
    this.frigidRiverIds = createFrigidRiverRooms(world);

    // Connect regions
    connectHouseInteriorToExterior(world, this.houseInteriorIds, this.whiteHouseIds.behindHouse);
    connectForestToExterior(world, this.forestIds, this.whiteHouseIds.northOfHouse, this.whiteHouseIds.behindHouse);
    connectUndergroundToHouse(world, this.undergroundIds, this.houseInteriorIds.livingRoom);
    connectDamToUnderground(world, this.damIds, this.undergroundIds.roundRoom);
    connectCoalMineToDam(world, this.coalMineIds, this.damIds.maintenanceRoom);
    connectTempleToDam(world, this.templeIds, this.damIds.reservoirSouth);
    connectVolcanoToCoalMine(world, this.volcanoIds, this.coalMineIds.batRoom);
    connectBankToUnderground(world, this.bankIds, this.undergroundIds.roundRoom);
    connectWellRoomToTemple(world, this.wellRoomIds, this.templeIds.torchRoom);
    connectFrigidRiverToDam(world, this.frigidRiverIds, this.damIds.damBase);

    // Create all objects and place them in rooms
    createWhiteHouseObjects(world, this.whiteHouseIds);
    createHouseInteriorObjects(world, this.houseInteriorIds, this.undergroundIds.cellar);
    createForestObjects(world, this.forestIds);
    createUndergroundObjects(world, this.undergroundIds);
    createDamObjects(world, this.damIds);
    createCoalMineObjects(world, this.coalMineIds);
    createTempleObjects(world, this.templeIds);
    createVolcanoObjects(world, this.volcanoIds);
    createBankObjects(world, this.bankIds);
    createWellRoomObjects(world, this.wellRoomIds);
    createFrigidRiverObjects(world, this.frigidRiverIds);

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

    // Troll combat
    language.addMessage('dungeo.troll.death.passage_clear', 'With the troll dispatched, the passage to the east is now clear.');

    // Trophy case scoring
    language.addMessage('dungeo.treasure.scored', 'Your score just went up by {points} points!');
  }

  /**
   * Register the trophy case event handler for treasure scoring
   *
   * Note: world.registerEventHandler returns void, so we can't emit events.
   * We just update the score directly - players can check with SCORE command.
   */
  private registerTrophyCaseHandler(world: WorldModel): void {
    const TROPHY_CASE_NAME = 'trophy case';
    const scoringService = this.scoringService;

    world.registerEventHandler('if.event.put_in', (event: ISemanticEvent, w): void => {
      const data = event.data as Record<string, any> | undefined;
      const targetId = data?.targetId as string | undefined;
      if (!targetId) return;

      // Check if target is the trophy case
      const targetEntity = w.getEntity(targetId);
      if (!targetEntity) return;

      const identity = targetEntity.get('identity') as { name?: string } | undefined;
      if (identity?.name !== TROPHY_CASE_NAME) return;

      // Get the item being placed
      const itemId = data?.itemId as string | undefined;
      if (!itemId) return;

      const item = w.getEntity(itemId);
      if (!item) return;

      // Check if item is a treasure
      const isTreasure = (item as any).isTreasure;
      if (!isTreasure) return;

      const treasureValue = (item as any).treasureValue || 0;
      const treasureId = (item as any).treasureId || item.id;

      // Score the treasure (prevents double-scoring)
      scoringService.scoreTreasure(treasureId, treasureValue);
    });
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
