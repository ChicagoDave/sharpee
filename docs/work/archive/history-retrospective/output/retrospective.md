# Sharpee: a retrospective

*March 2023 → August 2026. Written 2026-08-11 from 1,247 session summaries, 230
conversation exports, 2,055 commits, 318 ADRs, and three C# prototypes with no
version control at all.*

---

## The short version

A parser interactive-fiction platform was designed in C# in March 2023 and could
not be built. It was put down for eleven months, picked up, rebuilt in
TypeScript, put down twice more, and finished. On 10 August 2026 it published
33 packages to npm as version 5.0.0, along with a language, a macOS app, a
website, and a 31-chapter manual.

The interesting part is not that it shipped. It is that **the design was never
the bottleneck.** The decomposition in the April 2023 prototype — a world model,
a data store, a grammar library, a parser library, a standard library, a text
service — is recognizably the shape of the platform that exists now. What the
project waited three and a half years for was not a better idea. It was a
collaborator that could hold the idea long enough to build it.

## Three walls

The record has three long silences, and none of them is a vacation.

| | Work stops | Resumes | Away |
| --- | --- | --- | --- |
| Wall 1 | 2023-04-03 | 2024-03-02 | ~11 months |
| Wall 2 | 2025-03-29 | 2025-06-23 | ~12 weeks |
| Wall 3 | 2025-09-02 | 2025-12-25 | ~16 weeks |

David's account: *"the silences are when I hit a wall in context and model
capability to handle complexity and walked away,"* and of the first,
*"trying to use the first version of ChatGPT and instantly giving up — those were
the salad days of hallucinations and imaginary code."*

An archive cannot produce that. Absence has no cause written in it; a reader with
only the files would guess vacation, other projects, lost records, and would be
wrong three times.

What the archive *can* do is corroborate. The commit that ends wall 3 —
`987ba181`, Christmas Day 2025 — is the first commit in the project's history
carrying a `Co-Authored-By: Claude Opus 4.5` trailer. The month that follows is
the largest the project ever had: 429 commits, 446 session summaries, roughly a
third of the entire corpus in 31 days.

But the trailer is one of three things that changed, and the other two leave no
trace in any repository. David:

> *"Opus 4→4.5, the Pro Max subscription, and the original 200k context window is
> what catapulted the work forward. Claude was **finally** able to maintain an
> entire repo of complex architecture."*

A subscription tier governs how much work can be attempted before a session
stops — the binding constraint on a 33-package monorepo, and invisible to git. A
200k context window is the difference between answering a question about a file
and holding an architecture in view at once.

The precision of that last sentence is what matters. The capability that broke
the wall was not writing better code; it was **maintaining an entire repo of
complex architecture**. Sharpee's difficulty was never a hard algorithm — it is
that the difficulty is *distributed*. A change to the parser touches the grammar,
the standard library, the language package, and the tests, and a collaborator
that cannot hold all of them at once produces work that has to be redone. Which
is what the whole of 2025 looks like in the record.

It also predicts what came next. If the binding constraint is breadth of context,
the right response is to make the repository legible in bulk — and that is
exactly what the following eight months produced: a generated 21,265-line API
reference built specifically so the model would stop reading source, ADRs as
durable decisions, session summaries as recoverable state, and eventually DevArch.
The project's process was not bureaucracy. It was **context engineering**, in the
literal sense.

Wall 2 is subtler and worth more. It looks like absence in git — one commit on
2025-03-29, nothing until 2025-06-23 — but the conversation archive shows 39
conversations in the same window, titled *"Fixing TypeScript Errors in Sharpee,"*
*"Resolving Build Errors in Stdlib,"* *"Checking Build Command Status."* That is
not someone who stopped. That is someone fighting a build that would not compile
well enough to commit, until twelve weeks landed in one commit whose message is
*"wholesale refactoring - not even going to list the changes."*

So the walls are not uniform. One is a tool that could not do the work at all,
one is a codebase that had outrun its author's ability to keep it green, and one
is complexity outrunning what any available model could hold. Only the third fits
the simple story.

## The decision the archive cannot see

The two conversations of 14 December 2024 — *"Translating Graph-Based C# to
TypeScript"* and *"Evaluating C# 8 to TypeScript Migration"* — read like the
moment the language changed. They are staged (data store first, then grammar and
parser), adversarial (the second human turn is just *"Any cons?"*), and settled
on technical grounds: *"given a 'story' would always be single-user
single-threaded and most games rarely reach 100 'locations' and 50 'objects',
any change in your assessment?"*

They are the evaluation. They are not the catalyst. David:

