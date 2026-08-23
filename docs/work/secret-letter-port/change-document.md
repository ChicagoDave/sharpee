# The Secret Letter — Change Document

**What this is**: the content authority for the Chord port of *Jack Toresal and The Secret
Letter* (Textfyre, 2009). Chapter by chapter, it records what survives, what changes, what is
cut, and what is new. Plan Phases 6, 8, and 10 cite **this** document's section for the chapter
they are building. A chapter this document does not cover is not ported.

**Authority**: every decision here is David's, in David's words. Claude asks the questions and
records the answers; Claude proposes no content and writes no prose (`vision.md` §6, authorship
split). Where a section is unanswered, it is marked so — an unanswered question is never filled
by inference.

**How it is produced** (Phase 4, reframed 2026-08-22): by conversation. Claude presents what a
chapter actually is in the 2009 source — rooms, NPCs, scenes, puzzles, quips, where the rails
are — asks the decisions that forces, and writes down what David says. It is built incrementally,
one chapter per pass, not authored ahead of the build.

**Related documents, and what each is for**:
- `vision.md` — the whole-remake premises this document's chapter decisions are made *within*:
  the trans-girl reframe, the Vedd coda and theology, the world rules on gender and the talent,
  the Maiden House rule, the market-as-template redesign, the fidelity license. Premises live
  there; per-chapter authorization lives here.
- `docs/references/textfyre/secretletter/INVENTORY.md` — the measured source: 84 rooms by book,
  47 NPCs, 56 scenes, the puzzle spine, and the designers' own walkthrough. The questions below
  are asked against these counts rather than against memory.
- `plan.md` — the 11-phase port plan that consumes this document.

---

## Chapter 1 — Prologue and Grubber's Market

**Status**: IN CONVERSATION (opened 2026-08-22, session 50a5a8).

### The chapter's extent — DECIDED (David, 2026-08-22)

**Chapter 1 is the Prologue and Grubber's Market together** — the source's Book 1 and Book 2,
in file order. Jack overhears the plot, is hunted, and escapes the market: one narrative unit.

The source could not settle this on its own. Its `Book` numbers are duplicated and out of
sequence (two `Book 6`s; `Book 5` follows `Book 6` in the file), so file order is play order
and the chapter boundary is an authorial decision, not a fact recoverable from the text.

**What that puts in scope**, measured from `INVENTORY.md`:

| | |
| --- | --- |
| Rooms | 18 — The Alley and Outer Market Roof (Book 1); 16 in the market (Book 2) |
| Conversations | 3 trees — `ST` (one shared tree across ten generic stallkeepers), `TE` (Teisha, 22 quips), `MONKEY` |
| Story scenes | 11 of the source's 39, all of them chase or escape |
| Puzzle chain | banana → monkey → necklace → Teisha → silk cloak; exit by sliding down the northeast cable on the gray cloak |
| Pressure model | `wandering mercenaries` — one mobile NPC, four escalating states (`oblivious` → `approaching` → `grabbing` → `nearby`), moved to the player's room rather than pathfinding, with exits and stall conversations gated on the state |

**Why this reading and not the smaller one.** The Prologue alone is 2 rooms and no
conversation — it would prove the Chord scaffold and nothing about whether beats carry
Textfyre's quip trees, which is the whole question Phase 6 exists to answer. Taking the market
with it also means the port's first built thing is the part `vision.md` §5 names as the one
that always just worked and the template for everything after it.

### The opening — DECIDED (David, 2026-08-22): the player plays the market walk

**Changed from the source.** The 2009 game opens with a ~350-word non-interactive block on
`when play begins` (`story.ni:1469`) that *narrates* the market: the crowd, the whole exchange
with Teisha at the silk tent, nicking the apple from the fruit stall, the first mention of
Fossville's taxes and the Ascension, and Jack settling on a crate in the alley. Play then began
in The Alley — a dead end whose only permitted move is up the crates, since southeast is refused
while the mob is on-stage.

**In the port, the player plays that walk.** The market is entered calm and free before it is
ever entered hunted, so the chase later runs across a map the player already knows and past
stalls that already mean something. Teisha, the theft, and the overheard politics become play
rather than summary.

**Consequence to carry into Phase 6**: Jack no longer starts the game holding the apple
(`story.ni:2415`); the apple becomes something the player takes. Theft therefore has to work in
the calm market, which the source's stalls already model — each display is a `storage bin` with
a `corresponding item` (`story.ni:2380`, `2390`). The same mechanic is what the banana theft
later depends on, so the calm walk teaches the puzzle chain's first move instead of introducing
it cold during the chase.

