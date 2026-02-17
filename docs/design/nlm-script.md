# Sharpee: The Development Story — Podcast Script

## Instructions for NotebookLM

This is a script for a podcast about the development of Sharpee, a parser-based Interactive Fiction authoring platform built in TypeScript. Follow these guidelines strictly:

1. **No flowery compliments to the developer.** Do not praise Dave's brilliance, genius, or vision. Just tell the story.
2. **No deep dives on implementation minutiae.** Don't explain what `createDoor()` does or how individual functions work. Stay at the architectural and narrative level.
3. **Do not misinterpret the architecture.** Especially: Domain Events are NOT pub/sub. There is NO event bus. Events are return values — messages collected during a turn and sent to the Text Service for rendering. If you don't understand something, skip it rather than get it wrong.
4. **Keep it conversational and grounded.** This is a real story about decades of personal history with interactive fiction, not a tech product launch.

---

## Part 1: The Origins of Interactive Fiction

### The Late 1970s

Interactive fiction didn't start on personal computers. In the late 1970s, people played text adventures on DECWriter terminals — printing terminals that used greenbar paper. You dialed into a PDP-10 or PDP-11 over a coupler modem. There were no screens. Your game session was a physical stack of paper.

This is the world where the story begins.

### Dave Discovers Computers and IF

Dave discovered computers and interactive fiction at the same time, in high school. At Milwaukee Public Schools, kids were playing ADVENT (Colossal Cave Adventure) and DUNGEO (the early name for Zork) on the school's PDP-11/70. For Dave, programming and text adventures were the same thing from day one.

### The Infocom Era

Through the 1980s, Dave played Infocom games. The Babelfish puzzle from The Hitchhiker's Guide to the Galaxy is still burned into memory, but the Enchanter trilogy — Enchanter, Sorcerer, Spellbreaker — remains his favorite series.

### TADS and the Learning Curve

In 1994, Dave read about TADS (the Text Adventure Development System) and decided to try building his own game. He mailed a check to Mike Roberts — the creator of TADS — and received 3.5-inch floppy disks in the mail. But Dave didn't know object-oriented programming at the time, and TADS was built around OOP. He never managed to produce anything with it.

### The Usenet Years

For the next few years, the IF community lived on Usenet — specifically rec.arts.int-fiction and rec.games.int-fiction. Dave was part of those conversations, absorbing the culture and the craft.

### IFComp and Speed-IF

In the late 1990s, Dave entered two Inform 6 games in the annual IF Competition: *The Town Dragon* and *Cattus Atrox*. He'll tell you he wasn't a great IF author, but some people loved Cattus Atrox.

After submitting his games to the 1998 competition, Dave invented Speed-IF — a madlib-based hackathon format for interactive fiction. You'd get a set of random elements (a rubber duck, a volcano, a regretful knight) and have to write a complete game in a couple of hours.

### Publishing IDM4

Dave helped publish the fourth edition of Graham Nelson's *Inform Designer's Manual* — the definitive reference for Inform programming. There was something special about watching people show up on rec.arts.int-fiction and post "I got it!" when their copy arrived.

### The VB6 Experiment

Dave's first attempt at building his own IF platform was in Visual Basic 6. He built a DLL that could tokenize and deserialize an Inform 6 story file into an object tree. It never became a full engine, but another developer used the library for his own editor and tools.

### Life Intervenes

Then life happened. Dave got married, had kids, and IF took a back seat.

---

## Part 2: Textfyre and Burnout

### Starting an IF Company

In 2008, going through a divorce, Dave channeled his energy into starting an interactive fiction company called Textfyre. They published two games: *Jack Toresal and The Secret Letter* and *Shadow in the Cathedral*.

Textfyre tried to pivot into educational applications for interactive fiction. The pivot failed, and the company closed.

### The Burnout Years

After Textfyre, Dave was burned out on IF for years. He didn't touch it for a long time.

### Trying Inform 7

When he eventually came back, Dave tried writing games in Inform 7 — Graham Nelson's revolutionary natural-language programming system. He had some success, but the embedded text emission model drove him nuts. He couldn't produce things the way he wanted to.

### Virtual Machines Are Gatekeeping

The broader frustration went deeper than Inform 7's syntax. The entire IF ecosystem relied on virtual machines — the Z-machine, Glulx — as intermediaries between the author's code and the player. Dave saw this as unnecessary gatekeeping. Why should a text game need a virtual machine?

### FyreVM-Web

Dave built FyreVM-Web, which proved there were alternative approaches to delivering interactive fiction beyond traditional IF virtual machines. This was the proof of concept that different solutions existed.

---

## Part 3: Building Sharpee

### The Graph Idea

Dave started designing a new IF foundation from scratch. The core idea was that the data store should be a graph — entities connected by relationships, like a network.

### The C# Years

He spent a couple of years building this graph-based engine by hand in C#. Progress was slow but steady.

### Enter AI — Frustration First

When ChatGPT arrived, Dave thought AI would accelerate development. It didn't. The early models were more frustrating than productive — they couldn't hold the complexity of what Sharpee needed.

Dave switched to Claude on the web (claude.ai) and continued working in C#. But context windows were still too small, and Claude struggled with complex C# architectural ideas.

### The Language Tier Experiment

Dave asked Claude a simple question: rank your best programming languages in tiers — A, B, C, D. Python and TypeScript came back as A-tier. C# and Java landed in B/C territory. That confirmed what Dave had been feeling — the frustration with AI and C# wasn't his imagination. Claude just wasn't as strong in that language.

### The TypeScript Port

So Dave ran an experiment: port Sharpee to TypeScript. During the port, the graph-based data store evolved into something different — a matrix-based world model. Claude had convinced Dave that a graph was unnecessary. A simpler matrix approach would work. It was right.

