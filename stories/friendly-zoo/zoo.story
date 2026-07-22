story "Friendly Zoo" by "Sharpee Team"
  id: friendly-zoo
  version: 0.0.2
  blurb: A small family zoo — a testing target for the v2 platform.
  states: open, after-hours

create the Zoo Entrance
  a room
  aka entrance, gates, gate
  south to the Main Path

  first time
    Your family piles out of the car, buzzing with excitement — a
    whole day at the zoo! You straighten the strap of your backpack
    and take it all in. You stand before the wrought-iron gates of
    the Willowbrook Family Zoo. A cheerful welcome sign arches over
    the entrance, and a small ticket booth sits to one side. A
    sturdy iron fence runs along either side of the gates. The main
    path leads south into the zoo grounds.

  You stand before the wrought-iron gates of the Willowbrook Family Zoo.
  A cheerful welcome sign arches over the entrance, and a small ticket
  booth sits to one side. A sturdy iron fence runs along either side of
  the gates. The main path leads south into the zoo grounds.

create the Main Path
  a room
  aka path, gravel path
  east to the Petting Zoo
  west to the Aviary
  south to the Supply Room
  south is blocked while the staff gate is closed: staff-gate-blocked

  A wide gravel path winds through the heart of the zoo. Colorful
  direction signs point every which way. A park bench sits beside the
  path. To the east, the petting zoo. To the west, the aviary. A staff
  gate blocks the path to the south. The entrance is back to the north.

create the Petting Zoo
  a room
  aka petting area, pen
  score visit worth 5

  A cheerful open-air enclosure that smells of warm hay and fur. A feed
  dispenser is mounted on a post, and an info plaque is posted by the
  gate. The main path is back to the west.

  after entering it
    award visit
  end after

create the Aviary
  a room
  aka bird house, dome
  west to the Gift Shop
  score visit worth 5

  You step inside a soaring mesh dome. Brilliantly colored parrots
  chatter from rope perches, and a toucan eyes you curiously from a
  branch overhead. A small waterfall splashes into a stone basin. An
  info plaque hangs near the entrance. The gift shop is to the west. The
  main path is back to the east.

  after entering it
    award visit
  end after

  after entering it while not after-hours
    phrase parrot-notices
      The parrot ruffles its feathers and eyes you with interest.
  end after

  after entering it while after-hours
    phrase parrot-nods
      The parrot glances at you and nods, as if recognizing a fellow
      after-hours regular.
  end after

create the Supply Room
  a room
  aka storage room, storeroom
  south to the Nocturnal Animals Exhibit
  north is blocked while the staff gate is closed: staff-gate-blocked
  score visit worth 5

  A cluttered storage room behind the staff gate. Metal shelves line the
  walls. A cork board on the wall is covered with staff schedules. A
  battered radio sits on one of the shelves. The staff gate leads back
  north.

  after entering it
    award visit
  end after

create the Nocturnal Animals Exhibit
  a room, dark
  aka nocturnal exhibit, nocturnal animals, exhibit
  score visit worth 5

  A cool, dimly lit cavern designed to simulate nighttime. Glass
  enclosures line both walls with soft red lights. You can see sugar
  gliders, bush babies, and a barn owl. A warning sign is posted near
  the entrance. The exit leads back north to the supply room.

  after entering it
    award visit
  end after

create the Gift Shop
  a room
  aka shop, store
  score visit worth 5

  A small zoo gift shop crammed with stuffed animals and
  postcards{pins}. A large souvenir penny press machine stands near the
  door. A disposable camera sits on the counter. The aviary is back to
  the east.

  after entering it
    award visit
  end after

create the Staff Parking Lot
  a room

  A small staff parking lot beyond the zoo fence. Off limits to
  visitors.

create the player
  starts in the Zoo Entrance

  Just an ordinary visitor to the zoo.

create the staff keycard
  aka keycard, key card, card, key
  in the Zoo Entrance

  A white plastic keycard with "WILLOWBROOK ZOO — STAFF ONLY" printed in
  blue.

