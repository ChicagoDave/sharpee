## Chord 4.0.3 lexer-golden corpus — the surface that joined after the
## 4.0.2 pin: the `the story is <state>` and `the story is not <state>`
## conditions (GH #705), a `define sound` block with its `heard:` and
## `heard from afar:` lines closed by `end sound`, an `emit` whose name is
## one word, and the `when the game starts … end when` block with its three
## special routines (`show-prologue`, `do-first-look`, `show-banner`). Every
## spelling is lifted from a source the compiler's own tests or the test
## stories compile: `story-is-state.test.ts`, the manual's chapter 40
## companion, and `test-stories/quay/seeded/quay-reordered.story`. Edit only
## alongside the golden file.

story
  title: Chord 4.0.3 Surface
  authors:
    Lexer Golden
  id: lexer-golden-chord-4-0-3
  story-version: 4.0.3
  states: day, night
  prologue:
    The gate is chained at dusk, and it is nearly dusk.

define sound prising
  heard: Iron shrieks on iron, close by, and stops.
  heard from afar: Somewhere past the wall, iron complains about iron.
end sound

create the Terrace
  a room
  north to the Garden
  north is blocked while the story is night: gate-chained

  A stone terrace.

create the Garden
  a room
  south to the Terrace
  south is blocked while the story is not day: gate-chained

  A walled garden.

create the bell
  a thing
  in the Terrace

  A small brass bell.

  after the player examining
    emit lexer-bell-found with what "bell" and note "it has no clapper"
  end after

create Alex
  a person
  playable
  starts in the Terrace

  You.

before the game starts
  change the player to Alex
end before

when the game starts
  show-prologue
  do-first-look
  show-banner
end when

define phrase gate-chained
  The garden gate is chained for the night.
end phrase
