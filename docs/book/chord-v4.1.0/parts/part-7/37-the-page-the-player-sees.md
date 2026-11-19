# The page the player sees

<!-- PENDING (Phase 5, 2026-11-16): the header fields `theme:` and `template:`
     are named and not taught. `theme:` alone wires no stylesheet, and
     `template:` is ignored with a warning. Both are filed. A page of the
     story's own (`browser/index.html`) is described from the default page's
     own comment and from one run; a channel rendered into a named element was
     not run. The Chord Writer steps are pending under D-3. -->

A story played in a terminal has no say in how it looks. A story played in
a browser has a page, and the page has a title bar, a status line, a place
for a picture, a column for panels, a menu of themes, and somewhere to
keep saved games.

Chord gives a story three ways to shape that page. The header chooses the
client and its themes. A **channel** sends a named value to the page,
beside the prose, for the page to show where it likes. And a folder beside
the story holds a stylesheet, and if you want one, a page of your own.

This chapter builds The Relighting for the browser for the first time and
gives it a panel that lists the workings Ansel has learned.

## The client fields

The story header from chapter 2 has a second group of fields, which say
nothing about the story and everything about where it will be played.

```chord
story
  title: The Relighting
  id: relighting
  story-version: 0.7.0
  client: browser
  themes: paper, modern-dark
  default-theme: paper
  storage-prefix: relighting
```

`client` names the program the story is built for. There is one value
today, `browser`, and it is also what a story gets by leaving the line out.
Any other word is refused when the story is built.

```text
Error: unknown client 'terminal' (story header `client:`) — the build can only produce 'browser'.
```

`themes` is a list of themes, separated by commas, that the page will
offer in its Settings menu. Four are built in: `paper`, `modern-dark`,
`retro-terminal` and `system-6`. The page always offers a fifth, called
Classic, which is the page with no theme applied.

`default-theme` is the theme the page opens in. It should be one of the
names in `themes`. Leave it out and the page opens in Classic.

`storage-prefix` is the word the browser files this story's saved games
under. It defaults to the story's `id`, so most stories never write it. It
matters when two stories are served from one site, because the browser
keeps one drawer per site and the prefix is what keeps their saves apart.

The compiler accepts any word as a theme name. The build is where a wrong
one is caught.

```text
Error: Unknown built-in theme "parchment". Available: modern-dark, retro-terminal, paper, system-6. For your own theme, list { "id": "…", "name": "…" } and define its [data-theme] block in browser/<package-name>.css.
```

Only the `themes` list is checked in this way. A `default-theme` that
names a theme the list does not carry builds without complaint and opens
on a page with no stylesheet for it, so read the two lines together.

## Building the page

```shell
sharpee build relighting.story
```

The command compiles the story, as `compose` does, and then writes a
complete web page to a folder under `dist/web/`, named for the story's
`id`. There is no need to run it yet. "Build and try it" runs it at the end
of the chapter, on the story with everything this chapter adds, and this is
what it prints then.

```text
🔨 Building browser bundle

  ✓ Minted the story's ifid into relighting.config.json
  Story: The Relighting (relighting)
  ✓ Validated relighting.story (gate-clean) — source not shipped (`publish-source:` absent)
  ✓ Story IR → dist/relighting.ir.json
  Generated browser entry from template
  ✓ Embedded the compiled story IR into the bundle
  Bundling game.js...

  dist/web/relighting/game.js      1.9mb ⚠️
  dist/web/relighting/game.js.map  3.5mb

⚡ Done in 87ms
  ✓ Built game.js
  ✓ Copied index.html
  ✓ Copied index-testing.html (IDE testing surface — excluded from publish)
  ✓ Copied platform engine CSS (base, engine, decorations)
  ✓ Wired 2 theme(s): paper, modern-dark
  ✓ Copied relighting.css
  ✓ Copied assets/ (2 entries)

✅ Build complete! (game.js 1907.7 KB)
Output: dist/web/relighting/

To test locally:
  npx serve dist/web/relighting
```

The line about `relighting.css` appears once the stylesheet later in this
chapter exists, and the line about themes once the header names them. The
line about an `ifid` is chapter 40's subject. It is printed by the first
build of a story that has no identifier yet.

The folder holds `index.html`, one script called `game.js` with the whole
story inside it, the stylesheets, and the `audio` and `img` folders that
were inside the `assets` folder of chapter 36. Nothing in it needs a server that does more than hand out
files. To look at it on your own machine, serve the folder and open the
address it prints.

```shell
npx serve dist/web/relighting
```

