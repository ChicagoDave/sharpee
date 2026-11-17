## The Relighting, as it stands at the end of chapter 17: a clause can
## choose. Each page answers by its state, the bell rope has three
## things to say, and the grille is examined three different ways.

define condition lantern-ready: the lens is in the Great Lantern and the lens is sound

define condition faded-page: it is faded

story
  title: The Relighting
  id: relighting
  story-version: 0.3.0
  states: asleep, waking, awake
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

## The two regions. The Grounds are what a visitor may see; the Hall is
## everything behind the cloister arch.

create the Grounds, a region

create the Hall, a region
  rooms Stack 1 to 3

    Shelves rise on both sides to a ceiling you cannot make out. Every
    spine is blank.

  exits
    the Stack 1: south to the Library, north to the Stack 2
    the Stack 2: north to the Stack 3

## The Grounds.

create the Lodge, a room
  in the Grounds
  north to the Gate Court

  room name:
    The Porter's Lodge

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame, and
  an oak press hangs on the wall beside it. The door to the court is
  north.

create the Gate Court, a room
  in the Grounds
  exits: south to the Lodge, north to the Cloister

  A square of worn flagstones between the gate and the cloister arch.
  Grass has come up through the joints and been left to get on with it.
  Over the gate, a line of cut letters says that the craft needs a light
  to come home to.

  first time
    You crossed this court every morning for a term, late, with your
    books under your arm. It was larger then. The cloister arch is
    still north of you.

## The Hall.

create the Cloister, a room
  in the Hall
  east to the Refectory
  west to the Library through the library door
  north to the Bell Stair
  down to the Undercroft

  A covered walk around a garth gone to nettles. The refectory is east,
  the library door west, and the foot of the bell stair north. Worn steps go
  down into the dark under the hall.

create the Refectory, a room
  in the Hall

  Three long tables, each with its row of candles, and a hearth you
  could stable a horse in. The benches are stacked against the wall, where someone left them for the
  holidays. The cloister is back to the west.

  passage to the Undercroft
    grammar
      squeeze or crawl behind [the] hearth
  end passage

create the Library, a room
  in the Hall

  The reading room of Lanternhall, with its desks in rows and its
  galleries of shelves. The stacks run back to the north, out of the
  light. The cloister is east.

  after the player entering, once
    phrase library-ink
  end after

create the Undercroft, a room, dark
  in the Hall

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone. The steps go back up.

create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs, and an iron grille stands across its third step. The
  cloister is south.

create the Lantern Gallery, a room
  in the Hall
  east is deadly: over-the-parapet

  The roof of the tower, open on every side. The Great Lantern stands in
  the middle of it on a stone drum, taller than you are, its glass
  thirty years dirty. To the east a low parapet is all there is between
  you and the court. The stair goes back down.

## The door.

create the library door
  a door, openable, lockable with the library key, starts locked

  Oak, banded with iron, and carved with an open book whose pages have
  been left smooth.

## Things in the Lodge.

create the blue flame
  aka pilot flame, sill
  a thing, scenery
  in the Lodge

  Hobb's own lamp, which has burned yellow on that sill for as long as
  anyone has kept count. The flame is blue this morning, and does not
  flicker.

create the chair
  a supporter, scenery, enterable
  in the Lodge

  A wing chair that has taken the shape of one man.

create the newspapers
  aka papers
  a thing, scenery, plural
  in the Lodge

  The top one is from last week. The bottom one reports the Dimming, in
  the small type newspapers use for things they do not yet believe.

create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.

  on the player taking while Hobb is here
    refuse kettle-is-hobbs
  end on

create the hand lamp
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on

create the seed cake
  aka cake
  a thing, edible
  on the chair
  servings 2

  Half a seed cake on a plate, cut with some care into two pieces.

  on the player eating
    refuse when Hobb is here: cake-watched
  end on

create the cup
  aka teacup
  a thing, breakable, fragile
  on the chair

  A china cup without a saucer, with a brown ring where the tea stood.

create the oak press
  aka press, cupboard
  a container, scenery, openable, starts closed
  in the Lodge
  holds 6

  A shallow cupboard on the wall with a row of hooks inside, each hook
  under a painted label. Most of the labels have faded past reading.

