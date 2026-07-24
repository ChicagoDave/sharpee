/**
 * The hunger meter — ADR-262 consumer #2 (ADR-263 D1).
 *
 * A depleting satiety meter: a `severity` counter rises each turn (a decay
 * daemon, lowered by the loader from `grows N each turn`), crosses announce
 * bands via the shared ADR-262 crossing engine, and kills the player at `fatal`.
 * Eating recovers it, reusing stdlib's `if.event.eaten` + its `nutrition`.
 *
 * Severity lives in world state (`hunger.severity`), so it is saved and restored
 * with the world (ADR-263 D1 / acceptance 4a). It is derived-not-stored only for
 * the *band* (the engine recomputes that every turn); the scalar itself is
 * genuine game state.
 *
 * This module owns the world-side pieces that need no story config — the
 * severity accessors, the eating handler, and the ADR-262 data watcher. The
 * config-dependent parts (the decay/death daemon and the Chord narrator) are
 * lowered by the story-loader from `ir.hunger`, where `grows`/`fatal`/phrases
 * and `killPlayer` are in reach.
 */

import { IFEvents } from '@sharpee/if-domain';
import { createBandDataWatcher, type BandRung, type TurnPlugin } from '@sharpee/plugins';
import type { IWorldModel, WorldModel } from '@sharpee/world-model';

/** World-state key for the satiety severity counter (save-persisted). */
export const HUNGER_SEVERITY_KEY = 'hunger.severity';

/** The hunger crossing-watcher plugin id. */
export const HUNGER_WATCHER_ID = 'sharpee.ext.hunger.crossing-watcher';

/** The event id the eating action emits (a literal, not `IFEvents.EATEN`). */
const EATEN_EVENT = 'if.event.eaten';

/** Read the current satiety severity (0 when unset — the player starts sated). */
export function getHungerSeverity(world: Pick<IWorldModel, 'getStateValue'>): number {
  const value = world.getStateValue(HUNGER_SEVERITY_KEY);
  return typeof value === 'number' ? value : 0;
}

/** Set the severity, clamped at zero (you cannot be more than fully sated). */
export function setHungerSeverity(world: Pick<IWorldModel, 'setStateValue'>, value: number): void {
  world.setStateValue(HUNGER_SEVERITY_KEY, Math.max(0, value));
}

/**
 * Enable hunger on a world (ADR-263 D4 `registerWorld`): install the eating
 * handler. Recovery reuses stdlib's eating action — eating lowers severity by
 * the food's `nutrition` (ADR-263 D1). The eating action always emits nutrition
 * now (ADR-263 O-2 resolution), so ordinary food nourishes; a food with no
 * nutrition at all counts as zero.
 */
export function registerHunger(world: IWorldModel): void {
  world.registerEventHandler(EATEN_EVENT, (event, w) => {
    const nutrition = (event.data as { nutrition?: number } | undefined)?.nutrition ?? 0;
    if (nutrition <= 0) return;
    setHungerSeverity(w, getHungerSeverity(w) - nutrition);
  });
}

/**
 * The ADR-262 data watcher over the severity scalar (ADR-263 consumer #2): emits
 * `if.event.band_crossed` on a rise through the hunger bands. Severity starts at
 * 0, below every band, so no baseline seed is needed (unlike scoring's rung-at-0).
 */
export function createHungerCrossingWatcher(rungs: BandRung[]): TurnPlugin {
  return createBandDataWatcher(
    {
      id: HUNGER_WATCHER_ID,
      priority: 25,
      concept: 'hunger',
      value: (world: WorldModel) => getHungerSeverity(world),
      bands: () => rungs,
    },
    IFEvents.BAND_CROSSED,
  );
}
