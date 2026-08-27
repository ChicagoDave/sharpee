story
  title: The Ides of March
  authors:
    Sharpee Platform
  id: ides-of-march
  ifid: 83A52F59-437D-4A27-BEFA-B9B3DEE7A84D
  story-version: 0.1.0
  states: first-day, second-day, third-day
  use state-machines
  description: The last three days before Julius Caesar opens the new
    Globe. You are Henslowe's man, slipped in among the hired players.
    Bring the clown to the Admiral's Men and the play-book across
    Bankside, and let no one see your face beneath the face.

## ---------------------------------------------------------------- vocabulary

define mood stung like sad, but darker

## --------------------------------------------------------------------- facts
## The player's cover is a valued fact: what the company believes the
## newcomer to be. The player's authored answers claim values of it.

define fact the stranger
  harmless, henslowes
end fact

## --------------------------------------------------------------------- rooms

create the Stage
  a room
  west to the Tiring-House through the tiring-house door
  south to the Yard

  The stage of the new Globe, raw oak still pale from the saw. Two
  pillars painted like marble hold up the heavens, and the house's
  first play is chalked on the plot-board: JULIUS CAESAR. The
  tiring-house door stands west; the yard is south, over the lip of
  the boards.

create the Tiring-House
  a room
  east to the Stage through the tiring-house door

  The tiring-house, behind the stage: racks of robes and armour, a
  property table, and the company's papers. Everything the play is
  made of lives in this room. The door east gives onto the stage.

create the Yard
  a room
  north to the Stage
  south to the Tavern

  The yard of the Globe, open to the sky, ringed by three galleries
  of new timber. Empty of groundlings, it is a field of trodden
  hazelnut shells. The stage stands north; the way out to Bankside
  and the tavern is south.

create the Tavern
  a room
  north to the Yard
  east to Your Lodging

  A Bankside tavern, low-beamed and dim, conveniently deaf. Men from
  every playhouse drink here and pretend not to know one another.
  The Globe is back north; your lodging is east.

## The lodging's three night handlers run in declaration order and each
## reads the day the one before it may have set, so the LAST day is
## declared FIRST — one visit, one night, never a cascade.

create Your Lodging
  a room
  west to the Tavern
  states, reversible: nothing-yet, kemp-only, book-only, both

  A rented room over a chandler's shop: a pallet, a candle, and a
  loose board under which a man might keep what is not his. The
  tavern is west.

  after the player entering while third-day
    change Your Lodging to nothing-yet
    change Your Lodging to kemp-only when Will Kemp is sworn
    change Your Lodging to book-only when the player has the play-book or the play-book is in Your Lodging
    change Your Lodging to both when Will Kemp is sworn and the player has the play-book
    change Your Lodging to both when Will Kemp is sworn and the play-book is in Your Lodging
    select on Your Lodging's state
      when both
        win ides-won
      when kemp-only
        lose ides-no-book
      when book-only
        lose ides-no-kemp
      when nothing-yet
        lose ides-nothing
    end select
  end after

  after the player entering while second-day
    phrase night-two
    change the story to third-day
    move Richard Burbage to the Stage
    move William Shakespeare to the Stage
    move Will Kemp to the Stage
    move the player to the Yard
  end after

  after the player entering while first-day
    phrase night-one
    change the story to second-day
    move Richard Burbage to the Stage
    move William Shakespeare to the Tiring-House
    move Will Kemp to the Yard
    move the player to the Yard
  end after

## -------------------------------------------------------------------- things

create the tiring-house door
  a door, openable, starts open, lockable with the tiring-house key, starts unlocked
  aka door, oak, stout

  A stout oak door between stage and tiring-house, usually left
  standing open so the book-holder can follow the lines.

create the tiring-house key
  in the Tiring-House
  aka key

  The tiring-house key, kept on a nail by the frame. Nobody has
  troubled to turn it since the house was raised.

create the play-book
  in the Tiring-House
  aka book, playbook, prompt-book, the play

  The play-book of Julius Caesar: the whole play in one fair copy,
  cued and annotated in the book-holder's hand. The Rose would pay
  its roof-lead for an hour alone with it.

  on the player taking while William Shakespeare is in the Tiring-House
    refuse book-guarded
  end on

