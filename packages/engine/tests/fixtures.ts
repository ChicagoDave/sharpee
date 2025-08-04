/**
 * Test fixtures and utilities
 */

import { Action, ActionContext, ActionResult } from '@sharpee/stdlib';
import { TextChannel, TextOutput } from '@sharpee/if-services';
import { GameEvent } from '../src/types';

/**
 * Create a mock action for testing
 */
export function createMockAction(
  id: string,
  execute: (ctx: ActionContext) => Promise<ActionResult> | ActionResult
): Action {
  return {
    id,
    type: 'story',
    execute
  };
}

/**
 * Mock text channel for testing
 */
export class MockTextChannel implements TextChannel {
  id = 'mock';
  name = 'Mock Channel';
  
  outputs: TextOutput[] = [];
  
  async receive(output: TextOutput): Promise<void> {
    this.outputs.push(output);
  }
  
  getLastOutput(): TextOutput | undefined {
    return this.outputs[this.outputs.length - 1];
  }
  
  getAllOutputs(): TextOutput[] {
    return this.outputs;
  }
  
  clear(): void {
    this.outputs = [];
  }
}

/**
 * Create a test event
 */
export function createTestEvent(
  type: string, 
  data: any = {}, 
  metadata?: Record<string, any>
): GameEvent {
  return {
    type,
    data,
    metadata
  };
}