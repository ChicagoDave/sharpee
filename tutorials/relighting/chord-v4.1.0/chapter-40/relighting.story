## The Relighting, as it stands at the end of chapter 40 and of the book:
## version 1.0.0, with its identifier in the header and its claims in the
## file beside it, ready for `sharpee publish`.

## What a client can play and show. An asset is a name and a file under
## the assets folder. A sound is also a sound in the world: people who
## are listeners hear it, and the player reads the lines it states.

define sound tolling from "audio/toll.mp3"

define sound catch from "audio/catch.mp3"
  heard: The wick takes with a small dry sound, like a page turned.
end sound

define sound prising
  heard: Iron shrieks on iron, close by, and stops.
  heard from afar: Somewhere in the Hall, iron complains about iron.
end sound

define sound lapping from "audio/lapping.mp3"

define image lantern-lit-picture from "img/lantern-lit.png"

## The panel. A channel is a named value the story sends to the page;
## this one grows by a line each time the story reports a working learned.

define channel workings
  mode append
  return "(working): (gloss)" from relighting-working-learned
end channel

## A mood of the story's own: nervous, and a shade darker.

define mood rattled like nervous, but darker

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

## Where Hobb stands, for as long as somebody else is looking.

define phrase hobb-in-doorway while Hobb is not roused
  Hobb is in the doorway with his back to you, watching the court as if
  it might be up to something.
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
  asking-unknown-topic:
    {capitalize the target} gives that some thought, and gives it back.
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

## The traits. A thing that composes one of these answers the working it
## names. Inside a trait, `it` is whichever thing that is.

define trait wick
  on the player kindling
    refuse when it is lit: already-burning
    change it to lit
    phrase kindled
    play sound catch
  end on

  on the player lighting
    refuse light-needs-the-word
  end on
end trait

define trait lens-seat
  on the player kindling
    the lens must be in the Great Lantern: lantern-empty
    the shutter must be drawn: lantern-shuttered
  end on
end trait

define trait mendable
  states: cracked, sound
  score made-whole worth 5
  phrases en-US
    mended:
      You say the word and mean it. What was broken is whole, and has
      no memory of having been otherwise.

  on the player mending
    refuse when it is sound: already-whole
    change it to sound
    award made-whole
    phrase mended
  end on
end trait

define trait hushable
  score quieted worth 5

  on the player hushing
    it must be tolling: already-quiet
    change it to silent
    award quieted
    phrase bell-hushed
  end on
end trait

define trait ward
  score unsealed worth 5

  on the player unbinding
    refuse when the tower bell is unrung: ward-asleep
    refuse when the tower bell is tolling: ward-in-the-bell
    change it to lifted
    move it offstage
    award unsealed
    phrase ward-lifts
  end on
end trait

## The workings. An action says what the player may type and what must
## be true of the player. It never asks which thing was named.

define action kindling
  grammar
    kindle the target
    kindle
  refuse without target: working-wants-a-thing
  the target must be reachable
  the kindle page must be learned: no-such-word
  otherwise refuse nothing-to-kindle

define action mending
  grammar
    mend the target
    mend
  refuse without target: working-wants-a-thing
  the target must be reachable
  the mend page must be learned: no-such-word
  otherwise refuse nothing-to-mend

define action hushing
  grammar
    hush the target
    hush
  refuse without target: working-wants-a-thing
  the target must be visible
  the hush page must be learned: no-such-word
  otherwise refuse nothing-to-hush

define action unbinding
  grammar
    unbind the target
    unbind
  refuse without target: working-wants-a-thing
  the target must be reachable
  the unbind page must be learned: no-such-word
  otherwise refuse nothing-to-unbind

## Bending the standard grammar. `light the lamp` is taken away from the
## standard lighting action and given to kindling, so the word is the
## only way to a flame. The plainer synonyms live in a file of their own.

remove from action lighting
  light the target

extend action kindling
  grammar
    light the target

import "synonyms"

## A word everybody here knows and nobody here can cast.

