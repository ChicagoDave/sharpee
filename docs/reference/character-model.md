# Character Model Guide (ADR-141)

## Overview

The character model gives NPCs rich internal state: personality, disposition, mood, threat, cognitive profiles, knowledge, beliefs, and goals. It is opt-in per NPC and drives all NPC behavior from a single source of truth.

**Key principle:** CharacterModelTrait is additive alongside NpcTrait. NpcTrait handles the lifecycle (alive, conscious, behavior hook). CharacterModelTrait adds behavioral depth.

## Quick Start

```typescript
import { CharacterBuilder, applyCharacter } from '@sharpee/character';
import { NpcTrait } from '@sharpee/world-model';

// In your story's initializeWorld():
const npc = world.createEntity('Margaret', 'actor');
npc.add(new NpcTrait({ isAlive: true, isConscious: true, behaviorId: 'margaret' }));

const compiled = new CharacterBuilder('margaret')
  .personality('very honest', 'very loyal', 'cowardly')
  .knows('murder', { witnessed: true })
  .loyalTo('lady-grey')
  .likes('player')
  .mood('nervous')
  .compile();

const trait = applyCharacter(npc, compiled);
```

## Package Structure

| Package | Layer | Contains |
|---------|-------|----------|
| `@sharpee/world-model` | 1 | `CharacterModelTrait`, vocabulary types, predicate registry |
| `@sharpee/stdlib` | 2 | `observeEvent()`, `processLucidityDecay()`, default state transitions |
| `@sharpee/character` | 3 | `CharacterBuilder`, cognitive presets, `applyCharacter()` |

## Builder API

### Personality (fixed at creation)

```typescript
.personality('very honest', 'cowardly', 'slightly paranoid')
```

Intensity words: `slightly` (0.2), `somewhat` (0.4), bare (0.6), `very` (0.8), `extremely` (0.95).

### Disposition (directed, toward a specific entity)

```typescript
.loyalTo('lady-grey')    // 'devoted to' = 90
.trusts('ally')          // 60
.likes('player')         // 40
.dislikes('villain')     // -60
.distrusts('stranger')   // 'wary of' = -30
```

### Mood (transient, undirected)

```typescript
.mood('nervous')
```

Available: `calm`, `content`, `cheerful`, `nervous`, `anxious`, `panicked`, `angry`, `furious`, `sad`, `grieving`, `suspicious`, `confused`, `resigned`.

### Threat (situational)

```typescript
.threat('wary')
```

Available: `safe`, `uneasy`, `wary`, `threatened`, `cornered`, `desperate`.

### Knowledge and Beliefs

```typescript
.knows('murder', { witnessed: true, confidence: 'certain' })
.believes('lady-grey-innocent', { strength: 'believes', resistance: 'reinterprets' })
```

### Goals

```typescript
.goal('protect-lady-grey', 10)
.goal('survive', 5)
```

Higher priority = more important. Goals are sorted automatically.

### Cognitive Profile

```typescript
// Named preset
.cognitiveProfile('schizophrenic')

// Partial override
.cognitiveProfile({ perception: 'filtered', coherence: 'drifting' })
```

Available presets: `stable`, `schizophrenic`, `ptsd`, `dementia`, `dissociative`, `tbi`, `obsessive`, `intoxicated`.

Five dimensions: `perception` (accurate/filtered/augmented), `beliefFormation` (flexible/rigid/resistant), `coherence` (focused/drifting/fragmented), `lucidity` (stable/fluctuating/episodic), `selfModel` (intact/uncertain/fractured).

### Lucidity Windows

```typescript
.lucidity({
  baseline: 'fragmented',
  triggers: {
    'player is calm': { target: 'lucid', transition: 'next turn' },
    'loud noise': { target: 'dissociative', transition: 'immediate' },
  },
  decay: 'gradual',
  decayRate: 'slow',   // slow=8 turns, moderate=4, fast=2
})
```

### Perception Filters and Hallucinations

```typescript
.cognitiveProfile('ptsd')
.filters({ misses: ['quiet actions'], amplifies: ['sudden movements'] })

.cognitiveProfile('schizophrenic')
.perceives('shadow-figure', {
  when: 'hallucinating',
  as: 'witnessed',
  content: 'shadow-figure',
})
```

