/**
 * The emission stage: hand the action's events to the configured callback
 * and the engine's emitter.
 *
 * It no longer watches for a `story.victory` among them: the ending is a
 * fact the world owns (ADR-347), declared through `endStory`, so the
 * ending stage reads it from the world rather than from a second copy
 * this stage kept on the turn context. Entity `on` handlers are not
 * dispatched from here (ISSUE-068): story-level handlers run in the
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
    }
    return 'continue';
  }
};
