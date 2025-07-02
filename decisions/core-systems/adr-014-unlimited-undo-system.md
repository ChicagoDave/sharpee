# ADR-014: Unlimited Undo System

## Status
Proposed

## Context
"Undo" is a fundamental feature of Interactive Fiction, allowing players to experiment without fear of permanent consequences. The event-driven architecture of Sharpee, where all changes flow through events, enables an elegant undo implementation through event sourcing. We can maintain the complete event history and replay to any previous state.

## Decision
Implement unlimited undo by storing all events and replaying from the beginning (or from snapshots) to reach any previous turn. The event source becomes a complete audit log of the game session.

## Architecture

### Event Source Design
```typescript
interface EventSource {
  // All events from game start
  events: TurnEvents[];
  
  // Periodic snapshots for performance
  snapshots: Map<number, WorldSnapshot>;
  
  // Current position in history
  currentTurn: number;
  
  // Optional max history (0 = unlimited)
  maxHistory: number;
}

interface TurnEvents {
  turnNumber: number;
  timestamp: number;
  command: ParsedCommand;
  events: SemanticEvent[];
  output?: string[]; // Optional: rendered text
}

interface WorldSnapshot {
  turnNumber: number;
  worldState: SerializedWorld;
  timestamp: number;
}
```

### Undo Implementation

```typescript
class UndoSystem {
  private eventSource: EventSource;
  private world: IWorldModel;
  private snapshotInterval: number = 10; // Snapshot every 10 turns
  
  constructor(world: IWorldModel) {
    this.world = world;
    this.eventSource = {
      events: [],
      snapshots: new Map(),
      currentTurn: 0,
      maxHistory: 0 // Unlimited
    };
  }
  
  // Record a turn's events
  recordTurn(command: ParsedCommand, events: SemanticEvent[]): void {
    const turn: TurnEvents = {
      turnNumber: ++this.eventSource.currentTurn,
      timestamp: Date.now(),
      command,
      events
    };
    
    this.eventSource.events.push(turn);
    
    // Create snapshot periodically
    if (turn.turnNumber % this.snapshotInterval === 0) {
      this.createSnapshot(turn.turnNumber);
    }
    
    // Trim history if needed
    if (this.eventSource.maxHistory > 0) {
      this.trimHistory();
    }
  }
  
  // Undo to previous turn
  undo(): boolean {
    if (this.eventSource.currentTurn <= 1) {
      return false; // Can't undo past start
    }
    
    return this.restoreToTurn(this.eventSource.currentTurn - 1);
  }
  
  // Undo multiple turns
  undoMultiple(turns: number): boolean {
    const targetTurn = Math.max(1, this.eventSource.currentTurn - turns);
    return this.restoreToTurn(targetTurn);
  }
  
  // Restore to specific turn
  restoreToTurn(turnNumber: number): boolean {
    if (turnNumber < 1 || turnNumber > this.eventSource.currentTurn) {
      return false;
    }
    
    // Find nearest snapshot before target
    const snapshot = this.findNearestSnapshot(turnNumber);
    
    // Restore from snapshot or initial state
    if (snapshot) {
      this.world.restore(snapshot.worldState);
      var startTurn = snapshot.turnNumber;
    } else {
      this.world.reset();
      var startTurn = 0;
    }
    
    // Replay events to target turn
    for (let i = startTurn; i < turnNumber; i++) {
      const turn = this.eventSource.events[i];
      for (const event of turn.events) {
        this.world.processEvent(event);
      }
    }
    
    this.eventSource.currentTurn = turnNumber;
    return true;
  }
  
  // Create snapshot of current state
  private createSnapshot(turnNumber: number): void {
    const snapshot: WorldSnapshot = {
      turnNumber,
      worldState: this.world.serialize(),
      timestamp: Date.now()
    };
    
    this.eventSource.snapshots.set(turnNumber, snapshot);
    
    // Limit number of snapshots
    this.pruneSnapshots();
  }
  
  private findNearestSnapshot(turnNumber: number): WorldSnapshot | null {
    let nearest: WorldSnapshot | null = null;
    
    for (const [turn, snapshot] of this.eventSource.snapshots) {
      if (turn <= turnNumber && (!nearest || turn > nearest.turnNumber)) {
        nearest = snapshot;
      }
    }
    
    return nearest;
  }
}
```

