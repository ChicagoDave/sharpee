# Extension Development Guide

This guide covers creating extensions for the Sharpee platform, from basic concepts to publishing your extension.

## Understanding Extensions

Extensions add new functionality to Sharpee without modifying the core platform. They can provide:

- **Custom Actions**: New commands for players
- **Traits**: New behaviors for entities
- **Event Handlers**: Custom game logic
- **Grammar Rules**: Language parsing extensions
- **Capabilities**: New game state systems

## Extension Architecture

### Core Concepts

1. **Isolation**: Extensions run in isolation from each other
2. **Registration**: Extensions register their components with the platform
3. **Event-Driven**: All state changes happen through events
4. **Type Safety**: Full TypeScript support with strict typing

### Extension Lifecycle

```typescript
// 1. Extension Definition
export class MyExtension implements IExtension {
  id = 'my-extension';
  version = '1.0.0';
  
  // 2. Registration Phase
  register(registry: IExtensionRegistry): void {
    registry.registerAction(new MyAction());
    registry.registerTrait('my-trait', MyTrait);
    registry.registerEventHandler('MY_EVENT', this.handleMyEvent);
  }
  
  // 3. Initialization Phase
  initialize(context: IExtensionContext): void {
    // Set up extension state
    // Register capabilities
    // Add grammar rules
  }
  
  // 4. Runtime Phase
  handleMyEvent(event: IEvent, world: IWorldModel): IEvent[] {
    // Process events during gameplay
  }
}
```

## Creating Your First Extension

### Step 1: Project Setup

```bash
# Create extension directory
mkdir sharpee-extension-magic
cd sharpee-extension-magic

# Initialize package
npm init -y

# Install dependencies
npm install --save-peer @sharpee/core @sharpee/world-model @sharpee/stdlib
npm install --save-dev typescript vitest @types/node

# Create TypeScript config
npx tsc --init
```

### Step 2: Package Configuration

```json
{
  "name": "@yourname/sharpee-extension-magic",
  "version": "1.0.0",
  "description": "Magic system for Sharpee",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist", "README.md"],
  "scripts": {
    "build": "tsc",
    "test": "vitest run",
    "prepublishOnly": "npm run build && npm test"
  },
  "peerDependencies": {
    "@sharpee/core": "^0.1.0",
    "@sharpee/world-model": "^0.1.0",
    "@sharpee/stdlib": "^0.1.0"
  },
  "keywords": ["sharpee", "extension", "magic", "interactive-fiction"],
  "author": "Your Name",
  "license": "MIT"
}
```

### Step 3: Extension Structure

```
sharpee-extension-magic/
├── src/
│   ├── index.ts           # Main extension export
│   ├── actions/           # Custom actions
│   │   ├── cast-spell.ts
│   │   └── learn-spell.ts
│   ├── traits/            # Custom traits
│   │   ├── magical.ts
│   │   └── spellbook.ts
│   ├── events/            # Event definitions
│   │   └── magic-events.ts
│   ├── capabilities/      # Capability schemas
│   │   └── magic-system.ts
│   └── grammar/          # Grammar rules
│       └── magic-grammar.ts
├── tests/
│   ├── actions.test.ts
│   └── integration.test.ts
├── package.json
├── tsconfig.json
└── README.md
```

## Implementing Custom Actions

### Action Interface

