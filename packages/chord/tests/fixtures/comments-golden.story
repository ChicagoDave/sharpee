## Cloak of Darkness, annotated — ADR-249 golden twin of cloak.story.
## Comments must contribute nothing: IR identical modulo spans.

story "Cloak of Darkness" by "Roger Firth (Sharpee implementation)"
  id: cloak-of-darkness
  version: 1.0.0
  blurb: A basic IF demonstration - hang up your cloak!

define condition in-darkness: the player's location is dark

create the Foyer of the Opera House
  a room
  aka foyer, hall, entrance
  west to the Cloakroom
  south to the Foyer Bar
  north is blocked: cant-leave

  You are standing in a spacious hall, splendidly decorated in red and
  gold, with glittering chandeliers overhead. The entrance from the
  street is to the north, and there are doorways south and west.

## The cloakroom side of the map.

create the Cloakroom
  a room
  aka cloakroom

  The walls of this small room were clearly once lined with hooks,
  though now only one remains. The exit is a door to the east.

## The bar is dark while the cloak is carried —
## the message scrawled in sawdust is the win condition.

create the Foyer Bar
  a room, dark while the player has the velvet cloak
  aka bar

  The bar, much rougher than you'd have guessed after the opulence of
  the foyer to the north, is completely empty. There seems to be some
  sort of message scrawled in the sawdust on the floor.

  after entering it while in-darkness
    phrase stumble
    first time
      change the message to trampled
    third time
      change the message to obliterated
  end after

create the player
  starts in the Foyer of the Opera House
  wears the velvet cloak

  As good-looking as ever.

create the velvet cloak
  aka cloak
  wearable

  A handsome cloak, of velvet trimmed with satin, and slightly
  splattered with raindrops. Its blackness is so deep that it almost
  seems to suck light from the room.

create the brass hook
  aka hook, peg
  scenery, a supporter with capacity 1
  in the Cloakroom

  It's just a small brass hook, screwed to the wall.

create the message in the sawdust
  aka message, sawdust, floor, writing
  scenery
  in the Foyer Bar
  states: intact, trampled, obliterated

  on reading it
    select on its state
      when intact
        phrase message-intact
        win
      when trampled
        phrase message-trampled
      when obliterated
        phrase message-obliterated
        lose
    end select
  end on

define verb hang or hook means put (something) on (something)

define phrases en-US
  cant-leave:
    You've only just arrived, and besides, the weather outside seems
    to be getting worse.
  stumble:
    Blundering around in the dark isn't a good idea!
  message-intact:
    The message, neatly marked in the sawdust, reads... You have won!
  message-trampled:
    You can just make out: {garbled}
  message-obliterated:
    The message has been trampled beyond recognition. You have lost!

define text garbled from "./extras.ts"


## end of story file.