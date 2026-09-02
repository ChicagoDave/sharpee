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

## Standing rulings (port-wide)

### Conversation is open dialogue, never topic tables — DECIDED (David, 2026-08-31)

David: *"every topic-based interaction with an NPC needs to be remapped to open dialogue"* —
scope confirmed in the same conversation: **"every NPC."** One of the core reasons for porting
this game is to enable the more complex capabilities of the new conversation system (ADR-320);
`define topics` is therefore not an NPC surface anywhere in this story. Every NPC conversation
is scene-shaped: greetings open it, `define conversation` threads and `define exchange` blocks
carry the content, manner colors delivery, and the conversation system's own memory
(`was discussed`, recency/absence words) replaces hand-plumbed state.

**Reach**: all 23 source trees, the ten generic stallkeepers included; and Chapter 1's built
conversation surfaces (Teisha's `define topics` block, the shared `ST` stallkeeper tree) are
rebuild scope under this ruling. Talk-*refusals* (the `wary`/busy lines) are not conversations
and stand as built. The mapping that implements this ruling is
`docs/work/secret-letter-port/rewrite-pattern.md` (plan Phase 7).

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

**AMENDED (David, 2026-08-24): the banana has no calm lift — the stallkeeper is blocking the
bin.** During the calm walk the banana cannot be taken at all: *"The stallkeeper is blocking the
banana bin during the calm walk"*, surfaced in the stall's own text in David's words — *"even a
bushel of bananas from the Kozar Delta, currently blocked by the stallkeeper."* So the quiet
lift stays the apple's beat alone; the banana's theft happens under the sweep, where the
source's noisy rule applies unchanged (seen, kept, ejected, stall blocked — built with the
chase half). `take banana` while calm refuses, with David's refusal line to come. This also
dissolves the ordering wrinkle his drafted banana line raised (a "signature move" callback that
presumed the apple came first): there is no calm banana line to order.

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

