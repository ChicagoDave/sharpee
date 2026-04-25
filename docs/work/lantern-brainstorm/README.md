# Forge: LLM-Assisted IF Authoring Tool

Running notes and research for a future LLM-powered authoring layer on top of Sharpee.

## Vision

An authoring tool that lets writers create interactive fiction by *writing*, with an LLM handling the structural/mechanical translation into Sharpee's engine. The author thinks in prose and story; Forge thinks in entities, traits, actions, and grammar.

## Target Persona

**The writer with game aspirations.** Not a programmer learning to write — a writer who wants interactive storytelling without becoming a cartographer and physicist first.

Based on Jeff Nyman's working sessions with published novelists, screenwriters, and a well-known director (J.J. Abrams and his "Mystery Box" philosophy), the persona has these characteristics:

- **Chases emotional beats**, not containment logic. They follow "the heat of a scene" — dialogue, tension, the way a character's realization mirrors dimming light. Not whether a brass lantern is a member of the class of portable objects.
- **Works trunk-first, branches-later.** The natural flow of storytelling is a straight line that only sprouts branches once the trunk is strong enough to support them. Forcing branching conditions at the same time as finding a character's voice splits the brain between creative and systemic.
- **Resists "building the house before describing the conversation."** Current IF systems require the world to be compiled into existence before narrative can inhabit it — plumbing before kitchen dialogue. Writers want to capture scenes first, then care about locked doors and silver keys later.
- **Values the power of the unknown.** The Mystery Box approach relies on the evocative nature of the unseen, but IF dev environments require every box to be explicitly defined, coded, and bounded from line one. "Like painting a masterpiece while explaining the chemical composition of the pigment."
- **Found traditional IF tools to be a cage, not a medium.** The rigid, object-oriented and rule-oriented nature of Inform/TADS felt fundamentally hostile to the fluidity of prose and screen.

### What This Means for Forge

The tool must let writers:
1. Start with a scene — dialogue, atmosphere, emotional arc
2. Discover interactivity organically as the narrative takes shape
3. Never encounter "compile your world before you can write" friction
4. Express game mechanics in story terms, not system terms
5. Maintain mystery and ambiguity during drafting — not everything defined upfront

---

## Research Notes

### 2026-03-14: intfiction.org Thread — "Why is writing IF still drawing diagrams instead of writing?"

**Source**: https://intfiction.org/t/why-is-writing-interactive-fiction-still-drawing-diagrams-instead-of-writing/

**Thread summary**: Debate over whether IF tools should prioritize text-based prose writing over visual node/diagram approaches, and whether structural logic should be separated from narrative composition.

**Key voices**:
- **oldskultxo** (OP): Proposes separating behavioral logic from narrative text. Their tool (iepub) supports scene variants, narrative conditions, stat checks, reader behavioral metrics.
- **zarf**: Historical context — Twine succeeded because some users loved the visual-node metaphor, but it's not universal.
- **JoshGrams**: Most widely-used IF tools are already text-based (Ink, ChoiceScript, Inform, TADS, Dialog, Dendry). Prefers clear distinction between code and prose over natural-language-looking code.
- **Giger_Kitty**: Warns that separating logic from prose creates "oil and water" integration problems. Logic *enhances* narrative — writers too distant from it miss opportunities.
- **J_J_Guest**: Twine's node graph becomes unwieldy at scale. IF writing uses "both sides of the brain" — the tool shouldn't eliminate the logic side but should make it feel like writing.
- **Encorm**: Complex dialogue (9+ conditional chunks, multiple outcomes) is where all approaches struggle. Asks how a prose-centric tool would handle that tracking.
- **Jeff Nyman**: Ran working sessions with published novelists, screenwriters, and a well-known director (J.J. Abrams) using Inform 6/7 and TADS 3. Key findings:
  - Writers "follow the heat of a scene" — capture dialogue and tension first, care about locked doors later
  - Current IF systems demand "a writer also be a cartographer and a physicist before they are allowed to be a storyteller"
  - The world must be "compiled into existence before the narrative can inhabit it" — like building the house, plumbing and all, before describing the conversation in the kitchen
  - Forcing branching at the same time as finding character voice creates "fundamental cognitive dissonance"
  - Abrams' "Mystery Box" approach relies on the power of the unknown, but IF tools require every box explicitly defined from line one — "like painting a masterpiece while explaining the chemical composition of the pigment"
  - General consensus: traditional IF tools felt "less like a medium and more like a cage"

