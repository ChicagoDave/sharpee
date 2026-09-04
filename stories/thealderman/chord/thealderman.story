story
  title: The Alderman
  authors:
    David Cornelson
  id: thealderman
  ifid: 0A04F181-78BF-477D-852D-4DE0BDF8C034
  story-version: 0.2.0
  description: Six suspects, one hotel, one dead alderman.

## ADR-310 D18 — the incremental Chord port of stories/thealderman.
## This file grows with the implementation the way Fernhill grew alongside
## Chord: Phase 3 landed the DESCRIPTIVE layer (translated from
## src/npcs/index.ts, the ConversationBuilder reference implementation);
## Phase 4 added the normative layer (ADR-318, translated from the docs/
## design.md psychology sections); Phase 6 completes the port (topics,
## response rows, evidence, the accusation) and retires the TS builder.
##
## Phase 6 rulings (David, 2026-08-15):
## - The Clue-style randomization and deduction-board interface are
##   REMOVED. This is a normal murder mystery with one fixed authored
##   solution: VIOLA WAINRIGHT, with the CURTAIN CORD, in the BALLROOM.
##   The body was moved to Room 302; the ballroom holds the tells.
## - This story is a Chord test vehicle; content is authored as needed
##   (content-authority ruling). design.md's cast, relationships, and
##   per-suspect secrets are the base; each innocent suspect's secret is
##   a red herring with an intact alibi.
##
## Translation rules (Phase 4 — source: docs/design.md Psychology lines):
## - A secret entrusted by Stephanie -> `confided` on the knows line
##   (John's business arrangement; Catherine's knowledge of Viola, as
##   executor and closest friend) + `never betrays a confidence`.
## - "The family secret eats at her" (Viola) -> `burdened by half-sister`.
## - "Cold, calculating, professional" (John) -> named temperament
##   `professional` (duty over fear and desire).
## - "Fiercely protective" (Catherine) -> inline `duty over fear`;
##   protects Chelsea (maternal + the locket suspicion).
## - "Loud, brash, dominates every room / underneath the bluster,
##   genuinely terrified" (Jack) -> `honor before anyone` + inline
##   `honor over fear` (D7's brazen-it-out shape).
## - "Practiced liar... charm and wit as armor" (Viola) -> inline
##   `desire over fear`.
## - "Omits information out of fear, not malice" + honest (Chelsea) ->
##   `never lies` WITHOUT `answers honestly` (evasion satisfies the
##   principle — exactly ADR-318 D4's distinction).
## - Ross carries no normative line: hot temper and fear rule him — the
##   D2 intensity default IS his characterization.
##
## Translation rules (Phase 3):
## - `witnessed: true` knowledge -> `witnessed`; non-witnessed -> `told`
##   (suspicions from the retired believes() map -> `inferred, suspects`).
## - `cognitiveProfile('stable')` -> `clear-headed` (ADR-310 D5 rename).
## - loyalTo -> devoted to; distrusts -> wary of.
## - Non-platform personality/mood words become `define` custom vocabulary
##   (Option 2, David 2026-08-15) rather than being silently re-mapped.
## - `selective` propagation -> listing (D10: listing IS selectivity);
##   `withholds` blacklists restate as whitelists of the remaining topics.
##
## Translation rules (Phase 6):
## - Response chains (`.when().if().tell/.lie/.refuse`) -> topic-row
##   bodies: `phrase X when <condition>` ladders, `refuse when` for hard
##   refusals; `.lie()` lines -> phrases carrying `claims` tags (D9), so
##   the lie ledger mints and pins through the topic dispatch.
## - Confided secrets gate through the reveal arbitration (D4): asking
##   John or Catherine about their confided topics arbitrates duty
##   against fear; the row is suppressed on refuse (the action's default
##   reply is the evasion).
## - `.on('player accuses')` mood triggers -> the `accusable` dispatch
##   trait (one clause, `select on verdict`; per-suspect composition
##   `accusable with verdict …` — the zoo idiom).
##
## NOT expressible in Chord (carried to ADR follow-up, unchanged from
## Phase 3/4 flags): propagation pace/coloring/withholds words; goal
## turn-count waits (ADR-316); opportunistic/prepared pursuit modes,
## interruptedBy, per-step witnessed phrases; influence schedules,
## lingering durations, disposition and propagation effects (Jack's
## hush-money influence is omitted); resist-excepts that are not
## `from <someone>` (Chelsea's `alone with jack`).

