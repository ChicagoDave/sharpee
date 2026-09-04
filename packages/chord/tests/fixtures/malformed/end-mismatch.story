story
  title: Broken
  authors:
    Nobody
  id: broken-3
  story-version: 0.0.1

create the message
  scenery
  states: intact, trampled

  on the player reading
    select on the message's state
      when intact
        phrase message-intact
    end on
  end select

define phrases en-US
  message-intact:
    Fine.

create Alex
  a person
  playable

before the game starts
  change the player to Alex
end before
