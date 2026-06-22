# @sharpee/story-runtime-baseline

The Story Runtime Baseline manifest — the canonical set of packages a `.sharpee` story bundle may import.

## Installation

```bash
npm install @sharpee/story-runtime-baseline
```

## Overview

This package is the single source of truth for the Story Runtime Baseline (ADR-178):

- **Declares the contract** — `STORY_RUNTIME_BASELINE` lists every package a `.sharpee` story bundle is allowed to import
- **Installs transitively** — Zifmia depends on this package so every baseline entry is installed for stories at runtime
- **Validates bundles** — the story build pipeline imports the list to check that a bundle only references packages in the baseline
- **Versioned** — `BASELINE_VERSION` tracks the baseline; bumping it is an amendment to ADR-178, updating both the constant and this package's `dependencies` in the same commit

## Usage

```typescript
import { STORY_RUNTIME_BASELINE, BASELINE_VERSION } from '@sharpee/story-runtime-baseline';

// Validate that a bundle only imports baseline packages
const offenders = bundleImports.filter((pkg) => !STORY_RUNTIME_BASELINE.includes(pkg));
if (offenders.length > 0) {
  throw new Error(`Bundle imports packages outside the baseline: ${offenders.join(', ')}`);
}

console.log(`Baseline v${BASELINE_VERSION}: ${STORY_RUNTIME_BASELINE.length} packages`);
```

## Exports

| Export | Description |
|--------|-------------|
| `STORY_RUNTIME_BASELINE` | Frozen, read-only array of the package names a `.sharpee` bundle may import |
| `BASELINE_VERSION` | Integer version of the baseline contract |

## Related Packages

- [@sharpee/engine](https://www.npmjs.com/package/@sharpee/engine) - Game runtime
- [@sharpee/world-model](https://www.npmjs.com/package/@sharpee/world-model) - Entity system
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
