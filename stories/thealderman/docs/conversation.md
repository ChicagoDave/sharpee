# Sharpee — Design Notes

*Working session: The Alderman's deduction UI, the epistemic action vocabulary, and the Sharpee IDE ADR.*

---

## Part I — The Alderman

### What it is

A murder mystery interactive fiction story set in an 1870s post-Great-Fire Chicago hotel, designed as a reference implementation for Sharpee's NPC behavior chain (Conversation, Information Propagation, Goal Pursuit, Influence). 95% of content — relationships, secrets, alibis, NPC routines — is fixed. 5% is randomized per playthrough: the killer, the weapon, the location, and the alibi hole that distinguishes the real solution from the noise.

The 95/5 split is the strongest design decision in the GDD. Most procedural mysteries fail because they procedurally generate *characters*, which makes everyone hollow. Generating constraints over a hand-authored cast is how Clue works and how this should work.

### The deduction surface

The original instinct was to give the player a logic-puzzle diagram — a UI that ticks off facts as they're learned. That instinct is right, because dialogue-heavy games suffer from the player not knowing what they *know*. A visible epistemic state turns "fumbling through topics" into "working a case."

After working through it, the surface settled on:

**Meta UI, not diegetic.** A 1870s notebook is thematically appealing but the meta version buys you contradiction edges, confidence states, and animated transitions that wouldn't fit in-fiction. The meta surface is honest about what it is.

**Auto-populated evidence pile, player-curated case board.** Two zones:

- **Evidence pile (auto, platform-owned):** every claim, observation, and inference the PC has encountered. Source-attributed, turn-stamped, never editable. The platform owns this because the platform knows what events fired.
- **Case board (player-curated):** the three-column suspect/weapon/location grid (Clue-shaped), with eliminations, suspicions, and *structured assertions* the player has pinned. The player drags facts from the pile onto the board. Misreading is now a real mistake; the platform won't correct it.

This split matters: the platform writes raw facts, the player writes interpretations. The act of detection is the act of building the case.

**Architectural framing.** The Diagram Service is a peer to the Text Service. Both subscribe to the same Domain Event stream. Text Service renders prose; Diagram Service maintains a structured KnowledgeGraph and emits diff events to the client. *One event stream, two surfaces.* This is the architectural story worth telling about the platform.

Three event types feed the graph:

- `ClaimMade` — an NPC asserted something (with source, topic, content)
- `EvidenceFound` — the player observed a physical thing
- `ContradictionDetected` — derived event the Diagram Service emits when two facts in the graph can't both be true

The third is the interesting one — it's the Diagram Service doing inference, not just bookkeeping.

**Important constraint: the diagram should not auto-solve.** Showing supported assertions is fine; declaring "the killer is X" because enough evidence accumulated would defeat the puzzle. Even when the case looks complete, the player must commit via ACCUSE.

### Three layers of motive vs. evidence

The hidden relationships layer (Viola = half-sister, Chelsea = possible daughter, Barber = enforcer, etc.) is fixed every playthrough and is *motive scaffolding*, not solution evidence. If it shares a surface with alibi holes, players will mistake "has a motive" for "did it" — and since *everyone* has motive, that's a dead end.

Two views, toggleable:
- **Deduction grid** — the three columns, focused on the randomized facts.
- **Relationship web** — the motive layer, who knew what about whom.

They cross-reference but should not merge.

---

## Part II — The Parser as a Deduction Surface

### Epistemic verbs

If the diagram is auto-populated for raw evidence but player-curated for interpretation, then the *parser itself* becomes part of the deduction surface. The player doesn't just ACCUSE at the end; they make smaller claims throughout, each as a parser action that the world model validates.

This is a meaningful extension of the parser-IF tradition. Parser games have always been about *expressing intent through verbs*. Sharpee can extend that vocabulary from physical actions (TAKE, OPEN) to epistemic ones (IDENTIFY, CONNECT, SUSPECT). That's a genuinely novel platform demonstration.

A starting vocabulary:

- **IDENTIFY GAP IN [suspect]'S ALIBI** — asserts a contradiction exists
- **CONNECT [fact] TO [suspect/weapon/location]** — places evidence on the board
- **CONTRADICT [claim] WITH [claim]** — pins two facts as incompatible
- **SUSPECT [suspect]** — soft accusation; flags for tracking
- **CLEAR [suspect]** — inverse, mark as eliminated
- **REVIEW** — show current board state
- **ACCUSE [suspect] WITH [weapon] IN [location]** — final commit

