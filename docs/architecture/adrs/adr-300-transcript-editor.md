# ADR-300: The Testing Tab Edits Transcripts

**Status**: DRAFT (2026-08-04, session dd4189) — written overnight at David's
request after the ADR-299 UX session. Open Questions unresolved; **must not be
flipped to ACCEPTED until they are** (DevArch rule 11a). Proposes superseding
ADR-299's artifact and verification model.

**Parent**: ADR-299 (play–skein–bless — superseded artifact model; its
interaction ideas are retained and named in D2), ADR-294 (golden transcripts,
the assertion/recording two-tier contract — **the authority this ADR defers
to**), ADR-293 (pinned seeds, choice points, forcing — the substrate, carries
forward), ADR-287 (fenced literal blocks — the block grammar an editor writes),
ADR-282 (re-bless drift lifecycle — retained, and finally given a home).

**Supersession ownership**: on acceptance, the same commit edits ADR-299's
Status to SUPERSEDED (artifact and verification model; the play-records-turns
and branch-navigation ideas retained per D2) citing ADR-300. Owner: whoever
performs the acceptance flip.

**Evidence**: `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md`.
Every count cited below is from that document and was taken over the real
corpus on 2026-08-04.

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

Set beside those: `blessing` ≈ `[OK]`, `findings` ≈ a failing test,
`SkeinVerifier` ≈ `--test`, a thread ≈ a `.transcript`. ADR-299 built a second
expectation format, a second verification engine and a second results view, then
an exporter to convert the second back into the first. The two tabs fight
because they are one job.

---

## Decision

**D1 — The artifact is the `.transcript` file. There is no second format.**
The IDE edits the file the runner runs, the repository commits, and the
walkthrough chain uses as its regression baseline. `.skein` is retired: no
new writer, no reader, and `play-testing/` stops being a committed artifact
directory. Capture during play writes into the open transcript (D4), not into
a parallel record.

**D2 — Keep what ADR-299 got right, name it, and carry it over.** The
supersession is of the *artifact and verification* model, not of the
interaction design. These survive verbatim:

- **Playing records turns.** There is no record toggle; typing a command in
  Play appends it to the open transcript. This is the genuinely valuable idea
  in ADR-299 — writing a transcript by hand means typing commands blind and
  pasting expected output — and it is the reason to build the tool at all.
- **Replay to a point.** Re-run the file from the top to a chosen turn and
  leave the story live there (ADR-299 D6, `ReplayDriver`, unchanged).
- **Branch columns.** The badge canvas built in session dd4189
  (`SkeinBranchLayout` / `SkeinBranchCanvas`) survives with its columns
  re-pointed: **one column per transcript file**, not per tree path. This is
  closer to the Inform 7 picture David asked for, and a column becomes
  something committable and diffable.
- **The card-per-turn reading surface.** Command, expected, actual, verdict as
  the card's tint (session dd4189's rulings: plain if unblessed, green if
  blessed, no ✓/✗ column, no per-segment check/x gesture).

**D3 — Every assertion form in the grammar is authorable in the editor.** The
point of the tool is that `[EVENT:]`, `[STATE:]`, `[FAIL:]` and `[GOAL:]` stop
being hand-written. The editor must reach all of:

`[OK]`+block · `[OK: contains "…"]` · `[OK: contains]`+block ·
`[OK: not contains "…"]` · `[SKIP]` · `[FAIL: reason]` · `[TODO: note]` ·
`[EVENTS: N]` · `[EVENT: true|false, N?, type="…" key="value"]` ·
`[STATE: true|false, expression]` · `[GOAL: name]`/`[END GOAL]` · `#` comments
· `$save`/`$restore` · `$`-prefixed ext-testing commands.

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
turn's verdict comes from the runner's result for that turn — which the Test
panel already receives (`TestResultRecord`). One engine, one truth, and the
tab that runs tests and the tab that writes them become the same tab.

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

**D9 — One Testing tab.** The `Testing` and `Test` tabs merge. The tab lists
the story's transcripts (what `TestPanelModel` already discovers under
`tests/transcripts/` and `walkthroughs/`), opens one for editing, runs one or
all, and shows results against the turns that produced them. `Play` stays its
own tab — it is the running game, not a test surface.

