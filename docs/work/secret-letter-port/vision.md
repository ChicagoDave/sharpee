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

### Foreshadowing the Vedd — [open]

David: "we should probably foreshadow the Vedd somehow — TBD, though the idea of Jack reading
about them and imagining being reborn might be a great thread."

Mechanism is **TBD**. Note that seeding the Vedd earlier reverses the near-zero ripple above:
threading them back through the ported chapters touches existing text throughout.

**[source]** Existing furniture the thread could attach to, all already present:

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

### 3d. People with the talent see Jack as Jacq

Those who have it perceive her true self, unprompted and without being told.

**[source]** Two characters are already written as inexplicably perceiving something in Jack:

- **Teisha** — `story.ni:3110`: "She also knows your big secret (**guessed it the very first time she caught you loitering at the tent flap**), which is a little bit scary and a little bit of a relief." And in the silk cloak scene: "'I was right,' she says. 'It brings out your eyes. You look... almost *royal*.'" She perceived Jack correctly on sight, before evidence, and what she sees is both the girl and the heir. She is in Grubber's Market — the social foreshadow can begin in the opening scene.
- **Dame Sandler** — `story.ni:5236`: "**for some reason** Dame Sandler has always taken a liking to you... her demeanor is more that of an aristocrat, if not full royalty... It's more of a bemused curiosity than real affection." An unexplained affinity, explicitly marked unexplained, on the character with the largest quip tree in the game (48 quips).

**Technical consequence — this is a standing rule, not a beat.** Per-NPC perception means the
game carries, for every speaking character, whether they see Jack or Jacqueline, and that
shapes forms of address, pronouns, and dialogue throughout — across 23 conversation trees and
380 quips. It belongs in the change document as a rule governing all dialogue, not as a scene
written once.

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
