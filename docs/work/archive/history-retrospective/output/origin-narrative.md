# Origin narrative: March 2023 → June 2025

> **Correction, 2026-08-11 (Phase 4).** This document originally claimed that two
> implementation invariants from the 2023 C# prototype — reciprocal typed edges
> and publish-on-every-mutation — "survive to today." **They do not.** The
> `world-model-spine` tracer checked current source and found: `SpatialIndex`
> (2025-07-02, `331b0674`) replaced the graph with a single-parent tree plus a
> derived child index; no C# edge-type name appears in `packages/world-model/src`;
> `addRelationship`/`getRelated` is forward-only, has zero production callers, and
> its own unit test asserts the reverse lookup returns false; `updateEntity`
> carries a commented-out "Future: Could emit change events here"; and event
> sourcing was dropped in December 2025 as an "unnecessary technical rathole,"
> leaving save/restore as a gzipped snapshot with no replay path.
>
> What genuinely persisted is the **decomposition and the vocabulary** — which is
> real, load-bearing continuity, and a narrower claim than the one made below.
> The original wording is left in place, struck through where it is wrong, rather
> than edited away: this retrospective found 113 cases of a record quietly
> agreeing with itself after the fact, and it should not add a 114th.

Phase 2 of the history retrospective. This covers everything before the record
changes form — before session summaries exist, when the project's entire trace is
source files, conversation exports, and eventually git.

**What was read**, so a later reader knows what this rests on: the three C#
prototypes' architectural files (`DataStore/World.cs`, `GraphEvents.cs`,
`GrammarLibrary/Grammar.cs`, `StandardLibrary/Core.cs`, and the project
manifests); `chatgpt-5.txt` and the opening of `chatgpt-1.txt` in full; all 230
Claude conversation titles in date order; the first human turns of the two
December 2024 conversations; and targeted full-text searches across the whole
conversation archive. The 2024 conversations were **sampled by title**, not read
whole — 3.5 million characters is beyond one reading, and the titles turn out to
be unusually informative because they were auto-generated per conversation.

Every claim below cites the artifact it rests on. Where the evidence is thin,
that is stated rather than smoothed over.

---

## March 2023: three prototypes in sixteen days

The project begins as a conversation, not a repository. `chatgpt-1.txt` opens:

> "We're going to design a new parser-based Interactive Fiction platform using C#."

Three C# solutions survive from the weeks that follow, none under version
control, dated only by file mtime:

- **`IFPlatform`** (2023-03-19) — 3 projects, 18 files, 675 lines. Has a
  `GameEngine`, a `StandardLibrary`, and a `CloakOfDarkness/Story.cs`: the
  standard first IF test story.
- **`IFStory`** (2023-03-21) — 5 projects, 5 files, 109 lines. `Grammar/`,
  `Parser/`, `StoryEngine/`, `WorldModel/`, each holding little more than a
  `Class1.cs`. A structure sketched and put down.
- **`StoryRunner`** (2023-04-01 → 04-03) — 11 projects, 29 files, 1,909 lines.
  The real one.

The sequence matters: two false starts in three days, then a two-week pause,
then a third attempt that goes considerably further. `chatgpt-5.txt` confirms
the pattern from the inside — "I've asked you to help me design a C# based
interactive platform three times and the third time has gone very well."

**StoryRunner's project list is the finding of this phase.** `WorldModel`,
`DataStore`, `GameEngine`, `GrammarLibrary`, `ParserLibrary`, `StandardLibrary`,
`TextService`, `Common`, `MyStory`, plus a test project and the runner. Set that
beside the TypeScript monorepo that exists today — `world-model`, `engine`,
`parser-en-us`, `stdlib`, `lang-en-us`, and (until ADR-174 retired it)
`text-service` — and the decomposition is already there, in April 2023, two years
before a line of TypeScript is written.

Two implementation choices from that April ~~also survive to today~~ **were
later replaced — see the correction at the top of this file**:

**The world is a property graph with typed, reciprocal edges.**
`DataStore/World.cs` holds nodes and edges, each carrying dynamic properties, and
`StandardLibrary/Core.cs` registers the edge types up front as reciprocal pairs —
`IsWithin`/`Contains`, `IsCarriedBy`/`Holds`, `IsIn`/`Hosts`,
`IsSupporting`/`IsOn`, `LeadsTo`/`LeadsTo`. `ConnectNodes` refuses a one-way
link outright: `throw new Exception("All connected nodes must be
bidirectional.")`. That invariant — containment is a relationship with two ends,
not a parent pointer — ~~is the shape Sharpee's world model still has~~ **was
abandoned on 2025-07-02, when `SpatialIndex` made containment exactly the parent
pointer this refused to be. Sharpee reached the opposite answer, and ADR-015
argues for it from game scene graphs (Unity Transform, Unreal attachment, Guava
BiMap) rather than from the property-graph literature this came out of.**

**Every mutation publishes an event.** `World.cs` carries a list of
`IGraphEventHandler`s and fires `PublishNodeAdded`, `PublishEdgeAdded`,
`PublishPropertyChanged` on every change; `GraphEvents.cs` defines the event
types. ~~Event-sourced world mutation is not something Sharpee arrived at later.
It is in the first working prototype.~~ **It is in the first working prototype and
it is not in the shipping platform: ADR-064 re-derived it from first principles in
December 2025, only the half that made it unnecessary shipped
(`ActionContext.sharedData`, 907 references in stdlib today), and the emission
phase never landed. Sharpee had the idea first and chose against it twice.**

**The grammar is a fluent builder.** `GrammarLibrary/Grammar.cs` composes
patterns as chained property access — `_grammar.Verb("take", Take).Noun.End`,
`_grammar.Verb("go", Go).In.Noun.End` — with `MetaVerb` separating meta actions
from world actions, and `OverrideActionDelegate` letting a story replace a
standard action's behavior for one specific sentence shape. Story-level override
of a standard action, by pattern, is ADR-090 capability dispatch in embryo.

What StoryRunner does **not** have is behavior. `Take()`, `Examine()`, `Go()`,
`Score()`, `Restore()`, `Restart()` are all empty method bodies. It is an
architecture with nothing running inside it — which is exactly what a design
conversation produces.

## The graph was argued for, not assumed

`chatgpt-5.txt` is the reflective conversation, and it is the one worth reading
in full. David states the design as built —

> "In my current platform design, I chose an in-memory graph with nodes (with a
> dynamic list of properties) and bidirectional edges (with start and end dynamic
> properties). I wanted to discuss if using only one type of data structure for
> everything is an optimal strategy…"

— and then presses on the hard case, which is the one that still matters:

> "One of the factors would be that everything the PC is carrying has to be 'in
> scope' in the PC's current Location. Wouldn't that impact how the graph 'sees'
> carried objects?"

That is the scope problem, identified in 2023, before there was anything to run
it against. The word "graph" appears 124 times in `chatgpt-4.txt` alone.

## The name arrives in 2024, and it belonged to the C# project

The name is **not** in the 2023 conversations. Its earliest appearance in the
record is 2024-07-28, in an error message David pastes into a Claude
conversation:

> `Unable to find project 'C:\Users\david\OneDrive - Mach9Poker, Inc\repos\sharpee\WorldModel\DataStore.csproj'`

So by late July 2024 the C# solution was already called Sharpee, living on a
Windows machine in OneDrive under a business account — which is also why the
backup drive that holds all this is named `surface-archive`. The name predates
the TypeScript rewrite by eight months.

(A caution for anyone grepping this archive: every export carries
`"source": "claude_project_sharpee"` in its `_extraction_metadata`, added at
extraction time in June 2025. A naive search for "sharpee" hits all 230 files and
proves nothing. Only message text counts — 123 conversations qualify.)

## June–October 2024: the C# platform actually gets built

The Claude archive opens 2024-06-26 with **"Building a Modular Interactive
Fiction Data Store"**, and its first human turn asks for a complete grammar
definition library modeled on **Inform 6's grammar**. The next day: "Designing a
Fluent Grammar Library for Interactive Fiction."

Then it accelerates. 13 conversations in July, **74 in August**, 28 in September,
9 in October — 124 in five months, and the titles read like a build log:

- *world model*: "Interactive Fiction World Model Classes", "Implementing Scenery
  and Doors", "Designing Containers and Supporters in IFWorldModel", "Deriving
  Animal Class from Thing", "Extending Animal to create Person class"
- *the graph*: "Bidirectional In-Memory Graph for Interactive Fiction",
  "Redesigning Graph Data Structure with Bidirectional Edges", "Refactoring
  IFWorld to use Graph Data Structure"
- *parser*: "Tokenization Process for Articles", "Improving Verb Pattern Parsing
  for Validation", "Defining Grammar for World Model Things"
- *events and text*: "Implementing Event Source in Text Service",
  "Event-Sourced Standard IF Text Generation", "Implementing an Event Source for
  Interactive Fiction"
- *the translation layer*: five conversations across July and August on a
  "Translation Layer" — user-facing text separated from logic, which is
  `lang-en-us` before it has that name

The compiler errors in the titles (`CS0535`, `CS0272`, `CS7036`, `CS0266`) date
the era beyond doubt: this is still C#, through 2024-10-30.

Note what happened in the same window in the file system: nine `StoryRunner`
files carry mtimes in **March and May 2024**, weeks before these conversations
begin. The C# work did not stop in 2023 and resume in 2024 — it was picked back
up first, then accelerated once a capable assistant was in the loop.

## 14 December 2024: the evaluation

Two conversations, same day, and they are the hinge of the entire project:

- **"Translating Graph-Based C# to TypeScript"** — *"Take a look at the attached
  code. This code is function complete in C#, but I want to see what it might
  look like if translated (or redesigned) for TypeScript."*
- **"Evaluating C# 8 to TypeScript Migration for Interactive Fiction Authoring"**
  — *"We're evaluating if switching from C# 8 to TypeScript is good idea for my
  Sharpee IF authoring system."*

Three things are worth noticing about how that evaluation was run. It was
**staged** — the data store and world model in one conversation, then "now I want
to analyze the grammar and parser code" in the next. It was **adversarial** —
David's second turn is simply *"Any cons?"*. And it was **scoped by the actual
problem**, not by general principle:

> "given a 'story' would always be single-user single-threaded and most games
> rarely reach 100 'locations' and 50 'objects', any change in your assessment?"

The performance objections to a JavaScript runtime don't survive a world that
small and that single-threaded. A day later, 2024-12-15: "Handling Concurrent
User Actions in Event-Sourced Systems."

Then nothing, for three and a half months.

## The quiet, and what it was

No conversations in January or February 2025. No repository yet. The record is
empty until 2025-03-27.

David's own account of the gaps, given 2026-08-11: *"the silences are when I hit
a wall in context and model capability to handle complexity and walked away."*
That is testimony, and no amount of archive reading would have produced it —
absence has no cause written in it.

## 27 March 2025: Sharpee in TypeScript

The record restarts at volume — **23 conversations on 2025-03-27 alone**. Two
things happen at once.

The platform is reorganized: "Organizing Sharpee's Project Structure", "Updating
Lerna Configuration for Sharpee Platform", "Separating Grammar, Parsing, and
Language Structures", "Developing the World Model for Interactive Fiction". Lerna,
not pnpm — `lerna.json` lands in the repository's first commit and
`pnpm-workspace.yaml` doesn't appear until 2025-07-02.

And a story is designed the same day: "Outlining Interactive Fiction Story",
"Tragic Family Heist with Supernatural Powers", "Reflections: Designing a
Parser-Based Interactive Fiction Story". The platform and its first real story
resume together.

One title on that day names the other change: **"Optimizing Claide.AI vs. Claude
Code for Interactive Fiction Platform."** The tooling question is being asked at
the same moment as the language question.

Two days later, 2025-03-29, the repository gets its first commit — and gets it
**twice**, `d9003cf7` and `330931b5`, both titled "Initial commit", minutes
apart. That is what importing existing work looks like, not what starting from
nothing looks like.

## April–June 2025: the wall, in its own words

April's conversation titles are a firefight: "Fixing TypeScript Errors in
Sharpee", "Resolving TypeScript Errors in Sharpee Project", "Fixing TypeScript
Code Errors", "Checking Build Command Status", "Resolving Build Errors in Sharpee
Project", "Resolving Build Errors in Stdlib". Fourteen conversations, and **zero
commits in April or May**.

