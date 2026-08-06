# ADR-303: Convergent Paths and Unwinnable States

**Status**: **DRAFT** (2026-08-05, session f2a7e6) — all three open questions
resolved by interview the same session (D4, D5, D6); awaiting review and the
acceptance flip. Raised by usage after ADR-302 shipped, not by review of it.
**Date**: 2026-08-05 (session f2a7e6)
**Relates to**: ADR-302 (transcript branches), ADR-293 (forcing, coverage,
outcome search), ADR-131 (automated world explorer), ADR-300 (canonical
transcript)

---

## Context

Two things ADR-302 did not consider. Both came from David on 2026-08-05, while
reviewing the IDE's Testing surface — which is the point at which a model stops
being a diagram and starts having to hold an author's real story.

**Open world means paths reconverge.** The shape named was *"go to a room, do
something, go to a room, do one of three things, go to a room."* ADR-302 D1
gives a transcript at most one parent, so a story's tests are a forest by
construction. The implementation says as much — `tree.ts`: *"Diamonds are
unrepresentable and so need no check."* That dismisses the **validation**; it
never asks whether an author would want one. A fork that reconverges has only
two expressions today: duplicate the tail under each variant, or hang the tail
off exactly one of them and leave the others as short leaves.

This is not the question D1 settled. D1 rejected *interior addressing* —
pointing at a turn inside another file — on the grounds that any insertion into
the parent silently redirects the reference. Convergence is a different shape:
whole files, whole references, several parents.

**An unwinnable state is not a losing ending.** Fernhill authors two LOSE
endings, `dawn-lose` and `fuse-lose`. Both have prose, both are reachable, both
are tested. An unwinnable state has no ending, no message, and no test — the
game continues, and the win has quietly become unreachable. That is precisely
why it survives to ship: every other bad outcome announces itself.

Both bear on **ADR-302 D6**, "an untaken branch is a coverage fact," which has
no implementing phase, no acceptance criterion, and — until these two questions
— no motivating case beyond `0 of 12 points fired`. (Note the collision of
labels: *ADR-302 D6* is that coverage decision; *D6* below is this ADR's own
sixth decision, about the explorer.)

---

## Decision

D1–D3 are definitions; D4, D5 and D6 are mechanisms, each resolved by interview
in session f2a7e6. Nothing remains open.

**D1 — A loss is an outcome; unwinnability is a property of a state.** A loss is an
authored ending: it has a name, prose, and a place in the point-and-class
catalog (ADR-293 D2's catalog of points, D4's declared classes).
Unwinnability is the *absence* of a reachable ending — a state from which no
authored ending of the winning kind can be reached. They are not degrees of the
same thing, and a catalog that enumerates the outcomes of choice points cannot
express the second.

**D2 — The transcript tree models the test suite, never the story.** The story
is a cyclic graph: rooms connect both ways, states repeat, and the same world
state is reachable by many routes. The suite is a set of paths through it. The
IDE's branch view shows the suite and must not be read as a map of the world.
(The Miller-column treatment of that view came from the session f2a7e6 layout
mocks, not from an ADR. **Superseded 2026-08-06**: it is now **ADR-301 D2**,
which is ACCEPTED and specifies the surface — cite that, not the mocks. The
original note stood because the decision lived only in published artifacts, and
a later session rebuilt the view as a rejected layout for exactly that reason.) This matters because the two questions below
both look like "the tree is wrong" and are actually "the tree is not the thing
you are asking about."

**D3 — Whether a fork's variants converge is a claim about the story, and the
author states it.** Where a fork genuinely reconverges, running a long shared
tail once per variant tests the same thing several times; where it does not,
several tails are several honest tests that merely share a command list — which
D7 already warns against reading as structure. The difference is not derivable
from the files, so it is declared (D4).

> **CORRECTED 2026-08-05, same session.** This decision first read "duplication
> is the tripwire, not the defect", and argued that resolving Q-1 before an
> author had duplicated a tail was speculative. David's ruling: *"that is a
> legit and common puzzle sequence"* — several routes to one gate followed by a
> common continuation is standard IF construction, not an edge case.
>
> The evidence used for "speculative" was that it had not appeared in
> Fernhill's suite. The likelier reading is that **Fernhill's tests were written
> to the tool's shape rather than the story's**: `containers` replays the sherry
> toll under the note "proven fully in npcs.transcript", which is the
> single-tail workaround being taken without anyone recording it as a choice. A
> tool that quietly constrains the tests written against it produces exactly
> this evidence, and it is not evidence of rarity.

**D4 — A converging variant asserts its convergence; re-running the tail under
every route is a per-fork opt-in.** (Resolves Q-1, session f2a7e6, David's
call.) Two mechanisms, with the first as the default:

**The assertion.** A variant declares that it arrives where a named sibling
arrives — `converges-with: combination-diary` — and the harness *verifies* it
before the shared tail runs once, off the named sibling. The claim is checked,
not trusted, so "these three choices don't matter afterwards" stops being an
assumption a suite silently rests on.

