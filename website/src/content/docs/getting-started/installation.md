---
title: "Installation"
description: "Install Sharpee and set up your development environment"
section: "getting-started"
order: 1
---

## Prerequisites

Before installing Sharpee, make sure you have:

- **Node.js** 18 or later
- **npm** or **pnpm** (recommended)
- A code editor (VS Code recommended for TypeScript support)

## Install via npm

The quickest way to get started is to install the Sharpee package:

```bash
npm install @sharpee/sharpee
```

Or with pnpm:

```bash
pnpm add @sharpee/sharpee
```

## Project Structure

A typical Sharpee story project looks like this:

```
my-adventure/
├── package.json
├── tsconfig.json
├── src/
│   ├── index.ts          # Story entry point
│   ├── regions/          # Room definitions
│   │   └── start/
│   │       └── index.ts
│   └── objects/          # Object definitions
│       └── index.ts
└── tests/
    └── transcripts/      # Test transcripts
```

## TypeScript Configuration

Sharpee is written in TypeScript and provides full type definitions. Here's a recommended `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "./dist"
  },
  "include": ["src/**/*"]
}
```

## Next Steps

Once installed, continue to the [Quick Start](/docs/getting-started/quick-start) guide to create your first room.
