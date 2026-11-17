# Comprehensive Survey of Conversation Systems in Interactive Fiction (1990s--Present)

*Research compiled for IF platform architecture design. April 2026.*

---

## Table of Contents

1. [The Classic ASK/TELL Model](#1-the-classic-asktell-model)
2. [Inform 7 Conversation Extensions](#2-inform-7-conversation-extensions)
3. [TADS 3 Conversation System](#3-tads-3-conversation-system)
4. [Ink (Inkle) / Choice-Based Conversation](#4-ink-inkle--choice-based-conversation)
5. [Dialog (Linus Akesson)](#5-dialog-linus-akesson)
6. [Galatea (Emily Short)](#6-galatea-emily-short)
7. [Facade (Mateas & Stern)](#7-facade-mateas--stern)
8. [Versu (Evans & Short)](#8-versu-evans--short)
9. [Erasmatron / Storytron (Chris Crawford)](#9-erasmatron--storytron-chris-crawford)
10. [Spirit AI Character Engine](#10-spirit-ai-character-engine)
11. [AI Dungeon / LLM-Based Approaches](#11-ai-dungeon--llm-based-approaches)
12. [Other Notable Systems](#12-other-notable-systems)
13. [Academic/Theoretical Models](#13-academictheoretical-models)
14. [Comparative Analysis](#14-comparative-analysis)
15. [Design Space Map](#15-design-space-map)

---

## 1. The Classic ASK/TELL Model

### Origins (Infocom Era)

The ASK/TELL model originated in the Infocom era and remains the default conversation interface in both Inform 6 and Inform 7. The player types commands of the form `ASK [NPC] ABOUT [TOPIC]` or `TELL [NPC] ABOUT [TOPIC]`, and the system matches the topic keyword against authored responses.

### Core Mechanic

- Player enters a verb (ASK, TELL, ASK FOR, SHOW, GIVE) plus a topic keyword
- The system matches the keyword against a table of authored responses
- Each keyword maps to exactly one response per NPC (in the simplest form)
- Extended verbs: GIVE [object] TO [NPC], SHOW [object] TO [NPC]

### Topic/Knowledge Representation

- Topics are strings of text (Inform 7) or game objects
- In Inform 7, topics are loosely typed -- you can "ask about" or "tell about" topics, but not about objects that exist in the game unless you set up topics with the same vocabulary as the objects
- In Inform 6, topics are typically dictionary words matched against `life` property routines on NPCs
- No built-in concept of NPC knowledge, mood, or conversation state

### Conversation State

- **Stateless by default.** Each ASK/TELL is an independent transaction -- no memory of what was discussed previously
- No greeting/goodbye protocols
- No turn-taking or conversational flow
- The NPC always answers the same question in the exact same words, regardless of repetition

### Strengths

- **Seamless UI integration**: Uses the same command parser as all other actions
- **Open-ended exploration**: Creates an illusion of boundless freedom; the player can ask about anything
- **Puzzle-friendly**: Works well with knowledge-based puzzles where the player discovers and asks about new information
- **Low authoring floor**: Simple to implement for a few key topics

### Weaknesses

- **Guess-the-noun problem**: The player must think of the specific keyword the author had in mind
- **Stateless conversations**: No sense of conversational flow, context, or rapport
- **Limited expressiveness**: Cannot express agreement, disagreement, greeting, apology, emotional tone
- **Pronoun ambiguity**: `ASK JILL ABOUT JACK` could mean any of a dozen questions
- **Repetition**: No mechanism to prevent the player from asking the same question ten times and getting the identical response
- **No NPC agency**: NPCs are purely reactive -- they never initiate, redirect, or drive conversation

### Memory/Knowledge Asymmetry Support

None in the base system. All information is symmetrically available -- there is no model of what the player or NPC knows. Workarounds require manual flag-tracking by the author.

---

## 2. Inform 7 Conversation Extensions

### 2a. Eric Eve's Conversation Package

Eric Eve created a layered family of extensions that build on each other, culminating in the Conversation Package:

**Extension Hierarchy:**
1. **Conversation Framework** -- Foundation layer. Adds saying hello/goodbye, abbreviated commands for the current interlocutor, and asking/telling about things (game objects) as well as topics
2. **Conversational Defaults** -- Adds a hierarchy of default responses (default ask response, default tell response, default ask-tell response) so NPCs can respond meaningfully to unrecognized topics
3. **Conversation Nodes** -- Adds the concept of "convnodes" -- particular points in a conversation where specific options become available (e.g., after an NPC asks a yes/no question)
4. **Conversation Suggestions** -- Adds topic suggestion lists so the NPC can hint at what to discuss
5. **Conversation Package** -- Includes all of the above, plus makes suggestions aware of convnodes

**Core Mechanic:**
- Extends ASK/TELL with greeting protocols (explicit and implicit hello/goodbye)
- Adds conversational nodes where the conversation is "at" a specific point, and particular responses become available
- Adds topic suggestion lists (ask-suggestions, tell-suggestions, other-suggestions) that can be attached to NPCs or to specific nodes
- Requires **Epistemology** extension for tracking what the player character knows

**Topic/Knowledge Representation:**
- Topics can be things (game objects) or abstract topics
- Default response hierarchy: specific topic > default ask > default tell > default ask-tell > default conversational response
- Convnodes are "things" (in the Inform 7 sense) that can be open or closed

**Conversation State:**
- Current interlocutor tracked globally
- Current convnode tracked per NPC
- Greeting/goodbye state (in-conversation vs. not)
- Topic suggestion lists can vary by convnode

**Strengths:**
- Layered architecture -- authors can use as much or as little as needed
- Convnodes solve the "NPC asked a question" problem well
- Topic suggestions reduce guess-the-noun without eliminating free exploration
- Retains the ASK/TELL interface familiar to parser IF players

**Weaknesses:**
- Five interdependent extensions can be confusing to configure
- No built-in concept of conversation threading or quip relationships
- No NPC mood tracking
- No NPC-initiated conversation beyond convnode prompts
- Manual state management for complex conversations

### 2b. Emily Short / Chris Conley's Threaded Conversation

The most architecturally ambitious conversation system for Inform 7, originally designed by Emily Short and revised/documented by Chris Conley.

**Core Mechanic: The Quip**

The fundamental unit is the **quip** -- a single conversational exchange including both what the player says and how the NPC responds. Quips are classified along several dimensions:

- **By function**: Questioning (maps to ASK), Informative (maps to TELL), or Performative (standalone actions)
- **By repeatability**: One-time or Repeatable
- **By initiator**: Player-directed or NPC-directed
- **By formatting**: Beat-opened or Speech-opened

**Quip Relationships:**

Quips are connected through two key relations:

- **Directly-follows**: Quip B can only be used immediately after Quip A (tight sequencing)
- **Indirectly-follows**: Quip B requires that Quip A has been used at some point in the past (loose prerequisite)

The system computes the transitive closure: every directly-following quip is also indirectly-following. This creates a graph of conversation flow without requiring rigid tree structures.

**Availability Rules:**

An object-based rulebook determines whether each quip can be used. The system checks:
- Scene-based gating
- Character-specific tailoring
- One-time usage prevention
- Direct/indirect following prerequisites
- Custom author rules (e.g., "only available when holding the key")

**Conversation Memory (Recollection):**

- Tracks which quips have been spoken (the "recollection" relation)
- Maintains three cached quips: current quip, previous quip, grandparent quip (for context without full-history traversal)
- The fact-awareness relation tracks what characters know ("to know implies the fact-awareness relation")
- Character knowledge is tracked separately from how the character chooses to express that knowledge

**Topic Matching:**

Players match quips through the "mentioning" relation -- players can "ask about" any object a quip mentions. Disambiguation assesses which matched quips are:
- **Plausible**: Contextually appropriate given conversation state
- **Available**: Permissible under current restrictions
- **Listed-plausible**: Suggested to the player as options

**NPC-Directed Conversation:**

NPC-directed quips lack a player comment -- they consist only of the NPC's speech. They trigger through a queuing system with precedence levels (immediate obligatory, postponed optional, etc.), allowing NPCs to pursue conversational goals.

**Subject-Changing Detection:**

When the player jumps between unrelated threads, the system triggers a "subject-changing activity" that purges optional queued responses, creating a sense that the NPC notices topic shifts.

**Strengths:**
- Graph-based structure avoids rigid tree limitations
- Separation of player knowledge from NPC knowledge
- NPC agency through queued NPC-directed quips
- Availability rules allow complex gating without hardcoded conditions
- Handles subject-changing naturally
- Scales to large conversations (Alabaster: 400+ quips, 18 endings)

**Weaknesses:**
- High authoring complexity -- requires careful relationship management
- Quip graph can become difficult to visualize and debug
- Performance concerns with large quip sets (disambiguation)
- Requires companion tool (Conversation Builder) for practical authoring at scale
- The directly/indirectly-follows system can be confusing for authors

### 2c. Emily Short's Waypoint Conversation (Glass)

A specialized system where conversation topics form a navigable network.

**Core Mechanic:**
- Topics exist as nodes in a network with connections between them
- At any point, the "current topic" is the last thing discussed
- The player can suggest connected topics via ASK/TELL
- Connections between nodes carry conversation text -- the displayed text depends on the transition (what you just discussed to what you are transitioning to)
- The game itself tries to guide conversation toward a target subject; the player must find ways to steer away

**Strengths:**
- Creates strong conversational flow -- the path between topics matters, not just the destination
- NPC can have directional goals
- Elegant model for conversation-as-navigation

**Weaknesses:**
- Rigid topology -- adding new connections is expensive
- Difficult to scale beyond focused single-scene conversations
- Limited expressiveness within the network model

### 2d. Menu-Based Conversation (Jon Ingold and Others)

**Core Mechanic:**
- Player selects from numbered or listed dialogue options
- Each selection triggers an NPC response and presents new options
- Traditional approach: exhaustive static menus

**Jon Ingold's Critique and Innovation (Heaven's Vault):**

Ingold rejected static menus as a "tidying-up mechanic" -- once the player identifies the pattern, they assume order does not matter and treat conversation as a checklist. His design principles:

- **Filtered choice menus**: Instead of showing all questions, the system prioritizes critical topics first, then dynamically generates remaining options, limiting visible choices to approximately three at a time
- **Knowledge tracking**: Questions become available only within relevant windows -- after the player learns enough to ask but before answers become obsolete. Once any NPC answers, the question disappears for all characters
- **Time constraints**: Conversations end when NPCs leave, get irritated, or need to return to work. Without boundaries, players lose investment in individual questions
- **NPC counter-topics**: After answering, NPCs introduce their own topics, creating a back-and-forth rhythm
- **Improv model**: Ingold describes conversation as throwing a Frisbee -- each participant offers just enough to keep the exchange going

**Strengths:**
- Eliminates guess-the-noun
- Enables detailed, expressive options
- Authorial control over characterization and pacing
- Strong conversation state management

**Weaknesses:**
- "Lawnmower effect" -- players methodically explore all branches without genuine engagement
- Modal interface breaks narrative immersion in parser IF
- Visually incompatible with prose narration (in pure parser contexts)
- Limited to authored options -- no open-ended exploration

---

## 3. TADS 3 Conversation System

TADS 3 has the most architecturally complete conversation system built into any IF standard library. It was designed by Michael J. Roberts and represents the state of the art for parser-based IF conversation.

### Architecture Overview

The system is organized around three hierarchical concepts:
1. **Actor** -- The NPC entity, containing topic databases and state
2. **ActorState** -- The NPC's current behavioral mode (e.g., working, chatting, sleeping)
3. **TopicEntry** -- Individual responses to conversational commands

### ActorState Hierarchy

**ConversationReadyState**: The NPC is receptive to conversation but not yet conversing. Contains:
- `HelloTopic`: Greeting for explicit HELLO/TALK TO commands
- `ImpHelloTopic`: Greeting for implicit conversation starts (player just types ASK ABOUT)
- `ByeTopic`: Response to explicit GOODBYE
- `ImpByeTopic`: Response to implicit goodbye (player walks away or attention span expires)
- `inConvState`: Points to the corresponding InConversationState

**InConversationState**: The NPC is actively conversing. Contains:
- `attentionSpan`: Number of turns before the NPC abandons conversation (default: 4)
- `nextState`: ActorState to return to after conversation ends
- Continuation messages when the player does not converse on their turn

### TopicEntry Hierarchy

**By command type:**
- `AskTopic`, `TellTopic`, `AskTellTopic` -- for ASK/TELL commands
- `AskForTopic` -- for ASK FOR commands
- `GiveTopic`, `ShowTopic`, `GiveShowTopic` -- for GIVE/SHOW commands
- `YesTopic`, `NoTopic` -- for YES/NO responses
- `SpecialTopic` -- for custom commands with arbitrary keyword matching

**Default variants** (match when nothing more specific does):
- `DefaultAskTopic`, `DefaultTellTopic`, `DefaultAskTellTopic`
- `DefaultAskForTopic`, `DefaultGiveTopic`, `DefaultShowTopic`
- `DefaultGiveShowTopic`, `DefaultAnyTopic`
- Default topics match with score 1 (lowest), ensuring specific topics always win

**Suggested variants** for topic inventory display:
- `SuggestedAskTopic`, `SuggestedTellTopic`, `SuggestedShowTopic`
- `SuggestedGiveTopic`, `SuggestedYesTopic`, `SuggestedNoTopic`

**Alternative topics** (`AltTopic`): Nest within a parent TopicEntry to provide sequenced or conditional variations. The system always selects the last active alternative, enabling progressive revelation.

**Event-list combinations** for varied responses:
- `StopEventList`: Sequential responses, last repeats indefinitely
- `ShuffledEventList`: Cycles through all responses before repeating
- `RandomEventList`: Pure random selection

### Topic Matching and Scoring

**Match objects can be:**
- Physical game objects (Thing instances)
- Abstract Topic objects
- Regular expression patterns (single-quoted strings)
- Lists of objects (matches any in the list)

**Score-based selection**: `matchScore` property (default: 100) determines which TopicEntry wins when multiple match. Higher scores win. Score of nil means no match.

### Conversation Nodes (ConvNode)

ConvNode objects represent specific points in a threaded conversation -- the key mechanism for contextual conversation flow.

**Navigation:**
- Enter a node via `<.convnode name>` pseudo-tag embedded in response text
- Exit automatically when a response lacks a `<.convnode>` tag
- Use `<.convstay>` to remain at the current node
- Call `setConvNode()` method for programmatic control

**Override behavior**: Topic entries in a ConvNode override all other topic entries. The search order is: ConvNode > ActorState > Actor. The first match at the highest level wins.

**NPC-initiated conversations**: Call `initiateConversation(state, node)` to have the NPC start talking. The ConvNode provides greeting messages via `npcGreetingMsg` or `npcGreetingList`.

**NPC continuation**: When the player does not converse, ConvNodes can define `npcContinueMsg` or `npcContinueList` for the NPC to keep talking.

### Topic Inventory / Suggest Topics

**Activation conditions for suggestions:**
- The associated TopicEntry's `isActive` returns true
- The match object is known to the player character (`gPlayerChar.knowsAbout(obj)`)
- `suggestTo` property matches the current player character
- Player character has not satisfied curiosity (controlled by `timesToSuggest` and `talkCount`)

**Display mechanisms:**
- `TOPICS` command: Shows available suggestions
- `TALK TO` command: Shows suggestions if available (unless `autoSuggest = nil`)
- `<.topics>` pseudo-tag: Schedules topic inventory display in response text
- Automatic display when a ConvNode with active SpecialTopics becomes current

**Limiting suggestions:**
- `ConvNode.limitSuggestions = true`: Only show ConvNode suggestions
- `ActorState.limitSuggestions = true`: Stop hierarchy search at the ActorState level

### Database Search Order

When handling a conversational command:
1. Current ConvNode's topic entries (if active)
2. Current ActorState's topic entries
3. Actor's own topic entries

First matching entry (considering `matchScore` and `isActive`) is selected. Higher-priority databases completely shadow lower ones.

### Knowledge Tracking

**Player character knowledge:**
- `Actor.knowsAbout(obj)` method
- Objects are "known" if seen or explicitly marked via `setKnowsAbout(obj)`
- The parser restricts conversational topics to objects the player knows about

**NPC knowledge**: Not modeled with a separate knowledge base. Instead, NPC knowledge is implicit in TopicEntry `isActive` conditions. The library avoids maintaining separate NPC knowledge bases "to reduce overhead."

**Revelation tracking**: `<.reveal key>` pseudo-tag adds a key to a global revelation table; `gRevealed('key')` tests revelation status. Keys are arbitrary strings -- a lightweight form of fact tracking.

### TopicGroup

A container for topic entries sharing a single `isActive` condition. The `isActive` of a TopicEntry is AND'ed with the `isActive` of its enclosing TopicGroup. Nested groups AND all conditions together.

### ConvAgendaItem

A specialized agenda type where `isReady()` returns true only when the NPC has not conversed that turn. This allows NPCs to pursue background conversational goals without interrupting active conversations. Active ConvNodes block agenda execution.

### Strengths

- **Most complete parser-IF conversation system** -- handles ASK, TELL, ASK FOR, GIVE, SHOW, TALK TO, YES, NO, and custom commands
- **Greeting protocols** with explicit and implicit hello/goodbye
- **Attention span** creates time pressure and natural conversation endings
- **ConvNodes** enable rich threading without requiring rigid tree structures
- **Topic scoring** handles ambiguity gracefully
- **Suggest topics** reduce guess-the-noun
- **NPC agency** through continuation messages, NPC-initiated conversations, and ConvAgendaItem
- **Revelation tracking** supports information discovery gameplay
- **Alternative topics** with EventLists support progressive conversation
- **TopicGroup** reduces boilerplate for conditional topic sets

### Weaknesses

- **Complex authoring burden** -- the class hierarchy has dozens of specialized types
- **No NPC mood or emotional modeling** -- all state is binary (active/inactive)
- **Limited knowledge asymmetry** -- NPC knowledge is implicit in isActive conditions, not a first-class model
- **No conversation-as-negotiation** -- exchanges are transactional, not strategic
- **No unreliable narration** support -- the system assumes NPCs give their one authored response truthfully
- **No memory model** beyond revelation flags -- the system does not track "how many times we discussed X" or "what mood the NPC was in when we discussed X"

---

## 4. Ink (Inkle) / Choice-Based Conversation

### Core Architecture

Ink is Inkle's open-source narrative scripting language, released in 2016. It is not specifically a conversation system but a general branching narrative language that is heavily used for dialogue.

**Structural units:**
- **Knots**: Major story sections (equivalent to scenes or passages)
- **Stitches**: Sub-sections within knots
- **Choices**: Player decision points marked with `*` (one-time) or `+` (repeatable)
- **Diverts**: Flow control via `->` operator, jumping between knots/stitches
- **Gathers**: Merge points marked with `-` that recombine branching paths

**The Weave System:**

Ink's signature feature. Nested choices and gathers create compact branching structures where flow always moves downward. After an indented section ends, flow automatically pops to the next level of indentation. This guarantees no "loose ends" -- every branch eventually reconverges.

**State Tracking:**
- Global and local variables (integers, strings, booleans, lists)
- Visit counts: How many times each knot/stitch has been visited
- Conditional content based on variable values or visit counts
- List variables for set-like state (e.g., inventory, knowledge flags)

**Advanced Flow Control:**
- **Tunnels** (`->->` syntax): Temporarily divert to a knot, then return to the calling point. Used for reusable conversation modules
- **Threads**: Incorporate choices from another knot into the current flow. Used for parallel conversation options
- **Functions**: Pure logic functions for computation within curly braces

**Conversation-Specific Patterns:**
- Conditional choice text: Options shown/hidden based on state
- Once-only choices (default) vs. sticky choices
- Sequence/shuffle/cycle text variations for repeated visits
- Tags for metadata (speaker name, emotion, etc.)

### Application: 80 Days

80 Days used Ink to create an enormous branching narrative with approximately 750,000 words. Conversations branch extensively but reconverge at key plot points. Ocean-crossing tales used a bank of stories tweaked to fit circumstances, introducing early forms of dynamic content assembly.

### Application: Heaven's Vault

Heaven's Vault represents the most sophisticated use of Ink for conversation, with custom extensions:

**Dynamic Relevance Engine:**
- 30,000+ lines of dialogue managed by a custom "narrative director"
- Each dialogue line has **requirements** (conditions that must be met) and **redundancy checks** (conditions that would make the line unnecessary)
- "All requirements are required; but a single redundancy is enough to fail"
- The system tracks recently-set knowledge states to determine character focus
- Asks: "Is this line valid, and were any of its trigger states set recently?"
- Falls back to randomness when no relevant topics surface

**Knowledge Model:**
- Sophisticated tracking of player learning across the entire game
- Questions become available only within relevant windows -- after learning enough to ask but before the answer is obsolete
- Once any NPC provides an answer, the question disappears globally

**Ideas System:**
- States tagged as "ideas" represent surface-level thoughts (recent states)
- Distinguished from background concerns (recent history)
- Creates the sense that characters are thinking about what just happened

**Interactive Timeline:**
- When players review lore entries, characters subsequently discuss those topics without explicit prompts, creating seamless narrative transitions

### Strengths

- **Writer-friendly syntax** -- minimal boilerplate, prose-first
- **Weave system** prevents structural errors (no loose ends)
- **Powerful state tracking** with visit counts, variables, and lists
- **Modular** through tunnels, threads, and functions
- **Scales massively** -- 80 Days has 750K words, Heaven's Vault 30K lines
- **Runtime integration** via C#/JavaScript API for game engine communication

### Weaknesses

- **No built-in conversation model** -- conversation is an authoring pattern, not a system feature
- **No NPC knowledge model** -- knowledge is tracked as global variables, not per-character
- **No topic matching or parsing** -- purely choice-based, not command-based
- **State explosion** with complex conversations -- authors must manage variable interactions manually
- **No disambiguation** -- the player always selects from explicit options
- **No conversation memory abstraction** -- memory is just variables

### Memory/Knowledge Asymmetry

Supported only through manual variable management. Authors can track what each character knows and gate dialogue options accordingly, but there is no systemic support. Heaven's Vault's relevance engine is a custom layer built on top of Ink.

---

## 5. Dialog (Linus Akesson)

### Overview

Dialog is a domain-specific language for IF created by Linus Akesson, announced in 2018. Inspired by Inform 7 and Prolog, it compiles to Z-code or the custom A-machine.

### Conversation Support

Dialog's standard library provides **minimal conversation infrastructure** -- an "empty framework that authors can hang story-specific behaviour on." Chapter 7 of the library manual covers "Communication" with basic actions for talking to NPCs, but no built-in conversation system comparable to TADS 3 or Inform 7 extensions.

**What the standard library provides:**
- Basic `TALK TO` action framework
- `(animate $)` trait for NPCs
- `(on every tick in $)` for NPC animation
- Custom parsing rules for understanding player input
- Dynamic predicates (toggled with `now`) for tracking conversation state
- Scope system governing what concepts are accessible

**What it lacks:**
- No conversation trees or threading
- No NPC movement systems
- No topic suggestion mechanism
- No greeting protocols
- No mood or emotional tracking

### Community Extension: Threaded Conversation for Dialog

Howard M. Lewis Ship created `dialog-extensions` on GitHub, porting Emily Short's Threaded Conversation concepts to Dialog. The implementation uses:
- **Quips** as basic conversation units representing player-NPC exchanges
- Predicates governing who can say a quip and how quips follow each other
- Whether Dialog recognizes a keyword as referring to a quip depends on the current interlocutor, what quips have already been performed, and whether a potential quip follows some previously performed quip
- Custom scope management for selectively revealing available topics

### Strengths

- Clean, logic-programming-based foundation (Prolog-like)
- Custom parsing rules are powerful enough to build any conversation system
- Extremely efficient compiled output (Z-code or A-machine)

### Weaknesses

- Conversation is essentially DIY -- no library-level support
- Small community means fewer tested patterns
- Scope management for conversation topics is described as challenging

---

## 6. Galatea (Emily Short, 2000)

### Overview

Galatea is a single-room, single-NPC conversation piece that represents one of the deepest explorations of NPC conversation in IF history. Written in Inform 6, it demonstrates what is possible with extensive authoring within the ASK/TELL framework.

### Core Mechanic

Topic quips with mood tracking. The system uses the ASK/TELL interface but dramatically expands its sophistication:

- **Hundreds of possible responses** organized by topic
- **At least 70 distinct endings** across overlapping narrative branches
- Z-machine code runs to nearly 260K, bigger than many full-sized games

### Mood and Emotional State

The system employs **two orthogonal axes of emotional tracking:**

1. **Sympathy score**: Galatea's feelings toward the player (trust vs. hostility)
2. **Tension/attitude axis**: Scariness vs. patheticness, friendliness vs. anger

These axes create eight distinct mood zones (menacing, whiny, warm, furious, etc.). Mood affects:
- Which topics are available
- Which response variant is selected for a given topic
- Interstitial color text (gestures, tone of voice) between dialogue snippets
- Whether certain endings become reachable

### Memory and Context

- **Quip tagging**: Tracks which dialogue snippets have been spoken
- **Second-ask detection**: Some topics reveal different information if asked about a second time or in a different context
- **Conceptual distance**: Tracks topic proximity to detect abrupt subject changes
- **Blank-spot interpolation**: Responses contain mood-dependent slots ("insert an appropriate gesture here") -- same words but different movements or tones depending on overall atmosphere

### Knowledge Representation

Topics are organized as a flat set (not a graph or tree) but gated by mood, prior conversation, and context. The system creates the illusion of deep understanding through extensive conditional branching within each topic.

### Strengths

- Demonstrates that ASK/TELL can produce deeply responsive conversation with sufficient authoring
- Mood tracking creates genuinely different conversational experiences across playthroughs
- Interstitial variation makes repeated topics feel fresh
- Multiple overlapping narrative branches create "worlds layered on top of worlds"

### Weaknesses

- **Authoring scale does not generalize** -- Emily Short described the system as "a somewhat shaggy system" challenging to maintain
- **No reusable framework** -- the system is bespoke Inform 6 code
- **Flat topic structure** -- no threading, no quip relationships
- **No NPC agency** -- Galatea never initiates topics (though mood shifts create the illusion)
- **Exponential authoring cost** as mood axes and topic count increase

### Unreliable Narration

Galatea supports this implicitly -- depending on mood and prior conversation, Galatea tells contradictory stories about her origins. The player must triangulate which version (if any) is true. This is achieved through careful authoring, not systemic support.

---

## 7. Facade (Mateas & Stern, 2005)

### Overview

Facade is a first-person, real-time interactive drama where the player visits a married couple (Trip and Grace) whose relationship is fracturing. The player interacts through natural language text input and physical gestures. It represents the most ambitious attempt to integrate natural language conversation with dramatic structure in IF.

### Architecture: Four Interconnected AI Subsystems

#### 7a. Natural Language Understanding (NLU)

**Discourse Acts**: The NLU system maps free-text player input into approximately 30 parameterized **discourse acts** -- concise representations of the general meaning of the player's action. Examples: `agree`, `disagree`, `positive_exclaim`, `express_happy`, `flirt`, `topic_reference`, `praise`.

**Two-stage processing:**
1. **NL Rules** (implemented in Jess, a forward-chaining rule engine): Pattern-match raw player text into discourse acts using template rules
2. **Reaction Proposers**: Contextualize discourse acts within the current beat -- multiple discourse acts (agree, positiveExclamation, thank) may map to a single "agreement" reaction, reducing authoring burden

The NLU is intentionally "broad and shallow" -- it identifies sentiment and intent rather than parsing full sentences.

#### 7b. Drama Manager / Beat Sequencer

**Beats** are the fundamental units of dramatic action -- small, interactive, interruptible scenes. Facade contains approximately 27 beats with roughly 2,500 total Joint Dialogue Behaviors (JDBs) across all beats.

**Beat structure:**
- Beat goals: Canonical narrative sequence (transition-in, body goals, wait state, transition-out)
- Beat mix-ins: Context-specific reactions to player discourse acts
- Handlers: Meta-behaviors that modify the canonical sequence based on player input
- Gist points: Narrative commitment markers after which the story cannot backtrack

**Beat selection algorithm**: The drama manager selects the next beat based on:
- Which unused beat's preconditions are satisfied
- Whose story tension effects most closely match the near-term trajectory of an author-specified **Aristotelian tension arc** (inciting incident, rising tension, crisis, climax, denouement)
- Weights, weight tests, priorities, and priority tests also influence selection

**Beat annotations** include: preconditions, weights, weight tests, priorities, priority tests, and story value effects.

#### 7c. A Behavior Language (ABL)

ABL is a reactive planning language based on Hap, designed for believable agent authoring. Key features:
- Sequential and parallel behaviors
- Joint goals and behaviors for multi-agent coordination (Trip and Grace acting together)
- Reflective programming (meta-behaviors)
- Procedural direction specifying character staging, facial expressions, and gestures

#### 7d. Story State / "Social Games"

Facade maintains several procedural game systems running in parallel:
- **Affinity game**: Zero-sum score determining which character the player favors
- **Hot-button game**: Multi-tier progression through incendiary topics (sex, divorce, desire)
- **Therapy game**: Counters tracking each character's self-realization
- **Tension level**: Overall story arc state

Each JDB can modify these values. Character responses vary based on current combinations -- dialogue differs when tension is low vs. medium, or when affinity favors Grace vs. Trip.

### Input-to-Response Pipeline

1. Player enters text or performs gesture
2. NL rules interpret input into discourse acts
3. Reaction proposers contextualize discourse acts within the current beat
4. Active beat's handlers evaluate whether to execute beat mix-ins or allow global mix-ins
5. Global mix-ins (parallel topic progressions) may interrupt the current beat
6. ABL behaviors coordinate character performance (dialogue, emotion, gesture, staging)
7. Animation engine renders real-time performance

### Strengths

- **Free-text input** -- closest to natural conversation of any IF system
- **Dramatic structure** -- Aristotelian arc provides satisfying story shape regardless of player actions
- **Parallel story systems** -- multiple independent axes of story progression create emergent complexity
- **Real-time performance** -- characters have physical presence and emotional expression
- **Beat interruption** -- player can derail conversations naturally

### Weaknesses

- **Enormous authoring cost** -- ~2,500 JDBs for a 20-minute experience
- **Shallow NLU** -- sentiment classification, not true understanding. Players quickly discover what the system does and does not recognize
- **No generalization** -- the architecture is deeply specific to a two-NPC domestic drama
- **Brittleness** -- persistent rudeness or nonsensical input breaks the experience
- **No reusable framework** -- the system was never productized or made available as a toolkit

### Memory/Knowledge Asymmetry

Story state values implicitly model what has been discussed (the hot-button game tracks topic progression). However, there is no explicit memory model -- characters do not "remember" specific earlier statements. Knowledge asymmetry between Trip and Grace is authored into beat preconditions, not modeled dynamically.

---

## 8. Versu (Evans & Short, 2012--2014)

### Overview

Versu was a social simulation engine created by Richard Evans (AI lead for The Sims 3), Emily Short, and Graham Nelson (creator of Inform). Acquired by Linden Labs in 2012, released as an iOS app, then cancelled in 2014. It represents the most theoretically grounded conversation system in IF.

### Theoretical Foundation

Versu's conversation model draws on Harvey Sacks' ethnomethodological studies of conversation and the philosophical concept of the "Game of Giving and Asking for Reasons." Rather than regulative rules governing behavior, the system implements **constitutive practices** -- where intentionality itself emerges through participation in structured social interactions.

### Core Mechanic: Social Practice Model

Conversation is modeled as a **social practice** -- one of multiple concurrent activities. A social practice describes a recurring social situation and is implemented as a reactive joint plan providing affordances to participating agents.

**Concurrent practices**: Characters simultaneously occupy roles in different practices. During a dinner conversation:
- A "dinner" practice provides affordances to eat and drink
- A "conversation" practice models turn-taking and topic salience
- A "flirting" practice might provide additional social affordances

Each practice provides norms that characters strongly prefer to respect (responding when addressed, staying on topic), but players retain freedom to violate them. Violations are noticed and evaluated by other characters.

### Turn-Taking

Based on Sacks, Schegloff & Jefferson's "Simplest Systematics for Turn-Taking":
- **Selected speaker**: Identifies who should speak next
- **Selected topics**: Constrains what can be discussed (expanded from single topics to topic sets for conversational flow)
- **Selected speech-act**: Specifies the type of utterance expected (assertion, question, response, etc.)

When a character is asked a direct question, they become the selected speaker and are expected to respond.

### Character Architecture

Characters operate as **autonomous agents** with layered motivations:
- Abstract universal goals
- Context-specific objectives
- Individual emotional states and beliefs
- Personal narrative arcs

Characters use identical utility-planning algorithms for choosing responses as for any other action -- dialogue is not a special case but part of general action selection.

### Dialogue Data Structure ("Quips")

Individual utterances carry multiple embedded information types:
- Factual statements (require speaker belief)
- Evaluative content (character judgments)
- Emotional data (mood indicators)
- Topic tags (conversation salience)
- Prerequisites (arbitrary conditions for speaking)

### Knowledge and Belief Representation

- Characters store evaluations of others with supporting reasons
- Information circulates through explicit dialogue (characters must tell each other things)
- Characters do not maintain comprehensive models of others' beliefs
- Characters can accept, reject, or question information received from others

### Authoring Layers

Versu distinguishes three authoring layers:
1. **Genre files**: Define behavioral patterns within specific social milieus (Regency manners, corporate politics, etc.)
2. **Story files**: Provide extrinsic narrative structure
3. **Character files**: Specify individual behaviors and personal arcs

### Domain-Specific Languages

- **Praxis**: A logic-based DSL for modeling social practices
- **Prompter**: Graham Nelson's authoring language for intuitive story creation

### Strengths

- **Theoretically grounded** in conversation analysis and social philosophy
- **True NPC autonomy** -- characters have independent goals and choose actions through utility planning
- **Concurrent social practices** model the richness of real social situations
- **Knowledge asymmetry is first-class** -- information must be communicated and can be rejected
- **Norm enforcement** -- social rules are soft constraints that create social consequences, not hard walls
- **Replayable** -- autonomous agents produce different conversations each time
- **Conversation is not special** -- dialogue uses the same planning system as all other actions

### Weaknesses

- **Enormous complexity** -- the system required a team of world-class AI researchers
- **Cancelled before maturity** -- never reached production quality
- **Authoring difficulty** -- genre/story/character separation requires deep understanding of the model
- **No surviving codebase** -- the system is not available for study or reuse
- **Opaque to players** -- the social simulation may produce responses that feel arbitrary if the player does not understand the underlying social dynamics

### Memory/Unreliable Narration

Supported through the belief system -- characters hold beliefs that may be incorrect, and characters can choose to share or withhold information strategically. The evaluation system (characters judge each other with reasons) creates a natural foundation for unreliable narration.

---

## 9. Erasmatron / Storytron (Chris Crawford)

### Overview

Chris Crawford worked on interactive storytelling systems from 1992 until 2018. The Erasmatron (1998, funded by a $350,000 Markle Foundation grant) evolved into Storytron. These systems represent the most ambitious attempt to create a general-purpose interactive drama engine.

### Core Mechanic: Verb-Based Storytelling

The central concept is the **verb** -- an action that characters can perform. Everything in the system is organized around verbs, not topics, locations, or plot points.

### Deikto Language

Deikto is a "toy language" -- a completely computable subset of English containing only words defined for a specific storyworld. It uses English vocabulary spelled in English, but words are treated as complete, indivisible morphemes.

**Sentence structure**: A Deikto sentence is built around a verb with **word sockets** for:
- Actor (who performs the action)
- Props (objects involved)
- Stages (locations)
- Other contextual elements

### Personality Model

An unlimited-scope personality model where the author can define arbitrarily many personality axes (p-values). Characters have values on each axis, and these values influence their choices and reactions.

### Reaction System

When the story engine executes an event (a verb):
1. Each actor receives a set of reactions to that verb -- called a **role**
2. Each individual reaction within the role is called an **option**
3. Each option is another verb with:
   - Rules for filling word sockets (who to target, what prop to use)
   - **Inclination** values computed by the **Sappho** scripting language

**Sappho**: A graphical scripting language that structures computation in a tree-like manner. It calculates inclination values that determine how likely a character is to choose each option.

### Conversation Modeling

Conversation in Storytron is modeled as a specific type of verb exchange:
- Characters can spy on other characters conversing
- An extensive system manages how information travels through a group of people
- Secrets can be kept or broken
- The system models deception and information asymmetry

### Strengths

- **Unlimited personality model** -- arbitrarily extensible
- **Information propagation** -- models gossip, secrets, and deception
- **Verb-based unification** -- all interactions (including conversation) use the same framework
- **Knowledge asymmetry is core** -- characters have individual knowledge states

### Weaknesses

- **Overwhelming complexity** for authors -- Crawford admitted Storytron was "just too complicated for the audience"
- **Never produced a compelling experience** -- no widely-played storyworld was created
- **No surviving usable tool** -- Crawford abandoned the project in 2018
- **Deikto's expressiveness ceiling** -- a toy language cannot capture the nuance of natural conversation
- **Academic interest only** -- the design ideas are valuable but the implementation never succeeded

---

## 10. Spirit AI Character Engine

### Overview

Spirit AI's Character Engine (team included Emily Short and Aaron A. Reed) is a commercial SDK and authoring tool for creating reactive conversational characters. It represents the most sophisticated productized conversation system.

### Core Architecture

**Input Processing:**
- Recognizes entities mentioned in speech
- Identifies emotional tone and politeness markers
- Classifies question types and directional intent (where, why)
- Extracts multiple semantic elements from single utterances
- Supports both generated choice menus and free natural language input

**Knowledge and Memory:**
- Characters have individual knowledge models
- Knowledge updated dynamically from real-world data or simulation state
- User-specific knowledge tracked as conversations progress
- Characters can be taught to understand and answer questions about knowledge model data

**Personality Model:**
- Characters given personality parameters affecting both content and delivery
- Personality influences response selection and performance

**Response Selection:**
- Uses a tagged thought system where dialogue segments are marked as "End Thought" or "New Thought"
- Characters transition from End tags to contextually relevant New tags
- **Overlapping fallback layers** with decreasing specificity:
  1. Semantic pattern matching (e.g., "QUESTION:WHY" + character name)
  2. Broader category matching (any question type)
  3. Scene or emotional state-based fallbacks
  4. Generic conversational redirects

**Output:**
- Text tagged on a per-word level with metadata
- Metadata can drive animation engines, text-to-speech, or game actions
- Response includes text, emotional state, and performance direction

### Strengths

- **Production-ready** commercial system with authoring tools
- **Multi-channel NLU** -- understands tone, intent, and entities simultaneously
- **Dynamic knowledge** -- characters learn during conversation
- **Personality-driven response variation**
- **Integration-friendly** -- SDK for Unity and other engines

### Weaknesses

- **Commercial/proprietary** -- not available for study
- **Focused on 3D game integration** -- not designed for parser IF
- **Fallback-dependent** -- the system's intelligence degrades to generic redirects for unrecognized input
- **No published academic analysis** of the system's capabilities and limitations

---

## 11. AI Dungeon / LLM-Based Approaches

### Overview

AI Dungeon (Latitude, 2019--present) pioneered the use of large language models for interactive fiction. It and subsequent systems represent a fundamentally different approach: generating conversation on the fly rather than authoring it in advance.

### Core Architecture

- Transformer-based LLMs (originally GPT-2, later GPT-3, GPT-4, and custom models)
- Player types free-text actions; the model generates narrative responses
- "Memory" maintained by feeding prior context into each prompt
- RAG (Retrieval-Augmented Generation) for accessing custom lore, maps, and character data
- Frameworks like LangChain structure multi-step interactions

### Conversation Model

- **No authored conversation** -- all dialogue is generated
- **Persona alignment** through system prompts defining character personality, knowledge, and goals
- **Context window** as conversation memory -- recent exchanges are in-context; older ones may be summarized or lost
- **Long-term persistent memory** (2025--2026 development) -- NPCs form "relationships" with players lasting across weeks of gameplay

### Knowledge Representation

- Character knowledge defined in system prompts and RAG databases
- Knowledge graphs where NPC nodes connect to needs, wants, and relationship data
- Two memory types at runtime:
  1. **Conversational memory**: Previous player-NPC interactions for continuity
  2. **World knowledge memory**: Contextually relevant facts and narrative background

### Strengths

- **Unlimited conversational freedom** -- any input is accepted
- **No authoring bottleneck** -- content is generated, not hand-written
- **Adaptive** -- responses adjust to any topic or conversational style
- **Personality modeling** through prompt engineering
- **Rapidly improving** -- each model generation dramatically increases quality

### Weaknesses

- **No narrative structure** -- generated conversation lacks dramatic arc or purpose
- **Hallucination** -- models invent facts, contradict earlier statements, break character
- **No true memory** -- limited by context window; long-term memory solutions are primitive
- **No authorial intent** -- the system cannot be directed toward specific story goals
- **Reproducibility** -- identical inputs produce different outputs; no testing or QA possible
- **Cost and latency** -- real-time generation requires significant compute resources
- **Loss of authorial voice** -- all characters tend toward similar "LLM voice"
- **No puzzle integration** -- conversation cannot gate game state changes reliably

### Memory/Knowledge Asymmetry

LLM-based systems can be prompted to model knowledge asymmetry, but they enforce it unreliably. A character told to "not know about X" may still reference X. Current research on "Fixed-Persona SLMs with Modular Memory" attempts to address this with separate per-character memory modules, but the problem remains unsolved.

---

## 12. Other Notable Systems

### 12a. Alabaster (Emily Short, 2009)

A showcase for the Threaded Conversation extension with collaborative authorship (Emily Short wrote the introduction; other authors contributed conversation text). Features:
- 400+ quips with many alternate versions depending on situation
- 18 different endings
- Semi-random response assembly: clauses glued together to vary cadence and content on repeated queries
- Demonstrates that Threaded Conversation scales to substantial works

### 12b. Glass (Emily Short, 2006) -- Waypoint Conversation

Conversation topics form a navigable network. Text depends on the transition between topics, not just the destination. The game has a directional goal; the player must steer against it. See Section 2c above.

### 12c. Spider and Web (Andrew Plotkin, 1998) -- Inverted Interrogation

The NPC asks the player questions, inverting the typical ASK/TELL dynamic. The player's YES/NO answers and physical actions reveal (or conceal) information. Demonstrates that conversation can be player-confessional rather than NPC-interrogatory.

### 12d. Varicella (Adam Cadre, 1999) -- Tone System

A meta-conversational system where the player chooses a tone (hostile, cordial, servile) that modifies ASK/TELL responses. The tone acts as a second dimension of player expression beyond topic selection.

### 12e. Photopia (Adam Cadre, 1998) -- Conversation as Scene

Non-interactive conversation presented as scripted scenes. The player cannot influence the conversation -- they read it as it unfolds. Demonstrates that sometimes the right conversation system is no system at all.

### 12f. Best of Three (Emily Short, 2004) -- Inference Engine

Associates topics with multiple quips and implements a separate fact-tree permitting NPCs to draw logical inferences. The system enables question-asking and conclusion-verification. Short reported the gameplay proved "not very much fun" because outcomes felt predetermined despite dynamic internals.

### 12g. City of Secrets (Emily Short, 2003) -- Cross-Indexed Quips

Associates quips with multiple topics; topics nest hierarchically. Enables fallback exploration when current topics exhaust responses. Short described the system as "frankly, out of hand: hard to program and even harder to maintain," though it achieved richness through flexibility.

---

## 13. Academic/Theoretical Models

### 13a. Conversation as Negotiation

Several systems model conversation as a strategic exchange:
- **Versu**: Characters accept, reject, or question information based on their beliefs
- **Short's Unreleased CRPG Model**: Menu-based dialogue tied to mission states. NPCs assess internal consistency and adjust trust based on player responses. Evasion maintains trust neutrally; contradictions reduce it. Revealing information provides a short-term trust boost at the expense of diminished later options to lie
- **Storytron**: Characters propagate and withhold information strategically

### 13b. Social Modeling Approaches

- **Versu's Social Practices**: Grounded in Harvey Sacks' conversation analysis and constitutive social theory
- **Facade's Social Games**: Parallel game systems (affinity, hot-button, therapy) model social dynamics orthogonally to conversation content
- **Spirit AI**: Personality models affect both content selection and delivery performance

### 13c. Memory and Knowledge Representation

**Levels of knowledge representation observed across systems:**

| Level | Description | Systems |
|-------|-------------|---------|
| 0. None | No memory between exchanges | Basic ASK/TELL |
| 1. Flags | Binary "has been discussed" tracking | TADS 3 revelation, Ink variables |
| 2. Recollection | Ordered history of what was said | Threaded Conversation |
| 3. Facts | Structured knowledge that can be queried | Short's Best of Three, Character Engine |
| 4. Beliefs | Character-specific knowledge that may be incorrect | Versu, Storytron |
| 5. Theory of Mind | Characters model what others know and believe | Versu (partial), Storytron (partial) |

**Per-character vs. global knowledge:**
- Most systems (TADS 3, Inform 7 extensions, Ink) use global knowledge flags
- Versu and Storytron model per-character knowledge
- Character Engine provides per-character knowledge models with dynamic updates
- LLM systems attempt per-character knowledge through prompt engineering but enforce it unreliably

### 13d. Unreliable Narration Support

No system provides systematic support for unreliable narration. Systems that approach it:
- **Galatea**: Through extensive authoring, the NPC tells contradictory stories depending on mood and context
- **Versu**: Belief system allows characters to hold and share incorrect information
- **Storytron**: Information propagation model allows characters to deceive
- **LLM systems**: Can be prompted to be unreliable but cannot be trusted to maintain consistency

### 13e. NPC Agency Spectrum

| Level | Description | Systems |
|-------|-------------|---------|
| 0. Passive | NPC only responds when asked | Basic ASK/TELL |
| 1. Hinting | NPC suggests topics | TADS 3 suggestions, Threaded Conversation |
| 2. Continuing | NPC speaks when player is silent | TADS 3 continuation, Threaded Conversation NPC quips |
| 3. Initiating | NPC starts conversations | TADS 3 initiateConversation, ConvAgendaItem |
| 4. Goal-directed | NPC pursues conversational objectives | Threaded Conversation queue system, Glass waypoints |
| 5. Autonomous | NPC chooses freely from all possible actions | Versu, Facade drama manager |

---

## 14. Comparative Analysis

### Input Model Comparison

| System | Input Type | Disambiguation | Open-Ended |
|--------|-----------|----------------|------------|
| ASK/TELL | Parser command | Keyword match | Yes (guess-noun risk) |
| Eric Eve extensions | Parser + suggestions | Keyword + hints | Yes |
| Threaded Conversation | Parser + suggestions | Plausibility scoring | Yes |
| TADS 3 | Parser + suggestions | Score-based matching | Yes |
| Ink/Menus | Choice selection | N/A (explicit options) | No |
| Dialog | Parser (DIY) | Author-defined | Author-defined |
| Facade | Free text | Discourse act classification | Yes (shallow) |
| Versu | Choice from affordances | Social practice norms | Constrained |
| Character Engine | NL or choice | Multi-channel NLU | Both |
| LLM | Free text | None needed | Yes |

### State Complexity Comparison

| System | Conversation State | Knowledge Model | Mood/Emotion | Memory Depth |
|--------|-------------------|-----------------|--------------|--------------|
| ASK/TELL | None | None | None | None |
| Eric Eve | Convnode position | Epistemology ext. | None | Per-convnode |
| Threaded Conv. | Quip graph + queue | Fact-awareness | None | Full recollection |
| TADS 3 | ActorState + ConvNode | Revelation flags | None | isActive conditions |
| Ink | Global variables | Global variables | Global variables | Visit counts |
| Galatea | Topic + mood axes | Implicit in code | Two-axis model | Quip tags |
| Facade | Beat + story values | Beat preconditions | Affinity/tension | Story value history |
| Versu | Social practice state | Per-character beliefs | Emotional states | Evaluation + reasons |
| Storytron | Verb + role state | Per-character | Unlimited p-values | Full event history |
| Character Engine | Thought tags | Per-character dynamic | Personality model | Session-scoped |
| LLM | Context window | Prompt-defined | Prompt-defined | Context window |

### Authoring Effort Comparison

| System | Effort per NPC | Scales to Many NPCs | Requires Programming |
|--------|---------------|---------------------|---------------------|
| ASK/TELL | Very Low | Yes | Minimal |
| Eric Eve | Low-Medium | Yes | Light I7 |
| Threaded Conv. | High | With difficulty | Moderate I7 |
| TADS 3 | Medium-High | Yes (class hierarchy) | Moderate TADS |
| Ink | Low-Medium | Yes | Minimal (scripting) |
| Galatea | Extremely High | No (single NPC) | Heavy I6 |
| Facade | Extremely High | No (bespoke) | Heavy (ABL + rules) |
| Versu | High | Yes (genre files) | Heavy (Praxis) |
| Storytron | Very High | In theory | Moderate (visual scripting) |
| Character Engine | Medium | Yes (SDK) | Moderate (authoring tool) |
| LLM | Very Low | Yes | Minimal (prompting) |

---

## 15. Design Space Map

### Fundamental Axes

Any conversation system can be located along these axes:

**1. Player Input Freedom**
```
Constrained Choice <-----> Free Natural Language
  (Ink menus)     (TADS suggestions)  (Facade/LLM)
```

**2. Authoring Model**
```
Hand-Authored <-----> Generated
  (all traditional)    (LLM)
       Spirit AI (hybrid)
```

**3. NPC Autonomy**
```
Purely Reactive <-----> Fully Autonomous
  (ASK/TELL)     (TADS 3)     (Versu)
```

**4. Conversation State Depth**
```
Stateless <-----> Deep State
  (basic ASK/TELL)  (TADS ConvNode)  (Versu beliefs)
```

**5. Knowledge Model**
```
None <-----> Per-Character Beliefs with Theory of Mind
  (basic)  (flags)  (facts)  (beliefs)  (theory of mind)
```

**6. Dramatic Structure**
```
Player-Driven <-----> System-Driven Arc
  (ASK/TELL)     (Threaded Conv.)  (Facade drama mgr)
```

### Identified Gaps in the Design Space

Based on this survey, several areas remain underexplored:

1. **Per-character knowledge with reliable enforcement** -- Only Versu and Storytron attempted this seriously; neither survives as usable technology. LLMs attempt it but fail.

2. **Conversation as puzzle with strategic information exchange** -- Short's unreleased CRPG model (trust/evasion/contradiction) is the only example of treating conversation as a game with stakes.

3. **Hybrid parser + choice with NPC agency** -- TADS 3's suggestions approach this, but no system fully combines parser freedom with NPC conversational goals and dynamic choice generation.

4. **Mood/emotion as first-class conversation state** -- Galatea demonstrated the power of mood tracking, but it was bespoke. No reusable system provides mood as a dimension of conversation state.

5. **Scalable unreliable narration** -- No system provides tools for authoring NPCs who lie, omit, or confabulate in trackable ways.

6. **Conversation memory with narrative relevance** -- Heaven's Vault's "relevance engine" (recently-set states surface as conversation topics) is the most promising model but is proprietary and tightly coupled to Ink.

---

## Sources

### TADS 3
- [Programming Conversations with NPCs in TADS 3](https://www.tads.org/t3doc/doc/techman/t3conv.htm) -- Michael J. Roberts
- [TopicEntry Reference](http://www.tads.org/t3doc/doc/libref/object/TopicEntry.html)
- [Choosing a Conversation System](http://www.tads.org/howto/convbkg.htm)
- [The Art of Conversation (Getting Started Guide)](https://tads.org/t3doc/doc/gsg/theartofconversation.htm)

### Inform 7 Extensions
- [Eric Eve's Conversation Nodes Extension](https://github.com/i7/extensions/blob/9.3/Eric%20Eve/Conversation%20Nodes.i7x)
- [Eric Eve's Conversation Package v3](https://github.com/i7/extensions/blob/10.1/Eric%20Eve/Conversation%20Package-v3.i7x)
- [Chris Conley's Threaded Conversation Extension](https://github.com/i7/extensions/blob/9.3/Chris%20Conley/Threaded%20Conversation.i7x)
- [Threaded Conversation -- Emily Short's Blog](https://emshort.blog/2013/10/17/threaded-conversation/)
- [Threaded Conversation -- Novel Interaction](https://novelinteraction.wordpress.com/threaded-conversation/)
- [Waypoint Conversation Template](https://github.com/joshgiesbrecht/waypoint-convo-template)

### Emily Short's Conversation Research
- [Conversation -- Emily Short's Interactive Storytelling](https://emshort.blog/how-to-play/writing-if/my-articles/conversation/) -- Comprehensive survey of all models
- [Moods in Conversation](https://emshort.blog/2009/12/10/moods-in-conversation/)
- [Mailbag: Knowledge-driven Dialogue in Inform](https://emshort.blog/2019/06/11/mailbag-knowledge-driven-dialogue/)

### Ink / Inkle
- [Writing with Ink -- Official Documentation](https://github.com/inkle/ink/blob/master/Documentation/WritingWithInk.md)
- [Ideas and Dynamic Conversation in Heaven's Vault](https://www.gamedeveloper.com/business/ideas-and-dynamic-conversation-in-heaven-s-vault)
- [Designing Investigate Conversations -- Jon Ingold](https://www.gamedeveloper.com/design/designing-investigate-conversations)
- [Open Sourcing 80 Days' Narrative Scripting Language: Ink](https://www.gamedeveloper.com/design/open-sourcing-80-days-narrative-scripting-language-ink)

### Galatea
- [2000: Galatea -- 50 Years of Text Games](https://if50.substack.com/p/2000-galatea)
- [Galatea -- Electronic Literature Collection](https://collection.eliterature.org/1/works/short__galatea.html)

### Facade
- [Structuring Content in the Facade Interactive Drama Architecture](https://users.soe.ucsc.edu/~michaelm/publications/mateas-aiide2005.pdf) -- Mateas & Stern
- [Writing Facade: A Case Study in Procedural Authorship](https://electronicbookreview.com/essay/writing-facade-a-case-study-in-procedural-authorship/)
- [Facade -- IDSwiki](https://tecfalabs.unige.ch/mediawiki-narrative/index.php/Facade)
- [The Story of Facade: The AI-Powered Interactive Drama](https://www.gamedeveloper.com/design/the-story-of-facade-the-ai-powered-interactive-drama)

### Versu
- [Versu: Conversation Implementation -- Emily Short](https://emshort.blog/2013/02/26/versu-conversation-implementation/)
- [How Versu Works](https://versu.com/about/how-versu-works/)
- [Introducing Versu -- Emily Short](https://emshort.blog/2013/02/14/introducing-versu/)
- [2013: A Family Supper -- 50 Years of Text Games](https://if50.substack.com/p/2013-a-family-supper)

### Erasmatron / Storytron
- [Storytron -- IDSwiki](https://tecfalabs.unige.ch/mediawiki-narrative/index.php/Storytron)
- [Deikto: A Language for Interactive Storytelling](https://electronicbookreview.com/publications/deikto-a-language-for-interactive-storytelling/)
- [Chris Crawford -- Erasmatazz](https://www.erasmatazz.com/index.html)

### Spirit AI
- [Designing Playable Conversational Spaces -- Aaron A. Reed](https://medium.com/spirit-ai/designing-playable-conversational-spaces-80249443fe75)
- [Spirit AI Character Engine](https://www.spiritai.com/character-engine/)
- [Character Engine -- Emily Short's Blog](https://emshort.blog/tag/character-engine/)

### Dialog
- [Dialog -- Linus Akesson](https://linusakesson.net/dialog/)
- [NPCs and Conversations -- intfiction.org](https://intfiction.org/t/npcs-and-conversations/42294)
- [Threaded Conversation for Dialog -- Howard M. Lewis Ship](https://github.com/hlship/threaded-conversation)

### General / Academic
- [Inform 7 Handbook -- Conversations](https://inform-7-handbook.readthedocs.io/en/latest/chapter_5_creating_characters/conversations,_part_ii_asktellgiveshow/)
- [A Comparison of TADS 3 and Inform 7](http://brasslantern.org/writers/iftheory/tads3andi7.html)
- [Conversation Systems for Parser Games -- intfiction.org](https://intfiction.org/t/conversation-systems-for-parser-games/9167)
- [Personalized Quest and Dialogue Generation in RPGs (CHI 2023)](https://dl.acm.org/doi/10.1145/3544548.3581441)
