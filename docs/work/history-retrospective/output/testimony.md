# Testimony

David's own account of things the archive records but cannot explain. Kept
separate from the analysis on purpose: an absence has no cause written in it, and
a pattern in the commits does not say what the person doing it believed. All
given 2026-08-11, while the retrospective was being assembled.

---

## On the silences

> "the silences are when I hit a wall in context and model capability to handle
> complexity and walked away"

> "the eleven month void was me trying to use the first version of ChatGPT and
> instantly giving up — those were the salad days of hallucinations and imaginary
> code"

Three walls, from git and file mtimes:

| | Work stops | Resumes | Away |
| --- | --- | --- | --- |
| Wall 1 | 2023-04-03 | 2024-03-02 | ~11 months |
| Wall 2 | 2025-03-29 | 2025-06-23 | ~12 weeks |
| Wall 3 | 2025-09-02 | 2025-12-25 | ~16 weeks |

The return from wall 3 falls on the same day as the first commit attributed to
Opus 4.5, and the month that follows is the largest in the project's history.

## On what ended the third wall

> "Opus 4→4.5, the Pro Max subscription, and the original 200k context window is
> what catapulted the work forward. Claude was _finally_ able to maintain an
> entire repo of complex architecture."

Three things, not one — and the distinction is the whole point.

The archive can see only the first. Commit trailers show the model line changing:
bare `Claude` through August 2025, then `Claude Opus 4.5` on `987ba181`,
2025-12-25, the commit that ends the sixteen-week silence. That correlation is
real but thin on its own, and the `capability-and-devarch` tracer was right to
flag confounders.

The other two are invisible to the archive and were decisive. A **subscription
tier** is not a code artifact; it governs how much work can be attempted before
the session stops, which is exactly the constraint a 33-package monorepo runs
into. And a **200k context window** is the difference between answering a
question about a file and holding a repository's architecture in view at once.

David's phrasing is precise about which capability mattered: not writing better
code, but being *"able to maintain an entire repo of complex architecture."* That
is a claim about scope of comprehension, not quality of output — and it explains
why the wall broke where it did. The problem was never a hard algorithm. It was
that Sharpee's difficulty is distributed: a change to the parser touches the
grammar, the standard library, the language package and the tests, and a
collaborator that cannot see all of them at once produces work that has to be
redone.

It also predicts the shape of what followed. If the constraint was breadth of
context, the correct response is to make the repository legible in bulk — and
that is precisely what the next eight months did: a generated 21,265-line API
reference built specifically so the model would stop reading source, ADRs as
durable decisions, session summaries as recoverable state, and eventually DevArch.

## On why the language changed

> "the catalyst for the change from C# to TypeScript was my frustration with
> Claude writing C#… I asked, rank the best platforms by Claude's capability…and
> you came back with Level A being Python and TypeScript. I asked, 'What would
> Sharpee look like in TypeScript?' and that was the beginning."