**Open at the close of this pass**: what ends the walk and moves Jack to the alley.

### What ends the walk — DECIDED (David, 2026-08-22): the apple, refused in the open

**The apple is the walk's exit condition.** Jack steals it, wants to eat it, and cannot eat it
where she is. Trying to eat in the open is **refused**, and the refusal **hints toward the
Alley** as the place that would work. The player leaves the market on Jack's own decision, for a
reason the game has been building since the theft, and the first bite is what the eavesdrop then
poisons.

**This is the source's own thread, not a new invention.** Gentry runs it through the whole
opening: Jack steals the apple because it is *"time for a bit of breakfast"*; she goes to the
alley *"where you can catch a breath from the crowds and enjoy your apple in peace"*
(`story.ni:1469`); the fruit stall still carries the appetite much later — *"These don't look
half bad. If you hadn't stumbled into so much trouble, you'd be eating one right now"*
(`story.ni:2380`); play opened on the bite; and the eavesdrop's payoff lands on it — *"that bit
of apple you swallowed a minute ago turns into a cold, hard chunk in your belly"*
(`story.ni:1804`). Eating is already blocked once the soldiers scene begins (`story.ni:2417`).
The port makes playable what the block narrated.

**Rejected, with reasons.** *Teisha ends it* — her "Don't be a stranger, Jack" is already the
block's exit line, but that hands the decision to an NPC and makes the walk a conversation with
errands attached; it stays the bookend of her scene, not the chapter's trigger. *Mercenaries
arrive and Jack ducks into the alley* — spends the reveal early; the eavesdrop works because Jack
does not yet know they are hunting her, and hiding first turns the gut-punch into confirmation.
*A turn clock or rising heat* — arbitrary, and reads as the game nudging rather than Jack
deciding.

**Consequences for Phase 6.**
- The refusal is **directional**, not a flat "you can't." It has to leave the player knowing
  where would work without naming a waypoint.
