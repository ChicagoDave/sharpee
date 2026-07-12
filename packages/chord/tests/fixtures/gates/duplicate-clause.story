story "Gate: duplicate clause" by "Nobody"
  id: gate-duplicate-clause
  version: 0.0.1

define trait guarded
  phrases en-US
    blocked-once:
      No.
    blocked-twice:
      Really, no.

  on taking it
    refuse blocked-once
  end on

  on taking it while the actor holds the rope
    refuse blocked-twice
  end on
end trait

create the rope
  scenery

create the Foyer
  a room

  A bare room.

  after entering it
    phrase ping
      Ping.
  end after

  after entering it
    phrase pong
      Pong.
  end after

create the player
  starts in the Foyer

  You.
