## A dedicated fixture for GH #549 Phase 4: a topic row whose first phrase
## carries a `when` and whose second does not. The dialogue runtime answers
## with the first phrase whose `when` holds, so each phrase is a leaf: the
## calm answer with the clerk calm (as booted), the grumble with the clerk
## cross — a two-valued state, written. (The compiler refuses a phrase
## behind the unconditional one, so that case has no fixture.) Not story
## content.

story
  title: Derived Phrase Ladder
  authors:
    Sharpee
  id: derived-phrase-ladder
  story-version: 0.0.1

create the Hall
  a room

  A hall.

create the clerk
  a person
  in the Hall
  states, reversible: calm, cross

  A clerk.

define topics for the clerk
  about "the weather":
    phrase weather-fine when the clerk is calm
    phrase weather-grumble
end topics

define phrase weather-fine
  Fine weather.
end phrase
define phrase weather-grumble
  Grumble.
end phrase

create Alex
  a person, proper
  playable
  starts in the Hall

before the game starts
  change the player to Alex
end before
