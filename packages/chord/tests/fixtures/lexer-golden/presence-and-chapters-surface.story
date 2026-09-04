## ADR-258 D7 lexer-golden corpus — the presence, duration, and chapters
## surface (Chord 3.4.0–3.6.0, shipped together as 3.6.0): timers with their
## verbs and reads and the `when … expires` clause (ADR-325); the adjacent-room,
## `here` and `offstage` move destinations (ADR-326); a region with a `landing`
## and the `set … landing` statement; `proper` and `pronouns` on a create block;
## a `, one-way` exit; the `{bare}` article hint; a goal step written in an
## action's own words (ADR-329 D10); the player role (ADR-327); and the
## `chapters` extension with its `during`/`before`/`after` reads (ADR-330).
## Spellings lifted from the sharpee.net guide fences, which the story-loader
## docs test compiles. Edit only alongside the golden file.

story
  title: Presence and Chapters Surface
  authors:
    Lexer Golden
  id: lexer-golden-presence
  story-version: 1.0.0
  use chapters

define chapters
  market - Chapter I: Grubber's Market
    A stolen apple, and a girl the whole city is about to start looking for.
    begins when the game starts
  commerce - Chapter II: Commerce Street
    A wider street, and the mercenaries know your face now.
    begins when the player visits Commerce Street for the first time
  alarm - Chapter III: The Alarm
    begins when Tobias becomes alarmed
end chapters

create the Grounds
  a region
  containing the Market Square, Commerce Street, the Alley
  landing the Market Square

  on every turn while one chance in 6 and before alarm
    phrase night-wind
  end on

  after the player entering
    phrase cold-returns
  end after

create the Market Square
  a room
  east to Commerce Street
  north to the Alley, one-way

  Stalls and shouting, and a smell of bruised fruit.

create Commerce Street
  a room

  A wider street, paved, with shopfronts instead of stalls.

create the Alley
  a room

  Narrow and damp, and nobody comes here on purpose.

  after the player entering
    move the wandering mercenaries offstage
    move the wizard here
    set the Grounds's landing to Commerce Street
    change Tobias to alarmed
  end after

define timer waiting for the player
  pausing
  loitering
  interrupted one chance in 2
end timer

define timer search for the wandering mercenaries
  arriving
  lingering
    Those mercenaries are getting uncomfortably close. You'd better get going
    before they notice you!
  meanwhile, one chance in 5
    phrase merc-idle
end timer

define timer lunge for the wandering mercenaries
end timer

create the wandering mercenaries
  a person, plural
  in the Market Square
  states, reversible: approaching, searching

  Two men in mismatched armour, looking at faces.

  when search expires
    change the wandering mercenaries to approaching
    start lunge
    phrase merc-spotted
  end when

  on every turn while search is lingering and during commerce
    phrase footsteps-behind
  end on

  after the player talking
    stop search
    restart search
    reset search
    interrupt search
  end after

create Tobias
  aka the grocer, groundskeeper
  a person, proper
  pronouns he
  in the Market Square
  states: calm, alarmed

  A grocer with a nervous eye and a nervous stall.

  on the player talking during commerce
    refuse no-time-to-chat
  end on

  phrase detail during market:
    The stallkeeper looks nervous and irritable.

  on every turn while the player's waiting has started and after market
    phrase tobias-mutters
  end on

create the wizard
  a person
  in the Alley

  A robed figure, patient in the way of people who are never in a hurry.

  goal secure-the-key, high
    active when the wizard is in the Alley
    seek the player
    take the brass key
    go east
    say wizard-gloats
  end goal

create the brass key
  in the Alley

  A brass key, warm to the touch.

create the pear
  in the Market Square

  A pear, past its best.

  after the player taking
    phrase another-one
    phrase named-ware with ware = the pear
    move the player to a random adjacent room
  end after

create Alex
  a person
  playable
  starts in the Market Square

  Mud on your boots, dirt under your nails.

before the game starts
  change the player to Alex
end before

define phrase night-wind
  A wind gets in under the stalls and lifts the awnings.
end phrase

define phrase cold-returns
  The cold finds you again the moment you are outside.
end phrase

define phrase merc-idle
  One of the mercenaries spits, thoughtfully.
end phrase

define phrase merc-spotted
  A shout, and two heads turn your way at once.
end phrase

define phrase footsteps-behind
  Footsteps, keeping pace with yours.
end phrase

define phrase no-time-to-chat
  Tobias waves you off without looking up.
end phrase

define phrase tobias-mutters
  Tobias mutters something about the price of everything.
end phrase

define phrase wizard-gloats
  "So," says the wizard, to nobody in particular.
end phrase

define phrase another-one
  No one notices you picking up another {bare item}.
end phrase

define phrase named-ware
  Another {bare ware}, then.
end phrase
