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
