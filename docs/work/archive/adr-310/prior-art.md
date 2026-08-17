# ADR-310 Prior Art Review — Pass 1

**Date**: 2026-08-14 (session 4e8fc1)
**Purpose**: Test ADR-310's claims against the literature it names but does not cite,
and answer as many of its six live Open Questions as prior art can answer.
**Status of ADR-310 at time of writing**: DRAFT (2026-08-11), no implementation,
`@sharpee/character` still has zero consumers.

---

## Ground rules for this document

David's ruling, 2026-08-14: **reuse thoughts, not content.**

- Mechanisms are described here in our own words. No passages, tables, or figures
  are reproduced from any source.
- Direct quotation is limited to pinning a term of art, kept to a phrase, and
  attributed inline.
- Sources are cited so a reader can go get them. This document is not a place a
  source lives.
- Source code (talktown, Ensemble) is read for design, never copied.
- Paywalled work is used through secondary material the author published
  themselves, not through third-party PDF reposts of the paper.

---

## What was read

| Source | Access | Read |
| --- | --- | --- |
| Emily Short, "NPC Conversation Systems," *IF Theory Reader* (2011), pp. 331–358 | Free PDF, IF Archive | Full chapter |
| James Ryan & Michael Mateas, "Simulating Character Knowledge Phenomena in *Talk of the Town*," *Game AI Pro 3* ch. 37 (2017), pp. 433–448 | Free PDF, gameaipro.com | Full chapter |
| Josh McCoy, Michael Mateas, Noah Wardrip-Fruin, "Comme il Faut: A System for Simulating Social Games Between Autonomous Characters," DAC 2009 | Free PDF, eis.ucsc.edu | Full paper |
| Eric Eve, "Programming Conversations with NPCs in TADS 3," tads.org/howto/t3conv.htm | Free HTML | Full |
| Emily Short, "Versu: Conversation Implementation" (2013), emshort.blog | Author's own blog | Full |

**Not read, and why**: Evans & Short, "Versu—A Simulationist Storytelling System,"
*IEEE TCIAIG* 6(2):113–130 (2014) is paywalled; per the ground rules it is
represented here only through Short's own blog account of the same system and
through the citing literature. Ryan's dissertation, the Prom Week FDG paper
(its author-hosted copy fails TLS), Kreminski's storylets survey, and the
Ensemble source are deferred to pass 2.

**Also checked**: `packages/character/src/` at HEAD, to ground the mapping in what
is actually implemented rather than in what ADR-141 describes.

---

## 1. Emily Short, "NPC Conversation Systems" (IF Theory Reader, 2011)

### Mechanism

The chapter separates two axes that ADR-310 currently treats as one thing.

**Interface** — how the player says something: wordless/reactive, yes-no, TALK TO,
menus, ASK/TELL, bare topic words, ASK/TELL with conversational context and
"special topics" (the TADS 3 design), menu/topic hybrids, chatbot-style natural
language, and meta-conversation verbs that set tone rather than content.

**Model** — how the conversation is represented internally. She defines a
vocabulary for it: **topic** (a subject), **fact** (a proposition about a topic),
**quip** (the verbatim line), **effect** (what saying it does beyond conveying
information), **conversational goal** (what a speaker is trying to achieve), and
**scene** (a section of plot, owned by the plot model rather than the conversation
model). Three traditional models: one quip per topic (under ASK/TELL), a branching
quip tree (under menus), and one prewritten exchange per scene (under TALK TO).

Most of the chapter is a retrospective on her own systems, each named with its
failure mode:

- *Galatea* — topic quips plus mood tracking and used-quip tagging; no fact model.
  Her verdict: shaggy, hard to extend, and the character is mostly reactive.
- *Best of Three* — quips indicate facts; the NPC draws inferences up a fact tree.
  Her verdict: not much fun. The inference was real but invisible, so players read
  it as a script, and conversation always converged on the same goals.
- *City of Secrets* — quips cross-indexed to multiple topics, nested topics,
  meta-topics for abstract acts, per-scene NPC quip scripts. Her verdict is the
  harshest in the chapter: out of hand, hard to program and harder to maintain,
  and the root cause was a lack of focus — she tried to implement "everything
  reasonable."
