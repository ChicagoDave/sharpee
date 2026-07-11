story "Friendly Zoo" by "Sharpee Team"
  id: friendly-zoo
  version: 0.0.1
  blurb: A small family zoo — a workspace testing target for the v2 platform.

define flag after-hours starts false
define flag feeding-time-active starts false
define flag gate-closed starts true

create the Zoo Entrance
  a room
  aka entrance, gates, gate
  south to the Main Path

  You stand before the wrought-iron gates of the Willowbrook Family Zoo. A
  cheerful welcome sign arches over the entrance, and a small ticket booth
  sits to one side. A sturdy iron fence runs along either side of the gates.
  The main path leads south into the zoo grounds.

create the Main Path
  a room
  aka path, gravel path
  east to the Petting Zoo
  west to the Aviary
  south to the Supply Room
  south is blocked while gate-closed: staff-gate-blocked

  A wide gravel path winds through the heart of the zoo. Colorful direction
  signs point every which way. A park bench sits beside the path. To the
  east, the petting zoo. To the west, the aviary. A staff gate blocks the
  path to the south. The entrance is back to the north.

create the Petting Zoo
  a room
  aka petting area, pen

  A cheerful open-air enclosure that smells of warm hay and fur. A feed
  dispenser is mounted on a post, and an info plaque is posted by the gate.
  The main path is back to the west.

create the Aviary
  a room
  aka bird house, dome
  west to the Gift Shop

  You step inside a soaring mesh dome. Brilliantly colored parrots chatter
  from rope perches, and a toucan eyes you curiously from a branch overhead.
  A small waterfall splashes into a stone basin. An info plaque hangs near
  the entrance. The gift shop is to the west. The main path is back to the
  east.

create the Supply Room
  a room
  aka storage room, storeroom
  south to the Nocturnal Animals Exhibit
  north is blocked while gate-closed: staff-gate-blocked

  A cluttered storage room behind the staff gate. Metal shelves line the
  walls. A cork board on the wall is covered with staff schedules. A
  battered radio sits on one of the shelves. The staff gate leads back
  north.

create the Nocturnal Animals Exhibit
  a room, dark
  aka nocturnal exhibit, nocturnal animals, exhibit

  A cool, dimly lit cavern designed to simulate nighttime. Glass enclosures
  line both walls with soft red lights. You can see sugar gliders, bush
  babies, and a barn owl. A warning sign is posted near the entrance. The
  exit leads back north to the supply room.

create the Gift Shop
  a room
  aka shop, store

  A small zoo gift shop crammed with stuffed animals and postcards. A large
  souvenir penny press machine stands near the door. A disposable camera
  sits on the counter. The aviary is back to the east.

create the Staff Parking Lot
  a room

  A small staff parking lot beyond the zoo fence. Off limits to visitors.

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
  scenery, openable, lockable with key the staff keycard
  in the Main Path

  A sturdy metal gate with a "STAFF ONLY" sign.

  on opening it
    set gate-closed to false
  end on

  on closing it
    set gate-closed to true
  end on

create the welcome sign
  aka sign
  scenery
  in the Zoo Entrance

  A brightly painted wooden sign reads: "WELCOME TO WILLOWBROOK FAMILY ZOO."

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

  A spinning rack of enamel pins: parrots, pygmy goats, a grinning snake.
  Every one of them costs more than it should.

create the cork board
  aka board, notices
  scenery
  in the Supply Room

  A cork board with staff schedules. A note in red marker: "DON'T FORGET:
  nocturnal exhibit lights need new batteries!"

create the info plaque
  aka plaque, brass plaque
  scenery, readable
  in the Petting Zoo

  A brass plaque mounted on a wooden post near the petting zoo gate.

  on reading it
    phrase info-plaque-text
  end on

create the aviary plaque
  aka information board
  scenery, readable
  in the Aviary

  A colorful information board near the aviary entrance.

  on reading it
    phrase aviary-plaque-text
  end on

create the warning sign
  aka warning, yellow sign
  scenery, readable
  in the Supply Room

  A yellow warning sign near the nocturnal exhibit entrance.

  on reading it
    phrase warning-sign-text
  end on

create the zoo brochure
  aka brochure, pamphlet, leaflet
  readable
  in the Zoo Entrance

  A glossy tri-fold brochure with "WILLOWBROOK FAMILY ZOO" on the cover.

  on reading it
    award read-brochure
    phrase brochure-text
  end on

create the zoo map
  aka map, folding map
  in the Zoo Entrance

  A colorful folding map of the Willowbrook Family Zoo.

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

  A heavy cast-iron machine with a big crank handle. A slot on top accepts
  pennies, and the mechanism stamps them with a zoo animal design. A sign
  reads: "INSERT PENNY, TURN HANDLE, KEEP FOREVER!"

