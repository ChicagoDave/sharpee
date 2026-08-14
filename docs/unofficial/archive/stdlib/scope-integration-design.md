# Scope Integration Design

## Current Flow

```
User Input → Parser → ParsedCommand → CommandValidator → ValidatedCommand → Action.execute()
```

## Problems with Current Design

1. **Duplicate Validation**: 
   - CommandValidator checks visibility using `world.canSee()`
   - Individual actions also check visibility/reachability
   - No single source of truth

2. **Missing Scope Integration**:
   - CommandValidator doesn't use our new ScopeResolver
   - No way to leverage hearing/smell for entity resolution
   - Darkness and other sensory conditions not considered

3. **Inconsistent Error Handling**:
   - Some actions check scope, others don't
   - Error messages vary between validation and execution

## Proposed Design

### Option 1: Centralized Validation (Recommended)

```
User Input → Parser → ParsedCommand → CommandValidator (with ScopeResolver) → ValidatedCommand → Action.execute()
```

**CommandValidator responsibilities:**
- Resolve entities using ALL senses (not just sight)
- Check if resolved entities meet action's scope requirements
- Produce consistent scope-related errors
- Pass scope information in ValidatedCommand

**Action responsibilities:**
- Trust that entities are in proper scope
- Focus on business logic only
- No duplicate scope checks

**Benefits:**
- Single source of truth for scope
- Consistent error messages
- Actions are simpler
- Easy to test

**Implementation:**
1. Update CommandValidator to use ScopeResolver
2. Add scope information to ValidatedCommand
3. Remove scope checks from individual actions
4. Standardize scope error messages

### Option 2: Action-Level Validation

```
User Input → Parser → ParsedCommand → CommandValidator (basic) → ValidatedCommand → Action.execute() (checks scope)
```

**CommandValidator responsibilities:**
- Basic entity resolution
- No scope checking

**Action responsibilities:**
- Check scope requirements
- Handle scope errors

**Problems:**
- Duplicate code across actions
- Inconsistent error handling
- Harder to test

### Option 3: Hybrid Approach

```
User Input → Parser → ParsedCommand → CommandValidator (adds scope info) → ValidatedCommand → Action.execute() (can override)
```

**CommandValidator responsibilities:**
- Resolve entities using ScopeResolver
- Add scope information to ValidatedCommand
- Don't fail on scope issues

**ValidatedCommand includes:**
```typescript
interface ValidatedCommand {
  // ... existing fields ...
  scopeInfo?: {
    directObject?: {
      level: ScopeLevel;
      senses: SenseType[];
    };
    indirectObject?: {
      level: ScopeLevel;
      senses: SenseType[];
    };
  };
}
```

**Action responsibilities:**
- Can check scopeInfo if needed
- Can override for special cases
- Most actions trust the scope info

## Recommendation: Option 1 with Modifications

1. **Update CommandValidator:**
   - Inject ScopeResolver
   - Use scope resolver for entity resolution
   - Check action's declared scope requirements
   - Fail validation if requirements not met

2. **Update ValidatedCommand:**
   ```typescript
   interface ValidatedCommand {
     parsed: ParsedCommand;
     actionId: string;
     directObject?: ValidatedObjectReference;
     indirectObject?: ValidatedObjectReference;
     scopeInfo?: {
       directObject?: {
         level: ScopeLevel;
         perceivedBy: SenseType[];
       };
       indirectObject?: {
         level: ScopeLevel;
         perceivedBy: SenseType[];
       };
     };
     metadata?: {
       validationTime: number;
       warnings?: string[];
     };
   }
   ```

3. **Action Metadata Enhancement:**
   ```typescript
   interface ActionMetadata {
     requiresDirectObject: boolean;
     requiresIndirectObject: boolean;
     directObjectScope?: ScopeLevel; // Use our enum
     indirectObjectScope?: ScopeLevel;
     validPrepositions?: string[];
   }
   ```

4. **Special Cases:**
   - EXAMINE action: May work with AUDIBLE/DETECTABLE scope
   - LISTEN action: Specifically for AUDIBLE scope
   - SMELL action: Specifically for DETECTABLE scope
   - TOUCH action: Requires REACHABLE scope

## Migration Plan

1. Update CommandValidator to accept ScopeResolver
2. Update entity resolution to use scope resolver
3. Add scope checking based on action metadata
4. Update ValidatedCommand interface
5. Remove redundant checks from actions
6. Add integration tests

## Example Flow

```typescript
// 1. Parser creates ParsedCommand
const parsed = {
  action: 'take',
  structure: {
    directObject: { text: 'coin' }
  }
};

// 2. CommandValidator resolves and validates
const validator = new CommandValidator(world, actionRegistry, scopeResolver);
const result = validator.validate(parsed);

// 3. If coin is visible but not reachable
if (action.metadata.directObjectScope === ScopeLevel.REACHABLE) {
  return {
    success: false,
    error: {
      code: 'NOT_REACHABLE',
      message: "You can't reach the coin."
    }
  };
}

// 4. Action executes with confidence
takingAction.execute(context); // No scope checks needed
```

## Benefits

1. **Consistency**: All scope checking in one place
2. **Performance**: No duplicate checks
3. **Flexibility**: Easy to add new senses
4. **Testing**: Easier to test with mock scope resolver
5. **Error Quality**: Consistent, informative error messages