The page opens on the story's title and prologue, in the paper theme. The
Settings menu has a Theme entry that lists Classic, Paper and Modern Dark.
The page has no sound control of its own, so see that your machine's sound
is up before you spark the lamp. The first build also writes
a small file beside the story, `relighting.config.json`, which chapter 40
explains.

The page also prints something the terminal does not. When one of the
chapters from chapter 19 begins, the page prints its title in bold, and its
description in italics beneath if it has one, above the reply to the command
that began it. `Morning` stands over the first room, and reading the spark
page begins the afternoon.

```text
> read spark page

Afternoon

The Hall has noticed you.

(first taking the spark page)
```

## A channel

The prose is not the only thing a story sends to the page. The room's
name in the status line, the score and the turn count each travel on a
**channel**: a named value that the page shows in a place of its own.
Those channels are the platform's. A story may define more.

```chord
define channel workings
  mode append
  return "(working): (gloss)" from relighting-working-learned
end channel
```

`define channel` is a top-level block with a one-word name. It has two
lines that matter.

The `return` line says what the channel's value is and when it changes.
It ends in `from` and the name of an **event**. Each time the story
raises that event, the channel takes a new value, built from what the
event carried. Here the value is a piece of text with two slots in
parentheses, and each slot is filled from the event's field of that name.

The `mode` line says what a new value does to the old one.

- `mode replace` keeps only the latest value. A tide gauge, a compass
  heading, or the name of a chapter is a replace channel.
- `mode append` adds each value to a growing list. A log, a list of
  clues, or this list of workings is an append channel.
- `mode event` has no lasting value at all. It reports that something
  happened this turn, and the page reacts and forgets.

## Raising an event

A story raises an event with `emit`.

```chord
on the player reading
  select on the spark page's state
    when legible
      change the spark page to learned
      change the story to waking
      start waking
      raise workings by 1
      emit relighting-working-learned with working "spark" and gloss "wakes a flame"
      award first-working
      phrase spark-learned
```

`emit` is a statement. It names the event with one hyphenated word, then
`with`, then the event's fields joined by `and`. A field is a name
followed by its value: a quoted string, a number, or a reference to
something in the world.

The event's name is the story's own, and the convention is to begin it
with the story's `id`, so that it cannot collide with an event of the
platform's. The name is one word. A dotted name is an error,
`parse.dotted-key`.

Each of the four pages emits the same event with its own two strings. The
channel hears all four.

An event is not prose, and `emit` prints nothing. In a terminal, reading
the spark page looks exactly as it did in chapter 13. On the page, a
column opens beside the story.

```text
workings
spark: wakes a flame
```

By the time the Lantern is lit the panel holds four lines, in the order
Ansel read the pages.

```text
workings
spark: wakes a flame
unbind: releases a ward
hush: quiets a thing
mend: makes a broken thing whole
```

A channel the page has no special place for is shown in this way, as a
titled panel in a column at the side. The column is hidden until some
channel has a value, so a player who never reads a page never sees an
empty box.

## What a channel may return

The `return` line has four forms. The first three give the channel a
single value.

```chord
define channel tide
  mode replace
  return level from harbour-tide-turned
end channel

define channel bell
  mode event
  gated by sound
  return phrase bell-caption from harbour-bell-rung
end channel
```

`return level from …` takes one field of the event, by name, and the
channel's value is whatever that field held: `high` after `emit
harbour-tide-turned with level "high"`, and the number 3 after `emit
harbour-tide-turned with level 3`.

`return "…" from …` is the text form the workings channel uses.

`return phrase bell-caption from …` gives the channel a phrase from the
story's phrase table, so the value is prose that can vary as any phrase
can.

`gated by` names one of the client capabilities of chapter 36. A gated
channel is sent only to a client that has the capability. The bell's
caption is for a page that is about to play the bell.

The fourth form returns a **record**: several named values at once.

```chord
define channel card
  mode replace
  return record from harbour-card-dealt
    suit suit
    rank rank
    notes list of note
  end record
end channel
```

Each line of the record is a member: the member's name, then where its
value comes from, which is again a field name, a text with slots, or
`phrase` and a key. `list of` makes the member a list, even when the
event carried a single value. After `emit harbour-card-dealt with suit
"spades" and rank 7 and note "dog-eared"`, the channel's value is a
record whose `suit` is `spades`, whose `rank` is 7, and whose `notes` is
a list of one string.

A record is for a page of your own, which can lay the members out as it
likes. A panel a player reads is better served by a text.

## A reference in a field

An `emit` field may hold a reference to a thing or a room, with no
quotation marks.

```chord
emit harbour-noted with what "gauge read" and where the Quay
```

The event does not carry the Quay's name. It carries the Quay's
identifier, which for this room is `quay`, and a channel that returns
`"(what): (where)"` shows `gauge read: quay`. That is useful to a page
that keeps its own table of rooms, and wrong for a panel a player reads.
When the value is for reading, send a string.

## The stylesheet

A story's own styles go in a folder called `browser` beside the story
file, in a stylesheet named for the story's `id`.

```css
/* browser/relighting.css */

