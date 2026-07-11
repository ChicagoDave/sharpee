story "Zoo Actions Fixture" by "Sharpee Platform"
  id: zoo-actions
  version: 0.0.1
  blurb: design.md 3.4 - custom dispatch actions, traits, scores.

create the Petting Zoo
  a room

  A straw-floored yard full of amiable animals.

create the player
  starts in the Petting Zoo

  You.

define action petting
  grammar
    pet :animal
    pat :animal
  the animal must be reachable
  refuse without animal: pet-what
  otherwise refuse cant-pet

  phrases en-US
    pet-what:
      Pet what?
    cant-pet:
      {capitalize the animal} {verb:isn't animal} the sort of thing you can pet.

define action feeding
  grammar
    feed :animal
  the animal must be reachable
  refuse without animal: feed-what
  otherwise refuse not-hungry

  phrases en-US
    feed-what:
      Feed what?
    not-hungry:
      {capitalize the animal} {verb:doesn't animal} want feeding.

define trait pettable
  data
    kind: one of goats, rabbits, parrot, snake

  phrases en-US
    pet-goats:
      The pygmy goats crowd around, bleating happily as you scratch behind their ears.
    pet-rabbits:
      Biscuit and Marmalade twitch their noses and lean into your hand. Soft!
    pet-parrot:
      The parrot tilts its head and lets you smooth its feathers, watching you sideways.
    glass-way:
      You press your hand to the glass. The snake regards you coolly from the other side.

  on petting it
    if kind is snake then
      refuse glass-way
    end if
    emit petted
    select on kind
      when goats
        phrase pet-goats
      when rabbits
        phrase pet-rabbits
      when parrot
        phrase pet-parrot
    end select
  end on
end trait

define trait feedable
  data
    food: entity
    fed: flag, starts false

  phrases en-US
    no-food:
      You have nothing {the animal} would want to eat.
    already-fed:
      {capitalize the animal} {verb:has animal} had quite enough already.
    fed:
      {capitalize the animal} eagerly gobbles up the feed.

  on feeding it
    if not (the actor has its food) then
      refuse no-food
    end if
    if fed then
      refuse already-fed
    end if
    set fed to true
    emit fed
    phrase fed
  end on
end trait

create the pygmy goats
  aka goats
  plural
  in the Petting Zoo
  pettable with kind goats
  feedable with food the handful of feed
  phrase fed:
    The goats butt each other out of the way to get at the feed. Happy chaos.

create the handful of feed
  aka feed
  in the Petting Zoo

  A waxy paper cone of pellets.

create the garden snake
  aka snake
  in the Petting Zoo
  pettable with kind snake

  Coiled behind glass, radiating disdain.

define score pet-an-animal worth 5
define score feed-the-goats worth 10

when the player pets anything
  award pet-an-animal
end when

when the player feeds the pygmy goats
  award feed-the-goats
end when
