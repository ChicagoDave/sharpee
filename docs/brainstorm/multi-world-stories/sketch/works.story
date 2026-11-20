## SKETCH, not Chord. "The Sluice": the Works, a world. Mara is an NPC here
## and Tobin is the player. Apart from the lines marked NEW or UNCHECKED this
## is ordinary Chord, and it names no other world. See sluice.story.

world the Works                                        ## NEW (in place of `story`)
  keeps time while away                                ## NEW; the default, shown for the example

create the Gate Room
  a room
  up to the Wheel House

  Water moves under the floor grating, closer than it should be.

create the Wheel House
  a room
  down to the Gate Room

  The sluice wheel fills the far wall.

create the wheel
  a thing, scenery, turnable
  in the Wheel House
  states: unset, set

  The sluice wheel, taller than you are.

  on the player turning
    Mara must know the-wheel-setting: wheel-guess      ## UNCHECKED: knowing as a requirement
    change the wheel to set
    win river-held
  end on

create Mara
  a person, proper
  in the Wheel House

  The keeper of the works, older than the wheel's last coat of paint.

create Tobin
  a person, proper
  playable
  starts in the Gate Room

  You.

define topics for Mara
  about "the wheel", "the setting":
    refuse when Mara knows the-wheel-setting: mara-tells    ## UNCHECKED: knowing as a condition
    phrase mara-cannot-recall
    emit wheel-asked
end topics

## The deadline is a timer and nothing more. The running timer is what the
## world left behind is heading for, and `when the rising expires` is the
## state someone arrives to if they come back too late.
define timer the rising
  seep
    Water beads along the foot of the wall.
  stairs
    The lowest stair is under water.
  sill
    The river is level with the sill.
end timer

when the rising reaches stairs                         ## UNCHECKED: a stage hook
  change the river to on the stairs
end when

when the rising expires
  change the river to at the sill
  lose river-wins
end when

## Runs when this world is first entered.
before the world starts                                ## NEW
  change the player to Tobin
  start the rising
end before

## Runs when play leaves this world.
before the world pauses                                ## NEW
  phrase mara-goes-still
end before

## Runs when play comes back, after the world has caught up the time away.
## Catch-up prints nothing as it runs and keeps what it would have said.
## With no block here the platform recounts those lines itself. With a
## block the author decides, and `recount the time away` asks for the
## platform's account inside it.
after the world resumes                                ## NEW
  recount the time away                                ## NEW
  phrase mara-is-waiting
end after

define phrases en-US
  wheel-guess:
    You put your hands on the wheel and do not know which way, or how far.
  mara-cannot-recall:
    "My father set it," Mara says. "I watched him. I was nine."
  mara-tells:
    "Three turns past the notch. Go on."
  mara-goes-still:
    Mara's eyes are open, and a long way off.
  mara-is-waiting:
    Mara is looking at you, and at the wheel.
  river-held:
    The wheel takes, the gate drops, and the river goes around.
  river-wins:
    The river comes over the sill and into the works.
