---
title: "Build System"
description: "How to build Sharpee platform packages, stories, and client bundles"
---

# Sharpee Build System

This guide explains how to build Sharpee platform packages, stories, and client bundles.

## Quick Start

```bash
# Build platform + story (most common for CLI testing)
./build.sh -s dungeo

# Build platform + story + browser client
./build.sh -s dungeo -c browser

# Build platform + story + React client with dark theme
./build.sh -s dungeo -c react -t modern-dark

# Build both clients
./build.sh -s dungeo -c browser -c react
```

## Build Script (`build.sh`)

The main entry point for all builds, located at the repository root.

### Options

| Flag | Long Form | Description |
|------|-----------|-------------|
| `-s` | `--story <name>` | Build a story (dungeo, etc.) |
| `-c` | `--client <type>` | Build a client (browser, react) — can specify multiple |
| `-t` | `--theme <name>` | React theme (default: classic-light) |
| | `--skip <package>` | Resume platform build from a specific package |
| `-b` | `--story-bundle` | Create `.sharpee` story bundle (requires `-s`) |
| | `--runner` | Build Zifmia runner (loads `.sharpee` bundles in browser) |
| | `--no-version` | Skip version updates |
| `-v` | `--verbose` | Show build details |
| `-h` | `--help` | Show help message |

### Examples

```bash
# Platform only
./build.sh

# Platform + dungeo story
./build.sh -s dungeo

# Skip to stdlib in platform, then build story (faster rebuilds)
./build.sh --skip stdlib -s dungeo

# React client with retro theme
./build.sh -s dungeo -c react -t retro-terminal
```

### Build Order

The script ensures correct build order:

1. **Update versions** — Generates `version.ts` files (unless `--no-version`)
2. **Build platform** — Compiles all platform packages in dependency order
3. **Build story** — Compiles the specified story (if `-s` provided)
4. **Build client** — Creates client bundle (if `-c` provided)

## React Themes

When building the React client with `-c react`, use the `-t` flag to select a theme:

| Theme | Font | Style |
|-------|------|-------|
| `classic-light` | Literata | Warm light tones (default) |
| `modern-dark` | Inter | Catppuccin Mocha colors |
| `retro-terminal` | JetBrains Mono | Green phosphor terminal |
| `paper` | Crimson Text | High contrast paper |

## Version System

### Format

Versions use a simple prerelease format:

```
X.Y.Z-beta
```

Example: `1.0.64-beta`

- `X.Y.Z` — Semantic version (from package.json)
- `beta` — Prerelease tag indicating pre-1.0 status

### Generated Files

The build generates `version.ts` files automatically:

**Story version** (`stories/{story}/src/version.ts`):
```typescript
export const STORY_VERSION = '1.0.64-beta';
export const BUILD_DATE = '2026-01-30T09:40:05Z';
export const ENGINE_VERSION = '0.9.60-beta';
```

Version updates run first, before any compilation.

## Outputs

| Build | Output Location | Contents |
|-------|-----------------|----------|
| Platform | `dist/sharpee.js` | Node bundle with all platform packages |
| Story | `stories/{story}/dist/` | Compiled story code |
| Browser | `dist/web/{story}/` | HTML, JS bundle, CSS |
| React | `dist/web/{story}-react/` | React client with selected theme |
| Story bundle | `dist/{story}.sharpee` | Portable story bundle for Zifmia |

### npm Packages

For publishing to npm, packages use a separate build:

```bash
pnpm -r build:npm
```

This outputs to `dist-npm/` in each package (separate from `dist/` used by the bundled app). See `scripts/publish-npm.sh` for the full publishing workflow.

## Common Workflows

### Development (Story Changes Only)

When only changing story code, skip to the end of the platform build:

```bash
./build.sh --skip transcript-tester -s dungeo
node dist/sharpee.js --play
```

### Development (Platform Changes)

When changing platform packages, skip to the first package you changed:

```bash
./build.sh --skip stdlib -s dungeo
```

### Web Deployment

Full build for browser deployment:

```bash
./build.sh -s dungeo -c browser
npx serve dist/web/dungeo
```

### Testing

After any build:

```bash
# Interactive play
node dist/sharpee.js --play

# Run a single transcript test
node dist/sharpee.js --test stories/dungeo/tests/transcripts/navigation.transcript

# Run all transcript tests
node dist/sharpee.js --test stories/dungeo/tests/transcripts/*.transcript

# Chained walkthroughs (game state persists between transcripts)
node dist/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

## Performance Tips

1. **Use `--skip`** — Always skip unchanged packages to avoid slow full rebuilds
2. **Use the bundle** — `node dist/sharpee.js` loads in ~170ms vs 5+ seconds for individual packages
3. **Skip to transcript-tester** — For story-only changes: `--skip transcript-tester`

## Troubleshooting

### Build failures

Check the error output. Common issues:
- Missing dependencies: Run `pnpm install`
- TypeScript errors: Check the failing package
- Circular dependencies: Run `npx madge --circular` on the failing entry point

### Stale bundle

If the bundle seems stale, do a full rebuild without `--skip`:

```bash
./build.sh -s dungeo
```
