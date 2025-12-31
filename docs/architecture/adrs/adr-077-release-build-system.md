# ADR-077: Release Build System

**Status:** Research
**Date:** 2025-12-30

## Context

Sharpee currently uses a monorepo with multiple packages that are linked via pnpm workspaces. This works well for development but creates problems for story authors:

1. **Slow startup**: Module loading takes ~12s due to Node.js traversing barrel exports at runtime
2. **Complex setup**: Authors need the full monorepo to develop stories
3. **No distribution**: No way to publish a standalone Sharpee package

For Sharpee to be usable by external authors, we need a release build system that bundles the engine into distributable packages.

## Goals

1. **Fast startup**: Sub-second module loading for authors
2. **Simple installation**: `npm install sharpee` should work
3. **TypeScript support**: Authors get full type definitions
4. **Multiple targets**: npm package, possibly browser bundles

## Research Areas

### 1. Build Tool Selection

**Options to evaluate:**

| Tool | Pros | Cons |
|------|------|------|
| **esbuild** | Fastest, simple config | Less mature plugin ecosystem |
| **rollup** | Mature, great tree-shaking | Slower than esbuild |
| **tsup** | Built on esbuild, TS-native | Wrapper adds complexity |
| **unbuild** | Unified build, auto-detects | Less control |

**Key questions:**
- How well does each handle our barrel export pattern?
- Can they preserve our package boundaries for debugging?
- TypeScript declaration (.d.ts) generation quality?

### 2. Package Structure Options

**Option A: Single package**
```
sharpee/
├── dist/
│   ├── index.js      # All-in-one bundle
│   ├── index.d.ts    # Combined types
│   └── index.mjs     # ESM version
└── package.json
```

**Option B: Scoped packages (current structure, bundled)**
```
@sharpee/core
@sharpee/world-model
@sharpee/engine
@sharpee/stdlib
@sharpee/parser-en-us
@sharpee/lang-en-us
```

**Option C: Layered packages**
```
sharpee              # Full bundle for simple use
@sharpee/engine      # Core engine only
@sharpee/stdlib      # Standard library (optional)
@sharpee/lang-*      # Language packs (optional)
```

### 3. Author Experience

**Story development workflow:**

```bash
# Create new story
npm create sharpee-story my-adventure

# Directory structure
my-adventure/
├── src/
│   ├── index.ts
│   ├── rooms/
│   └── objects/
├── package.json
└── tsconfig.json
```

**Minimal story example:**
```typescript
import { Story, WorldModel, Room, Item } from 'sharpee';

export const story = new Story({
  title: 'My Adventure',
  ifid: 'ABC123...',
  setup: (world: WorldModel) => {
    const startRoom = world.createRoom('start', {
      name: 'Starting Room',
      description: 'You are in a small room.'
    });
    // ...
  }
});
```

### 4. Versioning Strategy

**Questions:**
- Single version for all packages vs. independent versioning?
- How to handle breaking changes in internal packages?
- Semantic versioning for story API stability?

### 5. Distribution Channels

**npm registry:**
- Publish to public npm
- Scoped under `@sharpee/` or unscoped `sharpee`

**CDN (for browser):**
- unpkg, jsdelivr, esm.sh
- Browser bundle with all dependencies

**GitHub Releases:**
- Downloadable archives
- Pre-built templates

### 6. Testing Bundled Output

**Requirements:**
- CI job that builds release bundle
- Integration tests against bundled version
- Size budget tracking
- Startup time benchmarks

## Investigation Tasks

### Phase 1: Proof of Concept
- [ ] Create experimental esbuild config for world-model
- [ ] Measure bundle size and startup time
- [ ] Test type declaration generation
- [ ] Verify all exports work correctly

### Phase 2: Full Bundle
- [ ] Bundle all packages into single distributable
- [ ] Test with sample story project
- [ ] Measure memory usage and performance
- [ ] Document author workflow

### Phase 3: Publishing Pipeline
- [ ] Set up npm publishing workflow
- [ ] Create changeset/versioning system
- [ ] Build documentation site
- [ ] Create `create-sharpee-story` template

## Open Questions

1. Should browser support be a goal for v1.0?
2. How do we handle parser/language as optional dependencies?
3. What's the minimum Node.js version to support?
4. Should stories be bundled too, or just the engine?

## Success Criteria

- [ ] Module loading < 500ms
- [ ] `npm install sharpee` works for new users
- [ ] TypeScript autocomplete works in VSCode
- [ ] Sample story compiles and runs
- [ ] CI publishes to npm on release

## References

- Current barrel export issue: 12s load time due to runtime import resolution
- [esbuild documentation](https://esbuild.github.io/)
- [tsup - TypeScript bundler](https://tsup.egoist.dev/)
- ADR-074: IFID Requirements (story metadata for releases)
