# ADR-300: A Standalone Transcript Testing Tool

**Status**: **ACCEPTED** (2026-08-04, session c42886) — drafted overnight in
session dd4189, rescoped in c42886 to cover where the tool lives rather than
only what it edits, all six Open Questions resolved in c42886's interview
(resolutions are D11–D16), `adr-review` run twice with the findings folded
(12/18 → **17/18**), and accepted by David the same day. The remaining review
gap is deliberate: phasing and the module list live in a session plan, not in
this ADR. Not yet implemented. Supersedes ADR-299's artifact and verification
model, and ADR-290 D1–D4; both Statuses flipped in the same edit, per the
ownership clause below.

**Parent**: ADR-299 (play–skein–bless — superseded artifact model; its
interaction ideas are retained and named in D2), ADR-294 (golden transcripts,
the assertion/recording two-tier contract — **the authority this ADR defers
to**), ADR-293 (pinned seeds, choice points, forcing — the substrate, carries
forward), ADR-287 (fenced literal blocks — the block grammar an editor writes),
ADR-282 (re-bless drift lifecycle — retained, and finally given a home),
ADR-277 (`test --json` NDJSON wire — the boundary D0 promotes), ADR-290 (test
creation as an atomic mode — same problem as D12, opposite mechanism; D1–D4
superseded, see D12). D0's interface technology is `packages/platform-browser`
itself, not an ADR: its only runtime dependency is `lz-string` and its source
imports no UI framework (checked 2026-08-04). The corpus habitually cites
ADR-170 for "framework-free browser UI" (ADR-191 §62/§241, ADR-286, ADR-290),
but ADR-170 is *Component-Based Theming for the Browser Client*, Status
PROPOSED, and its body makes no such decision — so this ADR cites the code,
which is checkable, rather than joining that chain.

**Supersession ownership**: on acceptance, the same commit edits **ADR-299**'s
Status to SUPERSEDED (artifact and verification model; the play-authors-the-
transcript and branch-navigation ideas retained per D2 — note that ADR-299's
*mechanism* for the first of those is replaced by D12) and **ADR-290**'s Status
to SUPERSEDED-IN-PART (D1–D4 only; D5–D8 untouched), both citing ADR-300. Owner:
whoever performs the acceptance flip.

**Evidence**: `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md`.
Every count cited below is from that document and was taken over the real
corpus on 2026-08-04.

Those counts are whole-corpus and under D0 that is the right scope, because the
tool reaches all of them. Two totals are used throughout and they are not the
same number: **183** transcripts live in the committed test directories
(`tests/transcripts/` and `walkthroughs/`) and are what the normalization commit
touches; **185** is every `.transcript` under `stories/`, which is the set the
parse audit and the round-trip fidelity gate run over. The figures split as
follows, and the split is recorded because it is what forced D0 (re-cut
2026-08-04, session c42886, over the 183):

| | files | assertions | `contains` family | `[EVENT:]` | `[GOAL:]` | `[FAIL:]` |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Chord stories (`.story`) | 46 | 901 | 884 (98.1 %) | 9 | **0** | **0** |
| TypeScript stories | 137 | 2242 | 2025 (90.3 %) | 200 | 114 | 10 |

The re-cut totals 3143 assertions against the research document's 3144; the two
counts classify one line differently and neither figure is load-bearing — every
decision below rests on the per-form counts, which agree.

Dungeo alone is 134 files. Had the tool been an IDE panel — and the IDE has no
raw TypeScript editor — it would have reached only the top row, and D3's claim
that the editor exists so `[EVENT:]`, `[STATE:]`, `[FAIL:]` and `[GOAL:]` stop
being hand-written would have been a claim about thirteen uses.

---

## Context

ADR-299 shipped in nine phases across three sessions. On 2026-08-04 David used
the finished surface on Fernhill for the first time and the session became a
UX repair: the tree was unreadable, blessing could not be undone, the
`Testing` tab and the `Test` tab were visibly fighting, and D10's explorer
information had never been surfaced at all. He asked the question this ADR
answers:

> "I thought the whole point of the Skein was to make authoring transcripts
> easier, so we need to talk about that. So do we keep the Skein or do we make
> a transcript editing tool? It's probably one or the other."

The repair work was real and most of it survives. But the question underneath
it does not have a UX answer. Three things came out of investigating it:

**The skein is a lossy subset of the transcript.** `SkeinExporter` can emit
`[OK]` + a literal block, or `[SKIP]`. Those are 0.16 % and 0.13 % of the
assertions authors actually write. `[OK: contains "…"]` — 2822 uses, 89.8 %,
and 92.6 % counting the whole contains family — is unreachable from the skein,
because "which fragment of this output do I care about" is a judgment the skein
has no place to record. An exported thread must be hand-rewritten before it
resembles anything else in the repository, and nothing hand-written can
round-trip back.