## ---------------------------------------------------------------- vocabulary

define personality defensive
define personality deceptive
define personality charming
define personality bitter
define personality guarded
define personality cold
define personality intelligent
define personality observant
define personality protective
define personality warm
define personality aggressive
define personality dishonest
define personality nervous

define mood composed like calm
define mood concerned like anxious, but stiller
define mood agitated like anxious, but restless
define mood fearful like anxious, but darker

define temperament professional
  duty over fear
  duty over desire
end temperament

## --------------------------------------------------------------------- facts
## The fixed solution and the suspects' deniable secrets (ADR-310 D14).
## A fact's closed value set is the compile-time check on every claims
## tag and thinks line below.

define fact the killer
  Ross Bielack, Viola Wainright, John Barber, Catherine Shelby, Jack Margolin, Chelsea Sumner, nobody
end fact

define fact the whereabouts
  theatre, ballroom
end fact

define fact the debts
  paid, owed
end fact

define fact the solvency
  sound, ruined
end fact

## --------------------------------------------------------------------- rooms

create the Foyer
  a room
  north to the Staircase
  east to the Bar
  west to the Restaurant
  south to the Ballroom

  The hotel foyer. Marble floors, a cold fireplace with an iron poker on
  its hook, and the murmur of a hotel pretending nothing has happened.
  The ballroom doors stand south; the bar is east, the restaurant west,
  and the grand staircase climbs north.

create the Bar
  a room
  west to the Foyer

  The hotel bar, all dark wood and low light. Bottles glitter behind the
  counter. The foyer is back west.

create the Ballroom
  a room
  north to the Foyer

  The ballroom, dressed for a reception that never happened. A music
  stand lies toppled by the stage, and near it a dark stain has soaked
  into the parquet. The tall stage curtain hangs crooked. The foyer is
  north.

create the Restaurant
  a room
  east to the Foyer
  north to the Kitchen

  White tablecloths and upturned chairs. The kitchen is north; the foyer
  is east.

create the Kitchen
  a room
  south to the Restaurant

  Clean and ready for a morning prep that no one has started. Every
  knife sits in its block. The restaurant is south.

create the Staircase
  a room
  south to the Foyer
  north to Room Three-Oh-Two
  east to Room Three-Oh-Eight

  The grand staircase, carpeted in red. Room 302 is north along the
  third-floor landing; Jack Margolin's suite, 308, is east. The foyer is
  below, south.

create Room Three-Oh-Two
  a room
  south to the Staircase

  Stephanie Bordeau's room. It is tidy — too tidy. Nothing here says
  struggle; everything says arranged. The landing is south.

create Room Three-Oh-Eight
  a room
  west to the Staircase

  Jack Margolin's suite: cigar smoke, ledgers, and a nightstand with a
  half-open drawer. The landing is west.

## ------------------------------------------------------------------ evidence

create the stage curtain
  scenery
  in the Ballroom
  aka curtain

  Heavy velvet, hanging crooked. The tie-back cord has been torn away —
  the ripped stub still dangles from its ring.

create the dark stain
  scenery
  in the Ballroom
  aka stain

  A dark stain soaked into the parquet near the toppled music stand.
  Someone scrubbed at it and gave up.

create the curtain cord
  starts in Room Three-Oh-Two
  aka cord

  A silk curtain tie-back, frayed at one end where it was torn from its
  ring. It has been coiled and tucked behind the wardrobe, and it did
  not come from this room.

create the theatre program
  in the Foyer
  aka program

  A program from McVicker's Theatre, dropped near the ballroom doors.
  The evening rehearsal of The Winter Rose is printed plainly: eight
  until NINE o'clock.

