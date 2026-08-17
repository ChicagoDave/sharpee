# Conversation Systems Prior Art — Merged Reference

**Date**: 2026-08-16 (session 02073f)
**Supersedes as working reference**: `docs/work/lantern-brainstorm/conversation-systems-survey.md`
(April 2026, pre-Chord — the systems landscape) and `docs/work/archive/adr-310/prior-art.md`
(2026-08-14, pass 1 — academic depth and the ADR-310 findings). Both originals stay where
they are as history; this document is the one place to look. The two passes were done
blind to each other — neither cites the other — which is itself the reason this merge
exists.
**Serves**: ADR-320 (conversation and complex dialogue — the conversational side of NPC
agency, sitting on the ADR-310/318 character interior).

## Ground rules (carried from pass 1, David's ruling 2026-08-14)

**Reuse thoughts, not content.** Mechanisms are described in our own words; no reproduced
passages, tables, or figures from external sources; direct quotation limited to pinning a
term of art; source code read for design, never copied; paywalled work only through
material the author published themselves. Both source documents already follow these
rules, so their text is freely merged here.

## What was read, across both passes

| Source | Pass | Depth |
| --- | --- | --- |
| Short, "NPC Conversation Systems," *IF Theory Reader* (2011) | 1 | Full chapter |
| Ryan & Mateas, *Talk of the Town* (Game AI Pro 3, 2017) | 1 | Full chapter |
| McCoy, Mateas & Wardrip-Fruin, Comme il Faut (DAC 2009) | 1 | Full paper |
| Eve, TADS 3 conversation docs (tads.org) | 1 | Full |
| Short, "Versu: Conversation Implementation" (2013, own blog) | 1 | Full |
| TADS 3 library documentation (Roberts) | survey | Full system treatment |
| Eve's I7 Conversation Package; Short/Conley Threaded Conversation; Short's Glass waypoints; Ingold's menu critique | survey | Full system treatments |
| Ink documentation + 80 Days / Heaven's Vault developer accounts | survey | Full system treatment |
| Dialog (Åkesson) + Lewis Ship's threaded-conversation port | survey | System treatment |
| Galatea, Alabaster, Spider and Web, Varicella, Photopia, Best of Three, City of Secrets | survey | Work-level treatments |
| Façade (Mateas & Stern) — NLU, drama manager, ABL, social games | survey | Full system treatment |
| Storytron/Erasmatron (Crawford); Spirit AI Character Engine; AI Dungeon / LLM approaches | survey | System treatments |

**Still unread (pass 2 debt, carried forward)**: Ryan's dissertation (*Curating Simulated
Storyworlds*, 2018) and *Bad News*; the Prom Week FDG 2011 paper and the Ensemble engine
source; Kreminski's storylets design-space survey (ICIDS 2018); Eve's adv3Lite second
design; Paradise (FDG 2024) and Drama Llama (2025) as the LLM-era counter-argument;
Evans & Short's IEEE Versu paper (paywalled — represented only through Short's blog).

---

## Part I — The systems

Each entry: mechanism in brief, then what it teaches for Sharpee. Systems covered by both
passes carry both perspectives merged.

### 1. Classic ASK/TELL (Infocom era → I6/I7 default)

Keyword match against a per-NPC response table; stateless; one response per topic;
NPCs purely reactive. Weaknesses define the field's problem list: guess-the-noun,
no flow or memory, no tone, no repetition handling, zero NPC agency, no knowledge model.
**Teaches**: this is Sharpee's inherited interface baseline (ADR-239 topic tables are its
structured descendant); every richer system below is an answer to one of its named holes.

### 2. Eric Eve's I7 Conversation Package

Layered extensions: greeting/goodbye protocols, default-response hierarchies, **convnodes**
(points in conversation where specific responses open), topic suggestion lists, an
Epistemology extension for PC knowledge. **Teaches**: layering lets authors buy complexity
incrementally; convnodes solve "the NPC just asked a question"; suggestions soften
guess-the-noun without killing free exploration.

### 3. Short/Conley Threaded Conversation (I7)

