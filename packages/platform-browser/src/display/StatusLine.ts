/**
 * StatusLine - handles the status bar display (location, score, turns)
 */

import type { StatusElements } from '../types';

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
   * Set the score and turns display
   */
  setScoreTurns(score: number, turns: number): void {
    if (this.statusScore) {
      this.statusScore.textContent = `Score: ${score} | Turns: ${turns}`;
    }
  }
}
