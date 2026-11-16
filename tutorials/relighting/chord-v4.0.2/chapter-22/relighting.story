## The Relighting, as it stands at the end of chapter 22: the standard
## messages have been made this story's own. The dark has no grue in
## it, waiting has a voice, and two refusals change once the Hall wakes.

define condition lantern-ready: the lens is in the Great Lantern and the lens is sound

define condition faded-page: it is faded

define condition lamplight-here: the hand lamp is lit and the hand lamp is here and the cistern is here

## A word Ansel has not read yet. One key, three ways of saying it.

define phrase no-such-word, cycling
  You reach for the word and find only the place where it was.
or
  The shape of it is there, as a name is on the tip of the tongue. The
  word is not.
or
  Nothing comes. You would need to read it first.
end phrase

## A sentence the Bell Stair's description carries only while it is true.

define phrase grille-across while the iron grille is standing
  An iron grille stands across its third step.
end phrase

## What Hobb says when Ansel comes in.

define phrase hobb-saying, cycling
  "Gnusto on the sill," says Hobb, without turning round. It is what
  people here say for good morning.
or
  "Gnusto keeps what the dark forgets," Hobb remarks, to the kettle.
or
  "All lamp and no gnusto, some people," says Hobb. He does not say
  which people.
end phrase

define phrase gate-motto, verbatim
        THE CRAFT
     NEEDS A LIGHT
    TO COME HOME TO
end phrase

## This world has its own dark, and nothing lives in it.

override message going-too-dark
  You are at the foot of the steps, in the dark, and that is all you
  can say for certain. You were a student here, and you remember what
  the Undercroft does to shins.
end override

override message waiting-time-passes, cycling
  You wait. The Hall has had thirty years of practice and is better at
  it than you are.
or
  You wait. Somewhere a shutter knocks, twice, and thinks better of it.
or
  You wait.
end override

override messages en-US
  taking-taken:
    You take it.
  looking-room-dark:
    It is dark, and the dark here is old and has no interest in you.

## Two refusals said one way while the Hall sleeps and another once it
## has begun to wake. The gated book stands first, so it wins while its
## condition holds.

define phrasebook hall-waking while the story is not asleep
  kettle-is-hobbs:
    "Still mine," says Hobb, with his eye on the ceiling.
  grille-fixed:
    It hums under your hand, very faintly, like a rail with a train a
    long way off. It does not move.
end phrasebook

define phrasebook hall-asleep
  kettle-is-hobbs:
    Hobb does not look round. "That's mine," he says.
  grille-fixed:
    It does not so much as rattle.
end phrasebook

define counter workings

define counter tolls

define timer waking
  creak
    Somewhere above you, old timber takes a weight it had forgotten.
  sway
    A slow draught moves through the Hall, one way and then the other.
  strike
    The tower bell strikes once, and the sound goes through the stones
    under your feet.
end timer

define sequence the day
  at turn 50
    phrase light-turning
  30 turns later
    lose night-falls when the story is not awake
end sequence

define chapters
  morning - Morning
    begins when the game starts
  afternoon - Afternoon
    The Hall has noticed you.
    begins when the story becomes waking
  dusk - Dusk
    begins when the player visits the Lantern Gallery for the first time
end chapters

story
  title: The Relighting
  id: relighting
  story-version: 0.4.0
  states: asleep, waking, awake
  use scoring
    rank "Latecomer" at 0
    rank "Second-Year" at 10
    rank "Journeyman" at 20
    rank "Lamplighter" at 35
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

  after the player entering
    phrase hobb-saying when the tower bell is not tolling
    phrase hobb-deafened when the tower bell is tolling
  end after

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
  rope hangs. The cloister is south. {grille-across}

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

  after the player examining
    phrase flame-morning when during morning
    phrase flame-later when after morning
  end after

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

  phrase detail while the hand lamp is lit:
    It is burning with a small flame, and the flame is blue.

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
  morning by one leaf. There is a line of cut letters over the arch.

  after the player examining
    phrase gate-motto
  end after

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

  score relit worth 15

  on the player lighting
    the kindle page must be learned: no-such-word
    the lens must be in the Great Lantern: lantern-empty
  end on

  after the player lighting
    lose lens-shatters when not lantern-ready
    change the story to awake when lantern-ready
    award relit when lantern-ready
    win lantern-lit when lantern-ready
  end after

create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit
  in the Refectory

  Stubs of tallow in iron prickets down the middle of each table.

  on the player lighting
    the kindle page must be learned: no-such-word
  end on

  score supper-lit worth 5

  after the player lighting
    move the unbind page here
    award supper-lit
    phrase candles-catch
  end after

  phrase detail while the candles is not lit:
    Nobody has put a flame to them since the last supper of the last
    term.

  phrase detail while the candles is lit:
    They are all alight, every one, and the flames stand very straight.

