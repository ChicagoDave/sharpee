# ADR-322: State-Space Analysis (umbrella) — the layer split, the annotation rules, and the soundness contract

**Status**: **ACCEPTED** (2026-08-20, session 502b0b). Accepted as an umbrella: it
settles the layering, the annotation rules, the budget, the soundness contract, the
claim disposition, and the validation corpus. It authorizes no checks (D10), and
per D12 no IDE integration surface until sweeps have been measured. `packages/`
placement remains undecided and is CLAUDE.md-gated.
**Date**: 2026-08-20 (drafted session c5bc96; Amendment 1 and acceptance session 502b0b)
**Supersedes**: ADR-294 D20 (the explorer), ADR-303 (convergent paths and
unwinnable states) — both unbuilt, neither retiring running code.
**Depends on**: ADR-321 (the World Index — consumed, not extended), ADR-302 D17
(fork by re-execution), ADR-293 (determinism, forcing), ADR-276
(source-authoritative errors).
**Working document**: `docs/proposals/state-space-analysis.md` — the check
catalog, metrics, syntax sketches, staging and open questions live there and are
deliberately not decided here.

> See Amendment 1 — D11 (claim disposition, advisory by default) qualifies D1's
> L4 row and D2; D12 (measure before integrating) qualifies D6; D13 adds the
> validation corpus and the intent-neutrality test.

---

## Context

Exhaustively sweeping a Chord story's reachable state space would answer a class
of questions no static pass can: whether a state exists from which no ending is
reachable, what action created it, and how far back a player would have to go.

Three prior attempts at this exist and none shipped. ADR-292 specified a searcher
and was superseded in place by ADR-293 (*"do not implement"*, `@sharpee/skein`
never built). ADR-294 D20 specified the explorer and was accepted 2026-08-01,
unbuilt. ADR-303 specified a probe and was superseded 2026-08-20, unbuilt. Each
was drafted without knowing the previous one existed; ADR-303's fifth amendment,
written the day it was superseded, was a reconciliation with a decision three
weeks its senior.

That history is the reason this ADR is an umbrella and is thin. **The recurring
failure is not bad design — it is scope: each attempt tried to decide the whole
feature at once, and the parts with different reversibility dragged each other
down.** What follows is only the set of constraints that a future session must not
re-litigate. The catalog of checks, the metrics, and every syntax proposal stay in
the proposal document, where being wrong is cheap.

---

## Decision

**D1 — Four layers, and no two of them are conflated.**

| Layer | Name | Nature | Failure mode if wrong |
|---|---|---|---|
| L1 | The sweep | Enumerates reachable states, classifies terminals, derives the dependency graph | Wrong analysis |
| L2 | Attribution & reporting | Source spans, witness minimization, ranking, severity | Correct findings nobody acts on |
| L3 | Chord declarations | *Descriptive* — "this is what my game is" | Silently wrong analysis |
| L4 | Chord claims | *Prescriptive* — "this must be true" | Loud build failure, when the author asks for one (D11) |

L2 is a layer, not a polish pass. A finding without a source span and a minimized
witness is not usable no matter how fast L1 computed it.

**D2 — A declaration reinterprets; a claim asserts; no construct does both.** A
declaration cannot fail — if it is wrong, the analysis is silently wrong, which is
the dangerous case. A claim fails the build when violated — if it is wrong, you
find out at once, which is the safe case. (Describes the binding disposition; the
default is advisory — D11.) **A single construct that both
reinterprets a structure and asserts a property destroys the meaning of a green
build**, because passing no longer distinguishes *verified* from *suppressed*.

**D3 — Declare only where identical structure carries different intent;
otherwise infer.** Every required annotation is a tax on the author. A deliberate
ratchet-to-doom is byte-for-byte indistinguishable from an accidental unwinnable
cascade, so intent there *must* be declarable. The state signature is not
ambiguous — the IR determines it from what conditions actually read — so it must
*not* require declaration. **When a proposed annotation fails this test, the
answer is inference, not syntax.**

**D4 — No annotation may only suppress.** Marking a doom state intentional must
also assert that it remains reachable. A suppression-only marker rots the moment
an unrelated edit makes the suppressed thing impossible, and nothing tells you;
this is the observed failure mode of every lint-suppression system ever shipped.
**Every L3 declaration carries an L4 obligation.**