create the property sword
  in the Stage
  aka sword, foil

  A property sword, wood beneath the silver paint. It has killed
  Caesar every morning this week.

create the galleries
  scenery
  in the Yard
  aka gallery, benches

  Three rings of galleries, the seats still smelling of sap. From up
  there a man could watch everything and be watched by no one.

create the plot-board
  scenery
  in the Stage
  aka plot, board

  The plot of Julius Caesar, scene by scene, hung by the tiring-house
  door. There is no clown's name anywhere on it.

create the property table
  scenery
  in the Tiring-House
  aka properties, table

  Crowns of paste, a bloody cloak for Caesar, wax daggers. The tools
  of seeming.

create a pot of ale
  in the Tavern
  aka ale, pot, leather, small

  Small ale in a leather pot, the tavern's one honest good.

## -------------------------------------------------------------------- player

create Nick Bray
  a person
  playable
  in the Yard

  A hired man, by your coat and your account of yourself. Under the
  coat, Henslowe's silver; under the account, Henslowe's errand.

## ------------------------------------------------------------------ Will Kemp

create Will Kemp
  a person, proper, very impulsive, vain
  aka kemp, will, the clown
  in the Yard
  mood cheerful
  temperament desire over fear
  states: settled, sworn
  feels devoted to the yard
  knows the-parting, witnessed, certain
  knows norwich-men, witnessed, certain
  spreads the-parting to anyone

  Will Kemp, the most famous man in any house he stands in, and lately
  the least easy. He watches the galleries as if counting friends.

  on every turn while second-day and Will Kemp knows the-blow-up, once
    change mood to stung
    phrase kemp-storms-off
      Burbage plants himself in front of Kemp, courteous as a
      headsman. "The Caesar jig is cut, Will. And the clowning within
      the play besides. Speak what is set down, or the house will
      manage its laughter without thee." The words are quiet; every
      wall hears them. Kemp stands very still for a man built of
      motion. Then he makes the company a low, perfect, poisonous
      bow, and walks out toward Bankside.
    move Will Kemp to the Tavern
  end on

define topics for Will Kemp
  about "the jig", "the dance", "the crowd":
    phrase kemp-on-the-jig
      "The play ends when the poet says. The AFTERNOON ends when I
      say." He rocks onto his toes. "They stay for the jig, friend.
      They tell their grandchildren about the jig."
  about "the play", "caesar", "julius caesar":
    phrase kemp-on-the-play
      "A Roman play." He says Roman the way other men say Lenten.
      "Grave men in bedsheets, stabbing their better. And not one
      part in it that smiles."
  about "the grievance", "his part", "the clown part", "leaving":
    phrase kemp-grievance
      The mirth drops off him like a mask coming down. "Set down for
      them, is what I am to speak now. SET DOWN. Seven years I filled
      this company's purse out of my own legs, and the new house has
      no room in it for Kemp." He looks at the unfinished galleries.
      "Well. Rooms can be found elsewhere."
  about "norwich", "the norwich men":
    phrase kemp-norwich-suspects when Will Kemp knows norwich
      "Norwich, is it." He does not laugh, which from Kemp is a
      thunderclap. "I know every man who ever jigged from here to
      Norwich, and I never once saw you among them. Whoever's coat
      you wear, friend, it is not that one."
    phrase kemp-norwich-tales
      "Norwich! There's a town that knows how to laugh. I could dance
      there and back and dine on the story for a year."
  about "burbage", "richard burbage":
    phrase kemp-on-burbage
      "A great man." He lets it sit exactly long enough. "He will be
      greater still when the house is empty enough to hear him."
  about "shakespeare", "william shakespeare", "the poet":
    phrase kemp-on-shakespeare
      "Will watches. Will writes what he watches. Say nothing near
      Will that you would not have spoken back to you from the stage
      in two years' time."
  about "the rose", "the admirals men", "henslowe", "the offer":
    refuse when the-blow-up is fresh: kemp-too-raw
    refuse when the-blow-up is recent: kemp-too-raw
    phrase kemp-rose-settled when the-defection is concluded
    phrase kemp-brushes-off
  about "the ale", "the drink", "the pot":
    phrase kemp-on-ale
      "Small ale for small hours." He drinks like a man toasting a
      full house anyway. "I have danced from London to Norwich on
      worse, friend, and been grateful to the barrel."
  about "the bear", "the bears", "the bear-baiting":
    phrase kemp-on-bears
      "The bear-garden!" He laughs at last, and means it. "My one
      true rival on this bank. A bear needs no poet, no book, and no
      REHEARSAL, and the yard loves him anyway. There is a lesson in
      that bear, and none of us will learn it."
