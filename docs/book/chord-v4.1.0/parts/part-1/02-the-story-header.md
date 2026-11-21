# The story header

Every story begins by saying what it is. In Chord that is the job of the
`story` block, which this book calls the header. It holds the facts about the
story as a whole: what it is called, who wrote it, which version this is, and
the words the player reads before anything else happens.

Here is the header of The Relighting again.

```chord
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
```

The first line is the single word `story`. Everything indented beneath it is a
**field**: a key, a colon, and a value. The header takes a fixed set of fields
and no others, so you cannot invent one. This chapter covers the eight that
describe the story. The rest belong to later chapters, most of them to Part
VII, where the story is given its look in a browser.

## The two fields every header needs

A header must have a `title:` and an `authors:` list. Nothing else is required.
This is the smallest header the compiler accepts:

```chord
story
  title: The Relighting
  authors:
    The Sharpee Project
```

The **title** is everything after the colon, to the end of the line. It is not
quoted, and it may contain any punctuation you like.

The **authors** are a list, even when there is only one. The key stands on a
line by itself, and each name goes on its own line beneath it, indented one
level further. A second author is a second line:

```chord
  authors:
    Hobb
    Tamsin Vey
```

You may not put a name on the same line as `authors:`. The compiler asks for
the list form:

```text
relighting.story:3:3 error [parse.header-inline-list] `authors:` takes no inline name — list one name per line, indented under `authors:`.
```

Leave either field out and the compiler names the one that is missing:

```text
relighting.story:1:1 error [parse.story-title] The story block requires a `title:` field.
```

## What the player sees

When a story starts, the player is shown the title, the description if there
is one, the authors and the version, and then the first room. With the
smallest header above, and a first room cut down to one sentence so that
the header's lines stand out, the opening looks like this. The output is
printed here for you to read. You will not build anything in this chapter.

```text
The Relighting
By The Sharpee Project
Story v0.0.0

Lodge
The porter's lodge is one small room.
```

With two authors the second line reads `By Hobb, Tamsin Vey`. The version reads
`0.0.0` because the header did not give one. The next section fixes that.

## Version, description and credits

**`story-version:`** is the version of your story, written as three numbers
separated by full stops. It is yours to count however you please. This book
gives The Relighting the version `0.1.0` at the end of Part I and raises the
middle number with each Part.

**`description:`** is one line that says what the story is about. It appears
under the title when the story starts, and again whenever the player types
`about`.

**`testers:`** is a second list of names, written exactly like `authors:`. It
is a place to record the people who played your story before it was finished.

With the version and the description added, typing `about` prints this:

```text
> about
The Relighting
Version 0.1.0
By The Sharpee Project

Thirty years after the magic went out of the world, a lamp burns blue.
```

## The prologue

The **prologue** is the text the player reads first, before the title. It is
where a story sets its scene.

```chord
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.
```

The key stands alone on its line and the text follows beneath it, indented one
level further. This is prose, so it wraps wherever you like and the player
sees one paragraph. A blank line starts a second paragraph. The opening of The
Relighting now reads:

```text
You were here for one term, thirty years ago, and you would have said you remembered none of it. Then last week a candle leaned toward your hand, and you started walking.

The Relighting
Thirty years after the magic went out of the world, a lamp burns blue.
By The Sharpee Project
Story v0.1.0

Lodge
The porter's lodge is one small room built into the thickness of the gate arch. A chair, a kettle and thirty years of newspapers have filled most of it. On the sill a lamp is burning with a steady blue flame.
```

A short value may also sit on the same line as its key, which is how
`description:` is written above. Both `description:` and `prologue:` accept
either form.

There is one trap in the short form. If the value is a single word made of
letters and hyphens, such as `prologue: opening-words`, the compiler does not
print that word. It takes it as the name of a phrase, which is a piece of text
defined elsewhere in the file, and it reports an error if no phrase has that
name. Chapter 20 teaches phrases. Until then, write your prologue as a
sentence and the trap cannot catch you.

## The two identifiers

**`id:`** is a short name for the story, written in lower-case letters with
hyphens between the words. The player never sees it. The tools use it to name
the things they make from your story, such as the folder that holds its tests
and the folder that holds its browser build. Give every story an `id:`, and do
not change it once you have chosen it.

**`ifid:`** is the story's Interactive Fiction Identifier, a long code that
identifies one work of interactive fiction to archives and catalogues. You do
not need to write one. The Relighting's header has none, and chapter 40 shows
where the build puts the one it makes for you.

::: under-the-hood
**Under the Hood: the header in the Story IR** · `sharpee compose`

The header compiles to the `meta` section of the Story IR. The title is its own
entry, and every other field you wrote is collected under `fields`:

```json
"meta": {
  "title": "The Relighting",
  "fields": {
    "authors": [
      "The Sharpee Project"
    ],
    "testers": [],
    "themes": []
  }
}
```

That is the smallest header from earlier in this chapter. A field you did not
write is simply absent, which is why the version was printed as `0.0.0`.
:::

## When a field is refused

Because the set of fields is fixed, a key the header does not know is an
error, and the error lists every key it does know:

```text
relighting.story:5:3 error [parse.header-unknown-field] Unknown story-header field `genre:` — the header takes exactly: title, authors, testers, ifid, id, story-version, prologue, description, client, theme, template, themes, default-theme, storage-prefix, publish-source, auto-assertion (plus states/score/use/on lines).
```

The words in parentheses at the end are not fields. They are other kinds of
line that a header may hold, and each has its own chapter: `states` in chapter
13, `score` and `use` in chapter 18, and `on` in chapter 19.

Three keys from earlier versions of Chord are refused by name, and the error
for each one tells you its replacement. `version:` is now `story-version:`,
`blurb:` is now `description:`, and `by:` is now `authors:`.

The compiler is strict about which fields exist and relaxed about what you put
in them. If you write `title:` twice, the second one wins and nothing warns
you. An `id:` with spaces or capital letters in it is accepted as written. It
is worth reading your header once more before you move on.

::: from-another-system
**From another system: bibliographic data**

Inform 10 lets the first line of the source give the title and the author, as
an abbreviation, and sets the rest by sentences about the story, such as its
description and its release number. TADS 3 keeps the same facts as properties of one object that
describes the game. Chord's header is nearer to the TADS 3 arrangement, with
one difference worth knowing early. The header is a closed form. You fill in
the fields it has, and a fact it has no field for belongs somewhere else in
the story.
:::

## What you have so far

Your `relighting.story` begins with a header that names the story, credits its
author, gives it a version and a description, and sets the scene. The header
says nothing yet about who the player is. That is the next chapter.