define action blessing
  grammar
    gnusto
    say gnusto
    gnusto the target
  refuse when the tower bell is tolling: gnusto-drowned
  phrase gnusto-said

## What Ansel can call to mind, by subject.

define action remembering
  grammar
    remember the subject
    recall the subject
  the subject is a topic
  about "dimming":
    phrase remember-dimming
  about "gnusto":
    phrase remember-gnusto
  about Hobb:
    phrase remember-hobb
  otherwise refuse remember-nothing

## The shutters. A machine is the story's own: it names the things it
## watches as roles, and moves from state to state as they are worked.

define machine shutter-gear
  role crank is the shutter crank
  starts shut

  state shut
    when turning the crank: half

  state half
    on enter
      phrase shutters-shift
    end on
    when turning the crank while the lens is in the Great Lantern: drawn
    when pushing the crank: shut
    on exit
      phrase gear-ticks
    end on

  state drawn, terminal
    on enter
      change the shutter to drawn
      phrase shutters-open
    end on
end machine

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
  at turn 100
    phrase light-turning
  60 turns later
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
  crossing - The Crossing
    begins when the story becomes awake
end chapters

story
  title: The Relighting
  id: relighting
  ifid: C24E29F8-C36B-4F55-9FE9-B6D75AE7133D
  story-version: 1.0.0
  publish-source: yes
  client: browser
  themes: paper, modern-dark
  default-theme: paper
  storage-prefix: relighting
  states: asleep, waking, awake
  use scoring
    rank "Latecomer" at 0
    rank "Second-Year" at 10
    rank "Journeyman" at 30
    rank "Lamplighter" at 50
  use chapters
  use expanses
  use sailing

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

  when waking expires
    change the tower bell to tolling
    change Hobb to roused
    phrase hobb-wakes
    change the player to Hobb
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
  north is blocked while Hobb is roused: hobb-stays-put

  room name:
    The Porter's Lodge

  The porter's lodge is one small room built into the thickness of the
  gate arch. A chair, a kettle and thirty years of newspapers have filled
  most of it. On the sill a lamp is burning with a steady blue flame, and
  an oak press hangs on the wall beside it. The door to the court is
  north. {hobb-in-doorway}

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
  north to the Water Stair
  north is blocked while the story is not awake: water-gate-shut

  Low vaults on squat pillars, running off under the whole of the hall.
  The air is cold and smells of stone. The steps go back up.

create the Bell Stair, a room
  in the Hall
  up to the Lantern Gallery
  up is blocked while the iron grille is standing: stair-sealed
  up is blocked while Ansel has the lens: lens-too-wide

  The foot of the tower. A stair winds up around the well where the bell
  rope hangs. The cloister is south. {grille-across}

create the Lantern Gallery, a room
  in the Hall
  east is deadly: over-the-parapet

  The roof of the tower, open on every side. The Great Lantern stands in
  the middle of it on a stone drum, taller than you are, its glass
  thirty years dirty. To the east a low parapet is all there is between
  you and the court. The stair goes back down.

## The Mere, behind the Hall. An expanse is open water with rooms at
## fixed places on it; a vehicle crosses it by heading and by wind.

create the Mere
  aka water, lake
  an expanse
  size: 8 by 6
  wind: from west

  Grey water, wider than it looked from the roof, with a short chop on
  it.

  landmarks
    the Water Stair: 0, 2
    the Beacon Isle: 6, 2
  end landmarks

create the Water Stair, a room
  seen from afar: a dark arch at the foot of the Hall, with steps in it
  sight: 4

  Six steps going down into the Mere under an arch, and an iron ring in
  the wall for a boat. The white bar of the Lantern passes overhead and
  out across the water. The Undercroft is back to the south.

create the Beacon Isle, a room
  seen from afar: a hump of rock with a stone basket on a pole

  A rock the size of the refectory, with one thorn tree and the beacon.
  The Hall is a lit window on the far shore.

