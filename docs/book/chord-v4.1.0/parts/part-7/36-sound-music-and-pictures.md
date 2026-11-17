::: {.part-page}

# Part VII. Presentation {.part .unnumbered}

:::

# Sound, music and pictures

<!-- PENDING (Phase 5, 2026-11-16): `transition` and `clear` are shown only as
     far as the message each sends; what a page does with them was not seen.
     `hide image` was run for the default layer only. -->

Everything the story has said so far, it has said in text. A terminal can
do nothing else, and a great deal of interactive fiction wants nothing
else. A browser can do more. It can play a recording, loop a bed of sound
under a scene, and put a picture on the page.

Chord treats all of that as something the story offers and the player's
program may decline. A story declares its sounds and pictures, and says
when to play and show them. A client that can do it does it. A client that
cannot leaves it out, and the story plays on, because nothing in the world
ever depends on whether a file was heard.

This chapter gives The Relighting a recording of the bell, the sound of a
flame catching, water under the skiff, and one picture.

## Declaring an asset

An **asset** is a name the story uses and a file the client fetches.

```chord
define sound tolling from "audio/toll.mp3"

define sound lapping from "audio/lapping.mp3"

define image lantern-lit-picture from "img/lantern-lit.png"
```

`define sound`, `define image` and `define music` are top-level lines.
Each gives one word as the name and one quoted path. The path is relative
to a folder called `assets` beside the story file, so the first line above
means `assets/audio/toll.mp3`.

The compiler checks the names and not the files. A statement that plays a
sound nobody declared is an error, and so is one that shows a sound as if
it were a picture. A path to a file that does not exist is not noticed
until the story is built for the browser, in chapter 40. You can write
this chapter's lines, and play the story in a terminal, before any of the
recordings exist.

## Playing a sound

```chord
on every turn while the tower bell is tolling
  select cycling
    phrase toll-near
  or
    phrase toll-far
  or
    phrase toll-count
  end select
  raise tolls by 1
  play sound tolling
end on
```

`play sound` is a statement, and it goes wherever a statement goes. This
one is the last line of the header's `on every turn` block from chapter
19, so the recording is played on every turn the bell tolls.

In a terminal you will see no difference at all. The story's own three
sentences about the bell still print, and the recording is offered to a
client that is not there. That is the right result, and it is why the
sentences stay. A sound should never be the only way a player learns
something. Some players have the sound off, some cannot hear it, and some
are reading your story through a screen reader that is already talking.

## A sound is also a sound in the world

Chapter 10 said that sound goes further in Chord than a `loud` thing, and
this is where. A sound that a story plays is two things at once. It is a
cue for the client, and it is a noise that happens at a place in the
story's world, where people can hear it.

The place is wherever the statement's owner is. A `play sound` in a
thing's clause sounds in that thing's room. The wisp can be made to notice.

```chord
create the wisp
  aka light, spark
  a person, follower, listener
  pronouns it

  A scrap of light the size of a thumbnail, the same blue as the lamp
  flame. It keeps a little behind your shoulder, where a dog would.

  after hearing the tolling, once
    phrase wisp-flinches
  end after
```

`listener` is a trait word for a person. A listener is told about each
sound that reaches the room it is in. `after hearing the <sound>` is a
clause that runs when one does, and it takes `once` as other clauses do.

```text
> light lamp with taper
You have no match, and you did not walk here for three days to use one. There is a word for this.

In the lodge, an old man who was not asleep opens his eyes.

You are Hobb, and that is the bell. It has not rung since the night you stopped it. There was a word for stopping it, and you wrote the word down, because you knew you would not keep it in your head, and you put the paper somewhere safe.

The tower bell tolls.

Somewhere in the Hall a small blue light goes flat and dim at the first stroke, like a flame in a draught, and creeps back to its size.
```

Read the last sentence again with chapter 31 in mind. On the turn the bell
first tolls, the story hands the player's role to Hobb, who is in the
Lodge. The wisp is in the Library. A clause that runs `after hearing`
prints its prose whether or not the player can see the listener, so the
sentence had to be written to be true from anywhere. Write a listener's
reaction as something that could be overheard, or keep it to a change of
state and let a description report it later.

## What a sound sounds like

The player hears sounds too. What the player reads is up to the sound's
declaration, which may be a block.

```chord
define sound catch from "audio/catch.mp3"
  heard: The wick takes with a small dry sound, like a page turned.
end sound
```