Each verb emits a domain event the Diagram Service consumes.

### Validation

When the player types IDENTIFY GAP IN CATHERINE'S ALIBI, the engine checks: do you have the supporting facts in your evidence pile?

The most game-like response is **hybrid**: the action lands as a hypothesis, but the parser flags whether it has support. *"You suspect there's a gap, but you haven't pinned down what it is yet."* The player can form a hunch and then go looking — which is what detection actually feels like.

### Normalizing complex questions

The hard question: how do you handle natural-language phrasings like IS IT POSSIBLE CATHERINE IS LYING? You can't enumerate verbs for that space.

The answer is to **make epistemic states first-class nouns** the parser can grab. Truthfulness, alibi, motive, knowledge-of, relationship-to — these become referenceable properties on actors and evidence. The natural-language modal mood (IS IT POSSIBLE, COULD, MIGHT) is parser sugar that strips away.

A small canonical verb family handles the queries:

- **CHECK [thing]** — current state
- **COMPARE [thing] WITH [thing]** — relational
- **TRACE [claim]** — provenance

Then a grammar-rewrite layer maps surface phrasings to canonical form:

- IS IT POSSIBLE X IS LYING → CHECK X'S TRUTHFULNESS
- COULD X BE LYING → CHECK X'S TRUTHFULNESS
- WAS X REALLY AT Y → CHECK X'S ALIBI
- DOES X'S STORY HOLD UP → CHECK X'S ALIBI

The player thinks they're asking a rich question. The parser thinks it's looking up a noun. Both are happy. The crucial constraint: **the noun must already exist in the world model**. The design discipline is enumerating the epistemic nouns up front. For The Alderman:

- [actor]'s truthfulness
- [actor]'s alibi
- [actor]'s motive
- [actor]'s relationship to [actor]
- [actor]'s knowledge of [topic]
- [evidence]'s provenance

Six noun shapes. Every natural-language epistemic question reduces to one of these. If a question doesn't reduce, the parser politely declines — and the failure mode is small and predictable.

This wants its own ADR: *Epistemic objects as first-class world-model entities, queryable through a small canonical verb set, with a grammar-rewrite layer for surface flexibility.*

---

## Part III — Internal vs. External Actions

A late and important distinction: **are the player's statements out loud, or internal thoughts?**

This is not just a UI question. It's a world-model question, because if a statement is out loud, NPCs can hear it, and Information Propagation (ADR-144) means it spreads.

### The split

**Internal — silent reasoning.** CHECK CATHERINE'S TRUTHFULNESS. IDENTIFY GAP. CONTRADICT. SUSPECT. These mutate the player's board state but emit no event into the social world. The PC stares at his notebook, makes a note, moves on.

