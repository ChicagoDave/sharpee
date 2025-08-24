# ADR-057: Rulebook System for Story Logic

## Status
On Hold

## Context
Interactive fiction authors need to inject custom logic around action execution to implement puzzles, story progression, and special behaviors. We need a structured approach that allows story-level logic to run before, after, and during turn sequences.

Key requirements:
- Authors can create before rules that run before validation and execution
- Before rules can cancel or redirect actions
- After rules run after execution but before report
- Every turn rules run at the end of each turn
- Rules have id, order, when condition, and run logic
- Rules are standalone and injected into command executor via rulebooks

## Decision

### Rule Structure
Rules are simple objects with a consistent interface:

```typescript
interface Rule {
  id: string;                                    // Unique identifier for debugging
  order?: number;                                // Execution order (lower runs first, default 100)
  when: (context: RuleContext) => boolean;      // Condition to check
  run: (context: RuleContext) => RuleResult | void;  // Effect to apply
}

interface RuleContext {
  action: string;                   // Action being executed (e.g., 'taking')
  world: WorldModel;                // Access to world state
  player: Entity;                   // The player entity
  command: ValidatedCommand;        // The parsed command
  result?: ActionResult;            // For 'after' rules only
}

interface RuleResult {
  prevent?: boolean;                // Stop action execution (before rules only)
  redirect?: string;                // Redirect to different action (before rules only)
  message?: string;                 // Message to display
  events?: ISemanticEvent[];       // Events to emit
}
```

### Rulebook Structure
Rulebooks organize rules by execution phase:

```typescript
interface Rulebook {
  before: Rule[];      // Rules that run before action validation
  after: Rule[];       // Rules that run after action execution
  everyTurn: Rule[];   // Rules that run at end of each turn
}

class RulebookManager {
  private rulebook: Rulebook = {
    before: [],
    after: [],
    everyTurn: []
  };

  addBeforeRule(rule: Rule): void {
    this.rulebook.before.push(rule);
    this.sortRules(this.rulebook.before);
  }

  addAfterRule(rule: Rule): void {
    this.rulebook.after.push(rule);
    this.sortRules(this.rulebook.after);
  }

  addEveryTurnRule(rule: Rule): void {
    this.rulebook.everyTurn.push(rule);
    this.sortRules(this.rulebook.everyTurn);
  }

  private sortRules(rules: Rule[]): void {
    rules.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }

  getBeforeRules(): Rule[] { return this.rulebook.before; }
  getAfterRules(): Rule[] { return this.rulebook.after; }
  getEveryTurnRules(): Rule[] { return this.rulebook.everyTurn; }
}
```

### Execution Flow
The command executor integrates with rulebooks:

```typescript
class CommandExecutor {
  constructor(private rulebook: RulebookManager) {}

  async execute(command: ValidatedCommand): Promise<ISemanticEvent[]> {
    const events: ISemanticEvent[] = [];
    const context: RuleContext = {
      action: command.action,
      world: this.world,
      player: this.player,
      command: command
    };

    // 1. Run BEFORE rules
    for (const rule of this.rulebook.getBeforeRules()) {
      if (rule.when(context)) {
        const result = rule.run(context);
        if (result?.prevent) {
          // Action prevented, emit message and stop
          if (result.message) {
            events.push(createTextEvent(result.message));
          }
          if (result.events) {
            events.push(...result.events);
          }
          return events;
        }
        if (result?.redirect) {
          // Redirect to different action
          command.action = result.redirect;
          context.action = result.redirect;
        }
        if (result?.events) {
          events.push(...result.events);
        }
      }
    }

    // 2. Run action validate
    const validation = action.validate(context);
    if (!validation.valid) {
      return validation.events || [];
    }

    // 3. Run action execute
    const executeEvents = action.execute(context);
    events.push(...executeEvents);

    // 4. Run AFTER rules
    context.result = { success: true, events: executeEvents };
    for (const rule of this.rulebook.getAfterRules()) {
      if (rule.when(context)) {
        const result = rule.run(context);
        if (result?.events) {
          events.push(...result.events);
        }
      }
    }

    // 5. Run action report
    const reportEvents = action.report(context);
    events.push(...reportEvents);

    // 6. Run EVERY TURN rules
    for (const rule of this.rulebook.getEveryTurnRules()) {
      if (rule.when(context)) {
        const result = rule.run(context);
        if (result?.events) {
          events.push(...result.events);
        }
      }
    }

    return events;
  }
}
```

