## Chord 4.0.2 lexer-golden corpus — the 4.0 block openers and the trait
## words: an expanse with a `landmarks` block, a sailing vehicle with a
## `sailing` table, a line vehicle with a `position` block, a `passage`
## block, a `pushing` block, `servings <n>`, the ADR-392 trait words
## (`wearable on the <part>`, `opens when unlocked`, `closes when switched
## off`, `smelly`, `loud`), a story trait read after `is a` (ADR-394), a
## name carrying `&` (GH #361). The `claims` block is in
## `chord-4-claims.chord`, because a claims block is never part of a story.
## Every spelling is lifted from the sharpee.net guide fences or, for the
## trait words, from `adr-392-trait-words.test.ts`. Edit only alongside the
## golden file.

story
  title: Chord 4 Surface
  authors:
    Lexer Golden
  id: lexer-golden-chord-4
  story-version: 4.0.2
  use scoring
  use expanses
  use sailing

create the Sargasso
  an expanse
  size: 40 by 40
  wind: from northeast
  north is blocked: ice-fields

  Weed-choked water under a sky the colour of pewter.

  landmarks
    Port Royal: 3, 4
    the Reef: 12, 30
  end landmarks

create Port Royal
  a room
  seen from afar: a smudge of smoke over a low green shore
  sight: 20

  The quay.

create the Reef
  a room
  seen from afar: a line of white where the swell breaks

  Coral under a foot of water.

create the Marigold
  a vehicle
  in the Sargasso at 20, 20
  movement: open
  carries: in
  drive: player
  commands: naval
  stride: 1 unit
  sight: 8
  seen from afar: three masts leaning to the wind
  sails: furled, reefed, full
  sails start: furled

  A barque.

  sailing
    0 to 44 degrees: furled stopped, reefed stopped, full stopped
    45 to 74 degrees: furled stopped, reefed 6 turns, full 4 turns
    75 to 119 degrees: furled stopped, reefed 3 turns, full 2 turns
    120 to 180 degrees: furled 6 turns, reefed 2 turns, full 1 turn
    calm: stopped
  end sailing

create the Well Bottom
  a room
  up to the Top of the Well

  The bottom of a dry well. A bucket hangs here on a rope.

create the Top of the Well
  a room

  The top of the well, open to the sky.

create the water
  a thing
  in the Well Bottom

  A pool of clear water.

create the bucket
  a vehicle
  in the Well Bottom
  movement: line
  carries: in
  drive: state
  stops: the Well Bottom, the Top of the Well
  direction: both
  holds 3

  A wooden bucket on a rope, big enough to stand in.

  position
    when the bucket holds the water: the Top of the Well
    otherwise: the Well Bottom
  end position

create the Cable Trench
  a room, dark
  up to the Loading Dock

  passage to the Sorting Room
    grammar
      follow the cables
      crawl along the cables
  end passage

  A trench under the dock floor. Lit, the cables can be seen running
  off toward the sorting machine.

create the Sorting Room
  a room
  east to the Loading Dock admits pushing

  The sorting machine fills the room.

create the Loading Dock
  a room

  A concrete dock.

create the mail trolley
  a thing, pushable
  in the Sorting Room

  A wire trolley.

  pushing
    between the Sorting Room and the Loading Dock
  end pushing

create the loaf
  a thing, edible
  servings 3
  in the Sorting Room

  A round loaf of bread.

create the Hall
  a room
  north to the Cellar through the cellar door

  A hall.

create the cellar door
  a door, lockable with the iron key
  opens when unlocked

  A door.

create the Cellar
  a room

  A cellar.

create the iron key
  a thing
  in the Hall

  A key.

create the display case
  a container, openable, switchable
  closes when switched off
  in the Hall

  A case.

create the ripe cheese
  a thing, edible, smelly
  in the Hall

  Cheese.

create the brass chime
  a thing, loud
  in the Cellar

  A chime.

create the cap
  a thing, wearable on the head
  in the Hall

  A cap.

create the glove
  a thing, wearable on the left hand
  in the Hall

  A glove.

create the Sandler & Sons
  a room

  A shop.

create the adder
  a thing, snake
  in the Hall

  An adder behind glass.

create Alex
  a person
  playable
  starts in the Hall

  You.

before the game starts
  change the player to Alex
end before

define trait snake
end trait

define action petting
  grammar
    pet the animal
    scratch the animal
    cuddle the animal
  the animal must be reachable
  score gentle-hands worth 5
  refuse without animal: pet-what
  refuse when the animal is a snake: glass-way
  otherwise refuse cant-pet
  award gentle-hands
  phrase petted

  phrases en-US
    pet-what:
      Pet what?
    glass-way:
      You settle for pressing a hand to the cool glass.
    cant-pet:
      {capitalize the animal} really is not the sort of thing you can pet.
    petted:
      You give a good long scritch.

define phrase ice-fields
  Ice closes the way north.
end phrase
