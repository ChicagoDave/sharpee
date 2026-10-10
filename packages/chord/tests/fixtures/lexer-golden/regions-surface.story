## ADR-360 lexer-golden corpus — the region surface (Chord 4.0.0): a `rooms`
## group with a trait line, an alias, a room name block, a first-time
## paragraph and one shared description; a room joining its region by an
## `in the` line; a plain exit table and a one-way one. The words `rooms`
## and `exits` stay ordinary word tokens (ADR-360 AC-12). Edit only alongside
## the golden file.

story
  title: Regions Surface
  authors:
    Lexer Golden
  id: lexer-golden-regions
  story-version: 4.0.0

create the Grounds
  a region

  Lawns and gravel, kept past the point of sense.

  rooms Terrace 1 to 3
    dark
    aka the terraces
    room name:
      Terrace

    first time
      Gravel crunches underfoot; nobody has walked here in a season.

    A flagged terrace, one of three stepped down the slope toward the river.

  exits
    the Terrace 1: south to the Terrace 2
    the Terrace 2: south to the Terrace 3, east to the Boathouse

  exits, one-way
    the Terrace 3: down to the Boathouse

create the Boathouse
  a room
  in the Grounds

  Oars and rot. The river shows through the floorboards.

create Alex
  a person
  playable
  starts in the Terrace 1

  You.

before the game starts
  change the player to Alex
end before
