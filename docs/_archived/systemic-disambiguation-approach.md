# Systemic Disambiguation Design for Sharpee

## Executive Summary
Disambiguation is a cross-cutting concern that affects every action in an IF system. Rather than implementing disambiguation logic in each action, we need a centralized, extensible system that handles ambiguous entity references consistently across all interactions.

---

## Current State Analysis

### What We Have Now
The `CommandValidator` class includes basic disambiguation logic:

1. **Score-based resolution** - Entities are scored, highest score wins
2. **Threshold resolution** - If top score is 1.5x second score, use it
3. **Modifier matching** - Perfect modifier matches preferred
4. **Reachability filtering** - Prefer visible/reachable entities
5. **Pronoun tracking** - Basic "it"/"them" resolution

### Current Limitations
1. **No player interaction** - System guesses rather than asking for clarification
2. **Limited context** - Doesn't consider action-specific preferences
3. **No learning** - Doesn't track player preferences over time
4. **Action isolation** - Each action handles edge cases independently
5. **Poor error recovery** - When wrong entity chosen, no way to correct

---

## Proposed Architecture

### Core Components

```typescript
// 1. Disambiguation Service - Central orchestrator
interface DisambiguationService {
  // Resolve an ambiguous reference
  resolve(
    reference: EntityReference,
    context: DisambiguationContext
  ): Promise<DisambiguationResult>;
  
  // Record successful interactions for learning
  recordInteraction(entity: IFEntity, action: string): void;
  
  // Handle player's disambiguation response
  handleClarification(response: string): DisambiguationResult;
}

// 2. Context object with rich information
interface DisambiguationContext {
  action: Action;                    // The action being performed
  actor: IFEntity;                   // Who's performing the action
  world: WorldModel;                 // Current world state
  scope: ScopeInfo;                  // What's in scope
  recentInteractions: Interaction[]; // Recent command history
  conversationState?: any;           // Active conversation context
}

// 3. Flexible result that supports both immediate and deferred resolution
interface DisambiguationResult {
  type: 'resolved' | 'needs_clarification' | 'failed';
  entity?: IFEntity;                 // If resolved
  candidates?: CandidateInfo[];      // If needs clarification
  prompt?: ClarificationPrompt;      // How to ask the player
  confidence?: number;               // How sure we are
  reasoning?: string[];              // Why we chose (for debugging)
}
```

### Rule-Based Scoring System

Instead of hard-coded disambiguation logic, use a flexible rule system:

```typescript
abstract class DisambiguationRule {
  abstract readonly name: string;
  abstract readonly priority: number;
  
  // Score an entity in context (0-100)
  abstract score(
    entity: IFEntity,
    reference: EntityReference,
    context: DisambiguationContext
  ): RuleScore;
}

interface RuleScore {
  value: number;        // 0-100
  confidence: number;   // How sure this rule is
  reason: string;       // Human-readable explanation
}

// Example Rules
class ProximityRule extends DisambiguationRule {
  name = 'proximity';
  priority = 10;
  
  score(entity, ref, ctx): RuleScore {
    const playerLoc = ctx.world.getLocation(ctx.actor.id);
    const entityLoc = ctx.world.getLocation(entity.id);
    
    if (entityLoc === ctx.actor.id) {
      return { value: 100, confidence: 1.0, reason: 'held by actor' };
    }
    if (entityLoc === playerLoc) {
      return { value: 80, confidence: 0.9, reason: 'in same room' };
    }
    // ... more proximity logic
  }
}

class ActionAffinityRule extends DisambiguationRule {
  name = 'action_affinity';
  priority = 20;
  
  score(entity, ref, ctx): RuleScore {
    // Different actions prefer different entity states
    switch(ctx.action.id) {
      case 'taking':
        if (ctx.world.getLocation(entity.id) === ctx.actor.id) {
          return { value: 0, confidence: 0.9, reason: 'already held' };
        }
        break;
      case 'dropping':
        if (ctx.world.getLocation(entity.id) !== ctx.actor.id) {
          return { value: 0, confidence: 0.9, reason: 'not held' };
        }
        break;
      case 'opening':
        if (!entity.has('openable')) {
          return { value: 0, confidence: 1.0, reason: 'not openable' };
        }
        if (entity.get('openable')?.isOpen) {
          return { value: 20, confidence: 0.8, reason: 'already open' };
        }
        break;
    }
    return { value: 50, confidence: 0.5, reason: 'no action preference' };
  }
}

class RecentInteractionRule extends DisambiguationRule {
  name = 'recency';
  priority = 5;
  
  score(entity, ref, ctx): RuleScore {
    const recent = ctx.recentInteractions.findIndex(i => i.entityId === entity.id);
    if (recent === -1) {
      return { value: 40, confidence: 0.3, reason: 'not recently used' };
    }
    // More recent = higher score
    const recencyScore = 100 - (recent * 10);
    return { 
      value: Math.max(recencyScore, 50), 
      confidence: 0.7, 
      reason: `recently interacted (${recent + 1} commands ago)` 
    };
  }
}
```