A sound block closes with `end sound` and may hold a `heard:` line, a
`heard from afar:` line, or both. The `heard:` line is what the player
reads when the sound is made nearby. This sound belongs to the `wick`
trait of chapter 24, so every lamp, candle and lantern in the story now
catches audibly.

```chord
define trait wick
  on the player kindling
    refuse when it is lit: already-burning
    change it to lit
    phrase kindled
    play sound catch
  end on
```

```text
> light lamp
You say the word. A flame stands up on the wick, blue at first, as if it had been waiting there with its coat on.

Something small and blue comes loose from the flame and hangs in the air beside it, undecided. Then it decides.

Somewhere above you, old timber takes a weight it had forgotten.

The wick takes with a small dry sound, like a page turned.
```

A sound prints only what its declaration states. The tolling has no block,
so it prints nothing, and the story's own bell sentences are not doubled.
Give a sound a `heard:` line when the sound is the news. Leave it off when
some other prose already carries the news and the recording is decoration.

## From afar, and with no file

A sound does not need a recording. Leave out `from` and the sound exists
in the world only: listeners hear it, the player reads its lines, and no
client is asked to play anything.

```chord
define sound prising
  heard: Iron shrieks on iron, close by, and stops.
  heard from afar: Somewhere in the Hall, iron complains about iron.
end sound
```

When the bell begins, Tamsin Vey goes to the grille on the Bell Stair and
tries her pry bar on it. Chapter 26 gave her that goal. The grille can
answer for it.

```chord
create the iron grille
  aka grille
  a thing, scenery, ward
  in the Bell Stair
  states: standing, lifted

  after Tamsin Vey pushing
    play sound prising
  end after
```

The clause is on the grille, so the sound is made in the Bell Stair. What
the player reads depends on how far away the player is. In the same room,
or one open doorway from it, the sound arrives whole and the `heard:` line
prints. Further off, or through a closed door, it arrives weakened, and
the `heard from afar:` line prints. Far enough away, nothing prints.

Standing in the Cloister, next to the stair:

```text
> north
Bell Stair
The foot of the tower. A stair winds up around the well where the bell rope hangs. The cloister is south. An iron grille stands across its third step.

You can see Tamsin Vey here.

The bell tolls again, and the rooks go up off the roof.

The wisp follows you.

Tamsin Vey pushes the iron grille.

Iron shrieks on iron, close by, and stops.
```

Waiting in the Library, two rooms from it:

```text
> wait
You wait.

The bell tolls again, and the rooks go up off the roof.

Somewhere in the Hall, iron complains about iron.
```

A sound that states only one of the two lines prints nothing at the other
distance. That is often what you want. A match being struck has a `heard:`
line and no business being heard from the next county.

## A bed of sound

A sound effect plays once and is over. An **ambient** bed loops until the
story stops it.

```chord
create the skiff
  aka boat, heron
  a vehicle
  in the Mere at 0, 2

  after the player entering
    play ambient lapping
  end after

  after the player exiting
    stop ambient
  end after
```

`play ambient` takes the name of a sound asset, which must have a file.
`stop ambient` stops it. Nothing prints for either, and nobody in the
world hears a bed: it is for the player's ears only, and it says nothing
that the description of the Mere has not said.

## Showing a picture

```chord
after the player kindling
  lose lens-shatters when not lantern-ready
  change the story to awake when lantern-ready
  award relit when lantern-ready
  phrase lantern-lit when lantern-ready
  show image lantern-lit-picture when lantern-ready
end after
```

`show image` puts a declared image on the page, and `hide image` takes it
away. Like every statement, each may end in a `when` condition. The
picture of the lit Lantern stays up for the crossing of the Mere, and the
beacon's clause hides it on the last turn.

```chord
after the player kindling
  award answered
  hide image
  win beacon-lit
end after
```

Where the picture appears on the page, and how large, is the page's
business. That is the next chapter.

## Music, named beds and layers

The Relighting has no music. A story that does declares it the same way
and has two statements for it.

```chord
define music waltz from "audio/waltz.mp3"
define sound rain from "audio/rain.mp3"
define sound hiss from "audio/hiss.mp3"
define image portrait from "img/portrait.png"
define image fog from "img/fog.png"

define ambient weather
define layer window

create the gramophone
  a thing, scenery, switchable
  in the Parlour

  A gramophone with a horn like a brass lily.

  after the player switching_on
    play music waltz looping
    play ambient hiss
    phrase needle-down when not client has music
  end after

  after the player switching_off
    stop music
    stop ambient
  end after
```

