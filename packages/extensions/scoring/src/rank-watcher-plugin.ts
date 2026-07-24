/**
 * The scoring rank watcher — consumer #1 of the ADR-262 crossing engine.
 *
 * A promotion is the one genuinely turn-shaped part of scoring. An *award*
 * happens inside an action's execute/report; a *promotion* — crossing a
 * threshold — is an after-the-fact observation, which is what
 * `TurnPlugin.onAfterAction` is for.
 *
 * The rank ladder is a banded scalar over the score (ADR-262 D7), so this is a
 * thin {@link createBandDataWatcher} configuration rather than hand-rolled
 * machinery. It emits the generic `if.event.band_crossed` **data** event
 * carrying the whole crossed span (ADR-262 D2) — so a single accumulation that
 * jumps several rungs reports each elevation, fixing the multi-band collapse the
 * old hand-rolled watcher shipped (ADR-262 D6).
 *
 * Narration is not this plugin's job: a Chord story speaks promotions through
 * the loader's promotion narrator; a TypeScript story reads this event and
 * renders promotions itself (ADR-261 Consequences). The band is derived from
 * the ledger every turn; the only persisted state is the last-announced band
 * id, so a promotion survives save/restore without re-firing. Demotion is
 * silent by design (rise-only, ADR-262 D5).
 */

import { IFEvents } from '@sharpee/if-domain';
import { createBandDataWatcher, type BandRung, type TurnPlugin } from '@sharpee/plugins';
import type { WorldModel } from '@sharpee/world-model';

/** The rank watcher's plugin id — stable across the refactor for save compat. */
export const RANK_WATCHER_ID = 'sharpee.ext.scoring.rank-watcher';

/**
 * Build the scoring rank watcher as an ADR-262 band data-watcher over the score.
 */
export function createRankWatcher(): TurnPlugin {
  return createBandDataWatcher(
    {
      id: RANK_WATCHER_ID,
      // Below the scheduler (50): a promotion observes a turn others produced.
      priority: 25,
      concept: 'rank',
      isEnabled: (world: WorldModel) => world.isScoringEnabled(),
      value: (world: WorldModel) => world.getScore(),
      bands: (world: WorldModel): BandRung[] =>
        world.getRanks().map((r) => ({ id: r.id, threshold: r.threshold, name: r.name })),
      // The bottom rung is where the player starts (scoring ladders have a rung
      // at 0). Seed it silently so it never fires as a promotion no one earned.
      seedAtOrBelow: 0,
    },
    IFEvents.BAND_CROSSED,
  );
}
