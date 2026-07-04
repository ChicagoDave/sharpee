::: {.part-page}

# Volume I — Getting Started {.part .unnumbered}

:::

# Installing Sharpee: The CLI and Your First Project

Before you can build the Family Zoo, you need a working toolchain: Node.js, an
editor, and the `sharpee` command. This chapter gets you from an empty folder to a
built story in a handful of commands, and along the way explains the foundation
the whole platform stands on.

## Why Node and TypeScript?

Most interactive-fiction systems give you a purpose-built authoring language:
Inform's natural-language syntax, TADS's bespoke object language. Sharpee takes a
different path: a story is plain **TypeScript** that runs on **Node.js**, the same
mainstream toolchain used across the web- and server-software world.

That's a real trade-off. The cost is that you write actual code from the start;
there's no gentler English-like surface to ease in on. The payoff is everything
that comes *with* a mainstream ecosystem:

- **Real editors.** Visual Studio Code (or any TypeScript-aware editor) gives you
  autocomplete, inline documentation, and will flag as you type.
- **A type checker.** TypeScript catches whole classes of mistakes, such as a
  misspelled property or the wrong kind of value, at compile time instead of
  mid-playthrough.
- **The npm ecosystem.** Installing Sharpee, or any other library, is one command,
  and the platform itself is just a package your story depends on.
- **Ordinary tooling.** Version control, testing, formatting: the things millions
  of developers already use work on a Sharpee story unchanged.

In short, the "platform" isn't a separate application you launch. It's a library
you import. The rest of this chapter installs that ecosystem and the Sharpee
command that drives it.

## Working in a terminal

Every Sharpee command in this book is typed into a **terminal**, a text window
where you enter commands and read their output. If you've never opened one, here's
where to find it:

- **macOS**: open **Terminal** (Applications → Utilities, or press ⌘-Space and
  type "Terminal").
- **Windows**: open **Windows Terminal** or **PowerShell** from the Start menu.
- **Linux**: open your terminal emulator (often **Ctrl-Alt-T**).

You'll see a prompt waiting for input. Type a command, press **Enter** to run it,
and its output appears on the lines below. Throughout the book, a shaded block
like this is one or more commands to type at that prompt:

```bash
node --version
```

Two you'll lean on constantly: `cd <folder>` moves you into a folder (so
`cd my-game` steps into the project you just made), and running a command with no
arguments, plain `sharpee`, prints its help.

## Installing Node and npm

**Node.js** is the runtime that executes your story; **npm** is its package
manager, and it installs *with* Node, so you don't fetch it separately. If you've
done any modern JavaScript work you likely have both already; if not, install them
once:

