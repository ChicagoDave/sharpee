# ADR-049: Auto-Save Architecture

## Status
Proposed

## Context
Currently, save operations in Sharpee are explicitly triggered through user actions (SAVE command) or client-initiated platform events. As we consider different client implementations (web, CLI, cloud-based), there's a need to support automatic saving to:
- Prevent loss of progress due to crashes or disconnections
- Improve user experience by eliminating manual save management
- Support cloud-based or mobile clients where session persistence is expected
- Enable seamless "continue where you left off" functionality

## Decision
We will implement an optional auto-save system that:
1. Operates at the engine level but is configured by the client
2. Uses the existing platform operations infrastructure
3. Maintains backward compatibility with manual-save-only clients
4. Provides configurable save strategies to accommodate different client capabilities

### Proposed Architecture

#### Configuration Interface
```typescript
interface AutoSaveConfig {
  enabled: boolean;
  strategy: 'every-turn' | 'interval' | 'smart' | 'level-based';
  
  // For 'every-turn' strategy
  turnFrequency?: number; // Save every N turns (default: 1)
  
  // For 'interval' strategy  
  intervalMs?: number; // Save every N milliseconds
  
  // For 'smart' strategy
  smartConfig?: {
    minTurns: number;        // Minimum turns between saves
    maxTurns: number;        // Maximum turns without save
    significantEvents: string[]; // Event types that trigger save
  };
  
  // For 'level-based' strategy
  levelConfig?: {
    triggerLocations?: string[]; // Location IDs that trigger saves
    triggerEvents?: string[];    // Story-specific events (quest.completed, puzzle.solved)
    transitionPoints?: boolean;  // Save on area/chapter transitions
    beforeDanger?: boolean;      // Save before entering marked dangerous areas
    afterAchievement?: boolean;  // Save after score increases or achievements
    customTriggers?: (context: GameContext) => boolean; // Story-defined save points
  };
  
  // Storage management
  maxSlots?: number;      // Maximum auto-save slots (rotating)
  separateFromManual?: boolean; // Keep auto/manual saves separate
  
  // Performance options
  async?: boolean;        // Non-blocking saves
  compression?: boolean;  // Compress save data
  incremental?: boolean;  // Save only deltas (requires base save)
}

interface SaveContext {
  saveName?: string;
  timestamp: number;
  isAutoSave?: boolean;
  slot?: number;
  saveType?: 'manual' | 'auto' | 'checkpoint' | 'emergency';
}
```

#### Implementation Points

1. **Engine Changes**
   - Add `autoSaveConfig` property to GameEngine
   - Check auto-save triggers after each turn in `executeTurn()`
   - Track last save timestamp and turn count
   - Emit distinct auto-save events vs manual save events

2. **Platform Operations**
   - New event type: `platform.auto_save_requested`
   - Auto-saves bypass query system (no user confirmation)
   - Failed auto-saves logged but don't interrupt gameplay

3. **Save Data Structure**
   - Add metadata to distinguish save types
   - Include parent save reference for incremental saves
   - Version auto-save format separately for migration

## Blast Radius Analysis

### Affected Components

#### Direct Impact (Must Change)
- **GameEngine** (~/src/game-engine.ts)
  - Add auto-save configuration and checking logic
  - Modify `executeTurn()` to trigger auto-saves
  - Track auto-save state (last save, turn count)

- **Platform Events** (~/packages/core/src/types/platform-events.ts)
  - Add new event types for auto-save
  - Extend SaveContext interface

- **SaveRestoreHooks** (~/packages/core/src/types/hooks.ts)
  - Optional auto-save configuration method
  - Extended context in save hook

#### Indirect Impact (May Need Updates)
- **Save/Load Actions** (~/packages/stdlib/src/actions/standard/)
  - Awareness of auto-save state for user feedback
  - Possible "load auto-save" command

- **Query System** (~/packages/core/src/query/)
  - Must skip queries for auto-saves
  - May need "auto-save in progress" state