- *Glass* — quips attached to *transitions between* topics rather than to topics;
  NPCs pursue a goal topic by pathfinding across a topic graph. Her verdict: the
  best contextual flow of the set, and easy NPC AI, at the cost of player freedom.

She closes with a section called "Exposing the Mechanism (Partly)," arguing that
when a character draws a conclusion the game should generally tell the player what
was concluded and why — acknowledging this cuts against the received wisdom that a
good mechanism should feel invisible, and saying most IF is nonetheless better
served by giving the player clues about what is modeled.

### Bearing on ADR-310

**This is the most consequential source of the four, and it disagrees with the
ADR's governing decision.**

---

## 2. Ryan & Mateas, *Talk of the Town* (Game AI Pro 3, 2017)

### Mechanism

A character's knowledge is an ontology of **mental models**, one per person or
place they know of. Each mental model is a list of **belief facets** — one per
attribute of that entity. A facet is keyed by (owner, subject, facet type) and
carries: a value; a pointer to another mental model when the value is itself an
entity; a **predecessor** (the belief previously held, so supplanted knowledge is
traceable); **parents** (the facets in other characters that spawned this one);
an **evidence** list; a **strength** that is the sum of its evidence's strengths;
and an accuracy flag against current ground truth.

All knowledge is formed from **evidence**, and the evidence typology is the
load-bearing idea. Knowledge originates by reflection (self-knowledge),
observation, transference (copying a belief from one entity to another that
resembles it), confabulation (inventing a value, weighted by how common that value
is in the world), lying, or implantation at world-generation time. It reinforces
itself by declaration — retelling a belief strengthens it, so a character who
repeats a lie can come to hold it. It deteriorates by mutation, along a
hand-authored **belief mutation graph** of weighted transitions between plausible
values. It terminates by forgetting. Each piece of evidence carries source,
location, time, and a strength that decays and that depends on evidence type
(a statement is weaker than an observation) and, for statements, on the hearer's
affinity for the speaker.

**Salience** governs everything probabilistic: per-attribute salience (hair color
is more memorable than chin shape) crossed with per-character salience (a coworker
is more salient than a stranger, modulated by friendship, romance, and job status).
Salience decides what gets observed, what gets forgotten, and what gets talked
about.

**Propagation** is agent-driven, not an abstract diffusion model. When two
characters interact, the system scores every entity either of them knows about by
summed salience to both, takes the top *n* — where *n* comes from the strength of
their relationship and their extroversion — and exchanges attribute-level
information about those subjects at probabilities set by attribute salience. A
character can therefore learn about people they have never met, including the dead.

**Belief revision** is strength comparison. New contradicting evidence does not
overwrite; it accumulates under a **candidate belief**, and the candidate is
adopted only when its strength exceeds the held belief's — the displaced belief
becoming the new candidate. Oscillation is possible and is described as intended.

Scale, stated by the authors: 300–500 residents, 250–400 mental models each,
800–1200 belief facets per character at gameplay start, and roughly a minute of
wall clock per simulated timestep.

Their own stated lessons: the architecture is not computationally efficient, and
they get away with it only because the heavy work happens before gameplay and
between player turns. They worry about the interaction between the many tunable
parameters. And in over a hundred live performances of *Bad News*, the one thing
they actually had to hand-tune was a mutation rate — characters were
misremembering their parents' home addresses often enough to break believability.

### Bearing on ADR-310

Answers Open Question 2 concretely, quantifies the performance consequence, and
puts a documented field lesson against D6.

---

## 3. McCoy, Mateas & Wardrip-Fruin, Comme il Faut (DAC 2009)

### Mechanism

CiF models social interaction as **social games**: multi-character exchanges whose
function is to change social state. A social game has dramaturgical preconditions
(roles and their requirements, the setting, teams, and conditions on the *audience* —
characters watching but not participating), an event dependency graph whose nodes
carry performance actions and state changes, and branch points where a named role
chooses the path. Preconditions come in two kinds: fact preconditions about a single
entity, and relation preconditions joining two.

**Social state** is a set of **social facts** plus a history of past social games.
Social facts are either basic-need facts (subject, need, numeric impact) or social
status facts expressed as string triples (subject, relation, object) — with
wildcards, so one fact can assert a relation to everyone present.

**Character state** is a personality description: intensities across sixteen basic
needs (after Reiss), traits, per-game performance tendencies, and author-given goals.