**D5 — Syntax is decided last.** It is the least reversible layer. L3 and L4
grammar is added only when real stories demonstrate that inference cannot
distinguish intent — not in anticipation of it.

**D6 — The performance budget is a constraint this project picks, not a
measurement it awaits.** Under ~2 seconds on a real story. The budget is chosen
because it changes what the feature *is*: above ten seconds this is a batch tool
authors run twice a year; under two it runs on every save and becomes a **compiler
diagnostic**, reported through ADR-276's source-authoritative error channel. (Which
of those it turns out to be is measured, not assumed — Amendment 1, D12.)
Designs that cannot hold the budget are the wrong designs, and instrumentation
exists to say which mitigation is needed now rather than to adjudicate the target.

**D7 — The soundness contract holds at any speed**, carried from ADR-294 D20
unchanged: **findings are real** — a reported finding reproduces by construction —
and **absence is not proof**. The tool never reports that no unwinnable states
exist. It reports that none were found within a stated budget, and **the budget
and the pruning rule are part of every report.** Speed makes that line a formality
on small stories; it does not make it optional.

**D8 — Consume ADR-321's derivations; do not rebuild them.** Reach is a static IR
pass, obstacle-aware, iterated to a fixed point, already recomputed on every build.
It ships unreachable rooms and things, exits resolving to no room,
blocked-with-reason, undescribed things, unnamed tools, and — in `lifted`, with
each obstacle's `pass` and `requires` — **the puzzle dependency graph**. Anything
here that needs a dependency DAG consumes that one.

*The cheap alternative is already refuted, by measurement.* ADR-321 D14 implemented
a static scan against Fernhill and rejected it: the two chains are the same size
and a different set, the scan inventing two doors that gate nothing and missing
both machine triggers. **Wrong in both directions at once, which is worse than
under-counting, because the count looks right.**

