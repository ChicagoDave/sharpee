/**
 * GDT Trivia Question Command (TQ)
 *
 * Debug command for manipulating the Dungeon Master trivia.
 * Usage:
 *   TQ          - Display current trivia state
 *   TQ RESET    - Reset trivia to question 0 (deterministic)
 *   TQ SOLVE    - Auto-solve trivia (pass with 3 correct answers)
 *   TQ Q <n>    - Set current question to n (0-7)
 *   TQ PASS     - Mark trivia as passed and open door
 *   TQ FAIL     - Mark trivia as failed
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { Direction, RoomTrait, IdentityTrait, NpcTrait } from '@sharpee/world-model';
import { TRIVIA_QUESTIONS, TriviaState } from '../../../npcs/dungeon-master/dungeon-master-trivia';
import { setDungeonMasterState, getDungeonMaster, DungeonMasterCustomProperties } from '../../../npcs/dungeon-master/dungeon-master-entity';

function getTriviaState(context: GDTContext): TriviaState {
  const world = context.world;
  return {
    questionsAnswered: (world.getStateValue('trivia.questionsAnswered') as number) ?? 0,
    wrongAttempts: (world.getStateValue('trivia.wrongAttempts') as number) ?? 0,
    currentQuestion: (world.getStateValue('trivia.currentQuestion') as number) ?? -1,
    isComplete: (world.getStateValue('trivia.isComplete') as boolean) ?? false,
    passed: (world.getStateValue('trivia.passed') as boolean) ?? false
  };
}

function setTriviaState(context: GDTContext, state: TriviaState): void {
  const world = context.world;
  world.setStateValue('trivia.questionsAnswered', state.questionsAnswered);
  world.setStateValue('trivia.wrongAttempts', state.wrongAttempts);
  world.setStateValue('trivia.currentQuestion', state.currentQuestion);
  world.setStateValue('trivia.isComplete', state.isComplete);
  world.setStateValue('trivia.passed', state.passed);
}

function displayState(state: TriviaState): string[] {
  const output: string[] = [
    'Trivia State:',
    `  Started: ${state.currentQuestion !== -1}`,
    `  Current Question: ${state.currentQuestion} (${state.currentQuestion >= 0 ? TRIVIA_QUESTIONS[state.currentQuestion]?.answers[0] : 'N/A'})`,
    `  Correct Answers: ${state.questionsAnswered}/3`,
    `  Wrong Attempts: ${state.wrongAttempts}/5`,
    `  Complete: ${state.isComplete}`,
    `  Passed: ${state.passed}`,
    ''
  ];

  if (state.currentQuestion >= 0 && state.currentQuestion < TRIVIA_QUESTIONS.length) {
    const q = TRIVIA_QUESTIONS[state.currentQuestion];
    output.push(`Current Question ${q.id}: "${q.messageId}"`);
    output.push(`  Answers: ${q.answers.join(', ')}`);
  }

  return output;
}

function findRoomByName(context: GDTContext, name: string): string | null {
  for (const entity of context.world.getAllEntities()) {
    const identity = entity.get(IdentityTrait);
    if (identity?.name === name) {
      return entity.id;
    }
  }
  return null;
}

function openDungeonDoor(context: GDTContext): void {
  const dungeonEntranceId = findRoomByName(context, 'Dungeon Entrance');
  const narrowCorridorId = findRoomByName(context, 'Narrow Corridor');

  if (!dungeonEntranceId || !narrowCorridorId) return;

  const dungeonEntrance = context.world.getEntity(dungeonEntranceId);
  if (!dungeonEntrance) return;

  const roomTrait = dungeonEntrance.get(RoomTrait);
  if (roomTrait) {
    roomTrait.exits[Direction.NORTH] = { destination: narrowCorridorId };
  }
}

function markTriviaPassed(context: GDTContext): void {
  const world = context.world;

  // Set world state
  world.setStateValue('dungeonMaster.doorOpen', true);
  setDungeonMasterState(world, 'FOLLOWING');

  // Open the door
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

export const tqHandler: GDTCommandHandler = {
  code: 'TQ',
  name: 'Trivia Questions',
  description: 'Manipulate Dungeon Master trivia for testing',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const state = getTriviaState(context);
    const subcommand = args[0]?.toUpperCase();

    if (!subcommand) {
      // Display state
      return {
        success: true,
        output: displayState(state)
      };
    }

    switch (subcommand) {
      case 'RESET':
        // Reset to question 0 (deterministic start)
        const resetState: TriviaState = {
          questionsAnswered: 0,
          wrongAttempts: 0,
          currentQuestion: 0,  // Start at Q0 for deterministic testing
          isComplete: false,
          passed: false
        };
        setTriviaState(context, resetState);
        return {
          success: true,
          output: ['Trivia reset to question 0.', ...displayState(resetState)]
        };

      case 'SOLVE':
        // Auto-solve: mark as passed with 3 correct answers
        const solvedState: TriviaState = {
          questionsAnswered: 3,
          wrongAttempts: 0,
          currentQuestion: -1,
          isComplete: true,
          passed: true
        };
        setTriviaState(context, solvedState);
        markTriviaPassed(context);
        return {
          success: true,
          output: ['Trivia auto-solved. Door is now open.', ...displayState(solvedState)]
        };

      case 'Q':
      case 'QUESTION':
        const questionNum = parseInt(args[1], 10);
        if (isNaN(questionNum) || questionNum < 0 || questionNum >= 8) {
          return {
            success: false,
            output: ['Invalid question number. Use TQ Q <0-7>'],
            error: 'INVALID_QUESTION'
          };
        }
        const newState: TriviaState = {
          ...state,
          currentQuestion: questionNum,
          isComplete: false,
          passed: false
        };
        setTriviaState(context, newState);
        return {
          success: true,
          output: [`Current question set to ${questionNum}.`, ...displayState(newState)]
        };

      case 'PASS':
        const passedState: TriviaState = {
          questionsAnswered: 3,
          wrongAttempts: state.wrongAttempts,
          currentQuestion: -1,
          isComplete: true,
          passed: true
        };
        setTriviaState(context, passedState);
        markTriviaPassed(context);
        return {
          success: true,
          output: ['Trivia marked as passed. Door is now open.', ...displayState(passedState)]
        };

      case 'FAIL':
        const failedState: TriviaState = {
          questionsAnswered: state.questionsAnswered,
          wrongAttempts: 5,
          currentQuestion: -1,
          isComplete: true,
          passed: false
        };
        setTriviaState(context, failedState);
        return {
          success: true,
          output: ['Trivia marked as failed.', ...displayState(failedState)]
        };

      default:
        return {
          success: false,
          output: [
            'Unknown subcommand. Usage:',
            '  TQ          - Display trivia state',
            '  TQ RESET    - Reset to question 0',
            '  TQ SOLVE    - Auto-solve trivia',
            '  TQ Q <n>    - Set current question (0-7)',
            '  TQ PASS     - Mark as passed',
            '  TQ FAIL     - Mark as failed'
          ],
          error: 'UNKNOWN_SUBCOMMAND'
        };
    }
  }
};
