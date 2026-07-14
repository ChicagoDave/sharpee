story "Gate: negated requirement" by "Nobody"
  id: gate-negated-requirement
  version: 0.0.1

define trait tethered
  phrases en-US
    no-rope:
      It is tied down and you have no rope.

  on taking it
    refuse when not the actor holds the rope: no-rope
  end on
end trait

create the rope
  scenery

create the player

  You.