**The verification it added is weaker than the one that shipped.** ADR-294's
`.golden` recordings carry provenance — `derivation`, `save-format`,
`channels`, `events`, `locale`, `forces` — so a mismatch is reported as a
named `stale recording — re-bless` rather than a content diff. A `.skein`
carries `schemaVersion`, `seed`, and `{command, output}`. It therefore cannot
tell a regression from a seed-derivation bump. That is not a defect to fix; it
is a missing field that the golden format already has, and it is already in
the carryover list as a known landmine ("existing `.skein` files hold outputs
captured at clock seeds … they would read as findings").

**The drift lifecycle already existed.** `Rebless.swift` predates the skein,
locates the blessed literal a failed command owns, rewrites it, and *refuses*
to touch `[OK: contains]` because widening a deliberately narrow claim is a
silent weakening (ADR-282 D2). The skein's blessing has no concept of a claim
narrower than the whole output, so it cannot express that refusal.

**The tool already exists as a library, and the IDE is already its client.**
`@sharpee/transcript-tester` exports the parser, the runner, `serializeGolden`/
`parseGolden`, `CoverageTracker`, `searchOutcome`, `startWatch`, the NDJSON
aggregators, and `loadStory`/`createTestableGame`/`findTranscripts` — every
capability this ADR needs except an editor UI and a `.transcript` serializer.
The IDE does not embed any of it: `TestRunner.swift:96` spawns
`sharpee test <story> --json` as a child process, and `TestResultRecord.swift`
declares itself "Swift mirror of the `@sharpee/ide-protocol` wire contract".
The question of where an editor should live was therefore already answered by
the shape of the code; ADR-299 built the UI on the far side of that boundary
from the engine, and every Swift mirror since has been paying for it.

Set beside those: `blessing` ≈ `[OK]`, `findings` ≈ a failing test,
`SkeinVerifier` ≈ `--test`, a thread ≈ a `.transcript`. ADR-299 built a second
expectation format, a second verification engine and a second results view, then
an exporter to convert the second back into the first. The two tabs fight
because they are one job.

---

## Decision

**D0 — The tool is standalone and CLI-hosted, not an IDE panel.** The editor,
the run-and-results surface, and the testing-intelligence surfaces (coverage and
forcing — ADR-294 D13; watch — D14; coverage in `repokit verify` — D16) ship as
a tool the CLI serves, with a framework-free web interface built on
`packages/platform-browser`, reusing the substrate `--browser` already builds.
It is not a tab inside the macOS IDE. This decision is upstream of every other
one here: D2, D6 and D9 are all statements about where the surface lives, and
they now read against this.

**This redirects ADR-294 D13's delivery target.** D13 plans the suggestion
surface as "a CLI `--coverage` report emitted over the ADR-277 NDJSON wire,
which hands the IDE's Test tab everything it needs to build the 'scaffold this
test' panel later." The CLI-first half is unchanged and remains correct; the
later panel lands in this tool instead of the IDE's Test tab, for the same
reason the editor does.

Three facts force it, all established in Context above: the engine is already a
standalone TypeScript library; the IDE is already only a child-process client of
it over the ADR-277 wire; and an IDE-hosted editor could reach Chord stories
only, which excludes 134 of 183 transcripts including the walkthrough chain that
is the regression baseline.

What this buys, beyond reach: **one corpus under one canonical format** instead
of one convention for Chord stories and another for everything else; **the
serializer sits beside the parser** in the package that owns the grammar, with
`golden.ts` as the working precedent — `serializeGolden` and `parseGolden` ship
as a matched pair, in that package, pinned by its own tests — rather than
mirroring the grammar across the TS↔Swift boundary a third time; and the
testing-intelligence surfaces reach Linux and Windows, which an AppKit panel
never will. Those surfaces are author-facing product, not internal tooling, and
a macOS-only home was always the wrong one for them.

**D1 — The artifact is the `.transcript` file. There is no second format.**
The tool edits the file the runner runs, the repository commits, and the
walkthrough chain uses as its regression baseline. `.skein` is retired: no
new writer, no reader, and `play-testing/` stops being a committed artifact
directory. How turns become a transcript is D12's, not this decision's.

**D2 — Keep what ADR-299 got right, name it, and carry it over.** The
supersession is of the *artifact and verification* model, not of the
interaction design. These survive as **design**; under D0 the Swift that
implements some of them does not travel, and is rebuilt in the tool's runtime.
`Rebless.swift` is the sharp case — its rules carry (locate the block a command
owns, replace only its content, refuse to widen a `contains` claim), its Swift
does not. Session dd4189's canvas and card code is in the same position. This
is a real write-off and it is recorded here rather than discovered later.

The ideas that carry:

- **Play authors the transcript.** Writing a transcript by hand means typing
  commands blind and pasting expected output; playing the story instead is the
  genuinely valuable idea in ADR-299 and the reason to build the tool at all.
  ADR-299's *mechanism* — play appends to an open artifact — does not carry;
  D12 replaces it with promotion from a session log.
- **Replay to a point.** Land on a chosen turn with the story live there
  (ADR-299 D6). The gesture carries; `ReplayDriver`'s mechanism does not —
  D12's per-turn save cache makes the landing O(1) instead of a re-run from
  the top.
- **Branch columns.** The badge canvas built in session dd4189
  (`SkeinBranchLayout` / `SkeinBranchCanvas`) survives with its columns
  re-pointed: **one column per transcript file**, not per tree path. This is
  closer to the Inform 7 picture David asked for, and a column becomes
  something committable and diffable.
- **The card-per-turn reading surface.** Command, expected, actual, verdict as
  the card's tint (session dd4189's rulings: plain if unblessed, green if
  blessed, no ✓/✗ column, no per-segment check/x gesture).