The **quip** — one exchange, player line + NPC response — classified by function
(questioning/informative/performative), repeatability, initiator, formatting. Two
relations structure flow: **directly-follows** (tight sequencing) and
**indirectly-follows** (loose prerequisite), with transitive closure — a graph, not a
tree. Availability rulebook gates each quip (scene, character, one-time, prerequisites,
custom rules). Memory: recollection relation over spoken quips, three cached context quips
(current/previous/grandparent), fact-awareness separate from expression. NPC-directed
quips queue with precedence levels — NPCs pursue conversational goals. Subject-change
detection purges queued optional responses so the NPC visibly notices topic shifts.
Scales to Alabaster (400+ quips, 18 endings) but demands a companion authoring tool.
**Teaches**: the richest shipped model of threading + conversational memory + NPC agenda
in parser IF; also the canonical warning about authoring complexity — the quip graph is
hard to visualize and debug without tooling. (Terminology: the field's **quip** is Chord's
`phrase`; recorded as a synonym in ADR-310's D11a normalization.)

### 4. Short's Glass (waypoint conversation)

Topics as nodes in a navigable network; text lives on the **transitions**, not the nodes;
the NPC pathfinds toward a goal topic while the player steers away. **Teaches**: the best
contextual flow of Short's systems and trivially easy NPC steering AI, at the cost of
rigid topology and poor scaling — a model for *scenes* of contested conversation, not a
general system.

### 5. Menu/choice systems and Ingold's critique (Heaven's Vault)

Static menus produce the lawnmower effect. Ingold's fixes: filtered menus (~3 visible
options, critical topics first), knowledge-windowed questions (available only after you
learn enough to ask and before the answer is obsolete; answered once, gone for all NPCs),
time-boxed conversations (NPCs leave, get irritated), NPC counter-topics after answering,
conversation-as-improv ("keep the Frisbee in the air"). Heaven's Vault's **relevance
engine**: each line carries requirements plus redundancy checks ("all requirements are
required; a single redundancy is enough to fail"), recently-set knowledge states surface
as what characters want to discuss, randomness as fallback. **Teaches**: the strongest
model anywhere for *conversation memory with narrative relevance* — recency-driven topic
salience is exactly the bridge between a fact ledger and dialogue that feels alive.

### 6. TADS 3 (Roberts; Eve's docs)

The most complete built-in parser-IF conversation system. Actor / ActorState
(conversation-ready vs. in-conversation, attention span, greeting/farewell protocols) /
TopicEntry hierarchy (per-verb types, defaults scoring lowest, suggested variants,
AltTopic sequenced variations, event-list response variation). Score-based topic matching
over objects/topics/regex. **ConvNode**: one active node per actor, entered by tags in
response text, and — the rule pass 1 flagged as load-bearing — **an active node overrides
all other responses regardless of score, and suppresses NPC agendas outright**. Knowledge:
PC `knowsAbout` gates askability; NPC knowledge is deliberately *not* a separate model
(implicit in `isActive`); `<.reveal>` flags for lightweight fact tracking. NPC agency:
continuation messages, `initiateConversation`, ConvAgendaItem (fires only when the NPC
hasn't conversed this turn). **Teaches**: (a) PC knowledge and NPC willingness are
deliberately separate axes — concealment is first-class; (b) innermost-context-wins-by-
total-override, chosen over score blending after building both — already adopted into
ADR-310 D16; (c) the full lifecycle vocabulary (ready/engaged, attention span, implicit
greetings) that Sharpee currently lacks a stance on.

### 7. Ink (Inkle)

Knots/stitches/choices/diverts/gathers; the weave guarantees reconvergence (no loose
ends); visit counts + variables + lists as state; tunnels and threads for modular and
parallel conversation structure; sequence/shuffle/cycle variation. Not a conversation
*system* — a flow language conversation is built in. **Teaches**: threading and
interruption as pure control flow (diverts vs. gathers) — the cheapest possible model of
"conversation shape"; also the counter-lesson that without a knowledge model everything
becomes hand-managed variables (state explosion). Heaven's Vault's engine (entry 5) is
what it takes to make Ink conversation *smart* — a custom layer.

### 8. Dialog (Åkesson)

Prolog-like DSL; standard library ships an "empty framework" — TALK TO scaffolding, no
conversation model. Lewis Ship's community port of Threaded Conversation proves the
substrate is expressive enough. **Teaches**: a minimal-core-plus-library philosophy
Sharpee already follows; nothing to adopt beyond the confirmation.

### 9. Galatea (Short, 2000)

ASK/TELL pushed to its limit by authoring: hundreds of responses, ~70 endings, **two
orthogonal emotional axes** (sympathy; tension/attitude) yielding eight mood zones that
gate topics, select response variants, and color interstitial gesture text.
Second-ask detection, conceptual-distance tracking for abrupt subject changes,
mood-dependent gesture interpolation into otherwise-identical lines. Contradictory
origin stories depending on mood — hand-authored unreliable narration the player must
triangulate. Short's own verdict: shaggy, unmaintainable, doesn't generalize, and the
character is mostly reactive despite the illusion. **Teaches**: mood-shaped *variation
within a topic* is the single highest-value effect per unit of player experience — and
Galatea proves it by brute force, which is exactly what a platform should replace with
mechanism. This is the closest existing model for what the ADR-310/318 interior should
*do* to dialogue.

### 10. Façade (Mateas & Stern, 2005)

Four subsystems: (a) broad-and-shallow NLU mapping free text into ~30 parameterized
**discourse acts** (agree, flirt, praise, topic_reference…), contextualized per beat;
(b) drama manager sequencing ~27 **beats** (~2,500 Joint Dialogue Behaviors) against an
Aristotelian tension arc — beats are interruptible, with transition-in/body/wait/
transition-out goals, mix-ins for player reactions, and gist points as commitment
markers; (c) ABL, a reactive planning language with joint goals for two-character
coordinated performance; (d) parallel **social games** (zero-sum affinity, hot-button
topic tiers, therapy counters) that dialogue reads and writes. **Teaches**: (a) discourse
acts are the missing abstraction between a parser and a topic table — classify the
*move*, not just the topic; (b) dramatic structure and conversation can be separate
systems that compose; (c) the authoring cost of the full apparatus (~2,500 JDBs for
twenty minutes) is the field's hardest cautionary number. Its social games are the
same shape as ADR-318's pressure/band machinery — continuous state that dialogue
moves — which Sharpee got for a fraction of the cost by making it authored rather
than simulated.

### 11. Versu (Evans, Short, Nelson; 2012–14)

Conversation as one of several **concurrent social practices**, each assigning roles and
affordances; norms (respond when addressed, stay on topic) are soft — violations are
*noticed and evaluated* by other characters, not blocked. Turn-taking after Sacks:
selected speaker, salient topic set, expected speech act. Characters are autonomous
utility planners — dialogue is ordinary action selection, not a special case. Quips carry
factual + evaluative + emotive content, prerequisites, and may be speakable **only if the
speaker believes the fact conveyed**. Persistent evaluations-with-reasons transfer by
gossip. Short's stated limit: no theory of mind — characters don't model each other's
knowledge; information moves only through explicit conversation. **Teaches**: (a) the
belief-gates-speech rule is the cleanest bridge between a belief model and dialogue —
Sharpee's D14 belief values + the lie ledger already implement its two halves; (b) the
noticed-violation pattern is D12-compliant legibility (behavior, not readout); (c) the
one-level-of-belief scope line is the affordability boundary ADR-310 adopted; (d) multi-
party turn-taking has a worked theory to borrow. The nearest prior art to the whole
Sharpee character program — and it died of unavailability, not capability.

### 12. Storytron/Erasmatron (Crawford)

Verb-centric: every interaction is a verb with word sockets; personality as unlimited
author-defined axes; reaction roles scored by a visual scripting language (Sappho);
information propagation with secrets, spying, and deception as core mechanics. Never
shipped a compelling work; Crawford's own verdict was that it was too complicated for
its audience. **Teaches**: information asymmetry and deception as *core loop* has real
precedent; and the ceiling warning — generality without an opinionated authoring story
kills adoption.

### 13. Spirit AI Character Engine (Short, Reed, et al.)

Commercial SDK: multi-channel NLU (entities, tone, politeness, question type), per-
character dynamic knowledge models, personality parameters shaping content and delivery,
**tagged thought chains** (End Thought → contextually relevant New Thought) with layered
fallbacks of decreasing specificity, per-word output metadata driving performance.
**Teaches**: the fallback-ladder shape (specific semantic match → category → emotional-
state default → generic redirect) is the production answer to "the player said something
the author didn't write for" — Sharpee's default-response story is currently thinner
than this.

### 14. LLM approaches (AI Dungeon lineage)

Generated rather than authored dialogue; persona via prompts; memory via context window
plus retrieval; unlimited freedom. Systemic failures for our purposes: hallucination,
no reliable knowledge asymmetry (a character told not to know X references X), no
reproducibility (no pinned-seed testing), no authorial voice, no reliable gating of
state change. **Teaches**: the counter-argument to heavy authored machinery will keep
coming from here; pass 2's Paradise/Drama Llama reading is where that argument gets its
fair hearing. Sharpee's determinism-first testing discipline is a deliberate rejection
of this trade.

### 15. Talk of the Town (Ryan & Mateas) — pass 1 depth

Character knowledge as mental models per known entity, each a list of **belief facets**
keyed (owner, subject, facet) carrying value, predecessor, parents, evidence list,
strength, accuracy. Evidence typology: reflection, observation, transference,
confabulation, lying, implantation; reinforcement by retelling (repeat a lie often
enough and you believe it); deterioration by mutation along authored graphs; termination
by forgetting. Salience (per-attribute × per-relationship) governs observation,
forgetting, and topic choice. Propagation is agent-driven top-*n* exchange during
interactions. Belief revision by strength comparison with candidate beliefs —
oscillation intended. Scale: 300–500 residents, ~1000 facets each, ~1 min/timestep,
self-described as computationally inefficient and viable only off-turn. Field lesson
from 100+ *Bad News* performances: the one hand-tuned knob was a mutation rate.
**Teaches**: (owner, subject, facet)+value addressing — already adopted as ADR-310 D14;
the durable-fact escape hatch (already in D6); and the performance shape: schedule
propagation between turns, fear the per-turn loop.

### 16. Comme il Faut / Prom Week (McCoy et al.) — pass 1 depth

Social interaction as **social games**: dramaturgical preconditions (roles, setting,
audience conditions), event dependency graphs with branch points, fact- and relation-
preconditions. Character state: sixteen-need intensities, traits, per-game tendencies,
goals. The four-stage pipeline pass 1 flagged: goal selection (goal, volition) → intent
formation (score every role in every game) → **role negotiation** (the other party
competitively scores their own participation) → performance realization (kept separate;
debug build renders plain text). **Teaches**: what ADR-318's arbitration deliberately
collapsed (D9's boolean resist vs. CiF's negotiated, graded participation — recorded in
ADR-310 as a deliberate simplification with a named cost); subject/relation/object
triples with wildcards as the NPC-to-NPC disposition addressing scheme; and audience
preconditions — conversation shaped by *who is watching* — which Sharpee's witnessing
machinery is already positioned to feed. Ensemble (its authorable successor) is pass 2
debt.

### 17. Single-work lessons (survey §12)

- **Alabaster** — Threaded Conversation at scale; semi-random clause assembly varies
  cadence on repeats.
- **Spider and Web** — inverted interrogation: the NPC asks, the player's yes/no and
  actions reveal or conceal. Conversation as player-confession.
- **Varicella** — a chosen *tone* (hostile/cordial/servile) as a second input dimension
  modifying every response.
- **Photopia** — scripted scenes; sometimes the right conversation system is none.
- **Best of Three** — a real inference engine that players read as a script because the
  reasoning was invisible. The documented cost of illegible internal state (drove
  ADR-310's D12 amendment: platform announcement forbidden, authored legibility
  required).
- **City of Secrets** — "everything reasonable" implemented without deciding the player's
  task; Short's harshest self-verdict. The guard is specifying the player task first
  (why thealderman preceded the conversation ADR).

---

## Part II — Cross-cutting maps

### Knowledge-representation ladder (survey §13c, confirmed by pass 1)

None → flags → recollection (ordered history) → facts (queryable) → beliefs (per-
character, possibly wrong) → theory of mind. Most systems live at flags; Versu/Storytron
reached beliefs; nothing shipped theory of mind and Versu argues against wanting it.
**Sharpee today**: beliefs with values, sources, and confidence words (ADR-310 D14) —
level 4 — with the theory-of-mind exclusion adopted as a decision, not an omission.

### NPC agency ladder (survey §13e)

Passive → hinting (suggestions) → continuing (speaks into silence) → initiating →
goal-directed (pursues conversational objectives) → autonomous (dialogue is ordinary
planned action). TADS 3 ships 1–3; Threaded Conversation and Glass reach 4; Versu/Façade
sit at 5. **Sharpee today**: the interior model (goals, influence) is built for 4–5, but
the *conversational* surface sits at 0–1 — topic dispatch answers when asked. This gap is
the ADR-320 subject.

### Input models

Parser keyword (ASK/TELL family), parser + suggestions (TADS 3), choice (Ink/menus),
filtered dynamic choice (Heaven's Vault), free text via discourse acts (Façade),
affordance choice under social norms (Versu), free text NLU hybrid (Spirit AI), free
text generative (LLM). **Sharpee today**: parser keyword over topic tables; ADR-133/
Reflections' chat UI implies choice/hybrid surfaces are coming regardless of this ADR.

### The survey's "identified gaps" (April 2026), re-graded after ADR-310/318 (August 2026)

| Survey gap | Status now |
| --- | --- |
| Per-character knowledge with reliable enforcement | **Largely closed by Sharpee**: D14 valued beliefs per character, deterministic, testable. The survey's observation that only dead systems attempted this no longer holds. |
| Conversation as strategic information exchange | **Half closed**: the lie ledger, pins, reveal arbitration, and confided gates ship the *NPC's* strategic side. The *player's* strategic surface (evasion, trust trade-offs à la Short's CRPG model) is open — ADR-320 territory. |
| Hybrid parser + choice with NPC agency | **Open**: no movement; Reflections will force the question. |
| Mood/emotion as first-class conversation state | **Half closed**: mood/temperament/pressure are first-class and persistent — but they *gate* rather than *shape*; Galatea-style variation-within-a-topic has no mechanism. Core ADR-320 territory. |
| Scalable unreliable narration | **Largely closed by Sharpee**: the lie ledger mints/pins/maintains falsehoods trackably — the survey's "no system provides tools for authoring NPCs who lie in trackable ways" is no longer true. What remains is *surfacing* it (mood-colored delivery of a maintained lie). |
| Conversation memory with narrative relevance | **Open, and the biggest prize**: Heaven's Vault's relevance engine (recency-driven salience) has no Sharpee counterpart. The ledger records *what* is known with *when* (turn stamps) — the raw material exists; nothing consumes recency. |

---

## Part III — What this merge says ADR-320 is about

The interior model and its gating are shipped and, per Part II, ahead of most of the
field. The merge locates the unshipped value in five places, in rough order of
precedent strength:

1. **Shaping, not gating** — mood/temperament/band selecting *how* a matched topic is
   voiced (Galatea's proven effect; Spirit AI's delivery parameters; Chord's phrasebook
   specificity is the natural attachment point).
2. **Conversational memory and relevance** — recency-weighted salience over the existing
   ledger (Heaven's Vault; ToTT salience; Threaded Conversation's recollection).
3. **NPC conversational agency** — initiative, continuation, steering, exit; the agenda
   patterns (TADS 3 ConvAgendaItem, Threaded Conversation queues, Glass goal-pathing)
   sitting on Sharpee's already-shipped goal pursuit, under D16's suspension rule.
4. **Lifecycle and flow** — greeting/farewell, attention, threading (directly/indirectly-
   follows), subject-change noticing; the field's most commoditized layer, absent in
   Sharpee.
5. **Multi-party** — turn-taking norms (Versu/Sacks), audience preconditions (CiF),
   witnessing (already shipped) — with Reflections as the forcing story.

Pass 2's unread sources bear mostly on 2 (storylets/salience) and on the standing
question of whether authored machinery is worth it at all (LLM-era counter-argument).
