/**
 * ScoreLedger — score tracking subsystem for WorldModel.
 *
 * Public interface: award, revoke, has, getTotal, getEntries, setMax, getMax,
 * setRanks, getRanks, getRank, setScoringEnabled, isScoringEnabled,
 * toJSON, fromJSON, clear.
 *
 * Owner context: packages/world-model (ADR-129, ADR-260). Extracted from
 * WorldModel to isolate scoring concerns and simplify serialization.
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
 * A rung on the rank ladder (ADR-260 D2).
 *
 * `threshold` is **absolute points, never a percentage of max**: a change to
 * maxScore must never move a rank boundary. Dungeo raises its ceiling from 616
 * to 650 mid-game when the thief dies; under percentage thresholds that call
 * would silently demote a player who earned nothing and lost nothing.
 */
export interface RankDefinition {
  id: string;
  name: string;
  threshold: number;
}

/**
 * Serialized shape of the score ledger for persistence.
 *
 * Ranks are deliberately absent: they are configuration installed by the
 * story's scoring registration at load, not gameplay state (ADR-260 D2).
 * Keeping this shape fixed also means saves written before ADR-260 load
 * unchanged.
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
  private ranks: RankDefinition[] = [];
  private scoringEnabled: boolean = false;

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
   * Install the rank ladder (ADR-260 D2).
   *
   * Sorted ascending on receipt so callers need not sort. An empty array is
   * legal and means "scoring on, no ladder". Two rungs sharing a threshold is
   * a caller error: silently keeping one would make the resolved rank depend
   * on array order.
   *
   * @param ranks - The ladder, in any order
   * @throws if two rungs share a threshold
   */
  setRanks(ranks: RankDefinition[]): void {
    const seen = new Set<number>();
    for (const rank of ranks) {
      if (seen.has(rank.threshold)) {
        throw new Error(
          `Duplicate rank threshold ${rank.threshold} (rank "${rank.id}"): ` +
          `two rungs sharing a threshold make the resolved rank depend on array order`
        );
      }
      seen.add(rank.threshold);
    }
    this.ranks = [...ranks].sort((a, b) => a.threshold - b.threshold);
  }

  /**
   * Get the installed rank ladder, ascending by threshold.
   *
   * @returns The ladder (defensive copy)
   */
  getRanks(): RankDefinition[] {
    return [...this.ranks];
  }

  /**
   * Get the current rank — the highest rung whose threshold the total score
   * has reached.
   *
   * **Derived on every call, never stored** (ADR-260 D2): a stored rank can
   * drift from the stored score across a revoke, a maxScore change, or a
   * save/restore.
   *
   * @returns The current rank, or undefined when no ladder is installed or
   *          the score is below every rung
   */
  getRank(): RankDefinition | undefined {
    const total = this.getTotal();
    let current: RankDefinition | undefined;
    for (const rank of this.ranks) {
      if (rank.threshold <= total) {
        current = rank;
      } else {
        break;
      }
    }
    return current;
  }

  /**
   * Mark scoring as installed. Called by a scoring registration
   * (`registerScoring`, ADR-260 D5), not by gameplay.
   *
   * @param enabled - Whether scoring is installed
   */
  setScoringEnabled(enabled: boolean): void {
    this.scoringEnabled = enabled;
  }

  /**
   * Whether a scoring registration has installed itself.
   *
   * Default false. Enablement is the registration, not the ladder — an empty
   * ladder still counts as enabled.
   *
   * @returns true once a scoring registration has run
   */
  isScoringEnabled(): boolean {
    return this.scoringEnabled;
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
   * Reset gameplay state to empty.
   *
   * The rank ladder and the enabled flag survive (ADR-260 D2): both are story
   * configuration installed at load, and clearing gameplay state must not
   * uninstall them.
   */
  clear(): void {
    this.ledger = [];
    this.maxScore = 0;
  }
}
