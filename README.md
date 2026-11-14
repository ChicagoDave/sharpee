# Sharpee

[![npm](https://img.shields.io/npm/v/@sharpee/sharpee/latest?label=npm&color=orange)](https://www.npmjs.com/package/@sharpee/sharpee)

Sharpee is a platform for writing parser-based interactive fiction. It has three parts:

- **Chord**, the story language. An author writes a `.story` file in plain, indented prose-like text.
- **Chord Writer**, the desktop app for writing, building, playing and testing Chord stories.
- **The platform**, a set of TypeScript packages (engine, world model, standard actions, parser, English text) that runs every story. Stories can also be written directly in TypeScript against these packages.

Documentation, downloads and playable stories are at [sharpee.net](https://sharpee.net).

## What a story looks like

This is part of [Cloak of Darkness](./stories/cloak-of-darkness/cloak.story), the standard IF demonstration, in Chord:

```
create the Foyer Bar
  a room, dark while the player has the velvet cloak
  aka bar

  The bar, much rougher than you'd have guessed after the opulence of
  the foyer to the north, is completely empty. There seems to be some
  sort of message scrawled in the sawdust on the floor.

  after the player entering while in-darkness
    phrase stumble
    first time
      change the message to trampled
    third time
      change the message to obliterated
  end after

create the velvet cloak
  aka cloak
  a thing, wearable

  A handsome cloak, of velvet trimmed with satin, and slightly
  splattered with raindrops. Its blackness is so deep that it almost
  seems to suck light from the room.

create the brass hook
  aka hook, peg
  a supporter, scenery
  holds 1
  in the Cloakroom

  It's just a small brass hook, screwed to the wall.
```

The whole game is 107 lines. The [Chord guide](https://sharpee.net/chord) covers the language from the first room onward.

## Quick start

### With Chord Writer (macOS)

[Download Chord Writer](https://sharpee.net/chord-writer/download). It bundles the whole toolchain, so there is nothing else to install. [Your first story](https://sharpee.net/chord-writer/your-first-story) walks through it.

### With the command line

The `sharpee` CLI ships in `@sharpee/devkit` and needs Node 18 or later:

```bash
npm install -g @sharpee/devkit

sharpee init my-adventure
cd my-adventure
npm install
sharpee build     # story + playable web client in dist/web/<id>/
sharpee play      # play in the terminal
```

`sharpee init` scaffolds a Chord project: one `my-adventure.story` file with a room, a lantern and a player. Edit it and rebuild.

| Command | What it does |
|---------|-------------|
| `sharpee init <name>` | Scaffold a new story project (Chord by default; `--ts` for TypeScript) |
| `sharpee build` | Build the story and its browser client |
| `sharpee play` | Play the story in the terminal |
| `sharpee test` | Run the story's tests |
| `sharpee claim` | Lock a fact reached in a played line as a claim the tests keep proving |
| `sharpee compose <file>.story` | Compile a Chord story to Story IR; `--check` runs only the load-time gates |
| `sharpee publish` | Build and zip a distributable browser app |
| `sharpee messages` | List every overridable platform message |
| `sharpee ifid` | Generate or validate an IFID |
| `sharpee --version` | Print the platform and Chord language versions |

Run `sharpee --help` for the full list.

### Writing a story in TypeScript

`sharpee init my-adventure --ts` scaffolds a TypeScript story project that imports the platform packages directly. *The Sharpee Author and Developer Manual* ([`docs/book/`](./docs/book/)) teaches this path, and the [platform pages](https://sharpee.net/sharpee) on the site describe the packages.

## How it fits together

```
  my-adventure.story            src/index.ts
        |  Chord compiler            |  (TypeScript story)
        v                            |
     Story IR                        |
        |  story-loader              |
        v                            v
+-----------------------------------------------+
|                    Story                      |
+--------------------+--------------------------+
| stdlib (actions)   | lang-en-us (messages)    |
| plugins (scheduler,| parser-en-us (grammar)   |
|  state machines)   |                          |
+--------------------+--------------------------+
| engine | world-model | channel-service        |
+-----------------------------------------------+
| core | if-domain | if-services | text-blocks  |
+-----------------------------------------------+
```

A Chord story compiles to a Story IR, which `@sharpee/story-loader` turns into the same kind of story a TypeScript author writes by hand. From there one runtime serves both.

A few principles hold across the platform:

1. **Actions emit events, not text.** An action records what happened with a message id; the language layer turns it into prose at the end of the turn.
2. **Actions run in four phases**: validate, execute, report, and blocked.
3. **Behaviors own mutations.** Actions coordinate; behaviors change the world.
4. **Traits compose what an entity can do**: container, openable, lockable, wearable and so on.
5. **Output travels over channels.** Prose, status, media and layout reach the client the same way, so one story runs in the terminal, the browser and Chord Writer.

[`docs/core-concepts/README.md`](./docs/core-concepts/README.md) is the full reference.

## Packages

All of these are published on npm under the `@sharpee` scope. `@sharpee/sharpee` is the umbrella package; it re-exports the story runtime baseline, not every symbol.

| Area | Packages |
|------|----------|
| Contracts and types | `core`, `if-domain`, `if-services`, `text-blocks`, `media`, `ide-protocol`, `story-runtime-baseline` |
| World and engine | `world-model`, `engine`, `event-processor`, `stdlib`, `plugins`, `plugin-scheduler`, `plugin-state-machine` |
| Language | `parser-en-us`, `lang-en-us` |
| Chord | `chord` (the compiler), `story-loader` (the Story IR interpreter) |
| Authoring conveniences (TypeScript) | `helpers`, `queries`, `character` |
| Channels and clients | `channel-service`, `platform-browser` |
| Extensions | `ext-scoring`, `ext-chapters`, `ext-hunger`, `ext-basic-combat`, `ext-testing` |
| Build, test and tooling | `devkit` (the `sharpee` CLI), `bootstrap`, `transcript-tester`, `branch-tester`, `world-index` |

Each is described in [the core concepts](./docs/core-concepts/README.md#the-packages). `packages/map-editor` is an Electron application, not a library, and is not part of a release.

## Stories in this repository

| Story | Location | What it is |
|-------|----------|------------|
| Cloak of Darkness | `stories/cloak-of-darkness` | The standard three-room demonstration, in Chord |
| The Folly at Fernhill | `branch-stories/fernhill` | A complete Chord game with a recorded test tree; the site's [Fernhill tutorial](https://sharpee.net/learn/fernhill) walks through it |
| The Ides of March | `branch-stories/ides-of-march` | A complete Chord game with a recorded test tree |
| Family Zoo (Chord) | `branch-stories/familyzoo`, `familyzoo-v01` to `familyzoo-v16` | John Googol's sixteen-step Chord tutorial, mirrored here |
| Family Zoo (TypeScript) | `tutorials/familyzoo/v1.5.0`, `tutorials/familyzoo/v2.0.0` | The manual's chapter-by-chapter snapshots, built against the published packages |
| Dungeo | `stories/dungeo` | A TypeScript implementation of mainframe Zork, and the platform's regression suite |

`test-stories/` holds small stories that exist only to test the platform. They are never published and are not samples.

## Working on Sharpee itself

Prerequisites (Node, pnpm at the exact declared version, and the platform-specific extras) are listed with their checks in [`docs/core-concepts/prerequisites.md`](./docs/core-concepts/prerequisites.md). Read it before the first build on a new machine.

```bash
git clone https://github.com/ChicagoDave/sharpee.git
cd sharpee
corepack enable        # pins pnpm to the version package.json declares
pnpm install

# Fresh clone only, once: tsf compiles the platform packages, then repokit
# itself is built. tsf does not build it, so ./repokit does not exist yet.
npx tsf build
pnpm --filter @sharpee/repokit build

# Build the platform, the CLI bundle and Dungeo
./repokit build dungeo

# Run one package's tests
pnpm --filter '@sharpee/stdlib' test

# Run Dungeo's walkthrough chain against the bundle
node dist/cli/sharpee.js --test --chain stories/dungeo/walkthroughs/wt-*.transcript
```

Three commands carry the name, and they do different jobs:

- `./repokit` builds the platform and the in-repo stories. Use it for all work in this repository; `pnpm build` is not a substitute.
- `./sharpee` is the author tool (`@sharpee/devkit`) run from the repository.
- `dist/cli/sharpee.js` is the bundle `./repokit build` produces. It runs transcript tests and interactive play.

Chord Writer's source is in [`tools/ide/`](./tools/ide/README.md). Design decisions are recorded as ADRs in [`docs/architecture/adrs/`](./docs/architecture/adrs/); they record what was decided at the time, so read the code before taking one as a description of how something works now. See [CONTRIBUTING.md](./CONTRIBUTING.md) before opening a pull request.

## License

MIT License. Copyright 2025-2026 David Cornelson.

## Links

- [Website and documentation](https://sharpee.net)
- [Chord guide](https://sharpee.net/chord)
- [Chord Writer download](https://sharpee.net/chord-writer/download)
- [Play stories in the browser](https://sharpee.net/play)
- [Releases](https://sharpee.net/releases) and [roadmap](https://sharpee.net/roadmap)
- [npm package](https://www.npmjs.com/package/@sharpee/sharpee)
- [Issue tracker](https://github.com/ChicagoDave/sharpee/issues)
