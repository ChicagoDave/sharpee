story
  title: Hunt the Wumpus
  authors:
    David Cornelson
  id: wumpus
  ifid: 015DB556-78C0-4D84-A0C8-4B92A5BC9BE5
  story-version: 0.1.0
  use expanses

  on every turn while the Wumpus is close by
    kill the player eaten
  end on

  on every turn while the coracle is at the Bottomless Pit
    kill the player pit-death
  end on

  on every turn while the coracle is at the Sinkhole
    kill the player pit-death
  end on

  on every turn while the coracle is at the Bat Roost
    phrase bats-carry
    select randomly
      move the coracle to the Echo Chamber
    or
      move the coracle to the Dripping Gallery
    or
      move the coracle to the Bone Hollow
    end select
  end on

## A test story: the classic hunt, played across an expanse. The caves are
## one flooded cavern; you paddle a coracle across it, and the chambers are
## landmarks in the dark. The Wumpus floats and wanders on the cavern's drift.
## You smell it when it comes into sight, it eats you when it is close by,
## and you shoot it when it is in the distance: too far to be eaten, near
## enough to hit. On the horizon an arrow is wasted. Two pits
## kill on arrival; the bat roost carries the coracle somewhere else.

before the game starts
  change the player to the Hunter
end before

## The cavern.

create the Wumpus Caves
  an expanse
  size: 12 by 12
  drift: 1 unit every 2 turns
  north is blocked: north-wall
  south is blocked: south-wall
  east is blocked: east-wall
  west is blocked: west-wall
  aka caves, cavern, water, lake

  Black water under a roof you cannot see. Your paddle is the loudest
  thing in the world.

  landmarks
    the Landing: 2, 2
    the Echo Chamber: 6, 2
    the Dripping Gallery: 2, 7
    the Bone Hollow: 9, 6
    the Bottomless Pit: 4, 5
    the Sinkhole: 9, 9
    the Bat Roost: 6, 10
  end landmarks

define phrase north-wall
  The cavern wall rises out of the water ahead, slick and unbroken.
end phrase

define phrase south-wall
  The water ends at a shelf of rock to the south. There is no way on.
end phrase

define phrase east-wall
  Rock closes the way east, close enough to touch.
end phrase

define phrase west-wall
  The west wall of the cavern, running with water. Nothing passes it.
end phrase

## The chambers.

create the Landing
  a room
  seen from afar: a smear of grey daylight on the water
  sight: 3
  aka shore, landing, beach

  A gravel shore where the daylight gives out. The coracle is drawn up
  here. Beyond it the water goes on into the dark.

create the Echo Chamber
  a room
  seen from afar: a mouth of rock that throws your own paddle strokes back
  aka echo, chamber

  A chamber that answers every sound twice. Nothing lives here but
  the echo.

create the Dripping Gallery
  a room
  seen from afar: a glitter of falling water
  aka gallery, drips

  A long gallery where water falls from the roof in a hundred places
  at once.

create the Bone Hollow
  a room
  seen from afar: a pale heap above the waterline
  aka hollow, bones

  Bones, picked clean, heaped to the height of a man. Something eats
  well in these caves.

create the Bottomless Pit
  a room
  seen from afar: a cold draft coming off the water
  aka pit

  There is no bottom. You have time to notice that.

create the Sinkhole
  a room
  seen from afar: a cold draft coming off the water
  aka sinkhole, hole

  The water pours away through the floor, and the coracle with it.

create the Bat Roost
  a room
  seen from afar: a rustle of wings in the dark
  aka roost, bats

  The roof is alive. Before you can back the paddle the bats have you,
  coracle and all.

define phrase pit-death
  The water drops away under the coracle and so do you, for a very
  long time.
end phrase

define phrase bats-carry
  Wings everywhere. The bats lift the coracle clear of the water and
  drop it somewhere else entirely.
end phrase

## The coracle.

create the coracle
  a vehicle
  in the Wumpus Caves at 2, 2
  movement: open
  carries: in
  drive: player
  commands: compass, coordinates
  pace: 1 turn
  stride: 1 unit
  sight: 6
  seen from afar: a small hide boat, low in the water
  aka boat, hide boat

  A hide boat barely big enough for you, your bow and your five arrows.
  You steer it by paddling on one side or the other.

## The Wumpus.

create the Wumpus
  a thing, floats
  in the Wumpus Caves at 9, 3
  aka beast, monster, wumpus

  Something very large and very patient, mostly under the water. It
  smells like a thing that has never once been outdoors.

  on the player taking
    refuse wumpus-not-retrievable
  end on

define phrase wumpus-not-retrievable
  You are not hauling that aboard. It is the other way round.
end phrase

define phrase eaten
  The water heaves, the coracle tips, and the Wumpus has you. It does
  not hurry.
end phrase

define phrase wumpus-smell
  A smell reaches you across the water: wet fur, old meat, and
  something sweet underneath. The Wumpus is near.
end phrase

define sequence scent
  when the Wumpus comes into sight
    phrase wumpus-smell
end sequence

## The hunter.

create the Hunter
  a person
  playable
  starts in the Landing
  counter arrows starts 5

  You, with a bow and five arrows, and a coracle you did not build.

## Shooting.

define action shooting
  grammar
    shoot the target
    shoot the arrow at the target
    fire at the target
  the target must be visible
  refuse without target: shoot-what
  refuse when the player's arrows is 0: no-arrows
  lower the player's arrows by 1
  phrase arrow-misses when the Wumpus is on the horizon
  win wumpus-slain when the Wumpus is in the distance
  lose out-of-arrows when the player's arrows is 0

  phrases en-US
    shoot-what:
      Shoot what? The dark does not count.
    no-arrows:
      Your quiver is empty.
    arrow-misses:
      The arrow goes out across the water and is gone. Somewhere a
      long way off, something snorts.
    wumpus-slain:
      The arrow goes home. The Wumpus rears once out of the water,
      enormous, and goes down for good. The caves are quiet.
    out-of-arrows:
      That was your last arrow, and it is somewhere in the dark now.
      So is the Wumpus, and it knows where you are.
