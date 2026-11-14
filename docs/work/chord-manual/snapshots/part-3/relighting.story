## The Relighting, as it stands at the end of Part III: the Hall reacts.
## Pages can be read and learned, the cistern thaws, the bell wakes and
## tolls, the day runs out, and there is a score. No spell can be cast
## yet, so the stair stays sealed and the lens stays cracked.

story
  title: The Relighting
  id: relighting
  story-version: 0.3.0
  states: asleep, waking, awake
  use scoring
    rank "Latecomer" at 0
    rank "Second-Year" at 10
    rank "Lamplighter" at 30
  use chapters

  on every turn while the tower bell is tolling
    select cycling
      phrase toll-near
    or
      phrase toll-far
    or
      phrase toll-count
    end select
    raise tolls by 1
  end on

  when waking expires
    change the tower bell to tolling
  end when
  authors:
    The Sharpee Project
  description: Thirty years after the magic went out of the world, a lamp burns blue.
  prologue:
    You were here for one term, thirty years ago, and you would have said
    you remembered none of it. Then last week a candle leaned toward your
    hand, and you started walking.

define counter tolls

define condition lantern-ready: the lens is in the Great Lantern and the lens is not broken

define chapters
  morning - Morning
    begins when the game starts
  afternoon - Afternoon
    The Hall has noticed you.
    begins when the story becomes waking
  dusk - Dusk
    begins when the player visits the Lantern Gallery for the first time
end chapters

define sequence the day
  at turn 50
    phrase light-turning
  30 turns later
    lose night-falls when not awake
end sequence

define timer waking
  creak
    Somewhere above you, old timber takes a weight it had forgotten.
  sway
    A slow draught moves through the Hall, one way and then the other.
  strike
    The tower bell strikes once, and the sound goes through the stones
    under your feet.
end timer

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

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame.

create the Gate Court, a room
  in the Grounds
  exits: south to the Lodge, north to the Cloister

  A square of worn flagstones between the gate and the cloister arch.
  Grass has come up through the joints and been left to get on with it.

  first time
    You crossed this court every morning for a term, late, with your
    books under your arm. It was larger then.

## The Hall.

create the Cloister, a room
  in the Hall
  east to the Refectory
  west to the Library through the library door
  north to the Bell Stair
  down to the Undercroft

  A covered walk around a garth gone to nettles. The refectory is east,
  the library door west, and the foot of the bell stair north. Worn steps
  go down into the dark under the hall.

create the Refectory, a room
  in the Hall

  Three long tables and a hearth you could stable a horse in. The
  benches are stacked against the wall, where someone left them for the
  holidays.

  passage to the Undercroft
    grammar
      squeeze or crawl behind [the] hearth
  end passage

create the Library, a room
  in the Hall

  The reading room of Lanternhall, with its desks in rows and its
  galleries of shelves. The stacks run back to the north, out of the
  light.

create the Undercroft, a room, dark
  in the Hall

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone.

create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked: stair-sealed

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs, and an iron grille stands across its third step.

create the Lantern Gallery, a room
  in the Hall
  east is deadly: over-the-parapet

  The roof of the tower, open on every side. The Great Lantern stands in
  the middle of it on a stone drum, taller than you are, its glass
  thirty years dirty. To the east a low parapet is all there is between
  you and the court.

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
  a thing, scenery, plural
  in the Lodge

  The top one is from last week. The bottom one reports the Dimming, in
  the small type newspapers use for things they do not yet believe.

create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.

  on the player taking
    refuse kettle-is-hobbs
  end on

create the seed cake
  aka cake
  a thing, edible
  on the chair
  servings 2

  Half a seed cake on a plate, cut with some care into two pieces.

create the oak press
  aka press, cupboard
  a container, scenery, openable, starts closed
  in the Lodge
  holds 6

  A shallow cupboard on the wall with a row of hooks inside, each hook
  under a painted label.

create the library key
  a thing
  in the oak press

  A long key with a book cut into its bow.

create the hand lamp
  a thing, light-source, starts unlit
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

create the travelling coat
  aka coat
  a thing, wearable

  A long coat the colour of the road.

## Things about the Grounds.

create the gate
  aka gates, arch
  a thing, scenery
  in the Lodge and the Gate Court

  The great gate of Lanternhall, shut for thirty years and opened this
  morning by one leaf. Over the arch a line of cut letters says that the
  craft needs a light to come home to.

## Things in the Hall.

create the hearth
  aka fireplace
  a thing, scenery
  in the Refectory

  The back of the hearth is a single iron plate, and it does not sit
  quite square. There is a hand's breadth of darkness down one side.

create the candles
  a thing, scenery, plural
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table. Nobody
  has put a flame to them since the last supper of the last term.

create the reading desk
  aka desk
  a supporter, scenery
  in the Library

  The first desk of the first row, with a slope for a book and a rail to
  keep it there.

create the grimoire
  aka book
  a thing
  on the reading desk

  A book as long as your forearm, chained to nothing any more. Its pages
  are blank, or were. Here and there a line of ink has come back, as
  frost comes onto a window.

create the kindle page
  aka first page
  a thing, readable
  on the reading desk
  states: legible, learned
  score first-working worth 5

  A leaf that has worked loose from the grimoire. The ink on it is
  complete, and still a little wet.

  on the player reading
    select on the kindle page's state
      when legible
        change the kindle page to learned
        change the story to waking
        start waking
        award first-working
        phrase kindle-learned
      when learned
        phrase kindle-known
    end select
  end on