end topics

define greetings for Will Kemp
  first time:
    phrase kemp-first-meeting
      The clown looks you over the way he looks over a crowd: all at
      once, and none of it missed. "A new face among the hired men.
      Well, the house eats faces. Kemp." He does not bow; the name is
      the bow.
  on return:
    phrase kemp-return
      Kemp marks you with a tilt of his head, already talking.
  on return, again so soon:
    phrase kemp-again-so-soon
      "Twice in one hour! Either I owe you money or you want some."
  on return, after days:
    phrase kemp-after-days
      "Still here? The little Henslowes of this world come and go,
      but you keep. I half like that."
  on leaving:
    phrase kemp-parting
      "Go on, then. The exits are the best part of any man's role."
end greetings

define manner for Will Kemp
  when Will Kemp is cheerful:
    beat "He sketches half a jig step on the spot, done before it began."
    beat "He pitches it up and out, playing you like a full yard."
    beat "He snaps his fingers at a passing thought and grins."
  when Will Kemp is stung:
    voice flat
end manner

define initiative for Will Kemp
  on an open floor, when Will Kemp is cheerful:
    phrase kemp-interjects
      "And here is where the clown speaks anyway," Kemp says, to no
      cue at all, "custom being custom."
  on an open floor, when Will Kemp is stung:
    hold their tongue
end initiative

## The defection is a conversation Kemp himself carries to its end once
## the storm has cooled: he opens it, he holds it against every other
## subject until it is settled, and settled is a fact the whole story
## can read afterward.

define conversation the-defection for Will Kemp, blocking
  about "the rose", "the admirals men", "henslowe", "the offer"
  opens when the grievance was discussed and the-blow-up is stale
  beat, when the grievance was discussed and the-blow-up is not fresh and the-blow-up is not recent:
    phrase kemp-hears-the-rose
  beat:
    phrase kemp-names-his-price
  beat:
    phrase kemp-bids-the-question
    then asks the-offer
  on refusing:
    phrase kemp-holds-the-thread
  on resuming:
    phrase kemp-takes-it-up
  conclusion:
    phrase kemp-concluded-sworn when Will Kemp is sworn
    phrase kemp-concluded-cooled
end conversation

define exchange the-offer for Will Kemp
  answer "yes", "aye", "sworn":
    phrase kemp-sees-through when Will Kemp knows norwich
      "Yes, he says. Plain as a bell." Kemp leans in, and the yard
      drops out of his voice entirely. "You are no more a Norwich man
      than I am a Roman, and only Henslowe's own would carry this
      errand. GOOD. A lie in the offer would have insulted me; a liar
      bearing it means the silver is real." He puts out his hand.
      "Tell Philip the clown is his. Sworn."
    phrase kemp-sworn
      Kemp takes your hand before the word is done. "Sworn, then. The
      Rose will have jigs again, and the Globe may keep its Romans."
    change Will Kemp to sworn
  answer "no", "never":
    phrase kemp-cools
      "No." He straightens, and the warmth goes out like a snuffed
      wick. "Then we have been two men passing an evening, and
      nothing said."
  on silence:
    phrase kemp-offer-silence
      Kemp watches you not answer, and nods slowly, as if silence
      were an old acquaintance of his. "Aye. It is a large thing to
      say out loud. I know it better than most."
  on leaving:
    phrase kemp-offer-leaving
      "Walk away, then," Kemp calls after you, light as a thrown
      knife. "But the question walks with you."
