# Sharpee Build System

This guide explains how to build Sharpee platform packages, stories, and client bundles.

## Quick Start

```bash
# Build platform + story + browser client (most common)
./scripts/build.sh -s dungeo -c browser

# Build platform + story only (for CLI testing)
./scripts/build.sh -s dungeo

# Build just the platform
./scripts/build.sh
```

## Architecture

The build system is organized into modular scripts:

```
scripts/
├── build.sh              # Controller script (use this)
├── update-versions.sh    # Version file generation
├── build-platform.sh     # Platform packages + node bundle
├── build-story.sh        # Individual story compilation
└── build-client.sh       # Client bundles (browser, electron)
```

### Build Order

The controller ensures correct build order:

1. **Update versions** - Generates `version.ts` files with timestamps
2. **Build platform** - Compiles all platform packages
3. **Build story** - Compiles the specified story (if `-s` provided)
4. **Build client** - Creates client bundle (if `-c` provided)

## Controller Script (`build.sh`)

The main entry point for all builds.

### Options

| Flag | Long Form | Description |
|------|-----------|-------------|
| `-s` | `--story <name>` | Build a story (dungeo, reflections, etc.) |
| `-c` | `--client <type>` | Build a client (browser, electron) |
| | `--skip <package>` | Skip to package in platform build |
| | `--all <story> <client>` | Build everything (shorthand) |
| `-h` | `--help` | Show help message |

### Examples

```bash
# Platform only
./scripts/build.sh

# Platform + dungeo story
./scripts/build.sh -s dungeo

# Platform + dungeo + browser client
./scripts/build.sh -s dungeo -c browser

# Shorthand for above
./scripts/build.sh --all dungeo browser

# Skip to stdlib in platform, then build story
./scripts/build.sh --skip stdlib -s dungeo

# Different story and client
./scripts/build.sh -s reflections -c electron
```

## Version System

### Format

Versions use a date-based prerelease format:

```
X.Y.Z-beta.YYYYMMDD.HHMM
```

Example: `1.0.64-beta.20260121.2325`

- `X.Y.Z` - Base semantic version (from package.json)
- `beta` - Prerelease tag
- `YYYYMMDD.HHMM` - UTC timestamp of build

### Generated Files

The build generates `version.ts` files:

**Story version** (`stories/{story}/src/version.ts`):
```typescript
export const STORY_VERSION = '1.0.64-beta.20260121.2325';
export const BUILD_DATE = '2026-01-21T23:25:00Z';
export const ENGINE_VERSION = '0.9.50-beta.20260121.2325';
export const VERSION_INFO = { ... } as const;
```

**Client version** (`packages/platforms/{client}-en-us/src/version.ts`):
```typescript
export const CLIENT_VERSION = '1.0.0-beta.20260121.2325';
export const BUILD_DATE = '2026-01-21T23:25:00Z';
export const ENGINE_VERSION = '0.9.50-beta.20260121.2325';
export const VERSION_INFO = { ... } as const;
```

### Manual Version Update

To update versions without building:

```bash
./scripts/update-versions.sh --story dungeo --client browser
```

## Individual Scripts

These are called by the controller but can be used directly.

### `build-platform.sh`

Builds all platform packages in dependency order and creates the node bundle.

```bash
./scripts/build-platform.sh              # Full build
./scripts/build-platform.sh --skip stdlib  # Skip to stdlib
```

**Build order:**
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
11. engine
12. sharpee
13. transcript-tester
14. Bundle creation

**Output:** `dist/cli/sharpee.js` (node bundle)

### `build-story.sh`

Builds a specific story.

```bash
./scripts/build-story.sh dungeo
./scripts/build-story.sh reflections
```

**Requires:** Platform must be built first.

**Output:** `stories/{story}/dist/`

### `build-client.sh`

Creates a client bundle for a story.

```bash
./scripts/build-client.sh dungeo browser
./scripts/build-client.sh reflections electron
```

**Supported clients:**
- `browser` - Web browser bundle (HTML + JS + CSS)
- `electron` - Desktop app (not yet implemented)

**Requires:** Story must be built first.

**Output:** `dist/web/{story}/` (for browser)

## Outputs

| Build | Output Location | Contents |
|-------|-----------------|----------|
| Platform | `dist/cli/sharpee.js` | Node bundle with all platform packages |
| Story | `stories/{story}/dist/` | Compiled story code |
| Browser | `dist/web/{story}/` | HTML, JS bundle, CSS, sourcemap |
| Electron | TBD | Desktop application |

## Common Workflows

### Development (Story Changes Only)

When only changing story code:

```bash
./scripts/build.sh --skip transcript-tester -s dungeo
node dist/cli/sharpee.js --play
```

### Development (Platform Changes)

When changing platform packages:

```bash
# Skip to the first package you changed
./scripts/build.sh --skip stdlib -s dungeo
```

### Web Deployment

Full build for browser deployment:

```bash
./scripts/build.sh -s dungeo -c browser
npx serve dist/web/dungeo
```

### Testing

After any build:

```bash
# CLI testing
node dist/cli/sharpee.js --play

# Run transcript tests
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/navigation.transcript

# Run all transcripts
node dist/cli/sharpee.js --test stories/dungeo --all
```

## Performance Tips

1. **Use `--skip`** - Always skip unchanged packages
2. **Use the bundle** - `node dist/cli/sharpee.js` is faster than loading packages
3. **Skip to transcript-tester** - For story-only changes: `--skip transcript-tester`

## Troubleshooting

### Version not updating

Ensure you're using `build.sh` (the controller), not the individual scripts directly. The controller runs `update-versions.sh` first.

### Build failures

Check the error output. Common issues:
- Missing dependencies: Run `pnpm install`
- TypeScript errors: Check the failing package
- Permission errors (WSL): Use the build scripts, not direct `pnpm build`

### Stale bundle

If the bundle seems stale, force a full rebuild:

```bash
./scripts/build.sh -s dungeo -c browser
```

## Ubuntu/Linux Notes

For environments without global pnpm, legacy ubuntu scripts exist that use `npx pnpm`:
- `build-platform-ubuntu.sh`
- `build-dungeo-ubuntu.sh`
- `build-web-ubuntu.sh`

These may be consolidated into the main scripts with auto-detection in the future.
