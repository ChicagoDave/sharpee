# World Events Implementation

## Overview
This directory contains the planning and design documents for implementing world events in Sharpee, replacing the current platform.world.* events with a proper event system.

## Documents

### 1. [Implementation Plan](./world-events-implementation-plan.md)
The main implementation plan following ADR-064, outlining phases and approach.

### 2. [Implementation Checklist](./world-events-implementation-checklist.md)
Detailed task checklist for implementing world events with the hybrid approach.

### 3. [Comprehensive Design](./world-events-comprehensive-design.md)
Full analysis of all IWorldModel operations and the events they could emit.

### 4. [Decision Matrix](./world-events-decision-matrix.md)
Comparison of three approaches (Return Only, Events Only, Hybrid) with recommendation.

## Recommended Approach: Hybrid

After analyzing all options, we recommend the **Hybrid Approach**:
- World mutations return rich results (immediate use by actions)
- World mutations also emit events (for observation by witness system, debugging)
- Best balance of performance, flexibility, and future-proofing

## Implementation Order

1. **World Events First** - Implement MoveResult and event emission
2. **Taking Action Second** - Update to use MoveResult, remove context pollution
3. **Other Actions Third** - Roll out pattern to all movement actions

## Key Benefits

- **No Context Pollution**: Actions get context from return values
- **Rich Events**: Full context available for text generation
- **Observability**: Witness system and debugging can observe all changes
- **Future-Proof**: Enables event sourcing, undo/redo, analytics
- **Performance**: Can configure/disable events as needed

## Status

- ✅ Planning complete
- ⬜ Implementation pending
- ⬜ Taking action refactor blocked on world events