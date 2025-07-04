# Pass 2: Dependencies and Build Testing Summary

## What Pass 2 Does

1. **Fixes workspace:* dependencies**
   - Replaces `workspace:*` with `file:../package-name` references
   - Stories use `file:../../packages/package-name`
   - No workspace protocols, just simple file paths

2. **Installs all dependencies**
   - Removes old node_modules
   - Runs npm install in dependency order
   - Ensures all packages can find their dependencies

3. **Builds all packages**
   - Builds in dependency order (core first, then dependents)
   - Each package compiles to its own dist/ folder
   - TypeScript emits both .js and .d.ts files

4. **Verifies builds**
   - Checks that dist/index.js exists
   - Checks that dist/index.d.ts exists
   - Reports number of compiled files

5. **Sets up story configuration**
   - Creates tsconfig.json for stories with path mappings
   - Creates package.json for stories if missing
   - Configures imports to use built packages

6. **Tests story compilation**
   - Builds cloak-of-darkness story
   - Verifies it produces dist/index.js
   - Attempts to load the story

## Files Created

- `/scripts/fix-workspace-deps.sh` - Replaces workspace:* with file: paths
- `/scripts/install-all.sh` - Installs dependencies in order
- `/scripts/verify-builds.sh` - Checks build outputs
- `/scripts/setup-story-imports.sh` - Configures story imports
- `/scripts/test-story-build.sh` - Tests story compilation
- `/pass2-setup-deps.sh` - Master script that runs all of Pass 2

## To Run Pass 2

```bash
chmod +x pass2-setup-deps.sh
./pass2-setup-deps.sh
```

## After Pass 2

You'll have:
- All packages built with their JavaScript and TypeScript declarations
- Dependencies properly linked using file: protocol
- Stories configured to import from built packages
- A verified working build chain

## Build Commands

After setup, you can:
- `./scripts/build-all.sh` - Rebuild all packages
- `./scripts/clean-all.sh` - Clean all build outputs
- `cd stories/story-name && npm run build` - Build a specific story
- `cd packages/package-name && npm run build` - Build a specific package

## Architecture

```
sharpee/
├── packages/
│   ├── core/
│   │   ├── src/          # TypeScript source
│   │   └── dist/         # Built output
│   ├── engine/
│   │   ├── src/
│   │   └── dist/
│   └── ...
└── stories/
    └── cloak-of-darkness/
        ├── src/          # Story source
        └── dist/         # Built story
```

Each package:
- Builds independently to its own dist/
- References other packages via file: protocol
- No complex build tools or workspace magic
- Simple, debuggable, predictable
