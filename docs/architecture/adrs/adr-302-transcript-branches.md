# ADR-302: Transcript Branches — Testing Authored Variation

**Status**: **ACCEPTED** (2026-08-05, session 5113ca) — all ten questions resolved by interview and review, `adr-review` clean on re-check. Design only; nothing here is implemented.
**Date**: 2026-08-05 (session 5113ca)
**Supersedes in part**: ADR-300 D17 (chain membership as convention, not grammar)
**Relates to**: ADR-293 (forcing, coverage, outcome search), ADR-294 D4 (`[IF:]` removed), ADR-299 (the skein's branching, superseded)

---

## Context

**Authors will want to test variation, and nothing supports it.**

ADR-299's skein branched: a shared prefix, then divergent paths from a common
node. ADR-300 superseded that model and recorded the cost in its own
Consequences rather than leaving it to be rediscovered:

> `--chain` carries the shared-prefix case. Ten transcripts opening with the
> same twenty moves replay them ten times where the skein branched once. **This
> is the one real capability the supersession gives up.**

That trade was made deliberately. This ADR reopens it, because "testing
variation" is a normal authoring need and the current answer — write N files,
each replaying the prefix — has a cost the original framing understated. The
machine time is real but cheap. The **edit-time coupling** is the problem: change
the shared prefix and you edit N files, by hand, consistently, or the paths
silently stop sharing a starting state.

**Two kinds of variation, and only one is unsolved.**

*RNG variation* — the same commands, different outcomes: combat, the thief,
anything drawing from a seeded stream. This is **solved**. ADR-293 gives
`forces:` and `point-seed:` to pin an outcome class, `CoverageTracker` to record
which classes a corpus has exercised, and `searchOutcome` to find a seed
producing a target class. The variation lives in the header while the command
list stays identical.

*Choice variation* — the player does different things from the same state. Take
the sword or leave it; light the lamp before opening the box or after. Different
command lists sharing a prefix. **Nothing handles this**, and it is what an
author means by "test the other path."

**This is not a reversal of ADR-294 D4.** That decision removed `[IF:]` because
"state is deterministic at a pinned seed, so a condition never varies — write
the branch that actually happens." It is about conditionals *inside* one
transcript, and it stands. This ADR is about the relationship *between*
transcripts. A branch is not a conditional; it is two files that both actually
happen.

---

## Decision

**D1 — A transcript may name its parent, and a parent is always a whole file.**
A header field — `continues: doormat` — declares that this transcript begins in
the state its parent ended in. A transcript with no parent starts from a fresh
game, which is what every standalone transcript does today.

**The field's value is a filename stem**: no `.transcript` extension, no
directory component, no path. It names a transcript in the same story, which is
the only scope a tree spans (a cross-story pointer is one of D11's validation
errors). This follows from D14 making the filename the identity — the stem is
that identity written down.

**A pointer never addresses a point inside a transcript.** (Resolves Q-1, session
5113ca.) There is no `at <n>` form, no per-turn id, and no way for one file to
reference another file's interior — not deferred, not reserved for later.
Rejected: node-level parenting as the skein had it. It buys branching from
mid-file without touching the parent, and pays with a reference that any
insertion into the parent silently redirects; keeping it out means every
reference in the system points at a whole file, which is stable under every
edit a parent can receive.

**The consequence is a transcript-length discipline, and it is intended.** A
branch can only leave from a file's end, so branching from the middle of a
124-command walkthrough means splitting it first. Dungeo's chain today runs 16
to 124 commands per file (median ≈ 58, 952 total across 17 files), so some
splitting is real work. Shorter, single-purpose transcripts are the shape this
pushes toward, and that is a better default than files long enough to need
interior addressing.

**D2 — A branch is two or more transcripts naming the same parent.** Branch
structure is *derived* from parent pointers. There is no branch declaration, no
branch id, and nothing for an author to keep in sync — the fork exists because
two children point at one parent, and that is the only way it can exist.

**D3 — Chains are the linear case of the same mechanism, and filename ordering
is retired.** (Resolves Q-2, session 5113ca.) A chain is a parent tree with no
forks. This *replaces* ADR-300 D17's filename-ordering convention rather than
sitting beside it — one mechanism describes both a straight walkthrough and a
fork. The prefix-keyed save cache that chain running already relies on (story
build + prefix + seed) is exactly what a branch needs, since for a child the
prefix is its ancestor path; v2 keeps that caching strategy while retiring the
`--chain` flag itself (D10).

**No existing chain migrates — the cutover is zero files.** An earlier draft of
this decision committed 22 files (dungeo 16, friendly-zoo 6) to gaining a
`continues:` line, which was correct while a single harness was assumed. D9, D12
and D13 remove every one of those files from scope: Dungeo stays on v1
permanently and v1 has no `continues:` field at all; `stories/friendly-zoo` is
out by ruling; the Family Zoo tutorial is v1; and Fernhill's tests are **redone
for v2**, not migrated. Nothing is converted, so there is no migration commit and
no risk of a half-converted corpus.

> **SUPERSEDED IN PART 2026-08-05 (session f2a7e6) — the save cache.** The
> sentence above committing v2 to the prefix-keyed save cache is replaced by
> D17: v2 re-executes a child's ancestry instead of restoring a save, and keeps
> no cache. The rest of D3 — chains as the linear case, filename ordering
> retired, zero files migrated — stands.

Rejected: coexistence, where a file with no `continues:` falls back to filename
order. It leaves "no parent field" meaning two different things — *this is a
root* or *this continues whatever sorts before it* — with nothing in the file to
say which. That ambiguity lands precisely on this feature, because a branch off
`wt-07` is a file that is not named `wt-08`, at which point the filename sort can
no longer be read as the tree.

**The `wt-NN` prefix becomes decorative and can be dropped.** (David's
observation, session 5113ca.) Once parentage is declared, a filename no longer
encodes position, so `wt-07-exorcism.transcript` can simply be
`exorcism.transcript` — the name says what the test is about and the header says
where it sits. Both consequences are settled elsewhere in this ADR: `continues:`
refers to a file by name, and renaming is a harness operation that updates
children, golden and divergence save together (D14); and the `wt-*.transcript`
glob that CLAUDE.md documents as the regression baseline is retired with
`--chain` itself (D10). **The rename is authorized.**

**D4 — The tree is derived data, never a second artifact.** No `.skein`, no
index file, no committed tree structure. ADR-300 D1 says the `.transcript` file
is the artifact; the parent pointer lives in the transcript's own header, and
the tree is whatever reading those headers produces.

**D5 — Header-only variation is a branch too.** Two children of the same parent
differing only in `forces:` or `point-seed:` test RNG variation from a shared
state, with identical commands. One mechanism covers both kinds of variation,
which is the main argument for this shape over a choice-specific one.

**D6 — An untaken branch is a coverage fact.** Divergence points feed the
existing coverage surface (ADR-294 D13's "what should I test?") rather than
getting their own report: a state with one child where the story affords several
outcomes is a gap the author can be shown.

**D7 — Inferring branches from command lists is a reading aid, never truth.**
A tool may diff command lists across a story's transcripts to *suggest* that two
files share a prefix. It must not treat that as the branch structure: rewording
one prefix command silently splits an inferred branch, and identical commands
can overlap by coincidence. Only D1's pointer establishes a parent.

**D8 — A child inherits its parent's whole header and may override any field.**
(Resolves Q-3, session 5113ca.) One rule: a transcript's effective header is its
parent's effective header with the child's declared fields replacing them.
Inheritance already describes practice — exactly 1 of dungeo's 17 chain files
declares a seed (`wt-01`, `seed: 42`), because a chain is one game instance and
the root's seed governs it. The relationship itself is recorded today as prose in
a `description:` ("Continues from wt-07"), in one file out of seventeen, which is
the case for making it a header field.

**Seed is overridable, and that is the point.** A variation branch needs a
different draw from the same state, so a child declaring its own seed is the
mechanism rather than an error. Rejected: carving the header into chain-wide
fields (inherit only) and per-file fields (never inherit) — three rules where one
does, and it would have made exactly this case unexpressible.

**Which seed to vary is a real choice, not a formality.** ADR-293 distinguishes
the master seed from a per-point stream, and `searchOutcome` deliberately varies
the latter: *"the tool varies the target point's own stream, not the master seed
— master-seed variation changes every stream and with it the firing schedule,
which is exactly the degradation D12 warns about."* Both are legal overrides
under this decision; `point-seed:`/`forces:` re-roll one point and leave the rest
of the schedule intact, master `seed:` re-rolls everything. Guidance for authors
and tools: prefer the narrow instrument.

> **MEASURED, THEN RESOLVED 2026-08-05 (session 86e85a).** The measurement
> contradicted the two paragraphs above; the resolution is `reseedStreams`,
> recorded as an amendment at the end of this decision.
>
> The implementation question this decision left open was whether a master
> `seed:` override on a non-root re-seeds a game restored from its parent's
> save. Probed against the real `EngineRandomService` (`packages/engine`), not
> reasoned about:
>
> | mechanism | point that **drew** in the parent | point that did **not** draw |
> | --- | --- | --- |
> | master `seed:` override | **inert** | applies |
> | `point-seed:` override | **inert** | applies |
> | `forces:` | applies | applies |
>
> Measured values: parent at seed 42 draws `[720, 683, 623]` at point A and
> saves. A child restoring that save draws `[133, 63, 835]` at point A whether
> its master seed is 42 or 999 — *identical*. At an untouched point B the same
> child draws `[429, 940, 632]` at 42 and `[736, 266, 48]` at 999, the latter
> matching a fresh game at 999 exactly. `point-seed:` behaves the same way:
> overriding a drawn point produces byte-identical output to no override.
>
> **Cause**, in `EngineRandomService.streamFor`: a point's stream resolves as
> `restoredState ?? pointSeedOverride ?? deriveStreamSeed(masterSeed, name)`. A
> restored state wins over **both** seed mechanisms. That is correct for
> ADR-293 D7 — a restore continues where the save left off, which is the whole
> point of saving — and it is exactly what makes seed-based variation from a
> shared state impossible.
>
> **Consequence.** "Seed is overridable, and that is the point" is false as
> built for the case it was written for. You branch *after* the interesting
> thing has happened, so the point you want to vary has usually already drawn —
> and for that point a child's `seed:` is silently inert. Worse than the risk
> the plan anticipated: it is not that master `seed:` fails and `point-seed:`
> survives, but that **both seed instruments fail and only `forces:` works**.
> `forces:` is unaffected because `chance()` consults the force table before
> touching the stream and consumes zero draws, and `restoreStreamStates`
> deliberately keeps the session force table (D9).
>
> Nothing was engineered around this. The inheritance rule is built and tested
> as written (AC-3 green — a child with no seed resolves to its parent's, one
> with its own resolves to its own).

**AMENDMENT (2026-08-05, session 86e85a) — branching is its own operation.**

The measurement above says a save's stream states outrank both seed
instruments. That is correct behaviour for `restore` and must stay: a save
exists so a session can continue where it left off (ADR-293 D7), and the
walkthrough chains depend on it — Dungeo's 17 files and Fernhill's spine are
linear trees (D3), and each reproduces a single continuous run only because a
child that declares nothing continues its parent's streams exactly.

What was missing is that **a branch child is not resuming; it is starting a new
run from a captured state.** The engine had one operation for both readings.
It now has two, and the second is applied *after* the first:

```
save  →  restore  →  reseed
```

`EngineRandomService.reseedStreams(points)` drops the named points' stream
continuity — live streams and restored states alike — so each one's next draw
re-derives through the ordinary chain: its point-seed override if one is
active, else `deriveStreamSeed(masterSeed, name)`.

Consequences of shaping it this way:

- **`restore` is untouched**, so ADR-293 D7 stays true as written and needs no
  amendment. Reseeding is the same species as forces and point-seed overrides —
  session state, deliberately never serialized (ADR-293 D9) — and is recorded
  there as an additional instrument, not a change to an existing one.
- **The save format does not change.** One artifact, read two ways. Both
  children of a fork read the same cached prefix save (D3); one resumes it and
  one reseeds after it.
- **Reseeding is always opt-in**, never what a child *is*. A child that
  declares nothing gets a plain restore. Any other default would stop every
  linear chain reproducing a continuous run.
- **Occurrence counters are untouched**, so a `forces: p#2=X` written against
  the parent's numbering keeps meaning what it said. A branch child is the same
  game in every respect except the luck it asked to re-roll.
- **Naming points is the narrow instrument and the preferred one.**
  `reseedStreams('all')` exists and re-derives the whole schedule from the
  master seed — which is exactly the degradation ADR-293's `searchOutcome`
  warns about, and is why D8 already says to prefer the narrow instrument.

**D5 restated.** Two children of one parent differing only in `forces:`,
`point-seed:` or `seed:` test RNG variation from a shared state. `forces:`
worked already (it substitutes an outcome class before any draw and consumes
none); `point-seed:` and `seed:` work now, by reseeding the points they name
before the child's first command.

Pinned by `packages/engine/tests/engine-random-service-reseed.test.ts` (11
cases), whose first case is the measured defect itself — a child's master seed
being inert on a drawn point — kept as a regression so the shape is legible if
it ever returns.

**D9 — Dungeo is an outlier and is not a design driver.** (David's ruling,
session 5113ca.) Dungeo deliberately mirrors the original MDL source, partly for
nostalgia, and its testing shape follows from that: 77 of its 117 unit
transcripts build state with `gdt` debug teleport, a facility no other story has.
**GDT and Dungeo's standalone unit transcripts stay supported and keep working
unchanged** — and nothing else in the platform should account for them. No
branch, chain, or tree design is to be shaped by Dungeo's corpus, and its
117-file unit suite is not migrated.

This matters because Dungeo's numbers dominate every measurement and point the
wrong way. Its spine is 952 commands, so a leaf hanging off the end pays a
952-command cold-cache replay where a `gdt` test pays three — a genuine cost that
belongs to Dungeo alone. Fernhill, the Chord story and the representative case,
has a 58-command walkthrough and 19 unit transcripts averaging 26 commands, and
its authors already hand-replay shared prefixes (`north|north|search the
doormat|take the tarnished key|…` opens three separate files) because Chord has
no `gdt` escape hatch. The duplication branches remove is real in exactly the
corpus that represents the audience.

**D10 — `--chain` is retired; running the harness runs every path.** (Resolves
Q-4, session 5113ca.) There is no chained-versus-unchained mode, because the tree
already states every relationship a chain flag used to imply. The harness takes a
story and runs every root-to-leaf path in it. "The tests passed" means every
authored path passed — including every variation — so a branch is exercised
routinely rather than on request, which is the condition that let alternate-path
gaps accumulate.

The ordered file glob goes with it. `--chain stories/dungeo/walkthroughs/wt-*.transcript`
worked only because the shell sorted `wt-NN` into execution order; with parentage
in the header the runner derives order itself, which is what makes D3's filename
rename safe. **This is a breaking CLI change and CLAUDE.md documents the old form
as the regression baseline** — the documentation moves in the same commit.

**Branches are independently runnable after their divergence point, so the tree
is parallelizable.** Per-branch progress is likewise natural to report, since
each tail has a known command count and an independent verdict.

> **AMENDED 2026-08-05 (session f2a7e6) — the mechanism, not the claim.** This
> paragraph originally read "compute a shared prefix once, then fork: restore
> that save N times and run N divergent tails concurrently," citing
> `searchOutcome`'s per-candidate restore (ADR-293 D12) as the same move. Under
> D17 there is no save to restore N times; parallelism becomes N workers each
> booting a fresh game and replaying its own leaf path, which needs no shared
> artifact between workers and is the simpler arrangement. The tree is still
> parallelizable and the paragraph's claim is unchanged.

*Not decided here:* where that renders. A progress display per branch is an
obvious fit for an authoring surface, and the surface question belongs to
ADR-301, which is TBD. This decision commits only to the harness running every
path and to the tree permitting parallel execution — not to a UI.

**D11 — The tree gets a new harness (`branch-tester`); the existing one is retained.**
(Resolves Q-5, session 5113ca, by dissolving it.) The original question was
whether malformed trees fail at parse time or run time. Neither layer can host
the check: `validateTranscript(transcript)` takes a single transcript and so
cannot see a parent pointer at all, and the runner only learns about a path while
walking it. Retrofitting a corpus-level assembly stage between two file-level
layers is the wrong shape.

Instead, **v2 is tree-native from the entry point**: it reads a story, assembles
the tree from every transcript's header, validates it whole — missing parents,
cycles, cross-story pointers, all reported together before a single command runs
— and only then executes. Eager validation is not a policy choice here; it is
what "the tree is the input" means. Diamonds need no check, since D1 gives a
transcript one parent, and a file pointing nowhere that nothing points at is a
root rather than a defect.

This is justified by how much has already changed underneath the old harness: a
canonical model and serializer (ADR-300 D3/D4), addressable channels
(ADR-300 D6–D16), header inheritance (D8), tree-derived ordering (D3), and no
`--chain` (D10). v1 was built for an ordered list of independent files, which is
no longer what a test suite is.

**D12 — The v1/v2 split is by story and permanent; v2 owes Dungeo nothing.**
(Resolves Q-8, session 5113ca. David: "v2 should shrug off any dungeo detritus —
make it shiny.") Dungeo runs on v1 indefinitely, because GDT and its 117
standalone unit transcripts are supported and nothing else should account for
them (D9). The Family Zoo tutorial runs on v1 too, for a different reason — it is
the payload of the npm publish-verification path (below). v2's consumer is
Fernhill. Which harness a story targets is stated per story, not inferred; the
table below is the current assignment in full.

v1 is therefore **frozen and maintained**, not deprecated — it has one consumer
whose entire purpose is not changing, so there is no migration deadline and no
shim to keep warm. That is what buys v2 its narrowness:

- no GDT, and no debug-teleport setup concept at all
- no flat ordered file list, no `--chain`, no filename-encoded ordering
- no standalone-transcript compatibility mode carried forward for its own sake
- the tree is the only input shape

Rejected: a temporal split where v1 is a shim every story eventually leaves. It
would force v2 to grow enough of v1's surface to absorb each story in turn —
including, eventually, GDT — and "temporary" reliably becomes permanent without
the honesty of having said so up front. Naming the split as permanent is what
keeps v2 clean.

**Who runs which harness** (David, session 5113ca — "the Family Zoo in tutorial
matters, the story one does not"):

| Harness | Consumers |
| --- | --- |
| **`transcript-tester`** (v1) | Dungeo (117 unit + 17 walkthrough, GDT); the **Family Zoo tutorial** — `tutorials/familyzoo/v1.5.0` (16 transcripts) and `v2.0.0` (17) |
| **`branch-tester`** (v2) | Fernhill, whose tests are **rewritten** for it rather than migrated |
| neither, by ruling | `stories/friendly-zoo` (8 unit + 7 walkthrough) — a different thing from the tutorial and not a design constraint |

**v1 must stay reachable from the CLI, not merely survive as a library.**
`test:npm <location>` stands up an isolated consumer project for a story,
installs its `@sharpee/*` closure from staging tarballs, compiles it, and runs
its transcripts — it replaced `npm-test/`, `npm-test-dungeo/` and
`npm-test-familyzoo/`. The Family Zoo tutorial's 33 transcripts are the payload
of that npm regression path, so the harness is part of how *published packages*
are verified, not just in-repo test infrastructure. Retiring v1's command surface
would break publish verification.

*Name collision to avoid:* `tutorials/familyzoo/v2.0.0` and
`docs/work/familyzoo-v2-migration/` are the tutorial's Phrase Algebra edition
split, unrelated to this harness. "Family Zoo v2" and "harness v2" mean different
things.

**D13 — In v2 there are no unit tests; every test is a branch.** (Resolves Q-7,
session 5113ca.) The `tests/transcripts/` versus `walkthroughs/` split does not
exist in v2. A story has one tree: a root that starts a fresh game, a spine that
plays, and focused tests hanging off whatever node puts the world in the state
they care about. A test's position in the tree is its setup, so setup is defined
once and shared by every test that needs it, rather than replayed per file — the
duplication visible in Fernhill today, where `north | north | search the doormat
| take the tarnished key` opens three separate files.

**The trade is accepted deliberately: a leaf fails when its ancestor fails.**
Isolation is what standalone tests bought and this gives it up. Two consequences
follow for v2:

- **Reporting must distinguish "this test's own assertions failed" from "an
  ancestor failed."** A cascade that reports forty failures for one broken spine
  node is worse than useless; the run should name the originating failure and
  report its descendants as unreached, not as failures.
- **Tests of states play cannot reach must be reachable after all.** Malformed
  input can be typed from any state, so those are ordinary branches. A genuinely
  impossible world state has no branch to hang from — under this decision, such a
  test is not written, and if one is genuinely needed that is evidence against
  this decision rather than a case to smuggle in as a root.

**D14 — A transcript's filename is its identity, and renaming is a harness
operation.** (Resolves Q-6, session 5113ca.) `continues:` references a
transcript by filename, and the existing derivations stay as they are: a golden
is `goldenPathFor(path)` — the transcript path with `.transcript` swapped for
`.golden` — and a divergence save likewise. The filename is therefore
load-bearing in three places at once, and the answer is not to remove the
coupling but to own it: **renaming is something the harness does**, atomically
updating the file, every child's `continues:`, the golden, and the divergence
save together. An `mv` is not a supported rename.

**Atomicity means validate-then-write, and a failed rename changes nothing.**
The harness resolves the full edit set first — the target name is free, every
child is writable, the golden and divergence paths are known — and only then
writes. It **rejects** before touching anything when the new stem is already
taken in that story, when the transcript is not part of a readable tree, or when
any file in the edit set cannot be written. A rename that fails partway is the
one outcome the operation exists to prevent, so a half-applied rename is a bug,
not a degraded mode.

Rejected: an author-declared `id:` field, since an id you can type is exactly as
mutable as a filename and leaves two names to keep unique rather than one.
Rejected: a generated opaque id, genuinely stable but needing tooling to stay
readable, which is a poor trade while transcripts are hand-authored and
ADR-301's editor is TBD.

**Filenames are free-form, and nothing derives meaning from them.** No `wt-NN`,
and equally no positional scheme like `.1`/`.2a`/`.2b` — encoding tree position
in a name reintroduces exactly what D3 removed, and worse, since inserting or
promoting a branch would renumber its siblings. A name should read well; the
header says where it sits.

**Branch points need no names of their own.** A path reads as a chain of
filenames (`zoo → doormat → cellar-dark`), and a fork is not a file but a node
with several children, fully identified as "the children of `doormat`." Author
intent that a filename cannot carry is what `title:` is already for. This keeps
D2 intact: a branch exists because two children name one parent, and there is
nothing for an author to keep in sync.

**D15 — The new harness is `@sharpee/branch-tester`, a full copy with no shared
code.** (Resolves Q-1, session 5113ca.) It is a new published package, not a
subpath of `@sharpee/transcript-tester` and not a dependent of it. The parser,
serializer, model, golden format and coverage code are **copied**, not imported
and not extracted into a shared third package.

**Amended, session 5113ca — what "frozen" covers.** This decision first said
`@sharpee/transcript-tester` "is not edited at all — which is what freezing it
has to mean if it means anything." That is too strong, and David rejected it the
same session ("D15 can bite me") when it was invoked to shield a badly-scoped
test from being fixed. **The freeze covers the harness's grammar and runtime
semantics** — what a transcript may say, and what running one does — because
those are what Dungeo and the Family Zoo tutorial depend on not changing. It does
**not** cover test hygiene, packaging, or internal structure. Repairing a test
that reaches outside its own package changes nothing for any consumer, and a
freeze that forbids it is protecting a defect rather than a contract.

Throughout this ADR, **"v1" is `@sharpee/transcript-tester` and "v2" is
`@sharpee/branch-tester`**; the numbers are shorthand for those two names, not a
claim that one supersedes the other. The split is permanent (D12), so nothing
here converges on a v3.

**Duplication is the point, not the price.** `continues:` should not exist in
v1's grammar — v1 has no branches, and a shared parser would have to carry a
field only one harness understands, then keep straight which consumer may use it.
Copying lets branch-tester evolve the grammar freely while transcript-tester's
stays exactly as ADR-300 left it. The usual objection to a fork is divergence,
and divergence needs two moving parts: a frozen copy cannot drift, because it
never moves.

What that costs, stated plainly: ADR-300's canonical serializer and its D4 form
rules now exist twice and are pinned by tests twice, and a genuine defect in
copied logic must be fixed in both — or, more likely, fixed in branch-tester and
left in transcript-tester, which is the accepted consequence of freezing rather
than a surprise. Standing up the package means the six registration points
(`ts-forge.config.json`, the `sharpee` package's `package.json`, its `index.ts`
and `tsconfig.json`, the build script, and the root `package.json`).

Rejected: importing the model from transcript-tester (couples a frozen package to
an active one and forces v1's grammar to carry `continues:`); extracting a shared
substrate into a third package (cleanest layering, but it edits v1, which
contradicts freezing it); a `v2` subpath export inside transcript-tester (puts
frozen and active code in one package with nothing enforcing the separation).

**D16 — In-repo stories are separated by directory; outside the repo, nothing
declares anything.** (Resolves Q-2, session 5113ca.) There is no per-story config
field naming a harness and no CLI dispatch flag. In the repository, the two
harnesses' stories live under different top-level directories, and each harness
looks only at its own; the exact paths are an implementation choice.

**Why separation, stated correctly.** The reason is *not* a test collision. This
decision was first justified by `header-folding.test.ts` walking the whole
`stories/` tree and failing the moment a `continues:` file appeared beneath it —
v1's suite breaking on v2's files. That test is being re-scoped so it no longer
reaches outside its own package (see D15's amendment), which removes the
collision entirely. A decision resting on a problem that has been deleted is a
decision resting on nothing.

**The real reason is that v1 accepts a v2 story silently.** The legal header-key
set is enforced by a test, not by the parser, so `transcript-tester` handed a
transcript carrying `continues:` does not error — it accepts the key as
unremarkable, ignores it, and runs the transcript standalone from a fresh game.
Every assertion written against a state the parent was supposed to establish then
evaluates against the wrong world, and the run reports a pass that means nothing.
Separation exists to make that mistake unavailable rather than merely unlikely,
and it survives whatever happens to any test.

**Outside the repository the question does not exist.** An author's project holds
their own story and the harness they installed; there is nothing to disambiguate
and no directory convention to observe. This is an in-repo organizational
constraint that follows from two harnesses sharing one repository, and it is not
part of either harness's contract with authors.

*This does not re-privilege paths.* D3 and D14 stripped meaning from filenames
*within* a tree — ordering, position, identity-by-sort. A top-level directory
grouping stories by which harness runs them is repository layout, and says
nothing about a transcript's place in its tree.

**D17 — A child's starting state is RE-EXECUTED, never restored.** (2026-08-05,
session f2a7e6, David's call.) The tree walk boots a fresh game per leaf and
replays the leaf's ancestry command by command. It captures no save, restores no
save, and registers no save/restore hooks. This *replaces* the prefix-keyed save
cache that D3 carried over from ADR-300 D17 and that the Consequences section
below promised the runner would reuse.

**The immediate cause is a hook collision that cannot be worked around from the
harness side.** `GameEngine.registerSaveRestoreHooks` assigns the whole hook
object (`this.saveRestoreHooks = hooks`, `packages/engine/src/game-engine.ts`),
and restart confirmation lives on that same object as `onRestartRequested`. The
harness boot registers it to set `pendingReboot`
(`packages/bootstrap/src/index.ts`); the tree runner's `captureSave` then
registers `{ onSaveRequested, onRestoreRequested }` on the same engine and drops
it. The engine defaults `shouldRestart` to true, emits the ADR-248 ack, and
calls `stop('restart')` — and nothing reboots, because the flag the reboot reads
was never set.

Measured 2026-08-05 against the shipped bundle: a Fernhill transcript running
`look | restart | look` passes as a root and fails as a child of `arrival`, the
restart turn's output byte-identical in both cases (`The story restarts.`), the
divergence appearing only on the next command as `Error: Engine is not running`.
The restart turn reports PASS in the failing case, including `not contains
"Restart failed"` — the defect is silent at the turn that causes it. Filed as
issue #227.

**The general form of that cause is the actual argument.** `captureSave` runs at
every fork, so the collision reaches any node with a parent, and the two hook
sets cannot coexist on one engine. More broadly, restoring made the save format
a correctness dependency of the harness: anything a save fails to serialize
diverges silently in every child. Re-execution has no such surface — a replayed
prefix is the prefix, produced the only way the story can produce it.

`reviveEngine` survives this decision, for a narrower reason than the one that
introduced it. It was there because a restore rewinds the world without
restarting a stopped engine; it stays because a first child continues its
parent's live engine, and a parent whose transcript ended in death or victory
left it stopped. A rebooted sibling never needs it.

**Cost, measured before deciding.** Fernhill's 22-node tree executes 519
commands under restore and 551 under re-execution: **+32, or 6.2%**, on a run
that takes about half a second. It is that cheap because a shared prefix saves
`(children − 1) × prefix_length` and Fernhill's prefixes are two commands each
(`arrival` with 11 children, `key` with 4). Its deepest path, `timeline →
dawn-lose` at 130 commands, is a chain and saves nothing under either model.

**The cost that is owned rather than dismissed:** a leaf now costs its whole
ancestry, so a long spine with many children pays linearly where a restore paid
once. Fernhill does not have that shape and D1's transcript-length discipline
pushes against it, but the number to watch is the ratio of replayed commands to
authored ones, which the run reports (see AC-5 as amended). D9's Dungeo
exemption already keeps the one corpus that would fail this out of v2 — a leaf
on Dungeo's 952-command spine is exactly the case this decision would lose to,
and it is not v2's case.

**What is preserved exactly, and how.** Replay walks root→leaf applying each
node's *declared* reseed at its own boundary before running its commands —
the same `reseedStreams` call, at the same point in the walk, that the D8
amendment introduced. This is not incidental: a child's `seed:`/`forces:`
applied naively across a replayed prefix would re-roll the prefix itself, and
two siblings declaring different headers would no longer share a state at all,
which is precisely what D5 requires. Reseeding at boundaries keeps the prefix
bit-identical across siblings and re-rolls only what a child named. **D5, D8's
amendment, `forces:`, and occurrence-counter numbering are therefore unchanged
in meaning** — the mechanism that reaches a shared state changed; nothing about
what a child may vary from it did.

**Ancestry replay re-evaluates the ancestors' assertions**, and a failure there
is reported as a non-determinism defect naming the node, not as an ordinary
assertion failure — the ancestor passed when it ran as its own node, so the
replay disagreeing with it means the run is not reproducible. Per-node
reporting, D13's unreached cascades, and the "one broken spine node reports one
failure" rule are unaffected: each node is still reported once.

**The `$save`/`$restore` transcript directives (ADR-293 D7) are untouched.**
They are an author testing *their story's* save feature, which is a different
thing that happens to share a name with the harness's former rewind mechanism.
The hook collision remains reachable there, but only inside a transcript that
explicitly asks for it, and #227 records it.

Rejected: fixing the collision by merging hook objects in the engine, or by
spreading `getSaveRestoreHooks()` in the tree runner. Both work and neither was
chosen — the first changes a public engine contract to preserve a mechanism this
decision removes, and the second leaves the trap armed for the next caller while
buying a 6% saving on the only story that uses it.

> **THE FIRST WAS ADOPTED AFTER ALL, 2026-08-05 (session f2a7e6, David's
> call) — and it does not undo this decision.** The rejection above is sound
> only while the tree walk is the collision's one victim, which is what a
> survey after D17 landed disproved: `registerSaveRestoreHooks` still had four
> callers across the two harnesses — the ADR-300 D18 divergence save and the
> `$save`/`$restore` directives in each `runner.ts`, and `searchOutcome`'s
> per-candidate restore in each `search.ts` (issue #229). None is being
> deleted, so "changes a public contract to preserve a mechanism this decision
> removes" no longer describes the trade.
>
> `GameEngine.registerSaveRestoreHooks` now merges: a named entry replaces the
> prior one of that name, unnamed entries survive, and removal is spelled by
> naming an entry `undefined`. Merging necessarily **snapshots** — the engine
> holds a copy rather than the caller's object, so mutating a registered hooks
> object no longer reaches it.
>
> **D17 stands unchanged.** It is not a workaround that the engine fix
> supersedes: re-execution was chosen on its own terms — the save format stops
> being a correctness dependency of the harness, and the cost is 6.2% on the
> representative corpus. The engine fix closes the *other* four callers, which
> D17 never reached and never claimed to.

---

## Worked scenario

Fernhill's tree, after its rewrite. `zoo` is the root and plays from a fresh
game; `doormat` continues it and performs `north | north | search the doormat |
take the tarnished key`; three focused tests continue `doormat`.

```
zoo                       (root — fresh game, seed declared here)
└── doormat               continues: zoo
    ├── cellar-dark       continues: doormat
    ├── doors             continues: doormat
    └── smoke             continues: doormat
```

Running the harness on `stories/fernhill` executes four root-to-leaf paths. Each
tail runs from the state the `zoo → doormat` prefix produces, and each leaf
inherits `zoo`'s seed via `doormat` (D8). Adding a fourth leaf costs one file and
no edit to any existing one — which is the whole point, since today those three
tests each rewrite the doormat sequence in full.

> **AMENDED 2026-08-05 (session f2a7e6).** This scenario said the prefix "runs
> **once**" and the tails "run from a restore of the state it produced." Under
> D17 the prefix is replayed per leaf — four times here, 8 commands where a
> restore would have cost 2. What the author writes is identical either way;
> only the harness's route to the shared state changed.

If `doormat` fails, `cellar-dark`, `doors` and `smoke` report as **unreached**,
and the run names `doormat` as the originating failure — not four failures
(D13).

---

## Acceptance Criteria

**AC-1 (D1, D2) — a fork is two children of one parent.** Two transcripts naming
the same parent both run, each from that parent's end state, and neither executes
the other's commands. *SELF-VERIFYING.*

**AC-2 (D1) — no interior addressing exists.** A `continues:` value carrying a
turn reference, a path, or a `.transcript` extension is rejected by the parser
with a named error. *SELF-VERIFYING.*

**AC-3 (D8) — inheritance with override.** A child declaring no seed runs at its
parent's; a child declaring its own runs at its own. Asserted on the resolved
header, not on output. *SELF-VERIFYING.*

**AC-4 (D5) — header-only variation branches.** Two children of one parent with
identical command lists, differing only in `forces:`, both run and reach
different outcome classes at the forced point. *PREMISE-DEPENDENT* — the premise
is that the point has more than one declared outcome class, established by the
ADR-293 D15 coverage registry before the test is written.

**AC-5 (D10, D17) — every path runs, and a leaf costs exactly its ancestry.** On
a forked story the harness executes every root-to-leaf path, and the run's total
executed commands equal the sum over leaves of each leaf's ancestry length.
*SELF-VERIFYING* — assert on the executed command count, not on wall-clock time.
The run reports that total alongside the authored command count, so the replay
share is visible rather than inferred.

> **AMENDED 2026-08-05 (session f2a7e6).** This read "shared prefixes run once,"
> asserting a shared prefix's commands execute exactly once across the run. D17
> replaces restore with re-execution, which makes that assertion false by
> construction; the criterion now pins the replacement invariant, which is
> equally self-verifying and equally a real check — an off-by-one in the walk
> shows up as a wrong total either way.

**AC-6 (D11) — malformed trees fail whole, before execution.** A story containing
a missing parent, a cycle, and a cross-story pointer reports all three, and
executes no command. *SELF-VERIFYING.*

**AC-7 (D13) — cascades report as unreached.** When an interior node fails, its
descendants are reported unreached and the originating failure is named. A run
with one broken spine node reports one failure. *SELF-VERIFYING.*

**AC-8 (D14) — rename is atomic or absent.** Renaming through the harness updates
the file, every child's `continues:`, the golden, and the divergence save.
Renaming to a stem already taken in that story leaves every file byte-identical.
*SELF-VERIFYING.*

**AC-9 (D12) — v1 survives intact.** After v2 ships, `test:npm` against
`tutorials/familyzoo/v1.5.0` and `v2.0.0` still runs their 16 and 17 transcripts,
and Dungeo's GDT-based suite still runs. *SELF-VERIFYING* — this is the check
that catches v2 quietly cannibalizing v1's command surface.

---

## Consequences

> **AMENDED 2026-08-05 (session 86e85a) — D5/D8's seed instruments.** Resolved
> by `reseedStreams`; the amendment is recorded at the end of D8. The note
> below is kept because it records what was measured and what was considered.
>
> **Resolution taken:** none of the three shapes below verbatim, but closest to
> (3). `restore` keeps its contract (so option 2's ADR-293 amendment was not
> needed) and branching became a separate operation applied after it, rather
> than a new spelling competing with it.
>
> ---
>
> **The finding, as recorded before the fix —**
> Measurement against the real `EngineRandomService` found that a master
> `seed:` override *and* a `point-seed:` override are both **inert** for any
> choice point that already drew before the parent's save; only `forces:`
> varies such a point. See the measured table in D8. D5 says "two children of
> the same parent differing only in `forces:` or `point-seed:` test RNG
> variation from a shared state" — the `point-seed:` half of that is not true
> as built, and D8's "seed is overridable, and that is the point" is not true
> for the case it was written for.
>
> Nothing was engineered around it (the plan's instruction was to stop and
> raise it rather than work around it). Three shapes are available and the
> choice is the owner's:
>
> 1. **Narrow the ADR to match the engine** — D5 becomes `forces:`-only for
>    variation from a shared state; a `seed:`/`point-seed:` override on a
>    non-root is documented as applying only to points not yet drawn, or
>    rejected outright as a misleading no-op. No engine change.
> 2. **Make the seed instruments reach a restored game** — let a declared
>    override outrank a restored stream state for the points it names. This
>    contradicts ADR-293 D7's "a restore continues where the save left off"
>    for those points, so it is an ADR-293 amendment as well as an ADR-302 one.
> 3. **Add a distinct spelling** for "re-roll this point from here" that is
>    explicitly not a save-continuation, leaving both existing meanings intact.
>
> *(Settled: see the amendment at the end of D8.)*


**One header field, and the rest is derivation.** The grammar cost is a single
field; the model gains a parent reference; the runner walks the tree. Nothing
about the canonical serializer, the assertion tier, or the channel work changes.

> **AMENDED 2026-08-05 (session f2a7e6).** This said the runner "reuses its
> existing prefix-keyed save cache." Superseded by D17 — there is no cache; a
> child's state is re-executed. The paragraph's point, that the cost is one
> header field and derivation, is unchanged and if anything stronger.

**ADR-300 D17 is superseded in part.** Its "convention, not grammar" reasoning —
that a `chain:` field adds grammar to prevent failures four stories never
produced — was sound on the evidence available. Authored variation is the case
it did not consider, so this is an amendment with a reason rather than a
reversal.

*Flip owner and trigger:* **whoever accepts this ADR** edits ADR-300 D17 in the
same commit as the acceptance — replacing its "Under revisit" note with a
supersession pointer, and marking its "convention, not grammar" half superseded
while its remaining content (chain membership, running a member never in
isolation, the prefix-keyed save cache) stands. The trigger is acceptance of this
ADR; the owner is the accepter, not a later reader. D17 remains in force until
that edit lands.

**The skein's one real advantage returns without the skein.** Shared prefixes
stop being duplicated work, and the branch structure is readable, but the
artifact stays the `.transcript` file and nothing gains a second format.

---

## Session

Drafted in session 5113ca (2026-08-05, branch `main`) after David's observation
that authors will want to test variation and that branches need designing for.
The parent-pointer shape is his call ("I like the parent language"). Written
against the constraint, stated in ADR-300 D1 and D3/D4, that the `.transcript`
file remains the only artifact and its canonical form stays linear.

**Eight open questions resolved by interview the same session**, in order: Q-1
file-level parenting with no interior addressing (D1); Q-2 explicit cutover and
the loss of the `wt-NN` prefix (D3); Q-3 whole-header inheritance with child
override (D8); Q-4 `--chain` retired, every path runs (D10); Q-5 dissolved by
building a tree-native v2 rather than retrofitting a stage into v1 (D11); Q-8,
raised mid-interview, the v1/v2 split as permanent and by story (D12); Q-7 no
unit tests, every test a branch (D13); Q-6 filename as identity with rename as a
tool operation (D14). Two questions were not on the original list: Q-7 arose from
David asking whether transcript tests are needed at all, and Q-8 from his call to
build a new harness rather than patch the old one. D9's Dungeo exemption came
from the same conversation and is what let branch-tester be narrow.

**D17 came from implementation, not review** (session f2a7e6, 2026-08-05).
Re-parenting Fernhill's remaining roots onto its spine surfaced a transcript that
passed as a root and failed as a child; tracing it found the save/restore hook
object clobbering restart confirmation (issue #227). David's question — "can we
just ban save/restore from testing?" — is what turned a workaround into a
decision. The 6.2% figure was measured before the call, and the first draft of
the argument wrongly claimed re-execution would repair D5; D8's `reseedStreams`
amendment had already repaired it, and D17 preserves that mechanism rather than
replacing it.

**`adr-review` then raised two more**, both resolved the same session: where the
new harness lives — `@sharpee/branch-tester`, a full copy with no shared code or
imports (D15) — and how a story's harness is determined, which is by in-repo
directory separation, with outside-repo projects needing no declaration at all
(D16). D15's freeze was then narrowed the same session (see its amendment), after
David rejected the idea that "frozen" should protect a badly-scoped test from
being fixed. The review also caught two internal contradictions left by the interview
outrunning an early answer: D3's 22-file migration, which D9/D12/D13 had reduced
to zero files, and D12 claiming every non-Dungeo story was v2-only one paragraph
above a table showing otherwise. Both are corrected above, with the superseded
reasoning kept visible rather than quietly deleted.