**D3 — Every assertion form in the grammar is authorable in the editor.** The
point of the tool is that the forms nobody reaches by hand — `[EVENT:]`,
`[STATE:]`, `[FAIL:]`, `[TODO:]` — get a gesture, and that the one structural
construct, `[GOAL:]`, gets rendered rather than typed (D15). The editor must
reach all of:

`[OK]`+block · `[OK: contains "…"]` · `[OK: contains]`+block ·
`[OK: not contains "…"]` · `[SKIP]` · `[FAIL: reason]` · `[TODO: note]` ·
`[EVENT: true|false, N?, type="…" key="value"]` ·
`[STATE: true|false, expression]` · `[GOAL: name]`/`[END GOAL]` · `#` comments
· `$save`/`$restore` · `$`-prefixed ext-testing commands.

`[CHANNEL: <id>, contains "…"]` and `[CHANNEL: <id>, not contains "…"]` read a
named channel instead of the main prose (added 2026-08-04, session 088e3e).
Main carries a command's response; everything else the story says — the banner,
the prologue, the status line — travels on its own channel, and naming one is
how a transcript asserts on it. The channel must appear in the header's
`channels:` list or the assertion fails by name saying so, rather than reading
an empty string and passing a `not contains` for the wrong reason.

**Assertions may also appear above the first command**, where they are about the
game's opening — the banner and the prologue happen before anything is typed, so
they have no command to hang off. They run once and report as `(opening)`. This
position previously parsed and was then silently discarded.

`[EVENTS: N]` is absent from that list deliberately — D16 drops it from the
grammar.

Plus the header: `title`, `story`, `entry`, `author`, `description`, `seed:`/
`seeds:`, `channels:`, `events:`, `locale:`, `forces:`, `point-seed:`.

**D4 — `contains` is the default, chosen by selection, not by typing.** The
corpus says the assertion authors want 92.6 % of the time is a *fragment of
the response*. So the primary gesture is: run the turn, **select the words that
matter in the actual output, and the editor writes
`[OK: contains "…"]`** with the selected text. Selecting nothing and accepting
the whole response writes `[OK]` + a literal block. The rare form stays
available; the common form is one drag.

This is the direct answer to why ADR-299's export felt like a dead end: it
defaulted to the form authors almost never write, because verbatim capture was
the only thing the skein modelled.

**D5 — Removed grammar is not reachable, by construction.** The editor offers
no affordance for `[OK: any]`, `[OK: contains_any]`, `[OK: matches]`,
`[WHILE:]`, `[RETRY:]`, `[DO]`/`[UNTIL]`, `[IF:]`, `[REQUIRES:]`,
`[ENSURES:]`, or `[NAVIGATE TO:]` (ADR-294 D2/D4). A UI that can only produce
legal grammar is the cheapest possible enforcement of a removal.

**D6 — Verification is running the transcript. There is no second engine.**
`SkeinVerifier`, `SkeinFinding`, and the whole-skein sweep are deleted. A
turn's verdict comes from the runner's result for that turn. Under D0 the tool
calls `runTranscript` in-process rather than reading verdicts off the ADR-277
NDJSON wire — the wire remains, because the IDE still needs it (D9), but the
tool that writes assertions and the engine that judges them stop being separated
by a subprocess. One engine, one truth, and the surface that runs tests and the
surface that writes them become one surface.

**D7 — Drift is re-bless, and `Rebless` owns it.** When a run fails because the
prose was reworded, the author re-blesses: the assertion keeps saying what it
said and only the text it names is updated. `Rebless.swift`'s existing refusal
stands — a `[OK: contains]` fragment is never silently widened to the whole new
response. The editor surfaces the refusal as a choice (keep the narrow claim,
or replace it deliberately), which is the affordance ADR-282 D2 always implied
and never had a home for.

**D8 — Blessing scope and all-paths invariance are dropped, not ported.**
ADR-299 D3/D4's `all-paths` claim resolved "the same story position" to *the
node's command*, because ADR-299 declines to model convergence. On Fernhill one
`north` blessing raised three false objections, since `north` occurs in five
rooms. A cross-file assertion keyed on command text, with no notion of place,
has no transcript equivalent and no demonstrated demand. If invariance is
wanted later it should be designed against places, not command strings, in its
own ADR.