create the skiff
  aka boat, heron
  a vehicle
  in the Mere at 0, 2
  movement: open
  carries: in
  drive: player
  commands: naval, compass
  stride: 1 unit
  sight: 5
  seen from afar: a small boat with a patched brown sail
  sails: furled, full
  sails start: furled

  A clinker skiff with one mast and one sail, both older than you are.
  Somebody has kept her tarred, and painted HERON on her transom.

  sailing
    0 to 44 degrees: furled stopped, full stopped
    45 to 119 degrees: furled stopped, full 2 turns
    120 to 180 degrees: furled stopped, full 1 turn
    calm: stopped
  end sailing

  on every turn while the skiff is within 2 of the Beacon Isle, once
    phrase beacon-near
  end on

  after the player entering
    play ambient lapping
  end after

  after the player exiting
    stop ambient
  end after

create the beacon
  aka basket, cresset
  a thing, scenery, light-source, starts unlit, wick
  in the Beacon Isle
  score answered worth 5

  An iron basket on a pole, packed with pitch-pine that has had thirty
  years to dry.

  after the player kindling
    award answered
    hide image
    win beacon-lit
  end after

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

  after the player examining
    move the hush page to Hobb when Hobb is roused
    phrase hobb-finds-page when Hobb is roused
    change the player to Ansel when Hobb is roused
    phrase ansel-again when Hobb is roused
    change Hobb to settled when Hobb is roused
  end after

create the kettle
  a thing
  in the Lodge

  A black iron kettle, still warm.

  on the player taking while Hobb is here and Hobb is not roused
    refuse kettle-is-hobbs
  end on

create the hand lamp
  a thing, light-source, starts unlit, wick
  in the Lodge

  A tin hand lamp with a wire handle. Its wick is dry and its glass is
  clean, which is Hobb all over.

  phrase detail while the hand lamp is lit:
    It is burning with a small flame, and the flame is blue.

  after the player kindling, once
    move the wisp here
    phrase wisp-arrives
  end after

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

  on every turn while the oak press is open and the library key is not in the oak press
    Hobb closes the oak press
  end on

create the library key
  a thing
  in the oak press

  A long key with a book cut into its bow.

create the spectacles
  aka glasses
  a thing, plural, concealed, wearable, mendable
  in the Lodge

  Wire spectacles. Hobb has been looking for them since the spring.

  phrase detail while the spectacles is cracked:
    One arm has come away, and is held on with a turn of thread.

  phrase detail while the spectacles is sound:
    Both arms are sound.

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
  a container, scenery, light-source, starts unlit, lens-seat, wick
  in the Lantern Gallery
  holds 1
  score relit worth 10

  A drum of brass and glass the height of a door, with a seat inside it
  for a lens and a wick as thick as your arm. Nothing has burned in it
  for thirty years.

  after the player kindling
    lose lens-shatters when not lantern-ready
    change the story to awake when lantern-ready
    award relit when lantern-ready
    phrase lantern-lit when lantern-ready
    show image lantern-lit-picture when lantern-ready
  end after

create the shutter
  aka shutters, leaves
  a thing, scenery
  in the Lantern Gallery
  states: closed-round, drawn

  A shutter of brass leaves that closes round the Lantern like a bud,
  worked by a crank on the drum.

  phrase detail while the shutter is closed-round:
    The leaves are shut, and green where they overlap.

  phrase detail while the shutter is drawn:
    The leaves are folded back all the way round.

create the shutter crank
  aka crank, handle
  a thing, scenery
  in the Lantern Gallery

  An iron crank on the side of the drum, with a wooden grip worn to the
  shape of a hand that is not yours.