end exchange

## ------------------------------------------------------------ Richard Burbage

create Richard Burbage
  a person, proper, stubborn, slightly honest
  aka burbage, richard, the tragedian
  in the Stage
  mood calm
  temperament duty over desire
  feels devoted to the Stage
  feels trusts toward Will Kemp
  feels trusts toward William Shakespeare
  knows the-parting, witnessed, certain
  knows the-blow-up, witnessed, certain
  spreads the-blow-up and norwich to trusted

  Richard Burbage, who will be Brutus, carrying the new house on his
  back the way other men carry debt. His eyes take your measure and
  file it.

  goal run-the-lines, medium
    active when first-day
    say burbage-runs-one to the first hired man
    say burbage-runs-two to the first hired man
    say burbage-runs-three to the first hired man
  end goal

  goal cut-the-clown, high
    active when second-day
    seek Will Kemp
    move to the Stage
  end goal

define topics for Richard Burbage
  about "the play", "caesar", "julius caesar":
    phrase burbage-on-the-play
      "The first play in our own house." He looks up at the painted
      heavens as a man looks at a harvest. "It must land like a
      verdict. Nothing in it may wobble."
  about "kemp", "will kemp", "the clown":
    phrase burbage-on-kemp-conferred when Richard Burbage knows no-clown-part
      "There is no part for him. Will and I have turned it every way;
      the play will not take a clown, and Kemp will not take a play
      that will not take him." He says it like a man closing a ledger.
    phrase burbage-on-kemp
      "Kemp is the best-loved man in London." A beat, precisely
      weighted. "This is a tragedy we are mounting."
  about "norwich":
    phrase burbage-norwich-noted
      "So you said." The word goes into whatever ledger Burbage keeps
      behind his eyes. "Norwich men are punctual, at least. Be that."
  about "the house", "the globe", "the theatre":
    phrase burbage-on-the-house
      "We carried the timbers over the river ourselves, in the frost,
      with the landlord's lawyers howling. Every peg of this house is
      sworn to us. Mind you prove worth a peg."
  about "the grievance", "the quarrel":
    phrase burbage-on-the-quarrel
      "There is no quarrel." The door of his face closes. "There is a
      play, and there are those in it."
  about "the weather":
    phrase burbage-on-the-weather
      "The heavens are painted, hired man." He points one finger
      straight up at the stage roof. "Those are the only heavens
      whose weather concerns this company. Attend to them."
end topics

## On opening morning Burbage drills every hired man in his business,
## the false one included, and will not be moved off the subject until
## he is done: interrupt him and he simply says it again, word for
## word, until it is heard.

define conversation the-drilling for Richard Burbage, blocking
  about "my part", "the part", "my cue", "the entrance", "my business"
  opens when third-day
  beat, when third-day:
    phrase burbage-drills-the-entrance
  beat:
    phrase burbage-drills-the-cue
  on resuming:
    phrase burbage-drills-again
  conclusion:
    phrase burbage-drills-done
end conversation

define greetings for Richard Burbage
  first time:
    phrase burbage-first-meeting
      The tragedian stops mid-thought and turns the whole of his
      attention on you, which is like standing where the light falls.
      "I do not know your face."
    then asks who-are-you
  on return:
    phrase burbage-return
      Burbage gives you a spare nod, a man with a play to carry.
  on return, again so soon:
    phrase burbage-again-so-soon
      "Again. Hired men who hover are either idle or listening, and I
      have no use for either."
  on return, after days:
    phrase burbage-after-days
      "You are still with us. Days now. Then make yourself of use."
  on leaving:
    phrase burbage-parting
      Burbage has already turned back to the work before you are off
      the boards.
end greetings

define manner for Richard Burbage
  when Richard Burbage is calm:
    beat "He keeps half his attention on the stage even now, walking the play in his head."
    beat "He weighs the words before he spends them, like coin."
  when Richard Burbage is angry:
    voice iron