## -------------------------------------------------------------------- people

create Alex
  a person
  playable
  in the Foyer

  A house detective with a notebook.

create Stephanie Bordeau
  a person, proper
  starts in Room Three-Oh-Two

  The late owner of the Alderman Hotel, laid out on her own bed. Whoever
  brought her here arranged her carefully — but the thin bruised line
  across her throat was made by something narrow and strong, and there
  is no sign of it having happened in this room.

## ------------------------------------------------------------- Ross Bielack

create Ross Bielack
  a person, proper, very impulsive, defensive, slightly honest
  aka ross, ballplayer
  accusable with verdict wrong-ross
  in the Bar
  mood anxious
  feels devoted to Stephanie Bordeau
  feels dislikes toward Jack Margolin
  feels wary of John Barber
  knows stephanie-death, told, certain
  knows gambling-debts, witnessed, certain
  knows stephanie-lover, witnessed, certain
  knows jack-shady, inferred, suspects
  thinks the debts is owed, certain, witnessed
  cognitive-profile clear-headed
  spreads stephanie-death to anyone

  influence intimidation, active, proximity
    makes mood nervous
    makes threat wary
    phrase ross-intimidates on witnessed
    phrase ross-intimidation-resisted on resisted
  end influence

  A broad-shouldered man in his late twenties with calloused hands and an uneasy smile. He smells faintly of whiskey.


define topics for Ross Bielack
  about "stephanie", "stephanie bordeau", "the murder", "the victim":
    refuse when Ross Bielack is threatened: ross-stephanie-angry
    phrase ross-stephanie-sad
  about "the relationship", "the lover", "the romance":
    phrase ross-relationship-admits when Ross Bielack is not threatened
    phrase ross-relationship-deflect
  about "gambling", "the gambling debts", "gambling-debts", "the money":
    phrase ross-gambling-truth when Ross Bielack feels trusts toward the player
    phrase ross-gambling-denies
  about "the alibi", "last night", "the evening":
    phrase ross-alibi-bar
  about "jack", "jack margolin", "margolin":
    phrase ross-jack-opinion
end topics

## ---------------------------------------------------------- Viola Wainright

create Viola Wainright
  a person, proper, very deceptive, charming, bitter
  aka viola, actress
  accusable with verdict guilty
  in the Ballroom
  mood composed
  states: denying, confessed
  feels devoted to Viola Wainright
  feels dislikes toward Stephanie Bordeau
  feels wary of Catherine Shelby
  knows stephanie-death, told, certain
  knows half-sister, witnessed, certain
  knows inheritance-cut-out, witnessed, certain
  knows catherine-knows-secret, inferred, suspects
  thinks the killer is Viola Wainright, certain, witnessed
  thinks the whereabouts is ballroom, certain, witnessed
  cognitive-profile clear-headed
  spreads stephanie-death and hotel-gossip to trusted
  temperament desire over fear
  burdened by half-sister

  A striking woman in her mid-thirties with dark eyes and an actress's poise. Every gesture seems rehearsed.


## Seam 6 (ADR-318 amendment): breaking is weather; being broken is a
## state. The platform forgets the crack — permanence is authored in the
## confession outlet itself (`change it to confessed`, the D3 ratchet),
## and the post-confession voice hangs off the `confessed` state.

define topics for Viola Wainright
  about "stephanie", "stephanie bordeau":
    phrase viola-stephanie-fond
  about "the family", "the half sister", "half-sister", "the sister":
    phrase viola-family-owns when Viola Wainright is confessed
    phrase viola-family-denies
  about "the alibi", "the theatre", "the rehearsal", "last night":
    phrase viola-alibi-dropped when Viola Wainright is confessed
    phrase viola-alibi-rehearsal
  about "the inheritance", "the fortune":
    phrase viola-inheritance-cool
  about "the program", "the theatre program":
    change mood to fearful
    phrase viola-program-caught
  about "the killer", "the murder":
    phrase viola-killer-confessed when Viola Wainright is confessed
    phrase viola-killer-denies
  about "the truth":
    change Viola Wainright to confessed when Viola Wainright is breaking
    phrase viola-confesses when Viola Wainright is breaking
    phrase viola-stands-by-it when Viola Wainright is confessed and Viola Wainright is not breaking
    phrase viola-truth-deflect