**The necklace wear-refusal carries verbatim — RULED (David, 2026-08-24): "keep it verbatim,
it lands differently now and that's the point."** Gentry's line (`story.ni:3852` — *"On second
thought, better not. You're still trying to look like a boy, and boys just don't wear this kind
of jewelry."*) was held because it sits on the remake's gender frame; the ruling is that this is
exactly why it stays: the 2009 disguise logic, read on the remake's frame, is the remake's own
line without changing a word.

**CONFIRMED (David, 2026-08-24): armed at `hunted`, staged at the gems stall.** The "start of the
chase" wording above predates the same-day three-state split; arming at the literal chase (TE20)
would deadlock the chain that produces TE20. Both build readings stand as built in `monkey.chord`:
the commotion fires the first time Jack stands in the Exotic Gems Stall while `hunted` (the calm
walk never fires it), and the gems stall remains the stage because Gentry's commotion text is
written from inside it.

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

**Where `calm` → `hunted` sits — RULED (David, 2026-08-30): at the briefing's end, not the
bite.** The bullet above says "the bite in the Alley moves `calm` → `hunted`"; the build
(`eavesdrop.chord`) found that sentence in tension with this section's own definition of
`hunted` ("has heard the voices and knows she is wanted") and with the gates ruling ("at the
eavesdrop's end — the calm → hunted transition"). David confirmed the end of the briefing: the
bite opens the eavesdrop and the story stays `calm` through it; the story turns `hunted`, and
the gates lock, the turn the leader barks "Okay, go!" and the men fan out. The bite sentence
above is superseded by this note.

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

**The recognition rule, sharpened — DECIDED (David, 2026-08-23): "anything except dress and new
hat leaves Jack exposed."** Not garment-matching: taking the cap off, shedding the cloak, or any
partial state changes nothing — the sweep reads her as Jack in every state except the full dress
and fashionable hat. Consequences:

- The source's cap-off suppression (`story.ni:2093-2099`, the 2009 clean pass) is **dropped
  entirely**, not deferred. No suppression branch is ever keyed to the woolen cap.
- The "looks right at you … don't recognize you" arrival variant (`story.ni:2119`) is not
  carried in its 2009 form. If a not-recognised arrival line exists at all, it can only occur in
  the dress-and-hat window after the change, and whether it is used there is authored with the
  escape sequence.
- The suppression state is built with the escape sequence (dress + hat worn), nowhere before it.

**Clothing is the look, not objects — DECIDED (David, 2026-08-24): "all clothing is scenery and
not directly removable.. we use CHANGE OUTFIT or SWITCH HATS or WEAR DRESS and the player's look
changes with those actions."** Garments are fixtures of Jack's appearance, not inventory to
fiddle with piece by piece:

- **No direct manipulation.** `take off cap`, `wear cap`, `drop cloak`, `put cap in satchel` —
  all refused. The refusal line is David's to write (one placeholder carries it meanwhile).
- **Outfit-level actions change the look**: CHANGE OUTFIT, SWITCH HATS, WEAR DRESS. They arrive
  with the escape build (the dress and fashionable hat), and the player's own description
  changes with them.
- **Consequences for what is already built**: the cap's carried wear/take-off lines
  (`story.ni:1402`/`:1414`, "You pull the cap down…"/"You take the cap off…") do not survive as
  reactions to direct wearing — the phrases are kept aside as candidate texture for SWITCH
  HATS. The slide is unaffected: it strips the cloak by its own action, which is exactly the
  outfit-changes-by-action model. The 2009 hat-off move is now doubly dead (the recognition
  rule above, and no direct take-off at all).
- **The satchel is not clothing** — it stays a carried container; the dress and hat ride in it
  as items until WEAR DRESS consumes them into the look.

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

**AMENDED (David, 2026-08-23): the change happens Behind Fruit Stall, and the landing is
unseen.** David: *"I think we need to add a Behind Fruit Stall location that only surfaces from
that landing and in this one case, no one gets knocked over and no one sees you land. You have
one turn to change and one turn to return to market and head east."* This replaces the
in-the-open change:

- **New room: Behind Fruit Stall**, surfacing only from the northeast-cable landing — no
  walk-in entrance from the market; its one exit returns to the Fruit Stall.
- **The slide's ending changes for this landing only**: no one gets knocked over, no one sees
  Jack land. The source's ending ("knocking over a couple of shoppers…", `story.ni:3822`) needs
  a Behind-Fruit-Stall variant — David's line to write. The other three landings are untouched
  by this amendment.
- **The window is now concrete**: one turn to change, one turn to return to the market and head
  east. This supersedes the earlier "two turns or so in the open" shape; the change itself is
  private, so the window is about speed, not about being watched while changing.

**AMENDED again (David, 2026-08-23): the slide takes two turns, and the hidden landing is a
mid-air choice.** David: *"It happens in two turns and in the middle the description actually
explains that there is an open spot behind the fruit stall if she lets go now, but if she
doesn't, she lands in front of the fruit stall and doesn't have any way to change properly
before getting caught."* This reshapes the landing:

- **Turn one** is the first half of the slide. Its text ends mid-air and reveals the open spot
  behind the fruit stall — the description itself is the tell: let go now and that is where she
  drops.
- **Letting go on the mid-slide turn** is the only way into Behind Fruit Stall — the "only
  surfaces from that landing" rule now means this drop, not the completed slide.
- **Not letting go** completes the slide on turn two: she lands **in front of** the fruit
  stall, in the market, seen — the source's ending ("knocking over a couple of shoppers…",
  `story.ni:3822`) now belongs to this outcome, and it survives unchanged. With the gray cloak
  left on the wire, no private place to change, and the sweep converging, she gets caught; the
  escape is forfeited.
- **Prose consequences**: the source's single slide block splits into two turns, with the
  mid-slide reveal and the let-go drop being new text — David's lines to write with the escape
  sequence. The knock-over ending stays Gentry's.
- Build reading — CONFIRMED (David, 2026-08-24), with two additions: the mid-slide moment is a
  state where letting go is the meaningful action and **anything** else — look, wait, inventory,
  a direction — burns the turn and lets the slide complete. No refusal wall mid-air; hesitation
  is the choice. **`DROP` is a second phrasing of it** (David: *"we can add DROP too"*) — the
  bare verb, no noun, alongside `let go`. And **the Fruit Stall's description gains a subtle
  hint that the centerpost wire ends directly overhead** (David: *"I think maybe the fruit stand
  description might have a subtle hint about the centerpost wire directly overhead"*) — seeding
  the landing geography during the calm walk; the hint line is David's to write. The
  front-landing capture's mechanics are no longer open — ruled 2026-08-24 (below): caught and
  killed, a hard ending.

**Both timing questions — DECIDED (David, 2026-08-23):**

1. **Identification fires at the Fruit Stall, one turn after the return.** David: *"Player gets
   one turn at fruit stall before identification."* She comes out to the Fruit Stall, has one
   turn there; if she is still there on the next turn, the boots-spotted beat fires —
   identification, chase back on, mercenaries knowing what she is wearing. Heading east inside
   that turn keeps the head start.
2. **A second turn behind the stall forfeits the escape.** David: *"Second turn behind stall
   puts mercenaries at fruit stall so when comes out she's immediately caught."* Lingering over
   the change moves the pair to the Fruit Stall; stepping out walks her straight into them —
   caught on the exit, no free turn.

**"Caught" at these two spots is death — RULED (David, 2026-08-24): "she's caught and
killed."** The earlier build reading (standing grab posture, 'Gotcha!', capture clock,
break-free still possible) is **rejected** for both failure spots: riding the slide out to the
front of the fruit stall, and stepping out after a second turn behind the stall, each end in
capture and death outright. No grab fight, no break-free window — these are hard endings, like
the pole-destruction disaster. The standing grab machinery remains what runs everywhere else in
the sweep.

**The boots are a thread, and Dame Sandler closes it — DECIDED, provisionally (David,
2026-08-22: "Her shoes get replaced with Dame I think").** The boots stay on Jack out of the market
and through the middle game; proper shoes arrive with Dame Sandler's dressing of her for the ball
(the source's clothier scene, `story.ni:5119`, is where Jack is first made to look "like a
princess"). Until then the boots are the one thing about her that still says urchin, which is
what the mercenaries now know to look for. Whether the captain's description grows "boots" is
authored when that chapter is reached. The grace window is a fixed two turns unless the `hunted`
build finds a dwell counter does the job more cleanly.

**The other three cables — RULED (David, 2026-08-30): "the other three scenarios are
intentional — only the one wire is the escape route."** The source's four cables and
landing table are carried (`story.ni:3728-3830`), and a landing on the southeast, southwest
or northwest cable behaves as the source has it: Jack lands, seen, and in the chase the
source's `Market Escape` spool runs (`story.ni:4132-4200`, six rows to capture). In the
remake the change happens only Behind Fruit Stall and the east exit is watched while she is
the urchin, so those three landings can only end in capture — and that is the intent: the
northeast wire, let go of mid-slide, is the single escape. The source's own default for a
bare `slide down cable` (southeast, `story.ni:3756-3758`) also stays: "if the default was SE
in the original source, it stays that way." Standing rule stated the same day: **"whatever
the original source does and if there's a gap, then I want to know"** — the port builds the
source's behaviour where the change document is silent, and reports the gap rather than
deciding it.

### The sweep's postures — DECIDED (David, 2026-08-23): `oblivious`, `approaching`, `aggressive`

The mercenaries' third posture is renamed. The source's `grabbing` (`story.ni:2071-2182`) names
one moment — the fist closing on Jack's arm — but the port carries it as a standing entity state
the rest of the model reads from ("going is refused while they are aggressive", "the captain
arrives two turns after they become aggressive"), and a standing state wants a posture word.
David: *"Maybe 'aggressive' instead of grabbing."* The ladder is therefore `oblivious →
approaching → aggressive`, with the mechanism unchanged: arrival sets `oblivious`, three turns
of dwell make them `approaching`, the expired countdown makes them `aggressive`, and `kick` /
`attack` knocks them back to `approaching`. Gentry's lines for each rung carry as written.

### The market gates — DECIDED (David, 2026-08-24): open and deflected in the calm walk, closed as in the source after it

**The gates behave as the source has them, with one addition for the calm walk the source never
had.** The north gates at the Northwest Junction (`story.ni:2236`) close and lock **at the
eavesdrop's end** — the `calm` → `hunted` transition — exactly as `story.ni:1749` does it.
David: *"to me, the chase start and eavesdrop end are the same"* — his "chase" is the everyday
word for the whole hunted-and-chased stretch; the mechanical TE20 split between `hunted` and
`chase` is unaffected, and the gates key on the sweep's start. Gentry's locked refusals carry
unchanged: enter/push cascades to opening, and opening gets *"The mercenaries have locked the
gates. You're not getting out this way."*

**During the calm walk the gates stand open and Jack is deflected, not blocked.** David: *"we
have to deflect Jack from going north, simply by a stomach growl and maybe a stop to see
Teisha. The gate is open, but we deflect."* `north` at the open gates refuses softly, in Jack's
own reasons — the appetite thread (the same hunger the apple pays off) and Teisha's tent as the
pull back into the market. The deflection line is David's to write; a placeholder carries it
until then.

**The gates' description carries as written, conditional tail included** — *"…they're certainly
never closed. [if closed]Until now."* The calm walk's examine gets the ceremony-and-never-closed
text; the first examine after the sweep begins lands the payoff.

**A north-road push-through-and-escape idea was raised and withdrawn in the same conversation**
(David, 2026-08-24 — a north/east mix-up: *"East is to Commerce Street, right? Then everything I
just said about the north road is as it was"*). There is no push-through: the closed gates are a
wall, the market stays the box that makes the sweep a threat, and the chapter's escape remains
**east via Commerce Street** (`story.ni:4268`), as already recorded.

**The arrival clock and the capture — DECIDED (David, 2026-08-23: "Confirmed").** The source's
rolled 1–3 timeout becomes a per-turn `one chance in 2` roll once Jack has waited a turn — Chord
has no "random number between" assignment, the expected pacing is the same, and the roll runs on
the seeded stream so tree-document lines stay deterministic. The captain's arrival two turns into
`aggressive` stays a death, as the source has it (`story.ni:2126`).

## Chapter 2 — Commerce Street and Lord's Market

**Status**: COMPLETE for Phase 10 (opened and closed 2026-09-01, session b24d9a) — six rulings, one carry-list; lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01)

**Chapter 2 is Commerce Street and Lord's Market, and it ends at the Back Alley** — the source's
Book 3 and Book 4 in file order, ending where Book 6 opens: Jack walks into the alley south of
Lord's Market and Bobby is there. David: *"Chapter 2 ends at the Back Alley, Bobby comes before
Maiden House."* That is the source's own boundary (its Commerce Street hint scene runs from the
market's end until `Meeting Bobby` begins, `story.ni:1067`) and the source's own order (Bobby
sends Jack to Maiden House, not the other way round).

**What this settles about the pacing spine.** `vision.md` §5's push/pull/quiet table reads
mercenaries → shops → mercenaries → Maiden House → mercenaries → Bobby, which would put Bobby
after Maiden House. The order is ruled here: **Bobby comes before Maiden House**, as in the
source. The table's *kinds* (shops are the quiet beat, Bobby is the first pull) stand; its
sequence is superseded on this one point, and the change document is the authority
(vision.md §8 — the vision is a capture, never the citation). Whether a mercenary push sits
between the shops and Bobby is not decided here; it is a question for this chapter's
pressure section below.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 9 — Commerce Street, the Bakery, the Butcher's Shop, the Armory, East Commerce Street (Book 3, `story.ni:4197-4950`); Lord's Market, Royal Tunic, Sandler & Sons, Chorus Brothers (Book 4, `story.ni:4951-5602`) |
| The exit | The Back Alley (`story.ni:5607`) — entering it for the first time is the chapter's end and Chapter 3's opening beat (the coin trick, `BO1`) |
| Conversations | 6 trees, 113 quips — `GE` Germaise 19, `HO` Holstenoffer 24, `OM` Olgan Minor 8, `CL` the clothier 6, `DS` Dame Sandler 48, `CB` the Chorus Brothers 8. Pieter is present as a talk-refusal only (`story.ni:5222`) |
| Scripted events | One — `EVENT_Fossville` on first entry to Lord's Market (`story.ni:5010-5030`): the Baron storms out of the moneylender's, collides with Jack, the hooded woman calms him |
| Puzzles | None — the designers' walkthrough (`test meeting`, `story.ni:12419`) goes east, east, south, straight to Bobby |
| Pressure | None in the source — west to the market refused by day ("lay low for a while", `story.ni:4280`), the shops shuttered at night |

**Only the first-visit layer is this chapter's.** Each shop carries a later-visit layer keyed on
the sewer escape (`the player has been in the sewer`) or on Pieter's bodyguard scene: `GE16-19`,
`HO18-24` (the back door to the rooftops), `OM9`, `DS24-30` (Sandler locks Jack out), and the
whole clean-Jack layer — the ball gown, `CB` and the loan, `DS31+`, `CB7`'s "Fossville was here
yesterday". Those belong to the chapters that reach them (Phases 8 and 10 cite this document per
chapter, so they are recorded here as *not Chapter 2*, not as cut). Chapter 2 builds the
first-visit trees: `GE1-15`, `HO1-17`, `OM1-8`, `CL1-5` as the dirty-Jack refusal, `DS1-23`,
`CB1`'s dirty-Jack refusal, and the Fossville event — as stubs, per the standing conversation
rule.

### The clothes — DECIDED (David, 2026-09-01): Jack changes back into the urchin

**Jack walks Commerce Street and Lord's Market as the boy the street knows.** David: *"we need
Jack to change back or do it automatically."* The dress and the fashionable hat bought the head
start out of the market; on this street they come off. So the six first-visit trees stand as the
source wrote them — Germaise's "grateful for your disguise", Holstenoffer's "skinny boy like
yerself", Sandler's "Squire Jack", the clothier's "merely a boy", the Chorus Brothers' "penniless
ragamuffin" — spoken to Jack the boy, and the perception question for these characters is the
standing per-NPC one (`vision.md` §3d/§3g), not a costume problem.

**The mechanism defaults to the source's: automatic, on arrival at Commerce Street.** David left
the two open ("change back *or* do it automatically"); the standing rule (2026-08-30, "whatever
the original source does and if there's a gap, then I want to know") picks between them. The
source's arrival block is itself an automatic change of clothes — *"Gratefully, you remove the
cloak"* — and it moves the escape garment into the satchel and puts the gray cloak back on if
Jack carries it (`story.ni:4266-4276`). The remake does the same on the same turn with the
remake's garments: **the dress and hat go into the satchel, the woolen cap goes back on**, and
the gray cloak goes back on only if she retrieved it from the landing (it stays where it fell
otherwise, as ruled under the escape disguise). The dress and hat then ride in the satchel
through the middle game exactly as the source's green silk cloak did. The arrival text that
narrates this is David's line (the built room already carries a TODO for it, keyed to Gentry's
block, `disguise.chord`). The player-performed alternative — `CHANGE OUTFIT` at the street, the
action Chapter 1 already built — is not carried unless David rules for it; recorded here as the
gap the default resolved.

**Consequences.**
- The source's exit rule — *"You'd better put your hat on — most of the merchants on this street
  know you as Jack"* (`story.ni:4284-4289`) — carries: leaving Commerce Street bare-headed is
  refused while the merchants know her, and the Bobby variant of that line belongs to Chapter 3.
- Bobby meets Jack the boy at the alley, as the source needs (*"He doesn't even know that you're
  really a girl"*, `story.ni:5630`). No Chapter 3 rework follows from the disguise.
- The clothier's later "Getting changed" scene (`story.ni:5178`, the ball gown with Pieter) is
  untouched and not this chapter's; the remake's Chapter 1 change is a *third* outfit change in
  the game, not a replacement for that one.
- Chapter 1's "identified" sweep recognition — the mercenaries match the gray cloak and cap — is
  now the look Jack wears again on Commerce Street. Whether that matters here is the pressure
  question below.

### Pressure — DECIDED (David, 2026-09-01): paranoia, but no chase yet

**Chapter 2 has no pressure with teeth.** David: *"I would add some paranoia, but otherwise
there's no chase yet."* Nothing in these nine rooms takes Jack: no sweep, no captain, no clock,
no capture. The source's shape carries — west to the market refused by day (*"It would be a good
idea to lay low for a while"*, `story.ni:4280`), the shops shuttered at night — and the spine's
**second mercenary push moves out of this chapter**; where it lands (Chapter 3, or later) is that
chapter's question, not decided here.

**What is added is paranoia** — Jack's own, as texture. Under the vision's own rule
(`vision.md` §5, "Pressure has teeth") this is atmosphere, not pressure, and that is the point:
it does not pretend to be a threat, it is a hunted kid catching her breath on a street she has
been told is safe. **The lines are David's, during play-testing**, and their form is his too.
What the port builds is the slot: a texture channel on the chapter's street rooms in the source's
own idiom — the `1 in 5` every-turn idle rolls Germaise, Holstenoffer and Olgan already run
(`story.ni:4374`, `4552`, `4746`) — carrying TODO lines until David writes them. Recorded as the
structural reading, not the content; if the paranoia is meant to live elsewhere (in a
conversation opener, in Jack's examine-self, in the arrival block itself) that is settled when
the lines are.

**Consequence for the chapter's shape.** With no pressure and no puzzle, Chapter 2 is the
source's exposition chapter as written: nine rooms, six optional conversations, one scripted
collision, and a walk to the alley. The change document authorizes it as that. The `vision.md`
§5 open question ("what supplies pressure outside a chase?") is **not answered here** — this
chapter is ruled to be the quiet beat that needs none.

### Who sees her — DECIDED (David, 2026-09-01): Olgan Minor has the talent; the other four do not

David: *"Olgan has the talent, the other four don't."* The chapter's six speakers on the
`vision.md` §3f matrix:

| | Perceives Jack (§3d) | Does not |
| --- | --- | --- |
| **Knows everything** | Dame Sandler (already placed) | — |
| **Public tier** | **Olgan Minor** | Germaise, Old Man Holstenoffer, the clothier, the Chorus Brothers |

**Olgan's line is the talent, not sharp eyes.** *"You are suddenly certain that he knows you're
not really a boy — that he knew it the instant you walked into his shop"* (`story.ni:4736`) is
now evidence of §3d in the source's own words, the third such after Teisha's *"guessed it the
very first time"* and Sandler's *"did you really think I hadn't guessed?"* — and *"Run along,
girl, before you cut yourself"* (`story.ni:4749`) is a perceiver outside the arrangement using a
true word, exactly as §3g's first row has it. He is the first perceiver in the game who is
hostile: Teisha and Sandler like her; Olgan sees her and sneers. That is the port's first
demonstration that the talent implies nothing about kindness, which §3c's "weaves through random
people" already promised.

**What each flag fixes now**, with dialogue deferred (standing conversation-stub rule):
- Each of the five stubs carries its perception flag in its TODO note, so the Phase 8 rewrite
  reads it from the stub rather than re-asking.
- Olgan's description carries the source's talent sentence verbatim — it is description, not
  dialogue, so it is built in this chapter, not deferred. His `OM8` ejection ("little boy… soft,
  pink hide") is a perceiver *choosing* the public word in front of the player, which §3g's
  "position picks the word" allows; whether that line changes is his rewrite's question.
- The four non-perceivers' first-visit trees stand as public-tier text: their "boy"/"lad"
  tokens are assigned by position and need no reassignment. Holstenoffer's *"the Queen's little
  brat"* (`HO7`) is the standing §3g **[watch]** on "brat" and stays flagged, not resolved here.
- Under §3g everyone here except Sandler never speaks of lineage. Germaise's and Holstenoffer's
  old-Duke lines (`GE12`, `HO9`, `HO5`) are about the Duke, not about Jack, and are untouched by
  the §3e lineage-language rewrite — the thirty lines that rewrite measured are Sandler's and
  later chapters'.

### What carries as the source has it — RECORDED (2026-09-01, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 2
surfaces carry unchanged and were not put to David as questions:

- **The Fossville collision** (`EVENT_Fossville`, `story.ni:5010-5030`) — fires once on first
  entry to Lord's Market, Gentry's text verbatim: the Baron out of the moneylender's, the fall,
  the hooded woman's *"Calm yourself, Fossville… It's only a foolish street boy"*, his *"Off
  with you then, urchin"*, her *"The Queen can not appear to play favorites"* as they go. The
  `follow` refusal ("You've already lost him in the crowd") carries. This is the player's first
  sight of the antagonist and the remake's §3e motive is structural, but nothing in the scene's
  text names lineage, so it is untouched by the lineage rewrite.
- **East Commerce Street** (`story.ni:4822-4950`) — the three estates as locked fronts (Black
  Gate refused by the servants; Red Gate locked, its brass key a later chapter's; the Jacobs
  mansion refused), the iron fence, the park gate, `knock`. The Red Gate `unlock` machinery is
  built when its chapter is.
- **The street and the square** — Commerce Street's day description, sidewalks, cobbles, mud,
  the three storefronts with facing-direction shortcuts; Lord's Market's day description,
  storefronts, servants ("no one affords you so much as a second glance"), the unlit lanterns.
  The night variants exist in the source for later chapters and are not this chapter's.
- **The shops' scenery and refusals** — the bread and flour and oven, the trays and hooks and
  chopping block, the dagger display (Olgan's "have your finger off" threat), the clothier's
  curtains/carpet/dummies/mirror and the lovely clothes with their dirty-Jack tail, the display
  case and its jewelry, the armchairs and teller's window. Buying with no purse: Olgan's *"Run
  along, girl"*, the clothier's price that leaves her "queasy" — the source's own text stands.
- **Idle texture** — Germaise's dough, Holstenoffer's cleaver (the source's one `dramatic
  event` here, `ATMOS_Holstenoffer`, carries as plain every-turn texture per P-9: the port ships
  without deferred narration), Olgan's staring, the clothier's fussing.
- **The chapter's end** — entering the Back Alley for the first time. The `define chapters`
  block gains Chapter 3's row on that trigger; the coin-trick text and `BO1` are Chapter 3's.
- **The Vedd idiom register** (Phase 5, seeded as diction) reaches these five new trees when
  their dialogue is written in Phase 8, not now — the stubs carry no register.

**One gap found, not decided** — see the next section.

### The talent in children — DECIDED (David, 2026-09-01): common in children, often gone by puberty

The City Park gap (`story.ni:4917` — the Maiden House orphans *"know that you're really a
girl"*) is resolved by a world rule, not a line. David: *"I think we decide the 'talent' is
common in children, but it often dissipates in puberty."* Recorded as a premise in `vision.md`
§3c (dated 2026-09-01), since it governs the whole remake; what it settles here:

- **The orphans see her.** The City Park refusal stands as the source has it: the kids know, and
  calling her out in front of Bobby is exactly the danger the line names. Bobby is "a few years
  older" (`story.ni:5630`) — past the age where it fades — and does not see, as the source needs.
- **The adult perceivers are the ones it stayed with.** §3f's random weave in adults is the
  residue of a childhood sight; Teisha, Sandler, Olgan and Shannon are not a different kind of
  person, just ones it did not leave. Nothing about kindness or knowledge follows from it (Olgan).
- **Axiomatic.** Under the standing rule (vision.md §2) no one explains why it fades and no
  system models it; it is shown in who sees.
- **Handed forward, not decided here**: whether Jack herself has it (she is a child on the
  boundary — the question is the vision's, when it matters); and Chapter 4's shape — Maiden House
  is a house of children who see under two widows who don't, which is the Fiona knot (§4) seen
  from the other side.

**Chapter 2's questions are answered.** Extent, clothes, pressure, perception, the source
carry-list, and this gap. The section is complete for Phase 10's purposes: every room, tree
(as a stub), event, and refusal in Books 3 and 4's first-visit layer is authorized, the
later-visit layers are recorded as belonging to later chapters, and the lines are David's
during play-testing.

---

## Chapter 3 — Bobby and Maiden House

**Status**: COMPLETE for Phase 10 (opened and closed 2026-09-01, session 7bb78d) — four rulings, one carry-list, two gaps; lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01): Bobby, then the night at Maiden House, ending at the privy window

Three seams were put to David from the source's own structure: (A) after Bobby alone, (B) after
the night at Maiden House, (C) after the night journey to Lord's Keep. David: **"B."**

**Chapter 3 is the source's Book 6 (Meeting Bobby) and Book 5 (Maiden House), in file order,
and it ends when Jack climbs out through the privy window.** That is the seam the designers'
own walkthrough draws — `test meeting` (`story.ni:12408`) runs from the Back Alley through
Bobby, the door, the curfew, sleep, and the window — and it is where the source's
`Maiden House Hints` stage ends (`story.ni:1071`, "when the location is not in Maiden House").
The night journey (Book 5B) is Chapter 4's.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 8 — Back Alley, Entrance to Maiden House (Book 6, `story.ni:5603-5803`); Hallway, Dormitory, Kitchen, Privy, Laundry, Behind Maiden House (Book 5, `story.ni:5804-6549`) |
| Opens with | The coin trick on first entry to the Back Alley (`story.ni:5621-5629`), then Bobby's conversation from `BO1` |
| Conversations | 4 trees — `BO` Bobby, the 14 alley quips `BO1-BO15` (his other 16 are the night journey's); `TH` Widow Theresa 11; `FI` Widow Fiona 31; `SH` Widow Shannon 16 |
| Scripted events | Bobby leaves after `BO10` ("I'm in"); the curfew on first entry to the Hallway (`story.ni:5922-5934`) — night falls, Theresa locks the front door with the key round her neck; sleep in the dormitory |
| The exit | The privy window, stuck halfway open (`story.ni:6311-6351`), into the alley behind the house |
| Puzzles | None — the walkthrough is conversation, `sleep`, and `climb through window` |
| Pressure | None in the source — the mercenaries appear only in what people say (`BO3`, `BO12`, `TH4`, `FI3`) |

**Also in this region but not this chapter's**: the Secret Closet and the Raid (Book 10), Shannon's
later conversation and the stick-and-soap scene (`story.ni:6497-6520`), and every later return to the
house. They are recorded as belonging to the chapters that reach them.

### Pressure — DECIDED (David, 2026-09-01): a mercenary at the door, and Theresa turns him away

Put to David as the source has it (no push: the mercenaries appear only in what people say,
and the curfew is the only thing that moves Jack) against a push on the street or a push at
the house. David chose the house, and named the scene:

> *"This would be a good place to add a closed door confrontation between Theresa and a
> mercenary, but the mercenary leaves, by saying, 'I'll be back!'"*

**This is new content — the spine's second mercenary push lands in Maiden House.** The scene
is not in the source. What it fixes: a mercenary comes to the Maiden House door during the night;
Theresa holds the door closed against him; he leaves, and his parting word is that he will be
back. Nothing else about it is decided here — the lines are David's, written during
play-testing (vision.md §6), and the stubbed scene carries the trigger and the exit only.

**What it does for the chapter.** The curfew keeps Jack in; the visit is the reason the house is
no longer safe to stay in. It gives the window a second meaning — not just keeping a promise to
Bobby, but getting out before he comes back — and it seeds the Raid (Book 10), which is the
mercenary keeping his word.

**Why Theresa, under the rewrite.** vision.md §4: Theresa does not see Jack, dislikes her, and
calls her a liar about the morning's chase (`TH4`). The person who holds the door is the one
who least believes the danger is real. Nothing about her motive is decided here.

**When it happens — DECIDED (David, 2026-09-01): it is what wakes her.** Put to David against
the source's night (curfew → roaming the house → bunk → dozing → "You snap awake, heart
pounding" → the widows gone, the children asleep → the privy): before sleep, as the waking,
or after waking on the way to the privy. David: **"B."** The knock and Theresa's voice at the
door replace the source's unexplained waking (`story.ni:5985`); Jack hears the confrontation
from her bunk, with the children asleep around her, and the mercenary's *"I'll be back!"* is
the last thing she hears before she slips out of bed. The source's own logic then carries:
the widows are off-stage, the house is dark, and the privy window is the way out.

**Theresa afterwards — DECIDED (David, 2026-09-01): Jack waits her out.** The source lets Jack
reach the privy only because Theresa "is nowhere in sight" when she tiptoes into the hallway
(`TRIG_TIPTOE`, `story.ni:5826`); while Theresa is in the hallway the privy is blocked
(`story.ni:6263`). With the knock as the waking, Theresa has just been at the front door in
that hallway. David: *"Jack quietly waits for Theresa to return to her room."* So the beat is:
the knock, the confrontation heard from the bunk, *"I'll be back!"*, Theresa's footsteps back
to her room, and only then Jack out of bed. The hallway is clear as the source has it; the
privy block stands as written for any earlier attempt. **Gap, not decided**: whether the wait
is narrated inside the waking passage (as the source narrates dozing off and snapping awake) or
is a beat the player spends — Phase 10's build resolves it and reports.

### Who sees her — RECORDED (2026-09-01, from vision.md §4 and §3f; no new question)

Already ruled for the whole remake, and cited here so the build has one place to look:

- **Shannon sees. Theresa and Fiona do not** (vision.md §4, RESOLVED 2026-08-21). Shannon's
  "Miss Jacqueline" (`SH1`, `SH5-7`, `SH13`) is the tell and stays; Theresa's and Fiona's
  "Jacqueline" become the boy words under §3g. Fiona holds the political secret without the
  sight (§3f's table: knows everything, does not perceive) — her kitchen lines `FI3-7`
  (*"Goddesses... so close... could have been... all because of..."*) are that knot showing.
- **Bobby does not see** (§3f's table: public tier, does not perceive). The source already
  says so in his description — *"He doesn't even know that you're really a girl"*
  (`story.ni:5643`) — and Commerce Street's hat rule after meeting him (*"Bobby thinks you're
  one of the boys"*, `story.ni:4288`) carries as written.
- **The dormitory children see** (§3c, the talent-in-children rule, 2026-09-01). The source
  gives them no line about it (`story.ni:6008-6023`: whispering, pebbles, string, "not in the
  mood for a chat"), so nothing in this chapter's text outs her; the rule governs what Phase 8
  may write for them, not what Phase 10 builds.
- **The mercenary at the door** is §3f's middle tier: hunting a scion, assuming a boy, reading
  from a parchment that describes a body. What he asks Theresa for, and what she answers, are
  lines — David's, during play-testing.

### What carries as the source has it — RECORDED (2026-09-01, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 3
surfaces carry unchanged and were not put to David as questions:

- **The Back Alley** (`story.ni:5607-5629`) — the shortcut description, north to the market
  and southwest to Maiden House; the coin trick on first entry, Gentry's text verbatim; Bobby's
  idle texture (`ATMOS_Bobby`, the source's `dramatic event` here, carries as plain every-turn
  texture per P-9). Leaving before `BO8` pulls Jack back into the conversation (`BO7`); leaving
  after it and before `BO10` is refused (*"are you in or out?"*); after `BO10` Bobby is gone.
  The kiss and attack refusals carry.
- **Bobby's alley tree** `BO1-BO15` (14 quips; `BO13` does not exist in the source) — as a stub
  per the standing conversation rule: the trigger on entry, the exit after `BO10`, nothing else.
- **Entrance to Maiden House** (`story.ni:5754-5803`) — the courtyard, the run-down buildings,
  the wooden door as the recognized front of "home", the spur southwest to Behind Maiden House
  (`story.ni:6521-6549`, the ten-foot stone wall shared with East Commerce Street).
- **The curfew** (`story.ni:5922-5934`) — first entry to the Hallway turns the world to night
  (the source remaps the market's exits and moves Bobby to the night market; the port's night
  state does the equivalent), the door closes and locks, Theresa starts `TH1`. The key on the
  ribbon, unreachable (*"in fourteen years you've never managed to steal it"*); the door refusals
  while Theresa is in the hallway; the privy block while she is there.
- **The house** — Hallway, Dormitory (bunks, the awake children, the asleep children and the
  "don't wake them" refusal), Kitchen (basin, dishes, the `wash` action and Fiona's *"Thank you,
  dear"* for drying, the concerned-for-our-safety hold on the kitchen door until `FI7`, the
  goodnight on leaving), Privy (hole, bench, window stuck halfway), Laundry (washtub, the dirty
  laundry and its refusals, clothesline, the *"someone would end up naked"* refusal, Shannon's
  idle texture, the goodbye on leaving). One conversation with Theresa per day.
- **The widows' trees** `TH1-11`, `FI1-20`, `SH1-12` — as stubs: entry triggers (`TH1` at the
  curfew, `FI1` and `SH1` on first entry to their rooms), the side effects that matter to the
  build (Fiona's hold released at `FI7`; the dishes cleaned by `FI13`), nothing else. `SH13-16`
  is Shannon's Company, a later chapter's.
- **Sleep** (`story.ni:5985-5995`) — refused until Bobby's invitation is accepted; the bunk
  passage as written up to the point where the new scene takes over; the widows and the
  dishes and the laundry off-stage afterwards; the children asleep.
- **The window** (`story.ni:6311-6351`) — stuck halfway, the bench to reach it, the escape text
  verbatim (*"You're free!... At worst, you'll pull extra laundry duty"*), Behind Maiden House on
  the far side, the *"no need to sneak into Maiden House"* refusal from outside.
- **The chapter's end** — going through the privy window from inside. The `define chapters`
  block gains Chapter 4's row on that trigger; the night market and Bobby's second tree are
  Chapter 4's.
- **The Vedd idiom register** reaches the four trees when Phase 8 writes them, not now.

**Two rewrite consequences in build text, flagged for Phase 10 (not gaps — the rule is
already ruled):** the widows' words for Jack appear outside the conversation trees, in text
Phase 10 builds rather than stubs — the curfew passage (*"The evening churchbells are ringing,
Jacqueline... any respectable young lady"*, `story.ni:5934`), Theresa's door sneer
(`story.ni:5861`), Fiona's *"young lady"* hold (`story.ni:6118`) and goodnight (`story.ni:6121`),
Shannon's goodbye (`story.ni:6372`). Under §4 and §3g Theresa's and Fiona's convert to the boy
words and Shannon's stays. Phase 10 builds them as the source has them with a play-testing TODO
on each, as Chapter 1 did (cd748b8a); the lines are David's.

### Gaps found, not decided

1. **The wait** — narrated or spent (above).
2. **The new scene's own text** — the knock, what the mercenary says, what Theresa says, and
   *"I'll be back!"* are all David's lines; Phase 10 builds the scene as a trigger at the
   source's waking point with a placeholder, and reports.

**Handed forward, not decided here**: whether Jack herself has the talent — Theresa's *"fourteen
years"* (`story.ni:5866`) puts her on §3c's boundary; and Chapter 4's opening pressure — Jack is
now out at night with a mercenary who has promised to come back.

**Chapter 3's questions are answered.** Extent, pressure (the scene, its timing, and Theresa
afterwards), perception (recorded from the premises), the source carry-list, and two gaps. The
section is complete for Phase 10's purposes: every room, tree (as a stub), event, and refusal in
Books 6 and 5 is authorized, the new scene is authorized as a trigger and an exit, the later
returns to the house are recorded as belonging to the chapters that reach them, and the lines
are David's during play-testing.

---

## Chapter 4 — The Night Journey to Lord's Keep

**Status**: COMPLETE for Phase 10 (opened and closed 2026-09-01, session 7b00cd) — five rulings, one carry-list, three gaps; lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01): all of Book 5B, ending at the capture in the Clearing

Three seams were put to David from the source's own structure: (A) after the second listen at
the arrow slit, (B) at the capture in the Clearing, (C) at the hole under the fountain, where the
source's hint stages split Nighttime from Lord's Keep (`story.ni:1075-1077`). David: **"B."**

**Chapter 4 is the source's Book 5B (Journey with Bobby, `story.ni:6550-7596`) whole, from the
alley behind Maiden House to the sack over Jack's head.** That is where the source prints its
own next heading (`output chapter heading "Chapter 3 - Jail"`, `story.ni:7082`) and where the
designers' `test adventure` ends (`story.ni:12425`, its last `u` is the climb into the Clearing).
Jail (Book 6) is Chapter 5's.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 12 new — Market Square (the night market, one room where the day market was seventeen, `story.ni:6556`), Lord's Road, Pasture, Stream Crossing, Woods, Clearing, Underneath the Fountain, Tunnel End (the Secret Passage), Chapel, Lower Bailey, Upper Bailey, Guardhouse — plus the night state of the walk from Behind Maiden House through the Back Alley and Commerce Street to the market (`test meeting`'s closing `ne/ne/n/w/w/w`, `story.ni:12421`) |
| Opens with | Jack in the alley behind the house at night; Bobby waiting under the center post in the empty market (`story.ni:5666`); `BO23` on arrival |
| Conversations | 1 tree — `BO` Bobby's night quips `BO23-BO31` (9): two answers to *"trouble getting away from the Widows?"*, then `BO26` sends him north; `BO27-31` is her hesitation at the hole, ending *"Thattaboy, Jack."* (Correction to Chapter 3's count: Bobby's remaining sixteen split 9 here and 7 in jail, `BO16-22`.) In the keep he does not speak — *"Bobby shakes his head and puts his finger to his lips"* (`story.ni:7120`) |
| Scenes | 3 — Bobby's Adventure (the whole book), Creeping to Lord's Keep (market → Guardhouse), Returning from Lord's Keep (Guardhouse → cell); `story.ni:6635-6641, 7573-7577` |
| Scripted events | Bobby one room ahead at every stage, moved by `After going` rules; the split sapling's random trail in the Woods (`story.ni:6872-6873`); the fountain opened by Bobby (`story.ni:7069`); the torch lit under the fountain (`story.ni:7137`); the loose brick and the wall (`story.ni:7180`); the two listens at the arrow slit (`story.ni:7544-7557`); Bobby goes up first and does not answer (`story.ni:7145`); the capture (`story.ni:7078-7084`) |
| The exit | The capture — Bobby bound face-down, the market mercenaries, the gaunt man in red robes, the sack, *"Good night, little mouse."* The player is moved to the cell |
| Puzzles | None — the walkthrough is `n/e/n/n/n/d/n/n/sw/u/n/listen at slit/listen to slit/s/d/ne/s/s/u`, with a debug teleport over the random sapling |
| Pressure | None in the source before the fountain — the streets are empty, the road is empty, and the only teeth are the ending, which cannot be avoided |

**Also in this region but not this chapter's**: everything Pieter does in these rooms during the
Bodyguard scene and Journey to the Ball — the stream crossed in a dress, searching the underbrush
for the sapling, the bolt under the urn, the brick, hole and lever (`story.ni:6819, 6925-6929,
7031-7034, 7242-7313`), the Southern Gate on ball night (`story.ni:10978`), the Lower Bailey's
ball-night description (`story.ni:7372`). They are recorded as belonging to the chapters that
reach them.

### Pressure on the way to Bobby — DECIDED (David, 2026-09-01): the mercenary is on the streets

Put to David as the source has it (empty streets between the house and the market; Bobby is the
whole draw) against the mercenary who left Theresa's door still being out there. David:
**"B keeps the pressure on."**

**This is new content.** Something of the mercenary from Chapter 3's door is on the streets
between Behind Maiden House and the night market — seen, heard, or nearly met. The walk is a
push before Bobby's pull, which is the spine's order (vision.md §5: Maiden House, mercenaries
push, Bobby pull).

**Teeth — DECIDED (David, 2026-09-01): none, on purpose.** Put to David against the vision's
standing rule (§5, *Pressure has teeth*: pressure outside a chase must be able to take her, or it
is atmosphere): the street push as a losing ending like the market's, or a near thing with no
fail state before the market. David:

> *"B — we just want fear. We'll provide beats for the mercenary to be distracted (cat chasing
> a rat, etc)."*

**So the street push cannot take her.** It is fear, carried by beats in which the mercenary is
kept off her by something else — a cat chasing a rat is David's example, not the list. This is
the per-scene exception §5's standing consequence provides for (*"unless David rules otherwise
for that scene"*); David has ruled otherwise for this one. The chapter's teeth are the ones at
the fountain. The beats and their lines are David's, written during play-testing.

### The rails — DECIDED (David, 2026-09-01): open outside the keep, with a chase for dawdling

Put to David against the source's rail — every direction but Bobby's refused with *"you'd be
mortified if Bobby thought you'd lost your nerve"* (`story.ni:6580, 6696, 6737, 6801-6804`), the
market's east exit and the pole included, the Southern Gate blocked, the Woods' wrong trails
*"you'll never find your way out"* (`story.ni:6944`), and inside the keep Bobby shaking his head
at every wrong turn: keep it whole, or drop the refusals outside the keep and keep them inside
it, where the guards are the reason. David:

> *"B but if Jack wastes too much time, mercenaries chase her, Bobby catches up and hides them
> as the mercenaries pass, then back on rails."*

**What this fixes.** Outside the keep — the night market, Lord's Road, the Pasture, the
Crossing — the nerve refusals go. Jack can wander; Bobby waits at the next stage. The Southern
Gate stays blocked as the source has it (*"guarded day and night"*, `story.ni:10982`). Inside
the keep — the Chapel, the baileys, the Guardhouse — the rail stays as written, gestures and all.
The Woods keep the split sapling: it is the chapter's one piece of navigation and is what Pieter's
later visit depends on.

**The dawdle chase — new content.** If Jack takes too long on the way out, mercenaries give
chase; Bobby catches up with her and hides the two of them as the mercenaries pass; then the
journey resumes on its rails. It is a scripted beat, not a fail state: David's ruling for this
scene, under the same §5 exception as the street push. What "too much time" is — a turn count,
and whether it is one clock over the whole walk or one per stage — is Phase 10's to measure and
report. The lines are David's.

**What this does for the chapter.** The source's Book 5B is a corridor with a friend in it.
Under the ruling it is an open night with a friend ahead and hunters behind, which is the market's
shape (vision.md §5: an open sub-map, a pursuer, affordances that change as it closes in) with
the pull and the push both present. And it partly answers the vision's open question (§5,
*What supplies pressure outside a chase?*) for this chapter: a clock, and a pursuer it summons.

### Who sees her — DECIDED (David, 2026-09-01): Hester Rudup sees

- **Bobby does not see** (vision.md §3f; recorded in Chapter 3). His night quips carry as
  written — *"Thattaboy, Jack"* (`BO31`) is the boy word from a non-perceiver, as §3g has it.
- **The Lord's Guards behind the arrow slit** are public tier. *"Yer urchin boy"* (`story.ni:7555`)
  is the mercenaries' assumption repeated by men who never saw her; carries as written.
- **The gaunt man in red robes — DECIDED (David, 2026-09-01): he sees.** The source names him
  later as Magistrate Hester Rudup (`story.ni:9664-9673`, *"the man who captured you last night
  at the fountain"*). His line at the fountain — *"Well now, young...sir? Or is it 'miss'? So much
  confusion, all to catch one little mouse"* (`story.ni:7079`) — was put to David three ways: a
  non-perceiver thrown by the morning's dress (carries as written), a perceiver's tell, or a line
  to change. David: **"B."** The line becomes a tell, the same kind as Shannon's *"Miss
  Jacqueline"* — he is looking at a body the parchment describes as a boy and seeing what she is.
  **He is the first hostile perceiver**, and a new cell in §3f's matrix: knows the politics
  (Fossville's magistrate) *and* sees. The line's exact words are his to keep or sharpen at
  play-testing; the ruling is what it means. It carries forward to the jail (`JA22`, *"Little
  mouse... always finding some new hole to crawl through"*) and the hanging (`B_H2`), which are
  later chapters'.

### What carries as the source has it — RECORDED (2026-09-01, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 4
surfaces carry unchanged and were not put to David as questions:

- **The night state** (`story.ni:5938-5943`) — Market Square mapped west of Commerce Street, the
  center post's foot moved into it, Bobby under it. The port's night state from Chapter 3's
  curfew does the equivalent; the walk's rooms are Chapters 2 and 3's rooms at night.
- **Market Square** (`story.ni:6556-6567`) — the empty maze of shadows, the abandoned stalls,
  exits north, east, up; the pole refused (*"Bobby grabs your belt"*, `story.ni:6578`).
- **Bobby's night tree** `BO23-BO31` — as a stub per the standing conversation rule: `BO23` on
  arrival at the market, the exit at `BO26` (Bobby north to Lord's Road), `BO27` as the opening
  gambit in the Clearing, `BO31`'s side effect (down the hole). Going north before `BO26` fires
  it in passing (`story.ni:6585-6588`).
- **Lord's Road, Pasture, Crossing, Woods** (`story.ni:6673-6960`) — descriptions, backdrops
  (broken ground, city wall, cow pies, trees), facings, Bobby's entry texts at each (*"Fresh
  air, Jack!"*, the rock-hopping, the sapling), the stream crossing passage (`story.ni:6816`),
  the swim and drink refusals, the distant city. The random sapling trail — deterministic at the
  seed, as the market's sweep is.
- **The Clearing and the fountain** (`story.ni:6962-7089`) — the ruined pavilion, the statue of
  Brigid, the urn and its bolt (examinable now; the bolt does nothing until Pieter), the secret
  entrance opened by Bobby's arrival text, `BO27-31`, the capture text verbatim on the way back,
  the planar-direction refusals in the Clearing during the adventure (`story.ni:7088`).
- **The tunnels** (`story.ni:7091-7313`) — the fungus, the steps, Bobby's torch (his, then in the
  bracket at the Chapel), the tunnel-length passage text, the loose brick and the wall opening on
  the way there, the wall closing on the way back (`story.ni:7198`), the door refusals while with
  Bobby. The hole, brick and lever exist as objects but are Pieter's chapter's to play.
- **The keep** (`story.ni:7319-7563`) — the Chapel (candles, the sacrilege and prayer refusals),
  the Lower Bailey (the shadow wedge, the guards and their *"less painful ways of getting yourself
  killed"*, the steps), the Upper Bailey (torches, the view of Toresal), the Guardhouse (the door
  refused with *"Are you NUTS?"*, the arrow slit, the two rows of overheard conversation verbatim,
  the *"Bobby motions you back"* hold until both are heard). Bobby's keep-rail carries whole.
- **The way back** (`story.ni:7571-7595`) — Returning from Lord's Keep; the *"heard all you need
  to hear"* refusals; Bobby following (*"quickly brings up the rear"*); the wall shut; *"'Bobby?
  Are you up there?' There is no answer"*; the capture; the cell.
- **The chapter's end** — the capture text, then Chapter 5's row in `define chapters`.
- **The Vedd idiom register** reaches Bobby's night tree when Phase 8 writes it, not now. The
  guards' *"Goddesses witness it"* (twice, `story.ni:7555-7557`) is source texture and stays.

### Gaps found, not decided

1. **The street push's beats** — what of the mercenary Jack sees or hears between the house and
   the market, and what distracts him; David's, at play-testing. Phase 10 builds the walk with a
   placeholder beat at one point on it and reports.
2. **The dawdle clock** — the threshold, and whether it is one clock or per stage; Phase 10
   measures against the source's stage count (four rooms outside the keep) and reports.
3. **The hide beat's text** — the chase, Bobby catching up, the hiding as they pass; David's.

**Resolved by numbering, not by a ruling**: Chapter 2 handed forward "Chapter 4's shape — Maiden
House is a house of children who see" (`change-document.md`, Chapter 2's talent section); under
Chapter 3's extent ruling that house is Chapter 3's, and its section carries the answer.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); Chapter 5's opening — Jack in a cell, Bobby in the next one, and a magistrate who
sees her.

**Chapter 4's questions are answered.** Extent, the street push and its teeth, the rails and
the dawdle chase, perception (Rudup), the source carry-list, and three gaps. The section is
complete for Phase 10's purposes: every room, event, refusal, and the tree (as a stub) in Book 5B
is authorized, the two new beats are authorized as triggers with placeholders, the Pieter layers
are recorded as belonging to the chapters that reach them, and the lines are David's during
play-testing.

---

## Chapter 5 — Jail and the Sewers

**Status**: COMPLETE for Phase 10 (opened and closed 2026-09-01, session aebae2) — three rulings, one carry-list, four gaps; lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01): jail and sewers, ending at the ladder into Commerce Street

Two seams were put to David from the source's own structure, and they disagree: (A) the drop
into the drain, where the source prints its own next heading (`output chapter heading "Chapter 4
- Sewer"`, `story.ni:8528`) and where its hint chain splits Escaping Jail from Escaping Sewer
(`story.ni:1077-1079`); (B) the ladder up into Commerce Street at dawn, where the source prints
*"Chapter 5 - Black Gate Estate"* (`story.ni:8720`) and where the designers' own walkthrough draws
the leg — `test walk1` runs `test jail` and `test sewers` together (`story.ni:12407`). David:
**"B."**

**Chapter 5 is the source's Book 6 (Jail, `story.ni:7597-8545`) and Book 7 (The Sewers,
`story.ni:8546-8742`) together, from the sack coming off in the cell to daylight on Commerce
Street.** The sewer is two rooms and one puzzle with no cast of its own once Olmer leaves; it
belongs with the escape it completes. Book 8's *A New Morning* is Chapter 6's.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 7 new — Jail-Cell (ours, south), Jailhouse, Jail-Cell-2 (Olmer and Darrens, north), Jail-Cell-3 (empty, west), Drain Room, the Sewer, the Access Tunnel; plus the way-out to the east as a distant description only (`story.ni:7633-7635`) |
| Opens with | The waking text (`story.ni:7855`) — cold stone, footsteps, a raw laugh, the crash of a door; everything she carried gone but the baggy clothes (`story.ni:7614-7617`); a hulking shape in the corner |
| Conversations | 3 trees — `BO` Bobby's jail quips `BO16-BO22` (7): the whisper, *"I'm in the cell next to yours"*, Fossville's estate and the rooftops, *"secrets about your father"*, *"Look for a letter—"*, the beating, *"Fossville, Jack! The rooftops! Look for the letter!"* (`story.ni:7878-7890`); `JA` Jacobs (30 declared, **23 live** — `JA9-JA15` are commented out in the source, `story.ni:7986-8000`, the dead hand-me-the-lockpick variant); `OL` Olmer (11, `story.ni:8322-8342`). Darrens has no tree — he waggles his head and smiles (`story.ni:8404`) |
| Scenes | 7 story scenes — Escaping Jail (the whole book, ends in the sewer), Bobby's Voice, Jacobs's lockpicking attempt, Picking a Lock, Jacobs's Deception, Discussion of Drainage, Escape Through The Sewer; `story.ni:7605, 7865, 8235, 8253, 8290, 8541, 8548` |
| Scripted events | Bobby wakes two turns after Jack (`story.ni:7614-7616`), his four beats auto-advance one per turn and he is removed after `BO22`; Jacobs starts one turn later (`JA2`); `JA7`'s attempt at the lock runs a three-turn timer to `JA8`, which throws the wire into the straw (`story.ni:8099-8103`); the pick through the window, the snap, the pick falling outside, Jacobs pushing the door open and leaving the cell the next turn (`story.ni:8276-8285`); Jacobs's Deception on both being in the jailhouse — `JA16`, `JA19` two turns on, Olmer's interjection, `JA21` two turns after that if unanswered (`story.ni:8290-8301`, `8194-8215`); Olmer's plea `OL1` one turn after `JA19`, `OL2` on returning from the drain room (`story.ni:8479-8483`); the north door and the twenty-second pick, the two drunks to the drain room, Olmer's explanation of the alcove (`story.ni:8416-8424, 8543-8545`); the grate, the drop, the prayer to Brigid (`story.ni:8489-8493, 8526-8531`); Olmer names the color and the drunks leave (`story.ni:8650`); the ladder and daylight (`story.ni:8718-8723`) |
| The exit | *"Daylight! You've never been so glad to see it"* — early morning, an alley near Maiden House, then Commerce Street. Chapter 6's row |
| Puzzles | The straw → the wire → unlock the cell door through the window → pick the wire up in the jailhouse → unlock the north door → lift the grate → follow Olmer's color twice. `test jail` + `test sewers` (`story.ni:12427-12429`), the sewer pinned with `xyzzy` |
| Deaths | 2 — going with Jacobs (`JA22`, `story.ni:8017, 8229`: a dozen Lord's Guard and the man in red robes, *"This time, you do not escape"*), and a wrong turn in the sewer (`story.ni:8739`, lost in the black forever) |
| Pressure | Jacobs only — a predator in the cell, then an offer with a death behind it; he removes himself two turns after the offer. No clock anywhere in the book |

### Pressure — DECIDED (David, 2026-09-01): the guards come back

Put to David as the source has it (no clock; Jacobs's offer and the sewer are the only teeth,
and the jailhouse between them is a quiet puzzle box) against a clock with teeth, or fear without
teeth as Chapter 4's street push. David: **"B."**

**This is new content, and it has teeth.** The guards who dragged Bobby off come back for her.
If Jack is still in the jail when they do, it is the capture ending — the same room of Lord's
Guard and Rudup that Jacobs would have led her to (`JA22`'s room, `story.ni:8017`), reached by
waiting instead of by trusting him. This is §5's standing rule applied, not excepted: the jail
can take her in the source only if she chooses wrong, and now it can take her if she dawdles.

**What this does for the chapter.** The source's jail is a box the player empties at leisure;
under the ruling it is a box with a door about to open. It answers the vision's open question
(§5, *What supplies pressure outside a chase?*) for this chapter the same way Chapter 4 did: a
clock, and what it summons. The two ways to die in the jail now converge on one room and one
man, which is where Chapter 4's ruling on Rudup (*he sees*, and *"little mouse"* is his word for
her) already pointed. What "still in the jail" means at the boundary — the drain room, the drop
itself — and how long she has are Phase 10's to measure and report. The lines are David's.

### Who sees her — DECIDED (David, 2026-09-01): Olmer sees

- **Bobby does not see** (vision.md §3f; recorded in Chapter 3). `BO16-22` carry as written —
  *"Jack"* seven times, the boy's name from the non-perceiver who gave it to her.
- **Jacobs does not see.** *"Kid"* once, *"runt"* throughout, *"a valuable runt"* at the door —
  never a gendered word, which is §3g's neutral default from a man who does not look. He is in
  earshot when Olmer calls her *"girl"* (`JA19`) and the source gives him no reaction; carries.
  **What he knows** is the mercenaries' tier, not the small group's: he overheard Bobby, so he
  has the name Fossville and the fact of the interest (*"Fossville has taken a special interest
  in you"*), and nothing of why. He sells that fact; he does not understand it.
- **Darrens** is mute and has no line to rule on.
- **The Lord's Guards** are public tier. The cudgel against the bars, the beating heard through
  the wall — no words about her at all.
- **Hester Rudup sees** (Chapter 4's ruling). *"Little mouse... always finding some new hole to
  crawl through"* (`JA22`) carries as written and is now the second time she hears it.
- **Olmer — DECIDED (David, 2026-09-01): he sees.** Put to David three ways: his *"girl"*,
  *"miss"*, and *"young lady"* carry as tells; or they become public words at play-testing; or
  something else. David: **"A."** So every one of them carries — *"Do us a kindness, girl"*
  (`OL1`), *"Miss?"* (`OL2`), *"wise beyond your years, miss"* (`OL3`), *"Please forgive me,
  miss"* (`OL5`), *"We are at your service, miss"* (`OL9`), *"it does miss"* (`OL11`), *"thank
  you, miss"* at the north door (`story.ni:8424`), *"Now then, miss"* and *"It was very kind of
  you to set us free, young lady"* in the sewer (`story.ni:8650`), and *"Don't you listen to him,
  girl!"* through Jacobs's own quip (`JA19`). A drunk in a cell takes one look through a viewing
  window and never once uses the boy word: the same kind of tell as Shannon's *"Miss Jacqueline"*.
  **He is the first perceiver who is neither ally nor enemy** — a stranger with the talent who
  owes her nothing and pays her in the true words anyway. §3g's position: a perceiver outside the
  arrangement, true words freely. A new name in §3f's matrix, public tier / perceives, beside
  Teisha and Shannon.

### What carries as the source has it — RECORDED (2026-09-01, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 5
surfaces carry unchanged and were not put to David as questions:

- **The waking and the confiscation** (`story.ni:7855, 7614-7617`) — everything but the baggy
  clothes removed from play, permanently; nothing in the source comes back. The `InJail` theme.
- **The cell** (`story.ni:7816-7851`) — the blankets and their refusals, the straw and its smell,
  the wire concealed in it until searched, *"poke around in"* as searching, the door north and
  only north (`story.ni:7778`).
- **The cell doors and windows** (`story.ni:7662-7776`) — stout wood and iron bands, the viewing
  window, looking through from either side with the occupant list, facing a wall to look through
  its door, the *"reach"* mistakes (*"just type UNLOCK DOOR"*, `story.ni:7737-7757`).
- **Bobby's Voice** `BO16-BO22` — as a stub per the standing conversation rule: the trigger two
  turns after waking, the beats one per turn, Bobby off-stage after `BO22`, Jacobs's clock started
  by it (`story.ni:7919-7922`).
- **Jacobs** `JA1-JA8, JA16-JA31` — as a stub: `JA2` one turn after Bobby is gone (or on `talk
  to`, `story.ni:8089-8090`); `JA6` → `JA7` → the three-turn timer → `JA8` puts the wire in the
  straw; *"Jacobs ignores you completely"* while he strains at the lock; the idle set `JA24-31`
  (his father, the lockpick, *"do whatever you want, runt"*) with its clustering; the wire refused
  back (*"It's no use to me in here"*, `story.ni:8265`); *"He looks way too scary to mess with"*.
- **Picking the lock** (`story.ni:8262-8285`) — *"unlock door"* supplying the wire, the tiptoe
  text verbatim, the pick outside the door, Jacobs opening it and going north a turn later; the
  cell doors refused from the jailhouse afterwards (*"You're not going back in there"*,
  `story.ni:7797`).
- **The jailhouse** (`story.ni:7609-7627, 7657`) — the bench refused (*"no time to rest"*), the
  east passage refused, the distant descriptions of the way out and the alcove.
- **Jacobs's Deception** — `JA16` on both in the jailhouse, `JA19` two turns on with Olmer's
  interjection, `JA20` → `JA21` and Jacobs gone, `JA22` the death, `JA21` fired for him if Jack
  starts on the north door while he is there (`story.ni:8411-8415`) or two turns pass; Jacobs
  leaves if she goes to the drain room first (`story.ni:8537-8540`).
- **Olmer and Darrens** `OL1-OL11` — as a stub: `OL1` a turn after `JA19`, `OL2` on coming back
  from the drain room, `OL4`'s side effect (the unlock from inside the conversation,
  `story.ni:8366-8369`), the naming on `OL5`, Darrens's history (`OL6`), the drain (`OL11`, only
  once the drain room is visited), the north door text, the two to the drain room, *"follow"* them.
- **The drain room** (`story.ni:8457-8545`) — the reek *"worse than the privy back at Maiden
  House"*, the grate and the crumbling stonework, the hole and the running water, Olmer's account
  of what the alcove is for, *"After you"*, the prayer to Brigid, the drop.
- **The sewers** (`story.ni:8546-8742`) — the water, the bricks, the vents, the four glyphs and
  their random colors and symbols (deterministic at the seed, as the market's sweep is), Olmer's
  speech and the handshake, two moves on the color, *"Olmer said to follow the [color]"*, the death
  text verbatim, the Access Tunnel, the ladder, daylight and Commerce Street.
- **The wire** — *"like the ones you've sometimes seen Bobby carrying around"* (`story.ni:8254`);
  it stays in the jailhouse when she goes down.
- **The chapter's end** — the ladder text, then Chapter 6's row in `define chapters`.
- **The Vedd idiom register** reaches the three trees when Phase 8 writes them, not now. Olmer's
  *"the Goddesses see fit to bless me"* and *"Goddesses' blessings upon you"*, Jacobs's *"Goddesses
  curse it"*, the blankets' *"Goddesses-know-what"* are source texture and stay.

### Gaps found, not decided

1. **The clock** — how long she has, and where it starts: at waking, at Bobby's beating, or at
   Jacobs leaving. Phase 10 measures against the source's own timers (two turns to Bobby, three
   to the wire, two and two in the deception) and the walkthrough's turn count, and reports.
2. **The guards' return** — the beat itself and its text, and whether anything warns her first
   (the source has no warning sound in the jail once Bobby's door slams). David's; Phase 10
   builds a placeholder and reports.
3. **The sewer without Olmer** — the port's drain is reachable with the wire alone, and the
   source sets the color and shuffles the glyphs only if Olmer is in the drain room at the drop
   (`story.ni:8650-8653`); without him both keep their defaults. Phase 10 reports what the source
   actually does there — a soft lock, a guess, or an accidental win — before anything is decided.
4. **What she loses** — the confiscation takes everything but the baggy clothes; what that is at
   the capture depends on Chapters 1-4's builds (the satchel, Teisha's dress and hat, whatever
   Maiden House gave her). Phase 10 reports the list. Nothing in the source returns, and nothing
   later in the source needs anything from before the jail.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); Chapter 6's opening — daylight on Commerce Street, Book 8's *A New Morning*, and the
rooftops Bobby named.

**Chapter 5's questions are answered.** Extent, pressure (the guards' clock), perception (Olmer),
the source carry-list, and four gaps. The section is complete for Phase 10's purposes: every
room, event, refusal, both deaths, and the three trees (as stubs) in Books 6 and 7 are
authorized, the one new beat is authorized as a trigger with a placeholder, and the lines are
David's during play-testing.

---

## Chapter 6 — The Rooftops and Black Gate Estate

**Status**: COMPLETE for Phase 10 (opened and closed 2026-09-01, session aebae2) — six rulings, one carry-list, four gaps; lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01): from daylight on Commerce Street to the butler's side door, letter in hand

Two seams were put to David: (A) the butler's side door onto East Commerce Street, where the
source prints its own next heading (`output chapter heading "Chapter 6 - Gallows"`,
`story.ni:9561`) and where its hint chain ends the Search (`story.ni:1083`); (B) through Bobby's
hanging to the blackout, where the source prints *"Chapter 7 - Mercenaries Again"*
(`story.ni:9687`) — the source ties the two, since the gallows go up the instant she holds the
letter (`story.ni:9589`). David: **"A."**

**Chapter 6 is the source's Book 8 (Black Gate Estate, `story.ni:8743-9580`) whole, plus the
post-sewer layer of Book 3's shops and Book 4's jeweler, from the ladder into daylight to the
butler's *"Go now, and don't come back."*** Bobby's hanging (Book 9) is Chapter 7's opening.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 15 new — Closed Alleyway, Rooftop, Rooftop Edge, Balcony (the roof of Black Gate Estate), Patio, Rooftop Garden, Third Floor Landing, Music Room, Audience Area, Supply Closet, Second Floor Landing, Living Room, Master Bedroom, Library; the Third Floor Balcony is commented out in the source (`story.ni:9181-9192`). Plus the morning state of Commerce Street, the four shops, East Commerce Street, Lord's Market and Sandler & Sons (Chapters 2's rooms by day, after the sewer) |
| Opens with | *"Daylight!"* — early morning, filthy, hatless; the market, Maiden House and Fossville's front gate refused (`story.ni:8757-8770`); *"You are utterly filthy"* (`story.ni:1325`) |
| Conversations | 4 post-sewer layers, all second-visit trees on Chapter 2's cast — `GE16-19` Germaise (4: the scowl, no Bobby, no back door, *"Go away, Jack"*), `HO18-24` Holstenoffer (7: *"you look like you've had the worse of it"*, Fiona was in looking for her, the back door refused until *"It's to help Bobby"*, then the little metal door — the chapter's one way up), `OM9` Olgan (1: *"Looking for an easy way in, little thief?"*), `DS24-30` Dame Sandler (7: *"you look an absolute fright"*, *"Did Bobby give you any... instructions?"*, the back-door hint, and she locks the door behind her). Plus the butler's four refusals and two letter reactions (`story.ni:9527-9543`). No new tree |
| Scenes | 2 — A New Morning (from the sewer's end, `story.ni:8747`), The Search (from the balcony to East Commerce Street, `story.ni:9002`) |
| Scripted events | The sewer's after-effects (Maiden House's door unlocked, the laundry finished, the orphans gone, day set, `story.ni:8749-8755`); `HO24` moves her to the alley (`story.ni:4697-4700`); the gutter climb (`story.ni:8818`); the jump to the balcony (`story.ni:8901`); the intruder text on the stairs down (`story.ni:9065`); Fossville's voice on the second floor (`story.ni:9275`); the winch and the chandelier (`story.ni:9235-9241, 9425-9468`); the letter revealed, read, and taken (`story.ni:9471-9496`); the butler's catch on leaving the library with it (`story.ni:9506`), the stairwell eavesdrop and the side door (`story.ni:9547-9569`) |
| The exit | Shoved out a side door onto East Commerce Street with the letter — *"Keep yourself out of the Baron's way"*. Chapter 7's row |
| Puzzles | Holstenoffer's back door (`HO24`), the rooftop jump, **turn the winch → lower the chandelier → search it → take the letter**. `test rooftops` + `test blackgate` (`story.ni:12431-12433`) |
| Pressure | None on the street in the source (the mercenaries *"will be searching for you everywhere"* is text; none appear); none in the house before the scripted catch — the Baron is a voice through the floor, *"I'll be leaving again within an hour"*, and never comes up |
| Deaths | None. The butler lets her go |

### The morning on Commerce Street — DECIDED (David, 2026-09-01): fear without teeth

Put to David as the source has it (a quiet hub; the refusals and the shops steer her to
Holstenoffer's back door) against a real search with teeth, or fear without teeth as Chapter 4's
street push. David: **"C."**

**This is new content.** Mercenaries are on Commerce Street that morning, seen or heard, and she
ducks them — into a shop, a doorway, the alley — and they never take her. The §5 per-scene
exception, ruled for this scene as it was for Chapter 4's walk: the chapter's fear is the
street's, its teeth are none. The beats and their lines are David's.

### Inside Fossville's house — DECIDED (David, 2026-09-01): fear without teeth

Put to David as the source has it (no clock; the Baron's hour is atmosphere and the butler the
only encounter) against a clock with teeth (the hour runs out and someone comes up), or fear
without teeth. David: **"C."**

**This is new content.** Servants on the stairs, doors below, near misses in the hallway — beats
that keep her moving through the house and cannot take her. The source's scripted catch stands
as the house's one real encounter, and it is a release, not a capture. The Baron's *"within an
hour"* stays as a line, not a clock. The beats and their lines are David's.

**What this does for the chapter.** Chapters 4, 5 and 6 now answer the vision's open question
(§5, *What supplies pressure outside a chase?*) three different ways in three consecutive
chapters: fear without teeth on the night walk, a clock with teeth in the jail, fear without
teeth again on the street and in the house. The jail is the one that can take her; the two
around it are dread. That is a rhythm, not an inconsistency — push / pull / quiet with the
weight where the story wants it.

### What the letter says — DECIDED (David, 2026-09-01): Jacqueline, as written

The chapter's centerpiece, and a reading in vision.md §3e that had been waiting on David: the
source's letter says *"this child, who bears no fault for the circumstances of her birth,"* *"upon
her sixteenth birthday,"* and declares the heir as **Jacqueline Toresal** (`story.ni:9481`); §3e
rules that the public language of the claim names her as the Duke's son, and carried a derived
reading, marked awaiting confirmation, that the law and the letter would both say son. Put to
David: as written; or the Duke's son, Jack; or something else. David: **"A."**

**The letter carries as written — Jacqueline, and "her".** The one document in the world that
names her rightly is the one Fossville hid, and it is the first time she reads her own name.
§3e's public record still says son: the law, the claim as it must be pressed, the people who
know. The Duke's own hand is the exception to it. Whether the Duke saw her truly or simply knew
is not decided and, under the axiomatic-world rule (§2), never explained. The reaction text
carries — *"just someone who happens to have the same first name as you — but in your heart you
know it must be true"* (`story.ni:9484`) — and §3e's consequence for the coda stands with the
subject sharpened: the claim is written in the wrong name everywhere except here.

### Who sees her — DECIDED (David, 2026-09-01): the butler sees; Fossville does not

- **Germaise and Holstenoffer do not see** (Chapter 2). `GE16-19` and `HO18-24` carry as
  written — *"Yer a good lad and I like yeh"* (`HO23`), the boy word from the friend who opens
  the door.
- **Olgan Minor sees** (Chapter 2). `OM9`'s *"little thief"* is a neutral noun; carries.
- **Dame Sandler sees** (vision.md §3d) and is inside the arrangement. `DS24-30` carry as
  written — *"Squire Jack"*, *"my dear boy"* (`DS27, DS29`) are her public words in public with
  Pieter listening, exactly as §3g has it for her.
- **The butler — DECIDED (David, 2026-09-01): he sees.** *"Child"* and *"little thief"* while he
  holds her; then on the doorstep, *"A bit of advice, girl"* (`story.ni:9571`). Put to David three
  ways: a tell; the Baron's word repeated from the stairwell, carried as overheard knowledge; or a
  word to change. David: **"A."** So *"girl"* carries as a tell — a sour old servant with the
  talent, who lets her go because of what he sees and says so only once, at the door. Public
  tier, perceives: beside Teisha, Shannon and Olmer in §3f's matrix.
- **Baron Fossville — DECIDED (David, 2026-09-01): he does not see.** His one line about her here
  is through the floor: *"no greater challenge to your mercenaries than a fourteen-year-old girl"*
  (`story.ni:9569`). Put to David: he sees, and uses the true words as a weapon; he does not see,
  and knows only from the letter; or defer to the chapter where he first looks at her. David:
  **"B."** So *"girl"* from Fossville is **knowledge, not perception** — he has read the letter —
  and when he looks at her he sees the urchin boy the parchment describes, which is part of why
  she keeps slipping past him. Knows everything, does not perceive: beside Fiona in §3f's matrix.
  This rules Chapter 2's collision retroactively (his *"Off with you"* was a man who did not see)
  and governs the ball and the confrontation ahead.
- **David's note, recorded to vision.md §3d (2026-09-01)**: *"this is one of the things that will
  fundamentally improve the story. A transgender protagonist that is seen by many people as she
  is. A young woman."* Olmer and the butler are that principle at work in two consecutive
  chapters: strangers who owe her nothing and see her anyway.

### What carries as the source has it — RECORDED (2026-09-01, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 6
surfaces carry unchanged and were not put to David as questions:

- **A New Morning** (`story.ni:8747-8770`) — the day state; the three refusals (the market:
  *"they looked in Grubber's once, they'll look there again"*; Maiden House: *"they won't let you
  out of the orphanage until you're an old crone"*; the front gate: *"Use the rooftops, Bobby
  said"*); the sun (`story.ni:12345`); the Jacobs mansion refusal after jail (`story.ni:4912`).
- **The shops, second visit** — as stubs per the standing conversation rule: `GE16` on entering
  the bakery after the sewer (`story.ni:4337-4343`), `HO18` on entering the butcher's
  (`story.ni:4556-4571`) with Holstenoffer's atmosphere line silenced after the sewer
  (`story.ni:4548-4550`), `HO24`'s side effect (the player to the alley), `OM9` in Olgan's idle
  set, `DS24` on entering Sandler's while dirty and `DS30` fired on leaving (`story.ni:5244-5284`).
  The clothier's and the moneylender's dirty-Jack refusals are Chapter 2's and fire unchanged.
- **The Closed Alleyway** (`story.ni:8776-8824`) — the walls, the metal door refused from this
  side (*"there's not much point in going back"*), the gutter and the climb text, *"shimmy"*.
- **The rooftops** (`story.ni:8834-8959`) — the miniature mountain range and Bobby's exclaimed
  virtues, the chimneys and smoke, every direction but east refused (*"focus on getting to
  Fossville's mansion"*), *"The only way down from here is a long, deadly fall"*, the distant
  balcony, the jump text verbatim, *"jump"* as going east.
- **The roof of Black Gate Estate** (`story.ni:8963-9068`) — the balcony (west refused: *"you
  can't leave until you find the letter"*), the patio and its fountain, the garden and its
  autumn roses, the steps, the intruder text on the first descent during the Search
  (`story.ni:9065`).
- **The third floor** (`story.ni:9074-9258`) — the landing, the music room and the coat of arms
  (the stoat with a milkweed flower), the harp's three answers (`story.ni:9122`), the audience
  benches, the supply closet, the winch, the crank, the rope, the hole.
- **The second floor** (`story.ni:9264-9361`) — Fossville's voice on first arrival
  (`story.ni:9275`), *"You can't go down to the first floor — Fossville is down there!"*, the
  living room and its portraits (*"a certain cruel gleam"*), *"look behind"*, the sliding doors'
  rattle, the four-poster bed searched.
- **The library** (`story.ni:9367-9496`) — the bookshelves and the old books, the chandelier
  raised and lowered, *"Odd — rolled up and stuffed into one of the empty candle holders"*, the
  letter's text verbatim (per the ruling above), the reaction, *"Don't forget the letter!"*.
- **The butler** (`story.ni:9502-9571`) — the catch on leaving the library with the letter, the
  arm-grip refusals (*"some kind of death pinch"*), *"Hush"*, the letter shown (*"I never saw it"*),
  the stairwell eavesdrop verbatim — Fossville's *"one half-witted street urchin locked in a
  cage"*, *"Gather your men at Lord's Market. We'll deal with the spy first. Once that business is
  finished, we pay a visit to the Widows"* — the two door slams, the kitchens, the side door.
- **The chapter's end** — the side-door text, then Chapter 7's row in `define chapters`.
- **The Vedd idiom register** reaches the four shop layers when Phase 8 writes them, not now.
  Holstenoffer's *"Goddesses, Jack"*, the butler's *"They say no dark deed goes unpunished"* are
  source texture and stay.

### Gaps found, not decided

1. **The street beats** — where on Commerce Street the mercenaries are seen or heard, and what
   she ducks into; David's, at play-testing. Phase 10 builds the morning with a placeholder beat
   at one point and reports.
2. **The house beats** — servants on the stairs, the near misses; David's. Phase 10 builds one
   placeholder on the second-floor landing (where the source already puts the Baron's voice) and
   reports.
3. **The post-jail self-description** — *"it looks like your disguise is shot, too. Well, it was
   fun while it lasted"* (`story.ni:1322`) is the 2009 framing of the hat as a disguise; under
   vision.md §1 the line is David's to keep or rewrite. Reported, not decided.
4. **The hanging's trigger** — the source starts Bobby's Hanging *"when the player carries the
   secret letter"* (`story.ni:9589`), while she is still in the library; under the extent ruling
   the hanging is Chapter 7's. Phase 10 builds Chapter 6's end as the side-door move and reports
   where Chapter 7's trigger has to sit.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); Chapter 7's opening — East Commerce Street with the letter, the crowd flowing toward
Lord's Market, the gallows.

**Chapter 6's questions are answered.** Extent, the street and the house (both fear without
teeth), the letter's words, perception (the butler sees, Fossville does not), the source
carry-list, and four gaps. The section is complete for Phase 10's purposes: every room, event,
refusal, the puzzle and the four shop layers (as stubs) in Book 8 are authorized, the two new
beats are authorized as triggers with placeholders, the letter's text is settled, and the lines
are David's during play-testing.

---

## Chapter 7 — The Gallows and the Raid on Maiden House

**Status**: COMPLETE for Phase 10 (opened 2026-09-01 and closed 2026-09-02, session 86bb3d) — five rulings, one carry-list, four gaps; produced against Book 9 (Bobby's Execution, `story.ni:9581-9691`) and Book 10 (Raid on Maiden House, `story.ni:9692-10007`); lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-01): the hanging and the raid together, ending at the privy window

The source draws two seams here and they disagree. Its printed headings make the blackout a
boundary — `output chapter heading "Chapter 7 - Mercenaries Again"` fires when Bobby's Hanging
ends (`story.ni:9687`). Its hint chain, its scene chain and the designers' own walkthrough draw
the boundary at the window instead: `Raid Hints` runs until Shannon's Company begins
(`story.ni:1087`), `Leaving Maiden House` ends at Behind Maiden House (`story.ni:9984`), and
`test walk2` closes with `test maidens` climbing out (`story.ni:12409, 12437`). Put to David:
(A) the hanging alone, ending at the blackout; (B) the hanging and the raid together, ending as
she goes through the privy window; (C) something else. David: **"B."**

**Chapter 7 is the source's Book 9 and Book 10 whole, from the butler's side door to the privy
window.** Shannon climbing out after her (`story.ni:10020-10025`, where the source prints
*"Chapter 8 - Red Gate Estate"*) is Chapter 8's first beat.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 1 new — the Secret Closet (`story.ni:9866`), Book 10's only room. Plus East Commerce Street and Lord's Market in their hanging state (Chapter 2's rooms, as the source's `occasionally crowded place` region), and Maiden House by day — Dormitory, Hallway, Laundry, Privy, Behind Maiden House (Chapter 3's rooms) |
| Opens with | East Commerce Street with the letter; the crowd flowing east, *"everyone is heading east, towards Lord's Market"*; west refused (`story.ni:9600`) |
| Conversations | Fiona's two bedside layers — `FI21-25` (5: the croak, the apology, *"Bobby is dead"*, the sobs) and `FI26-31` (6: *"You're the tutor, aren't you?"*, *"Tell me about my father"*, Theresa's fate, *"What do I do now?"* which gives the key). Three scripted events `B_H1-3` (Fossville's speech, Rudup named, the sentence). The six-row `table of widows meeting mercenaries` heard from the closet (`story.ni:9968`). No new tree |
| Scenes | 6 — Bobby's Hanging, Bedside Consolation, Raid on Maiden House, The Banging, Hidden in the Closet, Leaving Maiden House (`story.ni:9589, 9698, 9797, 9819, 9948, 9984`) |
| Scripted events | The gallows and the crowd placed, the market's shoppers removed (`story.ni:9593-9598`); the execution one turn after she enters Lord's Market (`story.ni:9606`); `B_H1-3` as the current script; the blackout and the move to her bunk (`story.ni:9677-9690`); `FI21` on waking; the front door locked and the pounding (`story.ni:9803-9806`); Fiona follows her to the hallway and goes to the laundry (`story.ni:9808`); Shannon opens the board (`story.ni:9848-9855`); the closet spool (`story.ni:9953`); Theresa's expulsion on entering the hallway afterward (`story.ni:9998-10006`); `FI26`, and `FI30` gives the brass key (`story.ni:9778`) |
| The exit | The privy window during Leaving Maiden House, into Behind Maiden House. Chapter 8's row |
| Puzzles | None. `test hanging` is *"e / x structure / z / z / z"*; `test maidens` is *"3 / se / se / n / z / z / z / z / z / z / nw / 4 / sw / enter window"* (`story.ni:12435-12437`) |
| Pressure | The crowd's rails in the square; then a real clock — The Banging ends in capture when nine minutes pass and she is not in the closet (`story.ni:9819`) |
| Deaths | 1 — the captain's fist, *"You're beginning to damage my credibility, boy"* (`story.ni:9842`). `End the game in death` |

### The square — DECIDED (David, 2026-09-01): fear without teeth

Put to David as the source has it (a set piece on rails made of crowd — west refused on East
Commerce Street, *"you probably shouldn't attract attention to yourself"*, the execution set for
the turn after she enters Lord's Market, everything but examining the gallows refused, three
scripted beats nothing she does can change; the mercenaries Fossville sent to *"gather your men
at Lord's Market"* never appear) against fear without teeth, or teeth (being seen in the square
is the capture). David: **"B."**

**This is new content.** The mercenaries are visible — ringing the platform in the square, and
Chapter 6's street mercenaries in the crowd on the way — and she keeps her head down while the
crowd keeps her hidden. They never take her. The set piece on the platform plays untouched. The
§5 per-scene exception, ruled for this scene as it was for Chapter 4's walk and Chapter 6's
street and house: the fear is the square's, its teeth are none. The beats and their lines are
David's.

**What this does for the rhythm.** Chapters 4 through 7 now run fear, teeth, fear, fear. The
jail is still the one that can take her; the hanging's weight is what is on the platform, not
who is in the crowd.

**The trigger — RECORDED (2026-09-01): Chapter 6's fourth gap closes here.** The source starts
Bobby's Hanging *"when the player carries the secret letter"* (`story.ni:9589`), in the library.
Under Chapter 6's extent ruling and this one, the scene starts when the butler shoves her out
the side door (`story.ni:9561`): the gallows, the crowd and the mercenaries are in place before
Chapter 7's first room prints, and nothing of the hanging leaks back into Black Gate Estate.

### What the mercenaries know at the raid — DECIDED (David, 2026-09-01): they still hunt the boy Jack

The source's captain has it both ways through the closet wall — *"Where is she?"*, *"we know
she came here after the hanging"*, *"Where did the girl go?"* (`story.ni:9970-9978`) — and then,
if she is caught, *"You're beginning to damage my credibility, boy"* (`story.ni:9844`). Under
vision.md §3f the mercenaries hunt a scion from a parchment that describes a body, and Chapter 6
added the stairwell line Fossville said to the man he was sending here: *"no greater challenge
to your mercenaries than a fourteen-year-old girl"* (`story.ni:9569`). Put to David: (A) the
hunt's terms changed in the stairwell and the men now hunt a girl; (B) the men still hunt the
boy Jack; (C) the captain heard "girl" and does not believe it; (D) something else. David:
**"B."**

**The middle tier's knowledge does not move.** Fossville's *"girl"* was one line to one man who
did not take it in, or took it as the Baron's sneer; the parchment still says a body, and the
inference is still a boy. So in the overheard table the captain's *"she"* and *"the girl"*
convert to *"he"* and *"the boy"* — *"Where is he?"*, *"we know he came here after the hanging"*,
*"Where did the boy go?"* — and the capture ending's *"boy"* carries as written. Everything the
mercenaries say about her from here to the ball is about a boy, and §3f's row for them stands:
they know there is a scion, they assume a boy, they have never seen her.

**Theresa's words follow from §4 without a new question.** She does not see; her *"There she
is!"* (`story.ni:9844`), *"that child"*, *"the child is hiding there"*, *"one ungrateful little
brat"* (`story.ni:9972-9976`) are the boy words and the neutral nouns — *"There he is!"*, and
the rest as written. The betrayal is the same act in either set of words: she gives up the
closet.

### Shannon's ruse — DECIDED (David, 2026-09-01): she screams "Jacqueline" anyway

Shannon is the one widow who sees her (vision.md §4), and the source's tell is that she alone
says *"Miss Jacqueline"* as a matter of course. In the raid she screams *"Jacqueline!
Jacqueline, wait!"* down the hall with the mercenaries in the house, then lies to Fiona for
the captain's benefit — *"she slipped past me and wriggled out the privy window"*
(`story.ni:9976`). With the men hunting a boy, put to David: (A) Shannon plays the ruse in the
boy words, *"Jack! Jack, wait!"*, *"he slipped past me"*; (B) she screams "Jacqueline" anyway;
(C) something else. David: **"B."**

**The ruse carries as written, and a true name is said aloud in front of the middle tier.**
Shannon's instinct under pressure is the name she actually uses, not the one the men are
listening for. The captain hears a girl's name shouted and a girl described going out a window,
and does not connect either to the boy on his parchment; he curses and sends his men into the
city, as the source has it (`story.ni:9978`). So the ruse holds — the men are hunting Jack,
and a Jacqueline who went out a window is somebody else's problem.

**What it leaves.** A loose thread, David's to pull or not: the captain has now heard the name
*Jacqueline* in the house where the boy Jack lives. Nothing in the source picks it up, and
nothing here decides that it should. §3g's *position picks the word* is not overruled by this —
Shannon is not choosing a public word, she is failing to, which is the ruling's point.

**Jack's grin in the dark carries** (*"you'll have to revise your opinion"*, `story.ni:9976`).
Under this ruling it is the source's meaning: Shannon lied fast and the men believed her.

### Fiona and the name — DECIDED (David, 2026-09-02): knowledge from the Duke

Two rulings pull against each other in Fiona's last scene. vision.md §4 (2026-08-21): Fiona does
not see, and her *"Jacqueline"* becomes *"Jack"*, the *"like a daughter"* line included — the knot
§4 names. Chapter 6 (2026-09-01): the letter carries as written, the Duke's hand names
Jacqueline, and Fossville's *"girl"* was ruled knowledge from the letter, not sight. Fiona is
the person the Duke hired; shown the letter at the bedside she says *"I know, child, I know all
about it"* (`story.ni:9710`), and after the raid she says the name three times — *"I'm sorry I
could not tell you sooner, Jacqueline"*, *"Please, Jacqueline"* (`FI28`, `story.ni:9733`), *"It's
time you learned something of your past, Jacqueline"* (`FI30`, `story.ni:9737`). Put to David:
(A) knowledge from the Duke — her *"Jacqueline"* here carries as knowledge, as Fossville's
*"girl"* did; (B) the conversion stands and the name is news to her too; (C) something else.
David: **"A."**

**Fiona has known the name Jacqueline for fourteen years, because the Duke told her, and has
called the child Jack every day of them, because that is the arrangement she was paid to keep
and the child she sees.** Here, with the arrangement over — Theresa expelled, the Baron's men
coming back, the key in Jack's hand — she says the name from the letter to Jack's face for the
first time. `FI28` and `FI30` carry as written, *"like a daughter"* included. *"I know all about
it"* means exactly that: the lineage, the letter, and the name in it.

**§4's cell for her does not move.** Knows everything, does not perceive — and now "everything"
includes the name. Chapter 3's conversions stand: in the kitchen the arrangement is still in
force, and Fiona's *"you've been like a daughter to me"* / *"I love you, too, Jacqueline"*
(`story.ni:6134`) convert as §4 rules. This scene is the turn, not a reversal. The parallel with
Fossville is exact and worth keeping in view: two people who have never seen her, both using her
right name, one from a stolen letter and one from a dead man's trust.

### Who sees her — RECORDED (2026-09-02, from the rulings above and vision.md §3f; no new perceiver)

- **Baron Fossville does not see** (Chapter 6). On the platform he never looks at her; his
  speech is public and names nobody but Bobby. His hanging-state description (*"This is a
  performance to him"*, `story.ni:9653`) and the kissing refusal (*"the man who murdered your
  father"*, `story.ni:9660`) carry.
- **Hester Rudup sees** (Chapter 4). On the platform he has no line to her; *"the man who
  captured you last night at the fountain"* (`B_H2`) carries. His chain of office over the red
  robes carries.
- **Bobby did not see** (§3f, Chapter 3). `FI25`'s *"I never told him my name!... you never told
  him your real name... and he never really knew you at all"* then *"what if he did know you?
  What if he knew you even better than you knew yourself?"* (`story.ni:9727`) carries as
  written — it is about the letter and the jail, the knowledge axis — and is flagged below as a
  line whose weight the rewrite changes.
- **The mercenary captain does not see** and hunts the boy Jack (ruled above). He hears
  *"Jacqueline"* shouted and does not connect it (ruled above).
- **Widow Theresa does not see** (§4). Her raid words are the boy words (ruled above).
- **Widow Fiona does not see, and knows the name** (ruled above).
- **Widow Shannon sees** (§4). *"Jacqueline!"* in the raid, *"Miss Fiona"* in the ruse, and
  *"Wait, Jacqueline"* as Chapter 8 opens (`story.ni:10046`) all carry.
- **The crowd** has no line about her.

### What carries as the source has it — RECORDED (2026-09-02, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 7
surfaces carry unchanged and were not put to David as questions:

- **East Commerce Street in the hanging** (`story.ni:9585-9645`) — the `occasionally crowded
  place` region; the crowd backdrop and its description; west refused; the one-in-four *"More
  people wander past"* texture (`story.ni:9603`); the talk refusals (*"No one pays any attention
  to you"*); the *"you probably shouldn't attract attention to yourself"* refusal for everything
  else. The mercenaries in the crowd (ruled above) sit on top of this, not in place of it.
- **Lord's Market in the hanging** — the market's shoppers removed and returned
  (`story.ni:9595, 9683`); the gallows as a supporter whose printed name is *"sort of wooden
  structure"* until first examined (`story.ni:9616`: *"Suddenly your mouth goes dry. It's a
  gallows."*); *"There is some sort of wooden structure / A gallows has been erected in the center
  of the square"* (`story.ni:9631`); every other verb on it refused (*"too many people in your
  way"*), and on Bobby (*"You can't reach him"*); the after-scene refusal *"You can't bring
  yourself to touch it"* for any later visit.
- **The execution** — one turn after she enters the square (`story.ni:9606`; the designers'
  comment on why carries as a build note); Bobby, Fossville and Rudup moved to the gallows;
  `B_H1-3` verbatim (`story.ni:9662-9669`), one per turn, as the current script; Rudup arrives
  after `B_H2`; *"Everything goes black."*
- **The blackout** (`story.ni:9677-9690`) — the platform cleared, the shoppers back, Theresa
  removed until the raid, Fiona to the Dormitory, the pause, and Jack moved to her bunk without a
  room description. The source's *"Chapter 7 - Mercenaries Again"* heading is not printed; the
  port's chapter rows are Chapter 6's and Chapter 8's.
- **Bedside Consolation** (`story.ni:9698-9716`) — the waking text verbatim (*"And then it
  comes back to you. It's Bobby. Bobby is dead."*); leaving the Dormitory refused (*"You're still
  in shock"*); the letter shown (*"I know, child... I know all about it"*, under the ruling
  above); giving the letter routed to showing it (`story.ni:9713`).
- **`FI21-25`** — as a stub per the standing conversation rule: `FI21` on waking, `FI22`/`FI23`
  exclusive of each other, `FI24` transitional into `FI25`, and `FI25` ends the scene into the
  raid. *"Shannon found you, after the crowd dispersed"* (`FI22`) is flagged below.
- **The raid begins** (`story.ni:9797-9816`) — the front door closed and locked; the pounding
  and *"Open in the name of Baron Fossville!"*; Fiona's *"Go to the laundry room!"*; Fiona
  follows her to the Hallway and goes southeast ahead of her (`story.ni:9808`); opening or
  unlocking the front door refused (*"Are you insane? Fossville's men are right outside!"*).
- **The Banging** (`story.ni:9819-9844`) — starts one turn into the raid; the every-turn
  pounding lines (`story.ni:9821`); leaving the Hallway anywhere but the Laundry refused
  (*"Get into the laundry room, quickly!"*); Fiona and Shannon refuse conversation (*"just go!"*,
  *"Get inside!"*); leaving the Laundry with the closet open refused; **nine turns not in the
  closet is the capture** — the door crashes in, Theresa points (*"There he is!"* under the
  ruling above), the captain's *"boy"*, the fist, `End the game in death`. Carries with its
  teeth under §5's standing consequence.
- **The closet** (`story.ni:9848-9946`) — Shannon pushes the board aside on entering the
  Laundry; `hide` enters it; the Secret Closet pitch black, *"The walls press close"*, *"like a
  coffin"* (`story.ni:9929`), listening (*"your own harsh breathing"*, `story.ni:9917`), singing
  refused; the board replaced behind her; opening it while the raid is on refused (*"The Baron's
  men would catch you the instant you left"*); the door invisible before it has ever been opened
  (`story.ni:9932-9944`).
- **Hidden in the Closet** (`story.ni:9948-9982`) — the six-row table spooled one row a turn
  while she is in the closet, with the captain's and Theresa's words converted per the rulings
  above and Shannon's as written; leaving early ends the scene early; at the end the board opens,
  the front door is open, and she is moved to the Laundry if still inside. *"That was too
  close."*
- **Leaving Maiden House** (`story.ni:9984-10006`) — the front door refused (*"They'll be
  watching the front door for sure"*); Shannon's *"go talk to Widow Fiona"*; the closet refused
  (*"almost as bad as the jail cell"*); the expulsion on entering the Hallway, verbatim — the
  stare-down, *"Get out and never set foot in this orphanage again"*, Theresa's *"bitter,
  helpless glare"*, the slam (`story.ni:9998-10006`); leaving the Hallway refused until `FI30`
  (*"There are things you need to know before you leave"*, `story.ni:9790`); after `FI30`,
  talking to Fiona again is *"There is no time"*.
- **`FI26-31`** — as a stub: `FI26` on entering the Hallway after the expulsion, `FI30` gives the
  brass key (`story.ni:9778`), `FI31` as the re-entry gambit during Leaving Maiden House.
- **The brass key** (`story.ni:9793`) — Chapter 8's object, given here.
- **The chapter's end** — going through the privy window during Leaving Maiden House. The
  `define chapters` block gains Chapter 8's row on that trigger. The source's window text with
  Shannon climbing out after her, Shannon moved to Behind Maiden House, and the *"Chapter 8 -
  Red Gate Estate"* heading (`story.ni:10010-10025`) are Chapter 8's opening, not this chapter's
  exit text.
- **The Vedd idiom register** reaches `FI21-31` and the closet table when Phase 8 writes them,
  not now. Shannon's *"oh, Goddesses"* and Fiona's *"Goddesses"* are source texture and stay.

### Gaps found, not decided

1. **The square's beats** — where the mercenaries are seen on East Commerce Street and around
   the platform, and what keeps her hidden; David's, at play-testing. Phase 10 builds one
   placeholder beat on East Commerce Street and one in the square's crowd texture before the
   execution fires, and reports.
2. **How she leaves the square** — the source has her scream, claw at the crowd, fall, and black
   out, and `FI22` has Shannon find her *"after the crowd dispersed"* — with no mercenaries in
   the square that is plausible. Under the ruling above the square is full of men hunting her
   when she collapses. Whether the crowd covers that too, or Shannon's finding her needs a beat,
   is David's. Reported, not decided; Phase 10 builds the source's blackout and `FI22` as written.
3. **`FI25`'s weight** — *"he never really knew you at all"* / *"what if he did know you?"* is
   written for a Bobby who did not know Jack was a girl in disguise; under the rewrite Bobby did
   not see her and the letter is what he knew. The line carries as written; whether it says what
   David wants it to now is David's. Reported, not decided.
4. **The loose thread** — the captain has heard *"Jacqueline"* in the house where the boy Jack
   lives (ruled above). Nothing in the source picks it up. Handed forward as David's to pull or
   not; Phase 10 builds nothing for it.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); Chapter 8's opening — Shannon through the window after her, the park wall, East
Commerce Street with a widow at her elbow, and Red Gate Manor.

**Chapter 7's questions are answered.** Extent, the square (fear without teeth), what the
mercenaries know (the boy Jack), Shannon's ruse (the true name, said aloud), Fiona and the name
(knowledge from the Duke), perception (recorded, no new perceiver), the source carry-list, and
four gaps. The section is complete for Phase 10's purposes: every room, scene, event and refusal
in Books 9 and 10 is authorized, the two Fiona layers and the closet table are authorized as stubs
with their conversions named, the raid's clock and its death carry with teeth, the square's
mercenaries are authorized as placeholder beats, and the lines are David's during play-testing.

---

## Chapter 8 — Red Gate Estate

**Status**: COMPLETE for Phase 10 (2026-09-02, session ade32b) — four rulings, one carry-list, four gaps; produced against Book 11 (Red Gate Estate, `story.ni:10008-10587`), with the Book 3 estate front (`story.ni:4858-4901`) and Book 4's Chapter 9 trigger (`story.ni:5262`); lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-02): from the privy window to Sandler's door

The source draws two seams and they disagree. Its theme change (`select theme
"PreparingForBall"` on returning to East Commerce Street clean, `story.ni:10064`) and the
designers' own `test redgate` (`story.ni:12439`, ending *"n / n / d / d / s / s / s"* out of the
house) put a boundary at the front gates, dressed. Its printed heading, its scene chain and its
hint chain all draw it later: Shannon's Company ends *"when the location is Lords Market and the
player is clean"* (`story.ni:10014`), her goodbye fires and the game pushes Jack east into
Sandler & Sons (`story.ni:10067-10071`), `Red Gate Hints` runs until `DS31` fires
(`story.ni:1089`), and *"Chapter 9 - Preparations"* prints when `DS31` starts (`story.ni:5262`).
Put to David: (A) the window to the front gates, walking out clean; (B) the window to Shannon's
goodbye in Lord's Market and the step into Sandler & Sons; (C) something else. David: **"B."**

**Chapter 8 is Book 11 whole, from Shannon coming through the privy window to her hurrying
south in Lord's Market and Jack stepping into Sandler & Sons.** Dame Sandler's second tree
(`DS31-49`, the reveal and the brooch) is Chapter 9's, where the source prints its own heading.
Shannon's Company is the chapter's one scene and its exact span.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 8 new — Entrance Hall (the source's Foyer), Great Hall, Cellar, Second Floor Landing, Office, Third Floor Landing, Master Bedroom, Bathroom (`story.ni:10090, 10163, 10222, 10310, 10326, 10437, 10447, 10474`). The Dining Hall and Kitchen are commented out in the source (`story.ni:10131-10157`) — see the carry-list. Plus Behind Maiden House, East Commerce Street and Lord's Market in Shannon's Company (Chapter 3's and Chapter 2's rooms) |
| Opens with | Shannon scrabbling through the privy window after her — *"Fiona thought I should maybe come with you"* (`story.ni:10020-10025`) |
| NPCs | Widow Shannon, following every turn (`story.ni:10029`); no one else. The house is empty |
| Conversations | Shannon's later tree `SH13-16` (4 quips, `story.ni:6502-6508`), available only outside the house — talk inside the estate is refused (*"reluctant to break the silence"*, `story.ni:10111`). Her scripted lines inside: the portrait, the box, the faucets, the bath, the dress |
| Scenes | 1 — Shannon's Company (`story.ni:10014`) |
| Scripted events | Shannon moved to Behind Maiden House (`story.ni:10016`); the wall climb into East Commerce Street (`story.ni:10049-10053`); the gates unlocked with the brass key and Jack pushed through (`story.ni:4894-4898`); the threshold pause and the tension ratchet (`story.ni:10116-10119`); the furnace and the fire (`story.ni:10261-10282`); the bath, the old clothes, the day dress, `clean` (`story.ni:10543-10551`); the mirror (`story.ni:10573`); *"I suppose we should go see Mrs. Sandler now"* on East Commerce Street clean (`story.ni:4828-4837`); Shannon's goodbye and `try going east` (`story.ni:10067-10071`) |
| The exit | Arriving in Lord's Market clean. Chapter 9's row is Sandler's door |
| Puzzles | One chain — the water is freezing (`story.ni:10540`); break the furniture for wood, light the furnace, bathe. The wooden box on the top shelf (climb the desk) is optional |
| Pressure | None on stage. Shannon's refusals — northeast from the alley, east and west on the street while dirty, south from the hall while dirty (`story.ni:10046, 10057, 10060, 10125`) |
| Deaths | 0 |

### The street — DECIDED (David, 2026-09-02): fear without teeth; the house stays quiet

Put to David as the source has it — the mercenaries entirely off stage: a *"commotion from the
direction of Lord's Market"* and the thought that *"they'll double back and put a watch on
Maiden House soon enough"* (`story.ni:10023`); Shannon's refusals citing men nobody sees
(*"The mercenaries will be watching the entrance"*, `story.ni:10046`; *"Fossville's men will
still be looking for you"*, `story.ni:10057, 10060`); *"no one is about after the awful spectacle"*
on the sprint across the park (`story.ni:10050`); a silent house with no clock — against fear
without teeth on the street, or teeth somewhere in the chapter. David: **"B."**

**This is new content.** Men are visible on East Commerce Street when Shannon and Jack drop
down from the park wall, and Shannon hurries her the short way to the Red Gate front gates.
They never take her. The house stays as the source has it: silent, dusty, empty, no clock. The
§5 per-scene exception, ruled for this street as it was for Chapter 6's morning on the same
street: the fear is the street's, its teeth are none. The beats and their lines are David's.

**What this does for the rhythm.** Chapters 4 through 8 now run fear, teeth, fear, fear, fear —
and this chapter's fear is confined to the doorstep. Once the gates grind shut behind her the
chapter is the spine's pull beat as the vision has it (§5: *Townhouse / Library / Bath — pull,
knowledge*). The jail is still the one scene outside the market that can take her.

**Shannon's refusals carry underneath the new beats**, as the source's texture: the front way
around Maiden House, east and west on the street while dirty, south from the hall while dirty.
The men on the street are the reason those refusals were always giving.

### The bath and the dress — DECIDED (David, 2026-09-02): the presentation flips, as the source has it

This is the scene vision.md §2 and §4 already keep: the furnace lit, the bath (*"feeling
everything wash clean away"*), the old clothes gone, Shannon holding out the Duchess's day dress
(`story.ni:10543-10551`), and the mirror — *"A complete stranger looks back at you... She looks,
you realize, quite pretty. This isn't Jack anymore. This is Jacqueline"* (`story.ni:10574`). From
that turn the player is `clean` for the rest of the game (`story.ni:5061`), and the source's
world reads her as a young lady from here on: *"you are Jacqueline Toresal, daughter of the
Duke"* on examining herself (`story.ni:1330`), Shannon's refusal of Lord's Market lifted
(`story.ni:10058`), the clothier, the Chorus Brothers and Dame Sandler treating her as a lady in
Chapter 9, and the mercenaries' parchment — a hat and a gray cloak — matching nobody. vision.md
§3e rules that the public reliably reads her as a boy while she presents as one; the bath is
where the presentation changes, and what the dress does to the public was not yet ruled. Put to
David: (A) as the source has it — the presentation flips with the dress; (B) the dress changes
her clothes, not what the public sees; (C) something else. David: **"A."**

**From the mirror on, the public reads her as a young lady.** The men on the street let a lady
and a widow pass. The talent stops showing in anyone's *words* from here — everyone uses the girl
words now, perceiver or not — so §3g's *position picks the word* has nothing left to pick between
after this scene, and the tells that carried Chapters 1 through 7 (Teisha's *"almost royal"*,
Olmer's *"miss"*, the butler's *"girl"*, Shannon's *"Miss Jacqueline"*) are a closed set. The
mirror text, the faucet monologue (*"You are the Duke's daughter, a child of nobility"*,
`story.ni:10489`) and the clean self-description carry as written; they are Jack's own
interiority, which §1 already rules is a girl's.

**What the flip means under the remake, and what it does not.** In the source the bath washes
off a disguise and the girl underneath is what the mirror shows. Under §1 there is no disguise
underneath; there is a girl who has been presenting as a boy for survival, and the dress is the
first time her presentation and her self agree. The world reads the presentation, as it always
did (§3e); what changed is which way it points. Nothing here decides what the mirror shows of
the *body* — vision.md §2's coda is where that motif becomes literal, and this scene stays its
figurative version. And nothing here moves anyone's perception cell: Shannon still sees, Fiona
and Theresa still do not, and the perceivers' knowledge is unchanged — it is simply no longer
distinguishable from anyone else's by what they call her.

**Recorded in vision.md §3e as a premise** (2026-09-02): the dress is the second presentation
and the public follows it. Chapters 9 through 11 are asked within it.

### The walk out — DECIDED (David, 2026-09-02): she walks past the men in the dress

The source has the street empty when she comes back out clean; Shannon's *"I suppose we should
go see Mrs. Sandler now"* (`story.ni:4837`), an open walk east, and the goodbye in the square
(`story.ni:10069`). Under the two rulings above the men were on the street when she went in and
the public reads her as a lady when she comes out. Put to David: (A) the watch is still on the
street and she walks past the men who hunt her; (B) the street has cleared, as the source has
it; (C) something else. David: **"A."**

**This is new content.** The men are still on East Commerce Street when the gates open again,
and Jack walks past them in the Duchess's dress with Shannon at her elbow. They look at her and
see nobody they want. Fear without teeth, a second time on the same street, and the first time
the boy words fail to find her: the parchment says a hat and a gray cloak and a boy, and none of
that walks past. The beat and its lines are David's. The walk east to Lord's Market, Shannon's
goodbye (*"Take care, Jacqueline"*) and the push into Sandler & Sons carry as written after it.

**What this closes.** The chapter's fear is now bracketed: the doorstep on the way in, the
doorstep on the way out, and the house between them quiet. The second beat is the first ruling's
proof — the dress does what it does in front of the people it was most needed against.

### Who sees her — RECORDED (2026-09-02, from vision.md §4 and §3f; no new perceiver)

- **Widow Shannon sees** (§4). Her *"Jacqueline"* throughout Book 11 carries — *"Wait,
  Jacqueline"* (`story.ni:10046`), *"What a treasure, Jacqueline!"* (`story.ni:10371`), *"No, you
  should keep those, Jacqueline"* (`story.ni:10374`), *"Take care, Jacqueline"* (`story.ni:10069`),
  and *"Miss Jacqueline"* / *"Jacqueline"* across `SH13-16` (`story.ni:6502-6508`). **One line
  converts**: at the portrait the source has her whisper *"Jack, dear, you have his eyes"*
  (`story.ni:10182`) — the only *"Jack"* in Shannon's mouth in the whole source, and under §3g
  (a perceiver outside the arrangement uses the true words freely) it is *"Jacqueline, dear"*.
  `SH14` carries as the source's own account of the talent: *"I always thought you were special,
  Jacqueline. But that was just my own feelings telling me things, the way they do sometimes"* —
  no explanation, per §2's axiomatic rule.
- **The men on the street do not see** and hunt the boy Jack (Chapter 7). Under the bath ruling
  they read a lady on the way out.
- **Nobody else speaks.** The house is empty; the portrait, the letters and the bed are Jack's
  own thoughts, in her own words.
- **After this chapter the words no longer tell** (ruled above). Chapter 9's perceivers — Dame
  Sandler above all — are still perceivers, and §3f's matrix still holds; it is only the tell
  that has closed.

### What carries as the source has it — RECORDED (2026-09-02, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 8
surfaces carry unchanged and were not put to David as questions:

- **Shannon's company** (`story.ni:10014-10041`) — the scene from Leaving Maiden House's end to
  Lord's Market clean; Shannon moved to the location every turn; *"Shannon follows silently /
  close by"* while the tension is unimportant (`story.ni:10041`); the window text with her
  scrabbling through and *"Fiona thought I should maybe come with you"* (`story.ni:10023`), which
  is this chapter's opening and the `define chapters` row.
- **The park wall** (`story.ni:10046-10053`) — northeast refused (*"watching the entrance"*), the
  boost up the ten-foot wall, the sprint across the park, both moved to East Commerce Street.
  The new street beat (ruled above) lands on arrival, on top of this.
- **East Commerce Street in Shannon's company** — east refused while dirty, west refused
  throughout (`story.ni:10057-10061`); the estate front as Chapter 2 built it, now with its
  `unlock` machinery live: the brass key from the satchel, *"The lock is rusty and stiff from
  long disuse"*, the grinding *clunk* and the push through (`story.ni:4877-4898`); the wire
  refused (`story.ni:4900`); `knock` (*"No one answers"*); the theme change on coming out clean
  (`story.ni:10063-10064`, the port's equivalent); *"I suppose we should go see Mrs. Sandler
  now"* (`story.ni:4828-4837`).
- **The estate as a region** (`story.ni:10075-10084`) — the silence backdrop and its *"holding
  its breath, waiting"*; talk-to-Shannon refused inside (`story.ni:10111-10112`); the dust
  backdrop (`story.ni:10205-10210`).
- **The Entrance Hall** (`story.ni:10090-10129`) — the threshold text and the tension ratchet
  (*"one last glance over your shoulder at the streets of Toresal"*, `story.ni:10116-10119`);
  *"The house is eerie in its stillness"* on the first move (`story.ni:10121-10123`); south
  refused while dirty (*"Are you sure you've found everything you were meant to find here?"*,
  `story.ni:10125-10126`). The Bodyguard-scene refusal (`story.ni:10128-10129`) is Pieter's
  chapter's.
- **The Dining Hall and Kitchen** are commented out in the source (`story.ni:10131-10157`) and
  are not built: the Great Hall is directly north of the Entrance Hall (`story.ni:10163`), as the
  source compiles. `INVENTORY.md`'s count of 10 rooms for Book 11 includes the two dead ones;
  Chapter 8 builds 8. Reported below.
- **The Great Hall** (`story.ni:10163-10218`) — the description with its first-time *"The cream
  of the city once filled this room"*; the portrait, its two-state paragraph, its description
  (*"his lost, beleaguered, and only heir"*), the reach refusal, and Shannon's line after it
  (converted, above); the old furniture, the dustsheets, the sit/stand/take refusals (*"There
  will be time to clean this place later, when this craziness is over"*); `wipe` as rubbing.
- **The Cellar and the furnace** (`story.ni:10222-10304`) — the narrow stairway; the furnace
  cold/hot with its two descriptions; *"The grating squeaks open"* and Shannon's suggestion
  (`story.ni:10245-10250`); `attack furniture` in the Great Hall for the pile of wood
  (*"somehow exhilarating"*, `story.ni:10261-10269`); the wood into the furnace, Shannon's
  match, the roaring fire and the orange light (`story.ni:10277-10304`).
- **The landings** (`story.ni:10310-10320, 10437-10441`) — as Landings, with their distant
  descriptions.
- **The Office** (`story.ni:10326-10433`) — the ransacked room; the bookshelves' first paragraph
  (*"the Duke must have loved his books"*) revealing the box; the box unreachable until she
  stands on the desk (`story.ni:10360-10361, 10416`); the box, its crest, the velvet interior;
  the collected documents and, beneath them, the mother's three unsigned letters (*"Your
  mother's words, you realize"*, `story.ni:10390`); taking them refused (*"they could get
  scattered and lost"*); Shannon's two lines on the box and her *"Your father was such a
  compassionate man"* on the letters (`story.ni:10371-10374, 10399`); the scattered books. All
  optional — nothing in the chain requires the Office.
- **The Master Bedroom** (`story.ni:10447-10468`) — the bare bed, its one-time paragraph
  (*"This, then, is where he died"*, the *"I never asked for this"* thought, `story.ni:10458`);
  the refusals.
- **The Bathroom** (`story.ni:10474-10586`) — the granite basin; the faucets' first-time
  monologue (`story.ni:10488-10489`, carries under the ruling above), Shannon's *"a bath with
  water-pipes! What a luxury"*, turning them, drinking from them; the cold bath refused
  (*"The furnace must be off"*, `story.ni:10540-10541`); the bath itself, the old clothes left
  on the floor and refused ever after, the day dress, `clean` (`story.ni:10543-10566`); the
  mirror on wearing the dress (`story.ni:10573-10574`); undressing refused (*"not really the
  proper time or place"*); *"You can't leave here naked!"* (`story.ni:10585-10586`); *"Once is
  enough for today"*.
- **The chapter's end** — arriving in Lord's Market clean ends Shannon's Company: the goodbye,
  Shannon removed, `try going east` into Sandler & Sons (`story.ni:10067-10071`). The `define
  chapters` block gains Chapter 9's row on Sandler's door, where the source prints *"Chapter 9 -
  Preparations"* (`story.ni:5262`). The new walk-out beat (ruled above) plays before this, on
  East Commerce Street.
- **`SH13-16`** — as a stub per the standing conversation rule, available in Shannon's company
  outside the house only.
- **The Vedd idiom register** reaches `SH13-16` and Shannon's scripted lines when Phase 8 writes
  them, not now. Her *"Goddesses"* is source texture and stays.
- **The source's image-changing rules** for the estate and the dress (`story.ni:1287, 1298`) are
  not carried; the port has no image channel for this story.

### Gaps found, not decided

1. **The street beats** — where the men stand on East Commerce Street when she drops from the
   wall, how Shannon hurries her the few steps to the gates, and what the men do when a lady
   and a widow come out through the same gates; David's, at play-testing. Phase 10 builds one
   placeholder beat on arrival and one on the way out, and reports.
2. **The two dead rooms** — the Dining Hall and Kitchen exist in the source as commented-out
   text (`story.ni:10131-10157`) and in `INVENTORY.md`'s count, not in the compiled game.
   Chapter 8 builds the 8 live rooms under the standing default. Whether the two come back is
   David's; reported, not decided.
3. **"Estelle"** — the third love letter has the mother write *"I pressed Estelle with subtle
   questions but I am certain she knows nothing"* (`story.ni:10390`). The name appears nowhere
   else in the source; the bedroom paragraph names *"his wife, the Duchess"* without a name
   (`story.ni:10458`). Carries as written; whether Estelle is the Duchess is David's to say or
   leave.
4. **Shannon's converted line** — *"Jack, dear, you have his eyes"* is converted to
   *"Jacqueline, dear"* under §3g (recorded above). If David wants the source's slip kept as
   something Shannon says, that is his to rule; Phase 10 builds the conversion.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); Chapter 9's opening — Sandler's door, `DS31-49`, the brooch, and the shopping with
Pieter (Book 12, `story.ni:10588-`), asked within the dress premise recorded here.

**Chapter 8's questions are answered.** Extent (the window to Sandler's door), the street (fear
without teeth, the house quiet), the bath and the dress (the presentation flips, as the source has
it — recorded in vision.md §3e as a premise), the walk out (past the men, in the dress), perception
(recorded, no new perceiver, one Shannon line converted), the source carry-list, and four gaps. The
section is complete for Phase 10's purposes: every live room, the scene, every scripted event and
refusal in Book 11 and the estate front's unlock are authorized, `SH13-16` is authorized as a stub,
the two street beats are authorized as placeholders, and the lines are David's during play-testing.

---

## Chapter 9 — Dame Sandler and the Preparations

**Status**: COMPLETE for Phase 10 (2026-09-02, session ade32b) — four rulings, one carry-list, four gaps; produced against Book 12 Parts 1-3 (`story.ni:10588-10975`) and the clean-Jack layers of Books 3 and 4 (`story.ni:5065-5230, 5440-5602, 4736-4820`); lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-02): Sandler and the shopping, ending as evening falls; the journey is its own chapter

The source's *"Chapter 9 - Preparations"* runs from Sandler's door (`story.ni:5262`) through the
shopping and the night journey to the keep, printing *"Chapter 10 - The Ball"* in the keep's foyer
(`story.ni:11041`); its scene chain, hint chain and `test ballgoing` (`story.ni:12449`) end one
room later, in the ballroom (`story.ni:10967, 1091`). Put to David: (A) Sandler's door to the
keep's foyer; (B) Sandler's door to the ballroom; (C) split it — Sandler and the shopping as one
chapter, the night journey as its own; (D) something else. David: **"C."**

**Chapter 9 is Dame Sandler's reveal and the shopping with Pieter, from Sandler's door to the
moment Journey to the Ball begins**: gown, jewel and dagger in hand, stepping onto Commerce
Street, *"Evening is falling over the city, and the streets are clearing of people"*
(`story.ni:10967-10975`). That text is Chapter 10's opening beat, not this chapter's exit text.
**Chapter 10 is the night journey to Lord's Keep** (Book 12 Parts 3-4, `story.ni:10967-11046`,
over Chapter 4's rooms), and the port's numbering runs one past the source's from here: the
source's Chapter 10 (the ball) is the port's Chapter 11, its Chapter 11 (the Baron) the port's
Chapter 12. The source's seams at the foyer and the ballroom are Chapter 10's to draw between.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 0 new. Sandler & Sons, the Chorus Brothers, the Royal Tunic, Lord's Market, Commerce Street, the Armory, East Commerce Street — Chapter 2's rooms in their clean-Jack, bodyguard state. The Southern Gate (`story.ni:10978`) is Chapter 10's |
| Opens with | `DS31` on entering Sandler's clean — *"Lady Jacqueline... how nice to see you finally looking yourself, after all these years"* (`story.ni:5262-5266, 10615`) |
| NPCs | Dame Sandler; Pieter, from guard to bodyguard (`story.ni:10758-10760`); the Chorus Brothers; the clothier; Olgan Minor |
| Conversations | `DS31-49` and `DS49B` (20 quips, `story.ni:10615-10657`) — the reveal, the claim, the murder, the task, the jewel; `PI1-12` (12, `story.ni:10826-10848`, `PI12` for the Woods only); `CB1-8` clean (8, `story.ni:5484-5498`); `CL1-6` clean (6, `story.ni:5127-5137`); Olgan Minor's talk refused by Pieter (`story.ni:10916`) |
| Scenes | 1 — the Bodyguard scene, from `DS49B` to the ballroom (`story.ni:10758`); plus Getting Changed inside it (`story.ni:5182-5194`) |
| Scripted events | The case unlocked on `DS48`, the jewel worn, `DS49B` and the case locked again (`story.ni:10717-10731`); Pieter unfrozen (`story.ni:10760`) and following (`story.ni:10770-10777`); the letter shown to the Brothers turns them respectful (`story.ni:5551`); `CB6` gives the purse (`story.ni:5528`); the gown bought, Pieter waits outside, the mirror (`story.ni:5114-5121`); *"Come on, Lady Toresal"* (`story.ni:5188-5191`); the dagger under Pieter's glare, worn under the gown (`story.ni:10925-10927`) |
| The exit | Onto Commerce Street with all three. Chapter 10's row is the evening text |
| Puzzles | None — the designers' `test sandler`, `test moneylender`, `test clothier`, `test armory` (`story.ni:12441-12447`) are the shops in order; the source's own hints are the shopping list |
| Pressure | None on stage. Pieter's steering refusals (`story.ni:10806-10818, 10893-10902, 8757-8767`) |
| Deaths | 0 |

### Dame Sandler's reveal — DECIDED (David, 2026-09-02): true words throughout; the public name is not hers to say

Dame Sandler sees (vision.md §3d) and is inside the arrangement, so §3g gives her the true words
in private — and the reveal is private: her shop, Pieter, the case. Her source lines are the true
words already: *"Lady Jacqueline"* (`DS31`, `story.ni:10615`), *"the Duke's daughter"* (`DS32`,
`story.ni:10617`), *"You are the daughter of one of the most loved and respected noblemen in
living memory"* (`DS39`, `story.ni:10634`), *"Good luck, Lady Jacqueline"* (`story.ni:10609`).
Two things her tree does not do: it states the source's law — *"in the absence of a named
successor, the ruler is determined by the will of the people"* (`DS38`, `story.ni:10632`) — where
vision.md §3e rules a claim by succession (the Duke was the King's brother); and it never says
that the public claim names the Duke's son, which §3e rules Jack must press it in. vision.md §3e's
derived reading left this scene as the place the two languages would meet, awaiting David. Put to
David: (A) Sandler speaks true words throughout and says nothing of the public name; her law lines
convert to the succession claim; (B) she names the public claim to Jack's face here; (C) something
else. David: **"A."**

**Sandler's tree carries in the true words, and the wrong name stays out of her mouth.** `DS31-49`
carry as written for address and lineage — *daughter*, *Lady Jacqueline*, *"did you really think
I hadn't guessed?"* (`DS32`, the talent as the source already wrote it, unexplained per §2). The
law lines convert: `DS38`'s *will of the people* and `DS39`'s *"even as his illegitimate heir"*
become the succession claim — the King's brother's child, the King dead without naming an heir —
in David's words, and `DS42`'s *"people who are interested in seeing you succeed"* and `DS44`'s
*"you must announce yourself"* carry over that. The pain of the public name arrives later, from
the record and the room, not from the one person who has always seen her and now says so.

**vision.md §3e's derived reading is resolved by this** (recorded there, 2026-09-02): perceivers
use the true lineage language, and Sandler's reveal is not where the public *son* is spoken. Which
scene is, if any, is Chapter 11's question (the ball), asked within this ruling.

### Who sees her — DECIDED (David, 2026-09-02): Pieter does not see

Pieter is the chapter's new speaking character, with her from Sandler's shop to the ballroom. In
the source he did not know — *"Oh, I was in the dark, all right. To tell you the truth, it's a
bit of a shock, seeing you like this... er, Jacqueline"* (`PI2`, `story.ni:10828`), *"Goddesses,
but it's weird calling you that"* (`PI3`, `story.ni:10830`) — and his road lines slip back to
*"Jack"* (`ATMOS_Pieter`, `story.ni:10787`; *"Don't, Jack"* at the gate, `story.ni:11017`), his
stammer randomized between the three forms (`story.ni:5231-5232`). Under the dress premise
(Chapter 8) everyone uses the girl words now, so his stumbling is habit, not a tell; whether he
has the talent is still this document's to carry per §3d. Put to David: (A) Pieter does not see;
his lines carry as written; (B) Pieter sees and always has; (C) something else. David: **"A."**

**Pieter does not see, and his lines carry as written** — the shock, the stumble, the *"Jack"*
slips, the stammer. He is the dress premise's worked example: the first character who meets the
flipped presentation having known the other one, a decent man catching up to what he is looking
at. His *"I suppose he could have done worse for a daughter"* (`PI6`) and *"He'll try to intimidate
you because you're young and a girl"* (`PI10`, `story.ni:10844`) are the girl words everyone uses
now, not sight. After `DS31-49` he knows the politics — the lineage, the claim, the ball — so his
cell in vision.md §3f is *knows everything, does not perceive*, beside Fiona and Fossville
(recorded there, 2026-09-02).

**The rest of the chapter's cast is already ruled**:
- **Dame Sandler sees** (§3d) and is inside the arrangement; her tree carries in the true words
  (ruled above).
- **The Chorus Brothers do not see** (Chapter 2). Their *"My dear"*, *"Miss"*, *"you certainly
  look respectable"* (`CB4`, `story.ni:5490`; `story.ni:5556`) are the girl words under the dress
  premise; `CB7`'s *"Fossville was here yesterday"* carries.
- **The clothier does not see** (Chapter 2). *"a clean, respectable, and evidently well-to-do
  young lady"* (`story.ni:5069`), *"Sister"*, *"honey"*, *"You'll look like a princess!"* — the
  girl words under the dress premise. His dirty-Jack refusal is Chapter 2's; this is his clean
  layer.
- **Olgan Minor sees** (Chapter 2). His *"Run along, girl, before you cut yourself"*
  (`story.ni:4766`) was a tell while she was dirty and is not one now; carries as written. Pieter
  refuses his conversation (`story.ni:10916`), so `OM1-9` are not reached in this chapter.

### Pressure — DECIDED (David, 2026-09-02): quiet, as the source has it

Put to David as the source has it — nothing on stage; Pieter's steering refusals cite the ball's
clock and Sandler's orders, not the men (*"We don't have time to go traipsing around the city"*,
`story.ni:10902-10903`; *"That's exactly where Fossville will expect you to go"*,
`story.ni:10806-10807`) — against fear without teeth on the streets again, or teeth. David:
**"A."**

**The shopping is the spine's quiet beat**, between Chapter 8's bath and Chapter 10's night
journey (§5: *push / pull / quiet*). Pieter's steering is the only pressure and it is about time.
Nothing new is built for it; the men are not on the streets this afternoon. Chapters 4 through 9
now run fear, teeth, fear, fear, fear, quiet.

### What carries as the source has it — RECORDED (2026-09-02, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 9
surfaces carry unchanged and were not put to David as questions:

- **Sandler's on entering clean** (`story.ni:5244-5267`) — `DS31` started on entry with `DS31`
  unfired; the source's *"Chapter 9 - Preparations"* heading is the port's Chapter 9 row.
- **Leaving Sandler's** (`story.ni:10594-10611`) — refused until `DS49` (*"what I have to tell
  you is dreadfully important"* / *"There are a few things yet you should know"*); refused until
  a jewel is worn (*"aren't you forgetting something?"*); *"Good luck, Lady Jacqueline"* on the
  way out; talking again after `DS49` refused (*"There's no time, child"*); the letter shown
  (*"proof of your heritage, Jacqueline... Guard it well"*).
- **`DS31-49`, `DS49B`** — as a stub per the standing conversation rule, with the law lines
  converted per the ruling above: `DS31` on entry; `DS32`/`DS34` exclusive; `DS36` and `DS40`
  both into `DS41`; the `DS45-48` cluster, with `DS49` fired automatically once the cluster is
  exhausted (the designers' note on why, `story.ni:10715`, carries as a build note); `DS48`
  unlocks the case and lays out the four pieces (`story.ni:10717-10721`); taking one wears it and
  fires `DS49B`, which locks the case again (`story.ni:10723-10731`).
- **The jewelry** (`story.ni:10735-10752`) — ring, pendant, bracelet, brooch, one chosen; the
  brooch *"in the shape of a cup, symbol of the Goddess Magdalena"*; the case's *"Pieter has his
  eyes on you constantly"* refusal (`story.ni:5206`).
- **The Bodyguard scene** (`story.ni:10758-10802`) — from `DS49B` to the ballroom; Pieter
  unfrozen and following (*"looking around warily / his hand on his sword hilt / doggedly keeping
  you in sight"*); his ten road mutters as a dramatic event, capped (`story.ni:10783-10796` —
  they fire during Journey to the Ball, so they are Chapter 10's to hear, authorized here as
  his); the letter shown to him (*"Don't lose that"*, `story.ni:10801-10802`).
- **Pieter's steering** (`story.ni:10804-10819, 10891-10903, 8757-8767`) — no Maiden House; no
  leaving Lord's Market without a gown; no going back to Sandler's; no Brothers once the purse is
  had; no clothier once the gown is had; no bakery or butcher; no armory once the dagger is had;
  no east from Commerce Street; no west to Grubber's without the dagger.
- **`PI1-12`** — as a stub per the standing conversation rule, the `PI1` stammer included;
  `PI8-10` fall away as each errand is done; `PI12` is the Woods' and Chapter 10's.
- **The Chorus Brothers, clean** (`story.ni:5449-5602`) — `CB1` started on entering clean; the
  brothers disrespectful until the letter is shown (`story.ni:5551-5558`, *"a personage of more...
  importance than first we assumed"*), then respectful; `CB3` routed to `CB4` or `CB6` by their
  state; `CB6` gives the purse (`story.ni:5528`); `CB8` shows the letter; the persuasion routes
  (`story.ni:5536-5569`); *"Come back soon... Your business is... always welcome"* on leaving;
  the purse, its drawstring, the gold coins and their refusals (`story.ni:5571-5602`). Their
  dirty-Jack refusal is Chapter 2's.
- **The clothier, clean** (`story.ni:5069-5194`) — the squeal on entering; his idle set
  (`story.ni:5083`); *"Come back soon, sweetie"*; buying without the purse (*"Remember what Dame
  Sandler said, Jacqueline"*, `story.ni:5108`); the gown bought — the fitting, *"Er, I'll wait
  outside"*, the full-length mirror, *"you do look like a princess"* (`story.ni:5114-5121`);
  `CL1-6` as a stub, gated as the source gates them (`CL3`/`CL4` on `DS49`, `CL6` on the purse);
  the ball gown and its undressing refusal (`story.ni:5171-5173`); Getting Changed — Pieter off
  stage while she changes, *"Wow... Come on, Lady Toresal"* on stepping out (`story.ni:5182-5191`).
  The day dress is removed from play here (`story.ni:5116`).
- **Olgan Minor, with Pieter** (`story.ni:10905-10958`) — the proprietor finding something else
  to look at; conversation refused by Pieter (*"Don't waste your breath making conversation,
  Jacqueline"*, and the hint of history between the two men); the big weapons refused; the
  dagger bought under Pieter's glare, *"small enough to hide under your, er..."*, Minor biting the
  coin, the knife under the gown; the plain dagger as a worn weapon, its draw refused until the
  ball (`story.ni:10931-10958`); *"You leave the weapons shop with a sense of relief"*.
- **The chapter's end** — with gown, jewel and dagger, stepping onto Commerce Street. The `define
  chapters` block gains Chapter 10's row on Journey to the Ball's beginning; the evening text, the
  world set to night and the purse removed (`story.ni:10967-10974`) are Chapter 10's opening.
- **The Vedd idiom register** reaches `DS31-49`, `PI1-12`, `CB`, `CL` when Phase 8 writes them,
  not now. Pieter's *"Goddesses"* and the brooch's Magdalena are source texture and stay.

### Gaps found, not decided

1. **The law lines** — `DS38` and `DS39` convert from the source's popular-acclaim law to §3e's
   succession claim (ruled above). The words are David's; Phase 10 builds the stubs with the
   source text marked for conversion, and reports.
2. **The dagger's hiding place** — the source writes it *"under your gown"* and *"under your ball
   gown"*, and the buying order is the player's: she may buy the dagger before the gown, in the
   day dress. Carries as the source has it; reported.
3. **`CB7`'s "yesterday"** — *"I saw Baron Fossville leaving here yesterday"* assumes Chapter 2's
   collision was the day before. Under the port's chapter clock (the market, the night, the jail,
   the morning, the hanging, this afternoon) it is; carries. Reported so Phase 10 checks the
   count.
4. **Pieter's ten road mutters** fire only during Journey to the Ball, so they are heard in
   Chapter 10 though authorized here as Pieter's lines. Reported so neither chapter drops them.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); where the public *son* is spoken, if anywhere (Chapter 11's, the ball); Chapter 10's
opening — evening on Commerce Street, the world to night, Chapter 4's route walked again with
Pieter, the Southern Gate, the keep's foyer and the ballroom (`story.ni:10967-11060`, with the
Pieter-keyed rules in Book 5B).

**Chapter 9's questions are answered.** Extent (Sandler's door to evening on Commerce Street; the
journey split off as Chapter 10, the port's numbering one past the source's from here), Sandler's
reveal (true words, the public name unsaid — vision.md §3e's derived reading resolved), Pieter
(does not see; his lines carry), pressure (quiet), the source carry-list, and four gaps. The
section is complete for Phase 10's purposes: every scene, scripted event and refusal in Book 12
Parts 1-2 and the clean-Jack layers of Books 3 and 4 is authorized, the four trees are authorized
as stubs with `DS38-39` marked for conversion, and the lines are David's during play-testing.

---

## Chapter 10 — The Night Journey to the Ball

**Status**: COMPLETE for Phase 10 (2026-09-02, session 19f840) — three rulings, one carry-list, four gaps; produced against Book 12 Parts 3-4 (`story.ni:10960-11046`) and the Pieter-keyed layers of Book 5B (`story.ni:6578, 6820-6822, 6880-6958, 6978-6979, 7032-7035, 7216-7217, 7244-7307, 7372, 7424-7428`); lines are David's during play-testing.

### The chapter's extent — DECIDED (David, 2026-09-02): from evening on Commerce Street to the Foyer

Chapter 9's extent ruling split the source's *"Chapter 9 - Preparations"* and made the night
journey the port's Chapter 10, leaving its end to draw between the two seams the source offers:
the Foyer, where the source prints *"Chapter 10 - The Ball"* on first entry (`story.ni:11040-11041`),
and the Ballroom, where Journey to the Ball ends (`story.ni:10967`), the hint stage Preparing Hints
ends (`story.ni:1091`), and `test ballgoing` ends (`story.ni:12449`). Put to David: (A) the Foyer;
(B) the Ballroom; (C) something else. David: **"A."**

**Chapter 10 is the night journey, from Journey to the Ball beginning on Commerce Street to the
first step into the Entrance Hall** — the servant in livery, the cloaks taken, Pieter's *"Well, we
made it"* (`story.ni:11040-11043`). The step north into the ballroom — the Arrival theme, Pieter
turned to scenery, *"You step into a world of light..."* (`story.ni:11052-11056`) — is Chapter 11's
opening beat, with the ballroom's first description (`story.ni:11058`) and High Society four minutes
after (`story.ni:11153`). The `define chapters` block gains Chapter 11's row on that step, where the
source's own heading is.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 2 new — the Southern Gate (`story.ni:10978`) and the Entrance Hall, printed *Foyer* (`story.ni:11021`) — plus ten of Chapter 4's rooms in their ball-night state: Market Square, Lord's Road, the Pasture, the Crossing, the Woods, the Clearing, Underneath the Fountain, Tunnel End, the Chapel, the Lower Bailey. The Upper Bailey and Guardhouse are refused this night (`story.ni:7424-7425`) |
| Opens with | Journey to the Ball beginning — gown, jewel and dagger in hand on Commerce Street — *"Evening is falling over the city..."*, the world set to night, the purse and Bobby removed (`story.ni:10967-10974`) |
| NPCs | Pieter, following (`story.ni:10770-10779`); the Lord's Guards checking invites, scenery (`story.ni:11012`); the servant in livery, a line not a character (`story.ni:11041`) |
| Conversations | None new. Pieter's `PI` tree continues from Chapter 9 (`PI12` is the Woods' quip); his ten road mutters fire here (`story.ni:10783-10794`) |
| Scenes | Journey to the Ball (`story.ni:10967`); the Bodyguard scene continues through this chapter and ends in the ballroom (`story.ni:10758`), which is Chapter 11's turn |
| Scripted events | The stream crossed in a dress, Pieter soaked (`story.ni:6820-6822`); the sapling gone on arrival in the Woods and found again by searching (`story.ni:6880-6929`); the bolt pressed, *"I never knew about that"* (`story.ni:7032-7035`); the wall touched, the hole found, the brick out, the lever, the wall open, *"You're full of secrets and surprises"* (`story.ni:7247-7250, 7280-7282, 7304-7307`); the Lower Bailey cleaned and lit for the ball (`story.ni:7372`); the Foyer entry (`story.ni:11040-11043`) |
| The exit | The Foyer entry text. Chapter 11's row fires when she goes north |
| Puzzles | One — the way into the keep, alone this time: find the sapling, press the bolt, find the brick, pull the lever (`test ballgoing`, `story.ni:12449`) |
| Pressure | Fear without teeth (ruled below). The source has none on the road |
| Deaths | 0 |

### Pressure — DECIDED (David, 2026-09-02): fear without teeth

Put to David as the source has it — nobody on the road, the night market and Lord's Road and the
pasture and the woods empty; Pieter the only clock, muttering about the ball starting and Dame
Sandler and the dagger with nothing happening if she dawdles; the fountain unwatched though Rudup
and the mercenaries took her and Bobby there the night before; the gate guards the only hazard and
unreachable, Pieter holding her back before she can make a scene (`story.ni:11016-11017`); the
Lower Bailey full of arriving guests who do not look twice at a young lady and her guard — against
fear without teeth, or teeth. David: **"B."**

**This is new content.** Something of the men or the watch is on the night journey — on the road,
in the woods, or at the fountain where they took her — seen or nearly met, with no fail state. It
is the §5 per-scene exception again, ruled by David as in Chapters 4, 6, 7 and 8. Where it lands
and what it is are David's at play-testing; Phase 10 builds one placeholder beat at one point on
the route and reports. Chapters 4 through 10 now run fear, teeth, fear, fear, fear, quiet, fear;
the ball is Chapter 11's beat to place.

### The rails — DECIDED (David, 2026-09-02): as the source has them

Put to David against Chapter 4's shape (open outside the keep, railed inside it): the source's
ball-night rail — east from the night market back to Commerce Street still open; once north onto
Lord's Road no going back (*"We can't go back now"*, `story.ni:10962-10963`); the Woods' wrong
trails looping with Pieter grumbling, no lost ending (`story.ni:6947-6958`); the Clearing's *"You
can't turn back now"* (`story.ni:6978-6979`); up and south from the Lower Bailey refused
(`story.ni:7424-7428`); south from the Foyer refused, *"Don't lose your nerve now"*
(`story.ni:11045-11046`) — whole, or opened to Chapter 4's shape. David: **"A."**

**The rail carries as written and closes behind her at Lord's Road.** The same rooms play open on
Bobby's night and railed on ball night; that contrast is the ruling's consequence, not a gap. The
Southern Gate is the rail's one spur: reachable from Lord's Road, the Pasture and the Crossing
(`story.ni:10978, 6723`), the portcullis raised and the guards checking invitations, north refused
(`story.ni:10995-10996`), the gatehouse and the guards untouchable (`story.ni:10992-10993,
11016-11017`), every other direction a facing (`story.ni:10998-11008`). Nothing new is built for
navigation.

### Who sees her — RECORDED (2026-09-02, from Chapter 9 and vision.md §3e; no new perceiver)

- **Pieter does not see** (Chapter 9). His *"Don't, Jack"* at the gate (`story.ni:11017`) and the
  mutters' *"okay, Jack?"* (`story.ni:10787`) are his slips, habit not sight; carry as written.
- **The Lord's Guards checking invites** are public tier under the dress premise: a young lady and
  her guard arriving for the ball. No guard speaks to her. *"They might well be looking out for
  you specifically"* (`story.ni:10995-10996`) is Jack's own narration, not a guard's line; carries
  as written.
- **The servant in livery** bows and takes the cloaks (`story.ni:11041`); a line, not a speaker.
- **Nobody else speaks.** This is the port's longest stretch with one voice in it — Pieter's — and
  it is the second chapter under the dress premise in which the talent cannot show in anyone's
  words.

### What carries as the source has it — RECORDED (2026-09-02, under the standing default)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 10
surfaces carry unchanged and were not put to David as questions:

- **Journey to the Ball's start** (`story.ni:10967-10974`) — triggered by gown, jewelry and dagger
  together on Commerce Street; the evening text and Pieter's *"We'd better hurry!"*; the world set
  to night (Grubber's Market becomes Market Square, as Chapter 4's night state does); the purse
  removed (`story.ni:10973`); Bobby removed. Chapter 9's exit row and this chapter's opening.
- **Pieter following** (`story.ni:10770-10779`) — moved to her location after every move, the
  *"follows / hurries after you / sticks close to you"* line when tension is low; **his ten road
  mutters** (`story.ni:10783-10794`) — one in three turns anywhere but Commerce Street, in random
  order, capped at ten, authorized in Chapter 9 as his and heard here; the letter shown to him
  (`story.ni:10801-10802`).
- **The night market** (`story.ni:6556-6570`) — exits north, east and up; the pole refused with
  Pieter's variant, *"Now is not the time for climbing around!"* (`story.ni:6578`); the Bobby's
  Adventure refusal of east (`story.ni:6580`) does not run tonight.
- **Lord's Road** (`story.ni:6675`) — south refused during the Bodyguard scene
  (`story.ni:10962-10963`).
- **The Southern Gate** (`story.ni:10978-11017`) — the room, its distant description
  (`story.ni:10980`), north added to its exits (`story.ni:10985-10986`), the gatehouse and
  portcullis (`story.ni:10990-10993`), the guards and their tabards (`story.ni:11012-11014`), the
  refusals and facings listed above. Its Bobby's-Adventure refusal (`story.ni:10982-10983`) is
  Chapter 4's.
- **The Pasture and the Crossing** (`story.ni:6723, 6775`) — as written; the stream crossed
  *"carefully lifting your skirts"*, Pieter in the water to the knee (`story.ni:6820-6822`).
- **The Woods with Pieter** (`story.ni:6880-6958`) — the sapling removed on arrival, *"Where was
  it?"* (`story.ni:6880-6885`); examining or searching the trees or the trails routes to the
  underbrush (`story.ni:6902, 6909`); searching the underbrush puts the sapling back, *"you find
  it!"* (`story.ni:6925-6929`); without it the wrong trails loop, Pieter's seven grumbles at one in
  two (`story.ni:6947-6958`); with it the right way moves them both to the Clearing
  (`story.ni:6950-6951`). The sapling's way is the one set on Bobby's night (`story.ni:6872`).
- **The Clearing and the fountain** — planar directions refused (`story.ni:6978-6979`); the bolt
  pressed with Pieter opens the entrance, *"I never knew about that"* (`story.ni:7032-7035`).
- **The tunnels with Pieter** — Underneath the Fountain and Tunnel End as written; the wall
  examined routes to touching it during the Bodyguard scene (`story.ni:7216-7217`); touching it
  finds the hole (`story.ni:7247-7250`); opening it pulls the lever or hints at the brick
  (`story.ni:7252-7256`); the hole, the brick and its refusals (`story.ni:7262-7295`); taking the
  brick reveals the lever (`story.ni:7280-7282`); the lever opens the wall, Pieter impressed
  (`story.ni:7304-7307`); closing the wall refused during Journey to the Ball
  (`story.ni:7244-7245`).
- **The Chapel** (`story.ni:7323`) — as written. **The Lower Bailey** on ball night
  (`story.ni:7372`) — gravel over the puddles, guests trickling in from the south, the inner keep's
  doors open north; up and south refused (`story.ni:7424-7428`).
- **The Foyer** (`story.ni:11021-11046`) — the tapestries and garlands; the distant description
  from the bailey (`story.ni:11023-11024`); listening (`story.ni:11029-11030`); the tapestries'
  battles with Fossville's arms not among them (`story.ni:11034`); the garlands (`story.ni:11036`);
  the entry event (`story.ni:11040-11043`); south refused (`story.ni:11045-11046`).
- **Red Gate Estate's Foyer** refused during the Bodyguard scene (`story.ni:10128-10129`) and
  east from Commerce Street refused (`story.ni:10902-10903`) — Chapter 9's steering, still standing
  on the one turn she is on Commerce Street.
- **The chapter's end** — the Foyer entry text; the `define chapters` block gains Chapter 11's row
  on going north from the Foyer.
- **The Vedd idiom register** reaches Pieter's mutters and `PI12` when Phase 8 writes his lines,
  not now.

### Gaps found, not decided

1. **The pressure beat** — where on the journey it lands (road, woods, fountain) and what it is;
   David's, at play-testing. Phase 10 builds one placeholder beat and reports.
2. **The tunnel's light** — on Bobby's night his torch lit the tunnel and left with him
   (`story.ni:7137-7140`); on ball night the source's tunnel rooms are not dark and nobody carries
   a light. Carries as the source has it (lit, unremarked); reported.
3. **Chapter 4's dawdle clock** was ruled for Bobby's night and was not asked for ball night. Under
   this chapter's ruling Pieter's hurry has no consequence, as in the source. Reported so Phase 10
   does not carry the clock over by analogy.
4. **The sapling's way** — set once on Bobby's night (`story.ni:6872`) and reused when Pieter's
   search restores it (`story.ni:6926`). Phase 10 keeps one value across the two nights under the
   seeded stream; reported so the two chapters do not roll it twice.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); where the public *son* is spoken, if anywhere (Chapter 11's, the ball); Chapter 11's
opening — the world of light, Pieter to scenery, High Society four minutes on, the eight ballgoers
in order (`test socializing`, `story.ni:12451`), and the question of where the ball sits on the
spine.

**Chapter 10's questions are answered.** Extent (evening on Commerce Street to the Foyer, where
the source prints its own heading), pressure (fear without teeth, placement David's), the rails
(as the source has them, closed at Lord's Road), perception recorded with no new perceiver, the
source carry-list, and four gaps. The section is complete for Phase 10's purposes: every room,
scripted event, refusal and facing in Book 12 Parts 3-4 and the Pieter layers of Book 5B is
authorized, one new beat is authorized as a trigger with a placeholder, and the lines are David's
during play-testing.

---

## Chapter 11 — The Ball

**Status**: COMPLETE for Phase 10 (2026-09-02, session 19f840) — one governing ruling and seven under it, one carry-list, seven gaps; produced against Book 12 Parts 5-7 (`story.ni:11048-11893`) and the seam into Book 13 (`story.ni:11895-11902`); lines are David's during play-testing. **This is the port's biggest rewrite** — David's words open the section.

### The shape of the chapter — DECIDED (David, 2026-09-02): a real ballroom, a dance, capture

Put to David as the source has it — one room, one modal conversation at a time, the nobles worked
in any order, the capture when the last is done — with the extent question first. David answered
the shape instead:

> *"This is the biggest rewrite... and the core opportunity with Chord. A real ballroom with
> multiple active conversations, leading to capture."*

and, asked what the ballroom is spatially:

> *"Yeah I want to alter the whole thing... there's a dance where everyone moves in concentric
> circles and Jacqueline is passed from guest to guest and has one or two turns to converse."*

**Chapter 11 is a dance.** The ball's guests move in concentric circles; Jacqueline is passed from
hand to hand; with each partner she has one or two turns to converse before the circle moves her
on. The source's *"you've never danced before and you're far too self-conscious to start now"*
(`story.ni:11189-11190`) is the one line this chapter turns inside out. Everything below is ruled
inside this shape. It is also the first chapter whose design rests on ADR-320's beat-thread runtime
carrying several live conversations at once — see gap 6.

### The chapter's extent — DECIDED (David, 2026-09-02): from the world of light to the hand on her shoulder

Put to David: (A) end at the hand on her shoulder, where the source prints *"Chapter 11 - Baron
Fossville"* (`story.ni:11901`); (B) end at the War Room door clicking shut, the march inside this
chapter; (C) something else. David answered with the shape above, *"leading to capture"*; the
reading that the chapter ends at the capture and the march is Chapter 12's opening was stated
back to him and not corrected (gap 1).

**Chapter 11 runs from the step into the ballroom** — the Arrival theme, Pieter turned to scenery
and lost, *"You step into a world of light..."* (`story.ni:11052-11056`) — **to the mercenary's
hand on her shoulder**: *"Come with us, girl... The Baron asked us not to drag you out kicking and
screaming"* (`story.ni:11843`), the pause and the move to the War Room (`story.ni:11871-11873`).
The march through the keep and the door clicking shut (`story.ni:11902`) open the port's Chapter
12, where the source's heading is.

**What that puts in scope**, measured from the source:

| | |
| --- | --- |
| Rooms | 1 — the Ballroom (`story.ni:11058`), the last of the source's 84 before the War Room. Under the ruling it is a dance floor, not a sub-map |
| Opens with | The world of light; the ballroom's first description, *"every fantasy of beauty and riches that you ever dreamed of"* (`story.ni:11058`); Pieter gone (`story.ni:11123-11126`) |
| NPCs | Jacobs the Elder (`story.ni:11247-11251`); the Queen (`story.ni:11371-11376`); the Princess (`story.ni:11382-11386`); the Duke and Duchess of Inhyron (`story.ni:11442-11453`); the Baron of Amhyron (`story.ni:11607-11609`); the Earl of Bresa (`story.ni:11725-11727`); the Prince of Gravesal (`story.ni:11819-11827`); the several mercenaries (`story.ni:11877-11887`); the guests, the string quartet, the servants and their platters (`story.ni:11100-11149`) |
| Conversations | 6 trees, 88 quips — `JE1-20` (19, `story.ni:11266-11311`); `PR1-16` (16, `story.ni:11393-11423`); `IN1-16` (16, `story.ni:11487-11523`); `AM1-18` (18, `story.ni:11611-11652`); `BR1-12` (12, `story.ni:11737-11766`); `GR1-7` (7, `story.ni:11831-11843`). The Queen has no tree (`story.ni:11375-11376`) |
| Scenes | High Society, four minutes after the journey ends (`story.ni:11153`); Brief Respite inside it, until every ballgoer is spoken to (`story.ni:11155-11176`); Brief Encounter, the Prince (`story.ni:11805-11815`); the seam — Brief Encounter ends in the War Room, High Society with it, Confronting the Baron begins (`story.ni:11891-11897`) |
| Scripted events | Jacobs arrives and opens `JE1` unasked (`story.ni:11259-11261`); every ballgoer placed after `JE1`, the Prince held back (`story.ni:11354-11357`); the Princess leaves after `PR15`/`PR16` (`story.ni:11436-11438`); the Duke's back turned after `IN14` (`story.ni:11471-11475`); the Prince and the mercenaries enter together (`story.ni:11810-11815`); `GR7`'s capture line, the pause, the War Room (`story.ni:11843, 11871-11873`) |
| The exit | The hand on her shoulder. Chapter 12's row fires on the march |
| Puzzles | The source's is the room itself — reach each noble's closing quip (`story.ni:11157-11176`); the designers' `test socializing` is the required order (`story.ni:12451`). Under the ruling the dance replaces the order |
| Pressure | The dance (ruled below). The source has none until the capture |
| Deaths | 0. The capture is plot, not a losing ending — it cannot be avoided (`GR6`, *"They will catch you"*, `story.ni:11841`) |

### Rounds — DECIDED (David, 2026-09-02): the circles come back round

Put to David: one pass (each guest met once, one or two turns, what is unsaid stays unsaid) or
rounds (the circles bring her back to the same hands, a conversation accruing across passes, the
way the source's return greetings already work — `JE12` *"Back for more, hmm?"*, `IN15` *"Yes,
girl? What is it now?"*, `AM17` *"Hello again, milady"*, `BR11` *"Hello again!"*,
`story.ni:11288, 11521, 11650, 11764`). David: **"B."**

**Each guest is met more than once, and what she says with one carries to the next.** The source's
cross-gating survives as the dance's memory: Jacobs' tour before anyone's name means anything
(`JE7`, `story.ni:11280`); the Duke's son before the marriage fork (`IN12` before `IN13`/`IN14`,
`story.ni:11515-11519, 11551`); Jacobs' gossip before *"let Amhyron sneeze without your say-so"*
(`IN10`, `story.ni:11510, 11585-11590`); `IN8` or `JE17` before `IN12` (`story.ni:11592-11597`).
How many hands a round has and how many turns a hand gives — David's *"one or two"* — is Phase
10's to measure against the trees' depth and report (gap 2).

### What ends the dance — DECIDED (David, 2026-09-02): as the source has it, on the dance

Put to David: (A) the music plays until she has had her say with everyone, then stops, then the
Prince, then the mercenaries; (B) a clock — a set number of rounds, the music stops when it stops;
(C) the sweep — the mercenaries work the circles inward during the dance. David: **"A."**

**The source's condition carries onto the dance.** Brief Respite's definition of *spoken to*
(`story.ni:11157-11176`) — `JE20` fired; `PR15` or `PR16`; `IN13`, `IN14` or `IN16`; `AM18`;
`BR12`; the Queen counted always — is what ends the music. Then Brief Encounter as written: the
Prince at her elbow, the mercenaries at the entrance, the exits blocked (`story.ni:11810-11815,
11831, 11841`), his seven quips, and the hand. No clock, no sweep; the capture is the chapter's
teeth (§5) and cannot be dodged, as the source has it.

### Who is in the circle — DECIDED (David, 2026-09-02): the talkers dance; the Queen watches; the Prince arrives with the music's end

Put to David: (A) the talkers dance — Jacobs the first hand, the four nobles round after him; the
Queen outside the circle at her end, as the source has it; the Prince when the music stops; (B)
everyone dances — the Queen a hand she cannot speak to, the Prince the last hand. David: **"A."**

**Jacobs is the first hand**, and his opening is still his — *"You must be the girl my son helped
out of prison recently"* (`JE1`, `story.ni:11266`), unasked, the tour of the players
(`JE7`, `story.ni:11280`), *"Good luck, my girl"* (`JE11`, `story.ni:11286`). **The Princess, the
Duke with the Duchess at his side, Amhyron and Bresa** are the circle's other hands. **The Queen
stays outside it**, seen and not reached (`story.ni:11373-11376`): *"I'm watching you... Do not
cross me."* **The Prince is not in the room until the music stops** (`story.ni:11810-11815`).
Pieter is lost on entry (`story.ni:11123-11126`) and found trussed in Chapter 12.

### The public name — DECIDED (David, 2026-09-02): not here

Chapters 6 and 9 handed this chapter the question of where, if anywhere, the public claim's *son*
is spoken. Measured: the source's ball uses the girl words from every mouth — Jacobs' *"the girl
my son helped out of prison"* and *"my dear girl"* (`story.ni:11266, 11284`), the Duke's *"What
would you ask of me, girl?"* and *"his illegitimate heir"* (`story.ni:11487-11489`), Amhyron's
*"milady"*, *"a child hidden away"*, *"the heir of Duke Toresal"* (`story.ni:11611-11621`),
Bresa's *"Young lady"* and *"my girl"* (`story.ni:11739, 11746`), the Princess's *"ambitious
little street urchin"* (`story.ni:11393`), the mercenary's *"Come with us, girl"*
(`story.ni:11843`) — and Jacqueline presses the claim in her own true words: *"I am the daughter
of a Duke"* (`PR2`, `story.ni:11395`), *"Lady Jacqueline, of, er... of Toresal"* (`AM1`,
`story.ni:11611`), *"I'd still be the Queen"* (`IN13`, `story.ni:11517`). Nobody says *son*. Put
to David: (A) not here — the girl words carry, the wrong name stays in the documents, and if it is
spoken aloud that is Chapter 12's; (B) here — someone in the circle presses the gap between the
record and who is dancing with them; (C) something else. David: **"A."**

**The ball's words carry as written.** The nobles see a young lady and take her for the hidden
child; the record's *son* is not spoken in this room. vision.md §3e's open thread narrows to
Chapter 12 (Fossville, who holds the letter and knows) or to nowhere; the coda's premise — the
claim written in the wrong name everywhere but the Duke's hand — is untouched.

### Who sees her — DECIDED (David, 2026-09-02): the Prince of Gravesal has the talent

The Prince's lines are the source's own statement of a sight: *"There's something... special
about you. I could see it from the moment I laid eyes on you"* (`GR3`, `story.ni:11835`);
*"People in my family have always been able to see these things. It's like an aura... You have...
a highly visible fate"* (`GR4`, `story.ni:11837`); *"I see a long journey ahead of you. And many
trials... And I see death"* (`GR7`, `story.ni:11843`). He knows who she is and why she is here
and says the Ascension is nothing to him (`GR5`, `story.ni:11839`). Put to David: (A) he has the
talent — his family's sight is the talent named in the source's own words, a perceiver who knows
the politics and wants nothing from them; (B) his sight is a fate-reading, its own thing, never
explained; (C) something else. David: **"A."**

**The Prince sees.** His lines carry as written and are the talent's, unexplained per §2; he is a
new cell in vision.md §3f — knows the politics, perceives, wants no part of it — beside Sandler
and Rudup in the row and beside Teisha in temperament (recorded there, 2026-09-02). Under the
dress premise his words are the girl words everyone uses, so the tell is not in his address but
in what he says he sees: the first perceiver since the mirror whose sight shows in the text at
all.

**The rest of the circle is not ruled, and nothing turns on it.** Jacobs, the Princess, the Duke,
the Duchess, Amhyron, Bresa and the Queen all use the girl words under the dress premise, and none
speaks of what they see; whether any has the talent leaves no mark on their lines. Two source
facts recorded for David, not decided: the Duchess *"never speaks"* and *"stare[s] at you with
wide eyes and quivering nostrils"* (`story.ni:11449`); the Queen's one look (`story.ni:11373`).
**The mercenaries' *"girl"*** (`story.ni:11843`) is the public reading of the presentation, as
Chapter 8 ruled — the men who hunted the boy Jack at the raid (Chapter 7) are sent for a young
lady tonight, because the whole ball is talking about her (`AM4`, `story.ni:11617`) and Fossville
has the letter (Chapter 6). Carries as written.

**By the ball, §3f's "small group" is the whole circle.** Jacobs — *"I have informants
everywhere"* (`JE5`, `story.ni:11276`); the Duke — *"I am aware of who you are"* (`IN1`); the
Queen — *"She knows who you are, too"* (`JE7`); Amhyron — *"rumors that the old Duke Toresal had a
child hidden away"* (`AM2`, `story.ni:11613`). A source fact, recorded so §3f's tiers are read as
of Chapter 1, not as of the ball.

### Fear during the dance — DECIDED (David, 2026-09-02): the dance is the pressure

Put to David as the source has it — no mercenary in the ballroom until the music stops, the
Queen's one look the only eye on her, Pieter gone and the room unleaveable but nothing pressing —
against fear without teeth (the men seen at the doors or along the edge while the music keeps her
moving) or something else. David: **"A."**

**Nothing of the men is on stage until the music stops.** The one-or-two-turn hand is the
chapter's pressure and the capture is its teeth. Chapters 4 through 11 now run fear, teeth, fear,
fear, fear, quiet, fear, then the dance — a fourth kind on vision.md §5's spine, neither push nor
pull nor quiet but a rhythm, recorded there (2026-09-02).

### What carries as the source has it — RECORDED (2026-09-02, under the standing default, inside the dance)

Under the standing rule (2026-08-30: build what the source does, report gaps), these Chapter 11
surfaces carry unchanged and were not put to David as questions. Where the dance replaces a
source mechanism, the replacement is named.

- **The arrival** (`story.ni:11052-11056`) — the Arrival theme, Pieter to scenery, the world of
  light; the ballroom's description and its first-time coda (`story.ni:11058`).
- **The closed room** — exiting and every direction refused, *"you can't leave without Pieter.
  Where did he get off to...?"* (`story.ni:11060-11064`); facings (`story.ni:11066`); the distant
  description from the Foyer (`story.ni:11068-11069`); listening (`story.ni:11073`).
- **Pieter in absentia** (`story.ni:11123-11126`) — any reference to him removes him from play,
  *"you're on your own."*
- **The scenery** — candles, chandeliers, candelabras and their opulence refusals
  (`story.ni:11079-11096`); the guests as a backdrop across the Ballroom, the Foyer and the Lower
  Bailey, their small talk, Jacobs' list once `JE1` has fired, *"far too absorbed in the party"*
  (`story.ni:11100-11108`); the string quartet (`story.ni:11112-11119`); the servants who ignore
  her, the platters, the food she never gets, *"you need to keep your wits about you"*
  (`story.ni:11130-11149`); the kissing, attacking and throwing refusals (`story.ni:11135-11136,
  11178`).
- **The dance** — the source's `dance` action and its refusal (`story.ni:11180-11190`) are
  replaced by the ruling above; the verb is the chapter's engine now.
- **High Society** (`story.ni:11153`) — four minutes after Journey to the Ball ends, Jacobs at
  her elbow and `JE1` started unasked (`story.ni:11259-11261`); every ballgoer placed, the Prince
  held back (`story.ni:11354-11357`). Under the dance, this is the music starting and Jacobs the
  first hand.
- **The ballgoer kind** — the distant descriptions when not in conversation
  (`story.ni:11203-11206`); the *"elsewhere in the crowd"* roster line (`story.ni:11210-11214`);
  the *making excuses* rules that close one conversation to open another
  (`story.ni:11227-11233`, and per noble `story.ni:11313-11314, 11425-11426, 11561-11565,
  11654-11655, 11768-11769`). Under the dance the hand-off does this work; each noble's goodbye
  quip (`JE20`, `PR16`, `IN16`, `AM18`, `BR12`) is the material for the pass-on.
- **The six trees** — as stubs per the standing conversation rule, each hand's trigger live and
  its beats TODO: `JE1-20` with the `JE9`/`JE10` cluster closing into `JE11` and `JE12`'s return
  menu (`story.ni:11350-11364`); `PR1-16`, three ways in and every way out through `PR15` or
  `PR16`, the Princess gone after (`story.ni:11428-11438`); `IN1-16` with `IN15`'s return, the
  Duchess deflected to the Duke (`story.ni:11477-11485`), the `IN12` → `IN13`/`IN14` fork and the
  Duke's back turned after `IN14` (`story.ni:11471-11475, 11551`), the populating rules
  (`story.ni:11567-11597`); `AM1-18` with `AM17`'s return and the `AM7-9` vassalage loop
  (`story.ni:11657-11721`); `BR1-12` with `BR11`'s return (`story.ni:11771-11799`); `GR1-7`
  after the music stops, `GR4` gated on `GR3`, `GR7` the capture (`story.ni:11845-11873`).
- **The Queen** (`story.ni:11371-11376`) — her distant description with its one look, and *"you
  can't even get near her"*.
- **Brief Encounter** (`story.ni:11805-11815`) — the Prince and the several mercenaries placed
  together; talking to anyone else refused, *"Please stay"* (`story.ni:11821-11823`); the
  mercenaries' description and refusals (`story.ni:11877-11887`); `GR7`, the pause, the War Room
  without a description (`story.ni:11871-11873`).
- **The chapter's end** — the hand on her shoulder. Chapter 12's row in `define chapters` fires on
  the march (`story.ni:11897-11902`).
- **The Vedd idiom register** reaches all six trees when Phase 8 writes them, not now. The
  Princess's *"Oh, Goddesses"* (`PR9`), Jacobs' *"outside whim of the Goddesses"* (`JE9`), Bresa's
  *"Goddess-forsaken party"* (`BR2`) are source texture and stay.

### Gaps found, not decided

1. **The march** — the reading that Chapter 11 ends at the hand on her shoulder and Chapter 12
   opens with the march was stated to David and not corrected. Recorded as the extent; David may
   move the seam to the War Room door when Chapter 12 is opened.
2. **The dance's measure** — how many hands a round has, how many turns each hand gives (David:
   *"one or two"*), and how a round is ordered. Phase 10 measures against the six trees' depth and
   the cross-gating above and reports; the numbers are David's.
3. **"Had her say"** — the source's closing quips are how a noble counts as spoken to
   (`story.ni:11157-11176`), and a player who never reaches one never ends the room; the source
   has the same property. Under rounds the dance loops until each is reached. Reported so Phase 10
   decides nothing about it by accident.
4. **Dead hands** — the Princess leaves the room after `PR15`/`PR16` (`story.ni:11436-11438`) and
   the Duke turns his back after `IN14` (`story.ni:11471-11475`). Under rounds a hand can go dead
   mid-dance; what the circle does with a dead hand is David's. Phase 10 carries the source's
   removal and reports.
5. **The Duke's fork** — `IN13` (the marriage promise) and `IN14` (*"keep him away from me"*) are
   the ball's one consequential choice, and in the source neither changes anything afterward: the
   only later mention of Inhyron is Fossville's taunt to Bobby (`story.ni:12041`). Both count as
   spoken to. Reported so the fork's weight is David's to give or leave.
6. **The dance as a Chord construct** — several live conversations, a rotation that hands the
   player from one to the next on a turn budget, and memory across rounds. Whether ADR-320's
   beat-threads with `define sequence`/`define machine` and timers carry it, or a primitive is
   missing, is Phase 10's first thing to find. A missing primitive is a platform discussion under
   CLAUDE.md, never built inside the story; recorded on the watch list as W-10.
   **Found (2026-09-02, session 6a3da1)**: the prototype ran
   (`branch-stories/secret-letter/prototypes/w10-dance/`). The turn budget, the rotation, each
   partner's self-opening thread, rounds and the music's end all carry; **the hand-off does
   not** — the story cannot pass the player's conversation to the next partner, because a
   thread opens only when neither party is in another scene and nothing in Chord closes one.
   ADR-320 D10's interruption is the designed answer and is unbuilt: GH #348, a platform
   discussion. Details and the four smaller findings on the watch list under W-10.
7. **The stub rule meets the rewrite** — this chapter's value is almost entirely dialogue, and the
   standing rule defers dialogue until the port is done. Phase 10 builds the dance's engine — the
   circle, the hand-offs, the turn budget, the six triggers, the memory, the music's end, the
   Prince, the capture — with TODO beats; the conversations are Phase 8's. Reported so the split
   is deliberate.

**Handed forward, not decided here**: whether Jack herself has the talent (still the vision's
question); whether the public *son* is ever spoken — Chapter 12's, with Fossville, or nowhere;
Chapter 12's opening — the march, the War Room, Pieter trussed, Fossville, the `FOSS` script and
the skirmish (`story.ni:11895-12225`), which is Phase 9's mess and needs its design before that
chapter is asked.

**Chapter 11's questions are answered.** The shape (a dance in concentric circles, one or two
turns a hand, leading to capture — the port's biggest rewrite), extent, rounds, what ends the
dance, who is in the circle, the public name (not here), perception (the Prince sees), fear (the
dance is the pressure), the source carry-list inside the dance, and seven gaps. The section is
complete for Phase 10's purposes: the ballroom, its scenery, the six trees as stubs, the scenes
and the capture are authorized inside the dance, and the lines are David's during play-testing.