end manner

define initiative for Richard Burbage
  on an open floor:
    hold their tongue
  on harm:
    phrase burbage-on-violence
      "NOT on these boards." Burbage crosses the stage in three
      strides and stands where the trouble is, immovable as the
      pillars. "This house opens in days. Whatever quarrel you have
      brought into it, it leaves by the same door you did."
end initiative

define exchange who-are-you for Richard Burbage, blocking
  answer "norwich", "a norwich man", "from norwich":
    phrase burbage-takes-norwich
      "Norwich." He turns the word over once, finds it ordinary, and
      hands it back. "Well, the provinces keep better discipline than
      the town. See you bring it with you." The full weight of his
      attention releases you, mostly.
  answer "henslowe", "the rose", "henslowes man":
    phrase burbage-unmasked
      The stage goes very quiet. "Henslowe's man. In my tiring-house,
      in my company, in my HOUSE." He does not raise his voice; the
      house raises it for him. Two hired men take your arms, and
      Bankside takes you back the way it takes all spoiled goods.
    lose unmasked-lose
  on silence:
    phrase burbage-takes-silence
      Burbage lets your silence stand exactly as long as it takes to
      become an answer of its own. "A man with no account of himself
      is an account of himself. I will be watching you."
  on leaving:
    phrase burbage-calls-after
      "The question keeps, hired man," Burbage says to your back,
      unhurried. "I ask it once more the next time you cross my
      stage."
end exchange

## -------------------------------------------------------- William Shakespeare

create William Shakespeare
  a person, proper, cunning, slightly honest
  aka shakespeare, will shakespeare, the poet
  in the Tiring-House
  mood calm
  temperament duty over fear
  feels trusts toward Richard Burbage
  knows the-parting, witnessed, certain
  knows no-clown-part, witnessed, certain
  thinks the stranger is henslowes, suspects, inferred
  spreads no-clown-part to trusted

  William Shakespeare, at the property table with ink on his second
  finger, doing what he is always doing: watching, and not saying
  what he sees.

  goal confer-on-kemp, medium
    active when second-day and Will Kemp is in the Tavern
    seek Richard Burbage
    say shakespeare-confers to Richard Burbage
  end goal

create the pen
  scenery
  in the Tiring-House
  
  Ink-tipped and well-used.

define topics for William Shakespeare
  about "the play", "caesar", "julius caesar":
    phrase shakespeare-on-the-play
      "It is about a man who is killed by men who love him, for the
      love of something larger. Whether they were right is the play.
      If I have done it well, you will leave arguing."
  about "kemp", "will kemp", "the clown":
    phrase shakespeare-on-kemp-open when the-parting was discussed
      "You have heard, then." He sets down the pen. "Will is the
      best clown of the age, and I have written a play with no room
      in it for the age's best clown. Both of those are true, and no
      third thing makes them easy."
    phrase shakespeare-on-kemp-quiet
      "Kemp is Kemp." The pen does not stop. "The yard loves him.
      That is not a small thing, whatever the wits say."
  about "the book", "the play-book", "the papers":
    phrase shakespeare-book-settled when the-suspicion is concluded
    phrase shakespeare-on-the-book
  about "the grievance", "the quarrel":
    phrase shakespeare-on-the-quarrel
      "Men outgrow one another. It is nobody's villainy, and it
      plays like everyone's." He almost smiles. "I may use that."
  about "the weather":
    phrase shakespeare-on-the-weather
      "It rains on the just and the unjust, and worst on the
      thatch." He does not look up. "You did not cross the yard to
      ask me of weather, but I note that you wish me to think so."
end topics

## The poet's suspicion is a conversation he is content to let drift
## and always returns to: every talk of the book picks up where the
## last one left off, across days if it must, until he has read the
## hired man to the end.