`play music` starts a track, and `looping` makes it repeat. `stop music`
ends it. There is one music track at a time.

There may be several beds. `play ambient hiss` uses the bed every story
has, which is called `main`. `define ambient weather` declares a second
bed by name, and `play ambient rain in weather` and `stop ambient in
weather` address it. The two loop together and stop separately.

Pictures have **layers** in the same way. Three exist without being
declared: `background`, `main` and `overlay`. `show image` with no layer
uses `main`. `define layer window` adds one, and `show image fog in
window` shows a picture in it.

```chord
create the curtains
  a thing, scenery, openable
  in the Parlour

  Heavy curtains.

  after the player opening
    play ambient rain in weather
    show image fog in window
    show image portrait
  end after

  after the player closing
    stop ambient in weather
    transition fade
    clear
  end after
```

Two more statements are for the page as a whole. `transition` followed by
a word asks the client for a visual transition of that kind, and `clear`
asks it to clear the screen.

## Asking what the client can do

The gramophone's clause has a condition in it that reads the client and
not the world.

```chord
phrase needle-down when not client has music
```

`client has` is followed by one word from a closed list of capabilities,
among them `sound`, `music`, `images`, `transitions`, `layers`,
`split-pane`, `status-bar` and `sidebar`. It is true when the program the
player is using has said it can do that thing. In a terminal the
gramophone prints its sentence, because a terminal has no music.

```text
> switch on gramophone
The gramophone hums to life.

The needle comes down, and a waltz gets up out of the crackle.
```

This is the pattern for anything a recording was going to carry alone:
play the recording, and say the same thing in words to a player who has
no recording.

One statement may not be made to depend on the client. `play sound hiss
when client has sound` is an error, `analysis.play-sound-client-has`. A
played sound happens in the world, where listeners react to it, and the
world must not go differently for two players because one of them has
speakers. Leave the condition off. A client without sound does not play
the cue, and that is all.

## Build and try it

Copy the `assets` folder from the companion folder `chapter-36` beside
your story, or make three short recordings and a picture of your own with
the same names. Add the five declarations at the top of the story, `play
sound catch` to the `wick` trait, `play sound tolling` to the header's
block, the clause to the grille, `listener` and its clause to the wisp,
the two clauses to the skiff, and the `show image` and `hide image` lines.

```shell
sharpee compose relighting.story --check
sharpee play .
```

Light the lamp and read its last line. Then wait in the Library for the
bell, look in the newspapers as Hobb, and keep waiting as Ansel until iron
complains about iron. Nothing will play in the terminal. Chapter 40 builds
the page where it does.

::: under-the-hood
**Under the Hood: media events** · event ids `media.sound.play`, `media.ambient.play`, `media.image.show`

Each statement in this chapter becomes one event with a small payload.
`play sound tolling` sends `media.sound.play` with the file's path as
`src`. `play ambient lapping` sends `media.ambient.play` with the path and
the bed's name, and `show image` sends `media.image.show` with the path
and, when one is named, the layer. The stops and the hide are
`media.ambient.stop`, `media.music.stop` and `media.image.hide`. A played
sound also raises the world's own sound event, which carries the thing
that made it, the room, and the sound's name, and it is that event a
listener's `after hearing` clause answers. A test tree can assert on any
of these by name, as chapter 38 shows.
:::

::: from-another-system
**From another system: figures and sounds**

Inform 10 declares a picture with a sentence such as `Figure of Woodlands
is the file "Woodlands.png".` and shows it with `display the Figure of
Woodlands;`. A sound is `Sound of rustling leaves is the file "Rustling
leaves.ogg".` and `play the sound of rustling leaves;`. *Writing with
Inform* says both can be used only when the project is compiled to the
Glulx story file format. TADS 3 does it in the output text, with HTML
TADS tags: `<IMG SRC="picture.jpg">` for a picture and a `<SOUND>` tag for
a sound, and a game asks `systemInfo()` what the interpreter can do. In
neither system is a played sound an event in the story's world that a
character can hear, on the pages read for this comparison.
:::

## What you have so far

The Relighting can be heard. The bell has a recording and the wisp flinches
at its first stroke. A flame catching makes a sound the player reads. A
pry bar on the grille is heard plainly from the Cloister and faintly from
the Library. The skiff has water under it, and the lit Lantern has a
picture.

None of it has been heard or seen yet, because a terminal cannot. The
picture needs a place on a page, and the page needs to be told which of
its features this story uses. The next chapter is about the page.
