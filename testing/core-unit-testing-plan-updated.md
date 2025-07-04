# Core Layer Unit Testing Plan - UPDATED

## Overview

After auditing the actual Core implementation, this updated plan reflects what actually needs to be tested. The Core layer is more minimal than initially thought, focusing on types, interfaces, and basic implementations without world state management.

## Actual Core Structure

### 1. **Types** (`/src/types/`)
- **Entity**: Base entity interface with id, type, attributes, relationships
- **Relationship**: Relationship types and configurations
- **Attribute**: Attribute value types and validation
- **Result**: Generic Result<T,E> type with helper functions

### 2. **Events** (`/src/events/`)
- **GenericEventSource**: Simple pub/sub for any event type
- **SemanticEventSource**: Story events with query capabilities
- **SystemEvent**: Debug/monitoring events
- **TextProcessor**: Interface for text processing
- **Standard Events**: Event type constants

### 3. **Rules** (`/src/rules/`)
- **SimpleRuleSystem**: Rule engine that processes events
- **Types**: Rule, RuleResult, RuleWorld interfaces
- **Helpers**: Rule building utilities
- **Compatibility**: Backward compatibility layer

### 4. **Language** (`/src/language/`)
- **LanguageProvider**: Interface for text formatting
- **LanguageRegistry**: Manages language providers
- **DefaultProvider**: Fallback implementation

### 5. **Extensions** (`/src/extensions/`)
- **Extension Types**: Interfaces for plugins
- **Registry**: Extension management (if implemented)

### 6. **Execution** (`/src/execution/`)
- **CommandHandler**: Generic command handling interface
- **Action**: Handler with ID
- **CommandRouter**: Command routing interface
- **ExecutionContext**: Context for execution

### 7. **Debug** (`/src/debug/`)
- **DebugEvent**: Debug event types
- **DebugContext**: Debug emission context

## Updated Test Plan

### Phase 1: Core Types Testing

#### 1.1 Result Type Tests (`/tests/types/result.test.ts`)
```typescript
describe('Result', () => {
  describe('Creation', () => {
    it('should create success results');
    it('should create failure results');
  });
  
  describe('Type Guards', () => {
    it('should identify success results');
    it('should identify failure results');
  });
  
  describe('Transformations', () => {
    it('should map success values');
    it('should map error values');
    it('should chain results with flatMap');
  });
  
  describe('Unwrapping', () => {
    it('should unwrap success values');
    it('should throw on unwrap failure');
    it('should provide default on failure');
  });
});
```

#### 1.2 Entity Types Tests (`/tests/types/entity.test.ts`)
```typescript
describe('Entity Types', () => {
  it('should define correct entity structure');
  it('should handle entity creation params');
  it('should define operation options');
});
```

### Phase 2: Event System Testing (✓ Partially Complete)

#### 2.1 SimpleEventSource Tests (`/tests/events/simple-event-source.test.ts`) ✓
- Already implemented

#### 2.2 SemanticEventSource Tests (`/tests/events/semantic-event-source.test.ts`) ✓
- Already implemented

#### 2.3 SystemEvent Tests (`/tests/events/system-event.test.ts`)
```typescript
describe('SystemEvent', () => {
  describe('Event Creation', () => {
    it('should create system events with required fields');
    it('should include optional severity and correlationId');
    it('should generate unique IDs');
  });
  
  describe('Type Guard', () => {
    it('should validate system event structure');
    it('should check property types'); // Currently failing
  });
  
  describe('Subsystems', () => {
    it('should define all expected subsystems');
  });
});
```

#### 2.4 EventSystem Tests (`/tests/events/event-system.test.ts`)
```typescript
describe('EventSystem', () => {
  it('should create events with createEvent helper');
  it('should generate unique event IDs');
  it('should include all required fields');
});
```

### Phase 3: Rules System Testing