create the bell rope
  aka rope
  a thing, scenery, pullable
  in the Bell Stair
  counter pulls

  A rope as thick as your wrist, coming down out of the dark.

  after the player pulling
    raise the bell rope's pulls by 1
    phrase rope-sore when the bell rope's pulls is more than 3
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
    phrase grimoire-half when workings is at least 2
  end after

create the kindle page
  aka first page, leaf
  a thing, readable
  on the reading desk
  states: legible, learned
  score first-working worth 5

  A leaf that has worked loose from the grimoire. The ink on it is
  complete.

  on the player reading
    select on the kindle page's state
      when legible
        change the kindle page to learned
        change the story to waking
        start waking
        raise workings by 1
        award first-working
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
        raise workings by 1
        phrase hush-learned
      when learned
        phrase hush-known
    end select
  end on

create the mend page
  aka second page
  a thing, readable
  states: faded, legible, learned
  score second-working worth 5

  A leaf of the grimoire, stiff and cockled from thirty years under ice.
  The ink has not run.

  on the player reading
    refuse when the mend page is faded: page-blank
    select on the mend page's state
      when legible
        change the mend page to learned
        raise workings by 1
        award second-working
        phrase mend-learned
      when learned
        phrase mend-known
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
        raise workings by 1
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
  score thaw worth 5

  on every turn while the cistern is thawing and lamplight-here
    change the cistern to running
    move the mend page to the Undercroft
    award thaw
    phrase cistern-gives
  end on

  on every turn while the cistern is frozen and lamplight-here
    change the cistern to thawing
    phrase cistern-drips
  end on

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

  after the player examining
    phrase bell-count with count = tolls when the tower bell is tolling
  end after

create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing
  in the crate
  states: cracked, sound

  A disc of glass as wide as a cartwheel, ground in rings.

  phrase detail while the lens is cracked:
    A crack runs across it from edge to edge.

  phrase detail while the lens is sound:
    There is no flaw in it anywhere, and you looked.

  after the player inserting in the Great Lantern
    phrase lens-seated
  end after

## People.

create Hobb
  a person, proper
  in the Lodge

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

  phrase present:
    Hobb is in the doorway with his back to you, watching the court as
    if it might be up to something.

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
  grimoire-half:
    You count the workings you have back. It is more than you had this
    morning, and less than the Lantern will want.
  rope-sore:
    Your palms have begun to object.
  lens-shatters:
    For one breath the cracked lens throws two beams, crossed, over the
    whole valley. Then it lets go along the crack, and the Lantern goes
    dark for the last time.
  lantern-lit:
    The lens gathers the flame and sends it out over the valley in one
    white bar. Down in the Hall, every blank page begins to fill.
  mend-learned:
    The second working is slower to come. It is the word for making a
    broken thing whole, and it asks whether you mean it.
  mend-known:
    You have it, and it has you.
  cistern-drips:
    Where the lamplight falls on it, the ice in the cistern begins to
    sweat.
  cistern-gives:
    The ice in the cistern breaks up all at once. A leaf of paper rides
    up on the meltwater and slides out onto the flags.
  toll-near:
    The tower bell tolls.
  toll-far:
    The bell tolls again, and the rooks go up off the roof.
  toll-count:
    The bell tolls. You have stopped counting.
  flame-morning:
    It is early yet. The flame has the whole day to make up its mind.
  flame-later:
    It is taller than it was this morning, and it leans toward the
    Hall.
  light-turning:
    The light has turned. The shadows in the Hall have begun to lean
    east.
  night-falls:
    Dusk comes down on Lanternhall and finds the Lantern dark. The blue
    flame in the porter's lodge goes yellow, and then goes out.
  cistern-frozen:
    It is a block of grey ice to its brim. Something flat and pale is
    held in the ice, a hand's depth down.
  cistern-thawing:
    The ice has gone dark and wet, and stands a finger's width clear of
    the stone all round.
  cistern-running:
    The cistern is full of black water, moving slowly, as though it had
    somewhere to be.
  lens-seated:
    The lens drops into its seat with a sound like a coin on a counter.
  cake-eaten:
    It tastes of caraway, and of being nineteen.
  cake-watched:
    Hobb cut that cake into two pieces with some care, and he is sitting
    four feet away. You find you cannot.
  bell-count:
    By your count that makes {verbatim:count}, and it is not tired.
  hobb-deafened:
    Hobb has his hands over his ears. He says something, and the bell
    says something louder.
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
