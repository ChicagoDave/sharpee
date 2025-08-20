# ADR-056: Story Testing Framework

**Status:** Proposed  
**Date:** 2025-08-19  
**Decision:** Implement a story-based testing framework for complex integration tests

## Context

Current testing approaches have several limitations when testing complex interactive fiction scenarios:

1. **Complex Setup**: Unit tests require extensive boilerplate to create rooms, actors, objects, and relationships
2. **Integration Testing Gaps**: Difficult to test full command processing pipeline (parser → action → events → consequences)
3. **Multi-Actor Scenarios**: Testing witness system, NPC interactions, and concurrent actions requires complex orchestration
4. **Event Cascades**: Side effects and event chains are hard to test in isolation
5. **Mocking Limitations**: As seen with witness system tests, mocking can interfere with integration testing

Example of current complexity:
```typescript
// Current approach - lots of setup code
const world = new WorldModel();
const room = world.createEntity('Test Room', EntityType.ROOM);
room.add({ type: TraitType.ROOM });
const player = world.createEntity('Player', EntityType.ACTOR);
player.add({ type: TraitType.ACTOR, isPlayer: true });
// ... many more lines of setup
```

## Decision

Implement a story-based testing framework that:

1. Uses declarative story definitions for test scenarios
2. Provides a DSL for describing world state and expected outcomes
3. Supports multi-actor command sequences
4. Enables both automated and interactive testing
5. Integrates with existing Vitest infrastructure

## Detailed Design

### Story Definition Format

```typescript
interface TestStory {
  metadata: {
    id: string;
    title: string;
    description: string;
    tags: string[];  // ['witness', 'containers', 'parser', etc.]
  };
  
  world: {
    rooms: Record<string, RoomDefinition>;
    actors: Record<string, ActorDefinition>;
    objects: Record<string, ObjectDefinition>;
    relationships?: RelationshipDefinition[];
  };
  
  scenarios: TestScenario[];
}

interface TestScenario {
  name: string;
  description?: string;
  
  // Setup specific to this scenario
  setup?: {
    commands?: CommandSequence[];
    worldState?: Partial<WorldState>;
  };
  
  // The test sequence
  sequence: TestStep[];
  
  // What to verify
  expectations: Expectation[];
}

interface TestStep {
  actor?: string;  // defaults to player
  command?: string;  // natural language command
  action?: ActionCall;  // direct action invocation
  wait?: number;  // turns to wait
}

interface Expectation {
  type: 'state' | 'event' | 'output' | 'knowledge' | 'scope';
  actor?: string;
  check: ExpectationCheck;
}
```

### Example Test Story

```typescript
export const WitnessTestStory: TestStory = {
  metadata: {
    id: 'witness-lab',
    title: 'Witness System Test Lab',
    description: 'Tests for witness system and knowledge tracking',
    tags: ['witness', 'knowledge', 'scope']
  },
  
  world: {
    rooms: {
      lab: {
        name: 'Test Lab',
        description: 'A sterile white room',
        traits: ['lighted']
      },
      observation: {
        name: 'Observation Room',
        description: 'A darkened room with one-way glass',
        traits: ['dark'],
        connections: [
          { to: 'lab', direction: 'north', type: 'window' }
        ]
      }
    },
    
    actors: {
      player: {
        name: 'Tester',
        location: 'lab'
      },
      alice: {
        name: 'Alice',
        location: 'lab',
        isNPC: true
      },
      bob: {
        name: 'Bob',
        location: 'observation',
        isNPC: true
      }
    },
    
    objects: {
      ball: {
        name: 'red ball',
        location: 'lab',
        traits: ['takeable', 'visible']
      }
    }
  },
  
  scenarios: [
    {
      name: 'Bob witnesses Alice taking ball through window',
      
      sequence: [
        { actor: 'alice', command: 'take ball' }
      ],
      
      expectations: [
        {
          type: 'knowledge',
          actor: 'bob',
          check: {
            knows: ['alice', 'ball'],
            witnessed: {
              action: 'taking',
              actor: 'alice',
              target: 'ball'
            }
          }
        },
        {
          type: 'event',
          check: {
            type: 'if.witness.action',
            payload: {
              witnessId: 'bob',
              action: 'taking'
            }
          }
        }
      ]
    }
  ]
};
```

### Test Story Runner

```typescript
class TestStoryRunner {
  private world: WorldModel;
  private engine: Engine;
  private events: SemanticEvent[] = [];
  
  async runStory(story: TestStory): Promise<StoryResults> {
    this.setupWorld(story.world);
    
    const results: ScenarioResult[] = [];
    
    for (const scenario of story.scenarios) {
      results.push(await this.runScenario(scenario));
    }
    
    return { story, results };
  }
  
  async runScenario(scenario: TestScenario): Promise<ScenarioResult> {
    // Apply scenario-specific setup
    if (scenario.setup) {
      await this.applySetup(scenario.setup);
    }
    
    // Execute test sequence
    for (const step of scenario.sequence) {
      await this.executeStep(step);
    }
    
    // Check expectations
    const results = this.checkExpectations(scenario.expectations);
    
    return {
      scenario: scenario.name,
      passed: results.every(r => r.passed),
      details: results
    };
  }
}
```

