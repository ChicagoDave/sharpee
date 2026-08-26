story
  title: Gate: duplicate clause
  authors:
    Nobody
  id: gate-duplicate-clause
  story-version: 0.0.1

define trait guarded
  phrases en-US
    blocked-once:
      No.
    blocked-twice:
      Really, no.

  on the player taking
    refuse blocked-once
  end on

  on the player taking while the actor holds the rope
    refuse blocked-twice
  end on
end trait

create the rope
  scenery

create the Foyer
  a room

  A bare room.

  after the player entering
    phrase ping
      Ping.
  end after

  after the player entering
    phrase pong
      Pong.
  end after

create the player
  starts in the Foyer

  You.