```typescript
// src/actions/cast-spell.ts
import { 
  IAction, 
  IActionContext, 
  ISemanticEvent,
  IValidatedCommand 
} from '@sharpee/core';
import { ValidationResult } from '@sharpee/stdlib';

export class CastSpellAction implements IAction {
  id = 'magic:cast-spell';
  aliases = ['cast', 'invoke', 'chant'];
  
  validate(context: IActionContext): ValidationResult {
    const { command, world } = context;
    
    // Check if player knows the spell
    const spellName = command.directObject?.text;
    const knownSpells = world.getCapability('magic')?.knownSpells || [];
    
    if (!knownSpells.includes(spellName)) {
      return {
        valid: false,
        reason: 'unknown-spell',
        messageKey: 'magic.spell.unknown'
      };
    }
    
    // Check if player has enough mana
    const manaCost = this.getManaCost(spellName);
    const currentMana = world.getCapability('magic')?.mana || 0;
    
    if (currentMana < manaCost) {
      return {
        valid: false,
        reason: 'insufficient-mana',
        messageKey: 'magic.mana.insufficient'
      };
    }
    
    return { valid: true };
  }
  
  execute(context: IActionContext): ISemanticEvent[] {
    const { command, world } = context;
    const spellName = command.directObject?.text;
    const target = command.indirectObject?.entity;
    
    return [
      {
        type: 'SPELL_CAST',
        data: {
          spell: spellName,
          caster: context.actor.id,
          target: target?.id,
          manaCost: this.getManaCost(spellName)
        }
      }
    ];
  }
  
  private getManaCost(spell: string): number {
    const costs: Record<string, number> = {
      'light': 1,
      'fireball': 3,
      'teleport': 5
    };
    return costs[spell] || 1;
  }
}
```

## Creating Custom Traits

### Trait Definition

```typescript
// src/traits/magical.ts
import { ITrait, IBehavior, IEntity } from '@sharpee/world-model';

export interface MagicalTrait extends ITrait {
  type: 'magical';
  magicLevel: number;
  alignment: 'good' | 'neutral' | 'evil';
  aura?: string;
}

export class MagicalBehavior implements IBehavior {
  static canBeExamined(entity: IEntity): boolean {
    const trait = entity.traits.find(t => t.type === 'magical') as MagicalTrait;
    return trait?.magicLevel > 0;
  }
  
  static onExamine(entity: IEntity): string {
    const trait = entity.traits.find(t => t.type === 'magical') as MagicalTrait;
    if (trait?.aura) {
      return `It glows with a ${trait.aura} aura.`;
    }
    return 'It radiates magical energy.';
  }
  
  static onTouch(entity: IEntity, actor: IEntity): ISemanticEvent[] {
    const trait = entity.traits.find(t => t.type === 'magical') as MagicalTrait;
    
    if (trait?.alignment === 'evil') {
      return [{
        type: 'DAMAGE_TAKEN',
        data: {
          actor: actor.id,
          amount: trait.magicLevel,
          source: entity.id,
          damageType: 'magical'
        }
      }];
    }
    
    return [];
  }
}
```

## Event Handlers

### Defining Custom Events

```typescript
// src/events/magic-events.ts
export const MagicEvents = {
  SPELL_CAST: 'magic:spell-cast',
  SPELL_LEARNED: 'magic:spell-learned',
  MANA_CHANGED: 'magic:mana-changed',
  ENCHANTMENT_APPLIED: 'magic:enchantment-applied',
  ENCHANTMENT_REMOVED: 'magic:enchantment-removed'
} as const;

export interface SpellCastEvent extends ISemanticEvent {
  type: 'magic:spell-cast';
  data: {
    spell: string;
    caster: string;
    target?: string;
    manaCost: number;
  };
}
```

### Handling Events

```typescript
// src/handlers/spell-handler.ts
export class SpellHandler {
  handleSpellCast(event: SpellCastEvent, world: IWorldModel): ISemanticEvent[] {
    const { spell, caster, target } = event.data;
    const results: ISemanticEvent[] = [];
    
    // Deduct mana
    const magic = world.getCapability('magic');
    magic.mana -= event.data.manaCost;
    world.updateCapability('magic', magic);
    
    // Apply spell effects
    switch(spell) {
      case 'light':
        results.push({
          type: 'ROOM_LIT',
          data: { room: world.getEntityLocation(caster) }
        });
        break;
        
      case 'fireball':
        if (target) {
          results.push({
            type: 'DAMAGE_DEALT',
            data: { 
              target, 
              amount: 10, 
              damageType: 'fire' 
            }
          });
        }
        break;
        
      case 'teleport':
        results.push({
          type: 'ENTITY_MOVED',
          data: { 
            entity: caster, 
            destination: target || 'entrance' 
          }
        });
        break;
    }
    
    return results;
  }
}
```

## Capabilities

