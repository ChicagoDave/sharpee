# Getting Started with Sharpee (Authors)

> **BETA** (v0.9.x). The complete, worked tutorial is **The Sharpee Author and
> Developer Manual** in [`docs/book/`](../../book/) — it builds a full story (the
> Family Zoo) one concept at a time. This page is just the short setup; follow the
> book for the actual walkthrough.

## What is Sharpee?

Sharpee is a TypeScript platform for parser-based interactive fiction. You write
your story in TypeScript against the `@sharpee/sharpee` library — a world model
(rooms, objects, characters), a command parser, a standard action library, and a
presentation layer — and the `sharpee` CLI compiles it into a playable game.

## Prerequisites

- **Node.js 18 or newer** (`node --version`)
- A text editor (VS Code recommended)
- Basic familiarity with TypeScript

## Install the CLI

The `sharpee` command ships in `@sharpee/devkit`:

```bash
npm install -g @sharpee/devkit
```

The platform (`@sharpee/sharpee`) is a normal dependency of each story project, not
a global install — so different stories can pin different platform versions.

## Create a project

```bash
sharpee init my-game
cd my-game
npm install
```

`sharpee init` scaffolds a working starter — `src/index.ts` (a runnable story),
`package.json` (pinned to the platform version), and `tsconfig.json`. Begin from
the generated `src/index.ts` rather than copying code by hand: it always imports
the right symbols for the platform version you installed.

## Build and play

```bash
sharpee build                       # compile src/ → dist/ + dist/<id>.sharpee bundle
sharpee init-browser                # add a self-contained web client
sharpee build                       # now also emits dist/web/
python3 -m http.server -d dist/web  # open in a browser to play
```

## How a story is shaped

A story is a TypeScript class that implements the `Story` interface with two
methods the engine calls at startup:

- **`createPlayer(world)`** — create the player entity.
- **`initializeWorld(world)`** — build the world: create entities with
  `world.createEntity(...)` and give them behavior by adding traits
  (`RoomTrait`, `IdentityTrait`, `ContainerTrait`, and so on).

The book's chapter *Your First Room* walks through this line by line.

## CLI reference

| Command | What it does |
|---|---|
| `sharpee init [dir]` | Scaffold a new story project |
| `sharpee init-browser` | Add a web client (`src/browser-entry.ts`) |
| `sharpee build` | Compile `src/` and emit the `.sharpee` bundle (and the web client, if present) |
| `sharpee build-browser` | Rebuild only the web client → `dist/web/` |
| `sharpee introspect` | Print the project's rooms, objects, and NPCs as JSON |
| `sharpee ifid` | Generate or validate an IFID (a story's unique identifier) |

Run `sharpee` with no arguments to see the current list.

## Where to go next

- **The Sharpee Author and Developer Manual** — [`docs/book/`](../../book/) (the full tutorial)
- Build system & the CLI — [`docs/guides/build-system.md`](../../guides/build-system.md)
- Creating stories — [`docs/guides/creating-stories.md`](../../guides/creating-stories.md)
- Event handlers — [`docs/guides/event-handlers.md`](../../guides/event-handlers.md)
- Transcript testing — [`docs/guides/transcript-testing.md`](../../guides/transcript-testing.md)
- Public API reference — [`packages/sharpee/docs/genai-api/`](../../../packages/sharpee/docs/genai-api/)
