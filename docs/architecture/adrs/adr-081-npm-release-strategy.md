# ADR-081: npm Release Strategy

**Status:** Proposed
**Date:** 2025-12-31
**Builds on:** ADR-077 (Release Build System)

## Context

Sharpee has reached beta quality with:
- Core engine stable
- NPC, combat, scoring systems implemented
- Transcript testing framework
- Full Dungeo implementation proving the platform

It's time to publish to npm so external authors can use Sharpee.

## Decision

Publish Sharpee packages to npm under the `@sharpee` scope with the following structure:

### Package Structure

```
@sharpee/sharpee      # Meta-package, re-exports everything
@sharpee/core         # Core interfaces, types, utilities
@sharpee/world-model  # Entity system, traits, behaviors
@sharpee/engine       # Game engine, scheduler, command execution
@sharpee/stdlib       # Standard actions, NPC system, combat
@sharpee/parser-en-us # English parser
@sharpee/lang-en-us   # English language pack
@sharpee/if-domain    # Grammar builder interfaces
```

### Versioning

**Synchronized versions** - All packages share the same version number:
- Simpler for authors (`@sharpee/*@0.9.0` all compatible)
- Easier release management
- Use changesets for changelog generation

**Version scheme:**
- `0.x.y` - Beta (current)
- `1.0.0` - Stable release
- Semver after 1.0

### Installation

**For authors (simple):**
```bash
npm install @sharpee/sharpee
```

```typescript
import { Story, WorldModel, Room } from '@sharpee/sharpee';
```

**For advanced users (granular):**
```bash
npm install @sharpee/engine @sharpee/stdlib @sharpee/parser-en-us
```

### Build Pipeline

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   pnpm      │ --> │   esbuild    │ --> │   npm       │
│   build     │     │   bundle     │     │   publish   │
└─────────────┘     └──────────────┘     └─────────────┘
```

Each package gets:
- `dist/index.js` - CommonJS bundle
- `dist/index.mjs` - ESM bundle
- `dist/index.d.ts` - TypeScript declarations

### CI/CD Workflow

```yaml
# .github/workflows/release.yml
on:
  push:
    tags: ['v*']

jobs:
  release:
    - pnpm install
    - pnpm build
    - pnpm test
    - npx changeset publish
```

### Pre-release Checklist

Before first publish:

1. **Package.json updates:**
   - [ ] Set `"version": "0.9.0"` across all packages
   - [ ] Add `"publishConfig": { "access": "public" }`
   - [ ] Verify `"main"`, `"module"`, `"types"` fields
   - [ ] Add `"repository"`, `"homepage"`, `"bugs"` fields

2. **Documentation:**
   - [ ] README.md in each package
   - [ ] Getting started guide
   - [ ] API documentation (TypeDoc or similar)

3. **Testing:**
   - [ ] All tests pass
   - [ ] Test installation from tarball (`npm pack` + `npm install`)
   - [ ] Test in fresh project

4. **Legal:**
   - [ ] LICENSE file in each package
   - [ ] Verify all dependencies have compatible licenses

### Package.json Template

```json
{
  "name": "@sharpee/engine",
  "version": "0.9.0",
  "description": "Sharpee Interactive Fiction Engine",
  "main": "dist/index.js",
  "module": "dist/index.mjs",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "import": "./dist/index.mjs",
      "require": "./dist/index.js",
      "types": "./dist/index.d.ts"
    }
  },
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  },
  "repository": {
    "type": "git",
    "url": "https://github.com/ChicagoDave/sharpee.git",
    "directory": "packages/engine"
  },
  "homepage": "https://sharpee.dev",
  "bugs": "https://github.com/ChicagoDave/sharpee/issues",
  "license": "MIT",
  "keywords": ["interactive-fiction", "text-adventure", "parser", "game-engine"]
}
```

### Release Process

1. **Create release branch:**
   ```bash
   git checkout -b release/0.9.0
   ```

2. **Update versions:**
   ```bash
   npx changeset version
   ```

3. **Build all packages:**
   ```bash
   pnpm build
   ```

4. **Test release:**
   ```bash
   pnpm pack --pack-destination ./test-release
   # Install in test project and verify
   ```

5. **Publish:**
   ```bash
   npx changeset publish
   ```

6. **Tag and push:**
   ```bash
   git tag v0.9.0
   git push --tags
   ```

## Implementation Plan

### Phase 1: Package Preparation
- [ ] Add missing package.json fields to all packages
- [ ] Create README.md for each package
- [ ] Verify exports are correct

### Phase 2: Build System
- [ ] Configure esbuild for each package
- [ ] Generate .d.ts files properly
- [ ] Test ESM and CJS output

### Phase 3: CI/CD
- [ ] Set up GitHub Actions release workflow
- [ ] Configure npm token secret
- [ ] Add changeset bot

### Phase 4: Documentation
- [ ] Create sharpee.dev landing page (or GitHub Pages)
- [ ] Write getting started tutorial
- [ ] Generate API docs

### Phase 5: First Release
- [ ] Publish 0.9.0-beta.1 for testing
- [ ] Gather feedback
- [ ] Publish 0.9.0

## Consequences

**Positive:**
- External authors can use Sharpee via npm
- Version management is clear
- Automated releases reduce manual work

**Negative:**
- Maintaining npm packages is ongoing work
- Breaking changes need careful management
- Documentation must stay current

## Related

- ADR-077: Release Build System (research)
- ADR-074: IFID Requirements (story metadata)