create the flashlight
  aka torch, light, lamp
  light-source, switchable
  in the Supply Room

  A heavy-duty yellow flashlight.

create the radio
  aka portable radio
  scenery, switchable
  in the Supply Room

  A battered portable radio held together with duct tape. The antenna is
  bent at a jaunty angle. A faded sticker on the side reads "ZOO FM — All
  Animals, All The Time."

create the disposable camera
  aka camera
  in the Gift Shop

  A cheap yellow disposable camera with "ZOO MEMORIES" printed on the side.

define trait pettable
  data
    kind: one of goats, rabbits, parrot, snake

  phrases en-US
    pet-goats:
      You reach down and pet the nearest goat. It leans into your hand and
      bleats happily. The others crowd around, demanding equal attention.
    pet-rabbits:
      You gently stroke one of the rabbits. Its fur is incredibly soft. It
      twitches its nose at you contentedly.
    pet-parrot:
      You reach toward the parrot. CHOMP! It nips your finger with its beak.
      "NO TOUCHING!" it squawks indignantly.

  on petting it
    emit petted
    select on kind
      when goats
        phrase pet-goats
      when rabbits
        phrase pet-rabbits
      when parrot
        phrase pet-parrot
    end select
  end on
end trait

define trait feedable
  data
    food: entity
    fed: flag, starts false

  phrases en-US
    no-feed:
      You don't have any animal feed.
    already-fed:
      You've already fed them. They look contentedly full.
    fed:
      You offer some feed. The animal eats it gratefully.

  on feeding it
    if not (the actor has its food) then
      refuse no-feed
    end if
    if fed then
      refuse already-fed
    end if
    set fed to true
    emit fed
    phrase fed
  end on
end trait

define trait chatty
  on every turn while the player can see it and one chance in 2
    phrase parrot-chatter
  end on
end trait

define trait candid
  on every turn while the player can see it and one chance in 2
    phrase parrot-candor
  end on
end trait

define trait restless
  on every turn while feeding-time-active and the player can see it
    phrase goats-bleating
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
  refuse when not (the player holds the disposable camera): no-camera
  award photograph-animal
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

  A friendly zookeeper in khaki overalls. A name tag reads "Sam."

create the parrot
  a person
  aka macaw, scarlet macaw
  in the Aviary
  pettable with kind parrot
  chatty while not after-hours
  candid while after-hours

  A magnificent scarlet macaw perched on a rope. It tilts its head and
  watches you with one bright eye. {flavor}

create the pygmy goats
  aka goats, goat
  scenery, plural
  in the Petting Zoo
  pettable with kind goats
  feedable with food the bag of animal feed
  restless
  phrase fed:
    You scatter some feed on the ground. The pygmy goats rush over, bleating
    excitedly, and devour the corn and pellets in seconds. The smallest goat
    looks up at you with big grateful eyes.

  Three pygmy goats hoping you have food.

create the rabbits
  aka rabbit, bunnies
  scenery, plural
  in the Petting Zoo
  pettable with kind rabbits
  feedable with food the bag of animal feed
  phrase fed:
    You sprinkle some pellets near the rabbits. Biscuit and Marmalade hop
    over cautiously, then munch away happily.

  A pair of Holland Lop rabbits with floppy ears.

create the parrots
  aka macaws, birds
  scenery, plural
  in the Aviary

  A raucous flock of scarlet macaws and grey African parrots.

define score visit-petting-zoo worth 5
define score visit-aviary worth 5
define score visit-gift-shop worth 5
define score visit-supply-room worth 5
define score visit-nocturnal worth 5
define score feed-goats worth 10
define score feed-rabbits worth 10
define score collect-map worth 5
define score collect-pressed-penny worth 10
define score photograph-animal worth 5
define score pet-animal worth 5
define score read-brochure worth 5
define score after-hours-goats worth 5
define score after-hours-rabbits worth 5
define score after-hours-parrot worth 5
define score after-hours-snake worth 5
define score after-hours-keeper-leaves worth 5

when the player enters the Petting Zoo
  award visit-petting-zoo
end when

when the player enters the Aviary
  award visit-aviary
end when

when the player enters the Gift Shop
  award visit-gift-shop
end when

when the player enters the Supply Room
  award visit-supply-room
end when

when the player enters the Nocturnal Animals Exhibit
  award visit-nocturnal
end when

when the player pets anything
  award pet-animal
end when

when the player feeds the pygmy goats
  award feed-goats
  set feeding-time-active to false
end when

when the player feeds the rabbits
  award feed-rabbits
end when

when the player enters the Aviary while not after-hours
  phrase parrot-notices
end when

when the player enters the Aviary while after-hours
  phrase parrot-nods
end when