### Advanced Undo Features

```typescript
class AdvancedUndoSystem extends UndoSystem {
  // Show what would be undone
  preview(): UndoPreview {
    const currentTurn = this.eventSource.currentTurn;
    const previousTurn = currentTurn - 1;
    
    if (previousTurn < 1) {
      return { canUndo: false };
    }
    
    const turn = this.eventSource.events[currentTurn - 1];
    return {
      canUndo: true,
      command: turn.command,
      events: turn.events,
      description: this.describeEvents(turn.events)
    };
  }
  
  // Branch timeline (for "what if" exploration)
  branch(): Timeline {
    const branchPoint = this.eventSource.currentTurn;
    const newTimeline = this.cloneTimeline();
    
    return {
      id: generateId(),
      branchPoint,
      parentTimeline: this.currentTimelineId,
      eventSource: newTimeline
    };
  }
  
  // Find specific events in history
  findInHistory(predicate: (turn: TurnEvents) => boolean): TurnEvents[] {
    return this.eventSource.events.filter(predicate);
  }
  
  // Redo (if we've undone)
  private redoStack: TurnEvents[] = [];
  
  redo(): boolean {
    if (this.redoStack.length === 0) {
      return false;
    }
    
    const turn = this.redoStack.pop()!;
    
    // Replay the turn's events
    for (const event of turn.events) {
      this.world.processEvent(event);
    }
    
    this.eventSource.events.push(turn);
    this.eventSource.currentTurn++;
    
    return true;
  }
}
```

### Memory Management

```typescript
interface MemoryStrategy {
  shouldSnapshot(turn: number): boolean;
  shouldPruneSnapshot(snapshot: WorldSnapshot): boolean;
  shouldTrimHistory(events: TurnEvents[]): TurnEvents[];
}

class AdaptiveMemoryStrategy implements MemoryStrategy {
  private maxMemoryMB: number = 100;
  private currentUsageMB: number = 0;
  
  shouldSnapshot(turn: number): boolean {
    // More frequent snapshots for recent turns
    if (turn > 100) {
      return turn % 50 === 0;
    } else if (turn > 20) {
      return turn % 10 === 0;
    } else {
      return turn % 5 === 0;
    }
  }
  
  shouldPruneSnapshot(snapshot: WorldSnapshot): boolean {
    // Keep recent snapshots, prune old ones
    const age = Date.now() - snapshot.timestamp;
    const ageInTurns = this.currentTurn - snapshot.turnNumber;
    
    // Keep all snapshots from last 10 turns
    if (ageInTurns < 10) return false;
    
    // Keep every 10th snapshot for turns 10-100
    if (ageInTurns < 100) {
      return snapshot.turnNumber % 10 !== 0;
    }
    
    // Keep every 50th snapshot after that
    return snapshot.turnNumber % 50 !== 0;
  }
  
  shouldTrimHistory(events: TurnEvents[]): TurnEvents[] {
    if (this.currentUsageMB > this.maxMemoryMB) {
      // Keep last 1000 turns in detail
      // Older turns only keep command and summary
      return events.map((turn, index) => {
        if (index > events.length - 1000) {
          return turn; // Keep recent turns intact
        } else {
          // Compress old turns
          return {
            ...turn,
            events: [], // Remove detailed events
            summary: this.summarizeEvents(turn.events)
          };
        }
      });
    }
    return events;
  }
}
```

### UI Integration