define conversation the-suspicion for William Shakespeare, passive
  about "the book", "the play-book", "the papers"
  beat:
    phrase shakespeare-marks-the-turn when the subject changes
      "You steer," Shakespeare says mildly, marking how the talk has
      bent toward the company's papers, the way a pilot marks a
      current. "Whatever we begin with, we end at that book."
    phrase shakespeare-on-the-book
      The pen stops. "The book stays in this room. A play can be
      stolen out of men's mouths line by line, badly. Whole, and
      fair, and cued, it need only be carried." He looks at you for
      slightly too long. "So it is not carried."
    then asks the-plain-question
  beat:
    phrase shakespeare-reads-you
  beat:
    phrase shakespeare-names-the-cost
  on parting:
    phrase shakespeare-lets-it-lie
  on resuming:
    phrase shakespeare-takes-it-up
  conclusion:
    phrase shakespeare-shuts-the-book
end conversation

define greetings for William Shakespeare
  first time:
    phrase shakespeare-first-meeting
      The poet marks you without seeming to look up. "The new hired
      man." It is not a question; nothing he says to you will be.
  on return:
    phrase shakespeare-return
      Shakespeare acknowledges you with the pen, not the eyes.
  on return, again so soon:
    phrase shakespeare-again-so-soon
      "Back so soon. You wear a path, hired man; paths get read."
  on return, after days:
    phrase shakespeare-after-days
      "Days among us now. Faces settle in faster than accounts do."
  on leaving:
    phrase shakespeare-parting
      The pen resumes before the door has done swinging.
end greetings

define manner for William Shakespeare
  when William Shakespeare is calm:
    beat "He listens the way other men aim."
    beat "The pen keeps moving; some of what it writes is you."
  when William Shakespeare is anxious:
    voice low
end manner

define initiative for William Shakespeare
  on an open floor:
    hold their tongue
end initiative

define exchange the-plain-question for William Shakespeare
  answer "a hired man", "nobody", "my own man":
    phrase shakespeare-takes-nobody
      "A hired man." He writes something short. "London is full of
      nobody. It is the most crowded parish in England." The pen
      moves on, and so, apparently, may you.
  answer "a spy", "a thief":
    phrase shakespeare-takes-jest
      "A spy." The pen does not pause. "The first true answer ever
      given in this room, and given in jest, which is how truth
      usually travels. I have no more questions for the present."
    leave
  answer "henslowe", "the rose", "henslowes man":
    phrase shakespeare-takes-truth
      The pen stops entirely. "Thank you," he says at last, "for the
      one honest sentence this house has heard all week." He does not
      call for Burbage. He watches you the way a man watches weather
      that concerns some other county. "I will not spend it today.
      Mind me, though: I keep what I am given."
  on silence:
    phrase shakespeare-reads-silence
      Your silence goes into him like a line he means to keep.
      "Just so," he says, softly. "The men who answer that question
      quickest are the ones lying. You I shall have to read the long
      way."
  on leaving:
    phrase shakespeare-question-keeps
      "It is not a door you can leave by, that question," he says to
      your back, mild as milk.
end exchange

## --------------------------------------------------------------- background

create the first hired man
  a person
  aka hired man
  in the Stage

  A hired man with a mended sleeve, holding a spear he has not yet
  been taught to hold. He keeps to the edges of the boards.

create the boy player
  a person
  aka boy, apprentice
  in the Tiring-House

  The company's boy, being sewn into Portia's gown an inch at a
  time. He watches everything with a magpie's eye.

## ------------------------------------------------------- day-and-goal phrases

define phrase night-one
  Night takes Bankside. You lie on the pallet composing your report
  to Henslowe in your head, and the house's first day of rehearsal
  turns over into its second. Morning finds you back at the Globe,
  in the yard, with two days left.
end phrase

define phrase night-two
  The second night. Across the river the city sleeps easy; on this
  bank, nobody does. Morning comes cold and clear: the last day of
  rehearsal. Tomorrow, Caesar opens the Globe, and everything not
  carried across Bankside by then stays here for good.
end phrase

define phrase book-guarded
  Shakespeare's hand arrives on the play-book a half-second before
  yours, without hurry, as if it had always been on its way there.
  "No," he says, pleasantly.
end phrase

