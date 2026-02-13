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

import { Effect, WorldQuery, IGameEvent } from '@sharpee/event-processor';
import { WorldModel, StandardCapabilities } from '@sharpee/world-model';

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
 * Create death penalty handler for event processor
 *
 * @param world - World model (for reading current state)
 */
export function createDeathPenaltyHandler(
  world: WorldModel,
): (event: IGameEvent, query: WorldQuery) => Effect[] {
  return (_event: IGameEvent, _query: WorldQuery): Effect[] => {
    const effects: Effect[] = [];

    // Get current death count from scoring capability
    const scoring = world.getCapability(StandardCapabilities.SCORING);
    const currentDeaths = scoring?.deaths ?? 0;
    const deaths = currentDeaths + 1;

    // Update death count
    if (scoring) {
      scoring.deaths = deaths;
    }

    // Apply -10 point penalty via score ledger
    world.awardScore(`death-penalty-${deaths}`, -DEATH_PENALTY_POINTS, 'Death penalty');

    // Emit score effect for transparency
    effects.push({
      type: 'score',
      points: -DEATH_PENALTY_POINTS,
      reason: 'Death penalty'
    });

    // Check for game over (2+ deaths)
    if (deaths >= MAX_DEATHS) {
      // Set game over state
      effects.push({
        type: 'set_state',
        key: 'dungeo.game_over',
        value: true
      });
      effects.push({
        type: 'set_state',
        key: 'dungeo.game_over_reason',
        value: 'too_many_deaths'
      });

      // Emit game over message
      effects.push({
        type: 'message',
        id: DeathPenaltyMessages.GAME_OVER,
        data: {
          reason: 'too_many_deaths',
          deaths: deaths
        }
      });

      // Emit game over event
      effects.push({
        type: 'emit',
        event: {
          id: `death-game-over-${Date.now()}`,
          type: 'game.over',
          timestamp: Date.now(),
          entities: {},
          data: {
            messageId: DeathPenaltyMessages.GAME_OVER,
            reason: 'too_many_deaths',
            deaths: deaths
          }
        }
      });
    }

    return effects;
  };
}
