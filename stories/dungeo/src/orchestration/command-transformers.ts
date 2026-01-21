/**
 * Command Transformers for Dungeo
 *
 * Registers parsed command transformers that intercept and modify commands
 * before execution. Used for:
 * - GDT raw text parsing
 * - Puzzle-specific command interception
 * - Death conditions (grue, falls)
 * - Movement restrictions (chimney, river, rainbow)
 */

import type { GameEngine } from '@sharpee/engine';
import type { WorldModel, IParsedCommand } from '@sharpee/world-model';

// GDT transformers
import { isGDTActive, GDT_ACTION_ID, GDT_COMMAND_ACTION_ID } from '../actions/gdt';
import { PUSH_PANEL_ACTION_ID } from '../actions/push-panel';

// Puzzle transformers
import { createPuzzleCommandTransformer } from '../handlers/royal-puzzle';
import { createRainbowCommandTransformer } from '../handlers/rainbow-handler';
import { createBalloonExitTransformer } from '../handlers/balloon-handler';
import { createTinyRoomDoorTransformer, createTinyRoomMatTransformer } from '../handlers/tiny-room-handler';

// Movement restriction transformers
import { createRiverEntryTransformer, registerBoatMovementHandler } from '../handlers/river-handler';
import { createChimneyCommandTransformer } from '../handlers/chimney-handler';

// Death transformers
import { createFallsDeathTransformer, registerFallsRoom } from '../handlers/falls-death-handler';
import { createGrueDeathTransformer } from '../handlers/grue-handler';

/**
 * Configuration for command transformer registration
 */
export interface TransformerConfig {
  /** Aragain Falls room ID for falls death transformer */
  aragainFallsId: string;
}

/**
 * Register all parsed command transformers with the engine
 */
export function registerCommandTransformers(
  engine: GameEngine,
  world: WorldModel,
  config: TransformerConfig
): void {
  // ==========================================================================
  // GDT and Special Action Transformers
  // ==========================================================================

  // GDT transformer - clear entity slots for raw text parsing
  // This allows GDT to use raw text arguments without entity resolution
  engine.registerParsedCommandTransformer((parsed: IParsedCommand, w: WorldModel) => {
    // Only transform when GDT mode is active
    if (!isGDTActive(w)) {
      return parsed;
    }

    // Check if this is a GDT command
    if (parsed.action !== GDT_COMMAND_ACTION_ID && parsed.action !== GDT_ACTION_ID) {
      return parsed;
    }

    // Clear entity slots so CommandValidator doesn't try to resolve them
    // GDT will parse rawInput directly in its execute phase
    return {
      ...parsed,
      structure: {
        ...parsed.structure,
        directObject: undefined,
        indirectObject: undefined
      }
    };
  });

  // Push-panel transformer - clear entity slots for panel name parsing
  // The action extracts panel type from rawInput directly
  engine.registerParsedCommandTransformer((parsed: IParsedCommand, _w: WorldModel) => {
    if (parsed.action !== PUSH_PANEL_ACTION_ID) {
      return parsed;
    }

    return {
      ...parsed,
      structure: {
        ...parsed.structure,
        directObject: undefined,
        indirectObject: undefined
      }
    };
  });

  // ==========================================================================
  // Puzzle Transformers
  // ==========================================================================

  // Royal Puzzle movement transformer
  // Intercepts GO commands when player is inside the puzzle grid
  engine.registerParsedCommandTransformer(createPuzzleCommandTransformer());

  // Rainbow blocking transformer
  // Intercepts "go west" at Aragain Falls when rainbow is not solid
  engine.registerParsedCommandTransformer(createRainbowCommandTransformer());

  // Balloon exit transformer
  // Handles exit from balloon at ledge positions vs mid-air
  engine.registerParsedCommandTransformer(createBalloonExitTransformer());

  // Tiny Room door transformer
  // Intercepts "go north" in Tiny Room when door is locked
  engine.registerParsedCommandTransformer(createTinyRoomDoorTransformer());
  engine.registerParsedCommandTransformer(createTinyRoomMatTransformer());

  // ==========================================================================
  // Movement Restriction Transformers
  // ==========================================================================

  // River entry transformer
  // Blocks entry to water rooms without inflated boat
  engine.registerParsedCommandTransformer(createRiverEntryTransformer());

  // Chimney restriction transformer
  // Studio to Kitchen requires lamp + max 1 other item per MDL act1.254
  engine.registerParsedCommandTransformer(createChimneyCommandTransformer());

  // Boat movement handler
  // Moves boat with player when navigating river
  registerBoatMovementHandler(engine, world);

  // ==========================================================================
  // Death Transformers
  // ==========================================================================

  // Falls death transformer
  // Any action except LOOK at Aragain Falls = death
  registerFallsRoom(config.aragainFallsId);
  engine.registerParsedCommandTransformer(createFallsDeathTransformer());

  // Grue death transformer
  // Moving in dark room has 75% death chance per FORTRAN verbs.f
  engine.registerParsedCommandTransformer(createGrueDeathTransformer());
}