create the candles
  aka prickets
  a thing, scenery, plural, light-source, starts unlit, wick
  in the Refectory
  score supper-lit worth 5

  Stubs of tallow in iron prickets down the middle of each table.

  after the player kindling
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
  a thing, scenery, ward
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

  after Tamsin Vey pushing
    play sound prising
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
        emit relighting-working-learned with working "kindle" and gloss "wakes a flame"
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
  states: faded, legible, learned

  A leaf of the grimoire, folded once and gone brown along the fold,
  as paper does when it has been kept inside a newspaper.

  on the player reading
    refuse when the hush page is faded: page-blank
    select on the hush page's state
      when legible
        change the hush page to learned
        raise workings by 1
        emit relighting-working-learned with working "hush" and gloss "quiets a thing"
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
        emit relighting-working-learned with working "mend" and gloss "makes a broken thing whole"
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

  A leaf of the grimoire with a boot print on one corner. Somebody has
  carried it about in a pocket with a pry bar.

  on the player reading
    refuse when the unbind page is faded: page-blank
    select on the unbind page's state
      when legible
        change the unbind page to learned
        raise workings by 1
        emit relighting-working-learned with working "unbind" and gloss "releases a ward"
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
  a thing, scenery, hushable
  in the Bell Stair
  states: unrung, tolling, silent

  You cannot see the bell from here, only the dark it hangs in.

  after the player examining
    phrase bell-count with count = tolls when the tower bell is tolling
  end after

create the book hoist
  aka hoist, cage, lift
  a vehicle
  in the Undercroft
  movement: line
  carries: in
  drive: state
  stops: the Undercroft, the Library, the Lantern Gallery
  direction: both

  A wicker cage on a rope, in a shaft that goes up through the Library
  floor and on into the tower. It was made to take books to whoever
  wanted them, and it has never needed telling where that was.

  position
    when the book hoist holds the lens and the iron grille is lifted: the Lantern Gallery
    when the book hoist holds the lens: the Library
    otherwise: the Undercroft
  end position

create the crate
  a container, openable, starts closed
  in the Undercroft
  holds 1

  A deal crate packed with straw, stencilled FRAGILE on every face.

create the lens
  a thing, mendable
  in the crate

  A disc of glass as wide as a cartwheel, ground in rings.

  phrase mended:
    You say the word and mean it. The crack closes from both edges at
    once, like a mouth deciding not to speak.

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
  playable
  pronouns he
  in the Lodge
  states: dozing, roused, settled
  mood calm
  feels wary of Ansel
  knows night, told, certain, confided
  never betrays a confidence
  temperament love over duty

  on every turn while the tower bell is tolling
    change mood to rattled
  end on

  on every turn while Hobb wears the spectacles, once
    change feeling toward Ansel to trusts
  end on

  The porter of Lanternhall, who was old when you were a student and has
  not troubled to change since.

create Tamsin Vey
  aka salvager, woman
  a person, proper, passive with announces-movement true
  pronouns she
  in the Refectory
  carries the unbind page
  states: free, bound
  mood suspicious
  feels wary of Ansel

  A broad woman in a leather apron, with a pry bar through her belt and
  brass filings in the creases of her hands. She has the look of someone
  adding you up.

  after the player examining
    phrase own-business with who = Tamsin Vey
  end after

  goal the-grille, high
    active when the tower bell is tolling
    move to the Bell Stair
    say tamsin-at-the-grille
    push the iron grille
    act tamsin-tries-the-bar
  end goal

  goal rounds, low
    wait for Ansel is in the Refectory
    act tamsin-sorts
    move to the Cloister
    act tamsin-measures
    move to the Refectory
  end goal

create the wisp
  aka light, spark
  a person, follower, listener
  pronouns it

  A scrap of light the size of a thumbnail, the same blue as the lamp
  flame. It keeps a little behind your shoulder, where a dog would.

  after hearing the tolling, once
    phrase wisp-flinches
  end after

## What Hobb will say, and how he says it.

define greetings for Hobb
  first time:
    phrase hobb-greets
  on return:
    phrase hobb-greets-again
end greetings

define manner for Hobb
  when Hobb is calm:
    beat "He turns the kettle a quarter round on its hook, to no purpose."
    beat "He looks at the blue flame on the sill before he answers."
    beat "He takes his time, of which he has had a great deal."
  when Hobb is rattled:
    beat "He takes one hand off one ear to hear you, and puts it back."
end manner

