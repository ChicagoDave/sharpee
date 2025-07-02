/**
 * Event Sequencer - Manages event ordering within turns
 * 
 * Ensures all events have proper sequence numbers for ordering
 * and grouping within a turn.
 */

import { SemanticEvent } from '@sharpee/core';
import { SequencedEvent, EventSequencer, TurnPhase } from './types';

/**
 * Default event sequencer implementation
 */
export class DefaultEventSequencer implements EventSequencer {
  private turnCounters: Map<number, number> = new Map();

  /**
   * Sequence events for a turn
   */
  sequence(events: SemanticEvent[], turn: number, startOrder: number = 1): SequencedEvent[] {
    let currentOrder = startOrder;
    const sequenced: SequencedEvent[] = [];

    for (const event of events) {
      const sequencedEvent: SequencedEvent = {
        ...event,
        sequence: {
          turn,
          order: currentOrder++,
          phase: this.determinePhase(event)
        }
      };

      sequenced.push(sequencedEvent);
    }

    // Update counter
    this.turnCounters.set(turn, currentOrder);

    return sequenced;
  }

  /**
   * Get next order number for a turn
   */
  getNextOrder(turn: number): number {
    return this.turnCounters.get(turn) || 1;
  }

  /**
   * Reset sequencing for a new turn
   */
  resetTurn(turn: number): void {
    this.turnCounters.set(turn, 1);
  }

  /**
   * Determine which phase an event belongs to
   */
  private determinePhase(event: SemanticEvent): TurnPhase {
    // You can customize this based on event types
    const type = event.type.toUpperCase();

    // Pre-phase events
    if (type.includes('BEFORE') || type.includes('PRE')) {
      return TurnPhase.PRE;
    }

    // Post-phase events
    if (type.includes('AFTER') || type.includes('POST')) {
      return TurnPhase.POST;
    }

    // Cleanup events
    if (type.includes('CLEANUP') || type.includes('RESET')) {
      return TurnPhase.CLEANUP;
    }

    // Default to main phase
    return TurnPhase.MAIN;
  }

  /**
   * Create a sub-sequencer for nested events
   */
  createSubSequencer(parentOrder: number): SubSequencer {
    return new SubSequencer(parentOrder);
  }
}

/**
 * Sub-sequencer for nested events
 */
export class SubSequencer {
  private subOrder: number = 1;

  constructor(private parentOrder: number) {}

  /**
   * Sequence a sub-event
   */
  sequence(event: SemanticEvent, turn: number): SequencedEvent {
    return {
      ...event,
      sequence: {
        turn,
        order: this.parentOrder,
        subOrder: this.subOrder++,
        phase: TurnPhase.MAIN
      }
    };
  }
}

/**
 * Event sequence utilities
 */
export class EventSequenceUtils {
  /**
   * Sort events by sequence
   */
  static sort(events: SequencedEvent[]): SequencedEvent[] {
    return [...events].sort((a, b) => {
      // First by turn
      if (a.sequence.turn !== b.sequence.turn) {
        return a.sequence.turn - b.sequence.turn;
      }

      // Then by order
      if (a.sequence.order !== b.sequence.order) {
        return a.sequence.order - b.sequence.order;
      }

      // Then by sub-order if present
      const aSubOrder = a.sequence.subOrder || 0;
      const bSubOrder = b.sequence.subOrder || 0;
      return aSubOrder - bSubOrder;
    });
  }

  /**
   * Group events by turn
   */
  static groupByTurn(events: SequencedEvent[]): Map<number, SequencedEvent[]> {
    const groups = new Map<number, SequencedEvent[]>();

    for (const event of events) {
      const turn = event.sequence.turn;
      if (!groups.has(turn)) {
        groups.set(turn, []);
      }
      groups.get(turn)!.push(event);
    }

    return groups;
  }

  /**
   * Group events by phase within a turn
   */
  static groupByPhase(events: SequencedEvent[]): Map<TurnPhase, SequencedEvent[]> {
    const groups = new Map<TurnPhase, SequencedEvent[]>();

    for (const event of events) {
      const phase = event.sequence.phase || TurnPhase.MAIN;
      if (!groups.has(phase)) {
        groups.set(phase, []);
      }
      groups.get(phase)!.push(event);
    }

    return groups;
  }

  /**
   * Get sequence string for display (e.g., "1.2.3")
   */
  static getSequenceString(event: SequencedEvent): string {
    const { turn, order, subOrder } = event.sequence;
    let str = `${turn}.${order}`;
    if (subOrder !== undefined) {
      str += `.${subOrder}`;
    }
    return str;
  }
}

// Export singleton instance
export const eventSequencer = new DefaultEventSequencer();
