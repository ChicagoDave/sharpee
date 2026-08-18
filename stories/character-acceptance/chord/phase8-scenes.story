story
  title: Backstage Voices
  authors:
    Sharpee Platform
  id: phase8-scenes
  story-version: 0.0.1

create the Stage
  a room
  west to the Corridor

  Boards, ropes, and a painted sky.

create the Corridor
  a room
  east to the Stage
  west to the Green Room

  A narrow passage behind the scenes.

create the Green Room
  a room
  east to the Corridor

  Where the company waits between entrances.

create the player
  in the Stage

  You, between entrances.

create Nell
  a person, proper
  in the Green Room
  mood cheerful
  knows the rumor, witnessed
  spreads chatty to anyone

  The company's quickest tongue.

create Piers
  a person, proper
  in the Green Room
  mood calm
  spreads nothing

  A stagehand who hears everything and repeats nothing.

define topics for Nell
  about "the tour":
    phrase nell-tour
    then asks the-offer
end topics

define exchange the-offer for Nell
  answer "yes":
    phrase nell-offer-yes
  answer "no":
    phrase nell-offer-no
end exchange

define greetings for Nell
  first time:
    phrase nell-first
end greetings

define topics for Piers
  about "the rumor":
    phrase piers-in-the-know when Piers knows the rumor
    phrase piers-blank
end topics

define phrase nell-tour
  "A grand tour of the north, if the company will have it."
end phrase

define phrase nell-offer-yes
  "Splendid! I knew you had the appetite for it."
end phrase

define phrase nell-offer-no
  "A pity. The north would have loved you."
end phrase

define phrase nell-first
  Nell looks you over with frank appraisal.
end phrase

define phrase piers-in-the-know
  "Everyone backstage has it by now."
end phrase

define phrase piers-blank
  "First I've heard of any such thing."
end phrase