#channel-panel-workings .sharpee-channel-panel-title {
  font-variant: small-caps;
  letter-spacing: 0.06em;
}

#channel-panel-workings .sharpee-channel-panel-row {
  margin-bottom: 0.4rem;
}
```

The build copies it into the page's folder and loads it last, after the
platform's styles and after the themes, so a rule here wins. A channel's
panel has the identifier `channel-panel-` followed by the channel's name.

Keep colours out of this file where you can. The themes set them, and a
colour fixed here will be right in one theme and wrong in the other.

The picture from chapter 36 appears above the story, in a strip whose
height the platform's stylesheet sets. A rule for `#sharpee-media` in
your own stylesheet changes it. A chapter's title and description are
printed in a block with the class `sharpee-chapter`, and a rule for that
class restyles the block or hides it.

## A page of your own

The stylesheet is enough for most stories. For the rest, the whole page
can be replaced. The default `index.html` in the build folder opens with
a comment that says how: copy it to `browser/index.html` beside your
story and edit it there. From then on the build uses your page as it
stands.

Two elements must keep their identifiers, because the client looks for
them by name: `sharpee-media`, where pictures go, and `sharpee-sidebar`,
where panels go. You may move them anywhere on the page. The classes
that begin `sharpee-` are what the themes style, so keep those on
anything you want themed.

Start with the stylesheet. A copied page is yours to maintain, and it
will not pick up improvements to the default one.

## Build and try it

Copy `relighting.story`, `relighting.config.json` and the `browser` folder
from the companion folder `chapter-37` into your project, the story over
your own file and the other two beside it. The story is yours with this
chapter's changes made, and its `story-version` is `0.7.0`. The copied story
already carries its identifier, in the header and in the config file, so
your build does not print the line about minting one that the build earlier
in this chapter shows. To make the changes by hand instead, work from this
list and take the rest from that file: add the four client fields to the
header, the `define channel` block near the top of the story, and one `emit`
line to each of the four pages' `on the player reading` clauses, and make
the folder `browser` and put `relighting.css` in it.

```shell
sharpee compose relighting.story --check
sharpee build relighting.story
npx serve dist/web/relighting
```

Play as far as the Library and read the spark page. Then change the
theme from the Settings menu and reload the page. The theme you chose has
been remembered. It was filed in the browser under the storage prefix, as
`relighting-theme`, and the saved games are filed beside it.

The reload also brings the game back from its autosave, with the line
`[Session restored]`. The status line names the Library again, and the
`workings` panel is there with its one line, because the page saves what
its channels were showing along with the game.

::: under-the-hood
**Under the Hood: channels** · Story IR `channels`, platform channels `location`, `score`, `turn`

The compiled IR has a top-level `channels` list holding each channel's
name, mode, gate and return. At the end of every turn the platform asks
each channel, its own and the story's, whether this turn's events give it
a value, and sends the page the values that changed. The status line is three platform channels, `location`, `score` and `turn`.
The pictures of chapter 36 are channels as well, one for each layer, and
the sounds another. A story's `emit` adds an event to the turn like any
other, with its fields as the event's data.
:::

::: from-another-system
**From another system: the status line and other windows**

Inform 10 gives a story the two ends of the status line as values it can
set: `now the left hand status line is "[the player's surroundings] /
[turn count] / [score]";`. TADS 3 has the banner window, which its System
Manual describes as "a rectangular area of the screen that can be
separately controlled: each banner has its own contents, background
color, text color, and so on", and a game creates one with
`bannerCreate()` and writes to it. In both, the story writes the text
that appears in the window. A Chord channel sends a value and leaves its
appearance to the page.
:::

## What you have so far

The Relighting has a page. It opens in a theme the story chose, offers a
second, keeps its saves under its own name, plays three recordings, shows
a picture when the Lantern is lit, and lists the workings in a panel that
grows as Ansel learns them.

That is Part VII, and the story is finished. Nothing more will be added
to it. What is left is to prove that it works, and will go on working
after the next change, and then to give it to somebody. Part VIII begins
with the proof.
