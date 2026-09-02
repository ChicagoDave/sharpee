# Secret Letter Remake — David's Vision (capture)

**Captured**: 2026-08-21, from a session dialogue with David
**Status**: OPEN — David's closing words were "covers what I'd been thinking of **for now**." Expect additions.
**Owner plan**: `docs/work/secret-letter-port/plan.md`

## What this document is, and is not

This is a **record of what David said**, written down so it survives the session. It is not
authored content, and it is **not the P-4 change document** — that artifact is David's to
write, and Phase 4 remains gated on it. If David chooses to build the change document from
this capture, it becomes source material for his own writing, not a substitute for it.

Conventions:

- Unmarked statements are **David's vision**, recorded as given.
- **[source]** marks a finding from the 2009 `story.ni`, with its line number, surfaced during
  the conversation. These are evidence about what already exists, not proposals about what
  should be written.
- **[open]** marks an unresolved question — David's own TBD, or a question raised and not
  yet answered.

Jack is referred to as she/her throughout, per David. Source line numbers are relative to
`docs/references/textfyre/secretletter/source/story.ni`.

## 1. The core change

**Jack is a transgender girl.**

The 2009 game's premise was a girl disguised as a boy for safety. The remake relocates *why*
the presentation is a mask rather than replacing the machinery: true-self-girl,
presented-self-boy, presentation maintained for survival, all survive — the meaning
underneath changes.

**[source]** The original already writes Jack's interiority as a girl performing boyhood, not
as a boy, so much of the existing interior prose may port closer to intact than the size of
the change suggests:

- `story.ni:1408` — "it's a lot harder to pretend to be a boy with your hair hanging down around your ears."
- `story.ni:3025` — "Dressing up like a boy is definitely *fun*, but looking at Teisha's wares always makes you yearn for something a little bit more... elegant."
- `story.ni:1469` (opening) — "if you linger too long, people will wonder what a boy is doing shopping for women's cloaks," while gazing "wistfully at the bright colors, the beautiful embroidery."

## 2. The coda: the Vedd prayer circle

A **new scene after the rescue**: Jack is in the middle of a prayer circle and is
**physically transformed into her real body** — a literal in-world change, the female body
she has envisioned in her own mind, not an interior or perceptual one.

**The prayer circle is the Vedd.**

### The ending is a rescue, not a capture

The 2009 game ends with hooded men seizing Jack at the Princess's order and going to black on
`*** To be continued ***`. Per the sequel David and Michael Gentry laid out, **that capture
was actually a rescue.** The coda follows it.

**[source]** `story.ni:12214` — "'That's her! Get her!' cries a voice. A young woman's voice.
A voice you've heard before... 'Don't worry,' says a familiar voice. 'We're not going to
*hurt* you. It's simply ocurred to me that you could be useful after all.'" Ends the game in
victory; `12224` hands off to *The Miradania Chronicles, Part 2: Jacqueline Toresal and the
Trials of the Vedd*, which was never written.

### Consequence: the coda is original content

Because the transformation follows the 2009 game's final beat, **the forward ripple through
ported text is essentially zero** — nothing in the existing material runs after it. But the
scene has no source to port from. It is the one part of the remake authored outright rather
than translated, and it annexes the opening of the unwritten sequel.

**[source]** The Vedd appear **exactly once** in the entire 12,635-line source, in the closing
sequel-title line: `grep -c -i "vedd" source/story.ni` = 1 (`story.ni:12224`). They are a name
and nothing more — no faction, no character, no prior mention.

### Foreshadowing the Vedd — RESOLVED (David, 2026-08-21)

**Seeded, and diffuse.** David: "I would seed the Vedd mysteries throughout the story...every
character has some offhand wavy spiritual thing about the Vedd."

### Who the Vedd are — David, 2026-08-22

**A mystical group of women — witches, in another world's terms — who have real power.**
Their power is real in-world, not superstition the story winks at.

**And the story never delves into a magic system.** David, explicitly: "though we're never going
to delve into any magic system." The Vedd's power is asserted and shown exactly once, literally,
at the coda transformation — never explained, never costed, never given rules. **This is a
scoping decision as much as a world one:** it forecloses magic mechanics as a work item. No
platform support, no ADR, no trait or behavior models the Vedd. The coda is authored as a scene,
not built as a system.

**What they believe — David, 2026-08-22 ("I'm making this up"):** the foundation of Vedd
mysticism is **the essence of truth — peeling away the layers of life to reveal something's true
nature.** That single idea runs through the whole of their belief, not one doctrine among
several.

**They are mysterious and well respected, and widely believed gone.** No one has seen a Vedd in
hundreds of years; a good part of the population takes them for lost from the world. Respect and
absence coexist — they are revered the way an old order is revered once it stops being a
present institution.

### The theology is the story's own thesis

**This is the keystone, and it is worth stating plainly: the Vedd believe exactly what this
story is about.** Jack's true nature sits under a presented surface. §3c's talent is defined as
seeing **past the physical** to the real person. §1's core change is that Jack *is* a girl,
whatever the world reads. And the coda is the literal form of the same act — the layers peeled
away, the true body revealed. The Vedd's founding principle and the remake's premise are one
proposition stated twice, once as theology and once as plot.

**So the idiom layer stops being flavor.** Every Vedd idiom in ordinary speech is quietly about
Jack, whether or not the speaker knows it. The register was already justified as world-building;
this makes it **foreshadowing carried in diction** — the cheapest and most durable kind, because
it never announces itself and never costs a scene. It also settles what the idioms should be
*about*: truth, surface and substance, seeing through, getting down to what a thing really is.
Not power, not ritual, not prophecy.

**And the absence explains why the idioms survive at all.** An order gone for centuries whose
language is still in everyone's mouth is a **fossil**: the speech outlived the institution, the
way people say things about petards and rubicons without knowing what either was. Two useful
consequences follow. The idioms should feel **worn** — inherited, slightly archaic, used without
examination. And characters may hold **different attitudes toward the same phrase** — reverent,
dismissive, superstitious, embarrassed — which supplies per-character texture without needing
per-character beats, exactly the thing the register was chosen to avoid.

**The coda gains stakes from this.** A prayer circle of the Vedd is not a new faction arriving;
it is **the return of something the world believed lost**, performing the act their whole belief
is founded on, on the one person the story has been about. That is a stronger ending than "a
mystical group transforms Jack," and it is earned entirely by the idiom layer that precedes it.

### Standing rule: the world's properties are axiomatic — David, 2026-08-22

