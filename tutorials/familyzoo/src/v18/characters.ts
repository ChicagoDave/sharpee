/**
 * Family Zoo — Characters
 *
 * The zookeeper, the parrot, and the pettable animals. Also defines the
 * PettableTrait and NPC behaviors (daytime parrot chatter, after-hours
 * candid dialogue, keeper patrol).
 *
 * Public interface:
 *   createCharacters(world, rooms) → CharacterIds
 *   PARROT_BEHAVIOR / PARROT_AFTER_HOURS_BEHAVIOR — NpcBehavior objects
 *   KEEPER_PATROL_ID — behavior ID for the zookeeper
 *   PettableTrait — custom trait for pettable animals
 *
 * Owner: familyzoo tutorial, v17
 */

import {
  WorldModel,
  ITrait,
} from '@sharpee/world-model';
import {
  NpcTrait,
  SceneryTrait,
} from '@sharpee/world-model';
import '@sharpee/helpers';
import type { NpcBehavior, NpcContext, NpcAction } from '@sharpee/stdlib';
import type { RoomIds } from './zoo-map';


// ============================================================================
// CHARACTER IDS
// ============================================================================

export interface CharacterIds {
  zookeeper: string;
  parrot: string;
  goats: string;
  rabbits: string;
}


// ============================================================================
// PETTABLE TRAIT
// ============================================================================

export type AnimalKind = 'goats' | 'rabbits' | 'parrot' | 'snake';

export class PettableTrait implements ITrait {
  static readonly type = 'zoo.trait.pettable' as const;
  static readonly capabilities = ['zoo.action.petting'] as const;
  readonly type = PettableTrait.type;
  readonly animalKind: AnimalKind;
  constructor(kind: AnimalKind) {
    this.animalKind = kind;
  }
}


// ============================================================================
// PARROT — DAYTIME BEHAVIOR
// ============================================================================

const PARROT_PHRASES = [
  'Polly wants a cracker!',
  'SQUAWK! Pretty bird! Pretty bird!',
  'Pieces of eight! Pieces of eight!',
  'Who\'s a good bird? WHO\'S A GOOD BIRD?',
  'BAWK! Welcome to the zoo!',
];

export const parrotBehavior: NpcBehavior = {
  id: 'zoo-parrot',
  name: 'Parrot Behavior',
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.5)) {
      return [{ type: 'speak', messageId: 'npc.speech', data: { npcName: 'parrot', text: context.random.pick(PARROT_PHRASES) } }];
    }
    return [];
  },
  onPlayerEnters(): NpcAction[] {
    return [{ type: 'emote', messageId: 'npc.emote', data: { npcName: 'parrot', text: 'The parrot ruffles its feathers and eyes you with interest.' } }];
  },
};


// ============================================================================
// PARROT — AFTER-HOURS BEHAVIOR (NEW IN V17)
// ============================================================================
//
// After the zoo closes, the parrot drops the act. Instead of squawking
// stock phrases, it speaks in complete sentences with strong opinions.
// This demonstrates runtime NPC behavior switching — the engine swaps
// one behavior for another mid-game.

const PARROT_AFTER_HOURS_PHRASES = [
  'Finally, they\'re gone. Do you know how exhausting it is to say "Polly wants a cracker" eight hours a day?',
  'Between you and me, the toucan is a complete diva. Won\'t shut up about its bill.',
  'I have a degree in ornithology, you know. Well, I would, if birds could enroll.',
  'The gift shop markup is criminal. Three dollars for a postcard? In this economy?',
  'You seem alright. Most visitors just want selfies. At least you\'re still here.',
];

export const parrotAfterHoursBehavior: NpcBehavior = {
  id: 'zoo-parrot-after-hours',
  name: 'Parrot After-Hours Behavior',
  onTurn(context: NpcContext): NpcAction[] {
    if (!context.playerVisible) return [];
    if (context.random.chance(0.6)) {
      return [{ type: 'speak', messageId: 'npc.speech', data: { npcName: 'parrot', text: context.random.pick(PARROT_AFTER_HOURS_PHRASES) } }];
    }
    return [];
  },
  onPlayerEnters(): NpcAction[] {
    return [{ type: 'emote', messageId: 'npc.emote', data: { npcName: 'parrot', text: 'The parrot glances at you and nods, as if recognizing a fellow after-hours regular.' } }];
  },
};


// ============================================================================
// ZOOKEEPER — patrol behavior ID
// ============================================================================

export const KEEPER_PATROL_ID = 'zoo-keeper-patrol';


// ============================================================================
// CHARACTER CREATION
// ============================================================================

export function createCharacters(world: WorldModel, rooms: RoomIds): CharacterIds {
  const { actor, object } = world.helpers();

  const mainPathEntity = world.getEntity(rooms.mainPath)!;
  const aviaryEntity = world.getEntity(rooms.aviary)!;
  const pettingZooEntity = world.getEntity(rooms.pettingZoo)!;

  // --- Zookeeper (NPC with patrol behavior) ---

  const zookeeper = actor('zookeeper')
    .description('A friendly zookeeper in khaki overalls. A name tag reads "Sam."')
    .aliases('keeper', 'zookeeper', 'sam')
    .addTrait(new NpcTrait({ behaviorId: KEEPER_PATROL_ID, canMove: true, isAlive: true, isConscious: true }))
    .in(mainPathEntity)
    .build();

  // --- Parrot (NPC with swappable behavior) ---

  const parrot = actor('parrot')
    .description('A magnificent scarlet macaw perched on a rope. It tilts its head and watches you with one bright eye.')
    .aliases('parrot', 'macaw', 'scarlet macaw')
    .addTrait(new NpcTrait({ behaviorId: 'zoo-parrot', canMove: false, isAlive: true, isConscious: true }))
    .addTrait(new PettableTrait('parrot'))
    .in(aviaryEntity)
    .build();

  // --- Pettable animals (scenery with PettableTrait) ---

  const goats = object('pygmy goats')
    .description('Three pygmy goats hoping you have food.')
    .aliases('goats', 'pygmy goats', 'goat')
    .scenery()
    .addTrait(new PettableTrait('goats'))
    .in(pettingZooEntity)
    .build();

  const rabbits = object('rabbits')
    .description('A pair of Holland Lop rabbits with floppy ears.')
    .aliases('rabbits', 'rabbit', 'bunnies')
    .scenery()
    .addTrait(new PettableTrait('rabbits'))
    .in(pettingZooEntity)
    .build();

  const parrotsScenery = object('parrots')
    .description('A raucous flock of scarlet macaws and grey African parrots.')
    .aliases('parrots', 'macaws', 'birds')
    .scenery()
    .in(aviaryEntity)
    .build();

  return {
    zookeeper: zookeeper.id,
    parrot: parrot.id,
    goats: goats.id,
    rabbits: rabbits.id,
  };
}