- **Client Implementations**
  - Each client decides auto-save configuration
  - Storage management varies per platform

#### No Impact (Unchanged)
- Parser system
- World model
- Standard actions (except save/load)
- Event system fundamentals
- Story definitions

### Risk Assessment

#### Performance Risks
- **Serialization Cost**: Full world serialization every turn could impact performance
  - *Mitigation*: Incremental saves, async operations, smart triggering
  
- **Storage Growth**: Unlimited auto-saves could fill storage
  - *Mitigation*: Rotating slots, cleanup policies, compression

- **Memory Pressure**: Keeping save state in memory for incremental saves
  - *Mitigation*: Configurable memory limits, flush to disk

#### Compatibility Risks
- **Breaking Changes**: None - auto-save is opt-in
- **Migration**: Existing saves remain compatible
- **Client Updates**: Clients without auto-save support continue working

#### User Experience Risks
- **Save Conflicts**: Manual save during auto-save
  - *Mitigation*: Queue operations, lock management
  
- **Invisible Failures**: Auto-save fails silently
  - *Mitigation*: Event emission for monitoring, periodic user notification

- **Storage Confusion**: Users confused by multiple save types
  - *Mitigation*: Clear UI separation, save type metadata

## Consequences

### Positive
- **Improved Reliability**: No data loss from crashes
- **Better UX**: Seamless continuation of games
- **Platform Flexibility**: Different clients can optimize for their environment
- **Progressive Enhancement**: Works with existing infrastructure
- **Cloud Ready**: Enables cloud-based game streaming scenarios

### Negative
- **Increased Complexity**: More configuration options and edge cases
- **Performance Overhead**: Additional processing after turns
- **Storage Management**: Clients must handle save rotation/cleanup
- **Testing Burden**: Many configuration combinations to test
- **Debugging Complexity**: Auto-saves complicate save state debugging

### Neutral
- **Documentation Needs**: Requires clear documentation for client implementers
- **Monitoring**: May want telemetry for auto-save performance/failures
- **Feature Detection**: Clients need to detect auto-save support

## Implementation Phases

### Phase 1: Core Infrastructure
- Extend SaveContext and platform events
- Add configuration interfaces
- Implement basic every-turn auto-save

### Phase 2: Optimization
- Incremental saves
- Async save operations  
- Compression support

### Phase 3: Smart Strategies
- Event-based triggering
- Adaptive save frequency
- Predictive pre-saves

## Testing Considerations

### Unit Tests
- Configuration validation
- Save trigger logic
- Rotation/cleanup logic

### Integration Tests
- Auto-save during gameplay
- Manual/auto save interaction
- Error recovery
- Performance benchmarks

### Client Tests
- Platform-specific storage
- UI/UX for save management
- Migration from manual-only

## Security & Privacy Considerations

- **Local Storage**: Auto-saves shouldn't expose sensitive data
- **Cloud Storage**: Encryption for cloud auto-saves
- **Permissions**: Respect platform storage permissions
- **User Control**: Clear opt-out mechanism
- **Data Retention**: Configurable cleanup policies

## Alternatives Considered

1. **Client-Only Auto-Save**: Let each client implement independently
   - *Rejected*: Duplicated effort, inconsistent behavior

2. **Mandatory Auto-Save**: Always enable auto-save
   - *Rejected*: Not suitable for all platforms/use cases

3. **Event Sourcing**: Store only events, reconstruct state
   - *Rejected*: Major architecture change, performance concerns

4. **Checkpoint System**: Fixed checkpoint slots only
   - *Rejected*: Less flexible than configurable auto-save

## Decision Outcome
Implement optional auto-save system with configurable strategies, maintaining full backward compatibility while enabling enhanced user experiences across different client platforms.

## References
- ADR-033: Save/Restore Architecture
- ADR-035: Platform Event Architecture
- Issue #[TBD]: User request for auto-save functionality