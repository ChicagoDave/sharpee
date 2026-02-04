# Rulebook Implementation Design

## Date: 2025-08-22

## Core Design Principle
Rules and rulebooks are generic containers. The engine doesn't know about "before" or "after" as hard-coded concepts - it just manages a list of rulebooks that get checked at appropriate points in execution.

## Interface Design

### Core Interfaces

```typescript
// IRule - The basic unit of story logic
interface IRule {
  id: string;                                      // Unique identifier
  order?: number;                                  // Execution order (default 100)
  when: (context: RuleContext) => boolean;        // Condition to check
  run: (context: RuleContext) => RuleResult | void; // Effect to apply
}

// IRulebook - A named collection of rules
interface IRulebook {
  name: string;                                    // e.g., "before", "after", "every-turn"
  rules: IRule[];                                  // The rules in this book
  
  addRule(rule: IRule): void;
  removeRule(ruleId: string): void;
  getRules(): IRule[];
  execute(context: RuleContext): RuleResult[];
}

// RuleContext - Information available to rules
interface RuleContext {
  action: string;                   // Current action being executed
  world: WorldModel;                // World state access
  actor: Entity;                    // Who's performing the action
  command: IValidatedCommand;       // The validated command
  phase: string;                    // Which rulebook is running (for debugging)
}

// RuleResult - What a rule can return
interface RuleResult {
  prevent?: boolean;                // Stop action execution
  redirect?: string;                // Change to different action
  events?: ISemanticEvent[];        // Events to emit
}
```

### Implementation Classes

```typescript
// Rule - Standard implementation of IRule
class Rule implements IRule {
  id: string;
  order: number;
  when: (context: RuleContext) => boolean;
  run: (context: RuleContext) => RuleResult | void;
  
  constructor(config: {
    id: string;
    order?: number;
    when: (context: RuleContext) => boolean;
    run: (context: RuleContext) => RuleResult | void;
  }) {
    this.id = config.id;
    this.order = config.order ?? 100;
    this.when = config.when;
    this.run = config.run;
  }
}

// Rulebook - Standard implementation of IRulebook
class Rulebook implements IRulebook {
  name: string;
  rules: IRule[] = [];
  
  constructor(name: string) {
    this.name = name;
  }
  
  addRule(rule: IRule): void {
    this.rules.push(rule);
    this.sortRules();
  }
  
  removeRule(ruleId: string): void {
    this.rules = this.rules.filter(r => r.id !== ruleId);
  }
  
  getRules(): IRule[] {
    return this.rules;
  }
  
  execute(context: RuleContext): RuleResult[] {
    const results: RuleResult[] = [];
    const contextWithPhase = { ...context, phase: this.name };
    
    for (const rule of this.rules) {
      if (rule.when(contextWithPhase)) {
        const result = rule.run(contextWithPhase);
        if (result) {
          results.push(result);
          // Stop processing if prevented
          if (result.prevent) break;
        }
      }
    }
    
    return results;
  }
  
  private sortRules(): void {
    this.rules.sort((a, b) => (a.order ?? 100) - (b.order ?? 100));
  }
}
```

## Engine Integration

### Engine Management

```typescript
// In engine/src/command-executor.ts
class CommandExecutor {
  private rulebooks: List<IRulebook> = new List<IRulebook>();
  
  constructor(/* existing params */) {
    // ... existing initialization
    this.loadStandardRulebooks();
  }
  
  private loadStandardRulebooks(): void {
    // Load standard rulebooks from stdlib
    const standardRulebooks = loadStandardRulebooks(); // from stdlib/src/rules
    standardRulebooks.forEach(rb => this.rulebooks.add(rb));
  }
  
  // Find a rulebook by name
  private getRulebook(name: string): IRulebook | undefined {
    return this.rulebooks.find(rb => rb.name === name);
  }
  
  // Execute a specific rulebook
  private executeRulebook(name: string, context: RuleContext): RuleResult[] {
    const rulebook = this.getRulebook(name);
    if (!rulebook) return [];
    return rulebook.execute(context);
  }
  
  async executeCommand(
    command: IValidatedCommand,
    world: WorldModel,
    context: GameContext,
    turn: number
  ): Promise<TurnResult> {
    const ruleContext: RuleContext = {
      action: command.actionId,
      world,
      actor: world.getPlayer(),
      command
    };
    
    // 1. Execute "before" rulebook
    const beforeResults = this.executeRulebook('before', ruleContext);
    for (const result of beforeResults) {
      if (result.prevent) {
        // Action prevented, return early with any events
        return this.createTurnResult(turn, command, false, result.events || []);
      }
      if (result.redirect) {
        // Redirect to different action
        command.actionId = result.redirect;
        ruleContext.action = result.redirect;
      }
    }
    
    // 2. Execute "instead" rulebook
    const insteadResults = this.executeRulebook('instead', ruleContext);
    for (const result of insteadResults) {
      if (result.prevent || result.redirect) {
        // Instead replaces the action entirely
        return this.createTurnResult(turn, command, true, result.events || []);
      }
    }
    
    // 3. Normal action execution
    const action = this.actionRegistry.get(command.actionId);
    const actionContext = this.createActionContext(world, context, command, action);
    
    const validation = action.validate(actionContext);
    if (!validation.valid) {
      return this.createTurnResult(turn, command, false, validation.events || []);
    }
    
    const executeEvents = action.execute(actionContext);
    
    // 4. Execute "after" rulebook
    const afterResults = this.executeRulebook('after', ruleContext);
    
    // 5. Generate report
    const reportEvents = action.report(actionContext);
    
    // 6. Execute "every-turn" rulebook
    const everyTurnResults = this.executeRulebook('every-turn', ruleContext);
    
    // Combine all events
    const allEvents = [
      ...executeEvents,
      ...afterResults.flatMap(r => r.events || []),
      ...reportEvents,
      ...everyTurnResults.flatMap(r => r.events || [])
    ];
    
    return this.createTurnResult(turn, command, true, allEvents);
  }
}
```

