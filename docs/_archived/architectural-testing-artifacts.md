# Architectural Testing Artifacts

Beyond ADRs, we need executable artifacts that enforce architectural decisions. Here's what could have prevented our behavior pattern failure:

## 1. Architecture Tests (ArchUnit-style)

```typescript
// tests/architecture/behavior-usage.test.ts
describe('Architecture: Behavior Usage', () => {
  it('actions must delegate to behaviors for trait logic', () => {
    const actionFiles = glob('packages/stdlib/src/actions/**/*.ts');
    
    actionFiles.forEach(file => {
      const content = readFileSync(file);
      
      // If action checks trait data directly, it should import corresponding behavior
      if (content.includes('TraitType.OPENABLE')) {
        expect(content).toMatch(/import.*OpenableBehavior/);
        expect(content).toMatch(/OpenableBehavior\.(canOpen|open|close)/);
      }
      
      // Actions should NOT directly mutate trait data
      expect(content).not.toMatch(/openable\.isOpen\s*=/);
      expect(content).not.toMatch(/lockable\.isLocked\s*=/);
    });
  });
});
```

## 2. Contract Tests

```typescript
// tests/contracts/action-behavior-contract.test.ts
interface ActionBehaviorContract {
  // Every action must implement validate/execute pattern
  validate(context: ActionContext): ValidationResult;
  execute(context: ActionContext): SemanticEvent[];
  
  // Execute must not contain validation logic
  executeContainsNoValidation(): void;
}

// Test that OpenAction follows contract
describe('OpenAction conforms to ActionBehaviorContract', () => {
  it('delegates validation to OpenableBehavior.canOpen', () => {
    const spy = jest.spyOn(OpenableBehavior, 'canOpen');
    action.validate(mockContext);
    expect(spy).toHaveBeenCalled();
  });
  
  it('delegates execution to OpenableBehavior.open', () => {
    const spy = jest.spyOn(OpenableBehavior, 'open');
    action.execute(mockContext);
    expect(spy).toHaveBeenCalled();
  });
});
```

## 3. Dependency Graphs

```typescript
// tools/verify-architecture.ts
// Generate and verify dependency graphs

const expectedDependencies = {
  'actions/opening': ['behaviors/openable', 'behaviors/lockable'],
  'actions/container': ['behaviors/container', 'behaviors/portable'],
  // Actions should depend on behaviors, not implement logic
};

function verifyDependencies() {
  const actual = analyzeDependencies('packages/stdlib/src');
  
  // Fail if actions don't import expected behaviors
  for (const [action, behaviors] of Object.entries(expectedDependencies)) {
    expect(actual[action]).toIncludeAll(behaviors);
  }
}
```

## 4. Code Coverage for Behaviors

```typescript
// Behavior usage coverage - different from line coverage
interface BehaviorCoverage {
  behavior: string;
  methods: {
    name: string;
    calledBy: string[];  // Which actions use this method
    coverage: number;    // Percentage of actions that should use it
  }[];
}

// Every behavior method should be called by at least one action
// Key methods like canOpen() should be called by all relevant actions
```

## 5. Architectural Fitness Functions

```typescript
// tests/fitness/behavior-fitness.ts
describe('Architectural Fitness Functions', () => {
  it('behavior usage should increase over time', () => {
    const currentUsage = countBehaviorImports();
    const lastWeekUsage = getHistoricalUsage('1 week ago');
    
    expect(currentUsage).toBeGreaterThanOrEqual(lastWeekUsage);
  });
  
  it('code duplication should decrease', () => {
    const duplication = analyzeDuplication(['actions/', 'behaviors/']);
    expect(duplication.percentage).toBeLessThan(10);
  });
});
```

## 6. Living Documentation Tests

```typescript
// tests/documentation/examples.test.ts
describe('Documentation Examples', () => {
  it('README examples should actually work', () => {
    const examples = extractCodeBlocks('docs/patterns/behavior-pattern.md');
    
    examples.forEach(example => {
      // Compile and run the example
      expect(() => evalExample(example)).not.toThrow();
    });
  });
});
```

## 7. Architecture Decision Enforcement

```yaml
# .architecture-rules.yaml
rules:
  - name: "Actions must use behaviors"
    pattern: "packages/stdlib/src/actions/**/*.ts"
    must:
      - import: "*Behavior from '@sharpee/world-model'"
      - call: ["*.canOpen", "*.canClose", "*.canLock"]
    mustNot:
      - contain: "trait.isOpen ="
      - contain: "trait.isLocked ="
      
  - name: "Validate before execute"
    pattern: "packages/stdlib/src/actions/**/*.ts"
    must:
      - implement: "validate(context: ActionContext)"
      - implement: "execute(context: ActionContext)"
```

## 8. Mutation Testing for Patterns

```typescript
// If we remove behavior calls, tests should fail
describe('Mutation Testing', () => {
  it('removing behavior calls should break tests', () => {
    const original = readAction('OpenAction');
    const mutated = original.replace('OpenableBehavior.open', '// OpenableBehavior.open');
    
    const testResults = runTests(mutated);
    expect(testResults.failures).toBeGreaterThan(0);
  });
});
```

## 9. Architectural Metrics Dashboard

```typescript
interface ArchitectureMetrics {
  behaviorUsageRate: number;      // % of actions using behaviors
  validationCoverage: number;      // % of actions with validate()
  patternConformance: number;      // % following validate/execute
  duplicationIndex: number;        // Amount of duplicated logic
  architecturalDebt: number;       // Violations * effort to fix
}

// Track these metrics over time
// Fail builds if metrics degrade
```

## 10. Example-Driven Development (EDD)

```typescript
// examples/how-to-write-an-action.ts
// This RUNNING example shows the correct pattern

import { OpenableBehavior, LockableBehavior } from '@sharpee/world-model';

export class ExampleOpenAction extends Action {
  // ✅ CORRECT: Separate validate from execute
  validate(context: ActionContext): ValidationResult {
    // ✅ CORRECT: Use behavior validation
    if (!OpenableBehavior.canOpen(entity)) {
      return { valid: false, error: 'cannot_open' };
    }
    return { valid: true };
  }
  
  execute(context: ActionContext): SemanticEvent[] {
    // ✅ CORRECT: Delegate to behavior
    return OpenableBehavior.open(entity, actor);
  }
  
  // ❌ WRONG: Don't do this
  executeWrong(context: ActionContext): SemanticEvent[] {
    // ❌ Checking trait directly
    if (entity.get(TraitType.OPENABLE).isOpen) {
      return error('already_open');
    }
    // ❌ Mutating trait directly  
    entity.get(TraitType.OPENABLE).isOpen = true;
  }
}
```

## Key Principles

1. **Make the wrong thing impossible** - The code shouldn't compile/run if patterns are violated
2. **Test the architecture, not just functionality** - "It works" isn't enough
3. **Executable documentation** - Examples that run and are tested
4. **Continuous architectural validation** - Not just at review time
5. **Measure and track** - Architecture metrics as first-class citizens

These artifacts would have caught our behavior pattern violation early because they test HOW code is structured, not just WHAT it does.