The decision pipeline has four distinct stages, which is the part worth stealing:

1. **Goal selection** — from current need fulfillment and the needs profile,
   produce (goal, **volition**) pairs. A volition is the strength of desire to
   complete that goal. Author-given goals carry volitions directly.
2. **Intent formation** — score every role in every game in the library against the
   chosen goal, sum over the events reachable in that game, weight by need volitions
   and trait volitions, and sample from the resulting distribution.
3. **Role negotiation** — every *other* character scores the open roles in the
   initiated game and roles are assigned by descending intent. The target's
   participation is a scored, competitive decision, not a yes/no.
4. **Performance realization** — instantiate the actual lines and actions. Kept
   architecturally separate from the AI; their debug build renders social games as
   plain text.

### Bearing on ADR-310

Prior art for D8 and D9. The four-stage split is a direct challenge to D9's
one-line resistance.

---

## 4. Eric Eve, TADS 3 conversation (tads.org)

### Mechanism

`TopicEntry` objects associate a topic with a response for an actor. Matching
narrows to objects the PC knows about, then picks the highest `matchScore` among
active entries, with `DefaultTopic` catch-alls scoring lowest. Crucially, PC
knowledge (`knowsAbout`) and NPC willingness (`isActive`) are **separate axes** —
the system deliberately distinguishes what an NPC knows from whether they will say
it, so concealment and reluctance are first-class.

`ConvNode` is a location in a conversation tree: an object holding its own topic
entries, entered by a tag embedded in a response, exited when a response fails to
name a node or ask to stay. **One active node per actor, and an active node
overrides all other topic responses regardless of score.**

Conversation has explicit lifecycle state: ready vs. in-conversation, an attention
span after which the NPC gives up, explicit and implicit greetings and farewells.

`AgendaItem` gives an NPC initiative — a goal that fires when its readiness
condition holds and it is not yet done. `ConvAgendaItem` initiates conversation.
The precedence rule is stated flatly: an active ConvNode suppresses agenda
execution entirely.

Suggested topics are drawn in strict precedence — current ConvNode, then actor
state, then actor — and retire themselves once the player has acted on them, on
the assumption that curiosity is satisfied.

### Bearing on ADR-310

A shipped, twenty-year-lived-with answer to Open Question 7, and a shipped answer
to a lifecycle question D8 leaves implicit.

---

## 5. Versu, via Short's own account (2013)

Used here as secondary material, per the ground rules.

Characters participate in multiple **concurrent social practices**, each assigning
roles; actions from different practices interleave. Reaction is not reflex — a
character uses the same utility planner to choose a response as to choose any other
action, so a small remark can escalate through accumulating interpretation.

Dialogue units are **quips**, which may be speaker-specific or open to anyone,
may follow other quips directly or indirectly, may be **speakable only if the
character believes the fact they convey**, and carry prerequisites and triggers.
A single quip conveys factual, evaluative and emotive content at once.

Characters hold persistent evaluations of how well others perform their roles —
"membership categorization devices" — and those evaluations carry their
justifications, which transfer by gossip.

Turn-taking follows conversational norms: a selected next speaker, a set of salient
topics, an expected speech act. Players may violate the norms, and violation is
designed to be *noticed*.

Short's stated limitation is the one that matters most here: Versu characters do
**not** maintain models of what others know or believe. Changes percolate only
through explicit conversation.

---

## Findings against ADR-310

### F1. D12 has a named counter-authority, and it is the author whose vocabulary ADR-141 borrowed. — bears on D12, Q1

D12 rules that the player never sees or senses the mechanics, only behavior, and
calls this the decision that governs every other. Short's chapter argues close to
the opposite: when a character concludes something, tell the player what and why.
She names the received wisdom D12 states, and declines it.

Her evidence is not an opinion — it is *Best of Three*, where a working inference
system produced a game that was not fun, because the reasoning was invisible and
players read it as a script. That is precisely the failure mode D12's own "cost"
paragraph anticipates ("real and invisible, which is the same as absent") and then
accepts anyway.

**This does not overturn D12** — it is David's ruling, and there is a real
distinction available: D12 forbids the *platform* announcing state, not the
*author* writing a line in which a character visibly reasons aloud. Short's
recommendation is satisfiable within D12 by authored prose. But the ADR currently
presents D12 as obviously correct and unopposed, and it is neither. It should name
the disagreement, name *Best of Three* as the documented failure, and state which
of the two things Short conflates — platform announcement vs. authored legibility —
D12 actually forbids.