create the staff gate
  aka gate, metal gate, staff door
  scenery, openable, lockable with the staff keycard
  in the Main Path

  A sturdy metal gate with a "STAFF ONLY" sign.

  on examining it
    phrase gate-look
      A sturdy metal gate with a "STAFF ONLY" sign.
    phrase gate-status-closed when it is closed
      The staff gate is set into the fence.
    phrase gate-status-open when it is open
      The staff gate is set into the fence, standing wide open.
  end on

create the welcome sign
  aka sign
  scenery
  in the Zoo Entrance

  A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY
  ZOO."

create the ticket booth
  aka booth
  scenery
  in the Zoo Entrance

  A small wooden booth with a "Self-Guided Tours" sign.

create the iron fence
  aka fence, railing
  scenery
  in the Zoo Entrance

  A tall wrought-iron fence with animal silhouettes.

create the direction signs
  aka signs, arrow signs
  scenery, plural
  in the Main Path

  Arrow signs: PETTING ZOO (east), AVIARY (west), EXIT (north).

create the flower beds
  aka flowers
  scenery, plural
  in the Main Path

  Tidy beds of marigolds and petunias.

create the hay bale
  aka hay, bale
  scenery
  in the Petting Zoo

  A large round bale of golden hay.

create the toucan
  aka toco toucan
  scenery
  in the Aviary

  A Toco toucan with an enormous orange-and-black bill.

create the waterfall
  aka water, basin
  scenery
  in the Aviary

  A gentle artificial waterfall cascading into a stone basin.

create the rope perches
  aka perches, ropes
  scenery, plural
  in the Aviary

  Thick sisal ropes strung between wooden posts.

create the metal shelves
  aka shelves, shelf
  scenery, plural
  in the Supply Room

  Industrial metal shelving units stacked with supplies.

create the sugar gliders
  aka gliders
  scenery, plural
  in the Nocturnal Animals Exhibit

  A family of tiny sugar gliders with enormous dark eyes.

create the bush babies
  aka galagos
  scenery, plural
  in the Nocturnal Animals Exhibit

  Two bush babies with impossibly large round eyes.

create the barn owl
  aka owl
  scenery
  in the Nocturnal Animals Exhibit

  An enormous barn owl with a heart-shaped white face.

create the snake
  aka python, snake enclosure
  scenery
  in the Nocturnal Animals Exhibit
  score confession worth 5

  A thick-bodied python coiled behind glass, nearly invisible in the dim
  red light.

  on every turn while after-hours, once
    award confession
    phrase confession
      A soft, sibilant voice drifts from behind the glass of the snake
      enclosure. "Ssso... you're the one who stayed. Good. Do you know
      what it's like in here? They keep the lights on 'dim' and call it
      'nocturnal.' I haven't seen actual moonlight in three years.
      Three. Years."
  end on

create the stuffed animals
  aka plush, toys
  scenery, plural
  in the Gift Shop

  Shelves of plush tigers, pandas, and penguins.

create the postcards
  aka cards, postcard rack
  scenery, plural
  in the Gift Shop

  A spinning rack of postcards showing the zoo's greatest hits.

create the enamel pins
  aka pins, pin, rack, pin rack
  scenery, plural
  in the Gift Shop

  A spinning rack of enamel pins: parrots, pygmy goats, a grinning
  snake. Every one of them costs more than it should.

create the cork board
  aka board, notices
  scenery
  in the Supply Room

  A cork board with staff schedules. A note in red marker: "DON'T
  FORGET: nocturnal exhibit lights need new batteries!"

create the info plaque
  aka plaque, brass plaque
  scenery, readable
  in the Petting Zoo

  A brass plaque mounted on a wooden post near the petting zoo gate.

  on reading it
    phrase plaque-text
      PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and
      always hungry.

      HOLLAND LOP RABBITS — Known for their floppy ears. Our pair,
      Biscuit and Marmalade, were born here in 2023.
  end on

