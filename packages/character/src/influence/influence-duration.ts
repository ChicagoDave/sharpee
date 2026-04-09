/**
 * Influence duration tracking (ADR-146 layer 3)
 *
 * Tracks active influence effects and manages their expiration:
 * 'while present' clears when influencer leaves room,
 * 'momentary' clears after one turn,
 * 'lingering' clears after authored turns or when a condition is met.
 *
 * Public interface: InfluenceTracker.
 * Owner context: @sharpee/character / influence
 */

import {
  ActiveInfluenceEffect,
  InfluenceEffect,
  InfluenceDuration,
} from './influence-types';

/**
 * Tracks and manages active influence effects across turns.
 *
 * The tracker maintains a list of currently active effects and
 * provides methods to add, query, and expire them.
 */
export class InfluenceTracker {
  private effects: ActiveInfluenceEffect[] = [];

  /**
   * Record a new active influence effect.
   *
   * @param influenceName - The influence name
   * @param influencerId - The influencer entity ID
   * @param targetId - The target entity ID
   * @param effect - The applied effect mutations
   * @param options - Duration, timing, and clear condition options
   */
  track(
    influenceName: string,
    influencerId: string,
    targetId: string,
    effect: InfluenceEffect,
    options: {
      duration: InfluenceDuration;
      turn: number;
      lingeringTurns?: number;
      clearCondition?: string;
    },
  ): void {
    const { duration, turn, lingeringTurns, clearCondition } = options;
    // Don't double-track the same influence on the same target from the same source
    const existing = this.effects.findIndex(
      e =>
        e.influenceName === influenceName &&
        e.influencerId === influencerId &&
        e.targetId === targetId,
    );
    if (existing >= 0) return;

    this.effects.push({
      influenceName,
      influencerId,
      targetId,
      effect: { ...effect },
      duration,
      appliedAtTurn: turn,
      expiresAtTurn: lingeringTurns != null ? turn + lingeringTurns : undefined,
      clearCondition,
    });
  }

  /**
   * Get all active effects on a specific target.
   *
   * @param targetId - The target entity ID
   * @returns Active effects affecting this target
   */
  getEffectsOn(targetId: string): ActiveInfluenceEffect[] {
    return this.effects.filter(e => e.targetId === targetId);
  }

  /**
   * Get all active effects from a specific influencer.
   *
   * @param influencerId - The influencer entity ID
   * @returns Active effects from this influencer
   */
  getEffectsFrom(influencerId: string): ActiveInfluenceEffect[] {
    return this.effects.filter(e => e.influencerId === influencerId);
  }

  /**
   * Check if a target is under a specific influence.
   *
   * @param targetId - The target entity ID
   * @param influenceName - The influence name
   * @returns true if the target is currently under this influence
   */
  isUnderInfluence(targetId: string, influenceName: string): boolean {
    return this.effects.some(
      e => e.targetId === targetId && e.influenceName === influenceName,
    );
  }

  /**
   * Expire 'while present' effects when the influencer leaves a room.
   *
   * @param influencerId - The influencer who left
   * @param roomEntityIds - Entity IDs still in the room (targets to clear)
   * @returns Effects that were cleared
   */
  expireOnDeparture(influencerId: string, roomEntityIds?: string[]): ActiveInfluenceEffect[] {
    const expired: ActiveInfluenceEffect[] = [];
    this.effects = this.effects.filter(e => {
      if (
        e.influencerId === influencerId &&
        e.duration === 'while present'
      ) {
        expired.push(e);
        return false;
      }
      return true;
    });
    return expired;
  }

  /**
   * Expire 'momentary' effects and check lingering expiration.
   * Call once per turn.
   *
   * @param currentTurn - The current turn number
   * @param evaluatePredicate - Function to evaluate clear conditions (targetId, predicate) => boolean
   * @returns Effects that were cleared
   */
  expireTurn(
    currentTurn: number,
    evaluatePredicate?: (targetId: string, predicate: string) => boolean,
  ): ActiveInfluenceEffect[] {
    const expired: ActiveInfluenceEffect[] = [];

    this.effects = this.effects.filter(e => {
      // Momentary: expires after one turn (applied on turn N, gone on turn N+1)
      if (e.duration === 'momentary' && currentTurn > e.appliedAtTurn) {
        expired.push(e);
        return false;
      }

      // Lingering with turn limit
      if (
        e.duration === 'lingering' &&
        e.expiresAtTurn !== undefined &&
        currentTurn >= e.expiresAtTurn
      ) {
        expired.push(e);
        return false;
      }

      // Lingering with clear condition
      if (
        e.duration === 'lingering' &&
        e.clearCondition &&
        evaluatePredicate?.(e.targetId, e.clearCondition)
      ) {
        expired.push(e);
        return false;
      }

      return true;
    });

    return expired;
  }

  /** Get the count of active effects. */
  get count(): number {
    return this.effects.length;
  }

  /** Export for serialization. */
  toJSON(): ActiveInfluenceEffect[] {
    return this.effects.map(e => ({ ...e, effect: { ...e.effect } }));
  }

  /** Restore from serialized data. */
  static fromJSON(data: ActiveInfluenceEffect[]): InfluenceTracker {
    const tracker = new InfluenceTracker();
    tracker.effects = data.map(e => ({ ...e, effect: { ...e.effect } }));
    return tracker;
  }
}
