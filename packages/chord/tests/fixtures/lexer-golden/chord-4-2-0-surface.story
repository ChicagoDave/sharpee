## Chord 4.2.0 lexer-golden corpus — the singular and plural surface
## (ADR-409): every thing and door is declared `singular` or `plural`, bare
## when the suffix rule can tell the other form, and `plural of <singular>`
## or `singular of <plural>` when the author writes it. A person may be
## declared or not. Every spelling compiles; edit only alongside the golden
## file.

story
  title: Chord 4.2.0 Surface
  authors:
    Lexer Golden
  id: lexer-golden-chord-4-2-0
  story-version: 4.2.0

before the game starts
  change the player to Wren
end before

create the Greenhouse
  a room
  east to the Potting Shed through the glass door

  Glass on every side.

create the Potting Shed
  a room
  west to the Greenhouse through the glass door

  Pots and twine.

create Wren
  a person, proper
  playable
  starts in the Greenhouse

  Wren tends the beds.

create the guards
  a person, plural
  in the Greenhouse

  Two guards lean on the door frame.

create the candles
  aka prickets
  a thing, scenery, plural, light-source
  in the Greenhouse

  A row of candles on iron prickets.

create the cacti
  aka succulents
  a thing, scenery, plural of cactus
  in the Greenhouse

  Squat cacti in clay pots.

create the mouse
  a thing, singular of mice
  in the Greenhouse

  A field mouse.

create the bee smoker
  a thing, singular
  in the Greenhouse

  A tin bee smoker.

create the glass door
  a door, singular

  A door of glass panes.