## Standard Rules (stdlib)

### File Organization

```
stdlib/src/rules/
  index.ts           # Exports loadStandardRulebooks()
  before.ts          # Before rulebook with standard rules
  instead.ts         # Instead rulebook (usually empty)
  after.ts           # After rulebook with standard rules
  every-turn.ts      # Every turn rulebook with standard rules
```

### Example: before.ts

```typescript
// stdlib/src/rules/before.ts
import { Rulebook, Rule } from '@sharpee/engine';

export function createBeforeRulebook(): IRulebook {
  const rulebook = new Rulebook('before');
  
  // Implicit taking rule
  rulebook.addRule(new Rule({
    id: 'implicit-taking',
    order: 100,
    when: (ctx) => {
      const requiresHolding = ['eating', 'wearing', 'dropping'];
      if (!requiresHolding.includes(ctx.action)) return false;
      
      const item = ctx.command.directObject?.entity;
      if (!item) return false;
      
      return !ctx.world.isCarriedBy(item.id, ctx.actor.id);
    },
    run: (ctx) => {
      // Auto-take logic here
      return {
        events: [{
          type: 'action.implicit',
          data: { action: 'taking', item: ctx.command.directObject.entity.id }
        }]
      };
    }
  }));
  
  // Darkness prevention rule
  rulebook.addRule(new Rule({
    id: 'prevent-in-darkness',
    order: 50,
    when: (ctx) => {
      const requiresLight = ['examining', 'reading', 'searching'];
      return requiresLight.includes(ctx.action) && ctx.world.isDark(ctx.actor.location);
    },
    run: (ctx) => {
      return {
        prevent: true,
        events: [{
          type: 'action.prevented',
          data: { reason: 'too_dark', action: ctx.action }
        }]
      };
    }
  }));
  
  return rulebook;
}
```

### Loading Standard Rulebooks

```typescript
// stdlib/src/rules/index.ts
import { createBeforeRulebook } from './before';
import { createInsteadRulebook } from './instead';
import { createAfterRulebook } from './after';
import { createEveryTurnRulebook } from './every-turn';

export function loadStandardRulebooks(): IRulebook[] {
  return [
    createBeforeRulebook(),
    createInsteadRulebook(),
    createAfterRulebook(),
    createEveryTurnRulebook()
  ];
}
```

## Author API

### Story Integration

```typescript
// In a story file
export function configureStory(context: StoryContext) {
  // Add a whole new rulebook
  const puzzleRulebook = new Rulebook('puzzle-rules');
  context.addRulebook(puzzleRulebook);
  
  // Add rules to the new rulebook
  context.addRule(puzzleRulebook, new Rule({
    id: 'vase-requires-gloves',
    when: (ctx) => ctx.action === 'taking' && ctx.command.directObject?.entity?.id === 'vase',
    run: (ctx) => {
      if (!ctx.world.isWearing(ctx.actor.id, 'gloves')) {
        return {
          prevent: true,
          events: [{ type: 'text', data: { text: 'The vase is too delicate.' }}]
        };
      }
    }
  }));
  
  // Or add to existing standard rulebooks
  const beforeRulebook = context.getRulebook('before');
  if (beforeRulebook) {
    context.addRule(beforeRulebook, new Rule({
      id: 'story-specific-before',
      order: 150, // After standard rules
      when: (ctx) => /* condition */,
      run: (ctx) => /* effect */
    }));
  }
}
```

### Alternative Author API

```typescript
// More fluent API option
context.rulebooks
  .get('before')
  .add(new Rule({ /* ... */ }));

// Or with a builder pattern
context.rulebooks
  .create('my-rules')
  .addRule({
    id: 'my-rule',
    when: ctx => true,
    run: ctx => { /* ... */ }
  });
```

## Benefits of This Design

1. **Flexibility** - Rulebooks are just named containers, not hard-coded concepts
2. **Extensibility** - Stories can add new rulebooks for any purpose
3. **Simplicity** - Rules and rulebooks are simple interfaces/classes
4. **Discoverability** - Easy to see what rulebooks exist via the list
5. **Testability** - Each rule and rulebook can be tested in isolation
6. **Performance** - Only check rules in relevant rulebooks

## Execution Points

The engine checks specific rulebooks at known points:
- **"before"** - Before action validation
- **"instead"** - Before action execution (can replace)
- **"after"** - After action execution
- **"every-turn"** - End of turn
- **"when-play-begins"** - Game start
- **"when-play-ends"** - Game end

But stories can add custom rulebooks and check them at custom points via event handlers or other mechanisms.

## Next Steps

1. Define IRule and IRulebook interfaces in core
2. Implement Rule and Rulebook classes in engine
3. Update CommandExecutor to manage List<IRulebook>
4. Create standard rulebooks in stdlib/src/rules
5. Add author API to StoryContext
6. Migrate existing special-case logic to rules