- The hinting rides on the source's own furniture: rooms describe themselves from elsewhere, and
  the Alley already advertises itself from the market — *"The entrance to a narrow alley lies
  northwest"* (Book 1, `Rule for printing the distant description of the Alley when in Grubbers
  Market Northwest Junction`). That is the `Adjacent Rooms` extension, which is exactly the
  **P-8 spike** Phase 6 was already scheduled to run. The apple refusal and the P-8 spike are the
  same machinery, so the spike now has a first real consumer instead of an invented one.
- The appetite must be live in Jack's voice during the walk, not only readable in the apple's
  description — otherwise the player pockets it and wanders. Both halves of that thread are
  Gentry's existing sentences (the stall's "you'd be eating one right now" and the cold-chunk
  callback), so it is conversion rather than new prose.

### The Ascension — NOTED (David, 2026-08-22)

**The King died without naming an heir. No one is supposed to know Jack is the heir.**

This is a correction to how the source's own dialogue frames it, and it lands on a quip that is
in play for relocation (below). `TE22` as written has Teisha say the Ascension is contested
*"because the King didn't explicitly name his daughter heir before he died"* (`story.ni:3219`) —
a phrasing that presumes a publicly-known daughter standing as a candidate. Under David's note
the vacancy is total and the claimant is secret.

**The publicly-known princess exists in the source and is load-bearing** (checked 2026-08-22 at
David's prompt). She is a declared ballgoer (`story.ni:11382`) with her own 16-quip tree
`PR1`-`PR16`, and Jacobs sets her up as the rival beforehand: *"You and she are competing for the
same position, now"* (`JE16`, `story.ni:11299`). Her tree culminates in `PR15`
(`story.ni:11421`), where she names the threat directly — *"I understand all too well what you
represent to Miradania... As long as you remain alive and have access to royalty, you're going to
be a thorn in my plans."* Her `PR1` opener has her already briefed: *"you must be that ambitious
little street urchin Mother told me about."*

**So the two facts are compatible, and no princess needs removing.** The Princess is the public
presumption; Jack is the secret claim; the ball is where the secret stands in front of the public
claimant and is recognized. `TE22` therefore needs a correction, not a rewrite — the King named
no heir at all, rather than merely failing to name his daughter.

**Open — and a premise question, not a Chapter 1 one.** `PR15` has the Princess say Jack's
*father* was loved, while the source's own reveal makes Jack *"Jacqueline Toresal, daughter of the
Duke"* (`story.ni:1329`). The source's Jack is therefore the Duke's daughter, which is a claim to
a dukedom, not to the throne. If Jack is the heir in the remake's sense, what she is heir *to*
needs settling — and that belongs in `vision.md` as a world premise, since it reaches `TE22`,
`HO7`, `JE16`, the whole `PR` tree, and the endgame.

**RESOLVED (David, 2026-08-22)**: Jack is heir to the **throne**; the Duke was the **King's
brother**; the public language of the claim names her as the Duke's **son**. Recorded as a world
premise at `vision.md` §3e, which this chapter cites. For Chapter 1 the consequence is narrow:
`TE22` says the King died naming no heir at all, and the Princess remains the public presumption.

### Teisha's conversation — DECIDED (David, 2026-08-22): split across the two visits

**The 22-quip `TE` tree is written entirely for the chase in the source.** Every entry point
assumes Jack is already fleeing — `TE1` opens *"Something the matter, sweetie? You look spooked"*
(`story.ni:3176`), `TE5` is *"Back so soon?"*, `TE9` is *"You're still here? I'd hoped you'd gotten
away by now."* The informational quips sit behind `TE10` inside that frame, so in 2009 the player
is being hunted and stops to ask who is selling what today.

**The port splits the tree by occasion.**

| Calm walk | Chase |
| --- | --- |
| `TE12` market layout, stall by stall | `TE1`-`TE9` — spooked, half-knowing, hiding |
| `TE15` the monkey: shiny things, bananas | `TE16` what she would trade for |
| `TE13` what is behind the tent (the centre post) | `TE20` the necklace for the silk cloak |
| `TE14` her own ambition to leave the tent | |
| `TE21` Fossville | |
| `TE22` the Ascension — corrected per `vision.md` §3e | |

**Why.** The informational quips are tutorial and seeding content, and they play badly mid-flight.
Moved to the calm visit they give the walk its substance and let the player *already know* the
monkey wants bananas and likes shiny things before the chase begins — so the puzzle chain becomes
recall under pressure rather than an interview during it. It is also the only place Teisha's own
written warmth has a scene: *"it's nice to be able to let your guard down and talk to someone
outside Maiden House"* (`story.ni:3110`) cannot land in a chase.

**Costs, carried into Phase 6.**
- Teisha needs a **calm opener**. `TE1` assumes spooked and cannot be reused; this is David's line
  to write, not Gentry's to carry.
- Her tree stops being one conversation. Phase 6's "at least one complete conversation" deliverable
  must name **which occasion** it means.
- Teisha is one of the Vedd idiom register's starting four (`vision.md` §2), and the calm visit is
  now where her voice is first fixed.

### Theft — DECIDED (David, 2026-08-22): calm theft is quiet, chase theft is noisy

**The source's rule cannot be carried over unchanged.** `Carry out stealing` (`story.ni:1978`)
makes every theft noisy: the player is spotted, ejected to a random adjacent room, and the stall
is permanently `blocked` — *"This stallkeeper will be on the lookout for you now."* That never bit
in 2009 because Jack **began** the game holding the apple. Now that the player steals it, it does:
**the apple and the banana are the same stall**, so a source-faithful apple theft blocks the fruit
stall before the monkey puzzle needs it.

**The rule becomes situational rather than universal.** In the calm walk, a distracted stallkeeper
means the lift succeeds **silently** and nothing is blocked. Once the mercenaries are sweeping, the
source's rule takes over **unchanged**.

**The mechanic is not modified — only its trigger.** Both halves are already written:
- the calm case is the opening block's own sentence — *"nicking an apple from the fruit stall while
  its owner argues with a fat Easterner over local politics"* (`story.ni:1469`), so the distraction
  is the politics chatter, and the theft beat and the Ascension seeding are the same beat;
- the noisy case is the source's second theft message, written for exactly this state — *"With the
  stallkeepers all on edge about the mercenaries, it's not likely you'll be able to nick anything
  without someone noticing"* (`story.ni:1997`).

**This is `vision.md` §5's pressure model applied to theft rather than to movement**: the same
affordance means different things as the pursuer's state escalates. Phase 6 should treat it as a
second instance of the pattern the market is being kept as the template *for*, not as a one-off.

### The chase — DECIDED (David, 2026-08-22): the chain stays, and so do the losing endings

**The escape chain survives intact**, as the designers' own walkthrough runs it (`Test Market`,
`story.ni:12419`): steal the banana → climb the centre post → give the banana to the monkey for the
necklace → down → trade the necklace to Teisha for the silk cloak → back up → slide down the
northeast cable on the **gray** cloak, landing at the fruit stall → wear the silk. Jack's own
masculine cloak becomes the zipline and is left behind; the silk one is what she walks out in.

**The calm walk feeds it rather than replacing it.** Because `TE15` now plays before the chase, the
player already knows the monkey wants bananas and steals shiny things — so the chase can be shorter
on exposition and is recall under pressure, as the Teisha split intended.

**A Gentry line gains force with no rewriting.** Handing over the silk cloak, Teisha says *"'I was
right. It brings out your eyes. You look... almost royal.'"* She is a §3d perceiver, and under §3e
Jack is heir to the throne. In 2009 that was a compliment; now it is a perceiver saying something
true about a girl nobody is supposed to know is the heir. Carried forward verbatim — conversion,
not authoring.

**The losing endings stay, and the pole timer stays.** David: capture and death are part of the
story and are where the tension comes from — *"ref Disney and always representing darkness."*
Recorded as a standing principle for the whole port at `vision.md` §5 ("Pressure has teeth"), not
only for this chapter: `Pole Destruction ends in disaster` (`story.ni:4098`) and the market capture
ending (`story.ni:2163`) both survive, in the first twenty minutes of the game, on a timer.

### The stallkeeper tree — DECIDED (David, 2026-08-22): the calm walk carries it whole, `ST3` included

**`ST` is not one character's tree.** It hangs off `Rule for initiating conversation with a
stallkeeper` (`story.ni:1881`), so it is the market's ambient conversation — every stallkeeper in
Grubber's speaks it. That is what makes it worth carrying: nine quips of texture that apply
everywhere the walk goes, at no per-NPC authoring cost.

**It is already calm-only in the source, which inverts the question as it was posed.** Talking to a
stallkeeper is refused outright whenever mercenaries are in the room, in two flavours by their
state (`story.ni:1875-1879`): *"Better find somewhere else to chat; if you start making
conversation, the mercenaries might take notice"* while they are oblivious, and *"No time to chat
now; you've got to run!"* once they are approaching or grabbing. So `ST3` is not chase-specific.
It is the opposite — the one quip that lets Jack learn about the mercenaries **before** they are
hunting her: *"Only that they're bad for business... I don't know who hired them, but the Lord's
Guard ought to run them off"* (`story.ni:1888`).

**In 2009 the tree was nearly unreachable, and the new opening is what makes it work as written.**
The narrated market walk meant the player's first playable steps in Grubber's were already the
chase, and the chase is exactly when this tree refuses to run. The playable walk is the first
occasion the material has ever had.

**Two things come with it, both free.**
- **The patience counter** (`story.ni:1937-1949`): a second approach draws *"Didn't I tell you to
  take it somewhere else?"* and a third draws *"I said, beat it!"* — ambient pressure during the
  calm half that needs no new mechanism and no new text.
- **`ST6` seeds the monkey** — *"If you've half a penny that isn't stolen from somewhere, I'll sell
  my stall to the monkey"* (`story.ni:1894`) — which is load-bearing for the decision below.

**Consistent with `vision.md` §3g without adjustment.** The stallkeeper is a non-perceiver and his
written address is already neutral: *"Beat it, kid"* (`ST7`), *"What do you want?"* (`ST1`). No
pronoun is chosen anywhere in the tree, so it converts without touching the perceiver matrix.

### The monkey — DECIDED (David, 2026-08-22): verbal-only in the calm walk, armed by the chase

**The monkey is off-stage until `EVENT_monkey` fires**, and that event is what puts it on the centre
post (`story.ni:2705-2707`). What arms the event is the `Monkey business` scene, which **begins when
the player first enters the Exotic Gems Stall** (`story.ni:2698`) — a location trigger with no
reference to the chase at all.

**In 2009 those two things were the same event; under the new opening they come apart.** With the
market walk narrated, the player's first entry to any stall was already the chase, so a location
trigger was a chase trigger. Now the player can wander into the gems stall while everything is still
calm, and the trigger would fire there.

**The cloak is what decides it.** The chain the monkey starts — banana → monkey → necklace → Teisha
→ silk cloak — ends in the disguise, and the cloak's own text is written for a Jack who is already
being hunted: *"You realize suddenly that this is exactly what you need: the perfect disguise!"*
(`story.ni:3050`). If the chain can complete during the calm walk, the player can be wearing the
disguise before anyone is looking for her, and the chase has nothing left to be about.

**So the trigger moves off first-entry-to-the-gems-stall and onto the start of the chase.** One
gate; the event's text, the monkey's placement, and everything downstream carry over unchanged.

**The seeding is already written and already placed.** Before the monkey exists physically it exists
in speech, in two quips this chapter already assigns to the calm walk: `ST6` above, and `TE15`'s full
answer — *"That pesky thing came in on the fruit vendor's wagon yesterday and just made itself at
home. Now it's all over the place, bothering everybody... The little rodent loves bananas"*
(`story.ni:3205`). `TE15` is in the calm column of the Teisha split, so no further work is needed to
establish the monkey before the player meets it.

**Carried into Phase 6.** `EVENT_monkey` is one of the source's 18 `dramatic event` declarations,
and P-9 ships the port without ADR-323 deferred narration — so its firing needs re-authoring on
whatever the port's own mechanism is, regardless of this decision. The decision changes only *when*
it is armed.

### The eavesdrop's aftermath — DECIDED (David, 2026-08-22): a third story state, and the chase starts later

**The bite hands off to a third state, between `calm` and `chase`.** Jack has heard the voices and
knows she is wanted; nobody has seen her yet. That is neither the calm walk nor the chase, and it
is not folded into either: the chase does **not** begin in the Alley. David: *"a third state, the
chase starts later."*

**This is the source's own window, named.** Gentry runs the same three beats as scenes:
`Eavesdropping on Soldiers` ends when the utterance table empties or the mercenaries reach the
Alley; `Avoiding Soldiers` then runs until `Final Chase` begins (`story.ni:1742-1751`). When the
eavesdrop ends the market gates close and lock (`story.ni:1749`), and the wandering mercenaries
sweep the market with three postures — `oblivious`, `approaching`, `grabbing` (`story.ni:2071-2182`).
`Final Chase` begins when `TE20` fires, the necklace-for-cloak trade (`story.ni:4005`). So the
middle state is the sweep: gates locked, pursuers on the board, Jack unseen.

**Consequences for Phase 6.**
- `secret-letter.story:58` declares `states: calm, chase`; a third state goes between them.
  Working name **`hunted`** (Claude's proposal — David renames at will; the name is an
  identifier, not prose). The bite in the Alley moves `calm` → `hunted`; the move to `chase` is
  the next decision below.
- The mercenary pressure model the prior session queued as the next authored increment is the
  **`hunted`** state's content, not the chase's: the four-state pursuer (source's oblivious /
  approaching / grabbing plus absent) lives here, and the theft rules' noisy half (`story.ni:1978-1997`,
  ejection and permanent stall block) and the eat-refusal "No time for breakfast right now!"
  (`story.ni:2417`) are `hunted`/`chase` behaviour, not `calm`.
- The market gates lock at the transition (`story.ni:1749`) — the market becomes a box, which is
  what makes the sweep a threat rather than a chase the player could simply walk away from.

**What moves `hunted` → `chase` — DECIDED (David, 2026-08-22): `TE20`, as in the source.** The
chase begins the moment the necklace-for-cloak trade fires (`story.ni:4005`), with Jack inside
Teisha's tent holding the green silk cloak; the `Tent Escape` and `Pole Escape` timers run from
there (`story.ni:4021-4040`). A sighting during the sweep does **not** start the chase: the
pursuer's `approaching`/`grabbing` postures remain `hunted`-state pressure with their own
consequences (the market capture ending, `story.ni:2163`, stays a `hunted` outcome), and the
player reaches the tent by evading them, not by being flushed out. Consequence for Phase 6: the
transition is authored on the TE20 exchange in `npc-teisha.chord`, and the tent/pole timers are
`chase` content.

### The sweep — DECIDED (David, 2026-08-22): the random sweep stays, as original story logic

**The `hunted` state keeps Gentry's random mercenary sweep**, not a fixed patrol the player could
learn. David: *"keep the random sweep, it's original story logic."* The pursuer's three postures
(`oblivious` / `approaching` / `grabbing`, `story.ni:2071-2182`), the per-room waiting timeout,
and the 1-in-10 conspicuous-shopper roll (`story.ni:3403`) are carried as mechanism. Randomness
runs on the engine's seeded streams (ADR-293), so the tree-document lines stay deterministic at
the pinned seed, and a specific outcome can be forced for a test without changing the model.

### The escape disguise — DECIDED (David, 2026-08-22): a dress and a fashionable hat, from Teisha, changed into after the slide

**Jack opens the chapter as the urchin and leaves it as a well-dressed young woman.** The source's
escape garment, the green silk cloak Teisha trades for the necklace (`TE20`, `story.ni:3215`), is
replaced: **Teisha gives Jack a dress and a fashionable hat.** David: *"Jack is going to get a
dress from Teisha and not a cloak with a fashionable hat. Jack will have these things stuffed in a
satchel when she slides down the rope and she will quickly change into the dress and the hat."*

**The chain keeps its shape.** Necklace → Teisha → dress and hat **into the satchel** → back up the
post → slide the cable on the gray cloak (the cloak is still the zipline and is still left behind)
→ land → **change into the dress and hat** → walk out. The source's "wear the silk" step becomes a
change of clothes.

**Why it passes the sweep.** The parchment describes "a hat and a gray cloak" on a slight
brown-haired kid, and the leader assumes a boy (`story.ni:1804-1806`). A girl in a dress and a
fashionable hat matches neither the garments nor the expectation. The 2009 move, hat off and hair
down (`story.ni:2119`), hid the girl to pass; the remake's move presents her. This is the chapter's
first deliberate step toward Jacqueline, and it lands on vision.md §1 without touching the
opening: Jack still walks the calm market as the urchin, and the androgyny ruling (public reads
her as a boy) stands.

**The opening dress — the urchin — gains its missing piece.** The scaffold dropped the source's
woolen cap (`story.ni:1393`, hair stuffed under it) without a ruling. It comes back: the parchment's
"hat and a gray cloak" must describe what the player actually wears for the recognition logic to
mean anything.

**Consequences for Phase 6.**
- `npc-teisha.chord`: `TE20` is rewritten around a dress and hat rather than a cloak. Gentry's
  perceiver line, *"It brings out your eyes. You look... almost royal"*, was said of the cloak; whether
  it carries to the dress is David's call when TE20 is written (it is a §3d perceiver line and the
  change document earlier marked it as carried verbatim — that marking is now provisional).
- New objects: the dress, the fashionable hat, the satchel (the source already has one —
  `story.ni:4270` moves the silk cloak into it), and the woolen cap worn at start.
- The landing step needs a change-of-clothes action the player performs; the source's landing is
  at the Fruit Stall (`Market Escape`, `story.ni:4132`).
- The `hunted` recognition check is now specifiable: the mercenaries match **worn gray cloak + worn
  cap**; in the dress and hat they do not recognise her. The captain's later drawing
  (`story.ni:2493`) is what eventually defeats it, in a later chapter.

**Where she changes — DECIDED (David, 2026-08-22): in the open, with a couple of beats of grace, and
the boots give her away.** David: *"We give her a couple of beats to change clothes before the
mercenaries see that she has boots on and not dress shoes."* So the landing runs: a short window
(two turns or so) in which the sweep does not read her while she changes; then the disguise holds
from the parchment's point of view (no cap, no gray cloak, a girl) but fails on a detail the
parchment never mentioned — **an urchin's boots under a lady's dress**. A mercenary notices the
boots, and the chase is back on, now with the mercenaries knowing what she is wearing. The
disguise buys the head start rather than the escape; the escape is still Commerce Street, where
the Lord's Guard keeps them off her (`story.ni:4268`).

**Why this is better than the source's clean pass.** It keeps the remake's principle that
pressure has teeth (vision.md §5) through the one step that, in 2009, switched the pressure off;
and it plants the boots as the loose thread the way the captain's drawing is — a detail the
hunters now carry forward.

**Consequences for Phase 6.** A grace counter on the landing (two turns); the boots as a worn
object on the player from the start (the source has none — check `story.ni` for footwear before
adding); a "they see the boots" beat that flips the mercenaries back to approaching; the chase
endgame unchanged (reach Commerce Street).

**The boots are a thread, and Dame Sandler closes it — DECIDED, provisionally (David,
2026-08-22: "Her shoes get replaced with Dame I think").** The boots stay on Jack out of the market
and through the middle game; proper shoes arrive with Dame Sandler's dressing of her for the ball
(the source's clothier scene, `story.ni:5119`, is where Jack is first made to look "like a
princess"). Until then the boots are the one thing about her that still says urchin, which is
what the mercenaries now know to look for. Whether the captain's description grows "boots" is
authored when that chapter is reached. The grace window is a fixed two turns unless the `hunted`
build finds a dwell counter does the job more cleanly.
