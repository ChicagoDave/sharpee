## ADR-258 D7 lexer-golden corpus — the conversation surface (ADR-320): manner
## beats and voice, greetings boundary rows with the absence and repetition
## words, the recency and threading predicates, exchanges with their
## answer/act/silence heads and strength modifier, initiative occasions, and
## conversation threads with gated beats, transition rows, and a conclusion.
## Spellings lifted from the shipping syntax in branch-stories/ides-of-march and
## stories/character-acceptance. Edit only alongside the golden file.

story
  title: Conversation Surface
  authors:
    Lexer Golden
  id: lexer-golden-conversation
  story-version: 1.0.0

define mood stung like sad, but darker

create the Tiring-House
  a room

  A room of hooks and hurry, and two men who talk for a living.

create Will Kemp
  a person, proper, very impulsive
  aka kemp, the clown
  in the Tiring-House
  mood cheerful
  states: settled, sworn
  knows the-grievance, witnessed, certain

  The clown, who reads a room the way other men read a page.

create William Shakespeare
  a person, proper, slightly honest
  aka shakespeare, the poet
  in the Tiring-House
  mood calm

  The poet, whose pen keeps moving while he listens.

create the player
  starts in the Tiring-House

  You.

define manner for Will Kemp
  when it is cheerful:
    beat "He sketches half a jig step on the spot, done before it began."
    beat "He snaps his fingers at a passing thought and grins."
  when it is stung:
    voice flat
end manner

define greetings for Will Kemp
  first time:
    phrase kemp-sizes-you-up
  on return:
    phrase kemp-nods
  on return, again so soon:
    phrase kemp-twice-in-an-hour
  on return, after days:
    phrase kemp-wheres-been
  asked once:
    phrase kemp-obliges
  asked again:
    phrase kemp-persistent
  asked many times:
    phrase kemp-weary
  on leaving:
    phrase kemp-turns-away
end greetings

define topics for Will Kemp
  about "the rose", "the offer":
    refuse when the-blow-up is fresh: kemp-too-raw
    refuse when the-blow-up is recent: kemp-too-raw
    phrase kemp-rose-settled when the-defection is concluded
    phrase kemp-warms when the-grievance was discussed and the-defection is not concluded
    phrase kemp-brushes-off
  about "the weather":
    phrase kemp-marks-the-turn when the subject changes
    phrase kemp-on-the-weather
end topics

define initiative for Will Kemp
  on an open floor, when it is cheerful:
    phrase kemp-interjects
  on an open floor, when it is stung:
    hold their tongue
  when the subject changes:
    deflect to "the offer"
  on silence:
    deflect to "the weather"
  on harm:
    phrase kemp-on-violence
end initiative

define exchange the-offer for Will Kemp, blocking
  answer "yes", "aye", "sworn":
    phrase kemp-sworn
    change Will Kemp to sworn
  answer the Tiring-House:
    phrase kemp-looks-around
  on leaving:
    phrase kemp-calls-after
    leave
  on silence:
    phrase kemp-offer-silence
end exchange

define exchange the-plain-question for William Shakespeare
  answer "a hired man":
    phrase shakespeare-takes-it
    then invites the-second-question
  on silence:
    phrase shakespeare-reads-silence
end exchange

define exchange the-second-question for William Shakespeare
  answer "norwich":
    phrase shakespeare-takes-norwich
  on silence:
    phrase shakespeare-reads-silence-again
end exchange

define conversation the-defection for Will Kemp, blocking
  about "the rose", "the offer", "henslowe"
  opens when the-grievance was discussed and the-blow-up is stale
  beat, when the-blow-up is not fresh and the-blow-up is not recent:
    phrase kemp-hears-the-rose
  beat:
    phrase kemp-names-his-price
    then asks the-offer
  on refusing:
    phrase kemp-holds-the-thread
  on resuming:
    phrase kemp-takes-it-up
  conclusion:
    phrase kemp-concluded-sworn when Will Kemp is sworn
    phrase kemp-concluded-cooled
end conversation

define conversation the-suspicion for William Shakespeare, passive
  about "the book", "the papers"
  beat:
    phrase shakespeare-on-the-book
    then asks the-plain-question
  beat:
    phrase shakespeare-reads-you
  on parting:
    phrase shakespeare-lets-it-lie
  on resuming:
    phrase shakespeare-takes-it-up
  conclusion:
    phrase shakespeare-shuts-the-book
end conversation

define phrases en-US
  kemp-sizes-you-up:
    He looks you up and down.
  kemp-nods:
    He nods.
  kemp-twice-in-an-hour:
    "Twice in one hour!"
  kemp-wheres-been:
    "Where have you been?"
  kemp-obliges:
    He obliges.
  kemp-persistent:
    "Persistent, aren't you."
  kemp-weary:
    "Again? Ask the walls."
  kemp-turns-away:
    He turns away.
  kemp-too-raw:
    "Not NOW, friend."
  kemp-rose-settled:
    "That is settled between us."
  kemp-warms:
    "You remember, then."
  kemp-brushes-off:
    He waves it off.
  kemp-marks-the-turn:
    "You steer."
  kemp-on-the-weather:
    "Worst on the thatch."
  kemp-interjects:
    "And here is where the clown speaks anyway."
  kemp-on-violence:
    "Not on these boards."
  kemp-sworn:
    "Sworn, then."
  kemp-looks-around:
    He looks around the room.
  kemp-calls-after:
    "But the question walks with you."
  kemp-offer-silence:
    He nods slowly.
  kemp-hears-the-rose:
    "The Rose, is it."
  kemp-names-his-price:
    "A share, and my own jigs."
  kemp-holds-the-thread:
    "THIS first."
  kemp-takes-it-up:
    "Where were we."
  kemp-concluded-sworn:
    He takes your hand before the word is done.
  kemp-concluded-cooled:
    "Then nothing was said."
  shakespeare-takes-it:
    The pen moves on.
  shakespeare-takes-norwich:
    "The provinces keep better discipline."
  shakespeare-reads-silence:
    "Just so," he says, softly.
  shakespeare-reads-silence-again:
    The pen keeps moving.
  shakespeare-on-the-book:
    "The book stays in this room."
  shakespeare-reads-you:
    He watches what you look at.
  shakespeare-lets-it-lie:
    The pen pays out line.
  shakespeare-takes-it-up:
    "You always come back to it."
  shakespeare-shuts-the-book:
    He shuts the book.