define topics for Hobb
  about "dimming":
    phrase hobb-on-dimming
  about "lantern", "great lantern", "light":
    phrase hobb-on-lantern
  about "tamsin", "tamsin vey", "vey", "salvager":
    phrase hobb-on-tamsin
  about "gnusto":
    phrase hobb-on-gnusto
  about "night", "last night", "that night", "master":
    phrase hobb-on-last-night when dimming was discussed
  about "spectacles", "glasses", "eyes":
    phrase hobb-on-spectacles
  about the kettle:
    phrase hobb-on-kettle
  about "bell", "tolling", "noise":
    refuse when the tower bell is unrung: hobb-what-bell
    phrase hobb-on-bell
    Hobb gives the hush page to Ansel when Hobb has the hush page
end topics

## Tamsin Vey answers three questions, shortly.

define topics for Tamsin Vey
  about "brass", "salvage", "hinges":
    phrase tamsin-on-brass when asked once
    phrase tamsin-on-brass-again when asked again
    phrase tamsin-on-brass-enough when asked many times
  about "brackets", "door furniture":
    deflect to "brass"
  about "price", "bargain":
    refuse when Tamsin Vey is bound: tamsin-already-dealt
    refuse when the-bargain is not concluded: tamsin-no-price-yet
    phrase tamsin-names-price
    then asks the-price
  about "hobb", "porter":
    phrase tamsin-on-hobb
  about "magic", "craft":
    phrase tamsin-on-magic when Tamsin Vey feels wary of Ansel
    phrase tamsin-on-magic-warmer when Tamsin Vey feels likes toward Ansel
end topics

define greetings for Tamsin Vey
  first time:
    phrase tamsin-greets
  on return:
    phrase tamsin-greets-again
end greetings

## The bargain: a thread that runs beat by beat to a question, and the
## question, which has its own answers.

define conversation the-bargain for Tamsin Vey
  about "page", "grille", "stair", "ward"
  beat:
    phrase tamsin-has-it
  beat:
    phrase tamsin-names-price
    then asks the-price
  on parting:
    phrase tamsin-parting
  on resuming:
    phrase tamsin-resuming
  conclusion:
    phrase tamsin-settled
end conversation

define exchange the-price for Tamsin Vey
  answer "yes", "agreed", "done", "you have my word":
    phrase tamsin-shakes
    change Tamsin Vey to bound
    change feeling toward Ansel to likes
    Tamsin Vey gives the unbind page to Ansel
  answer "no", "never":
    phrase tamsin-shrugs
end exchange

define initiative for Tamsin Vey
  on silence, when Tamsin Vey is free:
    phrase tamsin-fills-silence
end initiative

## A book answers too, for a reader who looks things up in it.

define topics for the grimoire
  about "gnusto":
    phrase grimoire-on-gnusto
  about "kindle", "kindling", "flame":
    phrase grimoire-on-kindle
