# Sharpee Development Setup

## Project Structure

The Sharpee project uses a monorepo structure with two main usage patterns:

### 1. Production/Distribution Mode
Stories import from the main `@sharpee/sharpee` package which aggregates all engine functionality:

```typescript
import { Story, WorldModel, IFEntity } from '@sharpee/sharpee';
```

### 2. Development Mode
For rapid iteration during development, stories can import directly from package sources using the `tsconfig.dev.json` configuration:

```bash
npm run build:dev  # Build using development config
npm run dev        # Watch mode for development
```

## Package Organization

```
packages/
├── core/              # Core types and interfaces
├── world-model/       # Entity-trait system
├── engine/            # Game runtime
├── stdlib/            # Standard library
├── event-processor/   # Event handling
├── lang-en-us/        # English language support
└── sharpee/           # Main aggregator package

stories/
├── cloak-of-darkness/ # Example story
└── [your-story]/      # Your custom stories
```

## Building

### Full Build (Production)
```bash
npm run build         # Build all packages
cd stories/cloak-of-darkness
npm run build        # Build story against distributed packages
```

### Development Build
```bash
cd stories/cloak-of-darkness
npm run build:dev    # Build using source imports
npm run dev          # Watch mode
```

## Creating a New Story

1. Copy the cloak-of-darkness directory as a template
2. Update package.json with your story name
3. Import from `@sharpee/sharpee` for clean imports
4. Use `npm run dev` for rapid iteration

## Build Modes Explained

### tsconfig.json (Production)
- Used for `npm run build`
- Imports from built packages in node_modules
- Proper isolation between packages
- What end users will experience

### tsconfig.dev.json (Development)
- Used for `npm run build:dev` and `npm run dev`
- Imports directly from package sources
- Faster iteration, no need to rebuild dependencies
- See changes immediately

## Troubleshooting

### "Module not found" errors
- Run `npm install` at the root to link workspaces
- Ensure packages are built with `npm run build` at root

### TypeScript errors about rootDir
- Use `npm run build:dev` for development
- The dev config handles cross-package imports properly

### Changes not reflecting
- In dev mode: Make sure `npm run dev` is running
- In prod mode: Rebuild packages with `npm run build` at root
