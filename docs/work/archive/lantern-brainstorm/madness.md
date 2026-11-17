# Forge: The Case Against

A hostile reading of every design principle. If Forge can survive this, it might be real.

---

## 1. "Prose Is the Source of Truth" Is a Beautiful Lie

Prose is inherently ambiguous. World models are not.

"A heavy iron gate blocks the passage north."

Is the gate an entity or scenery? A door? Is it locked? Openable? Climbable? Can you push it? Does it have hinges? Is it rusted shut or just closed? The writer didn't say because *writers don't think like that* — that's the whole point of the persona. But a parser demands answers to every one of these questions the moment a player types OPEN GATE.

Every ambiguity is a fork:
- **Forge guesses**: The game silently behaves in ways the writer didn't intend. The writer play-tests, gets confused, can't diagnose it because they never see the code. This is worse than the cage — it's a cage you can't see the bars of.
- **Forge asks**: Interruption. Exactly the cognitive dissonance Nyman's writers reported. "Do you want the gate to be openable?" is just `OpenableTrait` wearing a trench coat.

The deeper problem: when the writer *revises* prose, Forge must re-derive the world model. But world models have dependencies. Room A connects to Room B. The key in Room C opens the chest in Room A. If the writer rewrites Room A, what survives? Do connections break? Do objects that moved during play-testing snap back? You'd need a world-model diff engine — a problem nobody has solved because nobody has been foolish enough to make prose the source of truth for a stateful system.

## 2. Seam Detection Is an Unsolved Problem

"Forge watches silently and only acts when a natural seam appears."

How? Writers don't write in clean units. They:
- Write half a paragraph, delete it, rewrite it
- Leave sentences unfinished and jump to a different scene
- Write dialogue and description interleaved
- Paste blocks from notes, rearrange, delete
- Write "TODO: describe the thing" and move on

A "natural seam" is obvious to a human reader reviewing finished text. It is not obvious to an LLM watching a real-time character stream of chaotic drafting. False positives (Forge interrupts mid-thought with "I see a room!") would be infuriating. False negatives (Forge never notices the writer finished) make the tool feel inert.

There's a reason no writing tool has shipped reliable "I can tell when you're done with a thought" detection. Because it's an AI-complete problem masquerading as a UX feature.

## 3. The Inference Problem Is Staggeringly Hard

The mockup makes it look easy. One room, a few objects, some connections. Forge reads the prose and surfaces clean cards.

Now scale it.

- **50 scenes** with cross-references. Character mentioned in Scene 3 reappears in Scene 47. Did Forge track that? Same character, or a new one with a similar name?
- **Implicit puzzles**. "The etchings become visible when the light catches the outermost ring." A human reader might catch that this is a puzzle. An LLM might not. Or worse — it might *hallucinate* a puzzle where none was intended.
- **Negative inference**. The writer describes a room with no mention of exits. Is it a dead end, or did they just not write the exits yet? Forge has to distinguish "intentionally closed" from "not yet written."
- **Evolving intent**. The writer starts the astrolabe as atmosphere. Three scenes later, they decide it's the central puzzle. All the earlier inferences are now wrong. Does Forge notice? Re-derive? Ask?

One scene is a demo. Fifty scenes is a research paper. Two hundred is a PhD thesis that might conclude "not possible."

## 4. Parser IF Has Hard Mechanical Requirements That Prose Can't Express

A locked chest needs a key. Where is the key? The writer hasn't written it yet.

A dark room needs a light source. Which one? The writer is following the heat of the scene, not doing an inventory audit.

An NPC with dialogue needs conversation topics, response conditions, state changes. "The old librarian gives you a knowing look" is evocative prose and zero actionable game state.

Parser IF is the *worst* genre for prose-first authoring because it has the most rigid mechanical requirements. Choice-based IF can get away with ambiguity — every passage is self-contained text. Parser IF cannot. The player can try *anything*. Every noun is a potential interaction target. Every verb needs a handler. Every state needs tracking.

The design principles explicitly reject choice-based as out of scope. But parser IF is the genre most hostile to the approach being proposed.

## 5. "Never See Code" Means "Never Debug"

Writer plays the scene. Types EXAMINE ASTROLABE. Gets a generic response that doesn't mention the street addresses they carefully wrote about.

Why? Because Forge inferred the astrolabe as a simple object and didn't generate a custom examine response incorporating the address detail. Or it did, but mapped it to the wrong message ID. Or the language layer has the text but the trait doesn't expose the right property.

The writer's recourse:
1. Rewrite the prose to be more explicit → They're now writing for the machine, not for the story. The cage, rebranded.
2. Tell Forge "make the addresses show up when you examine it" → This is a meta-command. Now they're programming in English. Which is what Inform 7 tried, and Nyman's writers rejected.
3. File a bug with... whom? Forge is the LLM. There's no stack trace. There's no error message. There's "it doesn't work and I don't know why."

