/**
 * The input-validation stage: a null or undefined input (a JavaScript
 * caller's) ends the turn with a failed result instead of a throw.
 *
 * Public interface: `validateInputStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { TurnStage } from './context.js';

export const validateInputStage: TurnStage = {
  name: 'validate-input',
  requires: ['exchange-offer'],
  async run(context) {
    const { input, turn } = context;
    if (input === null || input === undefined) {
      const errorEvent: ISemanticEvent = {
        id: `cmd_failed_${turn}_${Date.now()}`,
        type: 'command.failed',
        timestamp: Date.now(),
        entities: {},
        data: {
          reason: 'Input cannot be null or undefined',
          input: input
        }
      };
      context.result = {
        turn,
        input: input,
        success: false,
        events: [errorEvent],
        error: 'Input cannot be null or undefined'
      };
      return 'stop';
    }
    return 'continue';
  }
};
