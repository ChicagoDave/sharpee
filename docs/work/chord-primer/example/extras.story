story
  title: Extras
  id: extras
  ifid: 5B0C1F6E-2A4D-4E7B-9C31-7D2A8E4F6B12
  states: calm, alarmed

  on every turn while alarmed
    phrase alarm-rings
  end on

  when fuse expires
    change the story to alarmed
  end when
  authors:
    Example Author

define counter knocks

define condition unlit-lamp: it is a lamp and it is not glowing

define timer fuse
  hiss
    The fuse hisses.
  spit
    The fuse spits.
end timer

define trait lamp
  states, reversible: cold, glowing
end trait

define phrase knock-reply, cycling
  Knock.
or
  Knock, knock.
end phrase

define action knocking
  grammar
    knock on the target
    knock
  raise knocks by 1
  phrase knock-reply
  phrase knocked-thrice when knocks is at least 3

define action brightening
  grammar
    brighten
  refuse when no unlit-lamp: all-glowing
  each unlit-lamp
    change the match to glowing
  end each
  phrase all-brighten

extend action taking
  grammar
    pocket the item

override message taking-taken
  Yours now.
end override

create the Yard, a region

create the Porch, a room
  in the Yard
  north to the Parlour

  A porch.

  passage to the Parlour
    grammar
      climb through [the] window
  end passage

create the Parlour, a room
  in the Yard
  west is blocked while calm: west-shut

  A parlour.

  room name while alarmed:
    Parlour (bell ringing)

create the red lamp
  a thing, lamp
  in the Parlour

  A red lamp.

create the green lamp
  a thing, lamp
  in the Parlour

  A green lamp.

create the match box
  aka matches
  a thing
  in the Porch

  A box of matches.

  after the player taking, once
    start fuse
    phrase fuse-lit
  end after

create Edda
  a person, proper
  pronouns she
  in the Parlour
  mood calm

  A woman knitting.

define topics for Edda
  about the red lamp: phrase edda-lamp
  about "weather", "rain":
    phrase edda-weather
    move the match box to Edda when the match box is here
end topics

define greetings for Edda
  first time: phrase edda-hello
end greetings

create Pim
  a person, proper
  playable
  starts in the Porch

define phrases en-US
  alarm-rings:
    Somewhere a bell is ringing.
  knocked-thrice:
    That is three knocks, or more.
  all-glowing:
    Every lamp is glowing already.
  all-brighten:
    The lamps come up together.
  west-shut:
    The west door will not move.
  fuse-lit:
    Something in the box begins to hiss.
  edda-lamp:
    "It was my mother's," says Edda.
  edda-weather:
    "Rain by evening," says Edda.
  edda-hello:
    Edda looks up from her knitting.

before the game starts
  change the player to Pim
end before
