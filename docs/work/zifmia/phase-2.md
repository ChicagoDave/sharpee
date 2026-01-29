# Plan: Zifmia Phase 2 — Story Loader

## Overview

Enable Zifmia to load `.sharpee` bundles at runtime using ES importmap for module resolution. This requires:
1. Fix story build to emit true ESM (so externals become `import` statements)
2. Add fflate dependency for in-browser zip extraction
3. Create bundle loader module in Zifmia
4. Create runner entry point that bootstraps engine from a loaded bundle
5. Build runner HTML with importmap

## Prerequisites

Phase 1 is complete (`.sharpee` bundles produced by `build.sh --story-bundle`).

## Steps

### Step 1: Change story tsconfig to ESM output

**File**: `stories/dungeo/tsconfig.json`
- Change `"module": "commonjs"` → `"module": "es2022"`
- Add `"moduleResolution": "bundler"` (or keep `node16` if it works)
- This makes `tsc` emit `import` statements instead of `require()` calls
- esbuild then produces true ESM with `import { ... } from "@sharpee/core"` for externals

**Verify**: Rebuild story + bundle, check `story.js` starts with `import` statements.

**Risk**: The story's `dist/index.js` is also loaded by the CLI bundle (`scripts/bundle-entry.js`) via `require()`. Node can load ESM via dynamic `import()` but not via `require()`. We may need to update `bundle-entry.js` or keep CJS for the CLI path and only use ESM for the `.sharpee` bundle path.

**Mitigation**: Two approaches:
- A) Change `bundle-entry.js` to use dynamic `import()` — complex, breaks sync loading
- B) Keep story tsconfig as CJS; have `build.sh` bundle step use esbuild with `--format=esm` from the TS source directly (not the CJS dist). esbuild can read TS directly.
- **Prefer B**: In `build_story_bundle()`, change entry from `stories/{name}/dist/index.js` to `stories/{name}/src/index.ts` and let esbuild handle TS→ESM directly. This avoids changing the tsconfig and keeps CJS dist working for CLI.

### Step 2: Update `build_story_bundle()` in `build.sh`

Change esbuild entry from `dist/index.js` to `src/index.ts` so esbuild transpiles TS→ESM directly:

```bash
npx esbuild "stories/${name}/src/index.ts" \
  --bundle --platform=browser --format=esm --target=es2020 \
  --external:@sharpee/* \
  --outfile="$STAGING/story.js" \
  --tsconfig="stories/${name}/tsconfig.json"
```

This produces true ESM with `import` statements for `@sharpee/*` without changing the story's tsconfig.

### Step 3: Add fflate to Zifmia

**File**: `packages/zifmia/package.json`
- Add `"fflate": "^0.8.0"` to dependencies

Run `pnpm install` after.

### Step 4: Create bundle loader module

**New file**: `packages/zifmia/src/loader/bundle-loader.ts`

```typescript
import { unzipSync } from 'fflate';
import type { StoryMetadata } from '../types/story-metadata';

export interface LoadedBundle {
  metadata: StoryMetadata;
  storyModuleUrl: string;  // Blob URL for dynamic import
  assets: Map<string, string>;  // filename → blob URL
  themeCSS?: string;
}

export async function loadBundle(source: ArrayBuffer): Promise<LoadedBundle> {
  // 1. Unzip
  const files = unzipSync(new Uint8Array(source));

  // 2. Parse meta.json
  const metaBytes = files['meta.json'];
  if (!metaBytes) throw new Error('Invalid .sharpee bundle: missing meta.json');
  const metadata: StoryMetadata = JSON.parse(new TextDecoder().decode(metaBytes));

  // 3. Validate format
  if (metadata.format !== 'sharpee-story') throw new Error(`Unknown format: ${metadata.format}`);

  // 4. Create blob URL for story.js
  const storyBytes = files['story.js'];
  if (!storyBytes) throw new Error('Invalid .sharpee bundle: missing story.js');
  const storyBlob = new Blob([storyBytes], { type: 'application/javascript' });
  const storyModuleUrl = URL.createObjectURL(storyBlob);

  // 5. Extract assets
  const assets = new Map<string, string>();
  for (const [path, data] of Object.entries(files)) {
    if (path.startsWith('assets/')) {
      const mimeType = guessMimeType(path);
      const blob = new Blob([data], { type: mimeType });
      assets.set(path.slice('assets/'.length), URL.createObjectURL(blob));
    }
  }

  // 6. Extract theme CSS
  let themeCSS: string | undefined;
  if (files['theme.css']) {
    themeCSS = new TextDecoder().decode(files['theme.css']);
  }

  return { metadata, storyModuleUrl, assets, themeCSS };
}

export function releaseBundle(bundle: LoadedBundle): void {
  URL.revokeObjectURL(bundle.storyModuleUrl);
  for (const url of bundle.assets.values()) {
    URL.revokeObjectURL(url);
  }
}

function guessMimeType(path: string): string {
  if (path.endsWith('.jpg') || path.endsWith('.jpeg')) return 'image/jpeg';
  if (path.endsWith('.png')) return 'image/png';
  if (path.endsWith('.gif')) return 'image/gif';
  if (path.endsWith('.svg')) return 'image/svg+xml';
  if (path.endsWith('.webp')) return 'image/webp';
  if (path.endsWith('.woff2')) return 'font/woff2';
  if (path.endsWith('.woff')) return 'font/woff';
  if (path.endsWith('.css')) return 'text/css';
  return 'application/octet-stream';
}
```

