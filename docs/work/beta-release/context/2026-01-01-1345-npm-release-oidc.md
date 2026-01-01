# Work Summary: npm Release with OIDC Trusted Publishing

**Date:** 2026-01-01 13:45
**Branch:** `main`

## Overview

Published Sharpee packages to npm and configured OIDC Trusted Publishing for CI/CD releases.

## Packages Published

All 11 core packages published to npm under `@sharpee` scope:

| Package | Description |
|---------|-------------|
| `@sharpee/core` | Event system, types, utilities |
| `@sharpee/if-domain` | Grammar builder interfaces |
| `@sharpee/world-model` | Entity system, traits, behaviors |
| `@sharpee/if-services` | Service interfaces |
| `@sharpee/text-services` | Text formatting and output |
| `@sharpee/lang-en-us` | English language pack |
| `@sharpee/parser-en-us` | English natural language parser |
| `@sharpee/event-processor` | Event processing |
| `@sharpee/stdlib` | 40+ standard IF actions |
| `@sharpee/engine` | Game runtime |
| `@sharpee/sharpee` | Meta-package (installs all) |

## Installation

```bash
npm install @sharpee/sharpee@beta
```

This installs all dependencies automatically.

## OIDC Trusted Publishing

### The Problem

npm's OIDC Trusted Publishing allows CI to publish without tokens, but we encountered issues:

1. `actions/setup-node` sets a default auth token
2. This default token blocks OIDC authentication
3. npm falls back to token auth, which fails

### The Solution

Two requirements for OIDC to work:

1. **Set `registry-url`** in setup-node (required for npm to know where to publish)
2. **Clear the default token** after setup-node runs

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '20'
    registry-url: 'https://registry.npmjs.org'

- name: Clear default auth token (enables OIDC)
  run: npm config set //registry.npmjs.org/:_authToken ""

- name: Publish to npm (OIDC Trusted Publishing)
  run: npm publish --access public
```

### npm Configuration

Each package requires Trusted Publisher setup on npmjs.com:
- Owner: `ChicagoDave` (case-sensitive!)
- Repository: `sharpee`
- Workflow: `beta-release.yml`

## Package Configuration

### Dependencies

`@sharpee/sharpee` uses `workspace:*` dependencies locally. pnpm converts these to real versions during publish.

### Required package.json fields

```json
{
  "publishConfig": {
    "access": "public"
  }
}
```

### README files

Added README.md to all packages for npm display.

## Scripts Added

```json
{
  "publish:beta": "pnpm --filter @sharpee/core publish ..."
}
```

Publishes all packages in dependency order.

## Version History

Multiple beta versions due to CI troubleshooting:
- 0.9.0-beta.1 through beta.5: Initial publish attempts
- 0.9.1-beta.1 through beta.7: OIDC configuration iterations

## Key Learnings

1. **Case sensitivity matters** - npm Trusted Publisher owner must match GitHub username exactly
2. **setup-node sets default token** - Must clear it for OIDC to work
3. **registry-url still required** - Even with OIDC, npm needs to know the registry
4. **workspace:* works locally** - pnpm converts to real versions on publish

## Files Changed

- `.github/workflows/beta-release.yml` - OIDC configuration
- `package.json` - Added publish:beta script
- `packages/*/package.json` - Added publishConfig, bumped versions
- `packages/*/README.md` - Added for npm display
- `README.md` - Updated version badge
