story
  title: Trait Field Test
  authors:
    Sharpee Team
  id: trait-field-test
  story-version: 0.0.1
  description: A platform test story — one scene per standard action that reads a declared trait field: two hats on one head, a door that opens when unlocked, a case that closes when switched off, a ring that will not come off, cheese smelled through a closed box, a bell heard through a closed crate and a chime heard through the cellar door, a cordial that feels damp, a farmhand who refuses a gift, two people to talk to, and a lamp to light the cellar.

create the Hall
  a room
  north to the Cellar through the cellar door
  east to the Barn

  A stone hall. A cellar door is set in the north wall, and a wide doorway leads east to the barn.

create the Cellar
  a room, dark

  A cool cellar.

create the Barn
  a room

  A dusty barn, open to the hall on the west.

create Alex
  a person
  playable
  starts in the Hall
  wears the iron ring
  carries the withered apple

  You.

before the game starts
  change the player to Alex
end before

## Row 6 — two hats on one head (wearable on the <part>)

create the straw hat
  a thing, wearable on the head
  in the Hall
  aka hat

  A wide straw hat.

create the felt cap
  a thing, wearable on the head
  in the Hall
  aka cap

  A soft felt cap.

create the wool scarf
  a thing, wearable on the neck
  in the Hall
  aka scarf

  A long wool scarf.

## Row 3 — a wearable that will not come off (the refusing clause is the idiom)

create the iron ring
  a thing, wearable
  aka ring

  A plain iron ring, cold to the touch.

  on the player taking_off
    refuse ring-holds
  end on

define phrase ring-holds
  The ring will not come off.
end phrase

## Row 7 — a door that opens when unlocked; a case that closes when switched off

create the iron key
  a thing
  in the Hall
  aka key

  A heavy iron key.

create the cellar door
  a door, lockable with the iron key
  opens when unlocked
  aka door

  A heavy grey door. Its latch springs when the lock turns.

create the display case
  a container, openable, switchable, starts open, starts on
  closes when switched off
  in the Hall
  aka case

  A lit glass case. Its lid drops shut when the light goes out.

## Row 1 — a light switched on and off, in the dark cellar

create the oil lamp
  a thing, light-source, switchable
  in the Hall
  aka lamp

  A brass oil lamp.

## Row 2 — a liquid touched

create the cordial
  a thing, drinkable
  in the Hall

  A small glass of cordial.

## Row 8 — a strong scent escapes a closed box; a plain edible does not

create the tin box
  a container, openable
  in the Hall
  aka box

  A dented tin box.

create the ripe cheese
  a thing, edible, smelly
  in the tin box
  aka cheese

  A wedge of very ripe cheese.

create the plain bread
  a thing, edible
  in the tin box
  aka bread

  A plain roll.

## Row 8 — a loud thing is heard through a closed crate and through the cellar door

create the bell crate
  a container, openable
  in the Hall
  aka crate

  A slatted crate, lid shut.

create the brass bell
  a thing, loud
  in the bell crate
  aka bell

  A brass bell that rings at the slightest touch.

create the wooden rattle
  a thing
  in the bell crate
  aka rattle

  A child's rattle.

create the wind chime
  a thing, loud
  in the Cellar
  aka chime

  A wind chime that never quite stops.

## Rows 4 and 5 — a farmhand who refuses a gift, with a topic table; a quiet one without

create the withered apple
  a thing, edible
  aka apple

  A withered apple.

create Mira
  a person, proper
  starts in the Barn

  A quiet farmhand.

  on the player giving
    refuse mira-no-gift
  end on

define phrase mira-no-gift
  Mira wrinkles her nose and shakes her head.
end phrase

define topics for Mira
  about "the weather":
    phrase mira-weather
end topics

define phrase mira-weather
  "Rain by evening," Mira says.
end phrase

create Tobias
  a person, proper
  starts in the Barn

  A stablehand with nothing to say.