**Concepts for Forge**:

1. **Prose-first authoring with deferred structure** — Let authors write narrative first. The LLM infers branching structure from prose rather than requiring authors to build it upfront.

2. **Avoid the separation trap** — Don't create two disconnected layers (prose vs logic). Blend them — let the author write naturally while the LLM surfaces structural implications inline. Giger_Kitty and J_J_Guest both warn that separation creates context-switching overhead.

3. **Conversational story graph** — Node graphs break down at scale. Text breaks down without structure. An LLM can maintain a semantic model of the story graph and let authors query it conversationally ("what happens if the player never picks up the lantern?") instead of navigating visually.

4. **Combinatorial complexity management** — Complex dialogue with many conditional paths is where all tools struggle (Encorm's "nine different conversation chunks" problem). An LLM could generate/validate branches, check for unreachable states, and flag contradictions.

5. **Both-sides-of-brain authoring** — The tool shouldn't eliminate the logic/systems side but should make it *feel like writing* rather than programming. The skill of IF authoring is in both halves.

6. **Sharpee's architecture as foundation** — Language layer separation (semantic events, not hardcoded strings), capability dispatch, and the trait/behavior system already model the clean separation the OP wants — but at the engine level. Forge exposes that to non-programmer authors through natural language.

**Open questions raised by the thread**:
- Does separating prose from logic actually reduce friction, or just shift it?
- Can a prose-centric tool manage complex conditional dialogue effectively?
- Do narrative-focused vs systems-focused authors need fundamentally different tools, or one tool with different modes?

### 2026-03-14: intfiction.org Thread — "Story Development with Claude: A Methodology for Authored IF"

**Source**: https://intfiction.org/t/story-development-with-claude-a-methodology-for-authored-interactive-fiction/79033

DavidC's (your) methodology for using Claude with Sharpee, and the community reaction.

**Core methodology**:
- No generated prose — all player-facing text is the author's responsibility
- AI restricted to code structure, state management, engine integration
- Spec documents serve as the creative-technical boundary
- Workflow: story definition → scene decomposition → detailed specs → implementation plan → code execution → gap identification

**Community pushback (important for Forge design)**:
- **Draconis**: Questions whether detailed specs save time vs just coding directly
- **Dannii**: Disputes ethical distinction between AI prose and AI code — "GenAI plagiarises code just as much as prose"
- **jwalrus**: Skeptical about net productivity — spec effort may equal coding effort. Questions measurability.
- **andrewj**: Suggests this approach primarily benefits non-programmers who can't validate generated code

**Insight for Forge**: The current methodology works for a programmer-author (you) who can review generated code. For the Nyman persona (writer, not coder), the spec-to-code pipeline is invisible — they never see or validate the code. Forge must either make the generated code trustworthy enough to skip review, or surface verification in story terms ("play this scene and see if it works").

### 2026-03-14: StoryMate — No-Code IF Tool with AI Assistant

**Source**: https://intfiction.org/t/storymate-a-new-no-code-interactive-fiction-tool-with-ai-assistant/67079

A visual passage editor with AI-assisted story generation targeting "hobbyists, teachers, and tinkerers."

**What it does right**: Rapid iteration (tiny game in minutes), AI helps with creative blocks, low learning curve.

**What it lacks for Forge's vision**: Still fundamentally a passage/node editor. AI assists within the existing paradigm rather than replacing it. No world model — just linked text passages. Limited mechanical depth.

**Lesson**: Speed-to-playable matters enormously for writer engagement. If it takes more than minutes to see a scene come alive, writers disengage.

### 2026-03-14: intfiction.org Thread — "Tools for writing and narrative design"

**Source**: https://intfiction.org/t/tools-for-writing-and-narrative-design/69196

**Key finding**: No single tool combines pre-writing/planning with implementation. Authors use separate tools for brainstorming (Miro, sticky notes, Obsidian, Scrivener) then switch to IF systems for implementation. This context switch is itself a barrier.

**Lesson for Forge**: The tool should span the full arc from brainstorming through playable scene, without requiring a tool switch.

### 2026-03-14: Competitive Landscape (LLM + IF)

Other LLM-IF projects identified on intfiction.org:
- **LampGPT**: LLM-enhanced IF *play* experiences (not authoring)
- **Evennia**: MUD/text-game framework with LLM integration for in-game text generation
- **"Why can't the parser just be an LLM?"**: Thread exploring LLM as parser replacement (player-facing, not author-facing)
- **StoryMate**: No-code visual editor with AI creative assistant (see above)

**Gap**: Nobody is building what Forge would be — an LLM that translates writer-voice scene descriptions into a full world-model-backed IF engine. The existing projects either use LLMs for play-time generation (no authored craft) or bolt AI onto existing paradigms (still node editors).

---

## Emerging Design Principles

Based on research so far:

1. **Scene-first, world-later.** The author writes a scene as prose. Forge extracts rooms, objects, characters, and connections. The author refines by writing more scenes, not by editing a world model.

2. **Verification through play, not code review.** The writer never sees TypeScript. They verify by playing the scene. Forge surfaces problems as narrative questions: "The player can take the lantern here, but you haven't described what happens in the dark passage without it. Want to write that scene?"

3. **Progressive disclosure of mechanics.** Start with pure narrative. As the story develops, Forge gently introduces mechanical concepts in story terms: "This feels like a puzzle — the player needs the key before they can enter the tower. Should I set that up?" Not: "Should I add a LockableTrait to the door entity?"

4. **Speed-to-playable under 60 seconds.** From writing a scene description to playing it in the engine. StoryMate proved this matters. Sharpee's architecture (hot-reload, fast builds) supports this.

5. **Brainstorm-to-playable without tool switching.** The same environment handles "what if there's a troll guarding the bridge?" (brainstorming) and "try crossing the bridge" (play testing).

6. **Mystery Box compatible.** Authors can leave things undefined. Forge doesn't demand every entity be fully specified. Partial worlds are playable — unknown areas can be sketched, named, left as stubs.

7. **Silent observation, seam-based inference.** Forge does not interrupt the writer. The LLM watches the writing in progress and stays quiet. Only when the writer reaches a natural seam — a scene lands, a description completes, a dialogue exchange wraps up — does Forge act. At that point it infers what the writer produced (room? character? puzzle? atmosphere?) and either silently incorporates it or asks a minimal clarifying question. The input format is whatever the writer is naturally doing; Forge's job is to recognize it, not prescribe it.

8. **Prose is the source of truth.** The writer's text is the canonical representation. World model, generated code, game state — all derived. Forge records everything and versions passively. The writer never manages versions, never sees generated code, never thinks about persistence. If they revise prose, the game changes.

---

## Open Questions

- ~~**Input format**~~: RESOLVED — see Design Principle 7 below.
- ~~**Input format**~~: RESOLVED — see Design Principle 7.
- ~~**Iteration model**~~: RESOLVED — The writer writes. That's the iteration model. Revising prose revises the game. Forge re-derives.
- ~~**Scope**~~: RESOLVED — Parser IF only. Sharpee is a parser-based engine. Choice-based is out of scope.
- ~~**Collaboration**~~: RESOLVED — Solo author + LLM for v1. Multi-author is a v2+ problem at best.
- **Trust boundary**: R&D — won't know until we prototype. Play-testing is the obvious first answer; automated verification is aspirational.

---

## 2026-03-14: UI Mockup

`mockup.html` — Interactive HTML prototype demonstrating the core interaction model.

**Layout**: Three-panel — scene list (left), writing surface (center), Forge inference panel (right).

**Demonstrates**:
- Writer writes pure prose, no markup, no code, no special syntax
- Forge watches silently, then surfaces inferences as cards at scene seams
- Inferences use story language ("portable", "central puzzle?"), never engine terms ("PortableTrait")
- Only one question asked after all observations — minimal interruption
- Play button launches a live parser session from the scene prose
- Playing into undefined areas ("go north") prompts the writer to write the next scene
- Passive versioning and word count in the status bar — writer never manages versions

**Validated**: Design direction confirmed. The eight principles hold up in a concrete UI.
- ~~**Persistence / Source of truth**~~: RESOLVED — The prose is the source of truth. Everything else (world model, code, game state) is derived. Forge records everything and versions passively where possible. The writer never manages versions explicitly.