**External — speech acts.** ACCUSE. CONFRONT VIOLA WITH THE PROGRAM. ASK CATHERINE ABOUT HER GAP. These emit a `StatementMade` event with speaker, audience (whoever's in the room), and content. Information Propagation picks it up. NPCs *react*: the addressee defends or breaks; bystanders gossip; trust scores shift; goal pursuit reroutes.

This is the move that makes The Alderman *not* a logic puzzle. It makes it a *social* logic puzzle — the player has to decide not just what they think but what they're willing to say, and to whom, and in front of whom. That's the real ward-office texture.

### Mapping verbs to the axis

- **Internal only:** IDENTIFY GAP, CONTRADICT, SUSPECT, CLEAR, CHECK, CONSIDER, WONDER
- **External only:** ACCUSE, CONFRONT, REVEAL, ASK, TELL, SHOW
- **Modal phrasings (IS IT POSSIBLE / COULD / WHAT IF)** default to internal CHECK. To go external, you need an explicit addressee: ASK CATHERINE IF SHE IS LYING.

Internal and external assertions should look different on the board. Internal: pencil. External: ink. Externalized claims annotate themselves with who heard, because that matters later.

### The cost-of-speaking

Internal claims have no social cost ever. External claims always do, even when correct. Accusing Ross in the bar — even rightly — means Catherine and Chelsea heard you, and the social state of the hotel has shifted. There's no cost-free way to *act on* a deduction; you have to externalize, and externalizing is irreversible.

This gives a beautiful late-game mechanic: ACCUSE doesn't have to happen in private. Where and in front of whom matters. Accuse Jack in his room: he denies, no witnesses, you've burned a chance. Accuse Jack in the foyer with Catherine and Chelsea present: Catherine sees, and her behavior toward him changes for the rest of the game. The third attempt becomes a stage.

### Architecture

- Every player input parses to either an *internal cognitive action* or an *external speech act*.
- Internal actions emit `BoardEvent`s (consumed by Diagram Service).
- External actions emit `StatementEvent`s (consumed by Conversation, Propagation, Goal, and Influence services — *and* Diagram Service, because the PC remembers what he said).
- Default modal phrasings resolve to internal. Addressees (ASK X, TELL X, ACCUSE X) resolve to external.

Worth its own ADR. *"Cognitive vs. communicative actions: the internal/external split in player input."* Foundational for any Sharpee story with rich NPCs, not just The Alderman.

---

## Part IV — The Lantern Question

Lantern (Sharpee's LLM tool layer) is *not* viable for The Alderman, and probably not for mystery games generally.

### Why mysteries are hostile to LLM mediation

The world model is the source of truth about a fixed mystery. Every fact that matters — who said what, who was where, what was missing from the knife block — is authored or randomized at world-init. An LLM speaking in-character risks:

- Inventing details that don't exist in the model
- Contradicting the randomized solution
- Leaking information the NPC shouldn't have
- Producing plausible-sounding falsehoods the player then *believes are evidence*

That last one is the killer. In a mystery, the player has to trust that what they hear is exactly what was authored. If Catherine says something fluffy and improvised, the player will write it down — and now they're reasoning over LLM hallucinations as if they were canonical clues. The whole deduction layer collapses.

LLM-mediated character platforms work because they have no underlying ground truth. In a mystery, the fiction is fixed and the player's job is to find it. Incompatible regimes.

### What stays

For The Alderman, everything is deterministic:

- Conversation: authored topic trees with state-gated responses
- Internal verbs: structured queries over the world model with templated prose responses
- External verbs: structured speech acts, NPC responses are authored topic-tree branches
- Unrecognized input: a polite parser refusal — *"You're not sure what you mean by that."* Not improvisation, not fallback.

### Where Lantern might viably live

Separately from this story, LLM use in IF probably has viable surfaces where ground truth doesn't matter:

- **Flavor text variation** — variants of authored descriptions so repeated examination doesn't repeat verbatim
- **Vocabulary expansion at parse time** — synonym normalization, no generation
- **Hint generation** — author writes the policy, LLM picks words
- **Author-side tooling** — draft topic trees, ADR diff summaries, test transcripts. Not in the runtime at all.

That last one might be the strongest case. Lantern as *author tooling* rather than runtime. Sharpee authors write canonical content; Lantern helps them write it faster and tests it. The game ships without LLM dependency. The platform is honest about what's deterministic.

For The Alderman specifically: cut Lantern from the spec, write authored "the PC isn't sure" lines for unrecognized input, move on.

---

## Part V — The Sharpee IDE (ADR-154)

### What's strong

The Story / Extension / Plugin taxonomy is the best part of the document. Distinguishing declarative content packages from imperative turn-loop participants by *interface boundary* (registration vs. `TurnPlugin`) makes every future "where does this go?" question answerable. This deserves to outlive the ADR and be elevated to platform-level documentation.

The "Story sidebar surfaces Extensions and Plugins" feature is the quietly best UX idea — making the runtime dependency graph visible at authoring time, organized by what each package contributes (verbs, traits, turn behaviors), is something mainstream IDEs don't do well. It's also a guided tour of the platform for new authors.

The exclusions list (no terminal, no git UI, no marketplace, no debugger for arbitrary code) is a strong fence. The temptation to add general-editor features because they're *technically* easy is real, and the list pushes back on it.

### Where to push

**The "writer-first" persona is doing load-bearing work.** It's defined as someone willing to type TypeScript but not willing to learn VS Code. That's narrow — the cognitive distance between those is small. Either name a real example author, or acknowledge in the ADR that the persona is a hypothesis and the IDE is a bet that they exist in sufficient numbers. Stating the wager openly is stronger than asserting the persona.

(The VS Code extension being mostly baked makes this less load-bearing. The IDE doesn't have to win every author; the extension already serves developer-first and VS-Code-comfortable authors. The IDE addresses the population the extension cannot reach. The ADR's framing should reflect that the extension *exists*, not that it's "planned.")

**Pick Tauri now.** Phase 0 defers the Electron-vs-Tauri decision. Given Zifmia is already in Tauri, picking Tauri lets the IDE share runtime-embedding, packaging, and code-signing infrastructure with Zifmia from day one. Deferring a decision that has a clear right answer for your specific situation is a small ADR smell.

**Resolve the Forge → Lantern naming.** The doc references `docs/work/forge/` as "LLM-assisted authoring." That's stale — Sharpee's LLM tool layer is Lantern. Also, "compatible with the IDE via Plugin API" is hand-waving and contradicts the "no editor-plugin marketplace" rule a few lines up.

**Add the live transcript / replay loop.** The ADR has Play (Phase 2) and Build (Phase 3) buttons but no inner-loop story for *play, observe, edit, replay-from-here*. Inform 7's Skein and Transcript views handled this and were genuinely loved. Without it, the Play button is just `node dist/cli/sharpee.js` with a wrapper.

**Name the forever-cost.** Maintaining a desktop IDE is a permanent commitment for a one-person platform team. Every macOS update, every Tauri bump becomes work that's not Sharpee work. The mitigation is sharing infrastructure with Zifmia, which should be in the ADR as an explicit mitigation, not implicit.

**Soften feature-parity, not strengthen it.** The ADR worries about parity between the extension and the IDE. That's a trap. They serve different authors and should diverge in surface deliberately. What *should* be shared is the language service (trait autocomplete, hover docs, semantic understanding) — packaged once, consumed by both. What shouldn't be shared is visual or interactional similarity. Trying to make the IDE feel like VS Code so authors can switch easily is the bad version of this.

### The mock

`mock-v1.html` matches the ADR's intentions structurally — three-panel layout, taxonomy sidebar, embedded play surface, the inline trait hint. The trait hint anchored to the `lit: true` line is the best idea in the mock — exactly the right just-in-time learning surface.

The biggest tension: **the mock looks a lot like VS Code.** Dark theme, left rail with stacked icons, file tabs, breadcrumbs, accent-blue status bar. Anyone who's seen VS Code recognizes the chassis. That works against the ADR's claim that this exists *because* VS Code is too much. To a writer-first author, it'll feel like "VS Code with things missing" rather than "a tool designed for me."

This is a fork to commit to:

- **Writer-first IDE** — references are Scrivener, Ulysses, iA Writer, Inform 7's old IDE. Lighter chrome, typographic warmth. The play surface gets more room. The TypeScript editor is honest about being code, but framed inside a writing tool.
- **VS Code for non-VS-Code people** — current mock is mostly right, ADR framing softens to match. Smaller, more defensible product.

Halfway between is the worst place to land. The decision propagates to navigation, typography, color, the tone of inline help — picking now saves rework.

Smaller mock notes:

- The breadcrumb (`src › regions › rooms › walled-garden.ts`) suggests on-disk nesting that doesn't match the flat sidebar. Decide explicitly: does the sidebar mirror the file system, or is it a logical view? Either is fine; the choice should be deliberate.
- "Story Settings" as a folder with a chevron is inconsistent — settings is a single surface, not a directory.
- The Play panel needs turn numbers for debugging "why did the NPC do that on turn 17?". Branch-from-here / snapshot navigation is later-phase but worth visually reserving space.
- The Catppuccin palette is fine but generic. Sharpee's branding should propagate to the IDE chrome once it's in hand.
- The accent-blue status bar is the most VS-Code-coded element. Tone it down.
- Consider whether the writer-first IDE has a *manuscript* or *outline* mode distinct from the code editor. If yes, hint at it in mock-v2. If no, state it as a deliberate choice — the IDE is a code editor with playtesting, not a planning tool.

---

## Open ADRs that fall out of this conversation

1. **Epistemic objects as first-class world-model entities** — the truthfulness/alibi/motive ontology, the canonical CHECK/COMPARE/TRACE verbs, and the grammar-rewrite layer that maps natural-language phrasings to them.
2. **Cognitive vs. communicative actions** — the internal/external split for player input, with separate event types and consumer services.
3. **Diagram Service as a peer surface to Text Service** — both consuming the same Domain Event stream, neither coupled to the other.
4. **Lantern's scope (or non-scope)** — explicit decision about where LLM mediation is and isn't appropriate in Sharpee runtime, with author-tooling carved out as a likely viable surface.

The first three are foundational for The Alderman. The fourth is platform-level and probably belongs higher in the priority order than its size suggests, because clarity about where Lantern doesn't go is what makes the deterministic core trustworthy.