### Defining Extension State

```typescript
// src/capabilities/magic-system.ts
import { ICapabilitySchema } from '@sharpee/world-model';

export const MagicCapabilitySchema: ICapabilitySchema = {
  mana: {
    type: 'number',
    default: 10,
    min: 0,
    max: 100
  },
  maxMana: {
    type: 'number',
    default: 10,
    min: 1,
    max: 100
  },
  knownSpells: {
    type: 'array',
    items: 'string',
    default: []
  },
  activeEnchantments: {
    type: 'array',
    items: {
      spell: 'string',
      duration: 'number',
      target: 'string'
    },
    default: []
  }
};

export interface MagicCapability {
  mana: number;
  maxMana: number;
  knownSpells: string[];
  activeEnchantments: Array<{
    spell: string;
    duration: number;
    target: string;
  }>;
}
```

## Grammar Extensions

### Adding Parse Rules

```typescript
// src/grammar/magic-grammar.ts
import { IGrammarRule, ISemanticGrammar } from '@sharpee/if-domain';

export const magicGrammar: ISemanticGrammar = {
  rules: [
    {
      pattern: 'cast {spell}',
      action: 'magic:cast-spell',
      mapping: {
        directObject: '{spell}'
      }
    },
    {
      pattern: 'cast {spell} at/on {target}',
      action: 'magic:cast-spell',
      mapping: {
        directObject: '{spell}',
        indirectObject: '{target}'
      }
    },
    {
      pattern: 'learn {spell} from {source}',
      action: 'magic:learn-spell',
      mapping: {
        directObject: '{spell}',
        indirectObject: '{source}'
      }
    },
    {
      pattern: 'meditate',
      action: 'magic:meditate'
    }
  ],
  
  vocabulary: {
    spells: ['light', 'fireball', 'teleport', 'heal', 'shield'],
    magicVerbs: ['enchant', 'dispel', 'summon', 'banish']
  }
};
```

## Testing Your Extension

### Unit Tests

```typescript
// tests/actions.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { CastSpellAction } from '../src/actions/cast-spell';
import { createMockWorld, createMockContext } from '@sharpee/test-utils';

describe('CastSpellAction', () => {
  let action: CastSpellAction;
  let world: MockWorldModel;
  let context: IActionContext;
  
  beforeEach(() => {
    action = new CastSpellAction();
    world = createMockWorld();
    context = createMockContext({ world });
    
    // Set up magic capability
    world.setCapability('magic', {
      mana: 10,
      maxMana: 10,
      knownSpells: ['light', 'fireball']
    });
  });
  
  it('should validate known spells', () => {
    context.command = {
      action: 'cast',
      directObject: { text: 'light' }
    };
    
    const result = action.validate(context);
    expect(result.valid).toBe(true);
  });
  
  it('should reject unknown spells', () => {
    context.command = {
      action: 'cast',
      directObject: { text: 'meteor' }
    };
    
    const result = action.validate(context);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('unknown-spell');
  });
  
  it('should check mana requirements', () => {
    world.setCapability('magic', { mana: 0 });
    context.command = {
      action: 'cast',
      directObject: { text: 'fireball' }
    };
    
    const result = action.validate(context);
    expect(result.valid).toBe(false);
    expect(result.reason).toBe('insufficient-mana');
  });
  
  it('should generate spell cast event', () => {
    context.command = {
      action: 'cast',
      directObject: { text: 'light' }
    };
    
    const events = action.execute(context);
    expect(events).toHaveLength(1);
    expect(events[0].type).toBe('SPELL_CAST');
    expect(events[0].data.spell).toBe('light');
  });
});
```

### Integration Tests

