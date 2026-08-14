# Platform Development Guide

This guide is for developers who want to contribute to Sharpee's core packages.

## Prerequisites

- Node.js 18+ 
- pnpm 8+
- Git
- TypeScript knowledge

## Getting Started

### 1. Clone and Setup

```bash
git clone https://github.com/yourusername/sharpee.git
cd sharpee
pnpm install
```

### 2. Build All Packages

```bash
# Clean build of all packages
pnpm run build

# Or build specific package
pnpm run build:core
```

### 3. Development Workflow

```bash
# Watch mode for all packages
pnpm run dev

# Run tests
pnpm run test

# Type check
pnpm run typecheck
```

## Project Structure

```
sharpee/
├── packages/
│   ├── core/           # Core types and interfaces
│   ├── world-model/    # Entity system and traits
│   ├── engine/         # Runtime and game loop
│   ├── stdlib/         # Standard library
│   ├── event-processor/# Event handling
│   └── lang-en-us/     # English language pack
├── tsconfig.base.json  # Base TypeScript config
└── tsconfig.dev.json   # Dev config with path mappings
```

## Making Changes

### 1. Create a Feature Branch

```bash
git checkout -b feature/your-feature-name
```

### 2. Make Your Changes

- Follow existing code style
- Add tests for new functionality
- Update documentation

### 3. Test Your Changes

```bash
# Run tests for changed packages
pnpm run test:changed

# Build changed packages
pnpm run build:changed
```

### 4. Submit a Pull Request

- Ensure all tests pass
- Include a clear description
- Reference any related issues

## TypeScript Configuration

We use two TypeScript configurations:

- **tsconfig.base.json**: Production builds (no path mappings)
- **tsconfig.dev.json**: Development (with path mappings for fast iteration)

During development, your IDE will use path mappings to resolve `@sharpee/*` imports directly to source files.

## Common Tasks

### Adding a New Package

1. Create package directory: `packages/your-package/`
2. Add `package.json` with workspace protocol
3. Add `tsconfig.json` extending base config
4. Update root `pnpm-workspace.yaml` if needed

### Debugging Build Issues

```bash
# Verbose build output
pnpm run build:all

# Check TypeScript config
pnpm exec tsc --showConfig

# Clean everything and rebuild
pnpm run clean && pnpm run build
```

## Architecture Decisions

- **Event-driven**: All game state changes happen through events
- **Immutable messages**: Text is generated from templates, not hardcoded
- **Trait-based**: Entities gain behavior through composable traits
- **Parser separation**: Parsing is separate from world knowledge

See [Architecture Overview](./architecture.md) for more details.
