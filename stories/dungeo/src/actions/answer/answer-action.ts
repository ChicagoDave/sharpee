/**
 * Answer Action - Story-specific action for answering questions
 *
 * Two uses:
 * 1. Riddle Room puzzle - "ANSWER well" to solve the riddle and open east door
 * 2. Dungeon Entrance trivia - "ANSWER X" to answer the Dungeon Master's questions
 *
 * Pattern: "answer <text>"
 *
 * The answer is captured as greedy text and checked against the appropriate system.
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
import { SayMessages } from '../say/types';

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
 * Check if the player is in the Riddle Room
 */
function isInRiddleRoom(context: ActionContext): boolean {
  const identity = context.currentLocation.get(IdentityTrait);
  if (!identity) return false;
  return identity.name?.toLowerCase().includes('riddle room') || false;
}

/**
 * Check if the riddle has already been solved
 */
function isRiddleSolved(context: ActionContext): boolean {
  return (context.currentLocation as any).riddleSolved === true;
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
    // Extract the answer text first
    const answerText = extractAnswer(context);
    context.sharedData.answerText = answerText;

    if (!answerText) {
      return {
        valid: false,
        error: AnswerMessages.NO_ANSWER_GIVEN
      };
    }

    // Check if we're in the Riddle Room (priority over trivia)
    const inRiddleRoom = isInRiddleRoom(context);
    context.sharedData.inRiddleRoom = inRiddleRoom;

    if (inRiddleRoom) {
      // Riddle Room puzzle - always valid if we have an answer
      context.sharedData.riddleAlreadySolved = isRiddleSolved(context);
      return { valid: true };
    }

    // Fall back to Dungeon Master trivia check
    const atDungeonEntrance = isAtDungeonEntrance(context);
    context.sharedData.atDungeonEntrance = atDungeonEntrance;

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
    const answerText = sharedData.answerText as string;

    // Handle Riddle Room puzzle
    if (sharedData.inRiddleRoom) {
      // Already solved?
      if (sharedData.riddleAlreadySolved) {
        sharedData.resultMessage = SayMessages.RIDDLE_ALREADY_SOLVED;
        return;
      }

      // Check the answer - strip quotes and normalize
      let answer = answerText.toLowerCase().trim();
      answer = answer.replace(/^["']|["']$/g, '');

      if (answer === 'well' || answer === 'a well') {
        // Correct! Mark riddle as solved
        (context.currentLocation as any).riddleSolved = true;

        // Open the east exit to the Pearl Room (Broom Closet)
        const roomTrait = context.currentLocation.get(RoomTrait);
        if (roomTrait) {
          // Find the Pearl Room / Broom Closet
          const allEntities = world.getAllEntities();
          const pearlRoom = allEntities.find(e => {
            const ident = e.get(IdentityTrait);
            const name = ident?.name?.toLowerCase() || '';
            return name.includes('pearl') || name.includes('broom closet');
          });

          if (pearlRoom) {
            roomTrait.exits[Direction.EAST] = { destination: pearlRoom.id };
          }
        }

        sharedData.riddleCorrect = true;
        sharedData.resultMessage = SayMessages.RIDDLE_CORRECT;
      } else {
        // Wrong answer
        sharedData.riddleCorrect = false;
        sharedData.resultMessage = SayMessages.RIDDLE_WRONG;
      }
      return;
    }

    // Handle Dungeon Master trivia
    const triviaState = sharedData.triviaState as TriviaState;

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

    // Handle Riddle Room results
    if (sharedData.inRiddleRoom) {
      events.push(context.event('action.success', {
        actionId: ANSWER_ACTION_ID,
        messageId,
      }));
      return events;
    }

    // Handle Trivia results
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