**D9 — The IDE keeps one Testing tab, and it is a client, not an editor.** The
`Testing` and `Test` tabs still merge — two tabs fighting over one job was a
real defect and it is fixed by removing one of them. But what the merged tab
*is* changes under D0: it lists the story's transcripts (`TestPanelModel`'s
existing discovery under `tests/transcripts/` and `walkthroughs/`), runs one or
all, and shows results. That is precisely what `TestRunner` and
`TestResultRecord` already do over the `--json` wire, so the merged tab is
mostly deletion of the skein half. Authoring — recording, asserting,
re-blessing — happens in the standalone tool. `Play` stays its own tab; it is
the running game, not a test surface.

The IDE may later embed the tool's web interface rather than keep its own
panel. That is an option D0 leaves open, not a commitment made here.

**D10 — The explorer proposes files.** `@sharpee/skein`'s output (ADR-294,
planned) is *proposed transcripts*: they appear in the list under `Proposed`,
the author opens one, reads it as an ordinary transcript, and accepts it into
`tests/transcripts/` or discards it. ADR-299's per-node `origin` flag is
retired unused. Nine phases produced no adoption UI because a badge on a tree
node cannot express "review this whole path and accept it"; a file can.

**D11 — The editor edits a model; the file is written by a canonical
serializer.** (Resolves the former Q1, session c42886.) The tool parses a
transcript into the model `@sharpee/transcript-tester` already produces, edits
that model, and re-serializes the whole file on save. Formatting is
machine-owned, on gofmt's terms, and **D17 specifies exactly what the serializer
emits**: the repository's transcripts are normalized
once, in a single reviewable commit, and thereafter serialization is
deterministic over an already-canonical corpus, so an ordinary edit produces a
minimal diff. Backward compatibility is not a constraint here — that is the
standing project rule, and removing it is what makes this option available.

The source pane survives as a **generated, read-only view** beside the cards, so
an author sees exactly what will be committed before committing it. It is a
projection of the model, not the truth.

Two measurements make this safe, both taken 2026-08-04 over
`stories/**/*.transcript`:

- **Every transcript parses clean.** `parseTranscript` over all 185 files:
  185 clean, 0 with parse errors. There is no unparseable-file case for the
  model to fail on.
- **Nothing relies on blank-line detachment.** All 6 `text` openers in the
  corpus sit immediately after `[OK]` or `[OK: contains]`
  (`dungeo/tests/transcripts/adr-287-fenced-literals.transcript` ×4,
  `fernhill/tests/transcripts/recorded.transcript` ×2). ADR-287 D2's detached-
  `text`-as-prose case exists in the grammar and has zero uses, so the
  serializer rule "never emit a blank line between an assertion and its block"
  is semantics-preserving across the whole corpus. This matters because blank
  lines are grammar here, not formatting (`parser.ts:316`), and the model has no
  blank-line item — `items[]` carries only `command`, `directive` and `comment`.

**Acceptance gates.** The serializer ships only with (1) a round-trip fidelity
test — parse, serialize, parse again, assert model equality — run over every
transcript in the repository, which is what proves nothing the parser silently
drops is deleted on save; and (2) a normalization commit that leaves the
walkthrough chain byte-identical, one run each side, which is sound because runs
are deterministic at the pinned seed (ADR-293 Phase D).

**What the model buys.** Structural edits exist at all: wrapping turns in a
`[GOAL:]`, reordering, splitting a file, deleting a turn are one operation each
rather than multi-range text surgery. D3's per-form editors become views over
structs rather than bespoke text-range writers — one write path instead of one
per form. And files the explorer proposes (D10) come out in the same canonical
shape as hand-written ones, permanently.

**What it costs.** A file that fails to parse cannot be opened for structural
editing or saved; today none do, and the tool refuses the save rather than
guessing. Authors who hand-edit outside the tool get normalized on the next
save, which is the gofmt bargain and is stated here so it is not a surprise.

**Rejected.** *Text-first* (mock 4): preserves bytes, but cannot show the
story's output beside the assertion, and the output is where the assertion comes
from — D4's core gesture would have nothing to select from. *Surgical hybrid*
(mock 5): its sole advantage over the model was byte preservation, which is not
a constraint; it costs a separate write routine per grammar form and forgoes
structural editing entirely. Mocks 1–3 are the shape that ships.

**D12 — Play is play; transcripts are promoted from the session log.**
(Resolves the former Q2, session c42886.) There is no record mode, no recording
target, and no transcript "open for recording" while playing. Playing a story
accumulates a **session log** — for each turn: the command, the output, the
events, and an engine save. The author afterwards selects a contiguous range of
turns and promotes it into a transcript document, then authors assertions over
it (D4) and signs off.