create the library key
  a thing
  in the oak press

  A long key with a book cut into its bow.

create the spectacles
  aka glasses
  a thing, plural, concealed, wearable
  in the Lodge

  Wire spectacles with one arm mended in thread. Hobb has been looking
  for them since the spring.

  after the player giving to Hobb
    make Hobb wear the spectacles
    phrase spectacles-given
  end after

## Things about the Grounds and the Hall.

create the gate
  aka gates, arch, letters, motto
  a thing, scenery
  in the Lodge and the Gate Court

  The great gate of Lanternhall, shut for thirty years and opened this
  morning by one leaf. Over the arch a line of cut letters says that the
  craft needs a light to come home to.

create the bell tower
  aka tower
  a thing, scenery
  in the Grounds

  The tower of Lanternhall stands over everything, square and grey, with
  the dark glass of the Great Lantern at the top of it.

create the hearth
  aka fireplace
  a thing, scenery
  in the Refectory

  The back of the hearth is a single iron plate, and it does not sit
  quite square. There is a hand's breadth of darkness down one side.

create the Great Lantern
  aka lantern
  a container, scenery, light-source, starts unlit
  in the Lantern Gallery
  holds 1

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

  on the player lighting
    the kindle page must be learned: no-such-word
    the lens must be in the Great Lantern: lantern-empty
  end on

create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table. Nobody
  has put a flame to them since the last supper of the last term.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on

  after the player lighting
    move the unbind page here
    phrase candles-catch
  end after

create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair

  A rope as thick as your wrist, coming down out of the dark.

  after the player pulling
    select cycling
      phrase rope-nothing
    or
      phrase rope-dust
    or
      phrase rope-patience
    end select
  end after

create the shelves
  aka shelf, spines, books
  a thing, scenery, plural
  in the Library, the Stack 1, the Stack 2 and the Stack 3

  Thousands of books, shelved by a system nobody alive remembers. Take
  one down and its pages are as blank as its spine.

create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair
  states: standing, lifted

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.

  on the player taking, pushing, pulling
    refuse grille-fixed
  end on

  after the player examining
    first time
      phrase grille-memory
    second time
      phrase grille-cold
    third time
      phrase grille-enough
  end after

create the reading desk
  aka desk
  a supporter, scenery
  in the Library

  The first desk of the first row, with a slope for a book and a rail to
  keep it there.

create the grimoire
  aka book, margin, note
  a thing, readable with text "In the margin, in a small brown hand: gnusto. Came over the water as a working, they say. Meaning lost."
  on the reading desk

  A book as long as your forearm, chained to nothing any more. Its pages
  are blank, or were. Here and there a line of ink has come back, as
  frost comes onto a window. Someone has written in one margin.

  after the player examining
    phrase grimoire-waiting when any faded-page
    phrase grimoire-filling when no faded-page
  end after

create the kindle page
  aka first page, leaf
  a thing, readable
  on the reading desk
  states: legible, learned

  A leaf that has worked loose from the grimoire. The ink on it is
  complete.

  on the player reading
    select on the kindle page's state
      when legible
        change the kindle page to learned
        change the story to waking
        phrase kindle-learned
        each faded-page
          change the match to legible
        end each
      when learned
        phrase kindle-known
    end select
  end on

create the hush page
  aka third page
  a thing, readable
  in the Stack 3
  states: faded, legible, learned

  A leaf of the grimoire, shelved by somebody between two blank spines
  as though it were a book.

  on the player reading
    refuse when the hush page is faded: page-blank
    select on the hush page's state
      when legible
        change the hush page to learned
        phrase hush-learned
      when learned
        phrase hush-known
    end select
  end on

create the unbind page
  aka fourth page
  a thing, readable
  states: faded, legible, learned

  A leaf of the grimoire with a ring of old wax on it, where a pricket
  stood for thirty years.

  on the player reading
    refuse when the unbind page is faded: page-blank
    select on the unbind page's state
      when legible
        change the unbind page to learned
        phrase unbind-learned
      when learned
        phrase unbind-known
    end select
  end on

