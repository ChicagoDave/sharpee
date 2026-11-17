# How to read this book {.unnumbered}

## Where to start

| If you are | Read |
|---|---|
| New to interactive fiction, or new to writing it | The chapters in order, skipping every boxed note. |
| An author who knows Inform or TADS | The chapters in order, with the boxes headed "From another system". |
| Curious about what the platform does with your lines | The chapters in order, with the boxes headed "Under the Hood". |
| Looking something up | The table of contents, and the appendices at the back. |

The chapters build on one another, and the story grows through them, so
the book works best read from the front. Part I is short and gets a story
on the screen. If you read nothing else before starting a story of your
own, read Parts I and II.

## The eight parts

- **Part I. A first story** (chapters 1 to 4) covers the story file, its
  header, the player, and how to build a story, play it, and read an
  error.
- **Part II. The world** (chapters 5 to 12) covers rooms, things,
  containers, doors, light and darkness, regions, and ways that are
  closed or hidden.
- **Part III. Making things happen** (chapters 13 to 19) covers states,
  the clauses that react to the player, conditions, choices, scoring,
  endings and time.
- **Part IV. Words** (chapters 20 to 25) covers the story's prose, the
  platform's standard messages, and new verbs and new kinds of thing.
- **Part V. People** (chapters 26 to 31) covers people who act, talk,
  remember and feel, and stories with more than one protagonist.
- **Part VI. Larger machinery** (chapters 32 to 35) covers machines,
  vehicles, open water, and the systems a story may opt into.
- **Part VII. Presentation** (chapters 36 and 37) covers sound, pictures
  and the page in the browser.
- **Part VIII. Proving and shipping** (chapters 38 to 40) covers tests,
  claims and publishing.

## The two kinds of box

The main text is complete without either kind of box. Skip them freely.

::: under-the-hood
**Under the Hood: what this box is for**

A box like this one names the part of the Sharpee platform that a Chord
line becomes: a trait, a standard action, an event, a message. It is for
readers who also write for the platform directly, or who like to know
what is underneath. Nothing later in the book depends on it.
:::

::: from-another-system
**From another system: what this box is for**

A box like this one compares Chord with Inform 10 and TADS 3, and with no
other system. It is for authors who already think in one of them. Each
statement it makes about either system was checked against that system's
own documentation.
:::

## Conventions

Lines of Chord appear in blocks like this one.

```chord
create the Lodge, a room
```

Commands for your terminal appear in their own blocks, and so does what
the story prints. In a block of story output, a line that begins with `>`
is a command the player typed.

```text
> take lamp
You take it.
```

A block of Chord is sometimes a whole declaration and sometimes the few
lines of one that the chapter is talking about. The prose says which
lines are new, and the companion folder for the chapter always has the
whole story.

## Build and try it

Most chapters end with a section called "Build and try it", which gives
the `sharpee` commands that compile and play the chapter's story in a
terminal. Chord Writer, the editor made for Chord, does the same work
from one window. The story file is the same in both, and chapter 4
introduces the two.

## The companion folders

The Relighting as it stands at the end of each chapter is on the book's
website, in a folder named for the chapter: `chapter-05`, `chapter-06`,
and so on. The folders are at
<https://sharpee.net/chord-manual/4.1.0/relighting/>. Each one can be
read in a browser, file by file, and each can be downloaded whole by
adding `.zip` to its name, as in
<https://sharpee.net/chord-manual/4.1.0/relighting/chapter-05.zip>. A
folder holds the story file and a test tree, which chapter 38 explains,
and from Part VII on it holds the story's sounds, picture and stylesheet
as well. Beside them are eight folders named `part-1` to `part-8`, each
holding the story as it stands at the end of that part. No step in this
book uses those.

You need the folders to follow the book. A chapter prints the lines it
teaches. It does not print every line of the story, because a page of
descriptions teaches nothing about Chord. Part I's story is short, and
you type all of it. From chapter 5 on, each chapter's "Build and try it"
begins by copying that chapter's `relighting.story` from its folder over
your own, so that your story is the book's at the end of every chapter.
The same section lists what changed, for the reader who would sooner
make the changes by hand and take only the unprinted lines from the
file.

## When something is missing

A few chapters say plainly that a part of the language is not covered,
because it could not be shown working in this edition. That is a
statement about the edition and not about your story. The language's
reference material lists every form, and a later edition of this book
will cover what this one could not.