> *"the catalyst for the change from C# to TypeScript was my frustration with
> Claude writing C#… I asked, rank the best platforms by Claude's capability…and
> you came back with Level A being Python and TypeScript. I asked, 'What would
> Sharpee look like in TypeScript?' and that was the beginning."*

That is a different question from the one the archive records. Not *which
language is better for this problem*, but **which language is this collaborator
better at** — and then a 2,700-line C# codebase and two years of design were set
down because the answer was somewhere else.

It is the deepest form of the dependency this retrospective traces. The walls are
a project waiting for capability. This is a project **reorganizing itself around
where the capability already was.**

And neither conversation is in the archive. Searching all 230 exports for the
ranking question, for "Level A", for "what would Sharpee look like" returns
nothing on the human side.

There are two reasons, and David supplies the one that matters:

> *"some conversations were in the web app and it was hard to save context"*

The other is structural and visible in the files: every export carries
`"extraction_method": "exact_title_match"` and `"source": "claude_project_sharpee"`.
The archive is what lived inside the Sharpee project folder. A general question
about which languages a model is strongest at would not have been filed there —
and if it happened in the web app, saving it at all was work.

So the caveat has to be said plainly, and it applies to every conclusion in this
document: **the archive is the record of work that was easy to keep, not the
record of everything that happened.** It over-represents the eras with good
tooling — Claude Code writes a summary per session; the web app wrote nothing
unless someone exported it — and it under-represents the moments of decision,
which tend to be short conversations held somewhere other than where the work
was. At least one of those decisions changed the language the platform is
written in.

A retrospective assembled only from artifacts would have reported the December
evaluation as the decision, cited it confidently, and been wrong. It took a
person in the room to say otherwise.

## What survived, and what only looks like it survived

David's own account of the shape of the whole thing:

> *"the architecture's fundamentals have never wavered… small changes here and
> there, but it all held as the stdlib was ironed out, the world model designed
> and implemented, then the engine and text emission process."*

That is confirmed by the record, and it names the order of attack: **core
outward**. It also explains the distribution of everything else in this document.
79% of live stdlib files and 66% of live world-model files predate 2026, while the
output path was rebuilt six times and the product edge was deleted repeatedly.
The middle was settled first and then left alone. The edge stayed in play because
it was still being decided.

It is tempting to read the 2023 prototype as prophecy. It is not, and the
difference matters.

**The decomposition survived.** Of StoryRunner's eleven C# projects, five have
direct descendants: `WorldModel` → `world-model` (the only exact name match),
`GameEngine` → `engine`, `ParserLibrary` → `parser-en-us`, `StandardLibrary` →
`stdlib`, `Common` → `core`. That is real, load-bearing continuity — the seams
cut in April 2023 are the seams the platform still has.

**The specific invariants did not.** The prototype's `World.cs` refuses one-way
links outright — `throw new Exception("All connected nodes must be
bidirectional.")` — and publishes an event on every node, edge, and property
change. Both are gone. `SpatialIndex`, added 2025-07-02, made containment a
single-parent tree with a derived child index: exactly the parent pointer the
prototype refused to be. Not one of the C# edge-type names appears in
`packages/world-model/src` today. The surviving `addRelationship`/`getRelated`
API is forward-only, has zero production callers, and its own unit test asserts
that the reverse lookup returns `false`. `updateEntity` carries a commented-out
*"Future: Could emit change events here."*

And `TextService` — a project in the 2023 solution — was deliberately deleted on
2026-05-10.

The graph did not fade out. It was argued out. David:

> *"The TS work also ran into my bidirectional graph and we started a
> conversation about 'What data storage patterns would be optimal?' and you
> explained why the spatial index was better than the graph."*

That explains a detail the tracer flagged as odd without being able to account
for it: ADR-015 defends the spatial index by citing **Unity Transform, Unreal
attachment and Guava BiMap** — game scene graphs — rather than the property-graph
literature the 2023 design came out of. Those are the citations of a fresh answer
to "what is optimal for this," not an amendment to an existing design.

This matters because the honest version is more interesting than the flattering
one. Sharpee did not carry its first design forward intact. It kept the
decomposition, deliberately argued its way out of the mechanisms, and in July
2026 an outside user asked for typed relationships and got an ADR that treats
them as a **new idea**, with no reference to the prototype that had them in 2023.

## The pattern: build it, ship it, delete it

Roughly a third of everything ever written here is gone. Counting `.ts`, `.tsx`
and `.swift` across the whole history: **1,733 of 4,826 source files (35.9%) are
absent from HEAD**, and 259,524 of 780,240 lines ever written went into files
that no longer exist — call it 27–33% once relocations are corrected for.

