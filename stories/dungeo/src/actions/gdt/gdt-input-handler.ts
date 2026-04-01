/**
 * GDT Input Mode Handler (ADR-137)
 *
 * Handles all input while GDT mode is active. Registered with the engine
 * at story init. Bypasses the standard parser pipeline entirely.
 *
 * @public gdtInputModeHandler
 * @context dungeo story (GDT subsystem)
 */

import type { ISemanticEvent } from '@sharpee/core';
import type { WorldModel } from '@sharpee/world-model';
import type { InputModeHandler } from '@sharpee/engine';
import { GDTEventTypes } from './gdt-events';
import { createGDTContext } from './gdt-context';
import { parseGDTCommand } from './gdt-parser';
import { executeCommand } from './commands';

/**
 * Create a semantic event without ActionContext.
 */
function createEvent(
  type: string,
  data: Record<string, unknown>
): ISemanticEvent {
  return {
    id: `gdt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    type,
    timestamp: Date.now(),
    entities: {},
    data,
  };
}

/**
 * GDT input mode handler.
 *
 * Parses two-letter commands, executes them, and returns semantic events.
 * Does not advance the game clock.
 */
export const gdtInputModeHandler: InputModeHandler = {
  advancesTurn: false,

  handleInput(input: string, world: WorldModel): ISemanticEvent[] {
    const parsed = parseGDTCommand(input);

    if (!parsed) {
      return [createEvent(GDTEventTypes.UNKNOWN_COMMAND, {
        messageId: GDTEventTypes.UNKNOWN_COMMAND,
        params: { message: `Unknown GDT command: ${input}. Type HE for help.` },
      })];
    }

    const context = createGDTContext(world);
    const result = executeCommand(parsed.code, context, parsed.args);

    return [createEvent(GDTEventTypes.OUTPUT, {
      messageId: GDTEventTypes.OUTPUT,
      params: { output: result.output.join('\n') },
    })];
  },
};