**Nothing about the Vedd or the talent is ever explained.** David: "I've read a ton of fantasy
stories in my life and one thing you can always count on is that a given world setting has
properties... we don't need to explain The Vedd or the talent... it's just fundamental to this
world." The Vedd exist and have power. Some people see past the physical. Both are **givens of
Miradania**, in the way a fantasy setting's properties are given, and the story states them by
using them rather than by accounting for them.

**This closes a question rather than answering it.** An earlier draft of this section asked
whether the talent is a Vedd remnant — the same faculty described twice — and left both readings
live. **It is not a question the story answers.** Neither reading needs choosing, because
choosing would mean explaining, and the resemblance can simply stand. Any future session that
rediscovers the parallel should recognise it as intended texture, not as a loose end.

**It generalises the no-magic-system ruling above.** That decision foreclosed mechanics; this one
forecloses *exposition* as well, and covers §3c and §3d as much as §2. Concretely, the port
carries **no** Vedd origin story, cosmology, history, doctrine list, or explanation of how the
talent is acquired or distributed — and no lore document to hold any of it. That is a real
scoping win: a whole class of plausible-looking work is ruled out before anyone proposes it.

**Two authoring constraints follow.**

- **No character explains.** A character who accounts for what the Vedd are, or for why some
  people see truly, breaks the rule however naturally the line reads. The fossil quality of the
  idioms protects against this by construction: worn phrases used **without examination** are
  non-explanatory by nature, which is precisely why the register suits the constraint.
- **The coda does not justify itself.** The transformation happens. It is not earned by a rule,
  costed by a system, or explained by a Vedd who arrives to describe their order.

**How the player learns anything, then.** By accretion, the way Shadow teaches clockwork: the
idiom layer carries the culture in ordinary speech, so by the coda the Vedd are familiar without
ever having been described. This is not a tension with the rule — it is the reason the idiom
technique was the right mechanism to borrow. Exposition would have been the alternative to it,
not a supplement to it.

**Why the restraint is worth wanting, not just obeying — David, 2026-08-22:** "it would be
awesome if people did play this version and there was a call for a Vedd backstory."

That is the success condition for the idiom layer, and it is the reverse of an argument for
explaining more. Appetite comes from withholding: a reader who has heard the Vedd invoked a
hundred times in ordinary speech and never once described is the reader who wants the book about
them. Explaining, at any point, spends exactly the thing this hopes to accumulate.

**And the call already has a title.** The 2009 game's closing line hands off to *The Miradania
Chronicles, Part 2: **Jacqueline Toresal and the Trials of the Vedd*** (`story.ni:12224`) — the
sequel David and Gentry laid out and never wrote. So players asking for Vedd backstory would not
be asking for a supplement to this game; they would be asking for the Part 2 that has been named
since 2009. Recorded as intent, not as a work item: nothing in this plan builds toward a sequel,
and P-10's ship target (a public release) is unchanged. It does raise the value of §7's open
question about whether the sequel notes exist in readable form.

### The mechanism: an idiom layer, not per-character asides

**The Vedd are prominent enough that idioms about them and their magic are woven through the
whole population's everyday speech.** People swear by them, measure by them, and reach for them
as figures of speech, the way any real culture's dominant institution leaks into its idiom.

**The model is Textfyre's own** — David: "I'm stealing this concept from *Shadow in the
Cathedral* where all the NPCs use machinery sayings all the time. In Toresal, people use Vedd
idioms." David staged that source on 2026-08-22 at
`docs/references/textfyre/shadow/source/story.ni` (22,301 lines, 1.3 MB — 1.8x Secret Letter),
so the technique is **verified against the source**, not just described. Four findings, from a
targeted sweep rather than an exhaustive count:

**1. The technique is idiom substitution: swap the culture's dominant noun into a stock English
phrase.** The canonical instance is `story.ni:750` — refusing to take a hymnal, the PC says
**"I don't need one: I know all the hymns by gear."** "By heart" becomes "by gear." The phrase
carries its ordinary meaning intact; only the noun is local. That is the whole trick, and it is
the one to copy: a Vedd idiom should be a familiar English phrase with a Vedd noun in it, not a
new saying the player has to decode.

**2. It lives in narration and response text, not only in NPC dialogue.** `750` is the PC's own
refusal message, and Shadow runs in first person (`story.ni:~117`, "change the library message
person to first person"). Also `16778`, the PC narrating: "Like the lowliest ratchet in the
bottom of a gear-train, I move in darkness." **Consequence for the port:** the Vedd register
reaches Toresal's response rules — Phase 2 measured **1,192** of them — and not only its 380
quips. Phase 8's diction pass is correspondingly wider than the conversation trees alone.

**3. The machinery is the state religion, which is why it saturates speech.** `story.ni:3108`:
a weight on a string is a pendulum, but "once it's put into a clock it is sanctified by the
clockwork." Clockwork is the sacred order, not merely the local industry. **This is the exact
structural parallel to the Vedd** and the reason the borrowing works: in both games the
dominant institution is a mystical one, so its vocabulary leaks into everyday speech as a
matter of course.

**4. Calibration — the figurative layer is far lighter than the raw counts suggest.** Machinery
vocabulary is everywhere in Shadow (`gear` 170, `machine` 286, `brass` 198, `clockwork` 118),
but nearly all of it is **literal**: the game is set in a clockwork world, so those are objects
and descriptions. Genuine idiom substitutions are rare — the sweep found a small handful across
22,301 lines, alongside two machinery oaths ("by the clockwork," "by gear"). So "all the NPCs
use machinery sayings all the time" describes the *impression* the technique creates, not its
density. **Season lightly.** Over-salting Toresal's dialogue with Vedd idiom would read as
parody where Shadow reads as a world.

**This supersedes the first reading of "every character has some offhand wavy spiritual thing."**
The earlier capture read that as a per-character *content beat* — one spiritual remark each,
authored as a small piece of story. It is not that. It is a **register**: a way everyone talks,
applied across dialogue as diction, not a set of individual disclosures. A character using a
Vedd idiom is saying nothing about the Vedd and nothing about themselves, exactly as saying "a
cog in the machine" is not a statement about machines. David's earlier candidate (Jack reading
about them and imagining being reborn) is a separate, heavier device and is not this layer.

**Consequence for how much text this touches.** A register reaches further than four characters'
remarks: eventually it colors most speaking lines, which makes it a diction pass over the quip
corpus rather than a fixed count of authored insertions. It is also *cheaper per line* than the
per-character reading — an idiom is a phrase, not a beat — but it is applied in far more places.