The list of things built to completion and then discarded is long:
`@sharpee/text-services` published to npm on 1 January and deleted on the 14th;
a multi-user server built,
tested, and Docker-deployed to a live domain, then deleted from main four days
later; ADR-136 implemented across seven phases, +4,601 lines, then deferred
unmerged as *"a solution looking for a game"*; ADR-299's Skein shipped over nine
phases and deleted three days later; the entire `.transcript` grammar retired,
taking `branch-tester` from 397 passing tests to 86.

Read one way, that is a project that cannot make up its mind. The clearest test
case is the one the monthly digests reported as an oddity: on 2025-12-26, all 43
stdlib actions were refactored **three times in a single day** — three-phase, then
a `report-helpers` abstraction, then four-phase with `blocked()` after a
self-authored assessment declared the middle version wrong.

Taken alone that reads as thrash. It is not, and David's correction is the reason:

> *"the stdlib refactoring was me designing an atomic set of actions over and over
> and I can tell you it was more than three refactors… it was dozens, and what
> came out was first the three phases, then later the fourth."*

The measurement backs him. **232 commits touched `packages/stdlib/src/actions`,
144 of them naming a refactor, migration, phase, pattern or rewrite in the subject
line — across thirteen months**, not one day: 29 in August 2025, 38 in December,
43 in January 2026, 49 in July. Twenty-seven ADRs address the action pattern, and
one of them names the target outright in August 2025 — ADR-058, *"Action Report
Function for **Atomic** Event Generation."*

So the December day is not indecision. It is the day a year-long search converged:
a candidate run to completion, rejected in writing, and its successor built the
same day. That is **design by repeated construction** — and it is only affordable
under one condition. David's own framing, given while this retrospective was being
written, is that condition:

> *"that was one GenAI + SDLC insight I had: refactoring whole swaths of code is
> workable."*

The corpus corroborates it as a change in what was *economically possible*, not
merely in appetite. 1,035 `as any` casts driven to zero across nine phases. 418
templates and 236 call sites migrated by a single 99-agent workflow. 382
`.withPriority` call sites removed in about 21 hours. 2,510 ESM specifiers
corrected across 607 files. None of these is a change a solo author schedules
under the old economics; they are changes a solo author designs *around* and
lives with. When the cost of a sweeping change collapses, keeping a mediocre
abstraction stops being a foregone conclusion — and the visible result is a
codebase that changes its mind in public.

Two caveats keep this from being a victory lap.

The first is that the deletions are **not evenly distributed**, and the
distribution is the argument. They cluster at the product edge (clients, servers,
IDE surfaces, tutorials) and in the architecture-of-the-week layer (action
phases, event dispatch, daemon hierarchies). The domain core barely moves: 79% of
live stdlib files and 66% of live world-model files predate 2026, and
`containerTrait.ts` has been edited five times in fourteen months. The project
was not thrashing. It was thrashing *at the edges* while the middle held.

The second is that the real cost was never the deletions. It was the **residue**:
4,601 lines stranded on an unmerged branch, a 146-file "parts bin" still sitting
at HEAD, and ADR status lines describing systems deleted months ago. Deleting is
cheap now. Finishing the delete is still manual.

## The gap between done and true

Thirteen readers, working month by month with instructions to check every
completion claim against git, recorded **113 contradictions** between the session
summaries and what actually happened.

The striking thing is what they are *not*. There is no dishonesty in them and
very little deliberate over-claiming. They are two other things.

Most are **bookkeeping drift**: status lines that never got updated, denominators
that changed mid-stream, phase ledgers that fell behind. The August 2025 case
that looks worst — *"Phase 1: COMPLETE (53 actions), Pattern Consistency 100%"*
on the 10th, *"only 27.5% (11 actions)"* on the 28th — turns out on inspection to
be two different measurements: the three-phase pattern being measured on the 28th
did not exist on the 10th. Embarrassing, but not a lie.

The dangerous minority is **structural blindness** — cases where the instrument
that certified "done" was constitutionally incapable of seeing the thing it
certified:

- The transcript tester silently added a `{type:"skip"}` assertion to any command
  written without one. Those commands were **never sent to the engine**. Twenty-six
  cascading failures traced back to `disembark` and `launch` never executing, in a
  suite that had been reporting green.
- `save-restore-service.ts` shipped partially implemented in July 2025, silently
  dropping the score ledger, capabilities, state values, relationships and ID
  counters on every round-trip. It survived a 3,164-test audit and a static grader
  reporting 177 GREEN / 0 YELLOW / 0 RED — because the three tests covering it
  asserted on fields the broken code never touched. Nine months to detection.
