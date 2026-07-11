story "Zoo Timeline Fixture" by "Sharpee Platform"
  id: zoo-timeline
  version: 0.0.1
  blurb: design.md 3.3 - chatty trait, sequence, once, conditional composition.

create the Aviary
  a room

  Bright cages and brighter noise.

create the player
  starts in the Aviary

  You.

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

define phrase parrot-chatter, randomly
  Polly wants a cracker!
or
  SQUAWK! Pretty bird! Pretty bird!
or
  Pieces of eight! Pieces of eight!
end phrase

define phrase parrot-candor, randomly
  Honestly? The crackers here are stale.
or
  You should see what the flamingos say about you.
end phrase

define flag after-hours starts false

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

once after-hours
  move Sam the zookeeper to the Staff Gate
  phrase zoo.after-hours.keeper-leaves
    Sam the zookeeper checks her watch, waves goodnight to the animals,
    and lets herself out through the staff gate.
end once

every 3 turns, 4 times
  phrase goat-bleat
    A pygmy goat bleats somewhere nearby.
end every

create the Staff Gate
  a room

  Staff only beyond this point.

create Sam the zookeeper
  a person
  aka Sam, zookeeper
  in the Aviary

  Sam wrangles feed buckets with practiced ease.

create the parrot
  a person
  in the Aviary
  chatty while not after-hours
  candid while after-hours

  A scarlet macaw with opinions.
