# Standard Library Test Updates for Capability System

Date: 2025-07-12

## Summary

Updated stdlib tests to use the new capability-segregated data model instead of the old placeholder patterns.

## Changes Made

### 1. Updated Scoring Test (`scoring.test.ts`)

#### Key Changes:
- Added `StandardCapabilities` import and `ScoringData` type
- Updated mock context to include capability support via `getCapability()` method
- Added test for when scoring capability is not registered (returns ACTION_FAILED)
- Changed all tests to use `mockScoringData` instead of `getSharedData()`
- Updated field names to match capability schema (`scoreValue` instead of `score`)
- Added test for partial capability data handling

#### New Test Patterns:
```typescript
// Setup scoring data
mockScoringData = {
  scoreValue: 50,
  maxScore: 100,
  moves: 25,
  achievements: ['First Step']
};

// Context automatically returns it
mockContext.getCapability(StandardCapabilities.SCORING); // returns mockScoringData
```

### 2. Enhanced Test Utilities (`test-utils.ts`)

#### Added Capability Support:
- Updated `createPartialWorldModelMock()` to accept capability data
- Created `createWorldModelWithCapabilities()` helper with pre-registered capabilities
- Added `setupTestWorld()` for complete test world setup with entities and capabilities

#### New Helper Functions:
```typescript
// Create world with capabilities
const world = createWorldModelWithCapabilities({
  [StandardCapabilities.SCORING]: {
    scoreValue: 50,
    maxScore: 100
  }
});

// Or use the full setup helper
const { world, player, room, entities } = setupTestWorld({
  capabilities: {
    [StandardCapabilities.SCORING]: { scoreValue: 25 }
  }
});
```

## Test Coverage Improvements

1. **Capability Not Registered** - Tests now verify proper error handling
2. **Partial Data** - Tests handle missing fields gracefully  
3. **Type Safety** - Using typed capability data interfaces
4. **Mock Simplification** - Cleaner setup with helper functions

## Migration Guide for Other Tests

When updating tests to use capabilities:

1. **Import Types**:
```typescript
import { StandardCapabilities } from '@sharpee/world-model';
import { ScoringData } from '../../../src/capabilities';
```

2. **Setup Capability Data**:
```typescript
let mockCapabilityData: CapabilityData | undefined;

beforeEach(() => {
  mockCapabilityData = {
    // capability fields
  };
});
```

3. **Update Mock Context**:
```typescript
mockContext = {
  // ... other fields
  getCapability: jest.fn((name) => {
    if (name === StandardCapabilities.MY_CAPABILITY) {
      return mockCapabilityData;
    }
    return undefined;
  })
};
```

4. **Update Assertions**:
- Check for ACTION_FAILED when capability not registered
- Use correct field names from capability schema
- Handle partial data scenarios

## Benefits

1. **Realistic Tests** - Tests now match actual runtime behavior
2. **Better Coverage** - Tests verify capability registration requirements
3. **Type Safety** - Using proper TypeScript types throughout
4. **Maintainability** - Cleaner test setup with utility functions

## Next Steps

- Update any integration tests that use scoring
- Create tests for other capabilities (conversation, save/restore)
- Add tests for capability registration and updates
- Create example tests showing capability usage patterns