This is further from ADR-299 than D2's other carried-over ideas, and
deliberately so. Recording into an artifact forces the question "is this
test-worthy?" *before* the turns happen. Authors know afterwards. Removing the
target removes the mode, which is what ADR-299 claimed and did not achieve.

**This supersedes ADR-290 D1–D4.** ADR-290 identifies the same defect this
decision addresses — "a transcript replays from turn zero, so a capture that
does not begin at turn zero is not a test" — and solves it by making capture an
atomic mode that restarts the story on entry (D1), with restart-inside-the-mode
(D3) and explicit save-or-discard exits (D4). D12 preserves ADR-290 D1's
*invariant* — every transcript begins at turn zero — and reaches it by the
opposite route: carrying the prefix at promotion time makes the mid-play-start
capture unrepresentable without constraining play at all. The mode, its restart
semantics and its exits are therefore not needed and are superseded; ADR-290
D5–D8 (the client-rendered blessed mark, the optional menu, the inferred save
location) are untouched and still apply, D8 being where a promoted file's
destination is decided. ADR-290's open question 2 — how the author sees whether
a bless asserts a fragment or the whole response — is answered by D4.

**A promoted transcript carries its prefix.** A `.transcript` replays from the
start of the game, so a selection beginning at turn 28 is not runnable alone.
Turns 1–27 are included, assertion-free; the editor collapses them, and the
runner reports a failure inside the setup region as *setup broke*, not as a
failed assertion. Rejected: cutting from a committed save — a test that depends
on a versioned binary artifact which story edits silently staleify, and which
would then pass for the wrong reason; and chain membership — correct for `wt-*`
files, wrong as the default for a standalone test.

**Preconditions are stated with `[STATE:]`, and need no new grammar.** A
`[STATE: true, lamp.lit = true]` on the last setup turn documents what the test
depends on and fails fast and by name when a story change breaks the prefix,
instead of surfacing as a text mismatch thirteen turns later. D5 stands: nothing
is added to the grammar for this. It also gives `[STATE:]` a job — five uses in
the entire corpus is grammar with no purpose rather than dead grammar, which is
the same diagnosis D16 applies to `[TODO:]`.

**Per-turn saves are an authoring cache, never a citation.** The log's saves
make replay-to-a-point O(1) rather than `ReplayDriver`'s re-run from the top,
and make promotion instant. They are keyed on story build + prefix commands +
seed, so a story edit changes the key, misses, and replays for real — there is
nothing to invalidate by hand and nothing committed. No transcript ever
references a save.

**Verification always runs from turn 1.** Restore is not equivalent to play:
`search.ts` records that "occurrence counters are session state and are not
rolled back by restore," so a save-jumped session can diverge from a real run.
Sign-off therefore means *the file ran clean from the top* — no committed
transcript is ever verified from a restored save, and the divergence cannot
reach the repository.

**D13 — Editing marks the golden stale; sign-off re-records it.** (Resolves the
former Q3, session c42886.) Editing a transcript neither re-records its paired
`.golden` nor refuses the edit. The editor marks the recording stale the moment
the command list changes — eagerly, before anything runs, because the editor
already has the information. The runner's own detection stands unchanged as the
backstop: command-list drift (`runner.ts:262`) and per-field provenance
staleness (`staleProvenanceFields`, `runner.ts:480`) both already report
`stale recording — re-bless` with the drift named.

Rejected: **auto-re-record on save**, which would let the baseline absorb
whatever the story now prints with nobody looking — the silent weakening
ADR-282 D2 forbids for `contains`, and worse at file scale; and **refusing the
edit until re-recorded**, which would require blessing a version the author is
about to discard.

Sign-off (D12) is the re-record. A clean run from turn 1, then bless — explicit,
author-initiated, and on a verified full run, which is what blessing has always
meant, now at file granularity rather than per node. Transcripts with no golden
are unaffected.

**D14 — Walkthroughs use the same editor; chain membership stays a directory
convention.** (Resolves the former Q4, session c42886.) A `wt-*` file is an
ordinary transcript: same model, same serializer, same assertion gestures.

**Running is never in isolation.** "Run" on `wt-07` means run `wt-01` through
`wt-07`, and sign-off means a clean chain run through that member. This falls
out of D12 rather than needing its own machinery — the save cache is keyed on
story build + prefix + seed, and for a chain member the prefix is the preceding
files instead of earlier turns in the same file.

**Promotion is the one asymmetry.** D12's carry-the-prefix rule does not apply
to a new chain member: its prefix is the preceding files, so it starts where its
predecessor ended. This is the exception D12 names.

**Membership is implicit**, and this ADR is where the convention is now
recorded: `walkthroughs/*.transcript`, sorted by filename, is one chain per
story. All 26 chain files in the repository follow `wt-NN-slug.transcript`
(dungeo 17, friendly-zoo 7, fernhill 1, channel-service-test 1) and none
declares membership. Rejected: a `chain:` header field — it adds grammar to
prevent failures (two chains in one story, a member outside `walkthroughs/`)
that four stories have never produced. Until then the convention lived only in
`CLAUDE.md`, which is why it is written down here.

