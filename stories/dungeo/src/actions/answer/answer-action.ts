/**
 * Answer Action - Story-specific action for answering trivia questions
 *
 * Used at the Dungeon Entrance to answer the Dungeon Master's trivia.
 *
 * Pattern: "answer <text>", "say <text>" (when trivia is active)
 *
 * The answer is captured as greedy text and checked against the trivia system.
 */

import { Action, ActionContext, ValidationResult } from '@sharpee/stdlib';
import { ISemanticEvent } from '@sharpee/core';
import { IdentityTrait, NpcTrait, RoomTrait, Direction } from '@sharpee/world-model';
import { ANSWER_ACTION_ID, AnswerMessages } from './types';
import {
  processAnswer,
  getCurrentQuestionMessageId,
  TriviaState
} from '../../npcs/dungeon-master/dungeon-master-trivia';
import { DungeonMasterMessages } from '../../npcs/dungeon-master/dungeon-master-messages';
import {
  getDungeonMaster,
  setDungeonMasterState,
  DungeonMasterCustomProperties
} from '../../npcs/dungeon-master/dungeon-master-entity';

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
 * Find a room by name
 */
function findRoomByName(context: ActionContext, name: string): string | null {
  const { world } = context;
  for (const entity of world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === name) {
      return entity.id;
    }
  }
  return null;
}

/**
 * Open the door by adding N exit from Dungeon Entrance to Narrow Corridor
 */
function openDungeonDoor(context: ActionContext): void {
  const { world, player } = context;

  // Get the Dungeon Entrance room (player should be there)
  const playerLocation = world.getLocation(player.id);
  if (!playerLocation) return;

  const dungeonEntrance = world.getEntity(playerLocation);
  if (!dungeonEntrance) return;

  // Find Narrow Corridor
  const narrowCorridorId = findRoomByName(context, 'Narrow Corridor');
  if (!narrowCorridorId) return;

  // Add N exit to Dungeon Entrance
  const roomTrait = dungeonEntrance.get(RoomTrait);
  if (roomTrait) {
    roomTrait.exits[Direction.NORTH] = { destination: narrowCorridorId };
  }
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
 * Extract the answer text from the command
 * Handles both "answer <text>" and textSlots from parser
 */
function extractAnswer(context: ActionContext): string {
  const { command } = context;

  // Check for textSlots via parsed (ADR-080 text capture)
  const textSlots = command.parsed?.textSlots;
  if (textSlots && textSlots.size > 0) {
    // Get the 'text' slot (matches :text... pattern)
    const answerText = textSlots.get('text');
    if (answerText) {
      return answerText;
    }
    // Get first value if named differently
    for (const value of textSlots.values()) {
      return value;
    }
  }

  // Fallback: extract from raw input if available
  const rawInput = (command as any).rawInput || '';
  const match = rawInput.match(/^answer\s+(.+)$/i);
  if (match) {
    return match[1].trim();
  }

  return '';
}

/**
 * Answer Action Definition
 */
export const answerAction: Action = {
  id: ANSWER_ACTION_ID,
  group: 'communication',

  validate(context: ActionContext): ValidationResult {
    const atDungeonEntrance = isAtDungeonEntrance(context);
    context.sharedData.atDungeonEntrance = atDungeonEntrance;

    // Extract the answer text
    const answerText = extractAnswer(context);
    context.sharedData.answerText = answerText;

    if (!answerText) {
      return {
        valid: false,
        error: AnswerMessages.NO_ANSWER_GIVEN
      };
    }

    // Get trivia state
    const triviaState = getTriviaState(context);
    context.sharedData.triviaState = triviaState;

    // Check if trivia is active
    if (triviaState.currentQuestion === -1) {
      return {
        valid: false,
        error: AnswerMessages.TRIVIA_NOT_STARTED
      };
    }

    if (triviaState.isComplete) {
      if (triviaState.passed) {
        return {
          valid: false,
          error: AnswerMessages.TRIVIA_ALREADY_PASSED
        };
      } else {
        return {
          valid: false,
          error: AnswerMessages.TRIVIA_ALREADY_FAILED
        };
      }
    }

    return { valid: true };
  },

  execute(context: ActionContext): void {
    const { sharedData, world } = context;

    const triviaState = sharedData.triviaState as TriviaState;
    const answerText = sharedData.answerText as string;

    // Process the answer
    const result = processAnswer(triviaState, answerText);

    // Save updated trivia state
    setTriviaState(context, result.state);
    sharedData.newTriviaState = result.state;
    sharedData.isCorrect = result.isCorrect;
    sharedData.resultMessage = result.message;

    // If passed, open the door and set DM to follow
    if (result.state.passed) {
      world.setStateValue('dungeonMaster.doorOpen', true);
      setDungeonMasterState(world, 'FOLLOWING');

      // Actually open the door by adding the N exit
      openDungeonDoor(context);

      // Update DM's custom properties
      const dm = getDungeonMaster(world);
      if (dm) {
        const npcTrait = dm.get(NpcTrait);
        if (npcTrait?.customProperties) {
          const props = npcTrait.customProperties as unknown as DungeonMasterCustomProperties;
          props.triviaPassed = true;
          props.doorOpen = true;
          props.state = 'FOLLOWING';
        }
      }
    }

    // If not complete, get next question
    if (!result.state.isComplete) {
      sharedData.nextQuestionMessageId = getCurrentQuestionMessageId(result.state);
    }
  },

  blocked(context: ActionContext, result: ValidationResult): ISemanticEvent[] {
    const events: ISemanticEvent[] = [];

    events.push(context.event('game.message', {
      messageId: result.error || AnswerMessages.NO_QUESTION
    }));

    return events;
  },

  report(context: ActionContext): ISemanticEvent[] {
    const { sharedData } = context;
    const events: ISemanticEvent[] = [];

    const messageId = sharedData.resultMessage as string;

    // Result message (correct/wrong/passed/failed)
    events.push(context.event('game.message', {
      messageId,
      isCorrect: sharedData.isCorrect,
      questionsAnswered: (sharedData.newTriviaState as TriviaState)?.questionsAnswered,
      wrongAttempts: (sharedData.newTriviaState as TriviaState)?.wrongAttempts
    }));

    // If passed, show door opening message
    if ((sharedData.newTriviaState as TriviaState)?.passed) {
      events.push(context.event('game.message', {
        messageId: DungeonMasterMessages.DOOR_OPENS
      }));
    }

    // If still in progress, show next question
    if (sharedData.nextQuestionMessageId) {
      events.push(context.event('game.message', {
        messageId: sharedData.nextQuestionMessageId
      }));
    }

    return events;
  }
};