**D10 — The explorer proposes files.** `@sharpee/skein`'s output (ADR-294,
planned) is *proposed transcripts*: they appear in the list under `Proposed`,
the author opens one, reads it as an ordinary transcript, and accepts it into
`tests/transcripts/` or discards it. ADR-299's per-node `origin` flag is
retired unused. Nine phases produced no adoption UI because a badge on a tree
node cannot express "review this whole path and accept it"; a file can.

---

## Consequences

**Deleted.** `SkeinStore`, `SkeinDocument`/`SkeinNode`/`SkeinBlessing`,
`SkeinSession`, `SkeinVerifier`/`SkeinFinding`, `SkeinExporter`, and their
tests. The `play-testing/` directory and the `Play Testing` sidebar group
(`ProjectArtifacts.Kind.playTesting`). ADR-299 Phases 3, 4, 7, 8 and 9 are
substantially retracted; Phases 1–2, 5–6 survive as D2's carried-over
interaction.

**Retained and re-pointed.** `SkeinBranchLayout` / `SkeinBranchCanvas`
(columns become files), `TranscriptView`'s card rendering, `ReplayDriver`,
`Rebless`, `TestPanelModel` / `TestRunner` / `TestResultRecord`, and the
session dd4189 UX rulings.

**Fernhill's committed `.skein` is deleted, not migrated.** It holds outputs
captured at clock seeds before the Phase-5 seed fix and would read as findings
under any verifier. There is nothing in it worth carrying: seven nodes of prose
that a single replay reproduces. (Per the no-backcompat standing rule; and the
save-format lesson does not apply — this is a dev artifact, not user data.)

**A transcript editor is more work than the skein was.** It must handle the
whole grammar, not command-and-expected-text cards; `[EVENT:]` and `[STATE:]`
editing are real features. That cost buys authorability of the artifact that is
actually kept, which the skein could never reach.

**`--chain` carries the shared-prefix case.** Ten transcripts opening with the
same twenty moves replay them ten times where the skein branched once. The cost
is machine time, not author time, and `--chain` already composes transcripts
that share state. This is the one real capability the supersession gives up and
it is recorded here so the trade is visible rather than rediscovered.

**Deterministic capture is a precondition, and it already holds.** Recording
into a transcript is only sound because runs are byte-identical at a pinned
seed (ADR-293 Phase D, verified 3× 2026-08-02).

---

## Open Questions

**Q1 — Does the editor edit text, or a model?** A structured card editor that
round-trips through the parser risks reformatting files authors hand-wrote
(comment placement, blank lines, block indentation). A text editor with
assertion affordances layered over it preserves the file byte-for-byte but
makes cards harder. The five mocks in
`docs/work/ide-transcript-editor/` exist to make this choice concrete —
mocks 1–3 assume a model, mock 4 assumes text, mock 5 is a hybrid.

**Q2 — Where does capture go when no transcript is open?** Playing has to
record somewhere. A scratch/untitled transcript the author later names? An
explicit "recording into: <file>" target chosen before play? Appending to the
last-opened file is the one option that is clearly wrong.

**Q3 — What happens to a golden recording when its transcript is edited?**
ADR-294 pairs `.transcript` with `.golden`. Editing turns invalidates the
recording. Does the editor re-record on save, mark it stale, or refuse the edit
until re-recorded?

**Q4 — Do walkthroughs get the same editor?** `wt-*.transcript` files run
chained and depend on prior state. Editing one in isolation is meaningful, but
running it in isolation is not. Does the editor understand chain membership?

**Q5 — Is `[GOAL:]` structural furniture the editor renders, or just text?**
114 uses, and it is the only grouping construct — it likely wants to be a
section header in the card list rather than a card.

**Q6 — Are `[EVENTS: N]` and `[TODO: …]` wanted at all?** Both have **zero**
uses in the corpus. They survived ADR-294's cull and nobody has ever reached
for them. Either they are undiscoverable — in which case surfacing them in the
editor is the experiment that proves it — or they are dead grammar the parser
is still carrying. D3 says the editor reaches the whole grammar; this asks
whether "the whole grammar" should first get smaller.

---

## Session

Session dd4189 (2026-08-04, branch `main`). Written overnight, unattended, at
David's explicit request after he went to bed; the supersession is proposed,
not decided. Research: `docs/work/ide-transcript-editor/research-20260804-transcript-authoring.md`.
Mocks: `docs/work/ide-transcript-editor/mock-{1..5}-*.html`.
