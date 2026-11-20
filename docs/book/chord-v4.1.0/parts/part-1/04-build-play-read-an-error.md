# Build, play, read an error

You have a story file and you understand every block in it but one. This
chapter turns it into something you can play. It also breaks the file in
several ways on purpose, because the most useful skill in this book is reading
what the compiler says when something is wrong.

There are two ways to work with a Chord story. Chord Writer is an application
with an editor, a play pane and a testing pane in one window. The `sharpee`
command does the same work from a terminal. This book gives both wherever a
step is something you do rather than something you write, under the heading
"Build and try it". The story file is the same either way. This chapter is
steps from beginning to end, so it has no such heading. From chapter 5 on,
each chapter has one near its end.

<!-- PENDING (plan D-3): the Chord Writer half of this chapter. No published
     Chord Writer pairs with this edition's pin yet (issues 653 and 729), so
     its steps cannot be written from the product. Each "Build and try it"
     below gives the command only until one is. -->

## Installing the command

The `sharpee` command needs Node.js, version 18 or later. If you do not have
it, install it from nodejs.org first. Then install the command itself:

```shell
npm install -g @sharpee/devkit
```

A recent npm may end the install with a warning that one package had its
install script blocked. The command works without that script, and you can
leave the warning alone.

Check that the command is there by asking for its version:

```shell
sharpee --version
```

```text
Sharpee 5.7.1 · Chord 4.1.0
```

The first number is the version of the Sharpee platform, which runs your
story. The second is the version of the Chord language, which is what you
write it in.

## A folder for the story

Chapter 1 had you make a folder called `relighting` and put
`relighting.story` in it. A story's
folder is called its **project**, and a project holds exactly one `.story`
file. Everything in this book is typed from inside that folder.

## Checking the story

The first thing to do with a story file is to ask whether the compiler
accepts it.

```shell
sharpee compose relighting.story --check
```

```text
compose: Chord 4.1.0 — relighting.story is gate-clean (--check: IR not emitted)
```

The word to look for is **gate-clean**. The compiler puts a story through a
series of checks, which it calls gates, and a story that passes every one of
them is gate-clean. A story that is not gate-clean cannot be played.

`compose` is the compiler's name, and `--check` tells it to run the gates and
stop. Run this command often. It takes a moment, and it is far easier to find
a mistake among the five lines you have just typed than among fifty.

## Playing the story

To play the story, tell `sharpee` to play the project you are standing in. The
full stop means "this folder".

```shell
sharpee play .
```

```text
Loading story from: /home/ansel/relighting

--- Play Mode ---  (/quit or /q to exit)

You were here for one term, thirty years ago, and you would have said you remembered none of it. Then last week a candle leaned toward your hand, and you started walking.

The Relighting
Thirty years after the magic went out of the world, a lamp burns blue.
By The Sharpee Project
Story v0.1.0

Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame.

>
```

The first line names the folder the story was loaded from, and yours will
name your own. After it come your prologue, then your header, then your
room. The `>` is the
prompt, where the player types. Try a few commands.

```text
> examine me
You were a student here once, for a term. You have the same hands and not much else.

> examine lamp
You can't see any such thing.

> north
There are no obvious exits.

> wait
Time passes...

> xyzzy
I don't understand that.
```

Two of those answers are worth a second look, because you wrote neither of
them.

"You can't see any such thing" is the story telling the truth. The Lodge's
description mentions a lamp, but a description is only words. There is no lamp
in the story until you create one, and chapter 6 does. Every noun you put in a
description is a promise to the player that it can be examined, and for now
The Relighting is breaking several such promises in one paragraph.

"There are no obvious exits" and "Time passes..." are answers that came with
the platform. You did not teach the story what going north means, or what
waiting is. A Chord story begins with several dozen ordinary actions already
understood, and most of this book is about adding to them, not building them.

Type `/quit` to leave.

## Reading an error

Now break the story. Open `relighting.story`, find the line `playable` under
`create Ansel`, and remove one letter so that it reads `playble`. Check the
story again.

```shell
sharpee compose relighting.story --check
```

```text
relighting.story:31:3 error [analysis.player-target-not-playable] `ansel` is not `playable` — add `playable` to its create block to let the player role move to it.
relighting.story:24:3 error [analysis.trait-not-declared] Trait `playble` is not declared (`define trait playble`) and is not a v1 adjective.
compose: relighting.story failed the load-time gates (2 error(s))
```