May resumes with review and redesign — "Sharpee Language System Redesign",
"Reviewing Parser and Archiving Older Code", "Migrate User-Facing Strings to
Language Provider" — then June turns into a systematic migration: "World Model
Implementation Phase 1", then Phases 4, 5, 7, 8; "Trait-Based World Model
Refactoring"; "Action-Trait Migration" Phases 1.1, 3, 4. The trait system arrives
here.

Git's account of the same period is nearly silent: `Initial commit` on 2025-03-29,
then nothing until **2025-06-23**, whose message is *"wholesale refactoring - not
even going to list the changes."* Twelve weeks of work landed in one commit.

This is the texture that matters about gap 1: it is **not** absence of work. It
is work that was happening in conversations and on disk while the repository sat
untouched — which is precisely what fighting a build looks like when nothing
compiles well enough to commit.

## 20 June 2025: the record changes form

The Claude conversation archive stops on 2025-06-20. The work-summary corpus
starts on 2025-06-28 (`work-summary-2025-06-28-parser-debug.md`). Eight days
apart.

That is not a gap. It is a change of instrument: development moved from chat
conversations to Claude Code sessions, and the artifact left behind changed from
an exported transcript to a written summary. Every later phase of this
retrospective reads a record that exists because of that switch.

## One anomaly closed

Phase 1 flagged `work-history/work-summary-2025-01-03-1615.md` — headed "January
3, 2025" and describing "Core package test failures" in "the Sharpee interactive
fiction engine monorepo" — as impossible, since the repository's first commit is
2025-03-29. It offered three readings and could not choose.

**It is misdated by a year.** The file references `pnpm` eight times and the
action ID `if.action.looking`. Git dates both: `pnpm-workspace.yaml` was added
2025-07-02, and `if.action.looking` first appears 2025-06-23. Neither existed in
January 2025. The two files dated "January 3, 2025" are from **January 3, 2026** —
which sits inside the busiest month in the corpus, 444 summaries.

The consequence: **the summary corpus does not begin in January 2025.** Its true
start is 2025-06-28, exactly where the conversation archive ends. I said "roughly
nineteen months" earlier tonight on the strength of those two files; the corpus
is fourteen months, and the *project* is three years and five months.

## The eleven-month void was the first wall

Between 2023-04-03 and 2024-03-02 there is no artifact of any kind: the C#
prototypes sit untouched, and the conversation archive has not started. David's
account, given 2026-08-11:

> "the eleven month void was me trying to use the first version of ChatGPT and
> instantly giving up — those were the salad days of hallucinations and imaginary
> code"

That closes it, and it does two other things.

It **dates the ChatGPT conversations**: they are the first-ChatGPT era, spring
2023, which is consistent with everything else — the prototypes' mtimes
(2023-03-19 → 04-03), the projects those conversations enumerate, and the tone of
the transcripts themselves, which answer a request to design a parser IF platform
with ten headings about typography, security, and load balancing before David has
to say "those are great for overall application architecture, but I'm
specifically interested in interactive fiction."

And it **makes the void the first of three walls**, not an oddity before the real
story:

| | Ended | Resumed | Away | What ended it |
| --- | --- | --- | --- | --- |
| Wall 1 | 2023-04-03 | 2024-03-02 | ~11 months | hallucinated code; gave up |
| Wall 2 | 2025-03-29 | 2025-06-23 | ~12 weeks | build that would not compile |
| Wall 3 | 2025-09-02 | 2025-12-25 | ~16 weeks | complexity beyond the model's context |

The architecture in `StoryRunner` was never the thing that failed in 2023. What
failed was that no assistant of that generation could build it — and the project
waited for one that could.

## What remains unexplained

- **Whether the ChatGPT conversations sit before or after the prototypes.** They
  order themselves relative to each other and to StoryRunner — `chatgpt-3` and
  `chatgpt-4` describe **eight** projects while the copy on disk has eleven, so
  the conversations postdate 2023-04-01 and predate the final state of the code —
  but no absolute timestamp survives in them.
- **Why October and November 2025 are silent in every source at once.** That gap
  belongs to Phase 3, and it is the one David named as a capability wall.