### Integration with Vitest

```typescript
// packages/test-stories/tests/witness.test.ts
import { describe, test, expect } from 'vitest';
import { runStory } from '@sharpee/test-framework';
import { WitnessTestStory } from '../stories/witness-lab';

describe('Witness System Stories', () => {
  test.each(WitnessTestStory.scenarios)(
    '$name',
    async (scenario) => {
      const runner = new TestStoryRunner();
      const result = await runner.runScenario(scenario);
      
      expect(result.passed).toBe(true);
      
      // Additional assertions if needed
      result.details.forEach(detail => {
        expect(detail).toMatchSnapshot();
      });
    }
  );
});
```

### Story Organization

```
packages/test-stories/
├── src/
│   ├── stories/
│   │   ├── witness/
│   │   │   ├── basic-witnessing.story.ts
│   │   │   ├── knowledge-tracking.story.ts
│   │   │   └── multi-actor.story.ts
│   │   ├── containers/
│   │   │   ├── nested-containers.story.ts
│   │   │   └── capacity-limits.story.ts
│   │   ├── parser/
│   │   │   ├── ambiguity.story.ts
│   │   │   └── complex-commands.story.ts
│   │   └── actions/
│   │       ├── action-chains.story.ts
│   │       └── prerequisites.story.ts
│   └── framework/
│       ├── runner.ts
│       ├── world-builder.ts
│       ├── expectation-checker.ts
│       └── reporters/
│           ├── console-reporter.ts
│           └── html-reporter.ts
├── tests/
│   └── stories.test.ts
└── package.json
```

## Benefits

1. **Declarative Testing**: Focus on what to test, not how to set it up
2. **Reusability**: Same stories can test parser, actions, events, and state
3. **Comprehensibility**: Non-developers can read and write test scenarios
4. **Debugging**: Stories can be run interactively for debugging
5. **Coverage**: Better testing of integration points and complex scenarios
6. **Documentation**: Stories serve as executable documentation of system behavior

## Drawbacks

1. **Additional Complexity**: Another testing system to maintain
2. **Learning Curve**: Developers need to learn the story DSL
3. **Performance**: Integration tests are slower than unit tests
4. **Debugging**: Failures might be harder to pinpoint than unit tests

## Alternatives Considered

1. **Enhanced Unit Tests**: Add more helper functions for setup
   - Still verbose and doesn't test integration well

2. **Cucumber/Gherkin**: Use existing BDD framework
   - Adds external dependency and may not fit IF domain well

3. **Record/Replay**: Record actual game sessions as tests
   - Brittle and hard to maintain as system evolves

4. **Property-Based Testing**: Generate random scenarios
   - Good for finding edge cases but not for specific scenarios

## Implementation Plan

### Phase 1: Core Framework (Week 1)
- [ ] Define story schema and types
- [ ] Implement world builder from story definitions
- [ ] Create basic test runner
- [ ] Add simple expectation checkers

### Phase 2: Story Development (Week 2)
- [ ] Convert existing complex tests to stories
- [ ] Create witness system test stories
- [ ] Create container test stories
- [ ] Create parser test stories

### Phase 3: Enhanced Features (Week 3)
- [ ] Add interactive story runner for debugging
- [ ] Implement HTML report generator
- [ ] Add snapshot testing support
- [ ] Create story validation tools

### Phase 4: Integration (Week 4)
- [ ] Integrate with CI/CD pipeline
- [ ] Add performance benchmarking
- [ ] Create story writing documentation
- [ ] Train team on story development

## Success Metrics

1. **Test Coverage**: Increase integration test coverage by 40%
2. **Bug Detection**: Find at least 10 integration bugs not caught by unit tests
3. **Development Speed**: Reduce time to write complex tests by 60%
4. **Maintenance**: Reduce test maintenance burden by 30%

## Open Questions

1. Should stories be written in TypeScript or a DSL (YAML/JSON)?
2. How do we handle timing and async operations in stories?
3. Should we support branching scenarios (if-then-else in tests)?
4. How do we version stories as the system evolves?
5. Can we generate stories from actual gameplay sessions?

## Decision Outcome

Pending approval. Once approved:
- Create `@sharpee/test-stories` package
- Implement core framework
- Migrate complex witness system tests as proof of concept
- Evaluate effectiveness before full rollout

## References

- [Testing Trophy](https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications)
- [BDD with Cucumber](https://cucumber.io/docs/bdd/)
- [Property-Based Testing](https://fast-check.dev/)
- Current test complexity issues (see witness system mocking problems)