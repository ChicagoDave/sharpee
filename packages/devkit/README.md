# @sharpee/devkit

The Sharpee author CLI — build, test, and scaffold an author's own Interactive Fiction story project.

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

> **ADR-187 split**: devkit is the **author tool** — it builds an author's own
> story project, project-relative. The in-repo platform build (packages, CLI
> bundle, verify, test:npm, clean) belongs to a separate tool, `repokit`
> (`./repokit` in the monorepo). A workspace story passed to `sharpee build`
> is redirected to repokit.

## Overview

devkit orchestrates the build; [`tsf`](https://www.npmjs.com/package/ts-forge) compiles (ADR-180):

- **`build`** — builds a story project (cwd or registered name). A Chord `.story` file or a project directory holding one builds straight to a self-contained browser app (browser is the default client, ADR-252); a TypeScript project compiles `src/` and emits the `.sharpee` bundle, with `--browser` for the browser client
- **`compose`** — compiles a Chord `.story` file to Story IR (ADR-210); `--check` runs only the load-time gates
- **Scaffolding** — `init` / `init-browser` create new story projects and add browser clients
- **Theming (ADR-188)** — `build-browser` wires the themes a story lists in its `package.json` `sharpee.themes`: built-in ids (`"modern-dark"`, …, copied from `@sharpee/platform-browser`) and the author's own theme (a `[data-theme]` block in `browser/<story>.css`, listed inline as `{ "id", "name" }`)
- **Testing and play** — `test` runs the project's transcript tests; `play` runs the project interactively (REPL)
- **Story registry** — `register` / `list` map a story name to a path under `~/.sharpee/devkit`
- Programmatic surfaces are also exported for embedding and testing: `runRegister` / `runList`, registry helpers (`registerStory`, `listStories`, `lookupStory`, …), repo helpers (`findRepoRoot`, `resolveStory`, `detectMode`, …), and the browser-build core (`buildBrowser`, `resolveWiredThemes`, `injectThemes`, …) that repokit delegates to

## Usage

```bash
# Build a story project (cwd or registered name)
sharpee build my-story.story            # Chord story → self-contained browser app (default client)
sharpee build my-story                  # TypeScript project → .sharpee bundle
sharpee build my-story --browser        # also build the self-contained browser client

# Compile a Chord story to Story IR (ADR-210)
sharpee compose my-story.story
sharpee compose my-story.story --check  # load-time gates only (CI mode)

# Scaffold and clients
sharpee init my-story                   # new story project
sharpee init-browser                    # add a browser client to the current project
sharpee build-browser                   # build the browser client only

# Test and play
sharpee test my-story --chain           # run the project's transcript tests
sharpee play my-story                   # play interactively (REPL)

# Inspect
sharpee introspect [dir]                # emit the IDE project manifest (ADR-184/185) as JSON
sharpee ifid                            # IFID utilities (generate, validate)

# Story registry
sharpee register ./path/to/story --name my-story
sharpee list
```

For in-repo platform work — building the packages, the CLI bundle, verify,
test:npm, clean — use `./repokit` in the monorepo instead (ADR-187).

## Commands

| Command | Description |
|---------|-------------|
| `build [<file>.story\|name\|path]` | Build a story project: Chord `.story` → browser app (default client); TypeScript project → `.sharpee` bundle (`--browser` for the browser client) |
| `build-browser` | Build the browser client only |
| `compose <file.story>` | Compile a Chord story to Story IR (ADR-210); `--check` for gates only |
| `init <name>` | Scaffold a new story project |
| `init-browser` | Add a browser client to the current project |
| `test [name\|path] [transcripts…]` | Run the project's transcript tests (`--chain`, `--stop-on-failure`, `--verbose`) |
| `play [name\|path]` | Play the project interactively (REPL) |
| `introspect [dir]` | Emit the IDE project manifest (ADR-184/185) as JSON |
| `ifid` | IFID utilities (generate, validate) |
| `register <location>` | Register a name→path mapping in `~/.sharpee/devkit` |
| `list` | List registered stories |
| `--version` | Print the platform + Chord language version |

Platform/in-repo commands (`verify`, `test:npm`, `clean`, `bundle`, `--zifmia`,
`--skip`) live in `repokit`, not devkit (ADR-187).

## Related Packages

- [@sharpee/bootstrap](https://www.npmjs.com/package/@sharpee/bootstrap) - Story loader/assembler
- [@sharpee/transcript-tester](https://www.npmjs.com/package/@sharpee/transcript-tester) - Transcript test runner
- [@sharpee/sharpee](https://www.npmjs.com/package/@sharpee/sharpee) - Full platform bundle

## License

MIT
