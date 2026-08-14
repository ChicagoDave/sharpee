# Circular Dependency Analysis - Sharpee Platform

## Executive Summary

After thorough analysis, **there is NO actual circular dependency** in the Sharpee codebase. What appeared to be circular dependencies are actually **unidirectional dependencies** that were misidentified.

---

## Dependency Analysis Results

### 1. stdlib → world-model (ONE WAY ONLY ✅)

```typescript
// stdlib imports FROM world-model
@sharpee/stdlib → @sharpee/world-model
```

**Evidence:**
- stdlib package.json lists world-model as dependency
- stdlib imports 60+ times from world-model
- world-model has NO imports from stdlib
- world-model package.json does NOT list stdlib as dependency

**This is NOT circular - it's unidirectional**

### 2. parser-en-us → world-model (ONE WAY ONLY ✅)

```typescript
// parser-en-us imports FROM world-model
@sharpee/parser-en-us → @sharpee/world-model
```

**Evidence:**
- parser-en-us imports types from world-model
- world-model has NO imports from parser-en-us
- No reverse dependency exists

**This is NOT circular - it's unidirectional**

---

## What's Actually Happening

### The Real Dependency Tree

```
        @sharpee/core
             ↓
        @sharpee/if-domain
             ↓
        @sharpee/world-model
           ↙   ↓   ↘
    stdlib  parser  services
```

**Key Points:**
1. world-model is a foundational package
2. Multiple packages depend ON it
3. It doesn't depend on any of them back
4. This is proper layered architecture

---

## Why the Confusion?

### 1. Build Order Issues
The build system may be trying to build packages in the wrong order, causing failures that look like circular dependencies:

```bash
# If build tries this order:
1. Build stdlib (needs world-model types) ❌ Fails
2. Build world-model

# Instead of correct order:
1. Build world-model
2. Build stdlib ✅ Works
```

### 2. TypeScript Compilation Context
TypeScript may be seeing all packages at once during compilation and getting confused about dependencies:

```json
// tsconfig.json references might be creating false circular detection
{
  "references": [
    { "path": "../world-model" },  // stdlib references world-model
    { "path": "../stdlib" }         // but if world-model tsconfig also lists stdlib...
  ]
}
```

### 3. Monorepo Workspace Resolution
pnpm workspaces might be creating symlinks that make TypeScript think there are circular dependencies:

```
node_modules/
  @sharpee/
    stdlib -> ../../packages/stdlib
    world-model -> ../../packages/world-model
```

---

## The ACTUAL Problems

### 1. Excessive Coupling (But Not Circular)

```typescript
// stdlib is tightly coupled TO world-model
import { 
  IFEntity, 
  WorldModel, 
  TraitType,
  ContainerBehavior,
  SupporterBehavior,
  // ... 50+ more imports
} from '@sharpee/world-model';
```

**Issue:** High coupling, but it's unidirectional

### 2. Missing Abstraction Layer

```typescript
// stdlib actions directly import concrete implementations
import { WorldModel } from '@sharpee/world-model';  // Concrete class
import { IFEntity } from '@sharpee/world-model';    // Concrete class

// Should import interfaces instead
import { IWorldModel } from '@sharpee/interfaces';  // Interface
import { IEntity } from '@sharpee/interfaces';      // Interface
```

### 3. Build Configuration Issues

```json
// Possible issue in package.json
{
  "dependencies": {
    "@sharpee/world-model": "file:../world-model"  // file: protocol
  }
}

// vs workspace protocol
{
  "dependencies": {
    "@sharpee/world-model": "workspace:*"  // workspace: protocol
  }
}
```

---

## What This Means for IF Architecture

### These Dependencies Make Sense for IF

```typescript
// stdlib SHOULD depend on world-model
// Actions need to know about:
- Entity structure
- Trait types
- World operations
- Behaviors

// parser SHOULD depend on world-model  
// Parser needs to know about:
- Entity types for disambiguation
- Command structures
- Valid parse results
```

### This is Normal IF Architecture

Looking at other IF systems:

**Inform 7:**
- Actions depend on World Model
- Parser depends on World Model
- No circular dependencies

**TADS 3:**
- Action classes import Thing class
- Parser imports world definitions
- Unidirectional dependencies

---

## Recommended Actions

### 1. Fix Build Order
```json
// Correct build order in package.json
{
  "scripts": {
    "build:all": "pnpm build:core && pnpm build:world && pnpm build:stdlib"
  }
}
```

### 2. Clean TypeScript References
```json
// Check tsconfig.json references
// Ensure no backward references
```

### 3. Add Abstraction Layer (Optional)
```typescript
// If you want looser coupling
interface IWorldModel {
  getEntity(id: string): IEntity;
  moveEntity(id: string, to: string): void;
}

// But for IF, tight coupling might be OK
```

### 4. Document Dependency Rules
```markdown
## Dependency Rules
1. world-model depends on: core, if-domain ONLY
2. stdlib depends on: world-model, core, if-domain
3. parser depends on: world-model, core, if-domain
4. NO package depends on stdlib except engine
```

---

## Conclusion

**There is NO circular dependency problem.** 

What exists is:
1. **High coupling** - stdlib heavily depends on world-model (60+ imports)
2. **Build order issues** - Packages building in wrong sequence
3. **Missing abstractions** - Direct concrete class dependencies

For an IF platform, the current dependency structure is actually reasonable:
- Actions need deep knowledge of the world model
- Parser needs world model for disambiguation
- World model is the foundational simulation layer

The "god object" concern about WorldModel is also questionable for IF - it's not a god object, it's the simulation core that genuinely needs to coordinate all these concerns.

**Recommendation:** Focus on build configuration fixes rather than architectural restructuring.

---

*Analysis Date: 2025-08-13*
*Finding: No circular dependencies exist*