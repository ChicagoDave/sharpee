::: {.part-page}

# Part I. A first story {.part .unnumbered}

:::

# The shape of a story file

A Chord story is a plain text file whose name ends in `.story`. A small story
needs nothing else: there is no project file beside it, and no second language
in which the difficult parts are written. This chapter does not teach what any
line means. It teaches what the page looks like, so that when later chapters
hand you lines to type, you know where they go and how they sit.

Here is the whole of the story this book builds, as it stands at the end of
Part I. It is called The Relighting. Look it over the way you would look over a
page of sheet music before playing it.

```chord
## The Relighting, as it stands at the end of Part I: a header, a prologue,
## one room, and the person the player will be.

story
  title: The Relighting
  id: relighting
  story-version: 0.1.0
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

create the Lodge, a room

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame.

create Ansel
  a person
  playable
  starts in the Lodge

  You were a student here once, for a term. You have the same hands and
  not much else.

before the game starts
  change the player to Ansel
end before
```

You can see the shape before you know the words. The file is a list of blocks.
Each block begins with a line at the left margin, and the lines that belong to
it are indented beneath it. This file has four: the `story` block, two `create`
blocks, and the `before the game starts` block. The two lines at the top that
begin with `##` are a comment, which is a note to yourself that the compiler
ignores.

::: from-another-system
**From another system: layout**

In Inform 10 the source is sentences and paragraphs, written to read as
English. In TADS 3, braces mark the blocks, semicolons end the statements, and
a line break means nothing. Chord is closer to a typed outline. A block
is its header line and whatever is indented under it. There are no braces and
no closing punctuation, and the indentation must be spaces. The compiler
refuses a tab with the error `lex.tab-indent`, so set your editor to insert
spaces before you begin.
:::

::: under-the-hood
**Under the Hood: Story IR** · `sharpee compose`

The compiler does not run your file. It reads the file and writes a description
of the story called the Story IR, which is a JSON document, and the Sharpee
platform builds the world from that description. The command
`sharpee compose relighting.story -o relighting.ir.json` writes it where you
can read it. You do not have the `sharpee` command yet. Chapter 4 installs
it, and runs this command at its end.
:::

## One line, one thing

Chord is read a line at a time. Each line says one thing, and the end of the
line is the end of what it says. Nothing marks the end of a line except the
line break: there is no full stop to remember and no semicolon to forget.

Look at the `create Ansel` block. It has a header line and then three short
lines, `a person`, `playable` and `starts in the Lodge`. Each of the three is a
separate fact about Ansel, and each has a line to itself.

Prose is the exception, and it is a comfortable one. The prologue and the two
descriptions are running text, and running text may wrap wherever you like. The
compiler joins the lines of a paragraph with single spaces, so the player sees
one flowing paragraph however you broke it in the file.

## Indentation says what belongs to what

A line that is indented further than the line above it belongs to that line.
In the `story` block, `title:` and `authors:` belong to `story`, and the name
`The Sharpee Project` belongs to `authors:` because it is indented further
again. When the indentation returns to the left margin, the block is over.

This book indents by two spaces at each level. The compiler does not insist on
two, but it does insist on spaces. A tab in the indentation is an error, and
the compiler says so:

```text
relighting.story:5:1 error [lex.tab-indent] Tabs are not allowed in indentation — use spaces.
```

Most editors can be told to insert spaces when you press the Tab key. Set that
before you type your first story, and you will never see this error.

## How a block ends

Most blocks end when the indentation does. The `story` block ends where
`create the Lodge` begins at the left margin, and nothing more is needed.

Some blocks hold a list of things to do, and those close with a line of their
own. The last block in the file is one of them:

```chord
before the game starts
  change the player to Ansel
end before
```

The closing line is the word `end` followed by a word from the block's header.
The chapters that introduce each kind of block tell you whether it needs one.
If you leave out a closing line that is required, the compiler names the line
it wanted and the line where the block began:

```text
relighting.story:30:1 error [parse.unterminated-block] Missing `end before` for the block opened at line 30.
```

## Blank lines

Between blocks, a blank line is for your eyes. The compiler does not need one
there, though this book always leaves one.

Inside a `create` block, a blank line does a job. It separates the short lines
that say what a thing is from the paragraph that describes it. Look at the
Lodge: the header line, a blank line, and then the description. Ansel has
three short lines, a blank line, and then a description. Without the blank
line the compiler would try to read the description as one more short fact,
and it would fail.

A second blank line inside a description starts a second paragraph. The
player sees the two paragraphs with a gap between them.

## Comments

A comment is a note in the file that the story ignores. A comment line begins
with two hash marks, and a run of comment lines makes one comment:

```chord
## The Relighting, as it stands at the end of Part I: a header, a prologue,
## one room, and the person the player will be.
```

Three rules govern comments, and all three are strict.

1. The `##` must be at the left margin. An indented `##` is not a comment.
2. A comment needs a blank line before it and a blank line after it. The top
   and the bottom of the file each count as a blank line.
3. A comment goes between blocks, never inside one.

There is no way to put a comment at the end of a line. If you write
`title: The Relighting ## working title`, the title of your story is all of
that, hash marks included. The same thing happens to an indented `##` under a
description: it becomes a paragraph the player reads.

::: from-another-system
**From another system: comments**

Inform 10 writes a comment in square brackets, and TADS 3 has the two C forms,
one that runs to the end of the line and one that brackets a region. Chord has one form with one place
to put it. The reason is prose: a story file is mostly text the player will
read, and the compiler takes text literally. A comment mark that worked inside
a block would be a mark you could never print.
:::

## Words, numbers and quotation marks

The small pieces of a Chord line are few.

A **word** is letters, with digits, hyphens, apostrophes and underscores
allowed inside it. Names are made of words, and a name may be several of them:
`the Lodge`, `Ansel`, `The Sharpee Project`.

A **key** is a word that the language itself defines, followed by a colon, as
in `title:` and `story-version:`. Where a key is made of two English words, it
is always written with a hyphen and never with a space. Writing
`story version:` is an error.

A **number** is digits, with full stops allowed inside it, so `0.1.0` is a
number.

**Quotation marks** are rarer than you might expect. Text the player reads is
not quoted. The title is not quoted, and neither is the prologue or any
description. If you put quotation marks around the title, they become part of
the title. Quotation marks do appear later, for a small number of things such
as the name of a file or a topic the player asks about, and each chapter says
so when it needs them.

::: from-another-system
**From another system: quoted text**

In Inform 10 and in TADS 3, text the player reads is a quoted string, and
everything outside the quotation marks is the language. Chord turns that
around. Position decides what is prose: a paragraph under a `create` header is
a description because of where it sits, and it needs no marks around it. The
habit to unlearn is reaching for a quotation mark every time you write a
sentence for the player.
:::

## What you have so far

You have not built anything yet, and that is deliberate. Type the story at the
top of this chapter into a file called `relighting.story`, with spaces for
indentation, and keep it. Make a new folder called `relighting` for it, with
nothing else inside. The folder can be anywhere you keep your own work. Chapter 2 explains its first block, chapter 3
explains Ansel and the block that ends the file, and chapter 4 builds the story
and plays it. The Lodge waits for chapter 5, though it is already doing its
work as the one place the story has.
