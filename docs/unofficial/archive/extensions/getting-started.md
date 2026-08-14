# Extension Development Guide

This guide is for developers creating reusable Sharpee extensions.

## What Are Extensions?

Extensions add new capabilities to Sharpee:
- Custom traits (e.g., magical, combustible, sentient)
- New actions (e.g., cast spell, light fire, talk)  
- Game systems (e.g., combat, magic, conversation)

## Getting Started

### 1. Create Your Extension

```bash
mkdir sharpee-extension-magic
cd sharpee-extension-magic
npm init -y
```

### 2. Install Sharpee as Peer Dependencies

```bash
npm install --save-peer @sharpee/core @sharpee/world-model
npm install --save-dev @sharpee/core @sharpee/world-model typescript
```

### 3. Configure TypeScript

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "declaration": true,
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"]
}
```

### 4. Configure Package.json

```json
{
  "name": "@yourname/sharpee-magic",
  "version": "0.1.0",
  "type": "module",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  },
  "peerDependencies": {
    "@sharpee/core": "^0.1.0",
    "@sharpee/world-model": "^0.1.0"
  }
}
```

## Creating a Custom Trait

```typescript
// src/traits/magical.ts
import { Trait, Entity } from '@sharpee/core';

export interface MagicalData {
  mana: number;
  maxMana: number;
  spells: string[];
}

export const MagicalTrait: Trait<MagicalData> = {
  id: 'MAGICAL',
  
  defaultData: {
    mana: 10,
    maxMana: 10,
    spells: []
  },
  
  behaviors: {
    canCastSpell(entity: Entity, spell: string): boolean {
      const data = entity.traits.MAGICAL as MagicalData;
      return data.spells.includes(spell) && data.mana > 0;
    },
    
    castSpell(entity: Entity, spell: string): void {
      const data = entity.traits.MAGICAL as MagicalData;
      if (this.canCastSpell(entity, spell)) {
        data.mana--;
      }
    }
  }
};
```

## Creating a Custom Action

```typescript
// src/actions/cast.ts
import { Action, ActionContext } from '@sharpee/core';
import { SemanticEvent } from '@sharpee/core';

export const CastAction: Action = {
  id: 'CAST',
  
  patterns: [
    'cast {spell}',
    'cast {spell} on {target}'
  ],
  
  validate(context: ActionContext): boolean {
    const actor = context.actor;
    return actor.hasTrait('MAGICAL');
  },
  
  execute(context: ActionContext): SemanticEvent[] {
    const { actor, directObject } = context;
    const spell = context.command.tokens.find(t => t.role === 'spell');
    
    return [{
      type: 'CAST_SPELL',
      actor: actor.id,
      spell: spell?.text || '',
      target: directObject?.id,
      message: `spell_cast_${spell?.text}`
    }];
  }
};
```

## Registering Your Extension

```typescript
// src/index.ts
import { registerTrait, registerAction } from '@sharpee/core';
import { MagicalTrait } from './traits/magical';
import { CastAction } from './actions/cast';

export function registerMagicExtension(): void {
  registerTrait(MagicalTrait);
  registerAction(CastAction);
}

// Export for direct use
export { MagicalTrait, CastAction };
```

## Using Your Extension

In a Sharpee story:

```typescript
import { registerMagicExtension } from '@yourname/sharpee-magic';

// Register the extension
registerMagicExtension();

// Use in your story
const wizard = createActor(world, {
  id: 'wizard',
  name: 'Gandalf',
  traits: {
    MAGICAL: {
      mana: 50,
      maxMana: 50,
      spells: ['fireball', 'teleport']
    }
  }
});
```

## Best Practices

### 1. Namespace Your IDs
Use prefixes to avoid conflicts:
```typescript
const SPELL_CAST = 'MAGIC:SPELL_CAST';
```

### 2. Provide TypeScript Types
Export interfaces for all data structures:
```typescript
export interface MagicConfig {
  // ...
}
```

### 3. Document Everything
Include JSDoc comments:
```typescript
/**
 * Trait for entities that can cast spells
 */
export const MagicalTrait = {
  // ...
};
```

### 4. Test Thoroughly
```typescript
import { createTestWorld } from '@sharpee/testing';

test('wizard can cast fireball', () => {
  const world = createTestWorld();
  // ... test your extension
});
```

## Publishing

1. Build your extension:
   ```bash
   npm run build
   ```

2. Publish to npm:
   ```bash
   npm publish --access public
   ```

3. Add to Sharpee extension registry (coming soon)

## Examples

See these extensions for reference:
- [@sharpee/ext-conversation](../../packages/extensions/conversation)
- [@sharpee/ext-combat](../../packages/extensions/combat)

## Support

- [Extension API Docs](../api/extensions.md)
- [Discord Community](https://discord.gg/sharpee)
- [GitHub Discussions](https://github.com/sharpee/sharpee/discussions)