### Story Integration
Authors define rules in their story files and add them to the rulebook:

```typescript
// In story.ts
export function configureRules(rulebook: RulebookManager) {
  // Before rule - require gloves for fragile vase
  rulebook.addBeforeRule({
    id: 'require-gloves-for-vase',
    order: 10,
    when: (ctx) => 
      ctx.action === 'taking' &&
      ctx.command.directObject?.entity?.id === 'fragile-vase',
    run: (ctx) => {
      if (!ctx.player.has('gloves')) {
        return {
          prevent: true,
          message: 'The vase looks too delicate to handle without gloves.'
        };
      }
      if (!ctx.player.isWearing('gloves')) {
        // Auto-wear the gloves
        ctx.world.wearItem(ctx.player.id, 'gloves');
        return {
          message: 'You carefully put on your gloves first.'
        };
      }
    }
  });

  // After rule - track button presses
  rulebook.addAfterRule({
    id: 'track-button-presses',
    order: 20,
    when: (ctx) =>
      ctx.action === 'pushing' &&
      ctx.command.directObject?.entity?.id === 'red-button',
    run: (ctx) => {
      const count = (ctx.world.getFlag('button-presses') || 0) + 1;
      ctx.world.setFlag('button-presses', count);
      
      if (count === 3) {
        return {
          events: [createEvent('story.progress', {
            milestone: 'puzzle-solved',
            message: 'A secret door slides open!'
          })]
        };
      }
    }
  });

  // Every turn rule - time passage
  rulebook.addEveryTurnRule({
    id: 'time-passage',
    when: (ctx) => ctx.world.getFlag('clock-started'),
    run: (ctx) => {
      const time = ctx.world.getFlag('time') || 0;
      ctx.world.setFlag('time', time + 1);
      
      if (time === 12) {
        return {
          events: [createEvent('story.event', {
            type: 'noon',
            message: 'The clock strikes twelve.'
          })]
        };
      }
    }
  });
}
```

### Advanced Example: Action Redirection

```typescript
// Redirect 'attack' to 'push' for non-violent game
rulebook.addBeforeRule({
  id: 'pacifist-mode',
  order: 5,
  when: (ctx) => ctx.action === 'attacking',
  run: (ctx) => {
    return {
      redirect: 'pushing',
      message: 'Violence isn\'t the answer here. You give it a gentle push instead.'
    };
  }
});

// Conditional rule enabling
rulebook.addBeforeRule({
  id: 'tutorial-restrictions',
  order: 1,
  when: (ctx) => 
    !ctx.world.getFlag('tutorial-complete') &&
    ctx.action !== 'examining' && 
    ctx.action !== 'looking',
  run: (ctx) => {
    return {
      prevent: true,
      message: 'Try examining things first to learn about your surroundings.'
    };
  }
});
```

## Consequences

### Positive
- **Simple structure** - Just objects with id, order, when, and run
- **Clear separation** - Rulebooks organize rules by phase (before/after/everyTurn)
- **Predictable execution** - Rules sorted by order, execute sequentially
- **Action control** - Before rules can prevent or redirect actions
- **Standalone rules** - Not tied to entities, easier to manage
- **Testable** - Each rule and rulebook can be tested independently
- **Author-friendly** - Simple functions, no complex class hierarchies

### Negative
- **Another abstraction** - Adds rulebook layer to execution flow
- **Debugging complexity** - Rules can interfere with each other
- **State mutations** - Rules directly mutate world state (may need careful management)

### Neutral
- Rules are global to the story, not attached to entities
- Order property is critical for predictable behavior
- Before rules can prevent/redirect, after rules cannot

## Alternatives Considered

1. **Entity-attached rules** - More complex, harder to manage lifecycle
2. **Class-based rules** - Unnecessary complexity for simple functions
3. **Event-only hooks** - Can't prevent or redirect actions
4. **Inline hooks in actions** - Would require modifying every action

## Implementation Notes

- Rulebook is injected into CommandExecutor at initialization
- Rules are sorted by order when added to ensure predictable execution
- Consider adding debug logging to trace which rules fire
- Every turn rules run after report phase
- Rule IDs should be unique for debugging purposes
- Default order is 100 to allow both early (< 100) and late (> 100) rules