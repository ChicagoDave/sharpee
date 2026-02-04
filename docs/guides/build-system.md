# Sharpee Build System

This guide explains how to build Sharpee platform packages, stories, and client bundles.

## Quick Start

```bash
# Build platform + story (most common)
./build.sh -s dungeo

# Build platform + story + browser client
./build.sh -s dungeo -c browser

# Build platform + story + Zifmia client (desktop runner)
./build.sh -s dungeo -c zifmia

# Show all options
./build.sh --help
```

## Build Options

| Flag | Long Form | Description |
|------|-----------|-------------|
| `-s` | `--story <name>` | Build a story (dungeo, reflections, etc.) |
| `-c` | `--client <type>` | Build client (browser, zifmia) - can specify multiple |
| `-t` | `--theme <name>` | Zifmia theme (default: classic-light) |
| `-b` | `--story-bundle` | Create `.sharpee` story bundle |
| | `--runner` | Build Zifmia runner only |
| | `--skip <package>` | Resume platform build from package |
| | `--no-version` | Skip version updates |
| `-v` | `--verbose` | Show build details |
| `-h` | `--help` | Show help |

### Available Themes (for Zifmia)

| Theme | Description |
|-------|-------------|
| `classic-light` | Literata font, warm light tones (default) |
| `modern-dark` | Inter font, Catppuccin Mocha colors |
| `retro-terminal` | JetBrains Mono, green phosphor |
| `paper` | Crimson Text, high contrast |

## Examples

```bash
# Platform only
./build.sh

# Platform + dungeo story
./build.sh -s dungeo

# Platform + dungeo + browser client
./build.sh -s dungeo -c browser

# Platform + dungeo + Zifmia with dark theme
./build.sh -s dungeo -c zifmia -t modern-dark

# Both clients
./build.sh -s dungeo -c browser -c zifmia

# Create .sharpee story bundle
./build.sh -s dungeo -b

# Resume from stdlib (skip earlier packages)
./build.sh --skip stdlib -s dungeo

# Skip version update (faster iteration)
./build.sh --no-version --skip stdlib -s dungeo
```

## Build Order

The build system ensures correct dependency order:

1. **Update versions** - Generates version files (unless `--no-version`)
2. **Build platform** - Compiles all platform packages in order
3. **Bundle** - Creates `dist/cli/sharpee.js`
4. **Build story** - Compiles the specified story (if `-s`)
5. **Build client** - Creates client bundle (if `-c`)

### Platform Package Order

1. core
2. if-domain
3. world-model
4. event-processor
5. lang-en-us
6. parser-en-us
7. if-services
8. text-blocks
9. text-service
10. stdlib
11. plugins, plugin-npc, plugin-scheduler, plugin-state-machine
12. engine
13. sharpee
14. transcript-tester

## Version System

### Format

Versions use a simple prerelease format:

```
X.Y.Z-beta
```

Example: `0.9.85-beta`

- `X.Y.Z` - Base semantic version (from package.json)
- `beta` - Prerelease tag

### Generated Files

The build generates `version.ts` files for stories and clients with:

```typescript
export const STORY_VERSION = '1.0.0-beta';
export const BUILD_DATE = '2026-02-04T01:00:00Z';
export const ENGINE_VERSION = '0.9.85-beta';
```

## Outputs

| Build | Output Location | Contents |
|-------|-----------------|----------|
| Platform | `dist/cli/sharpee.js` | Node bundle with all platform packages |
| Story | `stories/{story}/dist/` | Compiled story code |
| Story Bundle | `dist/stories/{story}.sharpee` | Portable story bundle |
| Browser | `dist/web/{story}/` | HTML, JS bundle, CSS |
| Zifmia | `dist/runner/` | Desktop runner + platform modules |

## Common Workflows

### Story Development (Fastest Iteration)

When only changing story code:

```bash
./build.sh --no-version --skip transcript-tester -s dungeo
node dist/cli/sharpee.js --play
```

### Platform Development

When changing platform packages, skip to the changed package:

```bash
./build.sh --skip stdlib -s dungeo
```

### Running Tests

After any build:

```bash
# Interactive play
node dist/cli/sharpee.js --play

# Run single transcript test
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/navigation.transcript

# Run walkthrough chain (state persists between files)
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript

# Stop on first failure
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/*.transcript --stop-on-failure
```

### Web Deployment

```bash
./build.sh -s dungeo -c browser
npx serve dist/web/dungeo
```

### Zifmia (Desktop) Deployment

```bash
./build.sh -s dungeo -c zifmia -t modern-dark
npx serve dist/runner
# Open browser, load dist/stories/dungeo.sharpee
```

## Performance Tips

1. **Use `--skip`** - Always skip unchanged packages
2. **Use `--no-version`** - Skip version bumps during rapid iteration
3. **Use the bundle** - `node dist/cli/sharpee.js` loads in ~170ms vs 5+ seconds for packages

## Troubleshooting

### Build hangs on "Building Platform"

Could be WSL filesystem sync issue. Try again or run with `-v` for verbose output.

### Circular dependency detected

Use `madge` to find cycles:

```bash
npx madge --circular stories/dungeo/dist/index.js
```

Fix by changing barrel imports to direct file imports.

### TypeScript errors

Check the failing package and ensure dependencies are built first. Use `--skip` to build from a specific package.

### Stale bundle

Force a full rebuild without `--skip`:

```bash
./build.sh -s dungeo
```
