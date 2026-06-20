# Sharpee Build System (devkit)

Sharpee stories are built with **`@sharpee/devkit`** (ADR-180) — the `sharpee` command. devkit
orchestrates the build; `tsf` compiles. There are two ways to use it:

- **Authors** write a standalone story project. The `sharpee` command comes from `@sharpee/devkit`,
  and the platform (`@sharpee/sharpee`) is a normal npm dependency — your story compiles against it
  and the platform is **never rebuilt**.
- **Contributors** work inside the Sharpee monorepo and build the platform packages themselves with
  the repo wrapper `./sharpee`.

---

## Authoring a story (standalone project)

```bash
# One-time: get the `sharpee` command
npm install -g @sharpee/devkit

# Scaffold a new story project
sharpee init my-game
cd my-game

# Install the platform (pulls @sharpee/sharpee + @sharpee/devkit from npm)
npm install

# Compile the story (+ the .sharpee bundle, + the browser client if present)
sharpee build

# Emit the project manifest (rooms / objects / NPCs / regions) as JSON
sharpee introspect
```

`sharpee init` scaffolds `src/index.ts` (a starter story), `package.json` (pinned to the platform
version `devkit` shipped with), and `tsconfig.json`. The platform is prebuilt in `node_modules` —
there is no platform build step.

### Adding a web client

```bash
sharpee init-browser          # adds src/browser-entry.ts
sharpee build                 # now also emits the browser client → dist/web/
# serve dist/web/ with any static file server, e.g.:
python3 -m http.server -d dist/web
```

### Author commands

| Command | What it does |
|---|---|
| `sharpee init [dir]` | Scaffold a new story project |
| `sharpee init-browser` | Add a web client (`src/browser-entry.ts`) to the project |
| `sharpee build` | Compile `src/` + emit `.sharpee` (and the browser client if `src/browser-entry.ts` exists) |
| `sharpee build-browser` | (Re)build only the browser client → `dist/web/` |
| `sharpee introspect` | Emit the project manifest (ADR-184/185) as JSON on stdout |
| `sharpee ifid` | IFID utilities (generate, validate) |

### Author outputs

| Target | Output | Contents |
|---|---|---|
| Story | `dist/` | Compiled story (`dist/index.js`) |
| Story bundle | `dist/<id>.sharpee` | Zipped story for distribution |
| Browser client | `dist/web/` | Self-contained web client (open `index.html`) |

---

## Contributing to the platform (monorepo)

Inside the Sharpee monorepo, `./sharpee` builds the platform packages **and** an in-repo reference
story (e.g. `dungeo`) **and** the CLI bundle. This path is for working *on* Sharpee, not for
authoring stories.

```bash
./sharpee build dungeo                 # platform + story + bundle
./sharpee build dungeo --browser       # + browser client (dist/web/dungeo/)
./sharpee build dungeo --skip stdlib   # resume the platform build from a package
./sharpee bundle                       # reassemble dist/cli/sharpee.js only
./sharpee clean                        # remove dist/ dist-esm/ tsbuildinfo
./sharpee verify                       # tsf build --npm + publish dry-run
./sharpee                              # show all options
```

### Monorepo build options (`./sharpee build`)

| Flag | Description |
|------|-------------|
| `[story]` | In-repo story name (resolved `stories/<name>` then `tutorials/<name>`) |
| `--browser` | Also build the self-contained browser client (`dist/web/<story>/`) |
| `--skip <package>` | Resume the platform build from this package short-name |
| `--version <v>` | Version to stamp (default: `packages/sharpee/package.json`) |
| `--build-date <iso>` | Frozen build date (determinism / parity) |
| `--no-version` | Skip version stamping |
| `--no-genai` | Skip genai-api generation |
| `--no-bundle` | Build packages/story but skip the CLI bundle |
| `--esm` | Also run the ESM build pass (implied by `--browser`) |

### Build order (monorepo)

1. **Stamp versions** — writes `version.ts` + `package.json` versions (unless `--no-version`)
2. **Build platform** — compiles all platform packages in dependency order (`pnpm --filter`)
3. **Generate genai-api** — refreshes `packages/sharpee/docs/genai-api/`
4. **Build story** — compiles the story (if given)
5. **Bundle** — assembles `dist/cli/sharpee.js`
6. **Browser client** — `--browser` (if requested)

### Outputs (monorepo)

| Target | Output | Contents |
|--------|--------|----------|
| Platform bundle | `dist/cli/sharpee.js` | Node bundle with all platform packages (~170ms load) |
| Story | `stories/<story>/dist/` | Compiled story code |
| Browser (`--browser`) | `dist/web/<story>/` | Self-contained web client (single-load) |

### Testing (after a monorepo build)

```bash
node dist/cli/sharpee.js --play
node dist/cli/sharpee.js --test stories/dungeo/tests/transcripts/rug-trapdoor.transcript
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript --stop-on-failure
```

### Performance tips (monorepo)

1. **`--skip <pkg>`** — resume from the changed package; skip unchanged ones.
2. **`--no-version`** — skip version stamping during rapid iteration.
3. **Use the bundle** — `node dist/cli/sharpee.js` loads in ~170ms vs 5+ seconds for packages.

---

## Troubleshooting

### Stale / silent no-op build

`sharpee build` asserts each package emits `dist/index.js` (the `.tsbuildinfo` silent-no-op class is
precluded). If artifacts look stale, run `sharpee clean` (monorepo) or delete `dist/` (author
project) and rebuild.

### Circular dependency

```bash
npx madge --circular dist/index.js
```

Fix by changing barrel imports to direct file imports.

### TypeScript errors (monorepo)

Build the failing package's dependencies first, or use `--skip <pkg>` to build from it.