define phrase burbage-runs-one
  "BE PATIENT TILL THE LAST." Burbage walks the line out along the
  boards, testing the new house's ear. "Romans, countrymen, and
  lovers, hear me for my cause."
end phrase

define phrase burbage-runs-two
  "Not that I loved Caesar less," Burbage tells the empty galleries,
  "but that I loved Rome more." He holds the pause, listening to
  where the words land in the timber.
end phrase

define phrase burbage-runs-three
  "As he was valiant, I honour him. But, as he was ambitious, I slew
  him." Burbage lets the line die clean, then nods once at the house,
  satisfied with its acoustics if nothing else.
end phrase

define phrase shakespeare-confers
  Shakespeare draws Burbage aside by the pillar, voice pitched for
  one hearer. "There is no clown's part in Caesar because I could
  make none that did not cheapen the killing. If Will goes, he goes
  because the work turned, not because we did. I would have him know
  that much, someday, from one of us."
end phrase

define phrase kemp-too-raw
  Kemp's head comes round before the sentence is done. "Not NOW,
  friend." The voice is dead level, which from Kemp is shouting.
  "Ask me of roses and Henslowes some other hour, when the boards
  have cooled."
end phrase

define phrase kemp-hears-the-rose
  Kemp turns the pot once in his hands and looks south, over the
  tavern roof, toward where the Rose sits across Bankside with its
  old boards and its faithful yard. "The Rose," he says, low, as if
  the word had been sitting between you this whole while. "Say what
  you came to say, then. All of it, plainly. And understand me,
  friend — once begun, this is the only talk I have in me until it
  is finished."
end phrase

define phrase kemp-names-his-price
  "Hear my price before you name Philip's." He counts it off on his
  fingers, showman even now. "The jig restored, every afternoon, at
  MY length. My name on the bills, big as the play's. And no poet's
  set-down-for-them in my scenes — the yard writes my lines with me,
  fresh, every house." He leans back. "Cheap, for what walks out of
  this company when I do."
end phrase

define phrase kemp-bids-the-question
  "Well. You know what I am owed and you know what I am worth, which
  puts you ahead of this company on both counts." He sets the pot
  down and gives you the whole of his attention, a thing crowds pay
  for. "So ask it. Ask me the question Philip sent across the river
  in your mouth."
end phrase

define phrase kemp-holds-the-thread
  "No, friend." The word comes down flat as a trapdoor. "You opened
  the Rose with me, and the Rose we finish. THIS first; the rest of
  the world after."
end phrase

define phrase kemp-takes-it-up
  "Where were we." It is not a question; Kemp has never once lost
  his place. "Aye — the Rose, and what is owed to Kemp."
end phrase

define phrase kemp-concluded-sworn
  "Done, then, and done plainly." He claps his hands once, the sound
  of a house letting go its breath. "Tell Philip: the clown comes to
  the Rose, jigs and all, and the Globe may bury its Caesar with
  full honours. This talk is finished, friend — and finished WELL."
end phrase

define phrase kemp-concluded-cooled
  "Then it is finished." He says it lightly, and the lightness is
  the armour. "The Rose was asked, and the Rose was answered, and
  Kemp keeps his own counsel from here. We shall not speak of it
  again."
end phrase

define phrase kemp-rose-settled
  "That matter is settled, friend." He waves it away with a
  flourish, the showman's full stop. "Ask the tavern; they will
  ballad it soon enough."
end phrase

define phrase kemp-brushes-off
  "The Rose!" Kemp waves it off with a flourish that lands nowhere.
  "Henslowe's old barn. Why would Kemp look south, friend? Kemp is of
  the Globe." The line arrives a half-beat too quick, like a cue
  snatched early.
end phrase

## ------------------------------------------------- suspicion-thread phrases

define phrase shakespeare-reads-you
  "I have been watching what you look at." The pen keeps moving; it
  is you it writes. "Kemp, when the talk is of Kemp. The door, when
  the talk is of doors. And the property table, hired man, whenever
  the talk is of anything else. A man's eyes keep his true accounts."
end phrase