end topics

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
  lens-too-wide:
    The lens is as wide as a cartwheel and the stair is as wide as a
    student. One of you is not going up this way.
  lantern-shuttered:
    The shutters are closed round it. A flame in there would light the
    inside of a brass bud, and nothing else.
  shutters-shift:
    Something inside the drum takes up the slack. The leaves of the
    shutter part by a hand's breadth all the way round, and stop.
  gear-ticks:
    The pawl ticks over one tooth.
  shutters-open:
    The crank runs free, and the shutters fold back all the way round,
    like a flower that has made up its mind.
  hobb-wakes:
    In the lodge, an old man who was not asleep opens his eyes.

    You are Hobb, and that is the bell. It has not rung since the night
    you stopped it. There was a word for stopping it, and you wrote the
    word down, because you knew you would not keep it in your head, and
    you put the paper somewhere safe.
  hobb-stays-put:
    Not with that going on. And not until you have found the thing.
  hobb-finds-page:
    You lift the pile, which your back will mention later, and take out
    the bottom paper. The leaf is still folded inside it where you put
    it the morning after. You keep it in your hand for whoever comes
    asking. They will come asking. They always wanted telling twice.
  ansel-again:
    You are Ansel, and wherever you are standing, the bell is louder
    there.
  hobb-greets:
    "It's you," says Hobb. He does not say which you.
  hobb-greets-again:
    "Still here," says Hobb, of one of you.
  hobb-on-dimming:
    "Went out like a pipe," says Hobb. "No bang. The Master stood in the
    court with his hand up for an hour and nothing came to it."
  hobb-on-lantern:
    "Needs a lens, a flame and somebody with the word. I have none of the
    three and you have, so far as I can see, a coat."
  hobb-on-tamsin:
    "Vey? Takes the brass and leaves the hinges. I let her. Brass doesn't
    keep the rain out." He considers. "Her word's good. It's all of her
    that is."
  hobb-on-gnusto:
    "It's what you say," says Hobb. "The Master held it meant something
    once, somewhere else. Came over the water with people from a country
    that kept half of itself underground. He never found out what it
    did, and he looked."
  hobb-on-kettle:
    "Mine," says Hobb.
  hobb-what-bell:
    "Bell hasn't rung in thirty years," says Hobb. "Ask me again when it
    does."
  hobb-on-bell:
    "It'll go on till it's told," Hobb shouts. "There's a word for the
    telling. I kept it by, in a newspaper, in case."
  tamsin-on-brass:
    "Door furniture, mostly. Lamp brackets. Nobody was using them."
  tamsin-on-brass-again:
    "Brass. It is yellow and it sells. I said."
  tamsin-on-brass-enough:
    Tamsin Vey weighs a hinge in her hand, and then you, and says
    nothing about brass.
  hobb-on-spectacles:
    "Lost them in the spring," says Hobb. "Since then a face is a face.
    There are things I was told that I don't tell to a face."
  tamsin-on-magic-warmer:
    "I'll tell you what I never told the old man. The night it went
    out, my mother's scales would not weigh true, and she laughed. She
    said it was the first honest day's trade she ever did." Tamsin Vey
    looks at the page in your hand. "Light your lamp. I would like to
    see if she was right."
  hobb-on-last-night:
    Hobb is quiet for some time. "Somebody had to put the Lantern out,"
    he says. "It was guttering. The Master said a dead light was worse
    than none. He didn't say who." He looks at his hands.
  tamsin-greets:
    "You'll be the one the old man let in," says Tamsin Vey. "I came in
    by a window, myself."
  tamsin-greets-again:
    Tamsin Vey nods, as one tradesman to another.
  tamsin-has-it:
    "I have a page that came out of a wall with a bracket," says Tamsin
    Vey. "It was blank on Tuesday. It is not blank now. I am told that is
    your sort of thing."
  tamsin-names-price:
    "Here is my price. Lantern lit or Lantern dark, the brass in the
    closed wings stays mine to take. Your word on it. Yes or no?"
  tamsin-parting:
    "The page will keep," says Tamsin Vey. "So will I."
  tamsin-resuming:
    "The page. Yes. I thought we would come back to it."
  tamsin-settled:
    "That is the page dealt with," says Tamsin Vey, "one way or the
    other."
  tamsin-already-dealt:
    "We have dealt, you and I. I don't sell a thing twice."
  tamsin-no-price-yet:
    "A price for what? You haven't said what you want."
  tamsin-shakes:
    She spits on her palm, thinks better of it, and holds out the page
    instead. "Done is done. I have never gone back on one yet."
  tamsin-shrugs:
    "Then I have a page and you have a grille." She does not sound
    offended. "Ask me the price again when the stair matters more."
  tamsin-fills-silence:
    Tamsin Vey sorts hinges into sizes while she waits for you to say
    something. There are more sizes than you would have thought.
  tamsin-on-hobb:
    "He pretends not to see me and I pretend to be quiet. It has worked
    for eleven years."
  tamsin-on-magic:
    "My mother kept a stall by this gate. The day it went out, so did the
    custom. Now you tell me it's coming back, and I am to be glad." She
    is not, particularly.
  grimoire-on-gnusto:
    You turn to the margin again. The note is all there is: came over
    the water as a working, meaning lost. Whoever wrote it underlined
    "lost" twice.
  grimoire-on-kindle:
    The book falls open where the loose leaf came from. The stub of the
    page is there, and nothing is written on the stub.
  wisp-flinches:
    Somewhere in the Hall a small blue light goes flat and dim at the
    first stroke, like a flame in a draught, and creeps back to its size.
  wisp-arrives:
    Something small and blue comes loose from the flame and hangs in the
    air beside it, undecided. Then it decides.
  own-business:
    {the who} does not stop for you. {capitalize pronoun:subject} has
    {pronoun:possessive} own day to get through.
  tamsin-at-the-grille:
    Tamsin Vey runs a thumb down one bar of the grille and looks at the
    thumb. "That," she says, "was not here on Tuesday."
  tamsin-tries-the-bar:
    Tamsin Vey sets her pry bar to the foot of the grille and leans. The
    bar bends. The grille does not notice.
  tamsin-measures:
    Tamsin Vey lays her pry bar along a lamp bracket, as a tailor lays a
    tape, and moves her lips.
  tamsin-sorts:
    Tamsin Vey turns over a heap of door furniture on the end of a
    table, and puts two hinges in her apron.
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
    white bar. Down in the Hall, every blank page begins to fill, and
    something heavy that has been shut for thirty years grinds open
    under the floor.

    The bar sweeps the water behind the Hall, and on the far side of it
    nothing answers. There was always a second light. The founders did
    not write that over the gate.
  water-gate-shut:
    There is an iron water gate in the north wall, shut, with the weed
    of thirty years dried onto it.
  beacon-near:
    The rock comes up out of the dusk ahead, and on it a pole with a
    basket at the top, black against the last of the sky.
  beacon-lit:
    You say the word across six feet of air, and the pitch-pine takes
    it. Behind you, over the water, the white bar of the Lantern swings
    round and stops, pointing here. The two lights hold one another.
    Somewhere between them the Mere is full of small blue sparks, coming
    home.
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
  working-wants-a-thing:
    A working is said to something. You say it to the air, and the air
    has heard it all before.
  already-burning:
    It is burning already, and the word slides off it.
  kindled:
    You say the word. A flame stands up on the wick, blue at first, as
    if it had been waiting there with its coat on.
  light-needs-the-word:
    You have no match, and you did not walk here for three days to use
    one. There is a word for this.
  already-whole:
    It is sound. The word looks it over and finds nothing to do.
  already-quiet:
    It is making no sound. There is nothing in it to hush.
  bell-hushed:
    You say the word up into the dark of the tower. The bell swings
    twice more without a sound, and hangs still.
  ward-asleep:
    The word goes into the iron and nothing in the iron is awake to
    hear it.
  ward-in-the-bell:
    The word goes into the iron and comes back out on the next stroke of
    the bell. Whatever holds the grille is being rung into it.
  ward-lifts:
    You say the word. The grille is not there, in the manner of a thing
    that was never there, and the stair goes up.
  nothing-to-kindle:
    There is nothing in that for a flame to stand on.
  nothing-to-mend:
    That was never one thing to begin with.
  nothing-to-hush:
    That is making no noise you could quiet.
  nothing-to-unbind:
    Nothing holds that but its own weight.
  gnusto-said:
    "Gnusto," you say, as everybody does, and the morning is exactly as
    bright as it was. It is a word about sunlight. The scholars here
    always said it had been a working once, somewhere over the water,
    and could never say what it did.
  gnusto-drowned:
    You say it, and the bell says something louder.
  remember-dimming:
    You remember it as a night when every lamp in the Hall went out at
    once, and a morning when nobody could make one light.
  remember-gnusto:
    Your mother said it when she opened the shutters. Everybody's did.
  remember-hobb:
    He confiscated a kettle from you in your second week. You have a
    feeling it is the same kettle.
  remember-nothing:
    Nothing comes. Thirty years is a long time.
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
    takes it. For the first time in thirty years the refectory looks
    like a place where somebody might be late for supper.

before the game starts
  change the player to Ansel
end before
