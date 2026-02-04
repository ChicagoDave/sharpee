# Rulebook Architecture Assessment

## Date: 2025-08-22

## Overview
Analysis of how Inform 7's rulebook system should be adapted for Sharpee, based on examining Inform's rule structure and considering Sharpee's architecture.

## Key Insights from Inform 7

### Rulebooks vs Rule Types
- **Rulebooks** are thematic groupings of rules (e.g., "persuasion", "visibility", "every turn")
- **Rule types** (before/after/instead) describe when rules run relative to actions
- A rulebook can contain rules of different types
- The "every turn" is actually a rulebook, not just a rule type

### Inform's Rulebook Categories

1. **Action Rulebooks** - Govern how actions work
   - persuasion (NPCs doing things)
   - unsuccessful attempt by (failed NPC actions)
   - before (pre-action checks)
   - instead (action replacement)
   - after (post-action effects)

2. **Turn Sequence Rulebooks** - Control game flow
   - when play begins
   - every turn
   - when play ends

3. **Parser Rulebooks** - Handle command understanding
   - does the player mean (disambiguation)
   - supplying missing nouns
   - Various parser activities

4. **Description Rulebooks** - Control text output
   - printing names
   - listing contents
   - writing paragraphs about objects
   - locale descriptions

5. **Accessibility Rulebooks** - Judge reachability/visibility
   - reaching inside/outside
   - visibility

6. **Master Rulebooks** - Top-level control
   - startup rules
   - turn sequence rules
   - shutdown rules

## Proposed Sharpee Rulebook Architecture

### Core Rulebooks (Engine Level)

```typescript
interface RulebookSystem {
  // Action-related rulebooks
  before: Rulebook;         // Pre-action checks and modifications
  instead: Rulebook;        // Action replacement/cancellation
  after: Rulebook;          // Post-action effects

  // Turn sequence rulebooks  
  whenPlayBegins: Rulebook;
  everyTurn: Rulebook;
  whenPlayEnds: Rulebook;

  // Accessibility rulebooks
  visibility: Rulebook;     // Can the actor see the target?
  reachability: Rulebook;   // Can the actor reach the target?
}
```

### Description Rulebooks (Text Service Level)

```typescript
interface DescriptionRulebooks {
  // Object description
  printingName: Rulebook;          // How to print entity names
  printingDescription: Rulebook;   // How to describe entities
  
  // Room description
  printingRoomName: Rulebook;      // How to print room names
  printingLocale: Rulebook;        // How to describe room contents
  
  // Container/supporter description
  listingContents: Rulebook;       // How to list what's in/on things
  groupingTogether: Rulebook;      // How to group similar items
}
```

### Rule Structure

```typescript
interface Rule {
  id: string;
  order?: number;  // Default 100
  when: (context: RuleContext) => boolean;
  run: (context: RuleContext) => RuleResult | void;
}

interface Rulebook {
  name: string;           // e.g., "before", "everyTurn"
  rules: Rule[];
  
  add(rule: Rule): void;
  remove(ruleId: string): void;
  run(context: RuleContext): RuleResult[];
}
```

## Implementation Strategy

### 1. File Organization

```
stdlib/src/rules/
  before/              # Before rulebook and standard rules
    index.ts          # Rulebook definition
    implicit-taking.ts # Rule: auto-take before manipulating
    darkness.ts       # Rule: prevent actions in dark
  
  instead/            # Instead rulebook  
    index.ts
    standard-responses.ts
  
  after/              # After rulebook
    index.ts
    report-actions.ts # Standard action reporting
  
  every-turn/         # Every turn rulebook
    index.ts
    time-advancement.ts
    npc-movement.ts
  
  visibility/         # Visibility rulebook
    index.ts
    light-and-dark.ts
    containers.ts
  
  reachability/       # Reachability rulebook
    index.ts
    closed-containers.ts
    distance.ts
```

### 2. Loading Pattern

