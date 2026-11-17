# Publishing

<!-- PENDING (Phase 5, 2026-11-17): the Chord Writer steps (the Publish tab)
     are pending under D-3. `--no-menu` and `--out` are named from the
     command's usage and were not run. A config file deleted while the header
     still carries an `ifid:` line was not run. -->

The Relighting has been a folder on your machine for thirty-nine
chapters. This one turns it into a single file that you can give to
someone who has never heard of Chord, and who will open it in a browser
and play.

There is little left to write. Publishing is mostly a matter of deciding
what the story is called for good, what number it carries, and whether
its source goes with it.

## The identifier

Chapter 2 mentioned a header field called `ifid:` and said that you do
not need to write one. Chapter 37 built the page for the first time, and
the build's first line was this.

```text
  ✓ Minted the story's ifid into relighting.config.json
```

An **IFID** is an Interactive Fiction Identifier: a long code that
belongs to one work of interactive fiction and to no other. Archives and
catalogues file a story under it. The title of a story can change, and
two stories can share a title. The identifier is what stays the same
from the first release to the last.

The first build made one, and wrote it to a small file beside the
story.

```json
{
  "ifid": "C24E29F8-C36B-4F55-9FE9-B6D75AE7133D",
  "version": 1
}
```

That file, `relighting.config.json`, is where the identifier lives. The
`version` in it is the version of the file's own layout and has nothing
to do with your story. The build also wrote a line into the story's
header, under `id:`.

```chord
story
  title: The Relighting
  id: relighting
  ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D
```

The header's line is a copy, put there so that you can see the
identifier where you see the title. The file is the original. If the two
ever differ, the next build writes the file's value back into the
header, and says nothing about it.

Three rules follow, and they are the whole of what you need to know.

Keep `relighting.config.json` with the story. If you keep your story
under version control, the file goes in. If you copy the story to
another machine, the file is copied too.

Never make a second identifier for the same story. A new release of The
Relighting is still The Relighting.

Do make a new one for a different story. If you copy this folder to
begin a story of your own, delete the config file and the header's
`ifid:` line from the copy, and let its first build mint a fresh one.

The command line has a small tool for the rare day when you need an
identifier by itself.

```shell
sharpee ifid generate
```

```text
C6ABD976-A999-4F4F-92A8-B393F82127A6
```

## The version

`story-version:` has stood at `0.7.0` since Part VII. The number is
yours to count as you please, and the player sees it. The story prints
it under the title when it opens.

```text
The Relighting
Story v1.0.0
Thirty years after the magic went out of the world, a lamp burns blue.
By The Sharpee Project
```

A common habit is to keep the first number at 0 while the story is
unfinished, and to make it 1 on the day you first hand the story to
strangers. Today is that day.

```chord
  story-version: 1.0.0
```

After that, raise the last number when you mend something, and the
middle number when you add something. The reason to be careful about it
is practical. When a player writes to say that the grille will not lift,
the first thing you will ask is which version they are playing.

The identifier and the version answer different questions. The
identifier says which story this is, and it never changes. The version
says which release of it, and it changes every time.

## Whether the source goes too

By default a published story carries no source. The page holds the
compiled story, and your `.story` file stays at home. One header line
changes that.

```chord
  publish-source: yes
```

The line goes in the story header with the other fields, and its place
among them does not matter. With the line, the `.story` file is copied into the published folder
under its own name, and the fragments it imports go with it. The
Relighting is a teaching story and it takes the line. For your own
story the choice is yours, and leaving the line out is a perfectly
good answer.

## Publish

Before you publish, run the tree one last time and read the claims. A
story that is about to go to strangers should hold every claim you made
for it.

```shell
sharpee test .
```

```text
claims: 3 of 3 held (seed 42)
```

Then publish.

```shell
sharpee publish relighting.story
```

```text
📦 Publishing relighting

  Story: The Relighting (relighting)
  ✓ Validated relighting.story (gate-clean) and shipped its source (`publish-source: yes`)
  ✓ Shipped 1 import fragment(s) → imports.json
  ✓ Story IR → dist/relighting.ir.json
  Generated browser entry from template
  ✓ Embedded the compiled story IR into the bundle
  Bundling game.js...
  ✓ Built game.js
  ✓ Copied index.html
  ✓ Copied index-testing.html (IDE testing surface — excluded from publish)
  ✓ Copied platform engine CSS (base, engine, decorations)
  ✓ Wired 2 theme(s): paper, modern-dark
  ✓ Copied relighting.css
  ✓ Copied assets/ (2 entries)

✅ Build complete! (game.js 1907.7 KB)
Output: dist/web/relighting/

  IFID:   C24E29F8-C36B-4F55-9FE9-B6D75AE7133D
  Output: dist/relighting.zip (0.7 MB)

  Unzip anywhere and open index.html, or upload the zip to itch.io.
```

Most of that is the build of chapter 37, and `publish` does run a build.
It differs from `sharpee build` in four ways.