**D9 — The finding vocabulary stays open.** A small closed severity set (**it is
the compiler's own — see Amendment 1**); an open category namespace. Fixing the taxonomy early makes the L4 claims block
unretrofittable, because canned checks are meant to become a standard library of
claims rather than hard-coded passes. **L2 is designed against an open vocabulary
from day one, while only built-in checks exist.**

**D10 — This umbrella decides no checks.** It decides the layering, the annotation
rules, the budget, the soundness contract, and what is consumed. Which analyses
ship, in what order, with what output, is the working document's business and its
children's.

---

## Non-goals

- **Not a quality metric.** The sweep can establish that a failure is reachable,
  how far back it diverged, and whether the player could have known. It cannot
  establish whether the failure is *good*.
- **Not cruelty reduction.** The goal is deliberateness, not mercy — cruel games
  need this more, not less, because a large deliberate doom surface is where an
  accidental one hides.
- **Not a replacement for playtesting.** It reports what is structurally true.
- **Not a fixed list of analyses** (D9).

---

## Consequences

**The children are staged by reversibility, not by value.** Expected: *where the
sweep lives and what its result contract is* (the only child blocking code —
`packages/` placement is CLAUDE.md-gated and undecided); *L3 declarations*, when
and only when inference demonstrably fails; *the L4 claims block*, once D9's
vocabulary has settled under real use.

**D6 and D7 pull against each other, deliberately.** A two-second budget invites
treating the result as complete; D7 forbids saying so. Both survive: the budget
governs the design, the contract governs the report.

**D8 makes this feature a dependent of ADR-321** rather than a peer. If Reach's
fixed point changes shape, the dependency graph consumed here changes with it.
That coupling is preferred to a second implementation that would drift.

**Three superseded attempts is the thing to notice.** ADR-292, ADR-294 D20 and
ADR-303 each specified this feature and each was written without the previous. The
countermeasure is that this document is the one place to look, and that it stays
small enough to stay true.

---

## Acceptance

- **AC-1** — No shipped construct both reinterprets a structure and asserts a
  property (D2). Checkable by inspection of each L3/L4 construct as it is proposed.
- **AC-2** — Every L3 declaration has a stated L4 obligation (D4). A declaration
  proposed without one is rejected at review.
- **AC-3** — Every finding report names its budget and its pruning rule (D7). A
  report that omits either fails, regardless of what it found.
- **AC-4** — No dependency-graph derivation exists outside ADR-321's `lifted`
  (D8). Checkable by absence.
- **AC-5** — The severity set is closed and the category namespace is open (D9);
  adding a category requires no change to L2. The closed set is `DiagnosticSeverity`
  (Amendment 1), so this is checkable against a type rather than a convention.

---

## Session

Session c5bc96, 2026-08-20, branch `feat/adr-321-world-index`. Written after a day
that produced five amendments to ADR-303 and then discarded them: the review loop
kept finding defects in the previous amendment rather than asking whether the
document should exist, and the discovery that ADR-294 D20 had specified the same
feature three weeks earlier only came out of an unrelated errand.

The analysis this umbrella governs was written in parallel by David and Claude
Desktop as `docs/proposals/state-space-analysis.md`, which is both broader and
better-layered than the ADR-303 work; the contribution from this session's side was
the prior art it had been written without, folded into that document in a second
pass. **The thinness of this ADR is the lesson from the day, not modesty.**

---

## Amendment 1 (2026-08-20, session 502b0b)

Three additions, at David's direction. First: **the claims block needs a line that
says how its claims are reported, because an author may want messages or may want
a failed build, and both are legitimate.** D1's table and D2 both read "a claim
fails the build," stated as if it were a property of claims rather than a choice
the author makes. D11 makes it the choice it always was, and pins the default at
**advisory** — David's call, on the ground that the block has to be writable
against an unfinished story or authors will never write it at all. Second, D12
holds the *IDE integration* until real sweeps have been run and measured — the
budget stays chosen, but which product it makes is not decidable in advance. Third,
D13 records the validation corpus a source-available, owned, independently reviewed
story makes available for the first time — including the test the tool is most
likely to fail.

### D11. A claim's disposition is authored; the default is advisory

**A claim has three outcomes, not two.**

| Outcome | Meaning |
|---|---|
| **held** | The sweep decided the claim and it is true |
| **violated** | The sweep decided the claim and it is false — a witness exists |
| **unproven** | The sweep hit the budget or a pruning rule before it could decide |

**The disposition lives inside the `claims` block — not in the `story` header —
and maps those outcomes onto the compiler's existing two severities.** It governs
one block, so it is read where the failing build is explained, not in story-wide
metadata sixty lines away.

| Disposition | violated | unproven | held |
|---|---|---|---|
| **advisory** (default) | `warning` | `warning` | counted in the report |
| **binding** (marked) | `error` — build fails | `error` — build fails | counted in the report |

No new reporting mechanism is introduced. `DiagnosticSeverity` is already
`'error' | 'warning'` (`packages/chord/src/diagnostics.ts:13`) and build success
is already defined as no error-severity diagnostic (`diagnostics.ts:48`,
`index.ts:45`). A claim violation is a diagnostic like any other, carrying its
span through ADR-276's source-authoritative channel; the disposition chooses
which method reports it.

**Advisory is the default because a story spends nearly all of its life in
draft.** A binding default breaks the build on the day the author writes their
first claim, against a story that is not finished and was never going to satisfy
it yet. What that teaches is not rigor — it is to not write claims until the end,
which is the point at which they have the least left to catch. The block has to be
writable early to be worth having.

**Binding is the marked case because a gate is the stronger statement.** *"This
must hold or do not ship"* asserts more than *"check this for me,"* and the
stronger statement is the one that should have to be made out loud. An author
reaching for a build gate knows they are reaching for one.

**Advisory is never silent — that is what keeps D2 coherent.** D2's argument is
that a green build must distinguish *verified* from *suppressed*. Under an
advisory default a green build was never a claim certificate to begin with, so
the argument re-homes rather than lapses: **every build prints the claim tally —
how many held, how many violated, how many unproven — regardless of disposition.**
Downgrading severity is not suppression; going quiet is. A disposition that
silenced its claims would be the suppression-only annotation D4 forbids, and no
such disposition exists.

**Unproven is never reported as held**, at either disposition. D7 says absence is
not proof. If a truncated sweep let *always winnable* pass, the budget would
launder itself into a certification — the exact failure D2 names, arriving by a
different route. The author's remedies (raise the budget, narrow the claim, accept
the warning) are the same either way; only the loudness changes.

