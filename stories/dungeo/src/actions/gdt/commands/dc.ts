/**
 * GDT Display Clock Command (DC)
 *
 * Shows all active daemons and fuses (timed events).
 * This is the debugging interface for ADR-071 scheduler events.
 *
 * Output format:
 *   === CLOCK EVENTS (ADR-071) ===
 *
 *   DAEMONS (persistent):
 *     [active] dungeo.forest.ambience - "Forest Ambience" (priority: 1)
 *     [paused] dungeo.underground.drip - "Underground Drip" (priority: 1)
 *
 *   FUSES (countdown):
 *     [running] dungeo.lantern.battery - "Lantern Battery" turns: 280 (priority: 10)
 *     [paused]  dungeo.candles.burn - "Candle Burning" turns: 50 (priority: 10)
 */

import { GDTCommandHandler, GDTContext, GDTCommandResult } from '../types';
import { ISchedulerService } from '@sharpee/engine';

// We'll get the scheduler through the world's capability system
const SCHEDULER_CAPABILITY_KEY = 'dungeo.scheduler.ref';

/**
 * Get scheduler from world state (set during story initialization)
 */
function getScheduler(context: GDTContext): ISchedulerService | undefined {
  // The scheduler reference is stored in world capability during onEngineReady
  return context.world.getCapability(SCHEDULER_CAPABILITY_KEY) as ISchedulerService | undefined;
}

export const dcHandler: GDTCommandHandler = {
  code: 'DC',
  name: 'Display Clock',
  description: 'Show active daemons and fuses (timed events)',

  execute(context: GDTContext, args: string[]): GDTCommandResult {
    const output: string[] = [];

    // Header
    output.push('=== CLOCK EVENTS (ADR-071) ===');
    output.push('');

    const scheduler = getScheduler(context);
    if (!scheduler) {
      output.push('ERROR: Scheduler not available');
      output.push('(Scheduler reference not set in world capability)');
      return {
        success: false,
        output,
        error: 'NO_SCHEDULER'
      };
    }

    // Display daemons
    output.push('DAEMONS (persistent):');
    const daemons = scheduler.getActiveDaemons();
    if (daemons.length === 0) {
      output.push('  <no daemons registered>');
    } else {
      for (const daemon of daemons) {
        const status = daemon.isPaused ? 'paused' : 'active';
        const priority = daemon.priority ?? 0;
        output.push(`  [${status}] ${daemon.id} - "${daemon.name}" (priority: ${priority})`);
      }
    }
    output.push('');

    // Display fuses
    output.push('FUSES (countdown):');
    const fuses = scheduler.getActiveFuses();
    if (fuses.length === 0) {
      output.push('  <no fuses active>');
    } else {
      for (const fuse of fuses) {
        const status = fuse.isPaused ? 'paused ' : 'running';
        const priority = fuse.priority ?? 0;
        const repeat = fuse.repeat ? ' [repeating]' : '';
        const entity = fuse.entityId ? ` (entity: ${fuse.entityId})` : '';
        output.push(`  [${status}] ${fuse.id} - "${fuse.name}" turns: ${fuse.turnsRemaining} (priority: ${priority})${repeat}${entity}`);
      }
    }

    // Summary
    output.push('');
    output.push(`Total: ${daemons.length} daemons, ${fuses.length} fuses`);

    // Filter hint
    if (args.length > 0) {
      const filter = args[0].toLowerCase();
      output.push('');
      output.push(`Filter: "${filter}"`);

      // Filter and re-display
      const filteredDaemons = daemons.filter(d =>
        d.id.toLowerCase().includes(filter) ||
        d.name.toLowerCase().includes(filter)
      );
      const filteredFuses = fuses.filter(f =>
        f.id.toLowerCase().includes(filter) ||
        f.name.toLowerCase().includes(filter)
      );

      if (filteredDaemons.length > 0 || filteredFuses.length > 0) {
        output.push(`Matched: ${filteredDaemons.length} daemons, ${filteredFuses.length} fuses`);
      } else {
        output.push('No matches found.');
      }
    }

    return {
      success: true,
      output
    };
  }
};

/**
 * Store scheduler reference in world for GDT access
 * Call this from story.onEngineReady()
 */
export function setSchedulerForGDT(world: any, scheduler: ISchedulerService): void {
  // Store as capability so it persists and is accessible
  if (typeof world.registerCapability === 'function') {
    try {
      world.registerCapability(SCHEDULER_CAPABILITY_KEY, { initialData: scheduler });
    } catch {
      // Capability already registered, update it
      const existing = world.getCapability(SCHEDULER_CAPABILITY_KEY);
      if (existing) {
        // Replace the reference
        Object.assign(existing, scheduler);
      }
    }
  }
}

export const SCHEDULER_GDT_KEY = SCHEDULER_CAPABILITY_KEY;