end topics

## -------------------------------------------------------------- John Barber

create John Barber
  a person, proper, very guarded, cold, intelligent
  aka john, enforcer
  accusable with verdict wrong-john
  in the Bar
  mood calm
  feels wary of the player
  feels dislikes toward Jack Margolin
  feels devoted to Stephanie Bordeau
  knows stephanie-death, told, certain
  knows business-arrangement, witnessed, certain, confided
  knows enforcement-work, witnessed, certain
  cognitive-profile clear-headed
  spreads nothing
  never betrays a confidence
  temperament professional

  goal destroy-evidence, high
    active when John Barber is not calm
    move to Room Three-Oh-Two
    act john-searches-room
  end goal

  influence menace, passive, room
    makes mood nervous
    makes threat wary
    phrase john-menace-noticed on witnessed
    phrase john-menace-lifted on expired
  end influence

  A lean man in a perfectly tailored suit. He watches everything with flat, appraising eyes.


define topic John Barber betrays a confidence as johns-slip

define topics for John Barber
  about "the business arrangement", "business-arrangement", "the arrangement", "the business":
    phrase john-business-reveal
  about "stephanie", "stephanie bordeau":
    phrase john-stephanie-respect
  about "the alibi", "the docks", "last night":
    phrase john-alibi-docks
  about "jack", "jack margolin", "margolin":
    phrase john-jack-flat
end topics

## --------------------------------------------------------- Catherine Shelby

create Catherine Shelby
  a person, proper, very observant, honest, protective, warm
  aka catherine, hostess
  accusable with verdict wrong-catherine
  in the Restaurant
  mood concerned
  feels devoted to Stephanie Bordeau
  feels likes toward Chelsea Sumner
  feels likes toward the player
  feels wary of Jack Margolin
  feels wary of John Barber
  knows stephanie-death, told, certain
  knows executor-of-will, witnessed, certain
  knows viola-secret, witnessed, certain, confided
  knows ross-at-bar, witnessed, certain
  knows jack-debts, told, suspects
  knows chelsea-locket, witnessed, suspects
  knows john-business, told, suspects
  cognitive-profile clear-headed
  spreads stephanie-death and ross-at-bar and jack-debts and chelsea-locket and john-business to anyone
  never betrays a confidence
  protects Chelsea Sumner
  temperament duty over fear

  A handsome woman in her fifties with sharp eyes behind wire-rimmed spectacles. She moves through the restaurant like she owns it.


define topics for Catherine Shelby
  about "the viola secret", "viola-secret", "violas secret":
    phrase catherine-viola-secret-reveal
  about "viola", "viola wainright", "the actress":
    phrase catherine-viola-guarded
  about "stephanie", "stephanie bordeau":
    phrase catherine-stephanie-grief
  about "the will", "the estate":
    phrase catherine-will-executor
  about "ross", "ross bielack":
    phrase catherine-ross-alibi
  about "chelsea", "chelsea sumner":
    phrase catherine-chelsea-protective
  about "jack", "jack margolin", "margolin":
    phrase catherine-jack-debts
  about "john", "john barber":
    phrase catherine-john-suspects
  about "the alibi", "last night":
    phrase catherine-alibi-restaurant
  about "the guests", "the hotel":
    phrase catherine-guests-gossip
end topics

## ------------------------------------------------------------ Jack Margolin