create the aviary plaque
  aka information board
  scenery, readable
  in the Aviary

  A colorful information board near the aviary entrance.

  on reading it
    phrase plaque-text
      WELCOME TO THE AVIARY — Home to over 30 species!

      TOCO TOUCAN — Its bill weighs less than a smartphone.

      SCARLET MACAW — Can live over 75 years. Our oldest, Captain, is
      42.
  end on

create the warning sign
  aka warning, yellow sign
  scenery, readable
  in the Supply Room

  A yellow warning sign near the nocturnal exhibit entrance.

  on reading it
    phrase sign-text
      CAUTION: The Nocturnal Animals Exhibit is kept dark. Please use a
      flashlight. Do NOT use camera flash. (We don't talk about the
      Great Owl Incident of 2022.)
  end on

create the zoo brochure
  aka brochure, pamphlet, leaflet
  readable
  in the Zoo Entrance
  score read worth 5

  A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.

  on reading it
    award read
    phrase brochure-text
  end on

create the zoo map
  aka map, folding map
  in the Zoo Entrance
  score collected worth 5

  A colorful folding map of the Willowbrook Family Zoo.

  after taking it
    award collected
  end after

create the backpack
  aka rucksack, pack
  a container
  in the Zoo Entrance

  A small red canvas backpack.

create the bag of animal feed
  aka feed, animal feed, bag of feed, corn
  in the Petting Zoo

  A small brown paper bag filled with dried corn and pellets.

create the souvenir penny
  aka penny, coin
  in the Main Path

  A shiny copper penny.

create the park bench
  aka bench, benches, seat
  scenery, a supporter with capacity 3
  in the Main Path

  A sturdy park bench painted forest green.

create the lunchbox
  aka lunch box, box
  a container, openable
  in the Main Path

  A dented metal lunchbox decorated with cartoon zoo animals.

create the juice box
  aka juice, drink
  in the lunchbox

  A small juice box with a picture of a happy elephant.

create the feed dispenser
  aka dispenser
  a container, openable, scenery
  in the Petting Zoo

  A coin-operated feed dispenser mounted on a wooden post. Sign: "FREE —
  Just Turn!"

create the souvenir press
  aka press, penny press, machine
  a container, scenery
  in the Gift Shop

  A heavy cast-iron machine with a big crank handle. A slot on top
  accepts pennies, and the mechanism stamps them with a zoo animal
  design. A sign reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"

create the flashlight
  aka torch, light, lamp
  light-source, switchable
  in the Supply Room

  A heavy-duty yellow flashlight.

  phrase detail while it is on:
    It clicks faintly as it powers up.

  phrase detail while it is lit:
    A thin beam plays across the floor.

create the radio
  aka portable radio
  scenery, switchable
  in the Supply Room

  A battered portable radio held together with duct tape. The antenna is
  bent at a jaunty angle. A faded sticker on the side reads "ZOO FM —
  All Animals, All The Time."

  phrase detail while it is on:
    It hums softly.

create the disposable camera
  aka camera
  in the Gift Shop

  A cheap yellow disposable camera with "ZOO MEMORIES" printed on the
  side.

define phrase pins, cycling
  and a spinning rack of enamel pins wobbles by the register
or
  and the enamel-pin rack stands picked half bare
or
  nothing
end phrase

define trait pettable
  phrases en-US
    petted:
      You pet the animal. It seems pleased.

  on petting it
    emit petted
    phrase petted
  end on
end trait

define trait feedable
  data
    food: entity
  states, reversible: hungry, content

  phrases en-US
    no-feed:
      You don't have any animal feed.
    already-fed:
      You've already fed them. They look contentedly full.
    fed:
      You offer some feed. The animal eats it gratefully.

  on feeding it
    the actor must have its food: no-feed
    it must be hungry: already-fed
    change it to content
    emit fed
    phrase fed
  end on
end trait

