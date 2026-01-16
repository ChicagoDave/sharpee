# Extension Development Guide

> **BETA** (v0.9.2): The extension system is functional. Create story extensions with custom actions, traits, and behaviors.

Create reusable packages that extend Sharpee's functionality with new actions, capabilities, and behaviors.

## Overview

Extensions are modular packages that add features to Sharpee without modifying the core platform. They can provide:

- **Custom Actions** - New player commands
- **Capabilities** - Game mechanics and state
- **Traits** - Entity behaviors
- **Language Templates** - Text generation

## Getting Started

### Prerequisites

- Node.js 18+ and pnpm 8+
- TypeScript knowledge
- Understanding of Sharpee's architecture
- npm account (for publishing)

### Extension Template

```bash
# Clone the extension template (coming soon)
git clone https://github.com/sharpee/extension-template.git my-extension
cd my-extension

# Install dependencies
pnpm install

# Link to local Sharpee for development
pnpm link ../path/to/sharpee
```

## Extension Structure

```
my-extension/
├── src/
│   ├── index.ts         # Main export
│   ├── actions/         # Custom actions
│   ├── capabilities/    # Capability schemas
│   ├── traits/          # Custom traits
│   └── language/        # Message templates
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

## Creating an Extension

### 1. Define Your Extension

```typescript
// src/index.ts
import { Extension, ExtensionContext } from '@sharpee/world-model';
import { CombatCapabilitySchema } from './capabilities/combat';
import { AttackAction } from './actions/attack';

export class CombatExtension implements Extension {
  static manifest = {
    id: 'ext-combat',
    name: 'Combat System',
    version: '1.0.0',
    capabilities: ['combat'],
    actions: ['ATTACK', 'DEFEND', 'FLEE'],
    traits: ['COMBATANT', 'WEAPON', 'ARMOR']
  };

  initialize(context: ExtensionContext): void {
    // Register capability
    context.world.registerCapability('combat', {
      schema: CombatCapabilitySchema
    });

    // Register actions
    context.actions.register(new AttackAction());
    
    // Add language templates
    context.language.addTemplates({
      'combat.attack.success': '{attacker} hits {target} for {damage} damage!',
      'combat.attack.miss': '{attacker} misses {target}.'
    });
  }
}
```

### 2. Implement Custom Actions

```typescript
// src/actions/attack.ts
import { ActionExecutor, ActionContext } from '@sharpee/stdlib';
import { createEvent, SemanticEvent } from '@sharpee/core';
import { ValidatedCommand } from '@sharpee/world-model';

export class AttackAction implements ActionExecutor {
  id = 'ATTACK';
  aliases = ['attack', 'hit', 'strike', 'fight'];

  execute(command: ValidatedCommand, context: ActionContext): SemanticEvent[] {
    const target = command.directObject?.entity;
    
    if (!target) {
      return [createEvent('ACTION_FAILED', {
        action: this.id,
        reason: 'no_target',
        messageKey: 'combat.attack.no_target'
      })];
    }

    // Get combat capability
    const combatData = context.getCapability('combat');
    if (!combatData || !combatData.inCombat) {
      return [createEvent('ACTION_FAILED', {
        action: this.id,
        reason: 'not_in_combat',
        messageKey: 'combat.not_in_combat'
      })];
    }

    // Calculate attack outcome
    const damage = this.calculateDamage(context.player, target);
    
    return [createEvent('ATTACKED', {
      attacker: context.player.id,
      target: target.id,
      damage,
      messageKey: damage > 0 ? 'combat.attack.success' : 'combat.attack.miss'
    })];
  }

  private calculateDamage(attacker: any, target: any): number {
    // Combat logic here
    return Math.floor(Math.random() * 10);
  }
}
```

### 3. Define Capabilities

```typescript
// src/capabilities/combat.ts
import { CapabilitySchema } from '@sharpee/world-model';

export const CombatCapabilitySchema: CapabilitySchema = {
  inCombat: {
    type: 'boolean',
    default: false,
    required: true
  },
  combatants: {
    type: 'array',
    default: [],
    required: true
  },
  turnOrder: {
    type: 'array',
    default: [],
    required: false
  },
  currentTurn: {
    type: 'number',
    default: 0,
    required: false
  }
};

export interface CombatData {
  inCombat: boolean;
  combatants: string[];
  turnOrder?: string[];
  currentTurn?: number;
}
```

### 4. Create Custom Traits

```typescript
// src/traits/weapon.ts
import { Trait, TraitType } from '@sharpee/world-model';

