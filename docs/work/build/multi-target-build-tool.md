# Architecture: Multi-Target TypeScript Build Tool

## Problem Statement

TypeScript monorepos with multiple consumers face a build target matrix that no existing tool handles completely:

| Consumer | Module Format | Import Resolution | Output |
|---|---|---|---|
| Local workspace (tsc) | CJS or ESM | `@scope/pkg` → workspace symlink | `dist/` |
| esbuild/webpack bundle | Any (bundled) | Resolved at bundle time | Single file |
| Browser client | ESM | Relative or bundled | `dist/web/` |
| npm publish | CJS, ESM, or dual | `@scope/pkg` → npm registry | `dist-npm/` |
| Deno / edge runtime | ESM | URL or specifier map | `dist-deno/` |

**The core tension**: a single `tsc` invocation produces one module format with one import resolution strategy. Every additional consumer requires either a separate build, a post-processing step, or a hack.

### What Exists Today

| Tool | Strengths | Gaps |
|---|---|---|
| `tsc` | Type checking, declaration emit | Single target per invocation |
| `tsc-multi` | Parallel multi-target tsc | Rewrites extensions, not package specifiers |
| `tsup` | Fast bundling, dual CJS/ESM | Bundles (loses internal package boundaries), no monorepo-aware import rewriting |
| `tshy` | Dual CJS/ESM with live dev | Single-package focus, no cross-package import rewriting |
| `unbuild` | Auto-infers config, dual output | No monorepo import resolution |
| `publishConfig` (pnpm) | Swaps entry points at publish | Doesn't solve the build itself |

**None of these rewrite `@scope/package` imports to relative paths for npm publish while preserving them for local development.** This is the gap.

## Design Goals

1. **One source, N outputs** — define targets declaratively; the tool builds all of them
2. **Import resolution per target** — workspace imports stay as `@scope/pkg` for local dev, get rewritten to relative paths (or bundled) for npm publish
3. **Type declarations per target** — `.d.ts` files with correct import paths for each target
4. **Monorepo-aware** — understands workspace topology, builds in dependency order
5. **Incremental** — only rebuilds what changed (per-target cache)
6. **No lock-in** — uses standard `tsconfig.json`, augmented by a small config file
7. **Fast** — uses `esbuild` or `swc` for transpilation where type checking isn't needed

## Configuration

### `tsmulti.config.json` (project root)

```json
{
  "$schema": "https://tsmulti.dev/schema.json",
  "projects": ["packages/*/tsconfig.json", "stories/*/tsconfig.json"],
  "targets": {
    "local": {
      "module": "commonjs",
      "outDir": "dist",
      "imports": "preserve",
      "declarations": true
    },
    "npm-cjs": {
      "module": "commonjs",
      "outDir": "dist-npm",
      "imports": "relative",
      "declarations": true,
      "condition": "publish"
    },
    "npm-esm": {
      "module": "esnext",
      "outDir": "dist-esm",
      "imports": "relative",
      "declarations": true,
      "extensionMap": { ".js": ".mjs", ".d.ts": ".d.mts" },
      "condition": "publish"
    },
    "bundle": {
      "format": "iife",
      "outFile": "dist/bundle.js",
      "imports": "bundle",
      "bundler": "esbuild",
      "external": [],
      "condition": "browser"
    }
  },
  "defaults": {
    "transpiler": "tsc",
    "typeCheck": true,
    "sourceMap": true,
    "clean": false
  }
}
```

### Per-Package Override (`packages/core/tsmulti.json`)

```json
{
  "targets": {
    "npm-cjs": {
      "banner": "/* @sharpee/core v${version} */",
      "external": ["lz-string"]
    }
  }
}
```

## Core Concepts

### Import Resolution Strategies

The key differentiator. Each target specifies how `@scope/pkg` imports are handled:

#### `"preserve"` (default, local dev)

Imports left as-is. Workspace symlinks or `node_modules` handle resolution at runtime.

