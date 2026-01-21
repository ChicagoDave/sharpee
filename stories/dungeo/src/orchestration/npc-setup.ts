/**
 * NPC Setup for Dungeo
 *
 * Registers NPC behaviors with the NPC service (ADR-070).
 * NPCs in Dungeo:
 * - Thief: Roams underground, steals treasures, guards Treasure Room
 * - Cyclops: Guards passage to Strange Passage, responds to "Odysseus"
 * - Troll: Guards passage north, combat encounter
 * - Dungeon Master: Endgame NPC, asks trivia questions
 */

import type { GameEngine } from '@sharpee/engine';
import type { INpcService } from '@sharpee/stdlib';
import type { WorldModel } from '@sharpee/world-model';

// NPC registration functions
import { registerThief } from '../npcs/thief';
import { registerCyclops } from '../npcs/cyclops';
import { registerTrollBehavior } from '../npcs/troll';
import { registerDungeonMaster } from '../npcs/dungeon-master';

// GDT KL command needs engine reference
import { setEngineForKL } from '../actions/gdt/commands';

/**
 * Configuration for NPC registration
 */
export interface NpcConfig {
  /** Surface room IDs - thief is forbidden from these */
  surfaceRoomIds: string[];
  /** Thief's lair (Treasure Room) */
  treasureRoomId: string;
  /** Cyclops Room ID */
  cyclopsRoomId: string;
  /** Dungeon Entrance ID (endgame) */
  dungeonEntranceId: string;
}

/**
 * Register all NPCs with the NPC service
 */
export function registerNpcs(
  engine: GameEngine,
  npcService: INpcService,
  world: WorldModel,
  config: NpcConfig
): void {
  // Thief NPC - roams underground, steals treasures
  // Spawns in Treasure Room (his lair), forbidden from surface
  registerThief(
    npcService,
    world,
    config.treasureRoomId,
    config.surfaceRoomIds
  );

  // Cyclops NPC - guards passage in Cyclops Room
  // Responds to "Odysseus" speech, flees when named
  registerCyclops(
    npcService,
    world,
    config.cyclopsRoomId
  );

  // Troll NPC - entity created in underground.ts
  // Just register the behavior here
  registerTrollBehavior(npcService);

  // Dungeon Master NPC - endgame trivia challenger
  // Spawns in Dungeon Entrance
  registerDungeonMaster(
    npcService,
    world,
    config.dungeonEntranceId
  );

  // Make engine accessible to GDT KL (kill) command
  setEngineForKL(engine);
}
