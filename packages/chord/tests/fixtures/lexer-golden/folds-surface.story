## ADR-362 lexer-golden corpus — the folds (Chord 4.0.0): a kind line on the
## `create` head, with a trait after it; a room's exits on an `exits:` line
## and an `exits, one-way:` line, with a blocked line beside them. `exits`
## stays an ordinary word token (ADR-362 D2, AC-6). Edit only alongside the
## golden file.

story
  title: Folds Surface
  authors:
    Lexer Golden
  id: lexer-golden-folds
  story-version: 4.0.0

create the Mine Entrance 24, a room
  room name:
    Mine enterance
  exits, one-way: northeast to the Tunnel 22, southeast to the Tunnel 21, up to the Mine 25
  down is blocked: too-dark

  You are at the enterance to an abandoned mine. Exits go NW and SW,
  and a dark mine corridor is below.

create the Tunnel 22, a room, dark
  exits: south to the Tunnel 21

  A tunnel, going down.

create the Tunnel 21, a room

  A tunnel, going nowhere.

create the Mine 25, a room

  The mine proper: timber, damp, and silence.

create the brass lamp, a thing, portable
  in the Mine Entrance 24

  A brass lamp, cold to the touch.

create Alex, a person
  playable
  starts in the Mine Entrance 24

  You.

define phrases en-US
  too-dark:
    The corridor below is too dark to try.

before the game starts
  change the player to Alex
end before
