/**
 * ScoreLedger — score tracking subsystem for WorldModel.
 *
 * Public interface: award, revoke, has, getTotal, getEntries, setMax, getMax,
 * toJSON, fromJSON, clear.
 *
 * Owner context: packages/world-model (ADR-129). Extracted from WorldModel
 * to isolate scoring concerns and simplify serialization.
 */

/**
 * A single score entry in the ledger.
 */
export interface ScoreEntry {
  id: string;
  points: number;
  description: string;
}

/**
 * Serialized shape of the score ledger for persistence.
 */
export interface ScoreLedgerData {
  scoreLedger: ScoreEntry[];
  scoreMaxScore: number;
}

/**
 * Tracks score entries awarded during gameplay.
 * Each entry has a unique ID to prevent double-awards and support revocation.
 */
export class ScoreLedger {
  private ledger: ScoreEntry[] = [];
  private maxScore: number = 0;

  /**
   * Award points for an achievement. Returns false if already awarded.
   *
   * @param id - Unique identifier for this score entry
   * @param points - Points to award
   * @param description - Human-readable description
   * @returns true if awarded, false if id was already in the ledger
   */
  award(id: string, points: number, description: string): boolean {
    if (this.ledger.some(e => e.id === id)) {
      return false;
    }
    this.ledger.push({ id, points, description });
    return true;
  }

  /**
   * Revoke a previously awarded score entry.
   *
   * @param id - The entry ID to revoke
   * @returns true if revoked, false if not found
   */
  revoke(id: string): boolean {
    const idx = this.ledger.findIndex(e => e.id === id);
    if (idx < 0) return false;
    this.ledger.splice(idx, 1);
    return true;
  }

  /**
   * Check if a score entry has been awarded.
   *
   * @param id - The entry ID to check
   * @returns true if the entry exists in the ledger
   */
  has(id: string): boolean {
    return this.ledger.some(e => e.id === id);
  }

  /**
   * Get the total score (sum of all entry points).
   *
   * @returns Total points across all entries
   */
  getTotal(): number {
    let total = 0;
    for (const entry of this.ledger) {
      total += entry.points;
    }
    return total;
  }

  /**
   * Get a copy of all score entries.
   *
   * @returns Array of score entries (defensive copy)
   */
  getEntries(): ScoreEntry[] {
    return [...this.ledger];
  }

  /**
   * Set the maximum possible score.
   *
   * @param max - Maximum score value
   */
  setMax(max: number): void {
    this.maxScore = max;
  }

  /**
   * Get the maximum possible score.
   *
   * @returns Maximum score value
   */
  getMax(): number {
    return this.maxScore;
  }

  /**
   * Serialize the ledger for persistence.
   *
   * @returns Serializable data object
   */
  toJSON(): ScoreLedgerData {
    return {
      scoreLedger: this.ledger,
      scoreMaxScore: this.maxScore,
    };
  }

  /**
   * Restore the ledger from serialized data.
   *
   * @param data - Previously serialized ledger data
   */
  fromJSON(data: Partial<ScoreLedgerData>): void {
    if (data.scoreLedger) {
      this.ledger = data.scoreLedger;
    }
    if (data.scoreMaxScore !== undefined) {
      this.maxScore = data.scoreMaxScore;
    }
  }

  /**
   * Reset the ledger to empty state.
   */
  clear(): void {
    this.ledger = [];
    this.maxScore = 0;
  }
}
