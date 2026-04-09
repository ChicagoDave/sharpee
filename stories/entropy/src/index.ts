/**
 * Entropy - An Interactive Fiction Endeavor in Time and Space
 *
 * A Hyperion-inspired sci-fi game. Chrysilya, a damaged android,
 * is the sole survivor of a planetary holocaust. She must find a device
 * that can reverse entropy in a localized area before the window closes.
 *
 * Ported from Inform 6 prototype (2009) by David A. Cornelson.
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
  SceneryTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

// Regions
import { createBattlefieldRegion, connectBattlefieldRooms } from './regions/battlefield';
import { createUndergroundRegion, connectUndergroundRooms } from './regions/underground';
import { createSpaceportRegion, connectSpaceportRooms } from './regions/spaceport';
import { createOrbitRegion, connectOrbitRooms } from './regions/orbit';

/**
 * Story configuration
 */
export const config: StoryConfig = {
  id: 'entropy',
  title: 'Entropy',
  author: 'David A. Cornelson',
  version: '0.1.0-alpha',
  description: 'An Interactive Fiction Endeavor in Time and Space',
};

/**
 * Entropy story implementation
 */
export const story: Story = {
  config,

  createPlayer(world: WorldModel): IFEntity {
    const player = world.createEntity('chrysilya', EntityType.ACTOR);
    player.add(new IdentityTrait({
      name: 'Chrysilya',
      description:
        'Your body is a wreck. Burned face, bent hip, innards exposed '
        + 'on your arms, legs, and abdomen. Your blue mechanical eyes '
        + 'still function, scanning the devastation with clinical precision.',
    }));
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    return player;
  },

  initializeWorld(world: WorldModel): void {
    const player = world.getPlayer()!;
    // Create regions
    const battlefield = createBattlefieldRegion(world);
    const underground = createUndergroundRegion(world);
    const spaceport = createSpaceportRegion(world);
    const orbit = createOrbitRegion(world);

    // Connect regions
    connectBattlefieldRooms(world);
    connectUndergroundRooms(world);
    connectSpaceportRooms(world);
    connectOrbitRooms(world);

    // Place player at starting location
    world.moveEntity(player.id, 'lost-battlefield');

    // TODO: Register daemons (NeedResources, SpaceShip, Memory)
    // TODO: Initialize systems (AEField, FlightSkin, Memory, MainSystems)
    // TODO: Register event handlers
  },

  extendParser(parser: Parser): void {
    // TODO: Custom verbs — diagnose, systems, activate/deactivate skin,
    //       fast time, slow time, attach, detach, board, fly, shoot, dig
  },

  extendLanguage(language: LanguageProvider): void {
    // TODO: Register story-specific messages
  },
};
