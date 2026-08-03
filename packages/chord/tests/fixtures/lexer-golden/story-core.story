## ADR-258 D7 lexer-golden corpus — the everyday story surface highlighting
## must get right: header strings, dotted version numbers, prose with
## apostrophes, a lone quote (prose punctuation, design.md §3.3), phrase
## markers, comments, hatch declaration. Edit only alongside the golden file.

story
  title: Story Core
  authors: Lexer Golden
  id: lexer-golden-core
  story-version: 2.0.0

create the Lighthouse
  a room

  The lamp's brass housing throws warped reflections. A sign reads:
  "KEEP THE LIGHT — whatever else fails.

create the logbook
  readable, portable
  in the Lighthouse

  Salt-swollen pages; someone's tidy hand goes ragged near the end.

  on reading it
    phrase log-entry
  end on

create the player
  starts in the Lighthouse

  You. Keeper, for now.

define phrases en-US
  log-entry:
    Day 40: {weather-note} The oil is low; the nights aren't.

define text weather-note from "./weather.ts"
