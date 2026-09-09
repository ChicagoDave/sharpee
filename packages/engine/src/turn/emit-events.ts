/**
 * The emission stage: hand the action's events to the configured callback
 * and the engine's emitter, and notice a story victory among them.
 *
 * A `story.victory` is recorded for the ending stage rather than acted
 * on here — the turn is still being processed. Entity `on` handlers are
 * not dispatched from here (ISSUE-068): story-level handlers run in the
 * executor's event processor.
 *
 * Public interface: `emitEventsStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import type { TurnStage } from './context.js';

export const emitEventsStage: TurnStage = {
  name: 'emit-events',
  requires: ['enrich-events'],
  async run(context) {
    const { engine } = context;
    const result = context.result!;

    if (engine.config.onEvent) {
      for (const event of result.events) {
        engine.config.onEvent(event);
      }
    }

    for (const event of result.events) {
      engine.emit('event', event);
      if (event.type === 'story.victory') {
        const data = event.data as { reason?: string; score?: number } | undefined;
        context.victory = {
          reason: data?.reason || 'Story completed',
          score: data?.score || 0
        };
      }
    }
    return 'continue';
  }
};