### Integration Points

#### 1. Command Validation Layer
```typescript
class EnhancedCommandValidator {
  private disambiguator: DisambiguationService;
  
  async validate(command: IParsedCommand): Promise<ValidationResult> {
    // Resolve direct object
    if (command.directObject) {
      const result = await this.disambiguator.resolve(
        command.directObject,
        this.buildContext(command)
      );
      
      if (result.type === 'needs_clarification') {
        return {
          type: 'needs_input',
          prompt: result.prompt,
          state: { awaiting: 'disambiguation', candidates: result.candidates }
        };
      }
      
      if (result.type === 'failed') {
        return {
          type: 'error',
          message: `I don't see any ${command.directObject.text} here.`
        };
      }
      
      command.directObject.entity = result.entity;
    }
    
    // Continue with normal validation...
  }
}
```

#### 2. Action Execution Layer
Actions no longer need disambiguation logic:

```typescript
// BEFORE: Each action handles disambiguation
validate(context): ValidationResult {
  const noun = context.command.directObject?.entity;
  if (!noun) {
    // Action has to figure out what went wrong
    return { valid: false, error: 'no_target' };
  }
}

// AFTER: Entities pre-resolved by disambiguation service
validate(context): ValidationResult {
  const noun = context.command.directObject!.entity; // Guaranteed by validator
  // Action focuses on domain logic only
}
```

#### 3. Player Interaction Layer
```typescript
class InteractionManager {
  private pendingDisambiguation?: {
    service: DisambiguationService;
    candidates: CandidateInfo[];
  };
  
  async handleInput(input: string): Promise<Response> {
    // Check if we're waiting for disambiguation
    if (this.pendingDisambiguation) {
      const result = this.pendingDisambiguation.service
        .handleClarification(input);
      
      if (result.type === 'resolved') {
        // Continue with original command
        return this.executeWithEntity(result.entity);
      } else {
        // Still ambiguous or invalid response
        return this.promptAgain(result);
      }
    }
    
    // Normal command processing...
  }
}
```

### Advanced Features

#### 1. Contextual Clarification Prompts
Instead of generic "Which do you mean?" prompts:

```typescript
class SmartPromptGenerator {
  generate(candidates: CandidateInfo[], context: DisambiguationContext): string {
    // Group by distinguishing features
    const groups = this.groupByFeatures(candidates);
    
    if (groups.byLocation.size > 1) {
      return this.locationBasedPrompt(groups.byLocation);
      // "Do you mean the torch on the wall or the one in your pack?"
    }
    
    if (groups.byState.size > 1) {
      return this.stateBasedPrompt(groups.byState);
      // "Do you mean the lit torch or one of the unlit ones?"
    }
    
    if (groups.byOwnership.size > 1) {
      return this.ownershipPrompt(groups.byOwnership);
      // "Do you mean your torch or the guard's torch?"
    }
    
    // Fallback to enumeration
    return this.enumerateOptions(candidates);
  }
}
```

#### 2. Learning System
Track player preferences and adjust scoring:

```typescript
class LearningDisambiguator {
  private preferences: Map<string, PlayerPreference> = new Map();
  
  recordChoice(
    reference: string,
    chosen: IFEntity,
    alternatives: IFEntity[],
    context: DisambiguationContext
  ): void {
    const key = this.buildPreferenceKey(reference, context);
    const pref = this.preferences.get(key) || new PlayerPreference();
    
    pref.recordChoice(chosen, alternatives);
    this.preferences.set(key, pref);
  }
  