Versu supplies the reconciliation pattern: a norm violation is designed to be
noticed, but what the player perceives is the *behavior* of the violation, not a
readout. That is D12-compliant legibility, and it is a technique the ADR can name.

### F2. Open Question 4 is malformed — model and interface are different axes. — bears on Q4

Q4 asks whether the conversation system should replace or coexist with ADR-239
topic tables, and treats them as competitors. Short's framing dissolves that:
`define topics for …` is an **interface** (topic-word ASK/TELL); `dialogue-extension.ts`
driving lines from belief and disposition is a **model**. Her own systems mix and
match freely, and she warns explicitly against letting the model fall out of the
interface by default rather than by decision.

The reframed question: *what is the model under Chord's topic tables, and does the
character model replace that model while keeping the interface?* The answer is
almost certainly yes — keep `define topics for`, swap what selects the quip — and
that is a much smaller decision than the one Q4 poses.

**Terminology consequence**: Short's six words (topic, fact, quip, effect,
conversational goal, scene) are the field's shared vocabulary, and both Versu and
this chapter use **quip** for the unit ADR-310 D13 calls a phrase. Chord already
ships `phrase` and `phrasebook`; that is fine and should stay, but D11a's
normalization pass should record the synonym so the ADR is legible to anyone
arriving from the literature.

### F3. Open Question 2 is answerable, and the gap is bigger than the ADR states. — bears on D10, Q2

Q2 asks how to name a fact that several characters can hold with different
confidence. Checked against the implementation: `@sharpee/character`'s knowledge is
`Map<topic: string, { source: FactSource; confidence: ConfidenceWord; turn: number }>`
(`src/character-builder.ts:184`), with `FactSource` one of witnessed/told/inferred/
assumed/hallucinated and `ConfidenceWord` one of uncertain/suspects/believes/certain
(`packages/world-model/src/traits/character-model/character-vocabulary.ts:255–264`).

So a fact is a **bare topic string that a character either holds or does not**.
Different characters can hold the same topic at different confidence — but they
**cannot hold different values for it**, because there is no value slot. "The Maid
thinks the Colonel did it, the Cook thinks the Butler did" is not representable.
Neither is a belief that changes value, since there is nothing to change.

*Talk of the Town* answers this with a shape Sharpee could adopt in miniature:
address a belief by (owner, subject, facet) and give it a value, so contradiction
becomes the normal case rather than an unrepresentable one. Its full apparatus —
evidence lists, predecessors, parents, mutation graphs, salience-weighted
propagation — is far beyond what a parser IF story needs, but the *addressing* is
the minimum, and without it D10's propagation moves a token rather than a claim.

Versu's limitation is the counterweight and keeps this affordable: it deliberately
does not model what characters know about *others'* knowledge. One level of belief,
no theory of mind. That is the right scope line for ADR-310, and it should be
written down as a decision rather than left as an unstated absence.

### F4. D9's one-line resistance is a simplification with a name and a cost. — bears on D9

CiF splits what D9 fuses: volition (wanting), intent formation (choosing the
exchange), role negotiation (the other party scoring their own participation), and
performance realization (rendering). D9's `resists seduction, except from a woman`
collapses stages 3 and 4 into a boolean the target owns.

For Chord that is very likely the right call — the four-stage pipeline is a research
architecture and D9's asymmetry is genuinely elegant. But the ADR presents the
binary as ADR-146's design rather than as a choice with a cost, and the cost is
specific: a boolean cannot express *degree* of susceptibility, cannot let two NPCs
compete to be influenced, and gives the target no way to want the influence.
Worth a sentence in D9 naming CiF and saying the collapse is deliberate.

CiF's social status facts — subject/relation/object triples with wildcard support —
are also a ready-made addressing scheme for the NPC-to-NPC disposition half of Q2
(`the Maid trusts the Cook`), and cheaper than inventing one.

### F5. Open Question 7 has a shipped answer available: innermost context wins, totally. — bears on Q7, D13

TADS 3's rule is unambiguous — one active ConvNode per actor, and it overrides all
other topic responses regardless of score, and it suppresses NPC agendas outright.
Suggested topics resolve in a fixed precedence: node, then state, then actor.

