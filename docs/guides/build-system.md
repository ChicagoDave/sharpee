# Sharpee Build System (devkit)

This guide explains how to build Sharpee platform packages, stories, and client
bundles with **`@sharpee/devkit`** (ADR-180). devkit orchestrates the build; `tsf`
compiles. In-repo, invoke it with `node packages/devkit/dist/cli.js`; once
`@sharpee/sharpee` is installed, the `devkit` bin is on PATH (`devkit build …`).

## Quick Start

```bash
# Build platform + story, then bundle (most common)
node packages/devkit/dist/cli.js build dungeo

# + self-contained browser client (dist/web/dungeo/)
node packages/devkit/dist/cli.js build dungeo --browser

# + zifmia multi-user server (tools/zifmia/dist/)
node packages/devkit/dist/cli.js build --zifmia

# Show all options
node packages/devkit/dist/cli.js
```

## Build Options (`devkit build`)

| Flag | Description |
|------|-------------|
| `[story]` | Story name to build (resolved `stories/<name>` then `tutorials/<name>`) |
| `--browser` | Also build the self-contained browser client (`dist/web/<story>/`); requires a story |
| `--zifmia` | Also build the zifmia multi-user server (`tools/zifmia/dist/`) |
| `--skip <package>` | Resume the platform build from this package short-name |
| `--version <v>` | Version to stamp (default: `packages/sharpee/package.json`) |
| `--build-date <iso>` | Frozen build date (determinism / parity) |
| `--no-version` | Skip version stamping |
| `--no-genai` | Skip genai-api generation |
| `--no-bundle` | Build packages/story but skip the CLI bundle |
| `--esm` | Also run the ESM build pass (implied by `--browser`/`--zifmia`) |

Other commands: `devkit bundle` (assemble `dist/cli/sharpee.js` only),
`devkit clean` (remove `dist`/`dist-esm`/`tsbuildinfo`), `devkit verify`
(`tsf build --npm` + publish dry-run), `devkit test:npm <location>` (npm consumer test).

## Build Order

1. **Stamp versions** — writes `version.ts` + `package.json` versions (unless `--no-version`)
2. **Build platform** — compiles all platform packages in dependency order (via `pnpm --filter`)
3. **Generate genai-api** — refreshes `packages/sharpee/docs/genai-api/`
4. **Build story** — compiles the story (if given)
5. **Bundle** — assembles `dist/cli/sharpee.js`
6. **Client targets** — `--browser` and/or `--zifmia` (if requested)

## Version System

Versions use a simple prerelease format `X.Y.Z-beta` (e.g. `0.9.113-beta`). The build
stamps story/client `version.ts` files:

```typescript
export const STORY_VERSION = '1.0.0';
export const BUILD_DATE = '2026-06-18T00:00:00Z';
export const ENGINE_VERSION = '0.9.113';
```

## Outputs

| Target | Output | Contents |
|--------|--------|----------|
| Platform bundle | `dist/cli/sharpee.js` | Node bundle with all platform packages (~170ms load) |
| Story | `stories/{story}/dist/` | Compiled story code |
| Browser (`--browser`) | `dist/web/{story}/` | Self-contained IIFE `game.js` + CSS + themes + assets (single-load) |
| Zifmia (`--zifmia`) | `tools/zifmia/dist/` | Multi-user server (ADR-177) |

> The abandoned `shite` parts bin, the legacy Tauri `--runner`, and the `.sharpee`
> story bundle are **not** built by devkit (ADR-180 dropped/deferred them).

## Common Workflows

### Story development (fastest iteration)

```bash
node packages/devkit/dist/cli.js build dungeo --no-version --skip transcript-tester
node dist/cli/sharpee.js --play
```

### Platform development — resume from the changed package

```bash
node packages/devkit/dist/cli.js build dungeo --skip stdlib
```

### Running tests (after any build)

```bash
node dist/cli/sharpee.js --play
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure
```

### Web deployment

```bash
node packages/devkit/dist/cli.js build dungeo --browser
npx serve dist/web/dungeo
```

## Performance Tips

1. **Use `--skip <pkg>`** — resume from the changed package; skip unchanged ones.
2. **Use `--no-version`** — skip version stamping during rapid iteration.
3. **Use the bundle** — `node dist/cli/sharpee.js` loads in ~170ms vs 5+ seconds for packages.

## Troubleshooting

### Stale / silent no-op build

`devkit build` asserts each package emits `dist/index.js` (the `.tsbuildinfo` silent-no-op
class is precluded). If artifacts look stale, run `devkit clean` then rebuild.

### Circular dependency

```bash
npx madge --circular stories/dungeo/dist/index.js
```

Fix by changing barrel imports to direct file imports.

### TypeScript errors

Build the failing package's dependencies first, or use `--skip <pkg>` to build from it.