### State Triggers

```typescript
.on('player threatens')
  .becomes('panicked')
  .feelsAbout('player', 'wary of')

.on('player shows evidence')
  .if('lied about murder')
  .becomes('cornered')
  .shift('threat', 'threatened')

.on('player gives medication')
  .becomesLucid()
  .becomes('calm')
```

Triggers can chain without `.done()` — the builder auto-finalizes on the next `.on()` or `.compile()`.

### Custom Predicates

```typescript
.definePredicate('drunk', (t) => t.knows('consumed-wine'))
```

## Observation System

Wire the observation handler in your NPC behavior:

```typescript
import { observeEvent } from '@sharpee/stdlib';

// In an NPC behavior's onObserve hook:
const events = observeEvent(npc, event, world, turnCount);
```

`observeEvent()` performs:
1. Cognitive filtering (filtered perception skips events, augmented injects hallucinations)
2. Adds witnessed facts to knowledge
3. Applies default state transition rules (violence increases threat, gifts improve disposition)
4. Checks lucidity triggers
5. Emits observable behavior events (`npc.character.mood_changed`, etc.)

### Default State Transitions

| Event Type | Threat | Mood | Disposition |
|-----------|--------|------|-------------|
| `npc.attacked` | +30 | -0.3 valence, +0.3 arousal | - |
| `if.action.attacking` | +20 | -0.2 valence, +0.2 arousal | - |
| `npc.killed` | +40 | -0.5 valence, +0.4 arousal | - |
| `if.action.giving` | - | +0.1 valence | +10 toward actor |
| `if.action.taking` | - | - | -5 toward actor |

Stories can provide custom rules via the `rules` parameter to `observeEvent()`.

### Lucidity Decay

Lucidity decay is automatically processed each turn via `NpcService.tick()` for NPCs with CharacterModelTrait. When a lucidity window expires, the cognitive profile returns to baseline.

## Predicates

Platform predicates are registered automatically:

| Predicate | Condition |
|-----------|-----------|
| `trusts player` | disposition toward 'player' > 50 |
| `likes player` | disposition toward 'player' > 30 |
| `dislikes player` | disposition toward 'player' < -30 |
| `threatened` | threat >= 60 |
| `cornered` | threat >= 80 |
| `safe` | threat <= 10 |
| `honest`, `cowardly`, etc. | personality trait > 0.4 |
| `calm`, `panicked`, etc. | current mood matches |
| `lucid` | lucidity state is 'lucid' or 'stable' |
| `hallucinating` | augmented perception and not lucid |
| `fragmented` | coherence is 'fragmented' |
| `dissociative` | self-model is 'fractured' |
| `belief resistant` | belief formation is 'resistant' |

All predicates support `not` negation: `trait.evaluate('not threatened')`.

## Story-Specific Vocabulary

```typescript
import { VocabularyExtension, CharacterBuilder } from '@sharpee/character';

const vocab = new VocabularyExtension();
vocab.defineMood('lovesick', 0.3, 0.6);
vocab.definePersonality('righteous');

const compiled = new CharacterBuilder('npc')
  .withVocabulary(vocab)
  .mood('lovesick')
  .compile();
```

## Key Files

| File | Purpose |
|------|---------|
| `packages/world-model/src/traits/character-model/character-vocabulary.ts` | All vocabulary types and maps |
| `packages/world-model/src/traits/character-model/characterModelTrait.ts` | Trait class with state and predicates |
| `packages/stdlib/src/npc/character-observer.ts` | Observation handler with cognitive filtering |
| `packages/stdlib/src/npc/lucidity-decay.ts` | End-of-turn lucidity processing |
| `packages/character/src/character-builder.ts` | Fluent builder API |
| `packages/character/src/cognitive-presets.ts` | Named profile presets |
| `packages/character/src/apply.ts` | `applyCharacter()` helper |

## Related ADRs

- **ADR-141**: Character Model (this implementation)
- **ADR-142**: Conversation System (consumes the character model, not yet implemented)
- **ADR-070**: NPC System Architecture (behavior hooks)
- **ADR-090**: Entity-Centric Action Dispatch