```typescript
// In engine/src/rulebooks/RulebookManager.ts
class RulebookManager {
  private rulebooks: Map<string, Rulebook> = new Map();

  constructor() {
    // Initialize core rulebooks
    this.createRulebook('before');
    this.createRulebook('instead');
    this.createRulebook('after');
    this.createRulebook('everyTurn');
    this.createRulebook('whenPlayBegins');
    this.createRulebook('whenPlayEnds');
    this.createRulebook('visibility');
    this.createRulebook('reachability');
  }

  loadStandardRules(): void {
    // Load rules from stdlib
    this.loadRulebookRules('before', loadBeforeRules());
    this.loadRulebookRules('after', loadAfterRules());
    // etc.
  }

  loadStoryRules(rules: StoryRules): void {
    // Add story-specific rules
    rules.before?.forEach(rule => 
      this.addRule('before', rule)
    );
    // etc.
  }
}
```

### 3. Command Executor Integration

```typescript
class CommandExecutor {
  constructor(private rulebooks: RulebookManager) {}

  async execute(command: ValidatedCommand): Promise<ISemanticEvent[]> {
    const context = this.createContext(command);
    
    // 1. Check visibility/reachability
    const visibilityResult = this.rulebooks.run('visibility', context);
    if (visibilityResult.some(r => r.prevent)) {
      return this.handlePreventedAction(visibilityResult);
    }

    // 2. Run before rules
    const beforeResult = this.rulebooks.run('before', context);
    if (beforeResult.some(r => r.prevent)) {
      return this.handlePreventedAction(beforeResult);
    }

    // 3. Run instead rules
    const insteadResult = this.rulebooks.run('instead', context);
    if (insteadResult.some(r => r.prevent || r.redirect)) {
      return this.handleInsteadAction(insteadResult);
    }

    // 4. Execute action
    const action = this.getAction(command.action);
    const validation = action.validate(context);
    if (!validation.valid) {
      return validation.events;
    }
    
    const executeEvents = action.execute(context);

    // 5. Run after rules
    const afterResult = this.rulebooks.run('after', context);
    
    // 6. Generate report
    const reportEvents = action.report(context);

    // 7. Run every turn rules
    const everyTurnResult = this.rulebooks.run('everyTurn', context);

    return this.combineEvents(
      executeEvents,
      afterResult,
      reportEvents,
      everyTurnResult
    );
  }
}
```

## Benefits of This Approach

1. **Separation of Concerns**
   - Engine manages rulebook execution
   - Stdlib provides standard rules
   - Stories add custom rules
   - Text service has its own description rulebooks

2. **Extensibility**
   - Extensions can add rules to existing rulebooks
   - New rulebooks can be created for special purposes
   - Rules are just data, easy to test

3. **Familiarity**
   - Authors familiar with Inform will understand the structure
   - Clear phases of execution
   - Predictable rule ordering

4. **Performance**
   - Rules only run when their `when` condition is true
   - Rulebooks can be optimized (indexing, caching)
   - Unused rulebooks can be omitted

## Open Questions

1. **Description Rulebooks**: Should these be part of the text service or stdlib?
   - Pro text service: Keeps presentation separate from logic
   - Pro stdlib: Standard descriptions are part of the game model

2. **Activity Pattern**: Should we implement Inform's activity pattern (before/during/after)?
   - Could be useful for complex operations like "listing contents"
   - Adds complexity

3. **Rule Priority**: Besides `order`, should rules have priority/specificity?
   - Inform uses "listed first/last" and specificity
   - Could help with rule conflicts

4. **Dynamic Rulebooks**: Should stories be able to create new rulebooks?
   - Useful for extensions and complex stories
   - Adds complexity to type safety

## Recommendation

Start with the core rulebooks (before, instead, after, everyTurn) and basic file structure. Implement standard rules incrementally as actions are migrated. Add description rulebooks when integrating with the text service. Keep the system simple initially - we can add activities and advanced features later if needed.

The key insight is that rulebooks are thematic groupings, not just execution phases. This allows for better organization and makes the system more extensible.