```typescript
interface UndoUI {
  // Simple undo
  'undo' | 'u': () => void;
  
  // Multiple undo
  'undo 5': (turns: number) => void;
  
  // Show history
  'history': () => void;
  
  // Preview what would be undone
  'undo?': () => void;
}

class UndoCommands {
  register(game: Game): void {
    game.commands.register('undo', (args) => {
      const turns = args.number || 1;
      
      if (turns === 1) {
        const preview = this.undoSystem.preview();
        if (preview.canUndo) {
          this.ui.confirm(
            `Undo "${preview.command.raw}"?`,
            () => {
              if (this.undoSystem.undo()) {
                this.ui.message('Previous turn undone.');
                this.ui.refresh();
              }
            }
          );
        } else {
          this.ui.message("Can't undo any further.");
        }
      } else {
        if (this.undoSystem.undoMultiple(turns)) {
          this.ui.message(`Undone ${turns} turns.`);
          this.ui.refresh();
        }
      }
    });
    
    game.commands.register('history', () => {
      const history = this.undoSystem.getHistory(10);
      this.ui.showHistory(history);
    });
  }
}
```

## Consequences

### Positive
- **True Unlimited Undo**: Can go back to any point
- **Complete History**: Full audit trail of gameplay
- **Experimentation**: Players can try anything
- **Learning Tool**: Can review what happened
- **Debug Aid**: Complete trace of game state changes
- **Branch Exploration**: "What if" scenarios possible

### Negative
- **Memory Usage**: Storing all events can be large
- **Performance**: Replay can be slow for long games
- **Complexity**: More complex than simple state restoration

### Neutral
- Save files could include or exclude history
- Multiplayer games need special consideration
- May want to disable for certain scenes/puzzles

## Performance Optimizations

### Snapshot Strategy
```typescript
// Adaptive snapshots based on replay cost
class SmartSnapshotter {
  calculateReplayCost(fromTurn: number, toTurn: number): number {
    let cost = 0;
    for (let i = fromTurn; i < toTurn; i++) {
      const events = this.eventSource.events[i].events;
      cost += events.length * this.getEventCost(events);
    }
    return cost;
  }
  
  shouldSnapshot(turn: number): boolean {
    // Snapshot if replay cost exceeds threshold
    const replayCost = this.calculateReplayCost(
      this.lastSnapshot,
      turn
    );
    return replayCost > this.snapshotThreshold;
  }
}
```

### Event Compression
```typescript
// Compress common event patterns
class EventCompressor {
  compress(events: SemanticEvent[]): CompressedEvents {
    // Identify patterns like "take all"
    const patterns = this.findPatterns(events);
    
    return {
      patterns,
      remaining: this.removePatterns(events, patterns)
    };
  }
  
  decompress(compressed: CompressedEvents): SemanticEvent[] {
    return [
      ...this.expandPatterns(compressed.patterns),
      ...compressed.remaining
    ];
  }
}
```

## Configuration Options

```typescript
interface UndoConfig {
  // Unlimited by default
  maxHistory: number; // 0 = unlimited
  
  // Snapshot strategy
  snapshotInterval: number; // Turns between snapshots
  maxSnapshots: number; // Maximum stored snapshots
  
  // Memory limits
  maxMemoryMB: number; // Soft limit for memory usage
  
  // Features
  allowBranching: boolean; // Timeline branches
  compressOldEvents: boolean; // Compress old history
  
  // UI
  confirmUndo: boolean; // Ask before undoing
  showPreview: boolean; // Show what will be undone
}

const defaultConfig: UndoConfig = {
  maxHistory: 0,
  snapshotInterval: 10,
  maxSnapshots: 100,
  maxMemoryMB: 100,
  allowBranching: false,
  compressOldEvents: true,
  confirmUndo: true,
  showPreview: true
};
```

## Example Usage

```typescript
// In game initialization
const undoSystem = new UndoSystem(world);
game.registerPlugin(undoSystem);

// After each turn
game.on('turn.complete', (command, events) => {
  undoSystem.recordTurn(command, events);
});

// Player types "undo"
> undo
Undo "take lamp and go north"? (y/n) y
Previous turn undone.

// Player explores history
> history
Recent commands:
  Turn 45: examine painting
  Turn 44: unlock door with key
  Turn 43: take key
  Turn 42: look under mat
  
// Undo multiple
> undo 5
Undone 5 turns.
```

## Related Decisions
- ADR-013: Save/Load Architecture (saves complete state)
- Event System Architecture (provides event stream)
- World Model Design (must support restore)

## References
- Z-Machine undo specification
- Event Sourcing patterns
- Git's object model
- Database transaction logs