With TypeScript and Claude working together, real progress finally happened. They built out the world model.

### Claude Code Changes Everything

Then Claude Code — Anthropic's CLI tool — arrived. The standard library practically wrote itself in a few weeks. The acceleration was dramatic.

There was a pause from October to January, and then the latest Claude Code and Opus model combination kicked off a nonstop development cycle to finish Sharpee and port Mainframe Zork.

---

## Part 4: Architecture — How Sharpee Works

### Domain-Driven Design

Sharpee's architecture starts with Domain-Driven Design — modeling the problem domain's behavior, not just its data structures.

### The Trait System

The trait system was born from conversations about focusing on behavior. Instead of deep class hierarchies where a "lamp" inherits from "object" inherits from "thing," Sharpee entities are composed of traits. An entity is just an ID. Traits describe what it can do — an OpenableTrait means it can be opened, a LightSourceTrait means it emits light.

### Separating Logic and Data

The insight came almost instantly: traits hold data, behaviors own logic and mutations. A trait says "this door is open" (data). A behavior says "here's how opening works" (logic). This separation is clean and it survives serialization — traits are just plain data objects that can be saved and restored without losing anything.

### The Four-Phase Action Pattern

Actions in Sharpee follow a four-phase pattern: validate, execute, report, blocked. But it didn't start that way. Originally there was just one routine that did everything. It grew to three phases, then four. The standard library has been through roughly fifty refactors to reach its current form.

- **Validate**: Can this action happen right now? (Is the door already open? Is the player holding the key?)
- **Execute**: Mutate the world model. (Open the door. Move the item.)
- **Report**: Emit domain events describing what happened. (Messages for the text service to render.)
- **Blocked**: If validation failed, emit events explaining why. (The door is locked. You can't reach that.)

### Internationalization by Design

In the middle of all this, Dave started adding wish list items. One was out-of-the-box internationalization. This directly led to two separate packages: `lang-en-us` for English text and `parser-en-us` for English grammar. There is no English anywhere in the engine. All text flows through message IDs. Briefly they thought they'd need a `client-en-us` package too, but they didn't.

### The Parser

The grammar, parser, and command evaluator are Dave's own take on previous platforms — drawing on Inform 6 and 7, TADS, and Hugo. It's not intentionally different from its predecessors. It just got pulled apart differently through iterative design with Claude. It emerged from the process rather than being planned.

### The World Model — Claude's Design

The matrix-based world model data store was Claude's design. Dave came in wanting a graph. Claude made the case that a matrix approach was simpler and sufficient. Dave agreed, and it was the right call. This is an example of genuine AI collaboration — not just generating code to a spec, but the AI contributing architectural ideas that change the direction of the project.

### ADRs as Communication

Dave learned that context management is a core aspect of being successful with generative AI. Architecture Decision Records — ADRs — became a critical communication tool. Not just documentation for humans, but a way to keep Claude aligned on architectural decisions across sessions. There are over 120 ADRs to date, covering every aspect of Sharpee's development and design.

---

## Part 5: Dog-Fooding with Dungeon

### Full Circle

Of course Dave's nostalgia chose the dog-fooding target. Mainframe Zork — the game called DUNGEO on that PDP-11/70 in Milwaukee — is being ported to Sharpee. Full circle, decades later.

### The Foundation Held

Porting Dungeon has triggered a number of refactors, but it also proved the core architecture was mostly solid. The foundation held up under the weight of a real, complex game.

### What Dungeon Revealed

The port exposed real gaps:

- **The grammar system needed action-first definitions.** The original pattern-first approach wasn't scaling. Dungeon forced a redesign.
- **Capability dispatch was born from need.** Standard actions needed a way to inject entity-specific logic and overrides. Entities declare what they can do, behaviors implement it.
- **Interceptors were a delayed requirement.** Inform has before, after, and instead rules — ways to intercept and override standard actions. Sharpee didn't recognize the need for that pattern until the Dungeon port forced it.

---

## Part 6: What Makes Sharpee Unique

### The Text Service

The Text Service is probably the most unique aspect of Sharpee. Here's how it works:

Every turn, the platform accepts a command from the player and mutates the world model. During that process, it emits messages to a list. These messages are Domain Events — they describe what happened semantically, without any text. When the turn is complete, those Domain Events are sent to the Text Service.

The Text Service uses Text Blocks and a LanguageProvider to build actual text for the targeted client. Text Blocks compose multiple messages into a single output — grouping related information together rather than rendering one message at a time.

**This is critical to understand correctly:** Domain Events are NOT a pub/sub system. There is no event bus. There are no listeners. Events are return values — messages collected during execution and handed to the Text Service after the turn completes. They are a rendering pipeline, not an event-driven architecture.

And printing text is far more complicated than it looks. Managing whitespace, punctuation, and composition across multiple messages is a real engineering challenge. It's not a simple post-fix operation. The Text Service exists because getting this right is hard.

### TypeScript Means Universal Delivery

By using TypeScript, the full platform and story can be delivered into any browser. Performance and storage are never an issue. It's cross-platform and fast. All browser UX is fully in the developer's hands — no VM, no interpreter, no terp.

### The Future: AI-Powered Authoring

Using TypeScript also opens a future door: training a small language model to allow authors to generate Sharpee stories from documents. The entire codebase is already in a language that AI understands deeply. The authoring tool could be AI-native from the start.

---

## Closing

Sharpee is a platform built across decades of personal history with interactive fiction — from greenbar paper on a PDP-11 to TypeScript in the browser, from mailing checks for floppy disks to pair-programming with an AI. It's the product of nostalgia, burnout, failed companies, iterative design, and the stubbornness to keep coming back to the same problem until the tools finally existed to solve it right.
