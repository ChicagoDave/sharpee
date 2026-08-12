# ADR-312: Recording Tests from the Command Line — a Second Writer, One Model

**Status**: ACCEPTED (2026-08-12, session 1744e6) — all four open questions
resolved by interview the same session (D8 reconcile, D5 committed list, D9
command spelling; the fourth dissolved by D8 rather than answered);
`adr-review` 11/18 NEEDS WORK → four gaps closed (Implementation section, D8's
enumerated steps, the worked example, and the `<name>.list.txt` naming rule) →
18/18 READY FOR IMPLEMENTATION; accepted by David on the re-reviewed result.
Implementation awaits its own plan. **Provenance caveat**: the review was
self-administered — the same session authored and graded it — so the 18/18 is a
checklist pass, not independent scrutiny.
**Date**: 2026-08-12 (session 1744e6, from the Chord-docs staleness sweep)
**Parent**: ADR-307 (the tree document is the model and its only serialization;
this ADR amends its recorder claim), ADR-294 (the golden tier's "a command
script plus a pinned seed plus a recording" shape, and D10's blessing hazard),
ADR-300 (addressable channels — what "per element" addresses), ADR-187 (the
two-CLI split; `sharpee` is the author tool this lands in).
**Amends**: ADR-307's identification of the IDE's Testing tab as *the* recorder.

## Context — verified, not assumed

Every claim in this section was read out of the working tree on 2026-08-12.

### The CLI can run tests but cannot create one

`sharpee test` resolves a project, discovers its tree document
(`<story-id>.tests.json` beside the `.story` file), and runs it through
branch-tester's walker. Its own header states the model is exclusive:

> The document is the ONLY test model for Chord projects: the transcript-file
> workflow (`tests/` discovery, `--chain`, explicit `.transcript` args) was
> retired by ADR-307's cutover — each retired form fails by name, never
> silently. (`packages/devkit/src/commands/test.ts:8-14`)

Nothing in the author CLI writes such a document. `play.ts` carries no record,
bless, or capture path, and the command set is `build, publish, compose,
build-browser, init, introspect, init-browser, ifid, register, list, test,
play`. The document is produced by playing in Chord Writer's Testing tab.

### Which makes test authoring macOS-only

Chord Writer is `ARCHS: arm64`, deployment target macOS 11 — and as of
2026-08-12 it **cannot** be built universal, because a universal bundle does not
clear notarization (ADR-279 D4's amendment; matched pair `5133a8de` hung 16min+
vs `ee8cf37e` Accepted ~30s after `lipo -thin arm64`). So the only way to author
a test is to own an Apple silicon Mac. Linux and Windows authors, and Intel Mac
authors, can replay tests forever and never write one.

Two places in shipped documentation assume otherwise: the download page directs
Intel users to "use the command-line tools instead" as a complete alternative,
and `/chord/getting-started` is a CLI-first path. That path taught `.transcript`
files until 2026-08-12 — not by neglect, but because the retired workflow was
the last one a terminal could author.

### The gap is a writer, not a model

What the tree world already has:

| Piece | Where | State |
| --- | --- | --- |
| Per-element assertion synthesis | `auto-assertion.ts` → `synthesizePolicyAssertions(policy, actualOutput, channelValues)` | shared by the runner and the tab's record-time synthesis |
| Granularity control | `AutoAssertionPolicy`: `all-emitted-text` \| `room-name-and-description` \| `room-description` | story header `auto-assertion:`; default `room-name-and-description` (David, 2026-08-10 — "auto assertion is the default") |
| Channel claims | `TreeChannelAssertion` — a channel id plus exactly one predicate (`contains` \| `is`) | in the closed grammar |
| Whole-output form | `TreeAssertions.exact` — "the turn's exact output, as lines. Supersedes the contains family." | evaluated at `tree-walker.ts:517-518` |
| Pinned seed | on the document (`Tree document: mini.tests.json (seed 42, 2 line(s))`) | present |
| Replay, diff, reporting, NDJSON, exit codes | `sharpee test` | shipped |

`auto-assertion.ts`'s header already anticipates additional writers and forbids
the obvious mistake:

> Anything either writer records comes from HERE — a second spelling of the
> synthesis is drift.

So a CLI recorder writes no assertion logic, defines no format, and adds no
evaluation path. It is an entry point.

### A recorder MUST persist claims — there is no live fallback

`tree-walker.ts:79-85` settles what a document run does, and it constrains this
ADR more than anything else in the codebase:

> The walker CLEARS it before running a line (David 2026-08-10: the JSON is the
> source of truth for all testing elements) — synthesis happens at RECORD time in
> the tab and persists into the document; a document run evaluates exactly what
> the document says and assumes nothing. **A bare card is therefore the ADR-294 D2
> failure** — reachable only by hand-editing, since the tab persists assertions on
> every recorded card.

A recorder that persisted nothing would emit cards that fail by construction.

**Caution for anyone reading the types instead of the runtime**:
`tree-document.ts:72` comments `TreeCard.assertions` as "Authored claims only —
policy defaults synthesize live, never persist." That is **stale** — it describes
the v2 behavior `compose.ts` records as having "went with run-time synthesis."
The live-synthesis call that still exists (`runner.ts:858`) belongs to
`runTranscript`, the ADR-294 assertion-tier path branch-tester also exports — a
different runner from the walker. Two runners, two contracts, one wire-type file
whose comment describes the wrong one.

## Decisions

### D1 — The CLI gains a recorder; the tree document stays the only model

ADR-307 said the tree is the model and named the Testing tab as its recorder.
The first half stands unchanged. The second is amended: **the tab is *a*
recorder, not *the* recorder.** A second writer does not reintroduce the
two-model problem ADR-307 killed, because both writers produce the same
document in the same grammar.

### D2 — Recording synthesizes per-element assertions, never a whole-output blob

A recorded turn carries assertions on the *elements* of its output — room name,
description, the channels ADR-300 made addressable — not one opaque block. The
author sees which element broke, and a prose change in one element fails one
assertion rather than the whole turn.

`exact` remains in the grammar and remains available deliberately, but it is
**not** the default: it is the strongest and most brittle form, and defaulting
to it would make every prose edit a corpus-wide re-bless — the normalization rot
ADR-294 D6 exists to prevent.

### D3 — Synthesis has exactly one spelling

The CLI calls `synthesizePolicyAssertions`. It does not carry its own copy, its
own policy constants, or its own notion of what an element is. A test recorded
in a terminal and the same test recorded in the Testing tab must be identical in
the document — that is the property that makes D1 safe, and it holds only while
there is one synthesis.

### D4 — Granularity is the story's existing policy

The `auto-assertion:` story header governs, with
`DEFAULT_AUTO_ASSERTION_POLICY = 'room-name-and-description'` when absent. The
CLI introduces no new policy vocabulary and no per-run granularity flag; a
recording's shape is a property of the story, not of the tool that recorded it.

### D5 — The input is a committed command list

The author supplies commands; the recorder replays them against a real engine at
the document's pinned seed and captures each turn. This is ADR-294's golden
shape — "a command script plus a pinned seed plus a recording" — expressed in
the tree grammar rather than in text files, and it is simpler than the tab's
model precisely because there is no gesture to make: the policy writes the
assertions.

**The list is a committed artifact, not a throwaway input** (David, 2026-08-12).
It is the re-runnable definition of the test: you edit it, re-run it, and D8
reconciles it against the tree. This is what makes D8's second direction real —
"keep the tree" can write back to the list, where a throwaway input could only
be discarded.

This is the one new artifact this ADR introduces, and it is a deliberate
exception to ADR-307's one-file-per-story property. Two consequences follow, and
neither is fatal but both are real:

- **A list can drift from the document.** Someone will hand-edit the tree, or
  record in the tab, and their list will no longer match. D8's reconcile is
  exactly the mechanism for that, which is why it must fire on command variation
  rather than silently.
- **Lists are asymmetric across the two surfaces.** A CLI-recorded line has one;
  a tab-recorded line does not, unless somebody writes one. D7's contract is
  unaffected — it binds the *document*, which both surfaces read and write — but
  the list is a CLI-side convenience and must never become something the tab
  needs in order to open a story.

**The list is a newline-delimited text file and nothing more.** One command per
line, every line a command — no comment syntax, no escapes, no header, no
directives. It needs no type, no schema, and no parser beyond splitting on
newlines. Anything richer would be reinventing the `.transcript` grammar
ADR-307 retired, one convenience at a time.

**Lists live in the project root as `<name>.list.txt`**, where `<name>` is the
line the list defines (David, 2026-08-12). This is the project's existing
sibling-file convention — `fernhill.story`, `fernhill.tests.json`,
`fernhill.config.json` — extended to one more role.

Discovery is therefore by **convention, not by record**: the filename *is* the
link to the line, so no field is added to the tree document and no
`TREE_DOCUMENT_VERSION` bump is needed. The failure mode is mild and worth
stating — rename one side and the list stops matching its line, so the next
recording creates a new line rather than reconciling. That is recoverable and
visible in a diff; the alternative (a path recorded in the document) buys
rename-safety at the cost of a version bump and an empty field on every
tab-recorded line.

### D6 — There is no blessing; claims are written once and edited as claims

The tree model has no bless verb and this ADR does not introduce one. Assertions
are synthesized **at record time** from the turn's real captures and written into
the document; `compose.ts` states the invariant — "nothing synthesizes at render
or run time — what you see is what the document says, and what runs is exactly
the same." A claim that no longer holds is deleted or re-recorded as a claim,
which is what the Testing tab's per-claim `DeleteRef` mutators already do.

ADR-294's golden tier *does* have blessing, and its D10 hazard (auto-blessing a
failing transcript enshrines broken output) is real — **in the transcript
world**. It does not transfer: that hazard exists because a golden recording is
one opaque block re-captured wholesale, and this design records addressable
per-element claims instead. Importing the verb would import a bulk operation the
model deliberately does not have.