export interface WeaponTrait extends Trait {
  type: 'WEAPON';
  damage: number;
  damageType: 'slashing' | 'piercing' | 'bludgeoning';
  twoHanded?: boolean;
}

export class WeaponBehavior {
  static onEquip(entity: any, world: any): void {
    // Update combat stats when equipped
  }

  static onUnequip(entity: any, world: any): void {
    // Remove combat bonuses
  }
}
```

### 5. Add Language Templates

```typescript
// src/language/en-US.ts
export const combatTemplates = {
  'combat.started': 'Combat begins!',
  'combat.ended': 'The battle is over.',
  'combat.turn': "It's {actor}'s turn.",
  'combat.attack.critical': 'Critical hit! {attacker} deals {damage} damage to {target}!',
  'combat.defend.success': '{actor} takes a defensive stance.',
  'combat.flee.success': '{actor} flees from combat!',
  'combat.flee.failed': "{actor} couldn't escape!"
};
```

## Best Practices

### 1. Namespace Your IDs

Prevent conflicts with other extensions:

```typescript
// ✅ Good - Namespaced
const ATTACK_ACTION = 'combat:attack';
const WEAPON_TRAIT = 'combat:weapon';

// ❌ Bad - Generic names
const ATTACK_ACTION = 'attack'; // Could conflict!
```

### 2. Declare Dependencies

```json
{
  "name": "@my-org/sharpee-ext-combat",
  "peerDependencies": {
    "@sharpee/core": "^0.1.0",
    "@sharpee/world-model": "^0.1.0",
    "@sharpee/stdlib": "^0.1.0"
  },
  "sharpee": {
    "type": "extension",
    "requires": ["scoring", "inventory"]
  }
}
```

### 3. Provide Configuration Options

```typescript
export interface CombatConfig {
  difficulty: 'easy' | 'normal' | 'hard';
  criticalHitChance: number;
  fleeDifficulty: number;
}

export class CombatExtension implements Extension {
  constructor(private config: CombatConfig = defaultConfig) {}
  
  initialize(context: ExtensionContext): void {
    // Use config values
  }
}
```

### 4. Write Comprehensive Tests

```typescript
describe('CombatExtension', () => {
  let world: WorldModel;
  let extension: CombatExtension;

  beforeEach(() => {
    world = new WorldModel();
    extension = new CombatExtension();
    extension.initialize({ world, /* ... */ });
  });

  test('attack action requires combat mode', () => {
    const events = attackAction.execute(command, context);
    expect(events[0].type).toBe('ACTION_FAILED');
    expect(events[0].data.reason).toBe('not_in_combat');
  });
});
```

### 5. Document Everything

Include in your README:
- What the extension does
- How to install and configure
- Available actions and their syntax
- Capability data structure
- Examples of usage
- API reference

## Publishing Your Extension

### 1. Prepare Package

```json
{
  "name": "@your-org/sharpee-ext-combat",
  "version": "1.0.0",
  "description": "Combat system for Sharpee IF",
  "keywords": ["sharpee", "extension", "combat", "interactive-fiction"],
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md", "LICENSE"],
  "scripts": {
    "build": "tsc",
    "test": "jest",
    "prepublishOnly": "pnpm build && pnpm test"
  }
}
```

### 2. Build and Test

```bash
# Build the extension
pnpm build

# Run tests
pnpm test

# Test locally with npm link
pnpm link

# In a Sharpee project
pnpm link @your-org/sharpee-ext-combat
```

### 3. Publish to npm

```bash
# Login to npm
npm login

# Publish
npm publish --access public
```

## Extension Ideas

Looking for inspiration? Here are some extension ideas:

- **Magic System** - Spells, mana, enchantments
- **Economy** - Money, shops, trading
- **Crafting** - Combine items to create new ones
- **Time System** - Day/night cycles, schedules
- **Weather** - Dynamic weather effects
- **Emotions** - NPC mood and relationship tracking
- **Puzzles** - Reusable puzzle mechanics
- **Vehicles** - Cars, boats, spaceships
- **Skills** - Character advancement system
- **Multiplayer** - Multiple player characters

## Integration with Stories

Stories use extensions by installing and initializing them:

```typescript
// In a story file
import { CombatExtension } from '@your-org/sharpee-ext-combat';

// During world setup
const combat = new CombatExtension({ difficulty: 'hard' });
combat.initialize(extensionContext);

// Now combat actions are available!
```

## Resources

- [Platform Development Guide](../platform/README.md)
- [API Documentation](../api/)

## Getting Help

- Browse [existing extensions](https://www.npmjs.com/search?q=sharpee-ext)
- Ask in Discord (coming soon)
- Open an issue for bugs

---

Happy extending! 🧩
