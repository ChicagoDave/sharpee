/**
 * Endgame Scoring Handler
 *
 * Awards endgame milestone points when the player enters key rooms
 * for the first time during the endgame. Points are written to
 * `scoring.endgameScore` (separate from main game scoring).
 *
 * Milestones (from FORTRAN clockr.for / nrooms.for):
 *   Enter Inside Mirror:      15 pts (total: 30)
 *   Exit to Dungeon Entrance: 15 pts (total: 45)
 *   Enter Narrow Corridor:    20 pts (total: 65)
 *   Enter Treasury:           35 pts (total: 100) — handled by victory-machine.ts
 *
 * The initial 15 pts are awarded by endgame-trigger-handler.ts on entry.
 */

import { ISemanticEvent } from '@sharpee/core';
import type { EventProcessor } from '@sharpee/event-processor';
import type { WorldModel } from '@sharpee/world-model';

const ENDGAME_SCORE_KEY = 'scoring.endgameScore';
const ENDGAME_STARTED_KEY = 'game.endgameStarted';

export interface EndgameScoringConfig {
  insideMirrorId: string;
  dungeonEntranceId: string;
  narrowCorridorId: string;
}

interface MilestoneRoom {
  roomId: string;
  points: number;
  stateFlag: string;
}

export function registerEndgameScoringHandler(
  eventProcessor: EventProcessor,
  world: WorldModel,
  config: EndgameScoringConfig,
): void {
  const milestones: MilestoneRoom[] = [
    { roomId: config.insideMirrorId, points: 15, stateFlag: 'endgame.scored.insideMirror' },
    { roomId: config.dungeonEntranceId, points: 15, stateFlag: 'endgame.scored.dungeonEntrance' },
    { roomId: config.narrowCorridorId, points: 20, stateFlag: 'endgame.scored.narrowCorridor' },
  ];

  eventProcessor.registerHandler('if.event.actor_moved', (event: ISemanticEvent) => {
    // Only score during endgame
    if (!world.getStateValue(ENDGAME_STARTED_KEY)) return [];

    const data = event.data as { actor?: { id: string }; toRoom?: string } | undefined;
    if (!data?.toRoom) return [];

    // Only score player visits, not NPC movement
    const player = world.getPlayer();
    if (!player || data.actor?.id !== player.id) return [];

    for (const milestone of milestones) {
      if (data.toRoom === milestone.roomId && !world.getStateValue(milestone.stateFlag)) {
        // Award points
        const current = (world.getStateValue(ENDGAME_SCORE_KEY) as number) || 0;
        world.setStateValue(ENDGAME_SCORE_KEY, current + milestone.points);
        world.setStateValue(milestone.stateFlag, true);
        break;
      }
    }

    return [];
  });
}
