# @sharpee/character

Character model builder for the Sharpee Interactive Fiction platform (ADR-141).

## Installation

```bash
npm install @sharpee/character
```

## Overview

A fluent builder API for defining NPCs with rich internal state. Authors describe a character in words; the builder compiles to `CharacterModelTrait` data consumed by `@sharpee/world-model`:

- **`CharacterBuilder`** - Personality, mood, threat level, dispositions, knowledge/beliefs, cognitive profile, and custom predicates.
- **Triggers** - `.on(event)` chains (`TriggerBuilder`) compile to state mutations like mood shifts and disposition changes.
- **Cognitive presets** - `COGNITIVE_PRESETS` and `VocabularyExtension` for custom moods and personalities.
- **`applyCharacter()`** - Attaches the compiled character to an entity and returns the trait plus behavior config.
- **Behavior systems** - Conversation (ADR-142), information propagation (ADR-144), goal pursuit (ADR-145), and influence (ADR-146), each with its own builder and tick-phase handler.

## Usage

```typescript
import { CharacterBuilder, applyCharacter } from '@sharpee/character';
import { ThreatLevel } from '@sharpee/world-model';

const guard = new CharacterBuilder('castle-guard')
  .personality('very honest', 'cowardly')
  .mood('wary')
  .threat(ThreatLevel.NONE)
  .loyalTo('king')
  .distrusts('player')
  .knows('the postern gate is unlocked', { witnessed: true })
  .on('player threatens')
    .becomes('panicked')
    .feelsAbout('player', 'afraid of')
    .shift('threat', ThreatLevel.HIGH)
    .done()
  .compile();

// Attach to the NPC entity in your world initializer
const applied = applyCharacter(guardEntity, guard);
// applied.trait, applied.goalDefs, applied.influenceDefs, …
```

## Related Packages

- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Hosts `CharacterModelTrait` and the personality/mood/threat types
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard actions NPCs interact with
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