define sequence closing time
  at turn 5
    phrase zoo.pa.closing-3
      *DING DONG* "Attention visitors! The Willowbrook Family Zoo will be
      closing in three hours. Please make sure to visit all exhibits before
      closing time!"
  5 turns later
    phrase zoo.pa.closing-2
      *DING DONG* "Attention visitors! Two hours until closing. Don't forget
      to stop by the gift shop for souvenirs!"
  5 turns later
    phrase zoo.pa.closing-1
      *DING DONG* "Attention visitors! One hour until closing. Please begin
      making your way toward the exit."
  5 turns later
    phrase zoo.pa.closed
      *DING DONG* "The Willowbrook Family Zoo is now closed. Thank you for
      visiting! We hope to see you again soon!"
    set after-hours to true
end sequence

every 8 turns
  set feeding-time-active to true
  phrase zoo.feeding-time.announced
    *DING DONG* "It's FEEDING TIME at the Petting Zoo! Come watch our pygmy
    goats and rabbits enjoy their favorite snacks!"
end every

once after-hours
  if the player can see the zookeeper then
    award after-hours-keeper-leaves
  end if
  phrase zoo.after-hours.keeper-leaves
    The zookeeper glances at the clock, unclips the walkie-talkie from his
    belt, and stretches. "Well, that's me done for the day. Zoo's all yours,
    I guess!" He gives you a friendly wave and ambles off toward the staff
    parking lot. A moment later, you hear an engine start and fade into the
    distance.
  move the zookeeper to the Staff Parking Lot
end once

once after-hours and the player is in the Petting Zoo
  award after-hours-goats
  phrase zoo.after-hours.goats
    Now that the keeper is gone, the goats exchange glances. The largest one
    turns to you and bleats in a very deliberate pattern. You could swear it
    sounds like: "Finally. Do you have any idea what it's like being called
    'cute' six hundred times a day? We are MAJESTIC."
  award after-hours-rabbits
  phrase zoo.after-hours.rabbits
    The rabbits stop mid-hop and look at each other. Biscuit twitches her
    nose disapprovingly. Marmalade thumps his foot twice. You get the
    distinct impression they're critiquing the quality of today's pellets.
    "Barely adequate," the thumping seems to say. "Last Tuesday's batch was
    far superior."
end once

once after-hours and the player is in the Aviary
  award after-hours-parrot
  phrase zoo.after-hours.parrot
    The parrot clears its throat — actually clears its throat — and fixes
    you with a knowing look. "Right then. Now that the performative
    squawking is over, let me tell you something: that toucan? Complete
    fraud. Can't even crack a nut properly. And don't get me started on the
    gift shop markup."
end once

once after-hours and the player is in the Nocturnal Animals Exhibit
  award after-hours-snake
  phrase zoo.after-hours.snake
    A soft, sibilant voice drifts from behind the glass of the snake
    enclosure. "Ssso... you're the one who stayed. Good. Do you know what
    it's like in here? They keep the lights on 'dim' and call it
    'nocturnal.' I haven't seen actual moonlight in three years. Three.
    Years."
end once

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
  Between you and me, the toucan is a complete diva. Won't shut up about its
  bill.
or
  I have a degree in ornithology, you know. Well, I would, if birds could
  enroll.
or
  The gift shop markup is criminal. Three dollars for a postcard? In this
  economy?
or
  You seem alright. Most visitors just want selfies. At least you're still
  here.
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
  goats-bleating:
    The pygmy goats are bleating loudly and headbutting the fence. They seem
    very hungry!
  parrot-notices:
    The parrot ruffles its feathers and eyes you with interest.
  parrot-nods:
    The parrot glances at you and nods, as if recognizing a fellow
    after-hours regular.
  info-plaque-text:
    PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and always
    hungry.

    HOLLAND LOP RABBITS — Known for their floppy ears. Our pair, Biscuit and
    Marmalade, were born here in 2023.
  aviary-plaque-text:
    WELCOME TO THE AVIARY — Home to over 30 species!

    TOCO TOUCAN — Its bill weighs less than a smartphone.

    SCARLET MACAW — Can live over 75 years. Our oldest, Captain, is 42.
  warning-sign-text:
    CAUTION: The Nocturnal Animals Exhibit is kept dark. Please use a
    flashlight. Do NOT use camera flash. (We don't talk about the Great Owl
    Incident of 2022.)
  victory:
    Congratulations! You've earned your MASTER ZOOKEEPER badge! You've
    visited every exhibit, befriended the animals, collected souvenirs, and
    even stayed after hours to hear what the animals really think. The
    Willowbrook Family Zoo will never forget you!

    *** You have won ***
  presence-zookeeper:
    Sam the zookeeper is here, jingling a ring of keys.
  presence-parrot:
    A scarlet macaw watches you with one bright, knowing eye.
  presence-goats:
    Three pygmy goats mill about hopefully, eyeing your pockets for snacks.
  presence-rabbits:
    A pair of Holland Lop rabbits lounges near the hay bale, ears flopped.

define text flavor from "./dynamic-text.ts"
