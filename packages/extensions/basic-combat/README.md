# @sharpee/ext-basic-combat

Generic skill-based combat extension for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/ext-basic-combat
```

## Overview

This extension provides opt-in combat resolution for both attack directions:

- **PC→NPC** - `BasicCombatInterceptor`, registered on `CombatantTrait` + `if.action.attacking`
- **NPC→PC** - `basicNpcResolver`, registered as the NPC combat resolver
- **CombatService** - skill-based hit/damage resolution with validation
- **Combat messages** - message IDs and health-status helpers for reporting
- **One-call setup** - `registerBasicCombat()` wires both directions at once

Stories with custom combat register their own interceptor and resolver instead of calling `registerBasicCombat()`.

## Usage

```typescript
import { registerBasicCombat } from '@sharpee/ext-basic-combat';

// In your story's initializeWorld(world):
registerBasicCombat(world);
```

To wire only one direction, register the individual components yourself:

```typescript
import { TraitType } from '@sharpee/world-model';
import { registerNpcCombatResolver } from '@sharpee/stdlib';
import {
  BasicCombatInterceptor,
  basicNpcResolver,
} from '@sharpee/ext-basic-combat';

// PC→NPC only — the binding is per-world and idempotent (ADR-208)
world.registerActionInterceptor(
  TraitType.COMBATANT,
  'if.action.attacking',
  BasicCombatInterceptor
);

// NPC→PC only
registerNpcCombatResolver(basicNpcResolver);
```

The `CombatService` can be used directly for custom resolution:

```typescript
import { createCombatService, applyCombatResult } from '@sharpee/ext-basic-combat';

const combat = createCombatService();
const result = combat.resolve(context);
applyCombatResult(result, info);
```

## Related Packages

- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard actions and NPC combat resolver
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system, traits, action interceptors

## License

MIT
