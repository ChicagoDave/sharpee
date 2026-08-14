# Quick Start CI/CD Checklist

Use this checklist when setting up CI/CD for the Sharpee project.

## Prerequisites
- [ ] GitHub repository created
- [ ] pnpm workspace configured
- [ ] All packages have `build` and `test` scripts in package.json

## Step 1: Install Dependencies
```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

## Step 2: Create Directories
```bash
mkdir -p .github/workflows
mkdir -p cicd/templates
```

## Step 3: Add Scripts to Root package.json
```json
{
  "scripts": {
    "ci:test": "pnpm run ci:test:sequence",
    "ci:test:sequence": "pnpm run test:core && pnpm run test:lang && pnpm run test:engine && pnpm run test:stdlib && pnpm run test:world && pnpm run test:extensions && pnpm run test:cloak",
    "test:core": "pnpm --filter @sharpee/core run build && pnpm --filter @sharpee/core test",
    "test:lang": "pnpm --filter @sharpee/lang-en-us run build && pnpm --filter @sharpee/lang-en-us test",
    "test:engine": "pnpm --filter @sharpee/engine run build && pnpm --filter @sharpee/engine test",
    "test:stdlib": "pnpm --filter @sharpee/stdlib run build && pnpm --filter @sharpee/stdlib test",
    "test:world": "pnpm --filter @sharpee/world run build && pnpm --filter @sharpee/world test",
    "test:extensions": "pnpm --filter @sharpee/extensions run build && pnpm --filter @sharpee/extensions test",
    "test:cloak": "pnpm --filter @sharpee/cloak run build && pnpm --filter @sharpee/cloak test",
    "changeset": "changeset",
    "version": "changeset version",
    "release": "pnpm build && changeset publish"
  }
}
```

## Step 4: Create Workflow Files
- [ ] Create `.github/workflows/ci.yml` (from setup-guide.md)
- [ ] Create `.github/workflows/release.yml` (from setup-guide.md)
- [ ] Create `.github/workflows/version-bump.yml` (from setup-guide.md)

## Step 5: Configure Changesets
- [ ] Edit `.changeset/config.json` with configuration from setup-guide.md

## Step 6: Add Build Info (Optional)
For each package that needs build timestamps:
- [ ] Create `scripts/generate-build-info.js`
- [ ] Add `prebuild` script to package.json
- [ ] Add `src/build-info.ts` to .gitignore

## Step 7: GitHub Repository Setup
- [ ] Go to Settings → Secrets and variables → Actions
- [ ] Add `NPM_TOKEN` if publishing to npm
- [ ] Verify `GITHUB_TOKEN` is available (automatic)

## Step 8: Test Locally
```bash
# Test build sequence
pnpm run ci:test

# Test changeset creation
pnpm changeset

# Test version bumping
pnpm changeset version
```

## Step 9: Initial Commit
```bash
git add .
git commit -m "ci: setup automated testing and releases"
git push
```

## Step 10: Verify
- [ ] Check GitHub Actions tab
- [ ] Verify CI workflow runs on push
- [ ] Create a test PR to verify PR checks

## Build Order Reference
1. `@sharpee/core` - No dependencies
2. `@sharpee/lang-en-us` - Depends on core
3. `@sharpee/engine` - Depends on core  
4. `@sharpee/stdlib` - Depends on core and engine
5. `@sharpee/world` - Depends on core and engine
6. `@sharpee/extensions` - Depends on core
7. `@sharpee/cloak` - Depends on all above

## Troubleshooting Commands
```bash
# Check what would be built/tested
pnpm run ci:test --dry-run

# Run specific package test
pnpm --filter @sharpee/core test

# Check changeset status
pnpm changeset status

# See what versions would be bumped
pnpm changeset version --dry-run
```