create Jack Margolin
  a person, proper, very aggressive, dishonest, cowardly
  aka jack, mogul
  accusable with verdict wrong-jack
  starts in Room Three-Oh-Eight
  mood agitated
  feels dislikes toward the player
  feels dislikes toward John Barber
  feels wary of Stephanie Bordeau
  knows stephanie-death, told, certain
  knows property-debt, witnessed, certain
  knows hotel-deed, witnessed, certain
  thinks the solvency is ruined, certain, witnessed
  cognitive-profile clear-headed
  spreads stephanie-death to anyone
  honor before anyone
  temperament honor over fear

  influence bullying, active, targeted
    makes mood nervous
    phrase jack-bullies on witnessed
    phrase jack-bullying-resisted on resisted
  end influence

  A heavyset man with a red face and a diamond stickpin. He fills every room he enters with sheer volume.


define topics for Jack Margolin
  about "the property", "the property debt", "property-debt", "the debt":
    phrase jack-property-broke when Jack Margolin is cornered
    phrase jack-property-denies
  about "stephanie", "stephanie bordeau":
    phrase jack-stephanie-bluster
  about "the hotel", "the deed":
    phrase jack-hotel-brags
  about "the alibi", "room service", "last night":
    phrase jack-alibi-room-service
end topics

## ----------------------------------------------------------- Chelsea Sumner

create Chelsea Sumner
  a person, proper, honest, very nervous, curious
  aka chelsea, cigarette girl
  accusable with verdict wrong-chelsea
  in the Foyer
  mood fearful
  feels likes toward Catherine Shelby
  feels likes toward the player
  feels wary of John Barber
  feels wary of Jack Margolin
  knows stephanie-death, told, certain
  knows locket-photo, witnessed, certain
  knows possible-daughter, told, suspects
  knows catherine-knows-truth, inferred, suspects
  cognitive-profile clear-headed
  spreads stephanie-death to trusted
  never lies

  goal seek-truth, high
    seek Catherine Shelby in the Restaurant
    say chelsea-asks-catherine to Catherine Shelby
  end goal

  resists bullying

  A young woman in her early twenties with auburn hair and anxious green eyes. She carries a tray of cigarettes and matches.


define topics for Chelsea Sumner
  about "the locket", "the locket photo", "locket-photo":
    phrase chelsea-locket-admits when Chelsea Sumner feels likes toward the player
    phrase chelsea-locket-clutch
  about "the mother", "the daughter":
    phrase chelsea-mother-evades
  about "stephanie", "stephanie bordeau":
    phrase chelsea-stephanie-grief
  about "the alibi", "the rounds", "last night":
    phrase chelsea-alibi-rounds
  about "catherine", "catherine shelby":
    phrase chelsea-catherine-warm
end topics

## ---------------------------------------------------------- the accusation

define counter accusations between 0 and 3