create the cistern
  aka ice
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running

  A stone cistern sunk in the floor, fed by a lead pipe from somewhere
  above.

  after the player examining
    select on the cistern's state
      when frozen
        phrase cistern-frozen
      when thawing
        phrase cistern-thawing
      when running
        phrase cistern-running
    end select
  end after

create the tower bell
  aka bell
  a thing, scenery
  in the Bell Stair
  states: unrung, tolling, silent

  You cannot see the bell from here, only the dark it hangs in.

create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing
  in the crate
  states: cracked, sound

  A disc of glass as wide as a cartwheel, ground in rings. A crack runs
  across it from edge to edge.

  after the player inserting in the Great Lantern
    phrase lens-seated
  end after

## People.

create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

create the travelling coat
  aka coat
  a thing, wearable

  A long coat the colour of the road.

create the wax taper
  aka taper
  a thing

  Half a wax taper. Last week you lit it to read by, and its flame
  leaned toward your hand like a cat. You have carried it since.

create Ansel
  a person, proper
  playable
  starts in the Lodge
  carries the wax taper
  wears the travelling coat

  You were a student here once, for a term. You have the same hands and
  not much else.

  after eating
    phrase cake-eaten
  end after

define phrases en-US
  stair-sealed:
    The grille stands across the stair, and there is no way round it.
  over-the-parapet:
    You step up onto the parapet to see the court. The court comes up to
    meet you.
  kettle-is-hobbs:
    Hobb does not look round. "That's mine," he says.
  spectacles-given:
    Hobb hooks them over his ears and looks at you properly for the
    first time. "Ansel," he says, after a while. "You were always late."
  library-ink:
    There is a smell in here that was not here thirty years ago, or was
    here and you had forgotten it. It is wet ink.
  kindle-learned:
    You read the line once, and it reads you back. The word for waking a
    flame settles into the place it left thirty years ago, as if it had
    only stepped out.
  rope-nothing:
    Nothing answers. The bell has not been rung in thirty years and sees
    no reason to start for you.
  rope-dust:
    A little dust comes down the well, and that is all.
  rope-patience:
    The rope takes your weight and gives nothing back. Somewhere above,
    the bell goes on not ringing.
  grille-memory:
    There was no grille here in your day. You came down this stair at a
    run, most mornings.
  grille-cold:
    The iron is colder than the morning accounts for.
  grille-enough:
    It has not changed its mind.
  cistern-frozen:
    It is a block of grey ice to its brim. Something flat and pale is
    held in the ice, a hand's depth down.
  cistern-thawing:
    The ice has gone dark and wet, and stands a finger's width clear of
    the stone all round.
  cistern-running:
    The cistern is full of black water, moving slowly, as though it had
    somewhere to be.
  grille-fixed:
    It does not so much as rattle.
  lens-seated:
    The lens drops into its seat with a sound like a coin on a counter.
  cake-eaten:
    It tastes of caraway, and of being nineteen.
  cake-watched:
    Hobb cut that cake into two pieces with some care, and he is sitting
    four feet away. You find you cannot.
  no-such-word:
    You reach for the word and find only the place where it was.
  kindle-known:
    You know it. You are not likely to lose it twice.
  page-blank:
    The leaf is blank on both sides. You hold it up to the light, and it
    is still blank, but the paper has the look of a held breath.
  hush-learned:
    The third working is hardly a word at all. It is the breath you take
    before one.
  hush-known:
    You have it. It was the easiest to keep.
  unbind-learned:
    The fourth working reads like a knot seen from the wrong end. You
    follow it round until it comes apart in your head.
  unbind-known:
    You know how it goes. It goes loose.
  grimoire-waiting:
    The loose leaves that belong in it are somewhere about the Hall,
    and you have the feeling they are still as blank as these.
  grimoire-filling:
    Something has changed in the last hour. Wherever its loose leaves
    have got to, the ink is on them now.
  lantern-empty:
    There is a wick, and there is a seat for a lens with no lens in it.
    A flame here would light the roof and nothing else.
  candles-catch:
    The flame runs down the length of the table, and every cold wick
    takes it. In the candlelight there is a leaf of paper under the
    middle pricket that the daylight did not show.

before the game starts
  change the player to Ansel
end before