  adjustScores(
    scores: Map<IFEntity, number>,
    reference: string,
    context: DisambiguationContext
  ): void {
    const key = this.buildPreferenceKey(reference, context);
    const pref = this.preferences.get(key);
    
    if (pref) {
      for (const [entity, score] of scores) {
        const bias = pref.getBias(entity);
        scores.set(entity, score * bias);
      }
    }
  }
}
```

#### 3. Partial Matching & Synonyms
Handle variations in player input:

```typescript
class FlexibleMatcher {
  matches(reference: EntityReference, entity: IFEntity): MatchResult {
    // Exact match
    if (this.exactMatch(reference.text, entity.name)) {
      return { matches: true, confidence: 1.0 };
    }
    
    // Synonym match
    const synonyms = entity.get('vocabulary')?.synonyms || [];
    if (synonyms.some(s => this.exactMatch(reference.text, s))) {
      return { matches: true, confidence: 0.9 };
    }
    
    // Partial match ("rusty key" matches "rusty iron key")
    if (this.partialMatch(reference.text, entity.name)) {
      return { matches: true, confidence: 0.7 };
    }
    
    // Fuzzy match for typos
    if (this.fuzzyMatch(reference.text, entity.name, 0.8)) {
      return { matches: true, confidence: 0.5 };
    }
    
    return { matches: false, confidence: 0 };
  }
}
```

---

## Implementation Strategy

### Phase 1: Core Infrastructure (Week 1)
1. Create `DisambiguationService` interface and basic implementation
2. Implement core rules (Proximity, Visibility, ActionAffinity)
3. Integrate with `CommandValidator`
4. Add basic clarification prompts

### Phase 2: Enhanced Rules (Week 2)
1. Add sophisticated rules (Recency, Obviousness, Container)
2. Implement rule composition and weighting
3. Add confidence scoring
4. Create rule configuration system

### Phase 3: Player Interaction (Week 3)
1. Design clarification prompt templates
2. Implement smart prompt generation
3. Add disambiguation state management
4. Handle player responses

### Phase 4: Advanced Features (Week 4)
1. Implement learning system
2. Add partial/fuzzy matching
3. Create pronoun resolution
4. Add plural handling ("take all torches")

### Phase 5: Testing & Refinement (Week 5)
1. Create comprehensive test suite
2. Add disambiguation analytics
3. Performance optimization
4. Documentation and examples

---

## Migration Path

### For Existing Actions
1. Remove disambiguation logic from individual actions
2. Update validation to assume entities are pre-resolved
3. Simplify error messages (no need for "ambiguous" errors)
4. Add action-specific hints to DisambiguationService

### For New Actions
1. Define action affinity rules in metadata
2. Specify preferred entity states
3. No disambiguation code needed
4. Focus purely on domain logic

---

## Success Metrics

1. **Disambiguation accuracy**: >90% correct on first guess
2. **Clarification rate**: <10% of commands need clarification
3. **Response quality**: Natural, contextual prompts
4. **Performance**: <50ms for disambiguation decision
5. **Learning effectiveness**: 50% reduction in clarifications after 100 commands

---

## Risks and Mitigations

### Risk: Over-disambiguation
**Issue**: System asks too many questions, breaking game flow
**Mitigation**: Aggressive confidence thresholds, smart defaults

### Risk: Wrong guesses
**Issue**: System picks wrong entity, frustrating players
**Mitigation**: Easy correction mechanism, learning from mistakes

### Risk: Performance impact
**Issue**: Complex rules slow down command processing
**Mitigation**: Rule caching, early termination, async processing

### Risk: Author complexity
**Issue**: Too complicated for story authors to configure
**Mitigation**: Good defaults, optional customization, clear documentation

---

## Examples

### Example 1: Multiple Torches
```
> take torch
[Multiple torches in scope: wall torch (lit), pack torch (unlit), guard's torch (lit)]
[ProximityRule: pack torch scores 80 (in inventory)]
[ActionAffinityRule: wall torch scores 90 (not held, visible)]
[RecentInteractionRule: wall torch scores 70 (examined 2 turns ago)]
[Result: wall torch selected with 78% confidence]
You take the torch from the wall.

> take torch
[Learning system boosts wall torch preference]
Which torch do you mean?
1. The torch in your pack
2. The guard's torch

> 2
You cannot take the guard's torch while he's holding it!
```

### Example 2: Action-Specific Preference
```
> drop key
[Multiple keys: brass key (held), iron key (held), golden key (room)]
[ActionAffinityRule: golden key scores 0 (not held)]
[ProximityRule: brass and iron keys score 100 (held)]
[RecentInteractionRule: brass key scores 80 (just used)]
[Result: brass key selected with 85% confidence]
You drop the brass key.

> unlock door with key
[Multiple keys available]
[ActionAffinityRule: checks which keys might work]
[RecentInteractionRule: brass key just dropped]
[DoorKeyMatchRule: iron key matches door type]
[Result: iron key selected with 92% confidence]
You unlock the door with the iron key.
```

### Example 3: Learned Preferences
```
[After several sessions]
> x torch
[System learned player usually means "wall torch" in this room]
[Preference bias: wall torch +30%]
The torch on the wall burns steadily, casting dancing shadows.

> take it
[Pronoun resolution: "it" = last examined entity]
You take the torch from the wall.
```

---

## Conclusion

A systemic disambiguation service will:
1. **Reduce code duplication** across actions
2. **Improve player experience** with smart defaults and natural interactions
3. **Enable learning** from player behavior
4. **Simplify action development** by removing disambiguation concerns
5. **Provide consistency** across the entire game

This architecture positions Sharpee to handle the complex entity resolution requirements of modern IF while maintaining clean separation of concerns and extensibility for future enhancements.