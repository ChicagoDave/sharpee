/**
 * The opening-look stage: run the looking action as the player and take
 * its result as the opening's.
 *
 * The action is entered by its id, through the executor's entry for an
 * already-resolved command, so the opening does not depend on the text
 * `look` parsing to the looking action in the story's grammar or language.
 * From there it is the one four-phase path a typed `look` takes: the
 * pre-action hook, capability dispatch, validate, execute, report, and the
 * entity handlers' reactions. The room is marked visited and a story's
 * clauses on looking fire, as they do for a typed look.
 *
 * The per-turn sound buffer is reset first, as the execute stage resets it.
 *
 * Public interface: `openingLookStage`.
 * Owner context: `@sharpee/engine` — the opening routine.
 *
 * References: ADR-404 decision 9 (what `do-first-look` runs); ADR-328 D1
 * (two entries, one path).
 */

import { IFActions } from '@sharpee/stdlib';
import type { TurnStage } from './context.js';

export const openingLookStage: TurnStage = {
  name: 'opening-look',
  requires: ['opening-plugins'],
  async run(context) {
    const { engine } = context;
    engine.soundBuffer.length = 0;
    context.result = engine.commandExecutor.executeAsActor(
      { actionId: IFActions.LOOKING, actorId: engine.context.player.id },
      engine.world,
      engine.context,
      engine.config,
      engine.soundBuffer
    );
    return 'continue';
  }
};