The trust boundary isn't an R&D question. It's the entire product question. If writers can't diagnose and fix game behavior, Forge is a toy that makes impressive demos and unusable games.

## 6. Inform 7 Already Tried Natural Language and Writers Still Called It a Cage

"The brass lantern is a portable thing in the Map Room."

That's Inform 7. That's about as close to prose as a programming language gets. And Nyman's writers *still* found it hostile. Not because the syntax was hard — because the *thinking* was hard. You have to think about containment, portability, scope, lighting models.

Forge promises to eliminate the syntax. But it can't eliminate the thinking. The game still needs to know whether the lantern is portable. Whether the room is dark. Whether the chest is locked. Forge just moves the specification from explicit syntax to implicit prose + LLM inference. The cognitive load doesn't disappear — it becomes invisible, which is worse, because now the writer doesn't even know what they're failing to specify.

## 7. The Mystery Box Philosophy Is Antithetical to Parser IF

Abrams' Mystery Box: the power of the unknown, the evocative unseen.

Parser IF: the player types GO NORTH and the game must respond with *something*. Not mystery. Not ambiguity. A room description, or an error message, or a blocked-path message. Defined, bounded, explicit.

"Leave things undefined" works in film. The audience can't type EXAMINE THE MYSTERY BOX. In parser IF, they absolutely can and will. The first time a player hits an undefined edge and gets a generic "You can't do that" response, the spell breaks.

The mockup handles this gracefully — "go north" leads to a new room and Forge prompts "Want to write this scene?" But what happens when the player types EXAMINE CLICKING SOUND? READ ADDRESSES ON ASTROLABE? TURN RING TO 14 CARROW LANE? Every prose detail the writer included becomes an interaction target, and every one needs a response. The writer's prose *creates* the specification burden.

## 8. "Speed-to-Playable Under 60 Seconds" vs. "Correct Game"

StoryMate proves writers love fast iteration: "a tiny cute game in literal minutes." But StoryMate makes choice-based fiction — linked text passages with no world model.

Generating a *playable parser IF scene* from prose in 60 seconds means:
- Parsing the prose for entities, connections, properties
- Generating Sharpee TypeScript (entities, traits, behaviors, grammar extensions)
- Compiling the TypeScript
- Building the game bundle
- Launching a play session

That's not 60 seconds. That's 60 seconds of LLM inference + build time + the overhead of being wrong and re-generating. And if it's fast but wrong, the writer loses trust. If it's correct but slow, the writer loses interest.

## 9. The Competitive Gap Is a Cliff

"Nobody is building what Forge would be."

Nobody built cold fusion reactors either. Sometimes the gap in the market is a gap in physics.

The ingredients that would make Forge work at scale:
- Reliable multi-paragraph intent inference from prose (doesn't exist)
- Seam detection in real-time editing (doesn't exist)
- Prose-to-world-model translation with mechanical completeness (doesn't exist)
- Incremental world-model re-derivation from prose edits (doesn't exist)
- Trust/verification for non-programmers in stateful systems (open research)

Each of these is individually a research problem. Together, they're a research program.

## 10. The Real Risk: A Demo That Can't Become a Product

The mockup is gorgeous. A single scene, carefully chosen, with a few objects and connections that are easy to infer. It would make an incredible conference talk, a compelling blog post, a viral demo.

And then a real writer sits down and writes their novel's opening chapter as a game, and Forge drowns in ambiguity, hallucinates puzzle mechanics, drops objects between scenes, fails to connect the subplot the writer set up in Chapter 2, and produces a game that sort of works for the first three rooms and then collapses into "You can't do that" for everything the writer thought they'd described.

The distance between a one-scene demo and a 50-room game is not linear. It's exponential. Every scene adds combinatorial complexity that the LLM must track, and current models forget, hallucinate, and contradict at exactly the scale where it matters.

---

## So Is It Insane?

Yes. Obviously.

But most things worth building are. The question isn't whether the problems are hard — they are — but whether any of them are *impossible*. And honestly? None of them are. They're engineering problems with research components, not laws of physics.

The real question is sequencing. Which of these problems do you solve first? The answer is probably:

1. **Inference quality on single scenes** — can Forge reliably extract a correct world model from one scene?
2. **Trust through play** — can a writer verify and correct through play-testing alone?
3. **Cross-scene consistency** — can Forge maintain coherence across 10 scenes? 50?
4. **Seam detection** — can it be faked with explicit triggers initially and made implicit later?

If #1 works, you have a demo. If #2 works, you have a tool. If #3 works, you have a product. If #4 works, you have the thing the mockup promises.

Build them in that order.