Mapped onto D13's three stacked gates, that is: character-voice phrasebook beats
story-state phrasebook beats per-line `when`, as **total override rather than
scoring**, with the innermost active context winning. Eve chose total override over
score-blending after building both; ADR-250's seam should probably inherit that
answer rather than re-derive it.

TADS also supplies the lifecycle rule D8 leaves implicit: a stateful conversation
suppresses goal pursuit. ADR-310's goals evaluate `active when` every NPC turn with
no statement about what happens when the NPC is mid-conversation with the player.

### F6. D6's "never declared" needs one escape hatch, and prior art says which. — bears on D6

D6 keeps all decay in the runtime on the grounds that a decay-rate syntax would be
numbers in a language whose premise is words. The reasoning is sound and the default
is right.

But the single thing *Talk of the Town* had to hand-tune across a hundred-plus live
performances was a mutation rate, per-attribute, because one class of belief was
degrading implausibly. Their own conclusion was that this was a preliminary
indication of how hard authorial control will be with that many tunable parameters.

That does not argue for a decay-rate syntax. It argues that **some facts must be
declarable as durable** — a word, not a number. `knows the murder, witnessed`
already carries a source; `knows the murder, permanently` or an equivalent is the
same kind of word. D6 should say the runtime owns the *curve* while the author may
mark what is exempt from it.

### F7. D1's "map all of it" has a documented failure of exactly its shape. — bears on D1, Q1, Q5

*City of Secrets* is Short's own account of building the most complete conversation
system she had attempted — cross-indexed quips, nested topics, meta-topics,
per-scene NPC scripts, arbitrary state conditions — and concluding it was out of
hand, hard to maintain, and that the root cause was implementing "everything
reasonable" without deciding what the player was supposed to be doing.

D1 explicitly reverses an earlier decision to defer three subsystems, and maps all
six. The argument for that is strong and I do not think it is wrong. But the ADR
frames the earlier deferral as the *only* mistake available, and it isn't: the other
available mistake is the *City of Secrets* one, and the only known guard against it
is Open Question 1's demonstration story — deciding what the player is doing before
deciding what the model does.

This strengthens the ADR's own instinct that the demo story is a **prerequisite**,
not a follow-up. It also suggests the story should be specified in terms of the
player's task ("work out who is lying about what") before any of the six subsystems
is implemented.

### F8. The performance consequence can be quantified now. — bears on Consequences

ADR-310 says nobody has measured this. Prior art has, at a scale far above IF:
*Talk of the Town* runs 300–500 characters holding 800–1200 belief facets each at
roughly a minute per timestep, and its authors call the approach computationally
inefficient, viable only because the work happens between player turns rather than
during them.

The transferable finding is the **shape**, not the number: propagation between turns
is affordable; per-turn per-NPC evaluation is where the risk is. That is precisely
ADR-146 Layer 3 passive influence, which ADR-310 already flags. A twenty-NPC
household is two orders of magnitude below ToTT, so the budget is almost certainly
there — but the ADR should say the risk is concentrated in the per-turn loop and
that propagation should be scheduled, not continuous.

---

## Verdict on D1's novelty claim

D1 claims that what none of the prior systems did is ship *belief propagation,
influence with resistance, and goal pursuit as one coherent model, addressable from
a declarative authoring language, in a general-purpose parser IF platform*.

Checked source by source:

| System | Belief propagation | Influence w/ resistance | Goal pursuit | Declarative authoring | General-purpose IF tool |
| --- | --- | --- | --- | --- | --- |
| TADS 3 | no | no | yes (agendas) | yes | yes |
| Talk of the Town | yes, deeply | no | weak (utility routines) | no (Python sim) | no |
| Comme il Faut / Ensemble | no (shared social facts, not per-character belief) | yes (volitions, role negotiation) | yes | yes (XML/schema) | no |
| Versu | partial (percolates via conversation; no theory of mind) | yes (social practices) | yes (utility planner) | yes (Praxis) | no — not released as a general tool |

**The claim survives, and the load-bearing qualifiers are the last two columns.**
Every individual subsystem has strong prior art; two systems have two of the three;
none combines all three in a tool a general audience can author with. Versu is the
nearest miss by a distance and deserves more than the name-drop it currently gets —
it did substantially this, and the thing it lacked was availability, not capability.

