# @sharpee/ext-basic-combat

Generic skill-based combat extension for the Sharpee Interactive Fiction platform.

## Installation

```bash
npm install @sharpee/ext-basic-combat
```

## Overview

This extension provides opt-in combat resolution for both attack directions through one interceptor:

- **`BasicCombatInterceptor`** - registered on `CombatantTrait` + `if.action.attacking`; resolves the player's blows at an NPC and an NPC's blows at the player. An NPC attacks by running the real attacking action through the engine's execution entry (ADR-328 D5), so the same interceptor, the same rules, and the same messages apply whoever swings. A lethal blow on the player routes through `killPlayer`, the canonical death sink (ADR-227).
- **CombatService** - skill-based hit/damage resolution with validation
- **Combat messages** - message IDs and health-status helpers for reporting
- **One-call setup** - `registerBasicCombat()` registers the interceptor

Stories with custom combat register their own interceptor instead of calling `registerBasicCombat()`.

## Usage

```typescript
import { registerBasicCombat } from '@sharpee/ext-basic-combat';

// In your story's initializeWorld(world):
registerBasicCombat(world);
```

To register the interceptor on your own terms:

```typescript
import { TraitType } from '@sharpee/world-model';
import { BasicCombatInterceptor } from '@sharpee/ext-basic-combat';

// The binding is per-world and idempotent (ADR-208)
world.registerActionInterceptor(
  TraitType.COMBATANT,
  'if.action.attacking',
  BasicCombatInterceptor
);
```

An NPC that should fight back is a behavior that acts:

```typescript
engine.getNpcService().registerBehavior({
  id: 'brawler',
  onTurn(context) {
    const player = context.world.getPlayer();
    if (player && context.playerVisible) context.act('if.action.attacking', { directObject: player });
  },
});
```

The `CombatService` can be used directly for custom resolution:

```typescript
import { createCombatService, applyCombatResult } from '@sharpee/ext-basic-combat';

const combat = createCombatService();
const result = combat.resolveAttack(context);
const info = applyCombatResult(target, result, world);
```

## Related Packages

- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle
- [@sharpee/stdlib](https://www.npmjs.com/package/@sharpee/stdlib) - Standard actions and NPC combat resolver
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system, traits, action interceptors

## License

MIT