### Step 5: Create runner entry point

**New file**: `packages/zifmia/src/runner/index.tsx`

Minimal runner that:
1. Accepts a bundle URL (from query param or file input)
2. Fetches and loads the bundle
3. Dynamically imports story.js: `const mod = await import(bundle.storyModuleUrl)`
4. Extracts `story` object from module
5. Creates WorldModel, Parser, LanguageProvider, GameEngine (same as react-entry.tsx)
6. Calls `engine.setStory(story)`
7. Renders `<GameProvider engine={engine}><GameShell /></GameProvider>`

### Step 6: Build runner with importmap

**New function in `build.sh`**: `build_runner()`

Produces `dist/runner/index.html` with:
1. An importmap that maps `@sharpee/*` to platform module URLs
2. Platform modules bundled as individual ESM files (one per package)
3. The runner shell JS

The importmap in the HTML:
```html
<script type="importmap">
{
  "imports": {
    "@sharpee/core": "./modules/core.js",
    "@sharpee/world-model": "./modules/world-model.js",
    "@sharpee/engine": "./modules/engine.js",
    ...
  }
}
</script>
```

Each platform module is built by esbuild as ESM. When story.js does `import { ... } from "@sharpee/core"`, the browser resolves it via the importmap.

**Alternative (simpler)**: Bundle ALL platform packages into a single `platform.js` ESM module, and have the importmap point all `@sharpee/*` entries to the same file with different export paths. Or just use a single entry that re-exports everything.

**Simplest approach**: One `platform.js` that exports everything, importmap maps all `@sharpee/*` to it:
```html
<script type="importmap">
{
  "imports": {
    "@sharpee/core": "./platform.js",
    "@sharpee/world-model": "./platform.js",
    "@sharpee/engine": "./platform.js",
    ...
  }
}
</script>
```

This works because ESM importmap resolves the specifier, and `platform.js` re-exports from all packages. The story's `import { WorldModel } from "@sharpee/world-model"` resolves to `platform.js` which exports `WorldModel`.

### Step 7: Add `--runner` flag to `build.sh`

New flag: `--runner`
- Builds platform as ESM bundle (`dist/runner/platform.js`)
- Builds runner shell (`dist/runner/runner.js`)
- Generates `dist/runner/index.html` with importmap + theme CSS

## Files Modified

1. `build.sh` — Update `build_story_bundle()` entry point (src/index.ts instead of dist/index.js), add `build_runner()`, add `--runner` flag
2. `packages/zifmia/package.json` — Add fflate dependency
3. **New**: `packages/zifmia/src/loader/bundle-loader.ts` — Bundle extraction
4. **New**: `packages/zifmia/src/runner/index.tsx` — Runner entry point
5. `packages/zifmia/src/index.ts` — Export loader

## Verification

```bash
# 1. Rebuild story bundle with ESM output
./build.sh -s dungeo --story-bundle
# Verify: unzip -p dist/stories/dungeo.sharpee story.js | head -5
# Should show: import { ... } from "@sharpee/..."

# 2. Build runner
./build.sh --runner

# 3. Serve and test
npx serve dist/runner/
# Open browser, load dungeo.sharpee, verify game starts

# 4. Verify CLI still works (CJS path unchanged)
node dist/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure
```