*(Recorded because this ADR asserted the opposite in its first draft, and the
error was the same class as the stale Chord docs that prompted the ADR: reasoning
about the tree world using the retired paradigm's vocabulary.)*

### D7 — The two surfaces agree contractually, and it is tested

A document recorded from the terminal opens in Chord Writer's Testing tab and
renders as an ordinary tree; a document recorded in the tab re-runs from the
terminal. Neither writer may emit anything the other refuses.

This is a **contract between the IDE and the CLI**, not a compatibility goal
(David, 2026-08-12: "we need the IDE testing and the CLI testing to
contractually agree with each other"). It is what D3's single synthesis exists
to guarantee and what D8's merge depends on, and it is verified by test rather
than asserted in prose. A change to either surface that breaks it is a defect in
that surface, not a migration.

### D8 — Reconcile by whole-line replace, direction chosen by the author

A recording locates its command list in the tree as a **span** — the line whose
commands the list corresponds to — and compares. If the list and that line agree,
the recording is a no-op. If they vary, the author is asked which direction to
resolve: **replace the tree's line with the list**, or **discard the list and
keep the tree**. There is no partial merge.

This supersedes an earlier decision in this same ADR to merge (David,
2026-08-12: "merge might be more than we can take on with a lot of thought").
The reasons to prefer replace are not only cost:

- **It dissolves the per-claim problem.** A partial merge has to decide what
  happens to a claim the author deliberately deleted, and `TreeAssertions`
  cannot express that — its six families are all positive, a deleted claim is
  indistinguishable from one never synthesized, and the grammar is closed
  (`TREE_DOCUMENT_VERSION = 1`, additive fields require a version bump). Whole-line
  replace never asks the question.
- **It keeps the author in the decision.** The ambiguous case is genuinely
  ambiguous; a merge resolves it silently and a replace makes someone look.

Two constraints the implementation inherits, both consequences of identifying a
line by its commands:

1. **Command variation and output variation are different events.** If the
   commands match and only the output differs, that is a failing test, not a
   reconcile — `sharpee test` already reports it and D6 governs. The reconcile
   prompt fires on *command-sequence* variation only. Conflating them would put a
   prompt in front of every legitimate regression.
2. **A span needs to identify one line unambiguously.** First-and-last command is
   not sufficient on its own — two lines can share both, and branches make
   repetition likely. The identification rule is an implementation concern, but it
   must be deterministic and it must fail loudly rather than pick a line.

Because the author is asked, the non-interactive case needs an answer too: a
recording run without a terminal cannot prompt, and must either refuse or be told
the direction up front.

**The steps, in order:**

1. **Resolve the list.** `<name>.list.txt` in the project root; `<name>` names the
   line.
2. **Resolve the line.** Find the line called `<name>` in the tree document.
   - Both present → continue to step 3.
   - **List only** (no such line) → first recording; skip to step 6.
   - **Line only** (no list) → this is the tab-recorded case: the IDE created the
     line and no list exists yet. Write the line's turn commands to
     `<name>.list.txt` and stop. This is step 5's *tree → list* direction with
     nothing to reconcile, and it is how a line the IDE authored acquires a list.
     Without it, D5's committed artifact would be unreachable for exactly the
     lines D7's contract says the CLI must be able to work with.
   - **Neither** → usage error naming both paths looked for.
3. **Compare command sequences** — the list's lines against the line's turn
   commands, in order. Equal → **stop, no write, exit 0.** A matching list is a
   no-op even when the story's output has changed; that is a test failure and
   `sharpee test` reports it (D6).
4. **Ambiguity check.** If `<name>` resolves to more than one line, fail loudly
   naming the candidates. Never pick one.
5. **Ask the direction**, showing the command-level difference:
   - **list → tree**: the list is authoritative. Replay it, synthesize claims per
     D2/D3/D4, and replace the line's cards wholesale. Claims the author had
     deleted from the old line do not survive; that is the cost of whole-line
     replace and the reason the author is asked rather than merged into.
   - **tree → list**: the tree is authoritative. **Write the line's turn commands
     back to `<name>.list.txt`, overwriting it.** The document is not touched.
     This is what makes the direction meaningful rather than "discard my input."
   - Non-interactive (no TTY): refuse with a named error unless a direction was
     given up front.
6. **Write.** Serialize through `serializeTreeDocument` so ordering and formatting
   stay deterministic, and the diff stays minimal.

### D9 — `sharpee record` is a peer command; `sharpee test` stays read-only

Recording is spelled `sharpee record <list>`, a peer of `play` and `test`, not a
mode of `test` (David, 2026-08-12).

The deciding property is that **`sharpee test` cannot alter the project today,
and stays that way.** A command people run habitually — and run in CI — must not
grow a branch that writes the tree and blocks on an interactive prompt. Putting
the writer in its own verb keeps the read-only guarantee intact, matches what the
command actually does, and gives D8's non-interactive case an obvious home: a
direction flag on `record`, never on `test`.

The cost is one more top-level command in a CLI that already carries twelve.

**The help text has to change regardless.** `packages/devkit/src/cli.ts:49-50`
currently advertises `sharpee test [name|path] [transcripts…] [--tree|--chain]`
and describes it as running "the project's transcript tests" — `[transcripts…]`
and `--chain` are both retired and both rejected by name at
`packages/devkit/src/commands/test.ts:59-75`. The CLI's own help therefore
instructs users toward forms the CLI refuses. That correction lands with this
work, not after it.

## Implementation

Modules, and whether each is written, extended, or only called. Everything below
was read on 2026-08-12; nothing here is inferred from another ADR.

| Module | Change |
| --- | --- |
| `packages/devkit/src/commands/record.ts` | **New.** The recorder: resolve list and document, drive the engine turn by turn, synthesize, reconcile per D8, write. |
| `packages/devkit/src/cli.ts` | **Extended.** Register `record` as a peer subcommand (the `case` list at ~87-181), and fix the stale help at 49-50 — it advertises `[transcripts…]` and `--chain`, both rejected by name at `commands/test.ts:59-75`, and calls them "transcript tests." |
| `packages/devkit/src/commands/test-tree-document.ts` | **Called.** `findTreeDocument` already resolves `<story-id>.tests.json` beside the `.story` file; the recorder reuses it rather than re-deriving the path. |
| `packages/branch-tester/src/auto-assertion.ts` | **Called, never modified.** `synthesizePolicyAssertions` / `synthesizeOpeningAssertions`. D3 forbids a second spelling; AC-10 checks it. |
| `packages/branch-tester/src/tree-document.ts` | **Called** — `deserializeTreeDocument`, `serializeTreeDocument`, `treeDocumentFileNameFor`. **One fix:** the comment on `TreeCard.assertions` (line 72) says "policy defaults synthesize live, never persist," which is stale; the walker clears the policy and evaluates only the document (`tree-walker.ts:79-85`). |
| `packages/branch-tester/src/tree-walker.ts` | **Types reused** — `TreeGameLoader` / `TreeWalkerGame` already abstract "boot one fresh game at the document's pinned seed," which is exactly what recording needs. No change expected; if one is needed, it is a finding. |

**Not touched**: `@sharpee/transcript-tester` (a separate world, ADR-307), the
engine, and the IDE. A change required in `tools/ide/` to make this work would
contradict D7 and should stop the work.

## Worked example

A story `orchard.story` with an existing tree document and no list yet.

`opening.list.txt` in the project root:

```text
look
take lantern
north
```

`sharpee record opening` boots the story at the document's pinned seed, runs the
three commands, and synthesizes claims per the effective policy
(`room-name-and-description` when the story declares none). The document gains a
line `opening` whose three turn cards each carry the claims that policy produced
— a room-name claim and a description claim on the turns that emitted them, and
`skip: true` on any turn that emitted neither.

`sharpee test` now replays that line and passes.

Edit the list to insert `open gate` before `north` and re-run `sharpee record
opening`. Step 3 finds the command sequences differ, step 5 asks the direction.
Choosing **list → tree** replays all four commands and replaces the line's cards.
Choosing **tree → list** rewrites `opening.list.txt` back to the three commands
the document holds, and leaves the document untouched.

Re-running `sharpee record opening` with no edits writes nothing and exits 0.

## Consequences

- **Test authoring stops being macOS-only.** The CLI becomes a complete author
  tool rather than a runner, and the documentation that already promises this
  (the download page's Intel guidance, `/chord/getting-started`) becomes true.
- **CI can author, not only verify.** A recorded baseline can be produced on any
  machine that runs Node.
- **Two writers now touch one file.** This is the cost of D1 and the source of
  every open question below. The tab holds an in-memory tree and rewrites the
  document wholesale; a terminal recorder writing the same file while the IDE
  has the story open is a real collision, not a theoretical one.
- **`auto-assertion.ts` becomes load-bearing for a third consumer.** Its
  no-second-spelling rule was a convention between two callers; it is now the
  contract that keeps D7 true.
- **ADR-307's recorder language needs a status note**, flipped by whoever lands
  this — the same discipline ADR-307 itself used for ADR-302 and ADR-306.

## Acceptance

1. A story with no tests can be given a passing test suite from a terminal on a
   machine with no Chord Writer installed.
2. The same command list recorded twice at the same seed produces byte-identical
   documents.
3. A document recorded from the terminal opens in the Testing tab and renders as
   an ordinary tree; a tab-recorded document re-runs from the terminal. (D7)
4. Recording a turn whose story declares no `auto-assertion:` header produces
   `room-name-and-description` assertions — the same ones the tab would write for
   that turn, compared field by field. (D3)
5. Re-running a list whose commands differ from its line prompts for a direction
   and resolves whole-line; re-running a list whose commands match is a no-op
   even when the story's output has changed. Output change is a test failure
   reported by `sharpee test`, never a reconcile. (D8)
6. A span that cannot be resolved to exactly one line fails loudly and names the
   ambiguity; it never picks a line. (D8)
7. `sharpee record` run without a terminal either refuses or acts on a
   pre-declared direction — it never blocks waiting for input. (D8)
8. `sharpee test` performs no writes to the project on any path. (D9)
9. Every recorded card carries persisted assertions; no path produces a bare
   card, which the walker treats as an ADR-294 D2 failure. (Context, D6)
10. No assertion-synthesis code exists outside `auto-assertion.ts`. (D3)

## Session

Session 1744e6, 2026-08-12, branch `feat/adr-310-character-in-chord`. Arose from
correcting stale Chord documentation: `/chord/getting-started/compose-and-run`
still taught the retired `.transcript` workflow, and the reason it had never been
updated was that no terminal-authorable replacement existed. David: "the CLI
really has a gap for testing — we're basically requiring the IDE", then "this can
be simpler than the IDE — the author provides a list of commands and that becomes
an automated test base", then "we still write each assertion for the elements of
the output (not one blob)" — which is D2, and which corrected a proposal in this
same session to default to whole-response `exact` matching.
