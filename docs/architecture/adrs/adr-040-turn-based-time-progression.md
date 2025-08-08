# ADR-040: Turn-Based Time Progression

Status: **Proposed**

## Context

Many interactive fiction games use time as a fundamental game mechanic. Classic Infocom games like Deadline advanced time with each turn, creating urgency and enabling time-based puzzles, NPC schedules, and narrative pacing. Currently, Sharpee has no built-in concept of game time.

### Time Models in IF

1. **Turn-based time**: Time advances by fixed or variable amounts per action (Deadline, Suspect)
2. **Real-time**: Actual clock time affects game state (rare in IF)
3. **Event-based**: Time advances only at specific story points
4. **No time**: Many IF games ignore time entirely

The turn-based model is the most common and integrates naturally with our event-driven architecture.

## Decision

We will implement turn-based time progression as a **core feature** with the following design:

### 1. Time in World Model

Time is a queryable property of the world state:

```typescript
interface WorldModel {
  // Existing properties...
  time: {
    current: number;        // Minutes since game start
    turnNumber: number;     // Current turn
    startTime: number;      // Initial game time (e.g., 540 for 9:00 AM)
    timePerTurn: number;    // Default minutes per action (author-configurable)
  };
}
```

### 2. Time Events

Time progression emits events following ADR-039 patterns:

```typescript
// packages/core/src/events/time-events.ts
export interface TimeAdvancedEventData {
  from: number;        // Previous time in minutes
  to: number;          // New time in minutes
  duration: number;    // Minutes elapsed
  turnNumber: number;  // Turn when this occurred
  reason: 'turn' | 'wait' | 'action';  // Why time advanced
}

export interface TimeReachedEventData {
  time: number;        // The specific time reached
  turnNumber: number;
}
```

### 3. Action Time Costs

Actions can specify custom time costs:

```typescript
interface ActionMetadata {
  // Existing properties...
  timeCost?: number;  // Minutes this action takes (overrides default)
}

// Example: Climbing takes longer
export const climbAction: Action = {
  metadata: {
    timeCost: 5  // Takes 5 minutes instead of default 1
  },
  execute(context) {
    // Action logic...
  }
};
```

### 4. Wait Command

A standard WAIT command in stdlib:

```typescript
// packages/stdlib/src/actions/temporal/wait.ts
export interface WaitEventData {
  duration: number;
  targetTime?: number;  // If waiting until specific time
}

export const waitAction: Action = {
  pattern: /wait (?:for )?(\d+) minutes?|wait until (\d{1,2}):(\d{2})/i,
  execute(context) {
    const duration = parseWaitDuration(context.match);
    context.events.append('time.waited', { duration });
    // Time advancement handled by core
  }
};
```

### 5. Time Service Integration

The core time service handles advancement:

```typescript
interface TimeService {
  advanceTime(minutes: number, reason: TimeAdvanceReason): void;
  getCurrentTime(): number;
  formatTime(minutes: number): string;  // "9:45 AM"
  scheduleEvent(time: number, eventType: string, data: any): void;
}
```

### 6. Author Configuration

Authors control time behavior:

```typescript
// story.config.ts
export const config: StoryConfig = {
  time: {
    enabled: true,
    startTime: '09:00 am',   // Human-readable time
    timePerTurn: 1,          // 1 minute per turn
    format: '12h'            // or '24h' for display
  }
};
```

### 7. Time Parsing and Validation

Core provides utilities for time string parsing:

```typescript
interface TimeParser {
  parseTime(timeStr: string): number;  // Returns minutes from midnight
  validateTime(timeStr: string): boolean;
  formatTime(minutes: number, format: '12h' | '24h'): string;
}

// Supported formats:
// - "9:00 am", "09:00 AM", "9:00AM"
// - "21:00" (24-hour format)
// - "noon", "midnight"
// - "9am", "9 am"

// Example validation at startup:
if (!timeParser.validateTime(config.time.startTime)) {
  throw new Error(`Invalid startTime: ${config.time.startTime}`);
}
```

## Consequences

### Positive

- **Established pattern**: Follows proven IF conventions
- **Event integration**: Works naturally with our event system
- **Queryable**: Time is part of the world model
- **Flexible**: Authors can customize or disable entirely
- **Foundation**: Enables time-based extensions (NPC schedules, deadlines)

### Negative

- **Core complexity**: Adds time concepts to core
- **Migration**: Existing stories may need updates
- **Testing**: Time-based tests are more complex

## Implementation

1. Add time properties to WorldModel
2. Create TimeService in core
3. Implement time event types
4. Add WAIT command to stdlib
5. Update action executor to advance time
6. Create time formatting utilities

## Future Extensions

This core implementation enables future extensions:
- NPC scheduling system
- Time-based puzzles
- Day/night cycles
- Deadline mechanics
- Historical time tracking

## Related ADRs

- ADR-039: Action Event Emission Pattern (events for time changes)
- ADR-008: Core as Generic Engine (justifies time in core)
- ADR-022: Extension Architecture (how time extensions build on this)