define phrase shakespeare-names-the-cost
  "Understand what the book is." He lays his hand flat on the pages,
  lighter than Burbage would, heavier than it looks. "Two years of
  my nights, the company's whole season, and the only fair copy in
  the world. The man who carries it across the river carries every
  supper this house will eat next winter. I want you to know the
  weight of it — whoever you are — before your hands do."
end phrase

define phrase shakespeare-lets-it-lie
  Shakespeare lets the subject go the way a fisherman pays out
  line — without hurry, and without letting go of the end.
end phrase

define phrase shakespeare-takes-it-up
  "The book, then. Again." The pen rests. "You always come back to
  it, and so I shall always come back to you. Where were we."
end phrase

define phrase shakespeare-shuts-the-book
  "There. Now we have read each other to the end." He looks at you
  fully for the first time, and it is like being quoted. "I know
  what you are, or near enough, and you know the book's weight, and
  each of us knows the other knows. That is where this talk ends —
  whatever you do next, do it knowing it is watched."
end phrase

define phrase shakespeare-book-settled
  "We have finished with the book, you and I." The pen does not
  pause. "Everything after this is not talk; it is testimony."
end phrase

## -------------------------------------------------- drilling-thread phrases

define phrase burbage-drills-the-entrance
  Burbage plants you on your mark with two fingers on your shoulder,
  as if setting a property in its place. "Attend. You enter with the
  second citizens, stage left, spear UP — this is a forum, not a
  hedgerow. You stand where I set you and you look at Caesar. Not at
  the house. Caesar."
end phrase

define phrase burbage-drills-the-cue
  "Your cue is 'Peace, ho! Caesar speaks.'" He gives the line its
  full weight, and the boards give it back. "Not before, on pain of
  my attention. Not after, on pain of the same. The house opens
  TODAY, and today every man in it is exactly where the play says he
  is."
end phrase

define phrase burbage-drills-again
  "As I was saying — and I say it once more because it was not
  finished." Burbage picks the drill up exactly where it stopped, a
  man who has never in his life lost a cue.
end phrase

define phrase burbage-drills-done
  "Good." One nod, the full wage of Burbage's approval. "Be where
  the play says. Do what the play says. Tonight the house learns
  what we are — see it does not learn it from your mistakes."
end phrase

## ----------------------------------------------------------- ending phrases

define phrase ides-won
  You lie down over the loose board with the play-book beneath it and
  the clown's handshake still warm in your palm. Tomorrow Caesar
  opens the Globe to a house with no jig at the end of it; within the
  month, the Rose will play a Caesar of its own, and Kemp will dance
  till the galleries shake. Henslowe pays in full, for once, and asks
  no questions, which from Henslowe is a knighthood. Nobody at the
  Globe ever learns your name; you were a hired man, and the house
  eats faces.
end phrase

define phrase ides-no-book
  Kemp is sworn, and Henslowe is glad of him, and pays half. The
  play-book stayed in the tiring-house under the poet's inkstained
  hand, and by the month's end all London is talking of the Globe's
  Caesar, from which the Rose must sit and profit nothing. Half an
  errand, Henslowe observes, is a whole man's wages wasted.
end phrase

define phrase ides-no-kemp
  The book crosses Bankside under your coat, and Henslowe turns its
  pages like a man counting another man's money. But Kemp stays
  unsworn, and a Caesar without an audience-beloved clown to bring
  them in is just a play, at a house nobody yet loves. Henslowe pays
  half, and reminds you which half you failed.
end phrase

define phrase ides-nothing
  Opening night, and you carry to Henslowe exactly what you arrived
  with: a coat, an account of yourself, and nothing. The Globe keeps
  its book and, for a season more at least, its clown. Henslowe's
  arithmetic on the subject of your wages is brief and total.
end phrase

define phrase unmasked-lose
  Bankside is not wide, but it has never seemed wider than it does
  from the wrong side of the Globe's doors, with the company's eyes
  on your back and Henslowe's silver still sewn in your coat. The
  Admiral's Men will hear of it by supper. Henslowe does not pay for
  a burned man.
end phrase

before the game starts
  change the player to Nick Bray
end before
