/**
 * Test event fixtures
 */

import { SemanticEvent } from '@sharpee/core';
import { IFEvents } from '@sharpee/if-domain';

// Movement events
export const moveEvent: SemanticEvent = {
  id: 'test-move-1',
  type: IFEvents.ACTOR_MOVED,
  entities: {
    actor: 'player',
    location: 'room2'
  },
  data: {
    fromLocation: 'room1',
    toLocation: 'room2',
    direction: 'north'
  },
  timestamp: Date.now()
};

export const invalidMoveEvent: SemanticEvent = {
  id: 'test-move-invalid',
  type: IFEvents.ACTOR_MOVED,
  entities: {
    actor: 'player',
    location: 'nonexistent'
  },
  data: {
    fromLocation: 'room1',
    toLocation: 'nonexistent',
    direction: 'north'
  },
  timestamp: Date.now()
};

// State change events
export const stateChangeEvent: SemanticEvent = {
  id: 'test-state-1',
  type: IFEvents.OPENED,
  entities: {
    target: 'door1'
  },
  data: {
    property: 'open',
    oldValue: false,
    newValue: true
  },
  timestamp: Date.now()
};

// Observation events
export const lookEvent: SemanticEvent = {
  id: 'test-look-1',
  type: 'player.looked',
  entities: {
    actor: 'player',
    location: 'room1'
  },
  data: {
    locationId: 'room1'
  },
  timestamp: Date.now()
};

export const examineEvent: SemanticEvent = {
  id: 'test-examine-1',
  type: IFEvents.EXAMINED,
  entities: {
    actor: 'player',
    target: 'key1'
  },
  data: {
    detailed: true
  },
  timestamp: Date.now()
};

// Complex event scenarios
export const eventBatch: SemanticEvent[] = [
  moveEvent,
  stateChangeEvent,
  lookEvent
];

// Event that triggers reactions
export const eventWithReaction: SemanticEvent = {
  id: 'test-take-1',
  type: IFEvents.TAKEN,
  entities: {
    actor: 'player',
    target: 'cursed_artifact',
    location: 'altar'
  },
  data: {
    fromLocation: 'altar'
  },
  timestamp: Date.now()
};

// Expected reaction from above
export const curseReactionEvent: SemanticEvent = {
  id: 'test-curse-1',
  type: 'state_change',
  entities: {
    target: 'player'
  },
  data: {
    property: 'cursed',
    oldValue: false,
    newValue: true
  },
  timestamp: Date.now()
};

// Create custom test events
export function createTestEvent(
  type: string,
  actor: string,
  data: Record<string, any>
): SemanticEvent {
  return {
    id: `test-${type}-${Date.now()}`,
    type,
    entities: {
      actor
    },
    data,
    timestamp: Date.now()
  };
}

// Create a sequence of events with timestamps
export function createEventSequence(
  events: Array<Omit<SemanticEvent, 'timestamp'>>,
  intervalMs: number = 100
): SemanticEvent[] {
  const startTime = Date.now();
  return events.map((event, index) => ({
    ...event,
    timestamp: startTime + (index * intervalMs)
  }));
}