**The disposition is source, not a flag.** A CLI switch would make the build
result depend on how the build was invoked, so a local run and a CI run could
disagree about the same commit — and the author who most needs the gate would be
the one who turned it off last Tuesday and forgot.

**Per-claim override is not decided here.** Block-level is the whole grammar for
now; a per-claim downgrade is the construct that rots quietly, and D5 says syntax
is decided last. Syntax for the disposition itself likewise stays a sketch in the
working document.

**Scope note.** D1's L4 row now reads *"build failure when the author asks for
one"*, and D2's "a claim fails the build when violated" describes the binding
disposition rather than every claim. D2's actual invariant — that no construct
both reinterprets and asserts — is untouched: a disposition changes how loudly a
claim is reported, never what it means, and never reinterprets a structure.

**One word, one meaning: D9's severity set is `DiagnosticSeverity`.** D9 requires a
small closed severity set alongside its open category namespace, and D11 reports
through `'error' | 'warning'` (`packages/chord/src/diagnostics.ts:13`). Those are
the same set, not two that happen to share a word. The analysis invents no third
level: build success is already defined on exactly these two
(`diagnostics.ts:48`), and a finding that would want *info* is a `warning` whose
category says what it is — which is the division of labour D9 asked for, severity
closed and category open. AC-5 is therefore checkable against a type rather than a
convention.

### D12. How this connects to the IDE is decided after measurement, not before

**No IDE integration surface is specified or built until real sweeps have run on
real stories and their performance is measured.** David's call. What waits is the
*connection*, not the sweep — the sweep is how the numbers get made, so gating it
behind a measurement would be circular.

**D6 already names two regimes, and they are different products.** *"Above ten
seconds this is a batch tool authors run twice a year; under two it runs on every
save and becomes a compiler diagnostic."* Those differ in trigger, in surface, in
what an author does with the output, and in what a stale result costs. D6 states
the budget as a chosen constraint and that stands; what D12 removes is the
*conclusion* D6's sentence smuggles alongside it — that the on-save diagnostic is
therefore the integration. **It is the hypothesis the measurement tests.** Building
the wiring for it first means committing the IDE to a performance profile the sweep
has not been shown to have.

**The measurement has to cover the cases the IDE must also survive**, not only the
good one. Three, and the corpus supplies only the first:

- **Real stories.** Fernhill first, per the working document's reasoning that it is
  the right pilot precisely because it is not clean. Then Ides of March, thealderman.
- **A story larger than any that exists here.** Measured 2026-08-20, the largest
  Chord story in the repository is `branch-stories/fernhill/fernhill.story` at 1,155
  lines (thealderman 938, Ides of March 921). Source lines are not what explodes —
  **independent state bits are** — so the scaled sample is synthesized on that axis
  and reported as a curve. *"We ran it on the biggest thing we have"* is evidence
  that reads as a result and functions as an assumption.
- **A story the sweep must decline.** Generative entity spaces, where the reachable
  object set is produced at runtime rather than enumerable from source.
  *Counterfeit Monkey* is the exemplar: the letter-remover synthesizes objects
  combinatorially over a lexicon, and validate-only pruning gives nothing back
  because most of those commands really are valid. No budget survives that and no
  engineering makes it survive — it is a different class of story, not a bigger
  instance of this one. **The IDE needs an answer for that case as much as for the
  two-second one**, and the answer cannot be a spinner.

**Dungeo is not the large sample, on two independent grounds.** It has no `.story`
file — it is TypeScript under `stories/dungeo/src/` — so it is not a Chord IR sweep
target at all, and the working document's line naming it the stress test is wrong on
mechanism, not merely on policy. It is also an MDL-mirror outlier that is not a
yardstick for Chord work.

**What the numbers decide.** Whether the sweep is an on-save diagnostic, a
save-triggered background job whose findings land when they land, an explicit
command, or some split by story size — and what the IDE shows while a sweep is
running, when one is stale, and when one has declined. Those are ADR-worthy and none
of them is decided here.

### D13. The validation corpus, and what each part of it validates

