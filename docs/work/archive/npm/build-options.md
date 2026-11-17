# npm Build Options: Avoiding Zifmia Conflicts

## Problem

Zifmia (build.sh) produces ESM builds in `dist-esm/` and CJS builds in `dist/`. Running `pnpm -r build` for npm publishing would overwrite `dist/` and potentially interfere with Zifmia's build artifacts. We need npm publishing to produce its own output without stomping on anything.

## Current State

- `tsconfig.base.json`: `module: "commonjs"`, `target: "ES2022"`
- Each package's `tsconfig.json`: `outDir: "./dist"`
- `package.json` exports (e.g., core): `require → ./dist/index.js`, `import → ./dist-esm/index.js`
- `files` field: `["dist"]` — only `dist/` gets published
- Zifmia's build.sh: produces both `dist/` (CJS) and `dist-esm/` (ESM)

## Options

---

### Option A: `tsc --outDir dist-npm` in the publish script

The publish script runs `tsc --outDir dist-npm` per package instead of `pnpm -r build`. Before publishing, it patches each `package.json` to point `main`/`exports`/`files` at `dist-npm/`, then restores after.

**Pros:**
- Zero changes to any package files (tsconfig, package.json stay as-is)
- Complete isolation — `dist/` and `dist-esm/` are never touched
- All logic lives in one script, easy to understand

**Cons:**
- Publish script becomes more complex (patch + restore logic)
- If script fails mid-publish, package.json files could be left in a dirty state (needs cleanup trap)
- Doesn't use project references (`tsc -b`), so each package builds independently — slower, and may miss cross-package type errors
- `--outDir` as a CLI flag overrides tsconfig, but `rootDir` and `references` still come from tsconfig — could produce unexpected directory structure in output

---

### Option B: Add `tsconfig.npm.json` per package

Each package gets a `tsconfig.npm.json` that extends its existing `tsconfig.json` but overrides `outDir` to `dist-npm`. Publish script runs `tsc -p tsconfig.npm.json` per package (or `tsc -b` from root).

```json
{
  "extends": "./tsconfig.json",
  "compilerOptions": {
    "outDir": "./dist-npm"
  }
}
```

Patch `package.json` before publish to point at `dist-npm/`, restore after.

**Pros:**
- Clean separation — each package explicitly declares its npm build config
- Can use `tsc -b` with project references if we add a root `tsconfig.npm.json` with references
- No CLI flag hacks — tsconfig is the source of truth
- Easy to extend later (e.g., different module target for npm)

**Cons:**
- 19 new files (one per package) — boilerplate
- Still needs package.json patching before publish
- Must keep tsconfig.npm.json in sync if tsconfig.json changes (extends helps, but outDir is the only override so this is minimal)

---

### Option C: npm-specific build script in each package.json

Add a `"build:npm"` script to each package.json that targets `dist-npm/`. Publish script runs `pnpm -r build:npm`.

```json
"scripts": {
  "build": "tsc",
  "build:npm": "tsc --outDir dist-npm"
}
```

Update `files` to `["dist-npm"]` permanently, and point `main`/`exports` at `dist-npm/`. Local dev (`build.sh`, Zifmia) continues using `dist/` and `dist-esm/`.

**Pros:**
- Standard pnpm workspace pattern — `pnpm -r build:npm` is simple
- No patching or restoring — `main`/`exports`/`files` permanently point at `dist-npm/`
- No extra tsconfig files
- Zifmia build.sh never sees `dist-npm/`, no conflict

**Cons:**
- Changes 19 `package.json` files (adding script, updating main/exports/files)
- Local development imports resolve to `dist-npm/` which won't exist unless npm build has run — but workspace `"workspace:*"` resolution uses source, not dist, so this doesn't matter in practice
- Same `--outDir` CLI override concern as Option A (though for simple packages with `rootDir: ./src` this works fine)

---

### Option D: Don't change output dir — just `.gitignore` and accept coexistence

Keep building to `dist/`. Accept that `pnpm -r build` overwrites `dist/`. Zifmia rebuilds when needed via `build.sh`. Both produce CJS in `dist/` anyway (same tsconfig), so overwriting is harmless.

**Pros:**
- Zero changes to anything except the publish script (which already exists)
- Simplest possible approach
- `dist/` CJS output is identical whether built by tsc directly or build.sh

**Cons:**
- If build.sh produces anything extra in `dist/` (e.g., bundled files, sourcemaps with different settings), those get overwritten
- Feels risky — "it should be the same" is an assumption that could break silently
- Doesn't address the stated concern about conflicts

---

## Recommendation

**Option C** is the cleanest balance. One-time change to 19 package.json files, then the publish script stays simple (`pnpm -r build:npm` + publish). No temporary patching, no extra tsconfig files, no risk of dirty state on failure. The `dist-npm/` output is completely isolated from Zifmia's `dist/` and `dist-esm/`.

If the boilerplate of changing 19 package.json files feels too heavy, **Option A** works with the tradeoff of a more complex publish script.

**Option D** is worth considering if we confirm that `dist/` output is truly identical between both build paths — but it doesn't address the concern directly.