define trait chatty
  on every turn while one chance in 2
    phrase parrot-chatter
  end on
end trait

define trait candid
  on every turn while one chance in 2
    phrase parrot-candor
  end on
end trait

define trait restless
  phrases en-US
    bleating:
      The pygmy goats are bleating loudly and headbutting the fence.
      They seem very hungry!

  on every turn while it is hungry
    phrase bleating
  end on
end trait

define action petting
  grammar
    pet :animal
    stroke :animal
  the animal must be reachable
  refuse without animal: cant-pet
  otherwise refuse cant-pet

  phrases en-US
    cant-pet:
      You can't pet that.

define action feeding
  grammar
    feed :animal
  the animal must be reachable
  refuse without animal: not-an-animal
  otherwise refuse not-an-animal

  phrases en-US
    not-an-animal:
      That's not something you can feed.

define action photographing
  grammar
    photograph :target
    photo :target
    snap :target
  score snapshot worth 5
  the player must hold the disposable camera: no-camera
  award snapshot
  phrase took-photo

  phrases en-US
    no-camera:
      You don't have a camera. There's one in the gift shop.
    took-photo:
      Click! You snap a photo of {the target}. That one's going on the
      fridge.

create the zookeeper
  a person
  aka keeper, sam
  in the Main Path
  score farewell worth 5

  A friendly zookeeper in khaki overalls. A name tag reads "Sam."

  phrase present:
    Sam the zookeeper is here, jingling a ring of keys.

  on every turn while after-hours, once
    award farewell
    phrase departs
      The zookeeper glances at the clock, unclips the walkie-talkie from
      his belt, and stretches. "Well, that's me done for the day. Zoo's
      all yours, I guess!" He gives you a friendly wave and ambles off
      toward the staff parking lot. A moment later, you hear an engine
      start and fade into the distance.
    move it to the Staff Parking Lot
  end on

create the parrot
  a person
  aka macaw, scarlet macaw
  in the Aviary
  pettable
  chatty while not after-hours
  candid while after-hours
  score confession worth 5

  A magnificent scarlet macaw perched on a rope. It tilts its head and
  watches you with one bright eye.

  phrase petted:
    You reach toward the parrot. CHOMP! It nips your finger with its
    beak. "NO TOUCHING!" it squawks indignantly.
  phrase present:
    A scarlet macaw watches you with one bright, knowing eye.

  on examining it
    phrase parrot-look
      A magnificent scarlet macaw perched on a rope. It tilts its head
      and watches you with one bright eye.

      {flavor}{aside}
  end on

  on every turn while after-hours, once
    award confession
    phrase confession
      The parrot clears its throat — actually clears its throat — and
      fixes you with a knowing look. "Right then. Now that the
      performative squawking is over, let me tell you something: that
      toucan? Complete fraud. Can't even crack a nut properly. And don't
      get me started on the gift shop markup."
  end on

create the pygmy goats
  aka goats, goat
  scenery, plural
  in the Petting Zoo
  pettable
  feedable with food the bag of animal feed
  restless
  score fed worth 10
  score confession worth 5

  Three pygmy goats hoping you have food.

  phrase petted:
    You reach down and pet the nearest goat. It leans into your hand and
    bleats happily. The others crowd around, demanding equal attention.
  phrase fed:
    You scatter some feed on the ground. The pygmy goats rush over,
    bleating excitedly, and devour the corn and pellets in seconds. The
    smallest goat looks up at you with big grateful eyes.
  phrase present:
    Three pygmy goats mill about hopefully, eyeing your pockets for
    snacks.

  after feeding it
    award fed
  end after

  on every turn while after-hours, once
    award confession
    phrase confession
      Now that the keeper is gone, the goats exchange glances. The
      largest one turns to you and bleats in a very deliberate pattern.
      You could swear it sounds like: "Finally. Do you have any idea
      what it's like being called 'cute' six hundred times a day? We are
      MAJESTIC."
  end on