This overturns the reading the archive supports on its own. The two conversations
of 2024-12-14 — "Translating Graph-Based C# to TypeScript" and "Evaluating C# 8
to TypeScript Migration" — look like the decision, and they are staged,
adversarial, and settled on technical grounds ("given a 'story' would always be
single-user single-threaded…"). But they are the **evaluation**, not the
catalyst. The catalyst was that the assistant was worse at the language the
project was written in, and the question that started it was not *which language
is better* but **which language is this collaborator better at**.

That is the deepest version of the dependency this retrospective traces. The
project did not merely wait for capability; at the decisive moment it **reshaped
itself around where the capability was**. A 2,700-line C# codebase and two years
of design were abandoned because the tool was stronger somewhere else.

**Neither conversation is in the archive.** Searching all 230 exports for the
ranking question, for "Level A", and for "what would Sharpee look like" returns
nothing on the human side. David:

> "some conversations were in the web app and it was hard to save context"

That is the primary reason; the structural one reinforces it. Every export
carries `"extraction_method": "exact_title_match"` and
`"source": "claude_project_sharpee"`, so the archive is what lived inside the
Sharpee project folder — and a general question about model capability across
languages would not have been filed there. The 2024-11 → 2025-02 conversation gap
is where it most likely sits.

The caveat that follows is uncomfortable and belongs in the open: **the archive
is the record of work that was easy to keep, not of everything that happened.**
It over-represents eras with good tooling — Claude Code writes a summary per
session; the web app wrote nothing unless someone exported it — and it
under-represents moments of decision, which are short and tend to happen
somewhere other than where the work is. At least one of them changed the language
the platform is written in.

## On why the graph became a spatial index

> "The TS work also ran into my bidirectional graph and we started a conversation
> about 'What data storage patterns would be optimal?' and you explained why the
> spatial index was better than the graph."

The Phase 4 tracer established *that* the 2023 reciprocal-edge invariant was
abandoned on 2025-07-02 — `SpatialIndex` made containment the single parent
pointer the C# prototype had explicitly refused — and could say nothing about
why. This is the why: not drift, not forgetting, and not a decision made by
whoever happened to be typing. A deliberate design conversation asked what the
optimal storage pattern was, and the answer argued against the structure the
project had been carrying since 2023.

It also explains a detail the tracer flagged as odd. ADR-015 defends the spatial
index by citing **Unity Transform, Unreal attachment, and Guava BiMap** — game
scene graphs — rather than the property-graph literature the original design came
from. That is what a fresh answer to "what is optimal *for this*" looks like,
rather than an amendment to an existing design.

## On the fundamentals, and on deferring the text service deliberately

> "the architecture's fundamentals have never wavered…small changes here and
> there, but it all held as the stdlib was ironed out, the world model designed
> and implemented, then the engine and text emission process….and the original
> text-service was an absolute piece of garbage that I intentionally ignored
> during the dungeo port because that was exposing and closing seams in the
> middle of the platform…and then I was at the point where _that_ had to be
> fixed"

Two claims, and both change how the record reads.

**The order of attack was deliberate**: stdlib, then the world model, then the
engine and text emission. That is core-outward, and it is why the deletions
cluster where they do — 79% of live stdlib files and 66% of live world-model
files predate 2026, while the output path was rebuilt repeatedly. The middle was
settled first and then left alone; the edge stayed in play because it was still
being decided.

**The text service was not a series of failed attempts. It was a known-bad
component held at arm's length while something more valuable ran.** That is a
different thing from confusion, and the commit record shows it plainly:

| Month | `packages/text-service*` | `stdlib` + `world-model` |
| --- | --- | --- |
| 2025-08 | 17 | — |
| **2025-12** (Dungeo launch) | **4** | **49** |
| **2026-01** (the redesign) | **52** | 98 |
| 2026-05 (ADR-174 deletes it) | 7 | 14 |

December 2025 is the tell. The month that launched Project Dungeo — and forced a
scheduler, an NPC system, a combat service, entity event handlers, transcript
testing and two-layer scoring into the platform — gave the text service four
commits against forty-nine for the core. Then January inverts it: fifty-two.

The reasoning is the part worth keeping. Dungeo was *"exposing and closing seams
in the middle of the platform"*, and fixing the output path would have competed
with that for attention while changing none of those seams. So the bad component
was carried, on purpose, until the higher-value work was done — and then it had
to be fixed, and was.

That is a sequencing judgment, and the archive alone would have scored it as
neglect. A retrospective reading commit density would see the text service
ignored during the busiest month of the project's life and conclude the project
had lost track of it.

## On the stdlib action refactors

> "the stdlib refactoring was me designing an atomic set of actions (stdlib) over
> and over and I can tell you it was more than three refactors…it was dozens and
> what came out was first the three phases, then later the fourth."

The digests reported 2025-12-26 as a curiosity: all 43 stdlib actions refactored
**three times in one day**. That day is real, but reading it as an anomaly gets
the story backwards. It is one visible slice of a campaign that ran the length of
the project.

Measured directly: **232 commits touched `packages/stdlib/src/actions`, 144 of
them carrying refactor / migrate / phase / pattern / convert / rewrite in the
subject line**, spread across thirteen months — 29 in August 2025, 38 in December
2025, 43 in January 2026, 26 in April, 49 in July. Twenty-seven ADRs address the
action pattern, from ADR-005 (July 2025) to ADR-296 (August 2026).

And the goal has a name in the ADR titles. ADR-058, August 2025: *"Action Report
Function for **Atomic** Event Generation."* The word was in the design a year
before this retrospective went looking for it.

The sequence David gives — three phases first, the fourth later — is visible in
the artifacts: `validate/execute/report` is what CLAUDE.md documents under
ADR-051, and `blocked()` arrives in the December 2025 rework. So the December day
is not "the project could not decide." It is the day a long search converged, ran
one candidate to completion, rejected it in writing, and ran the successor.

This matters for how the whole build-then-delete pattern should be read. A single
day of triple rework looks like thrash. Thirteen months of iteration toward an
atomic action set, with the winning shape arriving in two stages, is **design by
repeated construction** — which is only affordable if wholesale refactoring is
cheap, and is the same insight below in another form.

## On large-scale refactoring

> "that was one GenAI + SDLC insight I had: refactoring whole swaths of code is
> workable"

This is the interpretive key to the project's most distinctive pattern — work
built to completion and then deliberately replaced — and it should be read
*before* anyone concludes that the deletions were waste.

The corpus corroborates it as a change in what was economically possible, not
merely a change in appetite. Instances the monthly digests record, each a
whole-codebase sweep completed inside a session or two:

- **1,035 `as any` casts driven to zero** across `packages/*/src` in nine phases
  (March 2026)
- **418 templates and 236 `entityInfoFrom` call sites** migrated in a single
  99-agent parallel workflow, then the legacy formatter chain deleted (June 2026)
- **79 files** migrated off `action.success`/`action.blocked` to domain events,
  deleting the text service's action handler entirely (March 2026)
- **106 call sites** stripped of `.withPriority` when ADR-266's grammar
  malleability landed (July 2026)
- **~30 stdlib actions** migrated across five phases for ADR-097's domain-event
  collapse (January 2026)
- **2,510 ESM specifiers across 607 files** corrected when every `dist-esm` in the
  repo turned out to be invalid real-Node ESM (July 2026)
- **All 43 stdlib actions refactored three times in one day** — three-phase to
  `report-helpers` to four-phase with `blocked()` — after a self-authored
  architectural assessment declared the middle version wrong (2025-12-26)

Read against the pre-GenAI economics of software, that list is the point. A
1,035-site type cleanup or a 418-template migration is not something a solo
author schedules; it is something a solo author designs around and lives with.
When the cost of a sweeping change falls far enough, the decision to keep a
mediocre abstraction stops being a foregone conclusion — and the observable
consequence is a codebase that changes its mind in public.

The claim this licenses is narrow and worth stating precisely: **it does not say
the deletions were free.** It says the constraint that normally prevents them was
lifted, so each one became a judgment about design rather than a judgment about
budget. Whether each individual call was right is a separate question, and the
`build-then-delete` throughline is where it gets asked.

## How to use this file

Testimony is evidence, not conclusion. Where the analysis leans on one of these
statements, it should say so — and where the archive contradicts one, the
contradiction is itself a finding worth reporting rather than smoothing away.
