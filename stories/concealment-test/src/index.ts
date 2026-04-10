/**
 * Concealment Test Story (ADR-148)
 *
 * Minimal story for testing hide/duck/crouch behind/under/on/inside
 * and the revealing action. Not a real game — exists solely for
 * transcript-based integration tests of the concealment system.
 *
 * Rooms:
 *   Study — has curtain (behind), desk (under), and armoire (inside)
 *   Hall — connected north, has no hiding spots
 *
 * Objects:
 *   curtain — ConcealmentTrait: behind, quality good
 *   desk — ConcealmentTrait: under, quality fair
 *   armoire — ConcealmentTrait: inside, quality good
 *   lamp — no ConcealmentTrait (for negative tests)
 */

import { Story, StoryConfig } from '@sharpee/engine';
import type { Parser } from '@sharpee/parser-en-us';
import type { LanguageProvider } from '@sharpee/lang-en-us';
import {
  WorldModel,
  IdentityTrait,
  ActorTrait,
  RoomTrait,
  ContainerTrait,
  SceneryTrait,
  ConcealmentTrait,
  EntityType,
  Direction,
} from '@sharpee/world-model';

export const config: StoryConfig = {
  id: 'concealment-test',
  title: 'Concealment Test',
  author: 'ADR-148 Test Suite',
  version: '1.0.0',
  description: 'Minimal story for testing concealment actions',
};

export class ConcealmentTestStory implements Story {
  config = config;

  createPlayer(world: WorldModel) {
    const player = world.createEntity('yourself', EntityType.ACTOR);
    player.add(new ActorTrait({ isPlayer: true }));
    player.add(new ContainerTrait());
    player.add(new IdentityTrait({
      name: 'yourself',
      description: 'As good-looking as ever.',
    }));
    return player;
  }

  initializeWorld(world: WorldModel): void {
    const player = world.getPlayer()!;

    // Study — main test room with hiding spots
    const study = world.createEntity('study', EntityType.ROOM);
    study.add(new RoomTrait());
    study.add(new IdentityTrait({
      name: 'Study',
      description: 'A quiet study with heavy curtains, a large desk, and a tall armoire.',
    }));

    // Hall — connected room for movement tests
    const hall = world.createEntity('hall', EntityType.ROOM);
    hall.add(new RoomTrait());
    hall.add(new IdentityTrait({
      name: 'Hall',
      description: 'A plain hallway.',
    }));

    // Connect rooms
    const studyRoom = study.get(RoomTrait) as RoomTrait;
    const hallRoom = hall.get(RoomTrait) as RoomTrait;
    studyRoom.exits = { [Direction.NORTH]: { destination: hall.id } };
    hallRoom.exits = { [Direction.SOUTH]: { destination: study.id } };

    // Curtain — hide behind
    const curtain = world.createEntity('curtain', EntityType.SCENERY);
    curtain.add(new IdentityTrait({
      name: 'heavy curtain',
      aliases: ['curtain', 'curtains', 'drapes'],
      description: 'Heavy velvet curtains hang from ceiling to floor.',
    }));
    curtain.add(new SceneryTrait());
    curtain.add(new ConcealmentTrait({ positions: ['behind'], quality: 'good' }));
    world.moveEntity(curtain.id, study.id);

    // Desk — hide under
    const desk = world.createEntity('desk', EntityType.SCENERY);
    desk.add(new IdentityTrait({
      name: 'large desk',
      aliases: ['desk', 'writing desk'],
      description: 'A large wooden desk with space underneath.',
    }));
    desk.add(new SceneryTrait());
    desk.add(new ConcealmentTrait({ positions: ['under'], quality: 'fair' }));
    world.moveEntity(desk.id, study.id);

    // Armoire — hide inside
    const armoire = world.createEntity('armoire', EntityType.SCENERY);
    armoire.add(new IdentityTrait({
      name: 'tall armoire',
      aliases: ['armoire', 'wardrobe', 'cabinet'],
      description: 'A tall wooden armoire with double doors.',
    }));
    armoire.add(new SceneryTrait());
    armoire.add(new ConcealmentTrait({ positions: ['inside'], quality: 'good' }));
    world.moveEntity(armoire.id, study.id);

    // Lamp — no ConcealmentTrait (negative test target)
    const lamp = world.createEntity('lamp', EntityType.ITEM);
    lamp.add(new IdentityTrait({
      name: 'brass lamp',
      aliases: ['lamp'],
      description: 'A plain brass lamp.',
    }));
    world.moveEntity(lamp.id, study.id);

    // Butler — NPC in the study (should not see concealed player)
    const butler = world.createEntity('butler', EntityType.ACTOR);
    butler.add(new ActorTrait());
    butler.add(new IdentityTrait({
      name: 'butler',
      aliases: ['servant', 'manservant'],
      description: 'A stoic butler standing at attention.',
    }));
    world.moveEntity(butler.id, study.id);

    // Maid — NPC in the hall (different room, tests absence vs concealment)
    const maid = world.createEntity('maid', EntityType.ACTOR);
    maid.add(new ActorTrait());
    maid.add(new IdentityTrait({
      name: 'maid',
      aliases: ['servant woman'],
      description: 'A maid dusting the hall furniture.',
    }));
    world.moveEntity(maid.id, hall.id);

    // Place player in study
    world.moveEntity(player.id, study.id);
  }

  extendParser?(parser: Parser): void {}
  extendLanguage?(language: LanguageProvider): void {}
}

export const story = new ConcealmentTestStory();
