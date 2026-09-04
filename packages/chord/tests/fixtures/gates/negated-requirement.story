story
  title: Gate: negated requirement
  authors:
    Nobody
  id: gate-negated-requirement
  story-version: 0.0.1

define trait tethered
  phrases en-US
    no-rope:
      It is tied down and you have no rope.

  on the player taking
    refuse when not the actor holds the rope: no-rope
  end on
end trait

create the rope
  scenery

create Alex
  a person
  playable

  You.

before the game starts
  change the player to Alex
end before
