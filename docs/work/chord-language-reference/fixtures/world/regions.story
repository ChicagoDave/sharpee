story "Regions" by "ref"
  id: regions-ref
  version: 0.0.1

create the Drive
  a room

  A gravel drive.

create the Hall
  a room

  A cold hall.

create the Grounds
  a region
  containing the Drive, the Hall

  on every turn while one chance in 6
    phrase night-wind
  end on

  after entering it
    phrase cold-returns
  end after

  after leaving it
    phrase out-of-the-wind
  end after

create the player
  starts in the Drive

define phrase night-wind
  The wind worries at the trees.
end phrase

define phrase cold-returns
  The cold finds you again at once.
end phrase

define phrase out-of-the-wind
  Your ears ring in the quiet.
end phrase