```typescript
// tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import { MagicExtension } from '../src';
import { createTestWorld, runCommand } from '@sharpee/test-utils';

describe('Magic Extension Integration', () => {
  it('should integrate with story', async () => {
    const world = createTestWorld();
    const extension = new MagicExtension();
    
    // Register extension
    world.registerExtension(extension);
    
    // Create magical items
    world.createEntity({
      id: 'wand',
      name: 'magic wand',
      traits: [
        { type: 'takeable' },
        { type: 'magical', magicLevel: 5, alignment: 'good' }
      ]
    });
    
    // Test commands
    const result1 = await runCommand(world, 'take wand');
    expect(result1.success).toBe(true);
    
    const result2 = await runCommand(world, 'cast light');
    expect(result2.success).toBe(true);
    expect(result2.events).toContainEqual(
      expect.objectContaining({ type: 'ROOM_LIT' })
    );
  });
});
```

## Publishing Your Extension

### 1. Documentation

Create comprehensive README:

```markdown
# Sharpee Magic Extension

Adds a magic system to your Sharpee stories.

## Installation

\`\`\`bash
npm install @yourname/sharpee-extension-magic
\`\`\`

## Usage

\`\`\`typescript
import { MagicExtension } from '@yourname/sharpee-extension-magic';

const story = {
  extensions: [
    new MagicExtension({
      startingMana: 20,
      manaRegenRate: 1
    })
  ]
};
\`\`\`

## Features

- Spell casting system
- Mana management
- Magical items and traits
- Enchantments
- Spell learning

## Commands

- `cast [spell]` - Cast a spell
- `cast [spell] at [target]` - Targeted spell
- `learn [spell] from [source]` - Learn new spell
- `meditate` - Restore mana

## Configuration

... etc
```

### 2. Build and Test

```bash
# Build TypeScript
npm run build

# Run all tests
npm test

# Check package contents
npm pack --dry-run
```

### 3. Publish to npm

```bash
# First time setup
npm login

# Publish
npm publish --access public
```

## Best Practices

### 1. Namespace Everything

Prevent conflicts with other extensions:

```typescript
// Good - namespaced
const CAST_SPELL = 'magic:cast-spell';
const MAGICAL_TRAIT = 'magic:magical';

// Bad - too generic
const CAST = 'cast';  // Might conflict!
```

### 2. Use Semantic Events

```typescript
// Good - semantic event
{
  type: 'SPELL_CAST',
  data: { spell, caster, target }
}

// Bad - generic event
{
  type: 'ACTION',
  data: { what: 'cast', ... }
}
```

### 3. Validate Thoroughly

```typescript
validate(context: IActionContext): ValidationResult {
  // Check prerequisites
  if (!this.hasRequiredItem(context)) {
    return { valid: false, reason: 'missing-item' };
  }
  
  // Check state
  if (!this.isValidState(context)) {
    return { valid: false, reason: 'invalid-state' };
  }
  
  // Check target
  if (!this.isValidTarget(context)) {
    return { valid: false, reason: 'invalid-target' };
  }
  
  return { valid: true };
}
```

### 4. Handle Edge Cases

```typescript
execute(context: IActionContext): ISemanticEvent[] {
  try {
    // Main logic
    return this.performAction(context);
  } catch (error) {
    // Graceful failure
    return [{
      type: 'ACTION_FAILED',
      data: {
        action: this.id,
        reason: error.message,
        messageKey: 'magic.error.generic'
      }
    }];
  }
}
```

### 5. Provide Extensibility

```typescript
export class MagicExtension {
  // Allow customization
  constructor(private config: MagicConfig = defaultConfig) {}
  
  // Expose hooks
  registerSpell(spell: ISpell): void {
    this.spells.set(spell.id, spell);
  }
  
  // Allow overrides
  protected calculateDamage(spell: ISpell): number {
    return this.config.damageCalculator?.(spell) 
      || spell.baseDamage;
  }
}
```

## Troubleshooting

### Common Issues

1. **Extension not loading**
   - Check registration in story
   - Verify package installation
   - Check for initialization errors

2. **Actions not recognized**
   - Verify action registration
   - Check grammar rules
   - Test parser directly

3. **Events not handled**
   - Check event handler registration
   - Verify event types match
   - Check handler return values

4. **State not persisting**
   - Register capability schema
   - Use world.updateCapability()
   - Check save/restore integration

---

Ready to build your extension? Check out the [Extension Template](https://github.com/sharpee/extension-template) or explore [Example Extensions](../../examples/extensions/)!