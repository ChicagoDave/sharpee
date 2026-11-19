/**
 * StatusLine - handles the status bar display (location, score, turns)
 *
 * Public interface: `StatusLine`, `scoreTurnsText`, `turnsText`.
 * Owner context: @sharpee/platform-browser (browser player client).
 */

import type { StatusElements } from '../types.js';

/**
 * The turn count as a status line shows it. The `turn` channel carries the
 * number of commands that have cost a turn, so it is 0 through the opening;
 * a client shows 0 as no count at all (ADR-404 decision 14).
 *
 * @param turns the `turn` channel's value
 * @returns `Turns: N`, or the empty string when no command has cost a turn
 */
export function turnsText(turns: number): string {
  return turns > 0 ? `Turns: ${turns}` : '';
}

/**
 * The combined score-and-turns text of the host page's one status element.
 *
 * @param score the current score
 * @param turns the `turn` channel's value
 * @returns `Score: S | Turns: N`, or `Score: S` alone before the first
 *   command has cost a turn
 */
export function scoreTurnsText(score: number, turns: number): string {
  const count = turnsText(turns);
  return count ? `Score: ${score} | ${count}` : `Score: ${score}`;
}

export class StatusLine {
  private statusLocation: HTMLElement | null;
  private statusScore: HTMLElement | null;

  constructor(elements: StatusElements) {
    this.statusLocation = elements.statusLocation;
    this.statusScore = elements.statusScore;
  }

  /**
   * Update the status line with location, score, and turns
   */
  update(location: string, score: number, turns: number): void {
    this.setLocation(location);
    this.setScoreTurns(score, turns);
  }

  /**
   * Set the location display
   */
  setLocation(location: string): void {
    if (this.statusLocation) {
      this.statusLocation.textContent = location;
    }
  }

  /**
   * Set the score and turns display. A turn count of 0 is shown as no
   * count (`scoreTurnsText`).
   */
  setScoreTurns(score: number, turns: number): void {
    if (this.statusScore) {
      this.statusScore.textContent = scoreTurnsText(score, turns);
    }
  }
}
