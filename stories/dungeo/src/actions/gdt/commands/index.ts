/**
 * GDT Command Registry
 *
 * Maps two-letter command codes to their handlers.
 */

import { GDTCommandHandler, GDTCommandCode, GDTContext, GDTCommandResult } from '../types';
// Phase 1 handlers
import { helpHandler } from './help';
import { exitHandler } from './exit';
// Phase 2 - Display handlers
import { daHandler } from './da';
import { drHandler } from './dr';
import { doHandler } from './do';
import { deHandler } from './de';
import { dsHandler } from './ds';
import { dxHandler } from './dx';
// Phase 2 - Alter handlers
import { ahHandler } from './ah';
import { tkHandler } from './tk';
import { aoHandler } from './ao';
// Phase 3 - Display/Alter Flags
import { dfHandler } from './df';
import { afHandler } from './af';
// Phase 2 - Toggle handlers
import { ndHandler } from './nd';
import { rdHandler } from './rd';
import { nrHandler } from './nr';
import { rrHandler } from './rr';
// Phase 4 - Scheduler debug
import { dcHandler, setSchedulerForGDT, SCHEDULER_GDT_KEY } from './dc';
// Phase 5 - Puzzle debug
import { pzHandler } from './pz';
// Phase 6 - Trivia debug
import { tqHandler } from './tq';
// Phase 7 - Dial debug
import { dlHandler } from './dl';
// Phase 8 - Kill command
import { klHandler, setEngineForKL } from './kl';
// Phase 9 - Knock out / Wake up commands
import { koHandler } from './ko';
import { wuHandler } from './wu';

/**
 * Registry of all GDT command handlers
 */
const handlers = new Map<GDTCommandCode, GDTCommandHandler>();

// Register Phase 1 handlers
handlers.set('HE', helpHandler);
handlers.set('EX', exitHandler);

// Register Phase 2 - Display handlers
handlers.set('DA', daHandler);
handlers.set('DR', drHandler);
handlers.set('DO', doHandler);
handlers.set('DE', deHandler);
handlers.set('DS', dsHandler);
handlers.set('DX', dxHandler);

// Register Phase 2 - Alter handlers
handlers.set('AH', ahHandler);
handlers.set('TK', tkHandler);
handlers.set('AO', aoHandler);

// Register Phase 3 - Display/Alter Flags
handlers.set('DF', dfHandler);
handlers.set('AF', afHandler);

// Register Phase 2 - Toggle handlers
handlers.set('ND', ndHandler);
handlers.set('RD', rdHandler);
handlers.set('NR', nrHandler);
handlers.set('RR', rrHandler);

// Register Phase 4 - Scheduler debug
handlers.set('DC', dcHandler);

// Register Phase 5 - Puzzle debug
handlers.set('PZ', pzHandler);

// Register Phase 6 - Trivia debug
handlers.set('TQ', tqHandler);

// Register Phase 7 - Dial debug
handlers.set('DL', dlHandler);

// Register Phase 8 - Kill command
handlers.set('KL', klHandler);

// Register Phase 9 - Knock out / Wake up commands
handlers.set('KO', koHandler);
handlers.set('WU', wuHandler);

/**
 * Get a command handler by code
 */
export function getHandler(code: GDTCommandCode): GDTCommandHandler | undefined {
  return handlers.get(code);
}

/**
 * Check if a command is implemented
 */
export function isImplemented(code: GDTCommandCode): boolean {
  return handlers.has(code);
}

/**
 * Execute a GDT command
 */
export function executeCommand(
  code: GDTCommandCode,
  context: GDTContext,
  args: string[]
): GDTCommandResult {
  const handler = handlers.get(code);

  if (!handler) {
    return {
      success: false,
      output: [`Command ${code} not yet implemented.`],
      error: 'NOT_IMPLEMENTED'
    };
  }

  return handler.execute(context, args);
}

/**
 * Get all registered handlers
 */
export function getAllHandlers(): GDTCommandHandler[] {
  return Array.from(handlers.values());
}

/**
 * Register a new command handler
 */
export function registerHandler(handler: GDTCommandHandler): void {
  handlers.set(handler.code, handler);
}

// Re-export handlers
export { helpHandler } from './help';
export { exitHandler } from './exit';
export { daHandler } from './da';
export { drHandler } from './dr';
export { doHandler } from './do';
export { deHandler } from './de';
export { dsHandler } from './ds';
export { dxHandler } from './dx';
export { ahHandler } from './ah';
export { tkHandler } from './tk';
export { aoHandler } from './ao';
export { dfHandler } from './df';
export { afHandler } from './af';
export { ndHandler } from './nd';
export { rdHandler } from './rd';
export { nrHandler } from './nr';
export { rrHandler } from './rr';
export { dcHandler, setSchedulerForGDT, SCHEDULER_GDT_KEY } from './dc';
export { pzHandler } from './pz';
export { tqHandler } from './tq';
export { dlHandler } from './dl';
export { klHandler, setEngineForKL } from './kl';
export { koHandler } from './ko';
export { wuHandler } from './wu';