**`converges-with` does not inherit.** ADR-302 D8 makes a transcript's effective
header its parent's header with the child's declared fields replacing them — so
without this clause a convergence assertion would flow down to every descendant
and assert, on their behalf, a claim nobody wrote. The field is **declared-only**,
read from the node that states it and never from an ancestor. This is the same
keying `reseedFor` already uses for the seed instruments under D8's amendment
(*"keyed on what the node DECLARED, never on its effective config"*), and for
the same reason: inheritance is right for a *setting* and wrong for an
*instruction*.

**What must match is named by the author, never inferred.** Whole-world equality
is the wrong test and would fail on everything true and irrelevant — turn
counters, NPC patrol positions, RNG stream states all differ legitimately
between routes. The author names the entities and facts that must agree. This
is the same move ADR-293 makes for randomness and D7 makes for parentage: the
platform does not guess what matters, it asks. Exact grammar is left to
implementation; the decision is that the subset is authored.

**Why the assertion beats brute force as the default.** Re-running the tail
under all three routes does catch a divergence — forty turns later, inside a
replayed tail, as a failure that does not name its cause. The assertion catches
it at the fork, immediately, and the diagnostic is the sentence an author
wants: *the world differs after `combination-tobias`*. It is both the cheaper
check and the better error. That the classic bug of this shape ("the safe won't
open if you got the combination from Tobias") is precisely what the single-tail
status quo cannot catch is what makes the default worth having.

**The opt-in.** An author who wants the tail genuinely re-run under each route
says so per fork, by letting the tail name several parents. A node with N
parents **expands to N runs**, each with a single ancestry — so every invariant
that holds today holds per run: ancestry stays one chain, D17's amended AC-5
becomes "a leaf costs its ancestry, summed over its parents", and the tree is a
forest again after expansion. In the IDE the tail appears once under each route,
which is what an alias does in several folders — the Finder idiom the branch
view already borrows.

Rejected: inferring convergence by diffing world state across siblings
automatically. It would report every legitimate difference as a finding and
train authors to ignore the surface, and it re-litigates D7 — a reading aid is
never the truth.

**D5 — Unwinnability is detected in three layers, and it is reported by the
coverage surface without entering the point catalog.** (Resolves Q-2, session
f2a7e6, David's call.)

**Where it lives.** Not in ADR-293's **point-and-class catalog** (D2's catalog
of choice points, D4's declared classes per point). That catalog enumerates the
outcomes of a *choice* — things that happen, each with a name. D1 says
unwinnability is the absence of a reachable ending, which is a property of a
**state**, not an outcome of a choice; a point has no class for it to occupy.

It is reported by the **coverage surface** — ADR-293 D15, "coverage is the
author-facing answer" — alongside ADR-302 D6's untaken divergences, where the
unit is already "a place the story can be in that nothing tests." D15 is an
aggregation over D16's trace stream rather than a bespoke format, so a second
kind of finding is a new consumer of an existing producer, not a new pipeline.

> **CITATION CORRECTED 2026-08-05, same session, by `adr-review`.** This
> decision first read "not in ADR-293 D15's outcome-class registry… it belongs
> to the coverage surface", which is self-contradictory: D15 **is** the coverage
> surface. The catalog is D2/D4. The ruling was never in doubt — the citation
> inverted it, and three sites carried the error.

**The three layers, all three wanted:**

- **Declared invariants — the assertion.** The author names what must stay
  true (*the deed must remain gettable*), and the harness checks the predicate
  per turn. The only layer that can assert something true, and it catches
  exactly what the author thought to name.
- **Irreversibility flags — the candidate set.** Report every action that
  *reduces* reachability: an item consumed, a one-way exit taken, a door shut
  for good. Needs no author input and has false positives by design, which is
  correct for a surface whose job is to raise candidates rather than deliver
  verdicts. This is the layer that finds what nobody thought to name.
- **Probing — the detector**, in two modes (below).

**Probing does not search for a win; it replays a known one.** Full reachability
is exponential and is not attempted. But a finished story already carries its
answer key — Fernhill's `the-long-night`, Dungeo's 17-file chain — so the probe
from a state S is: *replay the remaining suffix of the known winning path; if it
still wins, S is winnable.* That is **one walkthrough per probe**, not a search,
and it is necessary-but-not-sufficient: a failed replay may mean the route
changed rather than the win being gone, which is why the output is a candidate
and not a verdict.

- **Routine mode** seeds from the states the suite already reaches — every
  end-branch is a probe point. Fernhill: 19 leaves × the win suffix ≈ 1000
  commands, under a second at the measured 10²–10³ commands/sec.
- **Deep mode** BFSes the reachable space, dedupes by state signature, and
  probes the frontier, parallelized across cores. Hours, not seconds; run
  deliberately, never as a gate (there are no CI gates in this project).

**Parallelism is free here because of D17.** With no save/restore in the walk, a
worker boots and replays a path and shares nothing with its siblings — which is
what ADR-302 D10 already claims the tree permits.

**The shared primitive: a semantic world-state signature.** Deduping states in
deep mode needs a canonical signature, and the obvious candidate — the ADR-293
save payload — carries turn counters and RNG stream states that differ for
irrelevant reasons. A signature that ignores them is required. **D4 needs the
same primitive**: "does this variant arrive where its sibling arrives, on the
entities the author named" is the same operation as "have I seen this state
before." Build it once; it serves both, and neither should invent its own.

**Pilot corpus: Fernhill first, Dungeo as the stress test.** Dungeo is the
richer hunting ground — it mirrors MDL Dungeon, which is merciless, and it has
a 952-command answer key. But it is also the most stochastic corpus here: the
thief and combat mean a suffix replayed from a shifted state fails for RNG
reasons rather than unwinnable ones, and a pilot there would be spent debugging
false positives. Fernhill is deterministic at a pinned seed and fast, so it
proves the mechanism; Dungeo then stresses it, with ADR-293 `forces:` pinning
the stochastic points so a suffix failure means what it says. **This uses Dungeo
as a measurement target, which D9 permits — it forbids letting Dungeo's corpus
shape a design, not pointing a finished tool at it.**

**D6 — ADR-131's explorer is widened, not replaced, and the static analysis
moves to the IDE.** (Resolves Q-3, session f2a7e6, David's call.)

**One explorer, two modes.** ADR-131 gains reachability probing (D5) alongside
the regression baseline it already describes. They share the walk and differ in
everything else — the baseline records prose and is diffed often, the probe
yields candidate states and is run rarely — so a mode is the right seam, not a
second tool.

**Its stated exclusion survives the widening, which is why this extends ADR-131
rather than replacing it.** ADR-131 says it *"avoids the hard problem of
puzzle-solving and focuses on regression coverage."* D5's probe solves nothing:
it replays an answer key the finished story already ships. The excluded thing
and the added thing are not the same thing. An earlier draft of this ADR argued
the opposite — that widening would "replace its premise rather than extend it" —
and that objection is retracted here rather than deleted, because it was
load-bearing in the question it answered.

**The static half moves to the IDE.** `tools/vscode-ext/src/world-explorer.ts`
already computes the graph-computable portion — dead ends and one-way exits from
`--world-json` — the cheap layer of this idea living in the wrong product. It
moves rather than being mirrored: two copies of a reachability analysis will
eventually disagree, and the disagreement would be discovered by an author.

*Flip owner and trigger:* **whoever accepts this ADR** amends ADR-131 in the
same commit as the acceptance — replacing its "SCOPE QUESTION OPENED" note with
the widening recorded here, and stating the two modes in its Decision. The
trigger is acceptance of this ADR; the owner is the accepter, not a later
reader. This ADR does not edit ADR-131 itself: one writer per artifact, and an
interview writes only the ADR under interview.

> **DISCHARGED EARLY 2026-08-05 (session 51b5f4).** ADR-131 no longer stands
> unamended: it carries a **SCOPE WIDENED** note, the two modes in its Decision,
> the static-half move, and four new Consequences. The amendment landed on
> David's instruction *ahead of* the trigger above, with this ADR still DRAFT —
> so the pairing the paragraph specifies (same commit as the acceptance) did not
> happen, and an accepter should not look for it. What the acceptance still owes
> ADR-131 is nothing; what it owes this ADR is the DRAFT → ACCEPTED flip on its
> own merits (acceptance criteria, test requirements, implementation section,
> and the three undefined interfaces).

---

## Consequences

**D4 gives the tree a second edge kind, and the cost lands in three places.**
`converges-with` is an assertion between siblings, not a parent pointer, so the
forest invariant survives it untouched. The opt-in multi-parent form does not:
tree assembly must expand a node with N parents into N runs, the report must
name a node once per run without double-counting it as a failure, and the IDE's
column view must show the same stem under several routes without implying it is
several tests. None of that is hard; all of it must be decided together, because
a half-expanded tree reports numbers nobody can reconcile.

**Convergence assertions need somewhere to read state from.** D17 removed
save/restore from the tree walk, so the harness no longer has a serialized world
in hand at a node boundary. Comparing two variants' named entities needs a read
path that does not reintroduce the save hooks that issue #229 was about.

**ADR-302 stays ACCEPTED and shipped.** These questions are raised *by* its
usage, not left unresolved *within* it: D1's one-parent rule works, is
implemented, and is merged. Nothing here reopens it.

**D6 gets its first concrete content.** "The same state is reachable three ways
and only one route is tested" and "this branch leads somewhere the story cannot
be finished from" are both untaken-divergence coverage facts. Whatever
implements D6 should be designed against these two cases rather than against
the abstraction.

---

## Session

Raised in session f2a7e6 (2026-08-05, branch
`feat/adr-300-302-channels-branch-tester`) while mocking the IDE Testing tab
against Fernhill's real tree. The layout study forced the shape question — the
real suite is wide and shallow, 12 children off one node — and David's two
observations followed from looking at it: that an open world reconverges, and
that an unwinnable state belongs in the divergence surface with the explorer
as a possible host.

The distinctions in the Decision section are his framing; the survey of what
ADR-131 and the VS Code world-explorer actually do, and the tractability
analysis in Q-2, were done in-session against the source rather than recalled.