**D15 — `[GOAL:]` renders as a section, and a section is a unit.** (Resolves
the former Q5, session c42886.) The editor draws `[GOAL:]`/`[END GOAL]` as a
collapsible band grouping the cards between them, composing with D12's collapsed
setup prefix rather than competing with it. It is the grammar's only grouping
construct, and a two-hundred-line walkthrough with five goals reads as five
chunks instead of one scroll.

In the model a goal is a **section object, created and deleted as a unit**, so
balance is structural: no gesture produces an orphaned `[END GOAL]`. That is D5's
argument — a UI that can only produce legal grammar is the cheapest possible
enforcement — applied to the one construct with no enforcement at all today,
since both markers are runtime no-ops (`runner.ts:797`, "GOAL markers are
structural and always succeed") and an unbalanced one fails silently. The corpus
is currently balanced at 114 openers and 114 closers across 18 files.

**No runtime change.** Goals are the obvious unit for reporting — "Goal 'Get to
Troll Room': 12 turns, all passed" — which would give 114 documentation markers
something the runner earns value from. That is a reporter change and belongs to
ADR-294's lineage, not here. Recorded, not adopted.

**D16 — `[TODO:]` is kept and surfaced; `[EVENTS: N]` is dropped.** (Resolves
the former Q6, session c42886.) Both have zero uses across all 183 transcripts
and both survived ADR-294's cull, but they fail for opposite reasons.

**`[TODO: note]` stays, and the editor gives it a one-click gesture** — mark a
turn pending, not yet implemented, expected to fail. That is a real authoring
workflow which has never had a surface: today it is reachable only by
hand-typing a form an author would have to already know exists. Same diagnosis
as `[STATE:]` in D12 — grammar with no job rather than dead grammar — and this
tool is the first thing that can give it one. Surfacing it is the experiment
that settles whether it was unwanted or merely invisible.

**`[EVENTS: N]` is dropped from the grammar.** It asserts a bare event count
without naming the events. `[EVENT: …]` at 209 uses does the meaningful version;
a count breaks whenever any unrelated event is added anywhere in the turn, so it
is brittle by construction and tells no story `[EVENT:]` does not tell better.
Zero uses here reads as correctly ignored rather than undiscovered. The removal
itself is a parser change of ADR-294's class, executed as a separate small
commit against `packages/transcript-tester`; this ADR's part is dropping it from
D3's list so the editor never surfaces it (D5).

**Kept without change:** `[FAIL: reason]` (10 uses, clear job) and
`[OK: contains]`+block (1 use, but the multi-line member of the family that
accounts for 98 % of all assertions).

**D17 — The canonical form ratifies the corpus's dominant style.** D11 makes
formatting machine-owned; this is what the machine emits. The governing
principle is **majority rules**: every rule below is the convention the existing
corpus already follows most often, so the normalization commit is as small as it
can be and no rule is a matter of taste anybody has to relitigate. Surveyed over
all 185 files, 2026-08-04.

*Unanimous or near-unanimous — ratified without argument:*

| Rule | Corpus |
| --- | ---: |
| File ends with a trailing newline | 185 / 185 |
| Command is `> ` plus the command, single space | 3550 / 3550 |
| `contains` values use double quotes | 2919 / 0 |
| Assertions and directives start at column 0 | no exceptions |
| Blank line after `[GOAL: …]` | 114 / 114 |
| Blank line after the `---` separator | 183 / 185 |
| Comment is `# ` plus text, single space | 2500 / 2534 |
| Header continuation lines indent 2 spaces | 181 / 185 |

*Split, decided by majority:*

- **A blank line precedes each stanza** (1861 / 3550). A stanza is its leading
  comments plus the command plus its assertions — the blank goes above the
  comments, not between a comment and its command, which is what 1548 of 2534
  comments already do.
- **A blank line precedes the `---` separator** (113 / 185). Chosen on churn,
  not aesthetics; the tighter front-matter style is defensible and this is the
  cheapest rule to overturn.

*Rules the model forces, having no other answer:*

- **Header fields emit in D3's enumeration order** — `title`, `story`, `entry`,
  `author`, `description`, `seed`/`seeds`, `channels`, `events`, `locale`,
  `forces`, `point-seed` — absent fields skipped. This matches the dominant
  observed order (`title, story, description`, 138 files) and moves `seed:`
  after `description:` in the 11 files that currently precede it, making them
  agree with the 8 that already follow it.
- **Long header values re-fold at 78 columns with a 2-space continuation.** The
  parser joins folded values into one string, so the model carries no fold
  information and the serializer must choose. Re-folding is a deterministic
  function of the value, so it round-trips; 40 files currently fold and will be
  re-wrapped.
- **Assertions emit in model order, never reordered.** Order may carry meaning
  for positional `[EVENT:]` forms, and reordering would be churn with no reader
  benefit. 577 stanzas carry more than one assertion.
- **A block's `text` / `end text` sit at column 0 with content verbatim, and no
  blank line separates an assertion from its block** — the one semantic rule,
  established in D11.

**The normalization diff, as measured after the fact** (2026-08-04, session
088e3e — these numbers replace this section's original forecast, which was
wrong in both magnitude and shape):

| | files | lines |
| --- | ---: | ---: |
| transcripts rewritten | 152 of 185 | `+629 / -533` |
| blank lines | | `+222 / -235` |
| content lines | | `+407 / -296` |

The forecast predicted ~1689 blank-line insertions and **no removals**. Two
things account for the gap. The corpus was already far closer to canonical than
the survey implied, so few blanks needed adding. And the model carries no
blank-line item, so 235 blank lines used for vertical spacing were dropped —
111 between a banner comment and its `[GOAL:]`, 53 between a comment and its
command, 54 inside comment runs. Ruled acceptable: these transcripts are
generated rather than hand-authored, so there is no author spacing to preserve
and no `blankBefore` model field is warranted.

The gate is unchanged and held: a byte-identical walkthrough chain across the
commit, 952 passing on both sides.

---

## Acceptance Criteria

**AC-1 (D0) — the tool runs with no IDE present.** `sharpee test --ui` serves
the tool; a story opens, a transcript is edited, run and signed off with the
macOS IDE neither installed nor running, on both macOS and Linux.
*SELF-VERIFYING.*

**AC-2 (D0, D6) — one engine, in-process.** The tool's run path calls
`runTranscript` directly and spawns no `sharpee test` subprocess. The ADR-277
wire still exists and the IDE still uses it (D9). *SELF-VERIFYING* — assert on
the absence of a child process in the tool's run.

**AC-3 (D11) — round-trip fidelity.** For every `.transcript` under `stories/`
(185 files): parse → serialize → parse yields a model equal to the first.
*SELF-VERIFYING* — this is the test that proves nothing the parser silently
drops is deleted on save.

**What AC-3 and AC-4 cannot see** (added 2026-08-04, session 088e3e, after both
gates passed through two separate losses). They are round-trip gates: they
compare the model against itself. Anything the *parser* discards on the first
read is already gone from both sides, so they agree about a file that has
already lost it. Two real cases hit this — folded header values being dropped
(176 lines across 41 files) and blank lines between comments being collapsed —
and both were green through AC-3 and AC-4 the whole time. Do not treat these
criteria as proving nothing is lost; that claim requires checking the parser
against the file, which is a different test.

**AC-4 (D17) — the serializer is idempotent.** Serializing an already-canonical
file is a byte no-op. *SELF-VERIFYING*, and it is the property that makes D11's
"an ordinary edit produces a minimal diff" true rather than aspirational.

**AC-5 (D11, D17) — normalization is semantics-preserving.** After the
normalization commit, the walkthrough chain's output is byte-identical to the
run before it, one run each side. *PREMISE-DEPENDENT* — the premise is
pinned-seed determinism, established by ADR-293 Phase D (verified 3×
2026-08-02) and by the corpus measurements in D11.

**AC-6 (D12) — end-to-end: play, promote, assert, sign off.** The worked
scenario, and the tool's reason to exist:

> Open `fernhill.story`, play 40 turns with no transcript open and no prior
> decision to record. Select turns 28–40 and promote them. The tool produces a
> transcript containing turns 1–40, with 1–27 assertion-free and collapsed in
> the editor. On turn 31's card, select the phrase "the tarnished key" in the
> actual output; the file gains `[OK: contains "the tarnished key"]` on that
> turn and nothing else changes. Sign off. The file runs clean from turn 1.

*SELF-VERIFYING.* Every clause is observable: the file exists, its first turn
is turn 1, the assertion names the selected fragment, and the run passes.

**AC-7 (D12) — the save cache cannot reach a committed artifact.** A transcript
promoted from a save-jumped session and one promoted from a played-from-the-top
session are byte-identical, and both run clean from turn 1. *SELF-VERIFYING* —
this is what guards the occurrence-counter divergence `search.ts` documents.

**AC-8 (D13) — editing marks stale, and nothing auto-re-records.** Editing a
command in a transcript with a paired `.golden` reports the recording stale
**without running anything**; the `.golden` on disk is unchanged after the save.
Sign-off, and only sign-off, re-records it. *SELF-VERIFYING.*

**AC-9 (D14) — a chain member runs as its chain.** "Run" on `wt-03` executes
`wt-01` through `wt-03`; no affordance runs it alone. Sign-off means the same
chain run passes. *SELF-VERIFYING.*

**AC-10 (D15) — goal sections cannot become unbalanced.** No editor gesture
produces an orphaned `[GOAL:]` or `[END GOAL]`; deleting a section removes both
markers and neither alone. *SELF-VERIFYING.*

**AC-11 (D5, D16) — the editor produces only legal grammar.** No affordance
emits `[OK: any]`, `[OK: contains_any]`, `[OK: matches]`, `[WHILE:]`,
`[RETRY:]`, `[DO]`/`[UNTIL]`, `[IF:]`, `[REQUIRES:]`, `[ENSURES:]`,
`[NAVIGATE TO:]`, or `[EVENTS: N]`; `[TODO: note]` has a one-click gesture on a
turn card. *SELF-VERIFYING.*

---

## Consequences

**Deleted.** `SkeinStore`, `SkeinDocument`/`SkeinNode`/`SkeinBlessing`,
`SkeinSession`, `SkeinVerifier`/`SkeinFinding`, `SkeinExporter`, and their
tests. The `play-testing/` directory and the `Play Testing` sidebar group
(`ProjectArtifacts.Kind.playTesting`). ADR-299 Phases 3, 4, 7, 8 and 9 are
substantially retracted; Phases 1–2, 5–6 survive as D2's carried-over
interaction.

**Retained in the IDE.** `TestPanelModel` / `TestRunner` / `TestResultRecord`
and the ADR-277 wire — D9's client is built from what already exists.

**Retained as design, rebuilt in the tool.** `SkeinBranchLayout` /
`SkeinBranchCanvas` (columns become files), `TranscriptView`'s card rendering,
`ReplayDriver`, `Rebless`'s rules, and the session dd4189 UX rulings. Under D0
these are specifications, not code that moves.

**A slice of session dd4189's Swift is written off.** The branch canvas, the
card surface and `Rebless.swift` were the good parts of that session and they
are rebuilt rather than ported. The designs are proven by having been used;
the implementations are on the wrong side of D0's boundary.

**The corpus stops being split.** All 183 transcripts come under one editor and
one canonical format, Dungeo's 134 included. Had the tool stayed in the IDE,
the repository would have carried two conventions permanently — canonical for
the 46 Chord-story files the IDE can open, hand-written for the rest — and the
walkthrough chain, the actual regression baseline, would have been in the
second group.

**Fernhill's committed `.skein` is deleted, not migrated.** It holds outputs
captured at clock seeds before the Phase-5 seed fix and would read as findings
under any verifier. There is nothing in it worth carrying: seven nodes of prose
that a single replay reproduces. (Per the no-backcompat standing rule; and the
save-format lesson does not apply — this is a dev artifact, not user data.)

**The repository's transcripts are reformatted once.** D11's normalization is a
single commit touching all 183 committed transcripts, to the canonical form D17
specifies. It is semantics-preserving by the measurements in D11, and its
acceptance gate is a byte-identical walkthrough chain across it. After that
commit the format is machine-owned. The diff is dominated by blank-line
insertion — see D17's tally — which makes it reviewable by inspection rather
than by trust.

**A transcript editor is more work than the skein was.** It must handle the
whole grammar, not command-and-expected-text cards; `[EVENT:]` and `[STATE:]`
editing are real features. That cost buys authorability of the artifact that is
actually kept, which the skein could never reach.

**`--chain` carries the shared-prefix case.** Ten transcripts opening with the
same twenty moves replay them ten times where the skein branched once. The cost
is machine time, not author time, and `--chain` already composes transcripts
that share state. This is the one real capability the supersession gives up and
it is recorded here so the trade is visible rather than rediscovered.

**The session log is memory the tool must hold.** One engine save per turn for
the length of a play session — small artifacts, a few hundred turns, tens of
megabytes at worst. Checkpoint spacing would reduce it and is not worth the
complexity. Nothing is written to disk.

**Promoted transcripts are long by default.** Carrying the prefix (D12) means a
test of thirteen interesting turns is a file of forty. That is the deliberate
trade for a file that always runs standalone and always from a reachable state;
the collapse in the editor is what makes it readable, not a shorter file.

**One grammar removal lands outside this ADR's code.** D16 drops `[EVENTS: N]`,
which is a parser change against `packages/transcript-tester` of ADR-294's
class, not editor work. It is a separate small commit; zero transcripts use the
form, so nothing migrates.

**Deterministic capture is a precondition, and it already holds.** Recording
into a transcript is only sound because runs are byte-identical at a pinned
seed (ADR-293 Phase D, verified 3× 2026-08-02).

---

## Session

Session dd4189 (2026-08-04, branch `main`). Written overnight, unattended, at
David's explicit request after he went to bed; the supersession is proposed,
not decided. Research: `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md`.
Mocks: `docs/work/ide-transcript-editor/mock-{1..5}-*.html`.

Rescoped in session c42886 (2026-08-04, branch `main`) during the Open Questions
interview. David asked whether the Dungeo transcripts were in scope, which
surfaced that an IDE-hosted editor reaches only Chord stories; he then proposed
a standalone tool covering every transcript. D0 is his call, folded in before
Q1 was answered — Q1 through Q6 are interviewed against it.