create the mend page
  aka second page
  a thing, readable
  states: legible, learned
  score second-working worth 5

  A leaf of the grimoire, stiff and cockled from thirty years under ice.
  The ink has not run.

  on the player reading
    select on the mend page's state
      when legible
        change the mend page to learned
        award second-working
        phrase mend-learned
      when learned
        phrase mend-known
    end select
  end on

create the cistern
  aka ice, water
  a thing, scenery
  in the Undercroft
  states: frozen, thawing, running
  score thaw worth 5

  A stone cistern sunk in the floor, fed by a lead pipe from somewhere
  above.

  on the player examining
    select on the cistern's state
      when frozen
        phrase cistern-frozen
      when thawing
        phrase cistern-thawing
      when running
        phrase cistern-running
    end select
  end on

  on every turn while the cistern is thawing and the hand lamp is lit
    change the cistern to running
    move the mend page to the Undercroft
    award thaw
    phrase cistern-gives
  end on

  on every turn while the cistern is frozen and the hand lamp is lit
    change the cistern to thawing
    phrase cistern-drips
  end on

create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing, breakable, starts broken
  in the crate

  A disc of glass as wide as a cartwheel, ground in rings. A crack runs
  across it from edge to edge.

  after the player inserting in the Great Lantern
    phrase lens-seated
  end after

create the tower bell
  aka bell
  a thing, scenery
  in the Bell Stair
  states: still, tolling

  You cannot see the bell from here, only the dark it hangs in.

create the Great Lantern
  aka lantern, beacon
  a container, scenery, light-source, starts unlit
  in the Lantern Gallery
  holds 1
  score relit worth 15

  A cage of brass and glass on a stone drum, with a seat at its heart
  for a lens and a wick below as thick as a ship's cable.

  on the player lighting
    the lens must be in the Great Lantern: lantern-empty
  end on

  after the player lighting
    lose lens-shatters when not lantern-ready
    change the story to awake when lantern-ready
    award relit when lantern-ready
    win lantern-lit when lantern-ready
  end after

create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair

  A rope as thick as your wrist, coming down out of the dark.

  after the player pulling
    phrase rope-nothing
  end after

create the iron grille
  aka grille
  a thing, scenery
  in the Bell Stair

  Wrought iron, floor to vault, with no lock, no latch and no hinges.
  It was not built. It was put there.

  after the player examining
    first time
      phrase grille-memory
    second time
      phrase grille-cold
    third time
      phrase grille-enough
  end after

## People.

create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

create Ansel
  a person
  playable
  starts in the Lodge
  wears the travelling coat

  You were a student here once, for a term. You have the same hands and
  not much else.

define phrases en-US
  stair-sealed:
    The grille stands across the stair, and there is no way round it.
  over-the-parapet:
    You step up onto the parapet to see the court. The court comes up to
    meet you.
  kettle-is-hobbs:
    Hobb does not look round. "That's mine," he says.
  kindle-learned:
    You read the line once, and it reads you back. The word for waking a
    flame settles into the place it left thirty years ago, as if it had
    only stepped out. Far above, something in the Hall shifts.
  kindle-known:
    You know it. You are not likely to lose it twice.
  mend-learned:
    The second working is slower to come. It is the word for making a
    broken thing whole, and it asks whether you mean it.
  mend-known:
    You have it, and it has you.
  cistern-frozen:
    The cistern is a block of grey ice to its brim. Something flat and
    pale is held in it, a hand's depth down.
  cistern-thawing:
    The ice has gone dark and wet, and stands a finger's width clear of
    the stone all round.
  cistern-running:
    The cistern is full of black water, moving slowly, as though it had
    somewhere to be.
  cistern-drips:
    Where the lamplight falls on it, the ice in the cistern begins to
    sweat.
  cistern-gives:
    The ice in the cistern breaks up all at once. A leaf of paper rides
    up on the meltwater and slides out onto the flags.
  lens-seated:
    The lens drops into its seat with a sound like a coin on a counter.
  lantern-empty:
    There is a wick, and there is a seat for a lens with no lens in it.
    A flame here would light the roof and nothing else.
  lens-shatters:
    The flame takes. For one breath the cracked lens throws two beams,
    crossed, over the whole valley. Then it lets go along the crack, and
    the Lantern goes dark for the last time.
  lantern-lit:
    The flame takes, and the lens gathers it and sends it out over the
    valley in one white bar. Down in the Hall, every blank page begins to
    fill.
  light-turning:
    The light has turned. The shadows in the Hall have begun to lean
    east.
  night-falls:
    Dusk comes down on Lanternhall and finds the Lantern dark. The blue
    flame in the porter's lodge goes yellow, and then goes out.
  toll-near:
    The tower bell tolls.
  toll-far:
    The bell tolls again, and the rooks go up off the roof.
  toll-count:
    The bell tolls. You have stopped counting.
  rope-nothing:
    Nothing answers. The bell has not been rung in thirty years and sees
    no reason to start for you.
  grille-memory:
    There was no grille here in your day. You came down this stair at a
    run, most mornings.
  grille-cold:
    The iron is colder than the morning accounts for.
  grille-enough:
    It has not changed its mind.

before the game starts
  change the player to Ansel
end before