1. Go to [nodejs.org](https://nodejs.org) and download the **LTS** ("Long-Term
   Support") build for your operating system.
2. Run the installer and accept the defaults. (If you expect to juggle several Node
   versions, a version manager like **nvm** or **fnm** is a fine alternative, but
   the installer is the simplest start.)
3. Open a terminal and confirm both tools are on your path:

```bash
node --version    # want v18.0.0 or newer
npm --version
```

If each prints a version number, you're set. `npm` is how you'll install Sharpee
next, and any other library a story ever needs.

## Installing the CLI

Everything you do to a story, scaffold it, compile it, bundle it, goes through
one command, `sharpee`. It ships in the `@sharpee/devkit` package; install it
once, globally:

```bash
npm install -g @sharpee/devkit
```

Now `sharpee` is on your path. The platform itself (`@sharpee/sharpee`: the world
model, parser, standard library, and presentation layer) is *not* installed
globally; each story pulls it in as an ordinary dependency, so different stories
can pin different platform versions.

## Creating a story project

`sharpee init` scaffolds a new project. On its own it walks you through a short
wizard (story title, package ID, author, description), each question defaulting
to a sensible value (the directory name, your username, and so on). Pass `-y` to
accept every default and scaffold in one shot, which is what we'll do here:

```bash
sharpee init my-zoo -y
cd my-zoo
npm install
```

(Drop the `-y` if you'd rather answer the prompts yourself; the `my-zoo` argument
just supplies the default for the first question.) `init` writes a small, complete
starting point; `npm install` pulls down the platform it pins. After that you have:

```
my-zoo/
  src/
    index.ts        # a single starter file that hosts your story
  package.json      # pinned to the platform version devkit shipped with
  tsconfig.json     # TypeScript config, set up for Sharpee
  .gitignore        # ignores node_modules/, dist/, logs
```

`src/index.ts` is where the story lives. Right now it's a starter stub; in the
next chapter you'll replace it with the first room of the zoo. The platform
arrives prebuilt in `node_modules`, so there is no platform to compile; only your
story.

## Building the story

```bash
sharpee build
```

`build` compiles `src/` and produces two artifacts you care about in `dist/`
(alongside TypeScript's `.d.ts` declaration files):

- `dist/index.js`: your compiled story.
- `dist/<id>.sharpee`: a single zipped **story bundle**, the unit you hand to a
  client or share for distribution.

Whenever you change the story, `sharpee build` again. (If a build ever looks
stale, delete `dist/` and rebuild from a clean slate; `build` already checks that
each step emits output, so a stale `dist/` rarely survives a rebuild on its own.)

## Playing it

A story bundle isn't much fun to read as a `.sharpee` file; you want to *play*
it. The simplest way is a self-contained web client. Add one to your project, then
build:

```bash
sharpee init-browser          # adds src/browser-entry.ts
# now also emits a web client → dist/web/
sharpee build
```

`dist/web/` is a complete, static web page. Serve it with any static file
server and open it in a browser:

```bash
python3 -m http.server -d dist/web
```

That's the loop you'll use throughout the book: edit `src/`, `sharpee build`,
refresh the page, play.

> **Every snippet, online.** As you work through the book, the full set of code
> snippets is browsable chapter by chapter, each step alongside the complete
> runnable file it builds up to, at
> [sharpee.net/book-snippets](https://sharpee.net/book-snippets.html).

## The CLI at a glance

You've met most of these already; here's the full set you'll reach for as an
author:

| Command | What it does |
|---|---|
| `sharpee init [dir] [-y]` | Scaffold a new story project (`-y` skips the prompts) |
| `sharpee init-browser` | Add a web client (`src/browser-entry.ts`) |
| `sharpee build` | Compile `src/` and emit the `.sharpee` bundle (and the web client, if present) |
| `sharpee build-browser` | Rebuild only the web client → `dist/web/` |
| `sharpee introspect` | Print the project's rooms, objects, and NPCs as JSON |
| `sharpee ifid` | Generate or validate an IFID (a story's unique identifier) |
| `sharpee register <location> [--name]` | Register a story name→path mapping, so `build` works from anywhere |
| `sharpee list` | List registered stories |

Run `sharpee` with no arguments any time to see the current list.

## A TypeScript primer

The chapters ahead are full of TypeScript, but they lean on only a handful of its
features. If the snippets below read clearly, you have everything you need. The
book introduces the rest in context, and your editor fills the gaps.

**TypeScript is JavaScript with types.** A *type annotation*, the `: string` part
below, tells the compiler what kind of value something holds, so it can flag a
mistake before you run anything:

```typescript
const title: string = 'Willowbrook Family Zoo';
let turns: number = 0;
```

`const` declares a value that won't be reassigned; `let`, one that will. You'll
rarely write the annotations by hand, since TypeScript infers most of them, but
you'll read them constantly.

**Objects are bundles of named values**, written `{ key: value }`. In a type, a
`?` marks a property as optional:

```typescript
const options = { isOpen: false, capacity: 10 };
// e.g. `capacity?: number` means capacity may be left out
```

**Classes are templates you make instances of** with `new`. Most of Sharpee's
building blocks, traits especially, are classes:

```typescript
const light = new IdentityTrait({ name: 'flashlight' });
```

**An interface is a contract.** A class that `implements` an interface promises to
provide everything the interface requires. Every Sharpee story is a class that
implements the `Story` interface:

```typescript
class MyStory implements Story { /* … */ }
```

**Imports bring in code from other packages; exports hand yours out:**

```typescript
import { IdentityTrait } from '@sharpee/world-model';
export const story = new MyStory();
```

**Functions can be written compactly as arrow functions**, common in the short
callbacks you'll pass to the platform:

```typescript
items.some(item => item.name === 'feed');
```

That's the working vocabulary. Don't try to memorize it. You'll absorb it by
building the zoo, one chapter at a time.

## Key takeaway

Sharpee stories are TypeScript on Node, so the toolchain is the mainstream one:
install Node (which brings npm), then the CLI with `npm install -g @sharpee/devkit`.
Scaffold a project with `sharpee init`, write your story in `src/index.ts`, compile
and bundle it with `sharpee build`, and play it by adding a web client
(`sharpee init-browser`) and serving `dist/web/`. The Sharpee platform has everything you need to create an interactive fiction story.