**Recommended rewrite of the D1 paragraph**: keep the claim, drop any implication
that the individual pieces are novel, name Versu as the nearest prior art and say
plainly that it was a closed research system rather than a released authoring tool,
and cite all four systems. The current phrasing ("what none of those did") reads as
a stronger claim than the evidence supports, and the evidence supports a good enough
claim without it.

---

## Recommended ADR-310 amendments

Ordered by how much they change the design.

1. **D12** — engage Short's counter-position explicitly; distinguish platform
   announcement (forbidden) from authored legibility (required); cite *Best of Three*
   as the documented cost of getting this wrong. (F1)
2. **Q2 → a decision** — adopt (owner, subject, facet) + value addressing for beliefs,
   and adopt Versu's scope line: one level of belief, no theory of mind. Note that
   the current `Map<topic, {source, confidence, turn}>` cannot represent contradiction
   at all. (F3)
3. **Q4 → reframed and probably closable** — topic tables are the interface, the
   character model is the model; they compose rather than compete. (F2)
4. **Q7 → adopt TADS 3's rule** — innermost active context wins by total override,
   not by score. (F5)
5. **D1** — rewrite the prior-art paragraph per the verdict above. (F7, verdict)
6. **D6** — runtime owns the curve; author may mark specific knowledge exempt. (F6)
7. **D9** — name CiF, state that collapsing role negotiation to a boolean is
   deliberate, and name what it costs. Consider CiF's subject/relation/object triples
   for NPC-to-NPC disposition. (F4)
8. **D8** — state what happens to goal pursuit during a conversation; TADS 3
   suppresses agendas outright. (F5)
9. **Consequences (performance)** — the risk is the per-turn passive-influence loop,
   not propagation; schedule propagation between turns. (F8)
10. **Q1** — record that the demonstration story should be specified as a player
    *task* before any subsystem is implemented, on the *City of Secrets* evidence. (F7)

Nothing here argues for abandoning the ADR, and nothing here answers Open Question 5
("is any of this wanted?") — that remains a judgment call, and pass 2's LLM-era
sources are where the strongest counter-argument to it will come from.

## Pass 2 candidates

- Kreminski, "Sketching a Map of the Storylets Design Space" (ICIDS 2018) — content
  selection architecture, bearing further on Q7 and D13.
- The Prom Week FDG 2011 paper and the Ensemble engine source — what CiF became when
  it was made authorable by other people.
- Ryan, *Curating Simulated Storyworlds* (2018), and *Bad News* — the D12 legibility
  problem at length; a human actor stood between the simulation and the player.
- Paradise (FDG 2024) and Drama Llama (2025) — the strongest available
  counter-argument to Q5.
- Eve's adv3Lite conversation system — his second design after living with the first.

## Sources

- Short, E. 2011. "NPC Conversation Systems." In *IF Theory Reader*, ed. K. Jackson-Mead
  and J. R. Wheeler, 331–358. Boston: Transcript On Press.
  https://www.ifarchive.org/if-archive/books/IFTheoryBook.pdf
- Ryan, J., and M. Mateas. 2017. "Simulating Character Knowledge Phenomena in
  *Talk of the Town*." In *Game AI Pro 3*, ed. S. Rabin, ch. 37, 433–448. CRC Press.
  https://www.gameaipro.com/GameAIPro3/GameAIPro3_Chapter37_Simulating_Character_Knowledge_Phenomena_in_Talk_of_the_Town.pdf
- McCoy, J., M. Mateas, and N. Wardrip-Fruin. 2009. "Comme il Faut: A System for
  Simulating Social Games Between Autonomous Characters." *Digital Arts and Culture*.
  https://eis.ucsc.edu/papers/CognitionAndCreativity-JoshMcCoy-DAC09-Revised_0.pdf
- Eve, E. "Programming Conversations with NPCs in TADS 3." http://www.tads.org/howto/t3conv.htm
- Short, E. 2013. "Versu: Conversation Implementation."
  https://emshort.blog/2013/02/26/versu-conversation-implementation/
- Evans, R., and E. Short. 2014. "Versu—A Simulationist Storytelling System."
  *IEEE Transactions on Computational Intelligence and AI in Games* 6(2):113–130.
  (Paywalled; not read — see "What was read.")