D12 measures speed. **Nothing in this document yet says how anyone would know the
findings are *true*** — the corpus could not answer it, because every Chord story
here was written by this project, against this project's assumptions, with no
independent judgment attached. *Jack Toresal and The Secret Letter* (Gentry &
Cornelson, Textfyre, 2009, Inform 7) changes that: it is source-available and
owned, it has published reviews, playtest transcripts, and the designers' own
puzzle diagrams. Three distinct validations follow, and they check different
things.

**1 — Reachability, against paths humans actually walked.** Five playtest
transcripts survive (`SecLet-EE07.txt`, `SecLet-EE08.txt`, and three smaller),
recorded in 2007-2010 in a clean `>command` / response format. **Any path in them
that the sweep reports as unreachable is a defect in the sweep.** D7's soundness
contract — *findings are real* — has no other way to be checked against reality;
this is a labelled set produced by people who had never heard of this tool and had
no stake in its results.

**2 — The derived dependency graph, against the one the designer drew.**
`Grubber's Market Puzzle.vsd` and `Orphan Map.vsd` are the puzzle diagrams from
the game's own design archive. D8 asserts ADR-321's `lifted` *is* the puzzle
dependency graph; this compares that derivation to a graph drawn by the person who
built the puzzle. It is the same validation move ADR-321 D14 already used — derive
it, compare, count what was invented and what was missed — with a stronger
comparison target.

**3 — Intent-neutrality, and this is the one the tool is most likely to fail.**
Every Textfyre story was written against a design invariant: **a non-IF middle
school audience**. The structure follows from it — a strictly linear scene chain,
a large hint apparatus, ~1,192 authored response rules over 32 rooms. Reviewers
called this out as a lack of agency, and they were describing the design working as
specified, not failing.

So Secret Letter is a story whose agency metrics are **extreme and correct**. A
tool that reports them as a problem has violated its own non-goal — *"it cannot
establish whether the failure is good"* — and ADR-294 D22's intent-neutrality with
it. The correct output is the numbers, plus the observation that they are extreme,
plus no verdict. **This is a harder test to pass than catching the complaint, and
it is the one worth running**, because the failure mode it probes is the one that
makes an analysis tool obnoxious rather than merely wrong.

**The corpus argued for a declaration, which is how D3 and D5 said this should
go.** A deliberate linear spine for a young audience is byte-for-byte
indistinguishable from accidental railroading; no inference over the IR separates
them. That is D3's test for when intent *must* be declarable rather than inferred,
met by real material rather than in anticipation of it — which is what D5 asks for.
Its D4 obligation is the natural one: the declaration asserts the spine is still a
chain, so it fails loudly when a later edit branches it and nobody updates the
declaration. **The sketch belongs in the working document, not here** (D5, D10);
what this ADR records is that the first L3 declaration to clear D3's bar was
produced by a sample rather than by a designer at a whiteboard.

**Secret Letter is not the performance sample.** Large source, small state space —
12,635 lines over 32 rooms with a linear spine will likely sweep in milliseconds.
D12's scaling curve still needs the synthesized story; these are two different jobs
and conflating them would leave both unmeasured.

### Acceptance (extends the list above)

- **AC-6** — Every claim report names the block's disposition and gives each
  claim's outcome as held / violated / unproven. A report that collapses unproven
  into held fails, at any disposition. This is D7/AC-3's rule applied one level
  down: the budget is named in the report, and so is each claim the budget stopped
  short of deciding.
- **AC-7** — The claim tally is printed on every build at every disposition (D11).
  A disposition that produces no output when claims are violated fails, because a
  silent disposition is the suppression-only annotation D4 forbids.
- **AC-8** — No IDE integration surface is specified or built before measured sweep
  numbers exist for real stories, a state-bit-scaled synthesized story, and a
  declined generative-space story (D12). Checkable by date: the measurements predate
  the first integration commit.
- **AC-9** — The sweep declines a generative entity space in bounded time with a
  stated reason rather than returning a tally (D12). A sweep that reports findings
  over a generative space fails, however fast it did so — under D7 that failure is
  worse than slowness, because it looks like an answer.
- **AC-10** — No path in the Secret Letter playtest transcripts is reported
  unreachable (D13). One that is, is a sweep defect, not a transcript defect.
- **AC-11** — Run against Secret Letter, the tool reports its agency metrics
  without a verdict (D13). Any output that characterizes the design as deficient
  fails, however accurate the numbers are.