- A phase named *"Deno Sandbox Integration — Engine Subprocess and Turn
  Execution"* was recorded DONE while its namesake deliverable was an 84-line echo
  stub, and every test asserted against the stub. To the project's credit the
  carve-out was **disclosed, not hidden** — the commit message names it and the
  session's own Status field reads INCOMPLETE.

What the project did next is the part worth keeping. It named the failure class —
**No-Stub-Under-Test** — on 2026-04-23 and promoted it into DevArch as a general
rule the same day.

Did it work? The honest answer is that **the corpus cannot support a rate claim in
either direction.** Contradictions per month sit at 7–11 across months that span
7 to 258 session summaries, which measures the readers' budget, not the project's
behaviour. What can be said is about detection: the four clearest cases run nine
months, eighteen days, eighty-seven minutes, and one session. The project did not
cure over-claiming. It got very fast at catching it.

## Sixteen years to channel I/O

The output path was rebuilt six times, and every version until the last was a
variation on one wrong shape: a *service* between the engine and the client,
producing text that something downstream had to interpret.

It should be said first that this was not six failed attempts at a problem the
project could not solve. David:

> *"the original text-service was an absolute piece of garbage that I
> intentionally ignored during the dungeo port because that was exposing and
> closing seams in the middle of the platform… and then I was at the point where
> **that** had to be fixed."*

The commit record shows the deferral rather than merely permitting it. In
December 2025 — the month Project Dungeo launched and forced a scheduler, an NPC
system, a combat service, entity event handlers, transcript testing and two-layer
scoring into the platform — `packages/text-service*` received **four** commits
against **forty-nine** for `stdlib` and `world-model`. In January it inverts:
fifty-two. A known-bad component was carried on purpose while higher-value work
ran through the middle of the platform, and then it was fixed.

A retrospective reading commit density alone would have scored that as neglect.

The answer that finally worked was not discovered. It was **recognized**. On
2026-01-13, watching a design session re-derive it from first principles, David
identified it as his own FyreVM channel I/O from around 2009–2010 — and said so
in the session.

Recognition was not enough. The January design named channels and still shipped a
text service. The April attempt failed because it modelled channels as
*destinations* to route existing text into. What actually broke it open was a
small failure on 2026-05-02: `status.score` and `status.turns` had no production
emitters, so the routing layer had nothing to route. That forced the inversion —
**a channel owns its own producer** — and once each channel produced its own
value, the text service had no job left. ADR-174 deleted it eight days later:
62 files, −4,208 lines.

Even then it was not finished. In August 2026, ADR-300 dissolved the residual
`main` channel, naming the catch-all explicitly as *"the mistake fyrevm made."*
Sixteen years to arrive at an idea, and then eight more months to stop making its
original mistake.

## The forcing functions

Sharpee's platform was not designed and then populated with stories. It was
excavated by them.

Project Dungeo — a ~191-room Mainframe Zork implementation — was launched on
2025-12-27 explicitly as dog-fooding, and inside five days it forced a scheduler,
an NPC system, a combat service, entity event handlers, transcript testing, and a
two-layer scoring system into existence. The pattern repeated with the Family Zoo
tutorial, with Fernhill, and most sharply with the book: a 31-chapter manual
written in five days, whose QA pass found `devkit@1.0.7` crashing on every
command — a defect no amount of internal review had surfaced.

The claim holds: dog-fooding found defects design review did not. But two
qualifications keep it from being a law.

A pure documentation exercise triggered the single largest cleanup in the repo's
history — writing a CS-foundations document surfaced five architectural issues in
one sitting and led to the 1,035-cast sweep, with no story involved. And the
practice has its own failure mode: Reflections, a story **deleted from the repo**
in February 2026, went on driving platform ADRs for the rest of the month as a
purely hypothetical consumer, shipping API that still has zero callers.

## The rathole that became a product

On 2026-07-10, a design session about what a writer-friendly authoring layer
might look like ended with ADR-210 accepted at 11:46 and a working compiler
running Cloak of Darkness from a `.story` file **the same day**, about ten hours
later. The month that followed produced 391 commits, 86 ADR documents, and
sixteen npm releases.

Chord did not solve the problem its own ADR cites. A paper sketch of a fluent
TypeScript API, written the same morning, did Cloak in about 90 lines against
Chord's 97 — the verbosity argument was already answered by a design nobody
built. What Chord actually solved was the **artifact** problem: a `.story` file is
inert, self-describing data that a tool can parse, diagnose, index, sandbox and
render without executing it or standing up a Node toolchain. TypeScript, fluent
or not, is a program whose meaning is only knowable by running it.

