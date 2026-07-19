story "Topics" by "ref"
  id: topics-ref
  version: 0.0.1

create the Gatehouse
  a room

  A stone gatehouse.

create the silver locket
  in the Gatehouse

  Tarnished but fine.

create Tobias
  a person, proper
  pronouns he
  in the Gatehouse
  states: steady, shaken

  The groundskeeper.

  on asking it
    phrase tobias-shrug
  end on

define topics for tobias
  about the silver locket: phrase tobias-locket-reply
  about "the folly", "the fire":
    change it to shaken
    phrase tobias-folly-reply
end topics

create the player
  starts in the Gatehouse

define phrase tobias-shrug
  Tobias shrugs. "Couldn't say."
end phrase

define phrase tobias-locket-reply
  "Her mother's, that was."
end phrase

define phrase tobias-folly-reply
  His face closes like a door.
end phrase
