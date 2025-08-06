# ADR-022: Extension Architecture

Date: 2025-07-12

## Status

Accepted

## Context

We need to determine how extensions integrate with the Sharpee platform, particularly:
- How extensions register actions and vocabulary
- How extensions add messages to the language provider
- Whether common features like scoring should be extensions or part of stdlib

During testing, we discovered that the scoring action implementation was incomplete, which led to a broader discussion about extension architecture.

## Decision

We will use a registry-based extension system where extensions:

1. **Register actions** with the action registry
2. **Register vocabulary** with the vocabulary registry  
3. **Add message templates** to the language provider
4. **Subscribe to events** for cross-cutting concerns

Extensions will be organized as separate packages (`@sharpee/ext-*`) rather than in a monolithic extensions package, allowing:
- Independent versioning
- Clear ownership/authorship
- Community contributions (`@author/sharpee-ext-*`)
- Selective loading by games

## Extension Integration Pattern

```typescript
export class ScoringExtension implements Extension {
  static manifest = {
    id: 'standard/scoring',
    capability: 'scoring',  // Declares which capability namespace this uses
    actions: [{
      id: 'SCORE',
      vocabulary: ['score', 'points', 'status'],
      execute: 'executeScore'
    }],
    events: {
      subscribeTo: ['TAKEN', 'PUZZLE_SOLVED'],
      emit: ['SCORE_CHANGED', 'SCORE_DISPLAYED']
    },
    messages: {
      'scoring.score_display': 'Your score is {score} out of {maxScore} points.',
      'scoring.no_score': "You haven't scored any points yet."
    },
    dataSchema: {  // Defines capability data structure
      scoreValue: { type: 'number', default: 0 },
      maxScore: { type: 'number', default: 0 },
      achievements: { type: 'array', items: 'string', default: [] }
    }
  };
  
  initialize(context: ExtensionContext) {
    // Register capability namespace and schema
    context.world.registerCapability(this.constructor.manifest.capability, {
      schema: this.constructor.manifest.dataSchema
    });
    
    // Auto-registration based on manifest
    context.registerFromManifest(this.constructor.manifest);
  }
}
```

## Capability Data Model

Extensions and standard library features use a capability-segregated data model where:

1. **World Model hosts all data** but segregates by capability
2. **Each capability owns its namespace** (e.g., `world.capabilities.scoring`)
3. **Data schemas are defined by capabilities** not enforced by core
4. **Text Service knows how to format capability data** through templates

Example access pattern:
```typescript
// Reading capability data
const score = context.world.capabilities.scoring?.data.scoreValue;

// Updating capability data
context.world.updateCapability('scoring', { 
  scoreValue: score + points 
});

// Emitting capability events
context.events.emit('capability:scoring:changed', {
  scoreValue: score + points,
  reason: 'puzzle_solved'
});
```

## Standard vs Extension Features

**Core Actions** (required for basic IF):
- LOOK, TAKE, DROP, GO, EXAMINE, INVENTORY

**Standard Actions** (common but optional, remain in stdlib):
- SCORE, SAVE, RESTORE, HELP, ABOUT, QUIT

**Extensions** (game-specific features):
- Combat systems
- Magic systems  
- Crafting systems
- Custom mechanics

## Consequences

### Positive
- Clean separation of concerns
- Extensions are truly optional
- Predictable behavior (unregistered commands fail appropriately)
- Games only include what they need
- Community can create custom extensions

### Negative
- More packages to manage
- Extension discovery might be harder
- Need to maintain extension registry/catalog

## Notes

The language provider already has comprehensive template support and scoring messages, suggesting scoring was originally considered core. We decided to keep it in stdlib as a standard action while using this exploration to validate the extension architecture.

## Related

- ADR-002: Multi-language support (how extensions add messages)
- ADR-016: Standard library design (what belongs in stdlib vs extensions)
