# world-model — Claude Instructions

> Scoped to `packages/world-model/`. See the root `CLAUDE.md` for project-wide policy.

## Item Portability

**Items are portable by default.** All items can be taken unless explicitly blocked. To make something non-portable, use `SceneryTrait` or handle it in the taking action's validation.

## Trait/Behavior Layout

- Traits: `packages/world-model/src/traits/`
- Behaviors: `packages/world-model/src/behaviors/`
- Behaviors own mutations. Traits are data. See `docs/reference/core-concepts.md` for the full pattern.

## Root Barrel Discipline

The root barrel (`src/index.ts`) enumerates each trait subdir explicitly. When adding a new trait:

1. Add the export to `src/traits/<your-trait>/index.ts` (the leaf barrel).
2. Re-export from `src/traits/index.ts`.
3. Re-export from `src/index.ts`.
4. Rebuild both `dist/` and `dist-esm/`.

Runtime `"X is not a constructor"` errors after a trait add usually mean the root barrel was missed.

## Circular Dependency Detection

If the CLI hangs on startup with no CPU usage, it's likely a circular dependency in `require()` chains:

```bash
npx madge --circular packages/world-model/src/index.ts
```

**Fix**: Change barrel imports (`from '../traits'`) to direct file imports (`from '../traits/specific-trait'`).
