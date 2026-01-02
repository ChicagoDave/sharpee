/**
 * Knock Action - Story-specific action for knocking on doors
 *
 * Used at the Dungeon Entrance to start the trivia puzzle.
 * When player knocks on the wooden door, the Dungeon Master appears
 * and begins asking trivia questions.
 *
 * Pattern: "knock", "knock on door", "knock door"
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait } from '@sharpee/world-model';
import { KNOCK_ACTION_ID, KnockMessages } from './types';
import {
  startTrivia,
  getCurrentQuestionMessageId,
  TriviaState,
  initializeTriviaState
} from '../../npcs/dungeon-master/dungeon-master-trivia';
import { DungeonMasterMessages } from '../../npcs/dungeon-master/dungeon-master-messages';

/**
 * Check if the player is at the Dungeon Entrance
 */
function isAtDungeonEntrance(context: ActionContext): boolean {
  const { world, player } = context;
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return false;

  const room = world.getEntity(playerLocation);
  if (!room) return false;

  const identity = room.get(IdentityTrait);
  return identity?.name === 'Dungeon Entrance';
}

/**
 * Get current trivia state from world
 */
function getTriviaState(context: ActionContext): TriviaState {
  const { world } = context;
  return {
    questionsAnswered: (world.getStateValue('trivia.questionsAnswered') as number) ?? 0,
    wrongAttempts: (world.getStateValue('trivia.wrongAttempts') as number) ?? 0,
    currentQuestion: (world.getStateValue('trivia.currentQuestion') as number) ?? -1,
    isComplete: (world.getStateValue('trivia.isComplete') as boolean) ?? false,
    passed: (world.getStateValue('trivia.passed') as boolean) ?? false
  };
}

/**
 * Save trivia state to world
 */
function setTriviaState(context: ActionContext, state: TriviaState): void {
  const { world } = context;
  world.setStateValue('trivia.questionsAnswered', state.questionsAnswered);
  world.setStateValue('trivia.wrongAttempts', state.wrongAttempts);
  world.setStateValue('trivia.currentQuestion', state.currentQuestion);
  world.setStateValue('trivia.isComplete', state.isComplete);
  world.setStateValue('trivia.passed', state.passed);
}

/**
 * Knock Action Definition
 */
export const knockAction: Action = {
  id: KNOCK_ACTION_ID,
  group: 'interaction',

  validate(context: ActionContext): ValidationResult {
    const atDungeonEntrance = isAtDungeonEntrance(context);
    context.sharedData.atDungeonEntrance = atDungeonEntrance;

    if (atDungeonEntrance) {
      const triviaState = getTriviaState(context);
      context.sharedData.triviaState = triviaState;
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { sharedData } = context;

    if (!sharedData.atDungeonEntrance) {
      // Generic knock - nothing special happens
      sharedData.resultMessage = KnockMessages.KNOCK_GENERIC;
      return;
    }

    const triviaState = sharedData.triviaState as TriviaState;

    // Check if trivia already completed
    if (triviaState.isComplete) {
      if (triviaState.passed) {
        sharedData.resultMessage = KnockMessages.TRIVIA_ALREADY_PASSED;
      } else {
        sharedData.resultMessage = KnockMessages.TRIVIA_ALREADY_FAILED;
      }
      return;
    }

    // Check if trivia already started (DM already appeared)
    if (triviaState.currentQuestion !== -1) {
      sharedData.resultMessage = KnockMessages.DM_ALREADY_APPEARED;
      // Still show the current question
      sharedData.questionMessageId = getCurrentQuestionMessageId(triviaState);
      return;
    }

    // Start the trivia! DM appears and asks first question
    const newState = startTrivia(triviaState);
    setTriviaState(context, newState);
    sharedData.newTriviaState = newState;
    sharedData.resultMessage = KnockMessages.DM_APPEARS;
    sharedData.questionMessageId = getCurrentQuestionMessageId(newState);
  },

  blocked(_context: ActionContext, _result: ValidationResult): ISemanticEvent[] {
    // Knock is never blocked
    return [];
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage || KnockMessages.KNOCK_GENERIC;

    // Main knock message
    events.push(context.event('game.message', {
      messageId,
      atDungeonEntrance: sharedData.atDungeonEntrance
    }));

    // If DM appeared or already appeared, also show the question
    if (sharedData.questionMessageId) {
      events.push(context.event('game.message', {
        messageId: sharedData.questionMessageId
      }));
    }

    return events;
  }
};
