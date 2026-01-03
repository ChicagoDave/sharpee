/**
 * Trivia System for Dungeon Master
 *
 * From FORTRAN verbs.for:
 * - 8 questions, randomly selected start
 * - Cycle +3 mod 8 for each correct answer
 * - 3 correct to pass, 5 wrong = failure
 *
 * Question answers extracted from dungeon-messages.txt
 */

import { DungeonMasterMessages } from './dungeon-master-messages';

export interface TriviaQuestion {
  id: number;
  messageId: string;
  answers: string[];  // All acceptable answers (case-insensitive)
}

/**
 * The 8 trivia questions from Mainframe Zork
 */
export const TRIVIA_QUESTIONS: TriviaQuestion[] = [
  {
    // Q0: "What room can be entered but not entered to reach the thief's lair?"
    // Answer from walkthrough: Go through Temple to reach Treasure Room
    id: 0,
    messageId: DungeonMasterMessages.QUESTION_0,
    answers: ['temple']
  },
  {
    // Q1: "Where, besides the temple, can one end up from the altar?"
    id: 1,
    messageId: DungeonMasterMessages.QUESTION_1,
    answers: ['forest', 'the forest', 'clearing']
  },
  {
    // Q2: "What is the minimum zorkmid treasure value in the game?"
    // The two zorkmid treasures (coin 22 + bills 25) = but question asks minimum VALUE
    // Actually the answer is 30003 from FORTRAN - total value of zorkmid items?
    id: 2,
    messageId: DungeonMasterMessages.QUESTION_2,
    answers: ['30003', '30,003']
  },
  {
    // Q3: "What item enables one to determine the function of the cakes?"
    // The bottle/flask lets you read the tiny labels
    id: 3,
    messageId: DungeonMasterMessages.QUESTION_3,
    answers: ['flask', 'bottle', 'glass bottle', 'the flask', 'the bottle']
  },
  {
    // Q4: "What is a useful thing to do with the mirror?"
    id: 4,
    messageId: DungeonMasterMessages.QUESTION_4,
    answers: ['rub', 'fondle', 'caress', 'touch', 'rub it', 'rub mirror']
  },
  {
    // Q5: "What body part offends the spirits?"
    // Skeleton/bones - relating to the bell/book/candle ritual area
    id: 5,
    messageId: DungeonMasterMessages.QUESTION_5,
    answers: ['bones', 'body', 'skeleton', 'skull', 'the skeleton', 'the bones']
  },
  {
    // Q6: "What object is haunted?"
    // The rusty knife (Nasty Knife) from Attic
    id: 6,
    messageId: DungeonMasterMessages.QUESTION_6,
    answers: ['rusty knife', 'nasty knife', 'knife', 'the rusty knife', 'the knife']
  },
  {
    // Q7: "Is 'hello sailor' ever useful?"
    // Famous Zork easter egg - answer is NO/NONE/NOWHERE
    id: 7,
    messageId: DungeonMasterMessages.QUESTION_7,
    answers: ['none', 'no', 'nowhere', 'never', 'nope', 'not at all']
  }
];

/**
 * Trivia state tracked in world state
 */
export interface TriviaState {
  /** Number of correct answers (0-3, need 3 to pass) */
  questionsAnswered: number;
  /** Number of wrong attempts (0-5, 5 = failure) */
  wrongAttempts: number;
  /** Current question ID (0-7, -1 = not started) */
  currentQuestion: number;
  /** Whether trivia has been completed (passed or failed) */
  isComplete: boolean;
  /** Whether player passed the trivia */
  passed: boolean;
}

/**
 * Initialize trivia state
 */
export function initializeTriviaState(): TriviaState {
  return {
    questionsAnswered: 0,
    wrongAttempts: 0,
    currentQuestion: -1,
    isComplete: false,
    passed: false
  };
}

/**
 * Start the trivia - select random first question
 */
export function startTrivia(state: TriviaState): TriviaState {
  // Random starting question (0-7)
  const firstQuestion = Math.floor(Math.random() * 8);
  return {
    ...state,
    currentQuestion: firstQuestion,
    questionsAnswered: 0,
    wrongAttempts: 0,
    isComplete: false,
    passed: false
  };
}

/**
 * Get the next question ID (+3 mod 8)
 */
export function getNextQuestion(currentQuestion: number): number {
  return (currentQuestion + 3) % 8;
}

/**
 * Check if an answer is correct for the current question
 */
export function checkAnswer(questionId: number, answer: string): boolean {
  const question = TRIVIA_QUESTIONS[questionId];
  if (!question) return false;

  const normalizedAnswer = answer.toLowerCase().trim();
  return question.answers.some(a => normalizedAnswer === a.toLowerCase());
}

/**
 * Process an answer and return updated state
 */
export function processAnswer(state: TriviaState, answer: string): {
  state: TriviaState;
  isCorrect: boolean;
  message: string;
} {
  if (state.isComplete) {
    return {
      state,
      isCorrect: false,
      message: state.passed ? DungeonMasterMessages.ALREADY_PASSED : DungeonMasterMessages.TRIVIA_FAILED
    };
  }

  if (state.currentQuestion === -1) {
    return {
      state,
      isCorrect: false,
      message: DungeonMasterMessages.NO_ANSWER_YET
    };
  }

  const isCorrect = checkAnswer(state.currentQuestion, answer);

  if (isCorrect) {
    const newQuestionsAnswered = state.questionsAnswered + 1;

    if (newQuestionsAnswered >= 3) {
      // Passed!
      return {
        state: {
          ...state,
          questionsAnswered: newQuestionsAnswered,
          isComplete: true,
          passed: true
        },
        isCorrect: true,
        message: DungeonMasterMessages.TRIVIA_PASSED
      };
    } else {
      // Correct, next question
      return {
        state: {
          ...state,
          questionsAnswered: newQuestionsAnswered,
          currentQuestion: getNextQuestion(state.currentQuestion)
        },
        isCorrect: true,
        message: DungeonMasterMessages.CORRECT_ANSWER
      };
    }
  } else {
    const newWrongAttempts = state.wrongAttempts + 1;

    if (newWrongAttempts >= 5) {
      // Failed!
      return {
        state: {
          ...state,
          wrongAttempts: newWrongAttempts,
          isComplete: true,
          passed: false
        },
        isCorrect: false,
        message: DungeonMasterMessages.TRIVIA_FAILED
      };
    } else {
      // Wrong, but can try again
      const wrongMessages = [
        DungeonMasterMessages.WRONG_ANSWER_1,
        DungeonMasterMessages.WRONG_ANSWER_2,
        DungeonMasterMessages.WRONG_ANSWER_3,
        DungeonMasterMessages.WRONG_ANSWER_4
      ];
      return {
        state: {
          ...state,
          wrongAttempts: newWrongAttempts
        },
        isCorrect: false,
        message: wrongMessages[newWrongAttempts - 1]
      };
    }
  }
}

/**
 * Get the current question's message ID
 */
export function getCurrentQuestionMessageId(state: TriviaState): string | null {
  if (state.currentQuestion === -1 || state.isComplete) {
    return null;
  }
  return TRIVIA_QUESTIONS[state.currentQuestion]?.messageId || null;
}
