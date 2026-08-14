# CI/CD Setup Guide for Sharpee

This guide walks through setting up automated testing, building, and versioning for the Sharpee monorepo using GitHub Actions, pnpm, and changesets.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Initial Setup](#initial-setup)
4. [GitHub Actions Workflows](#github-actions-workflows)
5. [Versioning with Changesets](#versioning-with-changesets)
6. [Build Timestamps](#build-timestamps)
7. [Step-by-Step Implementation](#step-by-step-implementation)
8. [Testing Your Setup](#testing-your-setup)

## Overview

The CI/CD pipeline will:
- Run tests for all packages in dependency order
- Automatically bump minor versions
- Add build timestamps to packages
- Create releases with changelogs
- Publish to npm (optional)

## Prerequisites

- GitHub repository set up
- pnpm workspace configured
- All packages have `build` and `test` scripts

## Initial Setup

### 1. Create GitHub Actions Directory

In your repository root:
```bash
mkdir -p .github/workflows
```

### 2. Install Changesets

Changesets manages versioning and changelogs:

```bash
pnpm add -Dw @changesets/cli
pnpm changeset init
```

### 3. Update Root package.json

Add these scripts to your root `package.json`:

```json
{
  "scripts": {
    "build": "pnpm run -r build",
    "test": "pnpm run -r test",
    "lint": "pnpm run -r lint",
    "type-check": "pnpm run -r type-check",
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

## GitHub Actions Workflows

### 1. Main CI Workflow

Create `.github/workflows/ci.yml`:

```yaml
name: CI

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main ]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Run linting
        run: pnpm run lint
        continue-on-error: true  # Remove once linting is set up
        
      - name: Run type checking
        run: pnpm run type-check
        continue-on-error: true  # Remove once all types are fixed
        
      - name: Build and test all packages
        run: |
          export BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
          export BUILD_NUMBER=${{ github.run_number }}
          export GIT_COMMIT=${{ github.sha }}
          pnpm run ci:test
          
      - name: Upload test results
        if: always()
        uses: actions/upload-artifact@v3
        with:
          name: test-results
          path: packages/*/test-results/
```

### 2. Release Workflow

Create `.github/workflows/release.yml`:

```yaml
name: Release

on:
  push:
    branches:
      - main

concurrency: ${{ github.workflow }}-${{ github.ref }}

jobs:
  release:
    name: Release
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install --frozen-lockfile
        
      - name: Create Release Pull Request or Publish
        id: changesets
        uses: changesets/action@v1
        with:
          version: pnpm run version
          publish: pnpm run release
          createGithubReleases: true
        env:
          GITHUB_TOKEN: ${{ secrets.GITHUB_TOKEN }}
          NPM_TOKEN: ${{ secrets.NPM_TOKEN }}  # Only if publishing to npm
```

### 3. Weekly Version Bump Workflow

Create `.github/workflows/version-bump.yml`:

```yaml
name: Weekly Version Bump

on:
  schedule:
    - cron: '0 9 * * 1'  # Every Monday at 9 AM UTC
  workflow_dispatch:  # Allow manual trigger

jobs:
  version-bump:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          token: ${{ secrets.GITHUB_TOKEN }}
          
      - name: Setup pnpm
        uses: pnpm/action-setup@v2
        with:
          version: 8
          
      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
          cache: 'pnpm'
          
      - name: Install dependencies
        run: pnpm install
        
      - name: Configure Git
        run: |
          git config --global user.name 'github-actions[bot]'
          git config --global user.email 'github-actions[bot]@users.noreply.github.com'
          
      - name: Create changeset for minor bump
        run: |
          cat > .changeset/minor-bump.md << EOF
          ---
          "@sharpee/core": minor
          "@sharpee/engine": minor
          "@sharpee/stdlib": minor
          "@sharpee/world": minor
          "@sharpee/extensions": minor
          "@sharpee/lang-en-us": minor
          "@sharpee/cloak": minor
          ---
          
          Weekly automated minor version bump
          EOF
          
      - name: Version packages
        run: pnpm changeset version
        
      - name: Commit and push
        run: |
          git add .
          git commit -m "chore: weekly minor version bump"
          git push
```

## Versioning with Changesets

### 1. Configure Changesets

Edit `.changeset/config.json`:

```json
{
  "$schema": "https://unpkg.com/@changesets/config@2.3.1/schema.json",
  "changelog": "@changesets/cli/changelog",
  "commit": false,
  "fixed": [],
  "linked": [],
  "access": "public",
  "baseBranch": "main",
  "updateInternalDependencies": "patch",
  "ignore": []
}
```

### 2. How to Use Changesets

When making changes:

```bash
# After making changes to packages
pnpm changeset

# Follow prompts to:
# 1. Select which packages changed
# 2. Select version bump type (patch/minor/major)
# 3. Write a summary of changes

# Commit the changeset file
git add .changeset/
git commit -m "Add changeset"
```

## Build Timestamps

### Option 1: Simple Environment Variable

In each package's `src/build-info.ts`:

```typescript
export const BUILD_INFO = {
  version: process.env.npm_package_version || 'development',
  buildDate: process.env.BUILD_DATE || new Date().toISOString(),
  buildNumber: process.env.BUILD_NUMBER || 'local',
  gitCommit: process.env.GIT_COMMIT || 'local'
};
```

### Option 2: Build Script

Create `scripts/generate-build-info.js` in each package:

```javascript
const fs = require('fs');
const path = require('path');

const buildInfo = {
  version: process.env.npm_package_version,
  buildDate: new Date().toISOString(),
  buildNumber: process.env.BUILD_NUMBER || 'local',
  gitCommit: process.env.GIT_COMMIT || 'local'
};

const content = `// Auto-generated build information
export const BUILD_INFO = ${JSON.stringify(buildInfo, null, 2)};
`;

const outputPath = path.join(__dirname, '..', 'src', 'build-info.ts');
fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, content);

console.log('Generated build info:', buildInfo);
```

Update package.json:

```json
{
  "scripts": {
    "prebuild": "node scripts/generate-build-info.js",
    "build": "tsc"
  }
}
```

Add to `.gitignore`:
```
src/build-info.ts
```

## Step-by-Step Implementation

### 1. First Time Setup

```bash
# 1. Install changesets
pnpm add -Dw @changesets/cli

# 2. Initialize changesets
pnpm changeset init

# 3. Create workflows directory
mkdir -p .github/workflows

# 4. Copy workflow files from this guide

# 5. Update root package.json with CI scripts

# 6. Add build info generation to each package (optional)

# 7. Commit everything
git add .
git commit -m "Setup CI/CD pipeline"
git push
```

### 2. Setting up Secrets

In your GitHub repository:
1. Go to Settings → Secrets and variables → Actions
2. Add secrets:
   - `NPM_TOKEN` (if publishing to npm)
   - GitHub token is automatically provided

### 3. First Release

```bash
# 1. Make some changes
# 2. Create a changeset
pnpm changeset

# 3. Commit and push
git add .
git commit -m "feat: your changes"
git push

# 4. The Release workflow will create a PR
# 5. Merge the PR to trigger release
```

## Testing Your Setup

### 1. Test CI Locally

```bash
# Test the build sequence
pnpm run ci:test

# Test changeset
pnpm changeset

# Test version command
pnpm changeset version
```

### 2. Test GitHub Actions

1. Push to a feature branch to trigger CI
2. Check Actions tab in GitHub
3. Review workflow logs

### 3. Common Issues

**Issue**: `pnpm: command not found`
```yaml
# Make sure pnpm setup comes before Node setup
- uses: pnpm/action-setup@v2
  with:
    version: 8
```

**Issue**: Dependencies not found
```bash
# Use frozen lockfile in CI
pnpm install --frozen-lockfile
```

**Issue**: Build order problems
```bash
# Ensure packages are built in dependency order
# Check the ci:test:sequence script
```

## Advanced Options

### Matrix Testing

Test on multiple Node versions:

```yaml
strategy:
  matrix:
    node-version: [16, 18, 20]
    os: [ubuntu-latest, windows-latest]
```

### Caching

Add pnpm store caching:

```yaml
- name: Get pnpm store directory
  id: pnpm-cache
  shell: bash
  run: |
    echo "STORE_PATH=$(pnpm store path)" >> $GITHUB_OUTPUT

- uses: actions/cache@v3
  name: Setup pnpm cache
  with:
    path: ${{ steps.pnpm-cache.outputs.STORE_PATH }}
    key: ${{ runner.os }}-pnpm-store-${{ hashFiles('**/pnpm-lock.yaml') }}
```

### Deployment

Add deployment step after release:

```yaml
- name: Deploy
  if: steps.changesets.outputs.published == 'true'
  run: |
    # Your deployment script
    echo "Deploying version ${{ steps.changesets.outputs.publishedPackages }}"
```

## Next Steps

1. Set up the workflows in your repository
2. Make a test change and create a changeset
3. Watch the CI pipeline run
4. Customize workflows as needed
5. Add badges to README:

```markdown
![CI](https://github.com/yourusername/sharpee/workflows/CI/badge.svg)
![Release](https://github.com/yourusername/sharpee/workflows/Release/badge.svg)
```

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Changesets Documentation](https://github.com/changesets/changesets)
- [pnpm Workspace Documentation](https://pnpm.io/workspaces)
