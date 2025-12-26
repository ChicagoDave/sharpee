# Pre-Refactor Design Specification Template

## Action: [ACTION_NAME]
## Date: [DATE]
## Author: [NAME]

---

## Current State Analysis

### Implementation Pattern
**Current Pattern**: [two-phase | partial three-phase | mixed | other]

**Current Structure**:
```typescript
// Describe current method signatures and structure
```

### Problems Identified

#### IF Code Smells
1. 
2. 
3. 

#### Pattern Violations
1. 
2. 
3. 

#### Missing Features
1. 
2. 
3. 

### Current Dependencies

#### Required Traits
- Trait:
  - Purpose:
  - How checked:

#### Optional Traits
- Trait:
  - Purpose:
  - How checked:

#### Behavior Dependencies
- Behavior:
  - Purpose:
  - Implementation:

#### Event Dependencies
- Event:
  - Listeners:
  - Data passed:

---

## Target State Design

### Three-Phase Implementation

#### Phase 1: Validation
```typescript
validate(context: ActionContext): ValidationResult {
  // Validation logic design
}
```

**Validation Checks**:
1. 
2. 
3. 

**Failure Messages**:
- Condition: Message
- Condition: Message

#### Phase 2: Execution
```typescript
execute(context: ActionContext): SemanticEvent[] {
  // Execution logic design
}
```

**Execution Steps**:
1. 
2. 
3. 

**State Changes**:
- 
- 

#### Phase 3: Events
```typescript
interface [ActionName]EventData {
  // Event data structure
}
```

**Event Types**:
- Event: Purpose
- Event: Purpose

### Trait Requirements

#### Required Traits
| Trait | Purpose | Validation | Used In |
|-------|---------|-----------|---------|
| | | | |

#### Optional Traits
| Trait | Purpose | Validation | Used In |
|-------|---------|-----------|---------|
| | | | |

### Behavior Integration

#### Required Behaviors
| Behavior | Purpose | When Checked | Customization |
|----------|---------|-------------|---------------|
| | | | |

#### Optional Behaviors
| Behavior | Purpose | When Checked | Customization |
|----------|---------|-------------|---------------|
| | | | |

---

## Event System Design

### Event Data Structure
```typescript
interface [ActionName]EventData extends BaseEventData {
  actor: Entity;
  // Other fields
}
```

### Event Hooks

#### Pre-Execution Hooks
- Hook: Purpose
- Hook: Purpose

#### Post-Execution Hooks
- Hook: Purpose
- Hook: Purpose

### Extensibility Points
1. 
2. 
3. 

---

## Error Handling

### Validation Errors
| Condition | Error Message | Recovery |
|-----------|--------------|----------|
| | | |

### Runtime Errors
| Condition | Error Message | Recovery |
|-----------|--------------|----------|
| | | |

### Edge Cases
1. 
2. 
3. 

---

## Scenarios

### Success Scenarios
1. **Basic Case**:
   - Setup:
   - Command:
   - Expected:

2. **Complex Case**:
   - Setup:
   - Command:
   - Expected:

### Failure Scenarios
1. **Invalid Input**:
   - Setup:
   - Command:
   - Expected:

2. **State Conflict**:
   - Setup:
   - Command:
   - Expected:

### Edge Cases
1. **Boundary Condition**:
   - Setup:
   - Command:
   - Expected:

---

## Test Strategy

### Unit Tests
- [ ] Validation tests
- [ ] Execution tests
- [ ] Event emission tests
- [ ] Error handling tests

### Integration Tests
- [ ] Parser integration
- [ ] Story integration
- [ ] Extension integration
- [ ] Event handler integration

### Test Scenarios
1. **Basic Success Case**:
   - Setup:
   - Action:
   - Expected:

2. **Edge Case**:
   - Setup:
   - Action:
   - Expected:

3. **Error Case**:
   - Setup:
   - Action:
   - Expected:

---

## Migration Strategy

### Breaking Changes
1. 
2. 

### Backward Compatibility
1. 
2. 

### Migration Path
1. 
2. 

---

## Implementation Checklist

### Code Changes
- [ ] Remove old pattern code
- [ ] Implement validate method
- [ ] Implement execute method
- [ ] Update event structures
- [ ] Add error handling
- [ ] Update exports

### Testing
- [ ] Update existing tests
- [ ] Add new test cases
- [ ] Verify integration tests
- [ ] Test backward compatibility

### Documentation
- [ ] Update code comments
- [ ] Document events
- [ ] Document traits
- [ ] Provide examples

---

## Risks and Mitigation

### Technical Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| | | |

### Compatibility Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| | | |

---

## Acceptance Criteria

1. [ ] Three-phase pattern fully implemented
2. [ ] All tests passing
3. [ ] Event system properly typed
4. [ ] Error handling comprehensive
5. [ ] Documentation complete
6. [ ] No performance regression
7. [ ] Backward compatibility maintained (or migration provided)

---

## Notes

### Design Decisions
- 

### Open Questions
- 

### References
-