Each line the compiler prints about your story is called a **diagnostic**, and
every diagnostic has the same five parts.

1. **Where.** `relighting.story:24:3` is the file, the line and the column.
   Line 24, column 3 is the first letter of `playble`.
2. **How serious.** `error` means the story cannot be played until this is
   fixed. The other word you will see here is `warning`, which is described
   below.
3. **The code.** `[analysis.trait-not-declared]` is the diagnostic's name. The
   part before the full stop says which stage of the compiler found the
   problem: `lex` reads characters, `parse` reads lines and blocks, and
   `analysis` checks that what you wrote makes sense together. The code never
   changes, so it is the thing to search for when a message puzzles you.
4. **The message.** This says what is wrong in a sentence.
5. **The remedy.** Most messages end by telling you what to write instead.

Now read the two diagnostics as a pair. The second one is the mistake itself:
the compiler does not know the word `playble`. The first is a consequence of
it: because that line was not understood, Ansel is not playable, and so the
start block is handing the role to someone who cannot hold it. One wrong
letter produced two errors, and the one printed first is not the one to fix.

This happens often, and it gives the rule for reading compiler output. Read
all of it before you change anything, look for the diagnostic that points at
something you typed wrongly, and fix that one. Then check again. The others
frequently vanish.

Put the letter back before you go on.

## When the compiler guesses

Some diagnostics go further than a remedy and offer a guess. Change
`starts in the Lodge` to `starts in the Loge` and check again.

```text
relighting.story:25:13 error [analysis.unknown-entity] No entity named `Loge` — did you mean `lodge`?.
compose: relighting.story failed the load-time gates (1 error(s))
```

An **entity** is the compiler's word for anything you make with `create`. The
guess is printed in lower case because the compiler compares names without
regard to capitals. You may write `the Lodge` or `the lodge` in your own
lines, and they are the same room. Put the letter back before you go on.

## Warnings

A warning is a diagnostic that does not stop the story. Delete the Lodge's
description, both the paragraph and the blank line above it, so that the
header line has nothing under it, and check.

```text
relighting.story:16:8 warning [analysis.room-no-description] `the Lodge` has no description, so LOOK there shows only its name.
compose: Chord 4.1.0 — relighting.story is gate-clean (--check: IR not emitted)
```

The story is still gate-clean and it will still play. The warning is the
compiler pointing at something that is legal and probably not what you meant.
Treat a warning as a question. Sometimes the answer is that you did mean it.

Restore the description, check once more, and make sure you are back to a
single gate-clean line.

## Two mistakes with the folder

Two errors come from the project and not from the story, and both are easy to
make in your first hour.

The `play` command takes a folder, not a file. If you give it the file, it
says so in its own way:

```text
play: 'relighting.story' is neither a directory nor a registered story — run `sharpee register <location>`, or run `sharpee play` from the project directory
```

A project has one story. If you keep a second `.story` file in the folder, a
copy you made before an experiment, for instance, `play` refuses to choose
between them:

```text
Error loading story: project has 2 .story files (notes.story, relighting.story) — a project has exactly one; remove or rename the others
```

Keep your experiments in another folder, or give the copy a different ending.

::: under-the-hood
**Under the Hood: what `compose` writes** · `sharpee compose`

Without `--check`, the compiler writes the Story IR. Give it a file to write
to:

```shell
sharpee compose relighting.story -o relighting.ir.json
```

```text
compose: Chord 4.1.0 — relighting.story loaded — 2 entities, 0 trait(s), 0 action(s)
compose: IR written to relighting.ir.json
```

The two entities are the Lodge and Ansel. The traits and actions it counts are
ones a story defines for itself, which Part IV teaches, and The Relighting has
none yet. The file is JSON and is safe to open and read. Nothing in this book
asks you to edit it, and `sharpee play` does not need it: it compiles the
story afresh each time.
:::

::: from-another-system
**From another system: the compile step**

In Inform 10 you press Go and the application compiles and runs the story in
one motion. In TADS 3 you compile a project into an image file and run that in
an interpreter. Chord has the same two steps, but nothing you keep comes out of
them at this stage. There is no story file to pass to an interpreter. The
`.story` text is the story, `play` compiles it in memory each time, and a
thing you can give to a player is made only when you publish, in chapter 40.
:::

## What you have so far

You can check a story, play it, and read what the compiler says about it. The
Relighting is one room with nothing in it and nowhere to go. Part II gives it
a world.
