# Standard Library Capability Refactoring Plan

Date: 2025-07-12

## Overview

This document outlines the plan to refactor stdlib actions to use the capability-segregated data model established in ADR-024.

## Identified Capabilities

After reviewing the stdlib actions, here are the standard capabilities that need refactoring:

### 1. **Scoring Capability** ✅
- **Current state**: Uses placeholder code (`const sharedData: any = {}`)
- **Data structure**:
  ```typescript
  capabilities.scoring = {
    data: {
      scoreValue: number;
      maxScore: number;
      moves: number;
      achievements: string[];
      rank?: string;
    }
  }
  ```
- **Actions affected**: `scoring.ts`
- **Priority**: HIGH (already broken in tests)

### 2. **Save/Restore Capability**
- **Current state**: Uses placeholder shared data
- **Data structure**:
  ```typescript
  capabilities.saveRestore = {
    data: {
      saves: {
        [saveName: string]: {
          timestamp: number;
          turnCount: number;
          score: number;
          description?: string;
        }
      };
      lastSave?: string;
      autoSaveEnabled: boolean;
    }
  }
  ```
- **Actions affected**: `saving.ts`, `restoring.ts`
- **Priority**: MEDIUM

### 3. **Inventory (NOT A CAPABILITY)**
- **Current state**: Uses entity relationships and traits (correct approach)
- **Why not a capability**: Inventory is a dynamic query over:
  - What entities have the PC as their location (carrying)
  - What entities are in containers the PC is carrying
  - What items have the WEARABLE trait with worn=true
- **Actions affected**: `inventory.ts`, `wearing.ts`, `taking_off.ts`
- **No changes needed**: Current pull model is the right design

### 4. **Conversation State Capability**
- **Current state**: Stored on Actor traits (messy)
- **Data structure**:
  ```typescript
  capabilities.conversation = {
    data: {
      states: {
        [npcId: string]: {
          hasGreeted: boolean;
          currentTopic?: string;
          availableTopics: string[];
          relationshipLevel: number;
          lastInteraction?: number;
          flags: Record<string, boolean>;
        }
      };
      globalTopics: string[];
    }
  }
  ```
- **Actions affected**: `talking.ts`, `asking.ts`, `telling.ts`, `answering.ts`
- **Priority**: HIGH (improves NPC interaction system)

### 5. **Combat Capability** (if implemented)
- **Current state**: Not yet implemented
- **Data structure**:
  ```typescript
  capabilities.combat = {
    data: {
      inCombat: boolean;
      combatants: EntityId[];
      initiative: EntityId[];
      stats: {
        [entityId: string]: {
          health: number;
          maxHealth: number;
          armor: number;
          damage: number;
        }
      };
    }
  }
  ```
- **Actions affected**: `attacking.ts`
- **Priority**: LOW (not core IF)

### 6. **Game Meta Capability**
- **Current state**: Various shared data fields
- **Data structure**:
  ```typescript
  capabilities.gameMeta = {
    data: {
      turnCount: number;
      startTime: number;
      lastAction?: string;
      preferences: {
        verboseMode: boolean;
        briefMode: boolean;
        scoring: boolean;
      };
    }
  }
  ```
- **Actions affected**: `about.ts`, `help.ts`, `quitting.ts`
- **Priority**: MEDIUM

## Actions That DON'T Need Capabilities

These actions work purely with entity relationships and don't need capability data:
- **Inventory management**: `inventory.ts`, `wearing.ts`, `taking_off.ts` - Query relationships
- **Basic object manipulation**: `taking.ts`, `dropping.ts`, `putting.ts`
- **Movement**: `going.ts`, `entering.ts`, `exiting.ts`
- **Object interaction**: `opening.ts`, `closing.ts`, `locking.ts`, `unlocking.ts`
- **Examination**: `examining.ts`, `looking.ts`, `searching.ts`
- **Physical actions**: `pushing.ts`, `pulling.ts`, `turning.ts`

## Implementation Strategy

### Phase 1: Core Capabilities (Week 1)
1. **Scoring** - Fix the broken tests first
2. **Conversation** - Major improvement to NPC system
3. Update WorldModel interface to support capabilities

### Phase 2: Meta Capabilities (Week 2)
1. **Save/Restore** - Important for game continuity
2. **Game Meta** - Preferences and game state

### Phase 3: Optional Capabilities (Future)
1. **Combat** - Only if games need it
2. Other game-specific capabilities as needed

## Code Changes Required

### 1. World Model Interface Update
```typescript
interface WorldModel {
  // Existing
  entities: EntityStore;
  relationships: RelationshipStore;
  
  // New
  capabilities: CapabilityStore;
  
  // New methods
  registerCapability(name: string, schema: CapabilitySchema): void;
  updateCapability(name: string, data: Partial<any>): void;
  getCapability(name: string): CapabilityData | undefined;
}
```

### 2. Action Context Enhancement
```typescript
interface ActionContext {
  // Existing
  world: WorldModel;
  player: IFEntity;
  
  // New shortcuts
  getCapability(name: string): any;
  updateCapability(name: string, data: any): void;
}
```

### 3. Standard Capability Registry
Create a new file: `stdlib/src/capabilities/index.ts`
```typescript
export const StandardCapabilities = {
  SCORING: 'scoring',
  SAVE_RESTORE: 'saveRestore',
  CONVERSATION: 'conversation',
  GAME_META: 'gameMeta',
  // ...
} as const;

export const CapabilitySchemas = {
  [StandardCapabilities.SCORING]: { /* schema */ },
  // ...
};
```

## Migration Path

For each capability:
1. Define the capability schema
2. Update action to use `world.capabilities.X` instead of shared data
3. Update tests to register capability before use
4. Update any dependent systems (like Text Service templates)

## Success Criteria

- [ ] All failing tests pass
- [ ] No more placeholder/any types in actions
- [ ] Clear capability boundaries established
- [ ] Documentation updated with capability patterns
- [ ] Example game demonstrates capability usage
