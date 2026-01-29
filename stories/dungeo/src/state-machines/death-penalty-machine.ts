/**
 * Death Penalty State Machine
 *
 * From FORTRAN source (subr.f lines 227-230):
 *   CALL SCRUPD(-10)           ! charge 10 points per death
 *   IF(DEATHS.GE.2) GO TO 1000 ! dead twice? kick him off
 *   DEATHS=DEATHS+1            ! record deaths
 *
 * States:
 *   alive     → player has not died yet
 *   one_death → player has died once (-10 pts)
 *   game_over → player has died twice (-10 pts, game ends) [terminal]
 *
 * Replaces: handlers/death-penalty-handler.ts
 */

import { StateMachineDefinition, CustomEffect } from '@sharpee/plugin-state-machine';
import { StandardCapabilities } from '@sharpee/world-model';
import { IDungeoScoringService } from '../scoring';

export const DeathPenaltyMessages = {
  PENALTY: 'dungeo.death.penalty',
  GAME_OVER: 'dungeo.death.game_over',
} as const;

const DEATH_PENALTY_POINTS = 10;

/**
 * Create death penalty state machine.
 *
 * @param scoringService - Scoring service for point deduction (captured in closure)
 */
export function createDeathPenaltyMachine(
  scoringService: IDungeoScoringService
): StateMachineDefinition {
  // Shared effect: deduct points and update death count
  function makeDeathEffects(deathNumber: number): CustomEffect {
    return {
      type: 'custom',
      execute: (world, _bindings, _playerId) => {
        // Deduct points
        scoringService.addPoints(-DEATH_PENALTY_POINTS, 'Death penalty');

        // Update death count in scoring capability
        const scoring = world.getCapability(StandardCapabilities.SCORING);
        if (scoring) {
          scoring.deaths = deathNumber;
        }

        return {};
      },
    } as CustomEffect;
  }

  return {
    id: 'dungeo.death_penalty',
    description: 'Tracks player deaths, deducts 10 pts each, game over after 2',
    initialState: 'alive',

    states: {
      alive: {
        description: 'Player has not died',
        transitions: [{
          target: 'one_death',
          trigger: {
            type: 'event',
            eventId: 'if.event.player.died',
          },
          effects: [
            makeDeathEffects(1),
            { type: 'message', messageId: DeathPenaltyMessages.PENALTY, params: { deaths: 1 } },
          ],
        }],
      },

      one_death: {
        description: 'Player has died once',
        transitions: [{
          target: 'game_over',
          trigger: {
            type: 'event',
            eventId: 'if.event.player.died',
          },
          effects: [
            makeDeathEffects(2),
            { type: 'set_state', key: 'dungeo.game_over', value: true },
            { type: 'set_state', key: 'dungeo.game_over_reason', value: 'too_many_deaths' },
            { type: 'message', messageId: DeathPenaltyMessages.GAME_OVER, params: { deaths: 2 } },
            {
              type: 'emit_event',
              eventType: 'game.over',
              data: {
                messageId: DeathPenaltyMessages.GAME_OVER,
                reason: 'too_many_deaths',
                deaths: 2,
              },
            },
          ],
        }],
      },

      game_over: {
        description: 'Player has died twice — game over',
        terminal: true,
      },
    },
  };
}
