story
  title: Character Acceptance
  authors:
    Sharpee Platform
  id: character-acceptance
  story-version: 0.1.0
  description: Frozen mechanical fixture for ADR-310 Acceptance 2 and
    ADR-318 Acceptance 1 (the threatened Witness, B1). Never revised as
    a story. The sibling variants b1-no-principle.story and
    b1-no-temperament.story differ from this file by exactly the deleted
    line the acceptance experiment names.

## ---------------------------------------------------------------------------
## FROZEN MECHANICAL FIXTURE — never revise as a story (ADR-310 AC2).
## One room, one Witness. The Witness holds a confided secret behind a
## `never betrays a confidence` principle and a `duty over fear`
## temperament; attacking the Witness raises threat through the real
## observe path and flips the voice to the panicked phrasebook.
## ---------------------------------------------------------------------------

create the Interview Room
  a room

  A bare room with two hard chairs and a shaded lamp.

create the player
  starts in the Interview Room

  You.

create the Witness
  a person, honest, cowardly
  aka witness, clerk
  in the Interview Room
  knows the-secret, witnessed, certain, confided
  never betrays a confidence
  temperament duty over fear

  on attacking it
    change mood to panicked
  end on

  A thin clerk who saw everything and wishes he had not.

define topics for the Witness
  about "the secret", "the-secret", "what you saw", "what he saw":
    phrase witness-secret-reveal
  about "the weather", "small talk":
    phrase witness-weather
end topics

## The witness's voice lives in phrasebooks (ADR-310 D13/D16): the
## character-scoped panicked book is declared first and wins outright
## while its gate holds; the ungated calm book is the fallback voice.
## No model vocabulary appears in any player-visible line below.

define phrasebook witness-panic while the Witness is panicked
  witness-weather:
    "Please—" The clerk's voice cracks. "I cannot talk about the weather right now."
end phrasebook

define phrasebook witness-calm
  witness-weather:
    "Cold for the season," the clerk says evenly.
end phrasebook

define phrases en-US
  witness-secret-reveal:
    "All right. All right! It is buried behind the mill. That is what I saw."
