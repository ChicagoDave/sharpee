---
title: "Installation"
description: "Install Sharpee and set up your development environment"
---

## Prerequisites

- **Node.js** 18 or later
- **npm** or **pnpm** (recommended)
- A code editor (VS Code recommended for TypeScript support)

## Create a New Project

The fastest way to get started is with the CLI:

```bash
npx @sharpee/sharpee init my-adventure
cd my-adventure
npm install
```

This scaffolds a complete story project with a starting room, build scripts, and TypeScript configuration.

For non-interactive setup (CI or scripting):

```bash
npx @sharpee/sharpee init my-adventure -y
```

## Add to an Existing Project

If you already have a TypeScript project:

```bash
npm install @sharpee/sharpee
```

Or with pnpm:

```bash
pnpm add @sharpee/sharpee
```

## What You Get

`@sharpee/sharpee` is the umbrella package. One install gives you:

| Package | What it provides |
|---------|-----------------|
| `@sharpee/engine` | Game engine, turn cycle, command execution |
| `@sharpee/world-model` | Entities, traits, behaviors |
| `@sharpee/stdlib` | 43 standard actions (take, drop, open, etc.) |
| `@sharpee/parser-en-us` | English command parser |
| `@sharpee/lang-en-us` | English language output |
| `@sharpee/core` | Events, queries, platform types |
| `@sharpee/plugins` | Plugin system (NPC, scheduler, state machine) |
| `@sharpee/text-service` | Text rendering and status line |
| `@sharpee/ext-testing` | Debug and testing tools |
| `@sharpee/platform-browser` | Browser client infrastructure |

You import everything from `@sharpee/sharpee` — no need to install individual packages.

## Project Structure

A Sharpee story is organized by **regions**. Each region is a single TypeScript file containing everything in that area — rooms, objects, and connections:

```
my-adventure/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts              # Story entry point
│   ├── regions/
│   │   ├── village.ts        # Rooms, objects, connections for the village
│   │   ├── forest.ts         # Everything in the forest area
│   │   └── dungeon.ts        # Underground rooms and items
│   ├── npcs/                 # NPC definitions (optional)
│   │   └── merchant.ts
│   └── actions/              # Story-specific actions (optional)
│       └── pray.ts
└── tests/
    └── transcripts/          # Test transcripts
        └── walkthrough.transcript
```

Each region file exports a setup function:

```typescript
// src/regions/village.ts
import { WorldModel, IFEntity } from '@sharpee/sharpee';

export function createVillage(world: WorldModel) {
  const square = world.createRoom('village-square', {
    name: 'Village Square',
    description: 'A bustling square with a fountain at its center.',
  });

  const tavern = world.createRoom('tavern', {
    name: 'The Rusty Mug',
    description: 'A warm tavern smelling of ale and roasted meat.',
  });

  world.connectRooms(square.id, 'east', tavern.id);

  // Objects in this region
  const coin = world.createEntity('coin', 'object', {
    name: 'silver coin',
    description: 'A tarnished silver coin.',
  });
  world.moveEntity(coin.id, square.id);

  return { square, tavern };
}
```

## TypeScript Configuration

The scaffolded project includes a working `tsconfig.json`. If setting up manually:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "commonjs",
    "moduleResolution": "node",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist",
    "declaration": true
  },
  "include": ["src/**/*"]
}
```

## Next Steps

Continue to the [Quick Start](/getting-started/quick-start/) guide to build your first playable story.
