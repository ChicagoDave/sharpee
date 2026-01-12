/**
 * Death Penalty Handler
 *
 * From FORTRAN source (subr.f lines 227-230):
 *   CALL SCRUPD(-10)           ! charge 10 points per death
 *   IF(DEATHS.GE.2) GO TO 1000 ! dead twice? kick him off
 *   DEATHS=DEATHS+1            ! record deaths
 *
 * Listens for 'game.player_death' events and:
 * 1. Tracks death count in scoring capability
 * 2. Deducts 10 points per death
 * 3. Triggers game over after 2 deaths
 */

import { ISemanticEvent } from '@sharpee/core';
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';
import { IDungeoScoringService } from '../scoring';

// Death penalty constants from FORTRAN source
const DEATH_PENALTY_POINTS = 10;
const MAX_DEATHS = 2;

// Message IDs
export const DeathPenaltyMessages = {
  PENALTY: 'dungeo.death.penalty',
  GAME_OVER: 'dungeo.death.game_over',
  DEATH_COUNT: 'dungeo.death.count'
} as const;

/**
 * Get current death count from scoring capability
 */
function getDeathCount(world: WorldModel): number {
  const scoring = world.getCapability(StandardCapabilities.SCORING);
  return scoring?.deaths ?? 0;
}

/**
 * Set death count in scoring capability
 */
function setDeathCount(world: WorldModel, count: number): void {
  const scoring = world.getCapability(StandardCapabilities.SCORING);
  if (scoring) {
    scoring.deaths = count;
  }
}

/**
 * Create death penalty handler for event processor
 *
 * @param world - World model
 * @param scoringService - Dungeo scoring service for point deduction
 */
export function createDeathPenaltyHandler(
  world: WorldModel,
  scoringService: IDungeoScoringService
): (event: ISemanticEvent) => ISemanticEvent[] {
  return (event: ISemanticEvent): ISemanticEvent[] => {
    const events: ISemanticEvent[] = [];

    // Get current death count and increment
    const deaths = getDeathCount(world) + 1;
    setDeathCount(world, deaths);

    // Apply -10 point penalty
    scoringService.addPoints(-DEATH_PENALTY_POINTS, 'Death penalty');

    // Check for game over (2+ deaths)
    if (deaths >= MAX_DEATHS) {
      // Set game over state
      world.setStateValue('dungeo.game_over', true);
      world.setStateValue('dungeo.game_over_reason', 'too_many_deaths');

      // Emit game over event
      events.push({
        id: `death-game-over-${Date.now()}`,
        type: 'game.over',
        timestamp: Date.now(),
        data: {
          messageId: DeathPenaltyMessages.GAME_OVER,
          reason: 'too_many_deaths',
          deaths: deaths
        }
      });
    }

    return events;
  };
}