define action accusing
  grammar
    accuse the suspect
  the suspect must be reachable
  refuse without suspect: accuse-whom
  otherwise refuse accuse-not-suspect

  phrases en-US
    accuse-whom:
      Accuse whom?
    accuse-not-suspect:
      {capitalize the suspect} {verb:isn't suspect} a suspect in this case.

define trait accusable
  data
    verdict: one of guilty, wrong-ross, wrong-john, wrong-catherine, wrong-jack, wrong-chelsea

  on the player accusing
    win viola-guilty when verdict is guilty
    select on verdict
      when wrong-ross
        raise accusations by 1
        change mood to furious
        phrase accuse-ross-wrong
        lose case-collapsed when accusations is at least 3
      when wrong-john
        raise accusations by 1
        phrase accuse-john-wrong
        lose case-collapsed when accusations is at least 3
      when wrong-catherine
        raise accusations by 1
        phrase accuse-catherine-wrong
        lose case-collapsed when accusations is at least 3
      when wrong-jack
        raise accusations by 1
        change mood to furious
        phrase accuse-jack-wrong
        lose case-collapsed when accusations is at least 3
      when wrong-chelsea
        raise accusations by 1
        phrase accuse-chelsea-wrong
        lose case-collapsed when accusations is at least 3
    end select
  end on
end trait


## -------------------------------------------------------------- NPC phrases

define phrase ross-intimidates
  Ross squares his shoulders.
end phrase

define phrase ross-intimidation-resisted
  The look slides right off.
end phrase

define phrase john-searches-room
  Papers rustle somewhere above.
end phrase

define phrase john-menace-noticed
  The room gets quieter around John Barber.
end phrase

define phrase john-menace-lifted
  The weight of John Barber's attention lifts as you go.
end phrase

define phrase jack-bullies
  Jack leans in, too close.
end phrase

define phrase jack-bullying-resisted
  The bluster breaks like a wave.
end phrase

define phrase chelsea-asks-catherine
  Chelsea leans toward Catherine, voice low.
end phrase

## ------------------------------------------------------ conversation: Ross

define phrase ross-stephanie-angry
  Ross slams his glass down. "Don't. Don't you put her name in your
  mouth like a question."
end phrase

define phrase ross-stephanie-sad
  Ross turns his glass in slow circles. "She was the only one in this
  hotel who never wanted a thing from me. Now ask me who I think that
  leaves."
end phrase

define phrase ross-relationship-admits
  "We weren't a secret, whatever the papers would've made of it. I loved
  her. There. Write it in your little book."
end phrase

define phrase ross-relationship-deflect
  "A gentleman doesn't discuss a lady." He says it like a line he
  practiced in a mirror.
end phrase

define phrase ross-gambling-truth, claims the debts is owed
  He drops his voice. "Fine. I owe — owed — her money. Cards. She
  bankrolled my whole career and I paid her back in losses. That's the
  truth, and it's ugly enough without a murder on top."
end phrase

define phrase ross-gambling-denies, claims the debts is paid
  "Debts?" He laughs too fast. "Paid. Every cent, months ago. Whoever
  told you different is selling something."
end phrase

define phrase ross-alibi-bar
  "I was on this stool from seven until they found her. Catherine kept
  the whiskey coming. Ask her."
end phrase

define phrase ross-jack-opinion
  "Margolin?" Ross spits the name. "Man would sell his own mother a
  leaky roof. Stephanie had his deed, you know. Had him by the throat."
end phrase

## ----------------------------------------------------- conversation: Viola

define phrase viola-stephanie-fond
  Viola's eyes shine, precisely as much as grief requires. "Stephanie
  was a great woman. The city is smaller tonight." It is a beautiful
  performance.
end phrase

define phrase viola-family-denies
  "Family? Stephanie had none — that was half her tragedy." A small,
  perfect smile. "We were friendly strangers, she and I."
end phrase

define phrase viola-alibi-rehearsal, claims the whereabouts is theatre
  "I was at McVicker's until ten — the director kept us late on the
  second act. I came back and the hotel was already full of policemen."
  She smooths her glove, unhurried.
end phrase

define phrase viola-inheritance-cool
  "Inheritance is a subject for relatives and vultures, detective. I am
  told I am neither." The word RELATIVES sits oddly in her mouth.
end phrase

define phrase viola-program-caught
  You hold up the program: rehearsal, eight until NINE. Viola looks at
  it for a long moment, and something behind the poise goes very still.
  "Printers," she says lightly, "make mistakes." Her hands do not.
end phrase

define phrase viola-killer-denies, claims the killer is nobody
  "The killer?" She shakes her head slowly. "Detective, look around
  you. Grief, debt, secrets — but murder? I don't believe any soul in
  this hotel had it in them. Some accident. Some stranger."
end phrase

define phrase viola-confesses, claims the whereabouts is ballroom
  The poise cracks — all at once, like ice on a pond. "The ballroom.
  We argued in the BALLROOM. She called our father a mistake she'd
  finally outlived — outlived, that was the word — and the cord was in
  my hands before I knew it had left the curtain." She looks at her
  hands as if they belonged to the costume. "I carried her upstairs.
  I made it neat. It's what I do — I stage things."
end phrase

define phrase viola-truth-deflect
  "The truth is a role like any other, detective. Everyone here is
  playing it a little differently." She smiles, and it almost holds.
end phrase

## Post-confession voice (seam 6): once `confessed` holds, these rows
## select ahead of the lies. None carries a claims tag — they assert
## nothing to the ledger, so the still-pinned killer lie has nothing to
## gate and, crucially, no maintenance deposit ever rebuilds the curve.

define phrase viola-stands-by-it
  "I said it once, and it cost me everything I had saved up to say it."
  Her voice is level, empty of theatre. "The ballroom. The cord. I will
  not take it back."
end phrase

define phrase viola-alibi-dropped
  "The theatre let us out at nine. You hold the program; I have no use
  for the lie now." She looks at her gloves without putting them on.
end phrase

define phrase viola-killer-confessed
  "You already know who, detective. I told you what happened in the
  ballroom — don't ask me to say the word as well. It will be said in a
  courtroom soon enough."
end phrase

define phrase viola-family-owns
  "Half-sisters. Same father, different luck — the family money never
  learned my name." A small, tired shrug. "That was the last thing I
  had left to keep, and I find I don't want it."
end phrase

## ------------------------------------------------------ conversation: John

define phrase john-business-reveal
  A long, flat pause; something behind his eyes closes like a ledger.
  "Stephanie financed my operations. I collected what she was owed and
  kept certain hands off her investments. She trusted me with that.
  Remember I did not give it up easily."
end phrase

define phrase john-stephanie-respect
  "Miss Bordeau was serious about her affairs. I respect serious
  people." He offers nothing else.
end phrase

define phrase john-alibi-docks
  "I left before ten. Business at the docks." He does not elaborate.
  Men like Barber never do.
end phrase

define phrase john-jack-flat
  "Margolin is loud. Loud men owe money." He straightens a cuff. "That
  is arithmetic, not gossip."
end phrase

## ------------------------------------------------- conversation: Catherine

define phrase catherine-viola-secret-reveal
  Catherine takes off her spectacles, and suddenly looks ten years
  older. "Stephanie told me once, and told no one else. Viola is her
  half-sister. Same father. The family money went one way, and it did
  not go toward Viola." She looks at the door. "I promised. Remember
  that I promised."
end phrase

define phrase catherine-viola-guarded
  Something crosses Catherine's face and is gone. "Miss Wainright stays
  here often. She and Stephanie were... acquainted." The pause is a
  door closing.
end phrase

define phrase catherine-stephanie-grief
  "Thirty years I knew her. Thirty years." Catherine folds a napkin
  that was already folded. "Whoever did this ate her food and drank
  her wine. You find them, detective."
end phrase

define phrase catherine-will-executor
  "I'm the executor, yes — Stephanie's choice, not mine. The estate is
  substantial and the will is old. Older than some of the people who'd
  like to be in it."
end phrase

define phrase catherine-ross-alibi
  "Ross was at the bar all evening; I served him myself." A beat. "I
  stepped away perhaps twenty minutes, closing the restaurant. But he
  was there when I left and there when I came back, deeper in the same
  glass."
end phrase

define phrase catherine-chelsea-protective
  Catherine's voice cools five degrees. "Chelsea is a good girl doing
  honest work, and whatever you're implying, detective, you may take it
  up with me instead."
end phrase

define phrase catherine-jack-debts
  "Margolin owes — owed — Stephanie more than the hotel's worth. She
  held the deed to his precious block. He's been sweating through his
  collars for a month."
end phrase

define phrase catherine-john-suspects
  "Mr. Barber and Stephanie had dealings I was not part of. He is
  politer than his reputation. That is all I will swear to."
end phrase

define phrase catherine-alibi-restaurant
  "I was here, closing up. Chelsea can tell you — she was through on
  her rounds." She says it easily, a woman with nothing to count.
end phrase

define phrase catherine-guests-gossip
  Catherine leans in, dropping her voice into the register reserved for
  the best gossip. "Ask me about anyone in this hotel, detective.
  Thirty years, and I have watched every one of them."
end phrase

## ------------------------------------------------------ conversation: Jack

define phrase jack-property-broke, claims the solvency is ruined
  Jack's face goes from red to grey. "You want it? Fine. She held my
  deed. The debt comes due this quarter and I am RUINED, detective,
  ruined — and now she's dead and it looks like a motive, and that's
  exactly why I'd never have touched her!"
end phrase

define phrase jack-property-denies, claims the solvency is sound
  "My finances are SOUND." He says it loudly enough for the whole floor.
  "Margolin properties are the bedrock of this neighborhood. Bedrock!"
end phrase

define phrase jack-stephanie-bluster
  "Tragic. Tragic! A great loss for the city." He mops his neck with a
  silk handkerchief. "We had business, sure. Everyone had business with
  Stephanie Bordeau."
end phrase

define phrase jack-hotel-brags
  "Finest block I own — I mean, finest block in the ward." The slip
  hangs in the air a moment too long before he talks over it.
end phrase

define phrase jack-alibi-room-service
  "In my suite all night. Rang for room service at nine — steak, rare.
  Check with the kitchen, they stamp the tickets." On this one point he
  sounds genuinely unworried.
end phrase

## --------------------------------------------------- conversation: Chelsea

define phrase chelsea-locket-admits
  Chelsea's hand goes to her collar and draws out a small silver locket.
  Inside, a photograph: a young woman with Stephanie's unmistakable
  eyes. "My mother gave me up when I was born. I came here because —
  because I think it was HER, detective. And now I'll never get to ask."
end phrase

define phrase chelsea-locket-clutch
  Chelsea's hand closes over something at her collar. "It's just a
  locket. It was my mother's." She won't meet your eyes, but she won't
  lie to them either.
end phrase

define phrase chelsea-mother-evades
  "I never knew my mother." The tray trembles, just barely. "Is there
  anything else? I have my rounds."
end phrase

define phrase chelsea-stephanie-grief
  "Miss Bordeau was kind to me. Kinder than she had to be." Her eyes
  fill. "I keep thinking I should have said something to her, while
  there was time. There was something I wanted to ask her."
end phrase

define phrase chelsea-alibi-rounds
  "I was on the ground floor all evening — foyer, bar, restaurant,
  around and around. People saw me everywhere." She counts the rooms on
  her fingers, earnest as arithmetic.
end phrase

define phrase chelsea-catherine-warm
  "Catherine looks out for me. She's the only one here who does." A
  small, real smile. "Whatever she told you, you can believe it."
end phrase

## ---------------------------------------------------------- ending phrases

define phrase viola-guilty
  Viola listens to the accusation all the way through, and then — as if
  a curtain came down — stops performing. "The ballroom. The cord. The
  program was the mistake; everything else was staged to the inch." She
  draws off her gloves, finger by finger. "Our father owed us both a
  life, detective. I only collected mine late." The police take her at
  the foyer doors, and the Alderman Hotel breathes again.
end phrase

define phrase case-collapsed
  Three accusations, three denials, and the ward has run out of
  patience. By morning the case belongs to a downtown man with a
  cigar, and the Alderman Hotel keeps its secret. Whoever killed
  Stephanie Bordeau walks out through the foyer like any other guest.
end phrase

define phrase accuse-ross-wrong
  Ross comes off the stool with his fists balled. "I LOVED her!" It
  takes two porters to sit him back down, and the whole bar has heard
  the accusation fail.
end phrase

define phrase accuse-john-wrong
  John Barber looks at you the way a ledger looks at a smudge. "No,
  detective. And you have just spent one of your chances on a man who
  collects debts, not lives."
end phrase

define phrase accuse-catherine-wrong
  Catherine goes white, then very quiet. "Thirty years her friend."
  The words land harder than shouting. Around you, the staff's faces
  close like shutters.
end phrase

define phrase accuse-jack-wrong
  Jack bellows loudly enough to rattle the glassware, threatens three
  separate lawsuits, and demands a telegram be sent to his lawyer, his
  alderman, and his mother. The room-service ticket, stamped nine
  o'clock, does the actual arguing.
end phrase

define phrase accuse-chelsea-wrong
  Chelsea drops her tray. In the ringing silence that follows, half the
  foyer saw her face — and no one who saw it believes she did it.
end phrase

before the game starts
  change the player to Alex
end before
