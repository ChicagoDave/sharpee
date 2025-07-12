/**
 * Event Sequencer - Manages event ordering within turns
 * 
 * Ensures all events have proper sequence numbers for ordering
 * and grouping within a turn.
 */

import { GameEvent, SequencedEvent } from './types';

/**
 * Event sequencer class
 */
class EventSequencer {
  private counter: number = Date.now();

  /**
   * Get next sequence number
   */
  next(): number {
    return ++this.counter;
  }

  /**
   * Reset turn counter (optional, for testing)
   */
  resetTurn(turn: number): void {
    // No-op in this implementation
  }

  /**
   * Sequence a single event
   */
  sequence(event: GameEvent, turn: number): SequencedEvent {
    return {
      ...event,
      sequence: this.next(),
      timestamp: new Date(),
      turn,
      scope: 'turn'
    };
  }

  /**
   * Sequence multiple events
   */
  sequenceAll(events: GameEvent[], turn: number): SequencedEvent[] {
    return events.map(event => this.sequence(event, turn));
  }
}

/**
 * Event sequence utilities
 */
export class EventSequenceUtils {
  /**
   * Sort events by sequence number
   */
  static sort(events: SequencedEvent[]): SequencedEvent[] {
    return [...events].sort((a, b) => a.sequence - b.sequence);
  }

  /**
   * Filter events by type
   */
  static filterByType(events: SequencedEvent[], type: string): SequencedEvent[] {
    return events.filter(e => e.type === type);
  }

  /**
   * Filter events by turn
   */
  static filterByTurn(events: SequencedEvent[], turn: number): SequencedEvent[] {
    return events.filter(e => e.turn === turn);
  }

  /**
   * Filter events by scope
   */
  static filterByScope(events: SequencedEvent[], scope: SequencedEvent['scope']): SequencedEvent[] {
    return events.filter(e => e.scope === scope);
  }

  /**
   * Group events by type
   */
  static groupByType(events: SequencedEvent[]): Record<string, SequencedEvent[]> {
    const groups: Record<string, SequencedEvent[]> = {};
    
    for (const event of events) {
      if (!groups[event.type]) {
        groups[event.type] = [];
      }
      groups[event.type].push(event);
    }
    
    return groups;
  }

  /**
   * Group events by turn
   */
  static groupByTurn(events: SequencedEvent[]): Record<number, SequencedEvent[]> {
    const groups: Record<number, SequencedEvent[]> = {};
    
    for (const event of events) {
      if (!groups[event.turn]) {
        groups[event.turn] = [];
      }
      groups[event.turn].push(event);
    }
    
    return groups;
  }

  /**
   * Get latest event by type
   */
  static getLatestByType(events: SequencedEvent[], type: string): SequencedEvent | undefined {
    const filtered = this.filterByType(events, type);
    if (filtered.length === 0) return undefined;
    
    return filtered.reduce((latest, current) => 
      current.sequence > latest.sequence ? current : latest
    );
  }

  /**
   * Count events by type
   */
  static countByType(events: SequencedEvent[]): Record<string, number> {
    const counts: Record<string, number> = {};
    
    for (const event of events) {
      counts[event.type] = (counts[event.type] || 0) + 1;
    }
    
    return counts;
  }

  /**
   * Get events in sequence range
   */
  static getInRange(
    events: SequencedEvent[], 
    start: number, 
    end: number, 
    inclusive: boolean = true
  ): SequencedEvent[] {
    if (inclusive) {
      return events.filter(e => e.sequence >= start && e.sequence <= end);
    } else {
      return events.filter(e => e.sequence > start && e.sequence < end);
    }
  }
}

// Export singleton instance
export const eventSequencer = new EventSequencer();