create the rabbits
  aka rabbit, bunnies
  scenery, plural
  in the Petting Zoo
  pettable
  feedable with food the bag of animal feed
  score fed worth 10
  score confession worth 5

  A pair of Holland Lop rabbits with floppy ears.

  phrase petted:
    You gently stroke one of the rabbits. Its fur is incredibly soft. It
    twitches its nose at you contentedly.
  phrase fed:
    You sprinkle some pellets near the rabbits. Biscuit and Marmalade
    hop over cautiously, then munch away happily.
  phrase present:
    A pair of Holland Lop rabbits lounges near the hay bale, ears
    flopped.

  after feeding it
    award fed
  end after

  on every turn while after-hours, once
    award confession
    phrase confession
      The rabbits stop mid-hop and look at each other. Biscuit twitches
      her nose disapprovingly. Marmalade thumps his foot twice. You get
      the distinct impression they're critiquing the quality of today's
      pellets. "Barely adequate," the thumping seems to say. "Last
      Tuesday's batch was far superior."
  end on

create the parrots
  aka macaws, birds
  scenery, plural
  in the Aviary

  A raucous flock of scarlet macaws and grey African parrots.

define sequence closing time
  at turn 5
    phrase zoo-pa-closing-3
      *DING DONG* "Attention visitors! The Willowbrook Family Zoo will
      be closing in three hours. Please make sure to visit all exhibits
      before closing time!"
  5 turns later
    phrase zoo-pa-closing-2
      *DING DONG* "Attention visitors! Two hours until closing. Don't
      forget to stop by the gift shop for souvenirs!"
  5 turns later
    phrase zoo-pa-closing-1
      *DING DONG* "Attention visitors! One hour until closing. Please
      begin making your way toward the exit."
  5 turns later
    phrase zoo-pa-closed
      *DING DONG* "The Willowbrook Family Zoo is now closed. Thank you
      for visiting! We hope to see you again soon!"
    change the story to after-hours
end sequence

define sequence feeding time
  at turn 11
    change the pygmy goats to hungry
    phrase zoo-feeding-time-announced
      *DING DONG* "It's FEEDING TIME at the Petting Zoo! Come watch our
      pygmy goats and rabbits enjoy their favorite snacks!"
  8 turns later
    change the pygmy goats to hungry
    phrase zoo-feeding-time-announced
  8 turns later
    change the pygmy goats to hungry
    phrase zoo-feeding-time-announced
  8 turns later
    change the pygmy goats to hungry
    phrase zoo-feeding-time-announced
end sequence

define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
or
  Who's a good bird? WHO'S A GOOD BIRD?
or
  BAWK! Welcome to the zoo!
end phrase

define phrase parrot-candor, randomly
  Finally, they're gone. Do you know how exhausting it is to say "Polly
  wants a cracker" eight hours a day?
or
  Between you and me, the toucan is a complete diva. Won't shut up about
  its bill.
or
  I have a degree in ornithology, you know. Well, I would, if birds
  could enroll.
or
  The gift shop markup is criminal. Three dollars for a postcard? In
  this economy?
or
  You seem alright. Most visitors just want selfies. At least you're
  still here.
end phrase

define phrase brochure-text, verbatim
  WILLOWBROOK FAMILY ZOO — Your Guide

  EXHIBITS:
    Petting Zoo — East from Main Path
    Aviary — West from Main Path
    Gift Shop — West from Aviary
    Nocturnal Animals — Staff Area

  "Where every visit is a wild adventure!"
end phrase

define phrases en-US
  staff-gate-blocked:
    The staff gate is closed.
  victory:
    Congratulations! You've earned your MASTER ZOOKEEPER badge! You've
    visited every exhibit, befriended the animals, collected souvenirs,
    and even stayed after hours to hear what the animals really think.
    The Willowbrook Family Zoo will never forget you!

    *** You have won ***

define text flavor from "./chord-extras.ts"
define text aside from "./chord-extras.ts"