#### 3.1 SimpleRuleSystem Tests (`/tests/rules/simple-rule-system.test.ts`)
```typescript
describe('SimpleRuleSystem', () => {
  describe('Rule Management', () => {
    it('should add and remove rules');
    it('should retrieve all rules');
  });
  
  describe('Event Processing', () => {
    it('should match rules by event type');
    it('should handle wildcard rules');
    it('should handle category wildcards');
    it('should respect rule priority');
    it('should evaluate conditions');
  });
  
  describe('Rule Actions', () => {
    it('should prevent events when rule returns prevent');
    it('should collect events from multiple rules');
    it('should apply entity changes');
    it('should stop on first prevention');
  });
  
  describe('Integration', () => {
    it('should create narrative events for messages');
    it('should handle complex rule chains');
  });
});
```

#### 3.2 Rule Helpers Tests (`/tests/rules/helpers.test.ts`)
```typescript
describe('Rule Helpers', () => {
  it('should create rules with helper functions');
  it('should build conditions with DSL');
});
```

### Phase 4: Language System Testing

#### 4.1 LanguageRegistry Tests (`/tests/language/registry.test.ts`)
```typescript
describe('LanguageRegistry', () => {
  describe('Registration', () => {
    it('should register language providers');
    it('should unregister providers');
    it('should clear all providers');
  });
  
  describe('Language Selection', () => {
    it('should set active language');
    it('should throw on unknown language');
    it('should get active provider');
  });
  
  describe('Queries', () => {
    it('should list registered languages');
    it('should check language availability');
  });
});
```

#### 4.2 DefaultProvider Tests (`/tests/language/default-provider.test.ts`)
```typescript
describe('DefaultProvider', () => {
  it('should format messages with parameters');
  it('should format lists');
  it('should return language metadata');
});
```

### Phase 5: Extension System Testing

#### 5.1 Extension Types Tests (`/tests/extensions/types.test.ts`)
```typescript
describe('Extension Types', () => {
  it('should define command extensions');
  it('should define ability extensions');
  it('should define event extensions');
  it('should define parser extensions');
});
```

### Phase 6: Execution System Testing

#### 6.1 Execution Types Tests (`/tests/execution/types.test.ts`)
```typescript
describe('Execution Types', () => {
  it('should define ExecutionContext interface');
  it('should define CommandHandler interface');
  it('should define Action interface');
  it('should define CommandRouter interface');
  it('should define execution options');
});
```

### Phase 7: Debug System Testing

#### 7.1 Debug Types Tests (`/tests/debug/types.test.ts`)
```typescript
describe('Debug Types', () => {
  it('should define DebugEvent structure');
  it('should define debug context');
  it('should provide debug event types');
});
```

### Phase 8: Integration Testing

#### 8.1 Event Flow Tests (`/tests/integration/event-flow.test.ts`)
```typescript
describe('Event Flow Integration', () => {
  it('should flow events through semantic source');
  it('should integrate with rule system');
  it('should handle debug events separately');
});
```

#### 8.2 Rule Processing Tests (`/tests/integration/rule-processing.test.ts`)
```typescript
describe('Rule Processing Integration', () => {
  it('should process events through rules');
  it('should generate new events from rules');
  it('should prevent events based on rules');
});
```

## Test Coverage Goals

### Must Test:
1. **Result type utilities** - Core functional programming helpers
2. **Event sources** - Both generic and semantic (✓ Done)
3. **Rule system** - Event processing and rule execution
4. **Language registry** - Provider management
5. **System events** - Creation and validation

### Nice to Test:
1. **Type definitions** - Ensure interfaces are correct
2. **Constants** - Verify exported values
3. **Debug infrastructure** - Event emission

### Don't Need to Test:
1. **Pure interfaces** - No implementation to test
2. **Type-only exports** - TypeScript validates these
3. **Simple re-exports** - No logic to test

## Differences from Original Plan

1. **No WorldState** - This is in a separate package
2. **No Entity/Action implementations** - Core only has interfaces
3. **More focus on Rules** - Actual implementation exists
4. **Language system exists** - Registry and provider pattern
5. **Debug infrastructure** - Separate from semantic events

## Next Steps

1. Complete missing tests for:
   - Rule system (Phase 3)
   - Language system (Phase 4)
   - Result type utilities (Phase 1.1)

2. Fix existing test issues:
   - `isSystemEvent` type checking

3. Consider integration tests between:
   - Events and Rules
   - Language and Text processing

Total test files needed: ~15-20 (currently have 5)