```typescript
// Source
import { WorldModel } from '@sharpee/world-model';

// Output (unchanged)
import { WorldModel } from '@sharpee/world-model';
```

#### `"relative"`  (npm publish)

Workspace imports rewritten to relative paths based on the monorepo topology. The tool resolves `@sharpee/world-model` → `../../world-model/dist-npm/index.js` (or the target's outDir).

```typescript
// Source
import { WorldModel } from '@sharpee/world-model';

// Output (rewritten for npm)
import { WorldModel } from '../../world-model/dist-npm/index.js';
```

For npm packages that will be installed flat in `node_modules`, the strategy can also rewrite to bare specifiers that assume peer/dependency installation:

```json
{
  "imports": "relative",
  "relativeMode": "peer"
}
```

```typescript
// Output (assumes @sharpee/world-model installed as dependency)
import { WorldModel } from '@sharpee/world-model';
// But .d.ts paths are rewritten to resolve correctly
```

#### `"bundle"` (browser/CLI bundle)

All workspace imports are resolved and inlined by the bundler. No import statements remain for workspace packages.

#### `"specifier-map"` (Deno / import maps)

Imports rewritten according to a provided import map.

```json
{
  "imports": "specifier-map",
  "importMap": "./import_map.json"
}
```

### Declaration Handling

Type declarations (`.d.ts`) need the same import rewriting as runtime code. This is the part most tools get wrong.

For each target with `"declarations": true`:
1. Run `tsc --emitDeclarationOnly` (or reuse from a type-check pass)
2. Apply the same import resolution transform to `.d.ts` files
3. Apply extension mapping (`.d.ts` → `.d.mts` for ESM targets)

### Build Order

The tool reads `references` from `tsconfig.json` (or infers from workspace `dependencies`) to determine build order. Within a dependency level, packages build in parallel.

```
Level 0: core
Level 1: if-domain, world-model (depend on core)
Level 2: stdlib, parser-en-us (depend on world-model)
Level 3: engine (depends on stdlib)
Level 4: stories (depend on engine)
```

Each level builds all its packages in parallel, for all targets in parallel.

### Incremental Builds

Per-target file hashes stored in `.tsmulti-cache/`:

```
.tsmulti-cache/
  local/
    packages/core/hash.json
    packages/world-model/hash.json
  npm-cjs/
    packages/core/hash.json
```

A package+target is skipped if:
- All source file hashes match
- All dependency output hashes match
- The target config hasn't changed

### Conditional Targets

Targets with `"condition"` only build when explicitly requested:

```bash
# Build only local target (default)
tsmulti build

# Build local + npm targets
tsmulti build --condition publish

# Build everything
tsmulti build --all

# Build specific target
tsmulti build --target npm-esm
```

### Type Checking Strategy

Type checking is slow. The tool separates it from transpilation:

```bash
# Full type check + build (CI)
tsmulti build --check

# Transpile only (fast iteration)
tsmulti build --no-check

# Type check without emitting
tsmulti check
```

When `--no-check` is used, the tool uses `esbuild` or `swc` for transpilation (configurable via `"transpiler"`), skipping tsc entirely for speed.

## CLI Interface

```
tsmulti build [options]
  --target <name>       Build specific target(s), comma-separated
  --condition <name>    Build targets matching condition
  --all                 Build all targets
  --check / --no-check  Enable/disable type checking
  --watch               Watch mode
  --clean               Remove output dirs before build
  --verbose             Show detailed output
  --parallel <n>        Max parallel builds (default: CPU count)

tsmulti check
  Run type checking only (no emit)

tsmulti init
  Generate tsmulti.config.json from existing tsconfig.json files

tsmulti info
  Show resolved build plan (dependency order, targets, paths)
```

## Architecture

### Components

```
┌─────────────────────────────────────────────────┐
│                   CLI Layer                       │
│  (argument parsing, config loading, reporting)    │
├─────────────────────────────────────────────────┤
│                  Orchestrator                     │
│  (dependency graph, parallel scheduling,          │
│   incremental cache, condition filtering)         │
├──────────┬──────────┬──────────┬────────────────┤
│ TSC      │ esbuild  │ SWC      │ Rollup         │
│ Compiler │ Compiler │ Compiler │ Bundler        │
│ Adapter  │ Adapter  │ Adapter  │ Adapter        │
├──────────┴──────────┴──────────┴────────────────┤
│              Import Transformer                   │
│  (AST-based import path rewriting per target)     │
├─────────────────────────────────────────────────┤
│           Declaration Transformer                 │
│  (same rewriting applied to .d.ts files)          │
├─────────────────────────────────────────────────┤
│            Workspace Resolver                     │
│  (reads pnpm/yarn/npm workspace topology,         │
│   resolves @scope/pkg → filesystem paths)         │
└─────────────────────────────────────────────────┘
```

### Import Transformer (the hard part)

Uses `ts.transform()` or a lightweight AST parser to rewrite import/export specifiers:

```typescript
interface ImportTransformer {
  // Given a source file path and an import specifier, return the rewritten specifier
  rewrite(
    sourceFile: string,
    specifier: string,
    target: TargetConfig
  ): string;
}
```

For `"relative"` mode, the transformer:
1. Checks if specifier matches a workspace package name
2. Resolves that package's output path for this target
3. Computes the relative path from source to resolved output
4. Rewrites the specifier

For `.d.ts` files, the same logic applies but the transformer also handles:
- `/// <reference types="..." />` directives
- `declare module "..."` blocks
- `import type` statements

### Workspace Resolver

Reads workspace config to build a package graph:

```typescript
interface WorkspaceResolver {
  // All packages in the workspace
  packages: Map<string, PackageInfo>;

  // Resolve a bare specifier to a filesystem path
  resolve(specifier: string, fromPackage: string): string | null;

  // Get dependency order for building
  getBuildOrder(): string[][];  // Array of parallel levels
}

interface PackageInfo {
  name: string;           // "@sharpee/world-model"
  path: string;           // "packages/world-model"
  tsconfig: string;       // "packages/world-model/tsconfig.json"
  dependencies: string[]; // ["@sharpee/core"]
  entryPoint: string;     // "src/index.ts"
  outDirs: Map<string, string>;  // target → output dir
}
```

## Integration with package.json

The tool can optionally update `package.json` fields to match target outputs:

```json
{
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": {
      "types": "./dist/index.d.ts",
      "import": "./dist-esm/index.mjs",
      "require": "./dist/index.js"
    }
  },
  "publishConfig": {
    "main": "dist-npm/index.js",
    "types": "dist-npm/index.d.ts",
    "exports": {
      ".": {
        "types": "./dist-npm/index.d.ts",
        "import": "./dist-esm/index.mjs",
        "require": "./dist-npm/index.js"
      }
    }
  }
}
```

Running `tsmulti init --sync-package-json` generates these fields from the config.

## Scenarios

### Scenario 1: Sharpee (the motivating case)

**Targets needed:**
- `local` — CJS, workspace imports preserved, for story `tsc` and local testing
- `npm` — CJS, workspace imports as peer dependencies, for npm publish
- `bundle` — single-file IIFE/CJS, all workspace imports bundled, for CLI (`dist/cli/sharpee.js`)
- `browser` — ESM bundle, for web client

**Config:**
```json
{
  "projects": ["packages/*/tsconfig.json"],
  "targets": {
    "local": { "module": "commonjs", "outDir": "dist", "imports": "preserve" },
    "npm": { "module": "commonjs", "outDir": "dist-npm", "imports": "relative", "condition": "publish" },
    "bundle": { "format": "cjs", "outFile": "dist/cli/sharpee.js", "imports": "bundle", "bundler": "esbuild", "condition": "bundle" },
    "browser": { "format": "esm", "outDir": "dist/web", "imports": "bundle", "bundler": "esbuild", "condition": "browser" }
  }
}
```

### Scenario 2: Typical OSS Library (dual CJS/ESM)

```json
{
  "projects": ["tsconfig.json"],
  "targets": {
    "cjs": { "module": "commonjs", "outDir": "dist/cjs", "declarations": true },
    "esm": { "module": "esnext", "outDir": "dist/esm", "extensionMap": { ".js": ".mjs", ".d.ts": ".d.mts" }, "declarations": true }
  }
}
```

### Scenario 3: Full-Stack App (Next.js + Lambda)

```json
{
  "projects": ["packages/*/tsconfig.json"],
  "targets": {
    "local": { "module": "esnext", "outDir": "dist", "imports": "preserve" },
    "lambda": { "module": "commonjs", "outDir": "dist-lambda", "imports": "bundle", "bundler": "esbuild", "target": "node18", "condition": "deploy" }
  }
}
```

### Scenario 4: Library with Deno Support

```json
{
  "projects": ["tsconfig.json"],
  "targets": {
    "npm": { "module": "esnext", "outDir": "dist", "imports": "preserve" },
    "deno": { "module": "esnext", "outDir": "dist-deno", "imports": "specifier-map", "importMap": "import_map.json", "extensionMap": { ".js": ".ts" }, "condition": "deno" }
  }
}
```

## Implementation Plan

### Phase 1: Core (MVP)

1. Config parser and validator
2. Workspace resolver (pnpm, npm, yarn)
3. Build orchestrator with dependency ordering
4. TSC compiler adapter
5. Import transformer (`preserve` and `relative` modes)
6. Declaration transformer
7. CLI with `build`, `check`, `init`

### Phase 2: Performance

8. Incremental cache
9. esbuild transpiler adapter (for `--no-check`)
10. Parallel target builds within each dependency level
11. Watch mode

### Phase 3: Bundling

12. esbuild bundler adapter (`bundle` import mode)
13. Rollup bundler adapter (tree shaking)
14. `outFile` support for single-file output

### Phase 4: Ecosystem

15. `tsmulti init` auto-detection from existing configs
16. `--sync-package-json` to update package.json fields
17. Validation (like publint) to verify outputs are correct
18. GitHub Action for CI integration

## Open Questions

1. **Should the tool own type checking or delegate to `tsc --noEmit`?** Owning it adds complexity but enables per-target diagnostics (e.g., ESM-only errors).

2. **How to handle `paths` in tsconfig?** Projects using `paths` for workspace resolution may conflict with the tool's import rewriting. The tool should probably strip workspace `paths` entries and handle resolution itself.

3. **Declaration maps** — should `.d.ts.map` files also be transformed? They reference source files, which may be at different relative paths per target.

4. **Package name**: `tsmulti` is taken (tommy351). Candidates: `tsc-targets`, `tsmt`, `multitsc`, `ts-forge`.

## Prior Art and References

- [tsc-multi](https://github.com/tommy351/tsc-multi/) — parallel multi-target tsc, extension rewriting
- [tsup](https://tsup.egoist.dev/) — esbuild-based bundler with dual CJS/ESM
- [tshy](https://github.com/isaacs/tshy) — dual CJS/ESM with live dev
- [unbuild](https://github.com/unjs/unbuild) — auto-config build tool
- [publint](https://publint.dev/) — package.json validation
- [Are the Types Wrong?](https://arethetypeswrong.github.io/) — declaration correctness checker
- [TypeScript issue #15833](https://github.com/microsoft/TypeScript/issues/15833) — transpile to multiple targets
- [Anthony Fu: Ship ESM & CJS](https://antfu.me/posts/publish-esm-and-cjs)
- [Colin McDonnell: Live Types in a TS Monorepo](https://colinhacks.com/essays/live-types-typescript-monorepo)
