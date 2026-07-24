/**
 * RankWatcherPlugin — announces rank promotions (ADR-260 D6).
 *
 * A promotion is the one genuinely turn-shaped part of scoring. An *award*
 * happens inside an action's execute/report; a *promotion* — crossing a
 * threshold — is an after-the-fact observation, which is what
 * `TurnPlugin.onAfterAction` is for.
 *
 * The current rank is never stored: it is derived from the ledger on every
 * call. The only state this plugin keeps is the id of the rank it last
 * announced, so a promotion survives save/restore without re-firing.
 *
 * Demotion is silent by design — a revoke that drops the player below a
 * threshold changes `getRank()`'s answer but emits nothing. Announcing
 * demotions is a story concern.
 */

import { createEvent, type ISemanticEvent } from '@sharpee/core';
import { IFEvents } from '@sharpee/if-domain';
import type { TurnPlugin, TurnPluginContext } from '@sharpee/plugins';

/** Serialized state: the last rank id this plugin announced. */
export interface RankWatcherState {
  lastAnnouncedRankId: string | null;
}

/** Payload of `if.event.rank_risen` — rank **ids**, never display names. */
export interface RankRisenData {
  fromRank: string | null;
  toRank: string;
  score: number;
}

export class RankWatcherPlugin implements TurnPlugin {
  id = 'sharpee.ext.scoring.rank-watcher';
  /** Below the scheduler (50): a promotion observes a turn others produced. */
  priority = 25;

  private lastAnnouncedRankId: string | null = null;

  onAfterAction(ctx: TurnPluginContext): ISemanticEvent[] {
    if (!ctx.world.isScoringEnabled()) return [];

    const current = ctx.world.getRank();
    if (!current) return [];

    const score = ctx.world.getScore();

    // At zero points nothing has been crossed. With absolute thresholds the
    // bottom rung is where the player *starts*, so announcing it would report
    // a promotion no one earned. Seed the baseline silently instead.
    if (score <= 0) {
      this.lastAnnouncedRankId = current.id;
      return [];
    }

    // Only a RISE announces. Comparing ids alone would also fire on a
    // demotion, so compare positions on the ladder.
    const ranks = ctx.world.getRanks();
    const currentIndex = ranks.findIndex(r => r.id === current.id);
    const lastIndex = this.lastAnnouncedRankId === null
      ? -1
      : ranks.findIndex(r => r.id === this.lastAnnouncedRankId);

    if (currentIndex <= lastIndex) {
      // Same band, or a demotion. Track the fall so re-crossing announces
      // again, but say nothing now.
      this.lastAnnouncedRankId = current.id;
      return [];
    }

    const fromRank = this.lastAnnouncedRankId;
    this.lastAnnouncedRankId = current.id;

    const data: RankRisenData = {
      fromRank,
      toRank: current.id,
      score,
    };
    return [createEvent(IFEvents.RANK_RISEN, data as unknown as Record<string, unknown>)];
  }

  getState(): unknown {
    const state: RankWatcherState = { lastAnnouncedRankId: this.lastAnnouncedRankId };
    return state;
  }

  setState(state: unknown): void {
    const restored = state as RankWatcherState | undefined;
    this.lastAnnouncedRankId = restored?.lastAnnouncedRankId ?? null;
  }
}
