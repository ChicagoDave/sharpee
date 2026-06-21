::: {.part-page .has-poem}

# Volume I — Getting Started {.part .unnumbered}

| If you can keep your head when all about you
|    Are losing theirs and blaming it on you;
| If you can trust yourself when all men doubt you,
|    But make allowance for their doubting too;
| If you can wait and not be tired by waiting,
|    Or, being lied about, don't deal in lies,
| Or, being hated, don't give way to hating,
|    And yet don't look too good, nor talk too wise;
|
| If you can dream—and not make dreams your master;
|    If you can think—and not make thoughts your aim;
| If you can meet with triumph and disaster
|    And treat those two impostors just the same;
| If you can bear to hear the truth you've spoken
|    Twisted by knaves to make a trap for fools,
| Or watch the things you gave your life to broken,
|    And stoop and build 'em up with wornout tools;
|
| If you can make one heap of all your winnings
|    And risk it on one turn of pitch-and-toss,
| And lose, and start again at your beginnings
|    And never breathe a word about your loss;
| If you can force your heart and nerve and sinew
|    To serve your turn long after they are gone,
| And so hold on when there is nothing in you
|    Except the Will which says to them: "Hold on";
|
| If you can talk with crowds and keep your virtue,
|    Or walk with kings—nor lose the common touch;
| If neither foes nor loving friends can hurt you;
|    If all men count with you, but none too much;
| If you can fill the unforgiving minute
| With sixty seconds' worth of distance run—
|    Yours is the Earth and everything that's in it,
| And—which is more—you'll be a Man, my son!

*— Rudyard Kipling, "If—" (1910)*
:::

# Installing Sharpee & the Sharpee CLI

Before you can build the Family Zoo, you need two things on your machine: a place
to write the story, and the `sharpee` command that turns it into something
playable. This chapter gets you from an empty folder to a built story in a handful
of commands — and introduces the CLI you'll use in every chapter after this one.

## What you need

Sharpee stories are TypeScript, so the toolchain is the ordinary Node toolchain:

- **Node.js 18 or newer** — check with `node --version`.
- **A text editor** — anything works; Visual Studio Code has the smoothest
  TypeScript experience.
- **Comfort reading TypeScript.** You don't need to be an expert — the book
  teaches the patterns as it goes — but you should be able to read a class and a
  function without flinching.

That's the whole list. There's no game engine to install separately, no C
compiler, no runtime besides Node.

## Installing the CLI

Everything you do to a story — scaffold it, compile it, bundle it — goes through
one command, `sharpee`. It ships in the `@sharpee/devkit` package; install it
once, globally:

```bash
npm install -g @sharpee/devkit
```

Now `sharpee` is on your path. The platform itself (`@sharpee/sharpee` — the world
model, parser, standard library, and presentation layer) is *not* installed
globally; each story pulls it in as an ordinary dependency, so different stories
can pin different platform versions.

## Creating a story project

`sharpee init` scaffolds a new project:

```bash
sharpee init my-zoo
cd my-zoo
npm install
```

`init` writes a small, complete starting point; `npm install` pulls down the
platform it pins. After that you have:

```
my-zoo/
  src/
    index.ts        # your story — a single starter file to begin with
  package.json      # pinned to the platform version devkit shipped with
  tsconfig.json     # TypeScript config, set up for Sharpee
```

`src/index.ts` is where the story lives. Right now it's a starter stub; in the
next chapter you'll replace it with the first room of the zoo. The platform
arrives prebuilt in `node_modules`, so there is no platform to compile — only your
story.

## Building the story

```bash
sharpee build
```

`build` compiles `src/` and produces two things in `dist/`:

- `dist/index.js` — your compiled story.
- `dist/<id>.sharpee` — a single zipped **story bundle**, the unit you hand to a
  client or share for distribution.

Whenever you change the story, `sharpee build` again. (If a build ever looks
stale, delete `dist/` and rebuild — `build` checks that each step actually emits
output, so a true no-op is rare.)

## Playing it

A story bundle isn't much fun to read as a `.sharpee` file — you want to *play*
it. The simplest way is a self-contained web client. Add one to your project, then
build:

```bash
sharpee init-browser          # adds src/browser-entry.ts
sharpee build                 # now also emits a web client → dist/web/
```

`dist/web/` is a complete, static web page. Serve it with any static file
server and open it in a browser:

```bash
python3 -m http.server -d dist/web
```

That's the loop you'll use throughout the book: edit `src/`, `sharpee build`,
refresh the page, play.

## The CLI at a glance

You've met most of these already; here's the full set you'll reach for as an
author:

| Command | What it does |
|---|---|
| `sharpee init [dir]` | Scaffold a new story project |
| `sharpee init-browser` | Add a web client (`src/browser-entry.ts`) |
| `sharpee build` | Compile `src/` and emit the `.sharpee` bundle (and the web client, if present) |
| `sharpee build-browser` | Rebuild only the web client → `dist/web/` |
| `sharpee introspect` | Print the project's rooms, objects, and NPCs as JSON |
| `sharpee ifid` | Generate or validate an IFID (a story's unique identifier) |

Run `sharpee` with no arguments any time to see the current list.

## Key takeaway

Install the CLI once with `npm install -g @sharpee/devkit`; scaffold a project with
`sharpee init`; write your story in `src/index.ts`; compile and bundle it with
`sharpee build`; and play it by adding a web client (`sharpee init-browser`) and
serving `dist/web/`. The platform is just a dependency your story compiles
against — you never build it yourself. With the toolchain in place, the next
chapter writes the zoo's first room.
