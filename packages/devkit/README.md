# @sharpee/devkit

The Sharpee CLI engine — build, test, verify, and scaffold orchestration for Interactive Fiction projects.

## Installation

```bash
npm install @sharpee/devkit
```

`@sharpee/devkit` provides the `sharpee` command. For standalone story authoring,
install it globally or as a dev dependency:

```bash
npm install -g @sharpee/devkit
# then
sharpee build
sharpee init my-story
```

Inside the Sharpee monorepo, invoke it through the repo-root `./sharpee` wrapper
instead of a global install.

## Overview

devkit orchestrates the build; [`tsf`](https://www.npmjs.com/package/ts-forge) compiles (ADR-180):

- **Location-aware `build`** — inside the monorepo it builds platform + bundle + in-repo stories; in a standalone author project it compiles `src/` and emits the `.sharpee` bundle and browser client
- **Scaffolding** — `init` / `init-browser` create new story projects and add browser clients
- **Theming (ADR-188)** — `build-browser` wires the themes a story lists in its `package.json` `sharpee.themes`: built-in ids (`"modern-dark"`, …, copied from `@sharpee/platform-browser`) and the author's own theme (a `[data-theme]` block in `browser/<story>.css`, listed inline as `{ "id", "name" }`)
- **Verify** — `tsf build --npm` plus a publish dry-run before shipping packages
- **npm-consumer testing** — `test:npm` stands up a real npm consumer for a story and runs its transcripts
- **Story registry** — `register` / `list` map a story name to a path under `~/.sharpee/devkit`
- Programmatic surfaces (`runBuild`, `runVerify`, `runTestNpm`, registry helpers, etc.) are also exported for embedding and testing

## Usage

```bash
# Build a story (location-aware: monorepo vs standalone author project)
sharpee build my-story
sharpee build my-story --browser        # also build the self-contained browser client
sharpee build --zifmia                  # also build the zifmia multi-user server (monorepo)
sharpee build my-story --skip stdlib    # resume the platform build from a package

# Scaffold and clients
sharpee init my-story                   # new story project
sharpee init-browser                    # add a browser client to the current project
sharpee build-browser                   # build the browser client only

# Validate and inspect
sharpee verify                          # tsf build --npm + publish dry-run
sharpee clean                           # remove dist/, dist-esm/, tsbuildinfo
sharpee introspect [dir]                # emit the IDE project manifest (ADR-184/185) as JSON
sharpee ifid                            # IFID utilities (generate, validate)
sharpee bundle                          # (monorepo) assemble dist/cli/sharpee.js

# npm-consumer transcript testing
sharpee test:npm my-story --local --chain

# Story registry
sharpee register ./path/to/story --name my-story
sharpee list
```

## Commands

| Command | Description |
|---------|-------------|
| `build [story\|path]` | Build a story (location-aware: monorepo vs standalone) |
| `build-browser` | Build the browser client only |
| `init <name>` | Scaffold a new story project |
| `init-browser` | Add a browser client to the current project |
| `introspect [dir]` | Emit the IDE project manifest (ADR-184/185) as JSON |
| `ifid` | IFID utilities (generate, validate) |
| `bundle` | (monorepo) Assemble `dist/cli/sharpee.js` |
| `clean` | Remove build artifacts |
| `verify` | `tsf build --npm` + publish dry-run |
| `test:npm <loc\|name>` | Stand up an npm consumer for a story and run its transcripts |
| `register <location>` | Register a name→path mapping in `~/.sharpee/devkit` |
| `list` | List registered stories |

## Related Packages

- [@sharpee/bootstrap](https://www.npmjs.com/package/@sharpee/bootstrap) - Story loader/assembler
- [@sharpee/transcript-tester](https://www.npmjs.com/package/@sharpee/transcript-tester) - Transcript test runner
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