**Consequence: the near-zero ripple above is reversed.** Threading the Vedd back through the
ported chapters touches existing text throughout. It lands mostly in **dialogue**, which makes
it a concern of the quip-tree to beat-thread rewrite (P-6, plan Phases 7 and 8) rather than of
room description. **Chapter 1 is in scope**: plan Phase 6's entry state assumed "unseeded likely
leaves Chapter 1 untouched either way," and that assumption no longer holds.

**Starting set — David, 2026-08-21: "Teisha, Shannon, Bobby, Dame to start."** These four are
where the idiom register is **first authored**, not four characters who uniquely know about the
Vedd — under the idiom reading above, everyone speaks this way, so the set is a starting *density*
and a proving ground, not a guest list. Their four trees are where the port establishes what a
Vedd idiom sounds like; Phases 7 and 8 spread the register outward from there.

**David writes the idioms — Claude does not** (2026-08-22: "you're the guide and I will provide
content"). The Gentry's-voice prose clearance granted 2026-08-21 is **withdrawn**: this is a
public release (P-10), and a credit line naming AI-generated prose in a living author's voice
would land badly regardless of permission. Claude's role here is structural — the conversion,
the analysis, the measurements, and the shape David writes into. Idioms are cited to the change
document wherever that document covers the chapter.

| Character | Where | Quips | Note |
|---|---|---|---|
| **Teisha** | Grubber's Market, Teisha's Tent (`story.ni:3110`) | 22 | In the opening market, so the seeding starts in the first scene the player meets. |
| **Bobby** | Back Alley (`story.ni:5635`) | 23 | The one of the four with no gender sight (`5650`), which makes him the clean test that the idiom is cultural, not perceptive. |
| **Dame Sandler** | Jewelers shop, Lord's Market (`story.ni:5236`) | 34 | The "Dame" of David's list; the source has exactly one. Largest quip tree of the four. |
| **Widow Shannon** | Maiden House, the Laundry (`story.ni:6423`) | 16 | |

95 quips across the four, out of the source's 380 — a quarter of the corpus, which is a
reasonable sample to fix the register against before it reaches the rest.

**The talent/Vedd collision is dissolved, not left open.** An earlier draft of this section
flagged a worry: three of the four starting characters (Teisha and Dame Sandler per §3d, Shannon
per §4) already carry the gender sight, while Bobby explicitly does not (`story.ni:5650` — "He
doesn't even know that you're really a girl"), so putting Vedd remarks on that set looked like it
might silently fuse two mystical systems. **The idiom reading removes the problem entirely.**
Idioms are cultural currency available to everyone, so a character using one carries no
implication about the talent, which §3c fixes as distributed at random and **not** a bloodline.
Bobby speaks Vedd idiom because everyone does. The two systems never touch at the level of
speech, and no phase needs to keep them apart by hand.

**[source]** Existing furniture the thread can still attach to, all already present, now
secondary to the ambient mechanism rather than candidates for carrying it alone:

- **The Library** — `story.ni:9367`: "Tall bookshelves line all four walls, and a chandelier hangs from the high ceiling." Already plot-wired: `story.ni:1278` has an image-changing rule for being in the Library holding the Secret Letter. Four walls of books, none modeled as readable.
- **Jack's body as an object** — `story.ni:1436-1444`: `your body` is part of the player, with a large part-name synonym list, and a description that currently deflects — "All your parts are where they should be... If you want to know what you look like, just examine yourself or look in a mirror." This is the object a transformation changes, and it is already an `examine` target.
- **An existing become-Jacqueline mirror scene** — `story.ni:10574`, after a bath, Shannon lacing a dress: "Finally, you look in the mirror. A complete stranger looks back at you... *This isn't Jack anymore,* you think to yourself. *This is Jacqueline*." Plus `5119` in the clothier's ("you *do* look like a princess") and a floor-length mirror at `5053` already wired so "reflection" resolves to the player. The 2009 game already stages Jack→Jacqueline through a dress and a mirror, figuratively. The coda is the literal version of a motif the source established.
- **"Ascension"** — the source's central political event, "when they name the heir to the throne of all Miradania" (`story.ni:3219`, Teisha), repeated by half a dozen NPCs. A personal ascension rhymes with it. Available, not proposed.

## 3. World rules

These are **two distinct rules** that compose. A reader who remembers only the first will
write Bobby wrong.

### 3a. Gender identity is spiritual, and carries no negative connotation

In Miradania, gender identity is a spiritual matter. There is **no stigma** attached to it —
nothing shameful, nothing punished.

**Consequence — this does not fight the original's plot.** The danger around Jack's
concealment in the source is political: mercenaries hunting the heir. Being seen as a girl is
dangerous because it identifies her as Jacqueline Toresal, not because girlhood is shameful.
The tension in the concealment scenes survives the frame untouched.

**Consequence — the Vedd become load-bearing.** If identity is spiritual, a spiritual order
performing the transformation is the world's own institution doing ordinary work: a rite, not
a miracle, and not a reward for finishing the game.

### 3b. Gender is nonetheless a real construct

No stigma does not mean no social reality. Gender still structures how people treat each
other, and characters navigate that deliberately.

**Bobby is the worked example**: he *sees* Jacq, and he is **cautious about how he treats
her**.

**[source]** The original already states this exact mechanic, as a fear rather than an
actuality — `story.ni:5652`: "You also happen to think that he's devastatingly handsome...
**He doesn't even know that you're really a girl, and you're not about to tell him, because
if he knew he would certainly stop inviting you along on his exploits.**" Jack's reasoning is
entirely about how being known would change how he treats her. The remake moves that from
anticipated to actual: it is what Bobby is quietly already managing. The romance is on the
page too — `Instead of kissing Bobby`: "You've thought about it. You've even dreamed about it.
But the thought of actually doing it makes you go all wobbly-kneed."

### 3c. The talent: some people see past the physical

Some of Miradania's people can see more than the physical world. The talent **weaves through
random people** — it is not a bloodline.

**Note**: the entire plot of the original is inheritance — the Secret Letter, Jack's
parentage, legitimacy, the Ascension itself. A talent distributed at random is the structural
opposite of a bloodline, sitting inside a story about nothing but bloodlines.

**The talent is common in children and often dissipates in puberty — David, 2026-09-01.**
Raised by the Chapter 2 change-document conversation, from the source's City Park line (the
Maiden House orphans "know that you're really a girl", `story.ni:4917`): *"I think we decide the
'talent' is common in children, but it often dissipates in puberty."* So the random weave above
is what is *left* in adults — those in whom it did not fade (Teisha, Dame Sandler, Olgan Minor,
Widow Shannon) — and children see her as a matter of course. Axiomatic, per the standing rule
(§2): the story shows it and never explains it. Consequences recorded in the change document's
Chapter 2 section; the one it hands forward is Chapter 4's — the Maiden House orphans are a
houseful of perceivers under the two widows who do not see.

### 3d. People with the talent see Jack as Jacq

Those who have it perceive her true self, unprompted and without being told.

**David, 2026-09-01 (Chapter 6 change-document conversation)**: *"this is one of the things that
will fundamentally improve the story. A transgender protagonist that is seen by many people as
she is. A young woman."* The perceivers are not a device for one reveal; they are the point. By
Chapter 6 the change document has ruled a drunk in a cell (Olmer) and a hostile house's butler
as seeing her — strangers who owe her nothing and see her anyway.

**[source]** Two characters are already written as inexplicably perceiving something in Jack:

- **Teisha** — `story.ni:3110`: "She also knows your big secret (**guessed it the very first time she caught you loitering at the tent flap**), which is a little bit scary and a little bit of a relief." And in the silk cloak scene: "'I was right,' she says. 'It brings out your eyes. You look... almost *royal*.'" She perceived Jack correctly on sight, before evidence, and what she sees is both the girl and the heir. She is in Grubber's Market — the social foreshadow can begin in the opening scene.
- **Dame Sandler** — `story.ni:5236`: "**for some reason** Dame Sandler has always taken a liking to you... her demeanor is more that of an aristocrat, if not full royalty... It's more of a bemused curiosity than real affection." An unexplained affinity, explicitly marked unexplained, on the character with the largest quip tree in the game (48 quips).

**Technical consequence — this is a standing rule, not a beat.** Per-NPC perception means the
game carries, for every speaking character, whether they see Jack or Jacqueline, and that
shapes forms of address, pronouns, and dialogue throughout — across 23 conversation trees and
380 quips. It belongs in the change document as a rule governing all dialogue, not as a scene
written once.

### 3e. The claim: heir to the throne, through the Duke — David, 2026-08-22

**Jack is heir to the throne.** Her father the Duke **was the King's brother**, and the King died
without naming an heir. No one is supposed to know Jack is the heir.

**And the public language of that claim names her as the Duke's son** — which the remake keeps,
painfully. She must press a claim to the throne in a name that is not hers.

**This is a change to the source's mechanism, not a clarification of it.** The 2009 game builds
Jack's claim on *popularity*, not blood: Dame Sandler states the law as *"in the absence of a
named successor, the ruler is determined by the will of the people,"* and grounds Jack's standing
in her father's esteem — *"You are the daughter of one of the most loved and respected noblemen in
living memory... As his heir — even as his illegitimate heir — much of that esteem would fall to
you"* (`DS38`/`DS39`, `story.ni:10633-10634`). The Duke is nowhere said to be the King's brother,
and consanguinity plays no part. Making him the King's brother converts a popular-acclaim claim
into a claim by succession — which is why the Ascension can be contested at all under the note
above, and why Fossville's motive to remove Jack becomes structural rather than reputational.

**The public-record language is a real, if small, rewrite surface** — measured 2026-08-22 against
`source/story.ni`: 16 occurrences of "daughter", 11 of "heir", 16 of "son". The lineage language is
concentrated in Dame Sandler's reveal (`DS32`-`DS44`), the Princess's confrontation (`PR15`), the
Ascension quips (`TE22`, `GE`, `HO8`, `BO15`), and the bath-scene reveal (`story.ni:1330`, *"you
are Jacqueline Toresal, daughter of the Duke"*). Roughly thirty lines carry it. Cheap to execute,
which is not the same as easy to write.

**[derived, awaiting David's confirmation] Composition with 3d.** If the public record says son,
then perception and record disagree about Jack's lineage as well as about her self — the law and
the letter would say the Duke's son while the people with the talent see the Duke's daughter. Dame
Sandler is both a perceiver (3d) and the character who delivers the claim (`DS32`, *"We've all
been waiting for the Duke's daughter to finally make herself known"*), so her reveal is where the
two languages would meet in one scene. Recorded as a reading of the two rules together, not as a
ruling — David has not been asked whether perceivers use the true lineage language.

**The letter — RESOLVED (David, 2026-09-01, change document Chapter 6): it names her rightly.**
The Duke's letter carries as written — *Jacqueline Toresal*, and "her" (`story.ni:9481`). The
derived reading above is half right: the *law* and the public claim say son; the Duke's own
hand does not. Whether he saw her truly or knew is not decided and never explained (§2). The
consequence for the coda sharpens rather than changes: the claim is written in the wrong name
everywhere except the one document Fossville hid.

**Androgyny — RESOLVED (David, 2026-08-22): androgynous only in her description.** David raised
making Jack androgynous — *"seems like a boy, but could be a girl"* — and then scoped it: the
androgyny lives in how Jack is **described**, not in how the world **perceives** her. The public
still reliably reads her as a boy, and §1's maintained presentation stands.

**What that preserves.** §3d stays exclusive: the talent remains the only channel by which anyone
sees Jack truly, so Teisha *"guessed it the very first time she caught you loitering"*
(`story.ni:3110`) and Dame Sandler's *"did you really think I hadn't guessed?"* (`DS32`) remain
evidence of the talent rather than of ordinary sharp eyes. It also keeps the hat furniture live —
*"it's a lot harder to pretend to be a boy with your hair hanging down around your ears"*
(`story.ni:1408`), the refusal to uncap around Bobby — which Chapter 1 runs on.

**And the "assumed, not deceived" framing survives anyway**, at the legal layer: under 3e the
public record says son because nobody asked, not because Jack lied to a clerk. The softer reading
of the pain is available without spending the talent's distinctiveness to get it.

**The dress — RESOLVED (David, 2026-09-02, change document Chapter 8): the presentation flips, and
the public follows it.** The bath at Red Gate Estate (`story.ni:10543-10574`) is where Jack's
presentation changes: from the mirror on she presents as a young lady, and the public reads
her as one, as the source has it. The androgyny ruling above is unchanged — the world reads the
presentation, and this is the second presentation. Consequences: the men on the street let a lady
pass; the talent stops showing in anyone's *words* from here, because everyone uses the girl
words now; the tells that carried Chapters 1-7 are a closed set. What the mirror shows of the body
is not decided here — §2's coda is where the motif becomes literal.

**Consequence for the coda (§2).** The Vedd's theology — peeling away the layers of life to reveal
a thing's true nature — now has the inheritance itself as its subject, not only Jack's body. The
claim that makes her heir is written in the wrong name; the coda is where the right one surfaces.

### 3f. Who knows what: three tiers — David, 2026-08-22

**The public** knows a thief named Jack. Nothing about lineage, because as far as the public is
concerned there is no lineage to know.

**The mercenaries** know there is a scion. Not who, not where — that there is one, and that they
are hunting them.

**A small group** knows everything.

**This narrows the lineage-language question sharply.** Most of the cast never speaks about Jack's
parentage at all, so §3e's public "son" is not a word the market uses — it is the word of the
documents and of the people who know, and its reach is roughly the thirty lines §3e measured, not
the whole script.

**[source] The tiers are already in the text, and the eavesdrop is where all three meet.** The
mercenaries' overheard briefing (`story.ni:1798`, the `Table of overheard mercenary utterances`)
has the leader say *"we know he skulks Grubber's most mornings"* and *"this is a kid we're lookin'
for... I find out later he got away under your nose"* — they are hunting a scion and they assume a
boy. But **the parchment they read from describes a body, not a person**: *"Shoulder-length brown
hair. Green eyes. Slight of build. Ten, maybe twelve spans high. Usually wears a hat and a gray
cloak."* No name, no gender. The "he" is the leader's inference, not what is written — which sits
exactly right beside the androgyny ruling in §3e, and which is also why the silk cloak works as a
disguise at all: the parchment names the gray one.

**Knowledge and perception are independent axes, and the change document must carry both.** They
are not the same rule and do not correlate:

| | Perceives Jack (3d) | Does not |
| --- | --- | --- |
| **Knows everything** | Dame Sandler; Hester Rudup (hostile — David, 2026-09-01, change document Chapter 4) | Widow Fiona (David, 2026-09-02, change document Chapter 7 — has known the name *Jacqueline* from the Duke for fourteen years, never from her eyes); Baron Fossville (David, 2026-09-01, change document Chapter 6 — knows from the letter, never from his eyes) |
| **Public tier** | Teisha, Widow Shannon; Olmer (David, 2026-09-01, change document Chapter 5); Fossville's butler (David, 2026-09-01, change document Chapter 6) | the market, the stallkeepers, Bobby, Jacobs |

Teisha sees Jack truly and wants no part of the politics — *"Don't tell me what they're after you
for, I don't want to know"* (`TE2`). Fiona has the entire conspiracy and none of the sight: she
sought Dame Sandler's help when the Duke died (`DS35`) and still does not see the girl in front of
her. Neither cell of that table is empty, which is what makes it a matrix rather than one rule
wearing two names.

### 3g. The standing dialogue rule: position picks the word — David, 2026-08-22

This is the standing rule §3d says the change document must carry. It governs every speaking
character in every conversation, and it is decided by **position**, not by perception alone.

| Position | Words used | Examples |
| --- | --- | --- |
| Perceivers outside the arrangement | true words, freely — nobody is paying them not to | Teisha, Widow Shannon |
| Perceivers inside the arrangement | true words, but only in private — which is what the reveal scene *is* | Dame Sandler |
| Non-perceivers who know the politics | public words, bound twice: they do not see, and they are paid not to look | Widow Fiona |
| Everyone else | never speaks of lineage at all (§3f) | the market, the stallkeepers, Bobby |

### And the default is a neutral noun: "brat" — David, 2026-08-22

**Where a neutral noun will carry the line, use one.** David's word is **brat**. It does two jobs
at once: it **avoids the pronoun problem** — no gendered pronoun has to be chosen for a speaker
whose position has not yet been established for the player — and it **deliberately confuses the
player**, who cannot yet tell what any given character actually sees.

**[source] The neutral register already dominates the original and only needs systematising.**
Measured 2026-08-22 against `source/story.ni`:

| Neutral, already in voice | | Gendered, must be assigned by position |
| --- | ---: | --- |
| child | 33 | girl — 40 |
| urchin | 29 | boy — 27 |
| kid | 14 | lad — 6 |
| brat | 5 | |
| little rat | 3 | |

Roughly 84 neutral tokens against 73 gendered ones. The neutral words are already
position-flavoured in Gentry's text without being deliberate: the mercenaries reach for *kid* and
*"the little rat"* (`story.ni:2163`), the widows and Dame Sandler for *child*, the Princess and
Jack herself for *urchin*. The rewrite makes that systematic rather than inventing it.

**[watch] "brat" is already taken, once.** Holstenoffer uses it for the Princess — *"if the
Ascension goes to the Queen's little brat"* (`HO7`, `story.ni:4597`). Two claimants both called
the brat is either a deliberate rhyme worth keeping or a real ambiguity; flagged for David rather
than resolved, since confusing the player about what characters *see* is intended and confusing
them about *which claimant is meant* probably is not.

### 3h. A Miradanian word for what Jack is: **veshen**, worn to **vesh** — David, 2026-08-22

**The word is `veshen`, the old form, which people have worn down to `vesh`.** David's coinage,
2026-08-22. Recorded below: the brief it satisfies, the candidates set aside on the way, and the
consequences that follow — so no later session re-proposes a rejected candidate, invents a variant,
or writes a line that explains the word.

**Why the two forms are the strongest part of it.** §2 establishes that the Vedd idioms survive as
fossils — the speech outlived the order by centuries. `veshen` → `vesh` puts that *inside the word*:
it has visibly worn down in the mouth, so the evidence of its age is carried by its shape rather
than by anyone stating it. The axiom that nothing is explained is satisfied by the etymology being
audible instead of told.

**And the pair is a second tell, free.** Which form a character reaches for is characterisation:
the old form from someone formal, learned, or old — someone who knows it *is* old, and is therefore
standing closer to the source of it — and the worn form everywhere else. That is a register axis
that did not have to be built, and it composes with §3g's position table rather than competing
with it.

**What the word is for — it is the positive half of §3g's device.** The neutral-noun default
("brat") keeps the player from telling who sees what. A word does the opposite: **a character who
uses it is a character who sees.** Today the only perceiver marker is Shannon's *"Miss
Jacqueline"* (`SH1`, `SH7`, `SH13`) and pronoun choice — and pronouns are exactly what "brat"
exists to avoid. The word gives perceivers a way to signal without a pronoun ever being chosen.

**The brief:**

| Constraint | Why |
| --- | --- |
| a **standing property**, not an event | it must apply to Jack in Chapter 1, long before the coda's rite |
| **one word** | two-word terms read as doctrine, and §2 forbids doctrine |
| **worn and plain** | it is a Vedd fossil; the register is `Brigid`, `the Goddesses`, `spans` |
| **not explanatory** | §2's axiom: nothing about the world is ever accounted for |
| **usable in ordinary speech** | it is a tell, so it must fit inside a market sentence |

**Candidates tested and set aside** (David's, 2026-08-22):
- *cut in two* — implies division and damage. Fights §3a (no stigma) and the premise itself: Jack is
  one thing under a presented surface, which is also the Vedd's own theology (peeling layers away,
  not cleaving).
- *spiritually born* / *mystic birthing* — explanatory, and both name an **event**. Jack's event is
  the coda (§2), so a perceiver in Chapter 1 could not yet use either.
- *ethereal* — right grammar (a standing quality, one word, usable of her now), wrong meaning and
  wrong mouth: Latinate and literary where Miradania is plain.

**A made-up word satisfies the hardest constraint by construction.** An English compound carries its
theory in its morphemes; an invented word carries none, so its meaning can only arrive from watching
who says it and about whom. That is §2's axiomatic world working as designed — the player is never
told, and no character can explain a word they inherited.

**[source] The original already invents common nouns and never glosses them** — the precedent to
match for register: `kello`, a fruit, used casually (*"Normally you'd kill for a slice of kello"*,
`story.ni:2378`), and `spans`, a unit of height, used in the mercenaries' parchment description
(`story.ni:1806`) with no explanation offered. Short, plain, unglossed, load-bearing.

**Consequence for Phase 6, if the word exists.** Teisha is the first perceiver the player meets and
she is now met in Chapter 1's calm walk — so Chapter 1 is where the word is first heard, and its
first uses must be positioned so the player can triangulate the meaning from context alone.

**The word has to be a parser word, and that collides with the axiom.** A player who *hears*
`vesh` will *type* it — "ask teisha about vesh", "x vesh", "vesh". An invented word the parser does
not know is a word the game has taught the player not to trust, and in a story whose central device
is a term you are meant to notice, that is a real cost. So `vesh` and `veshen` both need custom
vocabulary and a response.

But §2 says **no character explains**, so the response cannot define the word.

**David wrote the response, 2026-08-22 — the PC's own answer:**

> **First time:** "There are many old mystical sayings, some still carry their original meaning.
> Most are just gibberish."
>
> **Subsequently:** "Mystic nonsense."

**The repeat is a harder dismissal, and it deepens the irony rather than just saving words**: the
more the player pokes at the thing that is about her, the more curtly Jack waves it off.

**[source] This is the original's own pattern**, used throughout the quip trees —
`[first time]...[subsequently][rp]...[only]` (e.g. `TE12`, `TE15`, `TE22`), so the shape is
idiomatic to the material rather than imported.

**[RESOLVED 2026-08-22 — Chord expresses this directly, as a named strategy.]** The concept is
spelled **`first-time`**, which is why the earlier grep of `docs/reference/chord-language.md` found
nothing: it was searched for as prose, and it is a keyword. Verified against the compiler and the
runtime rather than the reference doc.

**The semantics are exactly the two-variant shape David wrote**: variant 1 on the first read,
variant 2 on every read after — `variants[n === 0 ? 0 : Math.min(1, variants.length - 1)]`, with
the occurrence count persisted in world state, so it survives save/restore
(`packages/story-loader/src/runtime.ts:3329` for phrase reads, `:3765` for the in-rule form).
`first-time` is one of five strategies the parser accepts
(`packages/chord/src/parser.ts:173`; also `randomly`, `cycling`, `stopping`, `sticky`) and it
reaches the IR as a first-class field (`packages/chord/src/ir.ts:887`).

**Three authoring positions carry it**, so the response can sit wherever Chapter 1 wants it:

| Form | Where it is written | Cite |
| --- | --- | --- |
| `define phrase <key>, first-time` with `or`-separated variants | a standalone phrase, reusable by every idiom the player types | `packages/chord/src/ast.ts:1275` |
| `select first-time … or … end select` | inline inside a rule body | `packages/chord/src/parser.ts:6881` |
| `first time` ordinal block | inline inside a rule, indent-scoped, first occurrence only | `packages/chord/src/ast.ts:2040` |

**The reusable phrase is the right one here**, since this line answers the whole Vedd idiom register
and not one question — one `define phrase` keyed to the register, referenced by every `vesh`,
`veshen`, and Phase 8 idiom response.

**Do not write `once`.** It is a retired spelling of this strategy and the parser rejects it by name
(`packages/chord/src/parser.ts:175`). Note also that the hyphen is positional: `first-time` in a
strategy slot, `first time` as an ordinal block head or a `define greetings` row.

**This is the default response for the entire Vedd idiom register, not only for `vesh`.** Phase 8
scatters idioms across 380 quips and 1,192 response rules, and every one of them is a phrase a
player may type. One line in Jack's own voice answers all of them, which collapses what looked like
a per-character writing obligation into a single authored response plus custom vocabulary. It also
holds the axiom: it acknowledges that the sayings are old and that meaning has been lost, and
defines nothing.

**And it buys dramatic irony for free.** The player asks about `vesh`; Jack — who does not know she
is the subject of one of these sayings, and who has just been called it by a perceiver — dismisses
the lot as gibberish. Her ignorance is the joke and the ache at once, and it is delivered by the
line that exists for a parser reason.

**Open**: whether there is also a separate word for the **seeing** (§3d's talent), or whether the
talent stays unnamed — which would be the more consistent reading of §2's axiom.

## 4. The Maiden House rewrite

**The maidens see Jack as a boy.** This requires rewriting the Maiden House material.

**[source]** The residents are Widow Theresa (`story.ni:5842`), Widow Fiona (`6126`), and
Widow Shannon. All three currently know Jack is a girl — Theresa's hostility, Fiona's concern,
and Shannon's help are all written from that footing.

### Who sees, and who doesn't — RESOLVED (David, 2026-08-21)

**Shannon has the gender sight. Theresa and Fiona do not.** They treat Jack as Jack, and are
mostly dismissive of all children.

This resolves both questions that were open here: why the house doesn't know (no talent, and
no close attention paid to children), and what happens to the Shannon dress scene (nothing —
it stands, and is strengthened).

**[source] The tell is already written, and needs no new line.** All three widows say
"Jacqueline" in the original, so the name alone does not separate them — but only Shannon says
"**Miss** Jacqueline," as a matter of course: `SH1` "Hello, Miss Jacqueline," `SH7` "Of course,
Miss Jacqueline," `SH13` "Of course, Miss Jacqueline." Theresa sneers the bare name
(`story.ni:5860`); Fiona uses it maternally (`6170`, `6188`). Under the rewrite, Theresa's and
Fiona's uses become "Jack" and Shannon's existing courtesy becomes the signal, untouched.

**[source] "Dismissive of all children" is already the written contrast.** Theresa "harbors a
bitter dislike for anyone whom she perceives as unjustly privileged... that includes you"
(`5842`). Shannon "devotes herself to the children, particularly the toddlers" (`6425`) — the
exception in the house, and the one who sees.

**[source] Two kinds of knowing, cleanly separated.** Fiona holds the *political* secret: she
is the special tutor who knew Jack's father (`FI20`, `FI28`, `9733` — "The Duke of Toresal
really was my father. And you knew him!"). Shannon holds the sight. Neither knows what the
other knows, and the house keeps two different secrets about the same child.

**[source] An unintended rhyme, possibly worth keeping.** Jack rates Shannon as "plain-looking,
none too bright" (`6425`), and the description later concedes "your respect for her has grown."
The person Jack dismisses is the person who sees her.

### Fiona's knot: the house is built on discretion — David, 2026-08-22

**The Maiden House runs on discretion, and was paid well to mind Jack.** Fiona is therefore
**ethically tied in a knot**: she holds the political secret, she is paid to keep it, and she does
not have the sight (§4 above). Her use of the public words is not ignorance alone — it is an
obligation she took money for.

**[source] The knot is already in her warmest lines, and the rewrite is where it hurts.** Fiona's
two most loving moments both reach for the true words:

- *"Oh, child,"* she whispers, holding Jack. *"You've been like a daughter to me, you know."*
  (`story.ni:6134`)
- *"I love you, too, Jacqueline,"* she says, *"but we haven't time for that now."* (`story.ni:6134`)

Under §4 Fiona does not perceive Jack, and her "Jacqueline" becomes "Jack" — so both lines convert
to the boy words. The person who loves Jack most in that house is the person who can only say so
about a child who is not quite the one in front of her. This is the concrete form of the pain David
named in §3e, and it is not carried by documents or by the throne; it is carried by an embrace in a
kitchen.

**Consequence for §4's "two kinds of knowing".** The separation stands, but Fiona's half is now
*paid* rather than merely private, which changes what her silence costs her and gives her a reason
to hold it beyond habit. It also means her later turn — sending Jack to Dame Sandler (`DS34`, *"I
was only to step in as a last resort"*) — is her breaking an arrangement she has kept for money and
for love at the same time.

**Chapter 7's turn — David, 2026-09-02 (change document Chapter 7).** Fiona has known the name
*Jacqueline* from the Duke for fourteen years and has called the child Jack every day of them,
because that is the arrangement she was paid to keep and the child she sees. After the raid, with
the arrangement over, she says the name to Jack's face for the first time (`FI28`, `FI30`,
`story.ni:9733-9737`) — knowledge, as Fossville's *"girl"* is knowledge (§3f), not sight. The
kitchen lines above still convert: in Chapter 3 the arrangement is in force. Her cell in §3f does
not move; "everything" now includes the name.

### The Shannon dress scene — no longer a collision

The become-Jacqueline mirror scene (`story.ni:10574`, §2 above) is staged by Shannon. With
Shannon among those who see, the scene stands as written and gains a second reading: she is
helping Jack look like what Shannon already perceives. "She was right about the size, too"
stops being an obstacle to the rewrite and becomes evidence for it.

## 5. Structural redesign: openness with pressure

**Grubber's Market always just worked** and is one of the few great parts of the story. After
it, the game **puts the player on rails and lets them down.**

**The market model should be the template for the whole game**: openness, but with sustained
pressure on the PC to keep moving.

**[source] What the market's pressure actually is, mechanically.** The `wandering mercenaries`
are a single mobile NPC with escalating states — `oblivious` → `approaching` → `grabbing` →
`nearby` (`story.ni:1875-1878, 1563-1564, 1728-1729`) — *moved to the player's location*
rather than following a route, with exits and affordances gated on which state it is in.
Talking to a stallkeeper has different outcomes per state. The pattern: an open sub-map, a
pursuer whose proximity is a state machine, and affordances whose meaning changes as it
escalates.

**[source] The rails are visible in the game's own architecture.** `story.ni:1065-1087` — the
hint system is 17 scenes in a strict single-file chain, each beginning exactly when the
previous ends: Grubbers → Commerce Street → Mulling → Maiden House → Nighttime → Lord's Keep →
Escaping Jail → Escaping Sewer → Rooftop → Search → Hanging → Raid → … The game's internal
model of "where the player is" is a linear index. Generalizing the market means replacing a
stage counter with per-region situated pressure. Supporting figure: 155 movement-intercepting
rules across the file (`grep -c "Instead of going\|Before going"`).

### The pacing spine: push / pull / quiet

David's sequence for the early and middle game:

| Beat | Kind | Note |
| --- | --- | --- |
| Mercenaries | **push** | |
| Shops | **quiet** (solitude) | |
| Mercenaries | **push** | |
| Maiden House | — | rewritten so the maidens see Jack as a boy (§4) |
| Mercenaries | **push** | |
| Bobby | **pull** | first pull |
| Townhouse / Library / Bath | **pull** | knowledge |
| Remainder | push / pull / quiet sequences | |

### Pressure has teeth: capture and death stay — David, 2026-08-22

**The losing endings stay.** Capture and death are part of the story, and they are where the
tension comes from. David's reference point: Disney, which has always represented darkness.

**What this settles concretely in Chapter 1** — the sharpest instance, because it is the first
twenty minutes of the game: the pole sequence keeps its timer and its disaster ending
(`Pole Destruction ends in disaster`, `story.ni:4098`), and being caught in the market keeps its
ending — the sack over Jack's head and *"Why they wanted you, you never awake to find out"*
(`story.ni:2163`).

**And it settles the §5 open question's shape, if not its content.** Whatever supplies pressure
outside a chase has to be able to actually take the player, or it is not pressure — it is
atmosphere. A remake that kept the market's openness while removing its teeth would be keeping the
part that is easy to copy and dropping the part that made it work.

**Standing consequence**: no phase of this port may quietly soften a fail state into a warning, a
retry, or a scripted rescue on the grounds of modern player tolerance. Where a scene can kill or
capture Jack in the source, it can in the remake unless David rules otherwise for that scene.

### [open] What supplies pressure outside a chase?

The mercenaries work because Jack is being hunted *right now*. Whatever the Lord's Keep or
Maiden House equivalent is needs its own source of "keep moving" — a clock, a rising alarm, a
draining resource, someone closing in — or the openness reads as aimlessness. Raised, not
answered.

## 6. Fidelity license

"Literally no one bought SL and few played it — we're safe."

There are **no fan expectations to honor**, so fidelity is not a constraint. The source is a
**quarry, not a specification**: keep Grubber's Market because it is good, keep the prose
because it is good, keep Teisha and Bobby and Dame Sandler because they are good, and rebuild
the rails because they are not.

This is the license every later decision leans on. Without it recorded, a future session hits
a scene that does not fit and wonders whether cutting it is allowed.

### Authorship split — David, 2026-08-22: "you're the guide and I will provide content"

**The Gentry's-voice prose clearance (2026-08-21) is withdrawn.** Claude writes no prose for
this port — not dialogue, not Vedd idioms, not the coda, not room text. Claude does the
structural work: the Chord conversion, the analysis, the measurement, and the shape David writes
into. David authors every line that ships.

**Why, in David's framing:** this is a public release (P-10), and a credit line reading
"additional content produced by Claude in Michael Gentry's voice (by permission)" would land as
a machine wearing a living author's style, with the permission being the part people quote. The
withdrawal also restores the project's standing default — GenAI stays out of works people
actually play — of which the 2026-08-21 clearance was the narrow exception.

**The line that matters in practice: conversion is not authoring.** Carrying Gentry's existing
sentences forward into beats is conversion and stays in scope. Generating new sentences in his
style does not. Phases 7 and 8 restructure; they do not rewrite.

**"You're the guide" includes running the conversation — David, 2026-08-22.** The split does not mean
David works alone and hands over finished documents. Phase 4 was reframed the same day from an artifact
this plan waits on into a conversation this plan runs: Claude presents what a chapter is in the 2009
source and asks the decisions it forces, David answers, Claude records the answers as the change
document's section for that chapter. Guiding is asking the right question against a measured world.
It is not proposing an answer, and a silence in David's response is never Claude's to fill.

**How much is actually left to write — measured 2026-08-22 against `source/story.ni`:**

| | Count | |
|---|---|---|
| Quip declarations | 380 | 333 plain + 47 `transitional` — reconciles with `INVENTORY.md:209` |
| Quips carrying display text | 317 | |
| **Words of Gentry display-text prose** | **20,573** | ~82 pages at 250 w/p — **this carries forward; it is not rewritten** |
| Quips naming "Jacqueline" | 37 | the per-NPC perception rewrite surface (§3d) — mostly forms of address, not new prose |
| Maiden House quips (TH/FI/SH) | 55 | §4's rewrite territory |

**The shape this gives the job.** The overwhelming majority of the port's prose is Gentry's,
already written, and moves across structurally. The genuinely *new* writing is bounded: the
Vedd idiom layer (light, per §2's calibration), the coda (one scene), the perception-driven
forms of address across those 37 quips, and whatever the change document adds. That is a
volume David can write himself without it being a burden — which is what makes the withdrawal
cheap rather than costly, and lets the credit line read as the ordinary thing: written by
David Cornelson, based on the game by Michael Gentry.

## 7. Open TODOs

### The endgame fight scene is a mess

David: "the fight scene at the end is A MESS... our list of TODOs has to include cleaning it
up and no, I don't know how to do that... I may have some notes from Mike somewhere... I'll
dig for them."

**No solution proposed. Do not solve this unasked.**

**[source] The mess is structural and visible.** The endgame runs off a single hand-maintained
list of scripted beats — `story.ni:11911`: `change the current script to {FOSS0, FOSS1, FOSS2,
FOSS5, FOSS6, FOSS7, FOSS8, FOSS8a, FOSS9, FOSS10, FOSS11, FOSS12}`. **FOSS3 and FOSS4 are
absent** — beats were cut or reordered and the list patched by hand. The Skirmish scene has no
trigger of its own: it "begins when FOSS6 is fired" (`12076`), so a scene boundary is a
position inside that list, and it ends when the list empties, with two separate places that
force-empty it to terminate (`12090`, `12199`, both commented `[ thus ending the scene ]`).
The climactic fight — where the player should have the most agency — is the most rails-bound
thing in the game. Same disease as the 17-scene hint chain, concentrated.

It also sits **directly before the coda**, so whatever replaces it hands off to the rescue and
the prayer circle.

### External dependencies

Two things this plan cannot produce:

1. **David's change document** (P-4, Phase 4's gate) — still outstanding.
2. **Michael Gentry's notes on the endgame**, if they exist. David will dig.

### [open] Do the sequel notes exist in readable form?

Asked and not yet answered. The corpus does not contain them — `Book JAL - Jacqueline's
Section - Not for release` (`story.ni:12475`) turned out to be tester scripts and one puzzle
note. If what David and Gentry laid out lives in a file, it is context the coda needs. If it
only exists in David's head, this capture is the source.

## 8. Consequences for the plan

Recorded here rather than applied. **Not yet folded into `plan.md`** — awaiting David.

1. **This is not a port.** Two structural changes fall outside the plan's framing: the coda is content with no source to port from, and de-railroading the middle and late game is a redesign of material that does exist. Phase 8 is currently worded "port the remaining chapters and world," which covers neither. What is being described is a spec for a different game that shares Part 1's world, plot, and most of its prose.
2. **Per-NPC perception (§3d) is a standing rule across all dialogue**, affecting Phases 6 and 7 (the quip-tree-to-beat rewrite across ~40 conversations), not just individual scenes.
3. **The endgame fight needs its own phase or an explicit deferral**, and it is blocked on external input (Gentry's notes) exactly as Phase 4 is.
4. **The Vedd foreshadow decision (§2) changes the size of Phases 7 and 8.** Unseeded, the coda is bolted on at the end and the ported text is untouched. Seeded, Vedd presence threads back through the chapters.
5. The existing re-plan obligation for P-10's release terms (browser build, hosting, landing page, IFID, announcement) still stands from the 2026-08-21 session and is unaffected by the above.
