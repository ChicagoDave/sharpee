/**
 * The undo-snapshot stage: snapshot the world before the turn changes it.
 *
 * Meta and info commands that should not create undo points are skipped,
 * as the meta-command registry decides.
 *
 * Public interface: `undoSnapshotStage`.
 * Owner context: `@sharpee/engine` — the turn cycle.
 */

import { MetaCommandRegistry } from '@sharpee/stdlib';
import type { TurnStage } from './context.js';

export const undoSnapshotStage: TurnStage = {
  name: 'undo-snapshot',
  requires: ['exchange-offer'],
  async run(context) {
    if (!MetaCommandRegistry.isNonUndoable(context.input)) {
      context.engine.createUndoSnapshot();
    }
    return 'continue';
  }
};