Every product surface that exists today is downstream of that one property — the
macOS app, the browser playground, the project tree, the Problems panel, the
generated reference. None of it was reachable from the fluent layer.

Then the second-order effect, which was larger than the first. ADR-222 named
Chord an **"elegance oracle"**: because Chord compiles *down* to the platform, a
Chord form cleaner than hand-written TypeScript is evidence that the platform can
be that clean and the TypeScript is a seam. A language invented as an authoring
convenience became a measurement instrument pointed back at the thing that
implements it — and it found real defects, including nineteen stdlib actions
whose interceptor surfaces were silently dead.

## The process that walked out the door

Twenty-six minutes after the commit that ended the third wall, `1723c4e8` added an
"Autonomous Work Flow" section — whose first subsection is "Context Management" —
to a 71-line `CLAUDE.md`. The first governing rule this project wrote for itself
was about running out of context, not about interactive fiction.

From there the process grew faster than the code. `CLAUDE.md`: 14 lines in August
2025, 516 by 14 January 2026, peaking at 781 on 24 April. Then something more
interesting than growth — on 2026-05-10 it was **cut roughly in half**, and it
stands at 293 lines today. The instructions stopped accumulating and started
being edited.

And on 2026-01-14, the 774-line workflow guide written inside Sharpee was pushed
**byte-identical** into a brand-new repository, `ChicagoDave/devarch`. It is now
v6.2.0 with 322 commits and 23 ADRs of its own, it was installed back into
Sharpee in March 2026, and it carries a rule-firing harness that grades nine
model lines. DevArch was not a methodology applied to Sharpee. It was extracted
from it, and Sharpee became its production validation bed.

That is the shape of the whole dependency, in the end. It began as *wait for a
model that can hold the problem.* It became *build the scaffolding that lets any
model hold it, and measure which ones do.*

## Ten signatures

Eight distinct named models signed commits here — Opus 4.5, 4.6, 4.7, 4.8 and 5;
Sonnet 4.6 and 5; Fable 5 — plus an unversioned "Claude" and a duplicate entry
for Opus 4.6's 1M-context variant. Attribution runs from 74% of commits in August
2025 to 100% in February 2026, then hovers just under (97.8% in April, 99.0% in
May, 99.6% in June).

Capacity was a live constraint, not a footnote. On 2026-07-15, four of ten
parallel audit agents were killed by token limits mid-run. The 1M-context variants
carry the long refactor days. In June, two hosts ran in parallel — one on macOS,
one on Linux — and collided badly enough to need reconciling.

And on the same day this retrospective was assembled, its own Phase 3 fan-out
read 1,247 session summaries across 13 parallel agents in seven and a half
minutes. That is the argument in miniature: the thing that made the project
possible is the same thing that made reading its history possible.

## What this record is worth

Forty-one load-bearing claims in this document were handed to verifiers
instructed to **break them**. Twenty survived unchanged. Nineteen were partly
wrong and were rewritten. Two were refuted outright — including a claim that a
TypeScript tutorial had been "deleted," when git shows nine files moved as
100%-similarity renames and still present at HEAD.

That ratio deserves to be stated plainly, because it is the same failure this
retrospective documents in the project: **not dishonesty, but confident
compression.** Every wrong claim was produced by summarizing something true and
losing the qualifier that made it true. One verifier said so directly — the
source document had hedged a percentage as a range, and the claim handed to it
had dropped the hedge.

A retrospective that found 113 cases of a record agreeing with itself after the
fact had an obligation not to become the 114th. The correction in
`origin-narrative.md` is struck through in place rather than edited away for the
same reason.

## Where it stands

Sharpee 5.0.0 is on npm — 33 packages. Chord is at 3.0.0. The website is live and
serving current documentation. The book is done. Chord Writer is signed, and on
the night this was written it was sitting in Apple's notarization queue, which
had crashed with a bus error on three consecutive submissions.

Three years and five months from *"We're going to design a new parser-based
Interactive Fiction platform using C#"* to a signed macOS app waiting on a queue.

---

### Sources

`README.md` (the index), `index-corpus.md`, `index-git.md`, `index-adrs.md`,
`index-chats.md`, `index-genai.md`, `index-origin.md`, `gaps-and-anomalies.md`,
`origin-narrative.md`, `monthly-digests.md`, `throughlines.md`,
`verification.md`, `testimony.md`, `timeline.md` — all in this directory, all
re-derivable from the scripts beside them.