It empties `dist/web/relighting` first, so that nothing left over from
an earlier build can travel with the story.

It leaves out the source map, the file `game.js.map` that chapter 37's
build wrote beside `game.js`. A source map is for finding faults, and a
player has no use for it.

It refuses a story that has no identifier. A build will mint one. A
publish never will, because publishing is the one moment when inventing
a second identifier for an existing story would do real harm.

```text
publish: relighting.story has no identity — no story config and no `ifid:` header. If this story ever had one, restore its `<story-name>.config.json` from version control; otherwise run `sharpee build` once (or open the story in Chord Writer) to mint it.
```

And it writes the zip.

## What ships

`dist/relighting.zip` is the whole published story, in fourteen files.

```text
audio/catch.mp3
audio/lapping.mp3
audio/toll.mp3
base.css
decorations.css
engine.css
game.js
img/lantern-lit.png
imports.json
index.html
relighting.css
relighting.story
themes/modern-dark.css
themes/paper.css
```

`index.html` is the page, and it is at the top of the archive, where a
site that hosts web games expects to find it. `game.js` is the story
and everything needed to run it. The three platform stylesheets, the two
themes from the header's `themes:` line, and the story's own
`relighting.css` follow. The `audio` and `img` folders are the `assets`
folder of chapter 36. `relighting.story` and `imports.json` are there
because of `publish-source: yes`, and without that line the archive has
twelve files.

Look also at what is not there. The test tree is not in it, and neither
is the claims file. Those are your instruments, and they stay with you.
The page `index-testing.html`, which the build makes for Chord Writer,
is left out as the report says.

The command's last line tells you what to do with the zip. Anyone who
unzips it has the folder that chapter 37 served with `npx serve`. Any
place that will hand out files will hold it: a folder on a website of
your own, or a site that hosts web games and takes a zip with an
`index.html` at its top.

Two options are worth knowing. `--out` followed by a path writes the
zip somewhere other than `dist`. `--no-menu` publishes a page without
the menu that carries Save, Restore, Restart and Quit, for an author
whose own page supplies them.

## After the first release

A story is seldom finished on the day it is published. Somebody will
find the thing you missed.

When they do, mend the story, and add a card to the tree that would
have caught the fault. Raise `story-version:`. Run `sharpee test .` and
read the claims. Run `sharpee publish` again and put the new zip where
the old one was. The identifier does not change, so the archives know
it for the same story, and the version tells the two releases apart.

## Build and try it

Set `story-version:` to `1.0.0` in your own copy. Decide whether your
source goes along, and write `publish-source: yes` if it does. Run the
tree. Then publish, unzip `dist/relighting.zip` into an empty folder,
serve that folder with `npx serve .` from inside it, and play the story you wrote from the lodge to the
beacon, as a stranger will.

```shell
sharpee publish relighting.story
```

The companion folder `chapter-40` holds the story as it was published
for this book.

::: under-the-hood
**Under the Hood: identity and the artifact** · `relighting.config.json`, `dist/relighting.zip`

The story config is the tool's own file. A build creates it when it is
missing and copies its identifier into the header, and nothing else in
the toolchain writes to it: `compose`, `test` and `play` only read the
story. `publish` runs the same compile gate as `compose --check`, then
the browser build with the source map turned off, and then zips
`dist/web/<id>` with `index.html` at the root of the archive. The
compiled story is the Story IR of chapter 2, embedded in `game.js`, and
a copy is left at `dist/relighting.ir.json` for tools to read.
:::

::: from-another-system
**From another system: identifiers and releases**

The IFID is common ground. *Writing with Inform* says that "each new
project created by Inform is allocated a unique identification number
called its IFID", and that "The IFID is the equivalent for IF of the
ISBN of a printed book." A TADS 3 game states its own in its
`versionInfo` object, in a line such as `IFID = '...'`, beside `version
= '1.0'`. Inform 10 numbers releases with a sentence, `The release
number is 7.`, where Chord has `story-version:`.

For the artifact, Inform 10 compiles a story file, and a `Release along
with` sentence lists what goes out beside it. The list may include `a
website`, and `Release along with an interpreter.` adds what *Writing
with Inform* calls "A playable web page". TADS 3 compiles
source into an image file, which its System Manual calls "the T3
executable file that you run using the TADS 3 interpreter". Chord has
no story file and no separate interpreter. The published page is the
only artifact, and the interpreter is inside it.
:::

## What you have

You have a story with an identifier that will follow it for good, a
version that says which release a player holds, and a zip that plays in
any browser.

That is the whole of the road this book set out on. You began with a
header and one room. You have since written rooms and the things in
them, states and the clauses that change them, phrases, new verbs,
people who talk and act for themselves, a boat and a beacon, sound and
a page to hear it on, a tree that plays the story for you, and three
sentences that say what it is for.

The appendices that follow are for looking things up: the grammar, the
kinds and trait words, the standard actions, and the rest. The next
story is yours.
