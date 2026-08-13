# ADR-313: The Tree's Second Serialization — Authoring Tests Outside the IDE

**Status**: DRAFT (2026-08-12, session 787eea). Open Questions remain, so this
must not be implemented (rule 11a).
**Date**: 2026-08-12 (session 787eea)
**Parent**: ADR-307 (the tree is the model and the JSON document is its
serialization), ADR-300 (addressable channels — what "per element" addresses),
ADR-294 (per-element assertion tiers and the normalization rot that motivates
them), ADR-187 (the two-CLI split; `sharpee` is the author tool this lands in).
**Amends**: three things in ADR-307 — its identification of the IDE's Testing tab
as *the* recorder (D1 below), its Q-5 ruling that there is no text export (D2),
and its AC-4 rule that a malformed document degrades to a fresh tree (D12).

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

Nothing in the author CLI writes such a document. `play.ts` carries no record or
capture path, and the command set is `build, publish, compose, build-browser,
init, introspect, init-browser, ifid, register, list, test, play`. The document is
produced by playing in Chord Writer's Testing tab.

### Which makes test authoring macOS-only

Chord Writer is `ARCHS: arm64`, deployment target macOS 11 — and as of
2026-08-12 it **cannot** be built universal, because a universal bundle does not
clear notarization (ADR-279 D4's amendment; matched pair `5133a8de` hung 16min+
vs `ee8cf37e` Accepted ~30s after `lipo -thin arm64`). So the only way to author
a test is to own an Apple silicon Mac. Linux and Windows authors, and Intel Mac
authors, can replay tests forever and never write one.

Two places in shipped documentation already assume otherwise: the download page
directs Intel users to "use the command-line tools instead" as a complete
alternative, and `/chord/getting-started` is a CLI-first path.

### One serialization exists and is proven; the other does not exist at all

| Serialization | Where | State |
| --- | --- | --- |
| tree ↔ JSON document | `tree-document.ts`'s `serializeTreeDocument` / `deserializeTreeDocument` | **Shipped and proven.** ADR-307 AC-1 pins serialize → deserialize as the identity, verified byte-for-byte; deterministic ordering; a closed grammar with a version gate. |
| tree ↔ author-editable file | — | **Does not exist.** ADR-307 Q-5 resolved "no text export" on the grounds that the tab is the human view — a ruling made when the tab was the only writer. |

The gap is not that the CLI lacks an input format. The model has one
serialization where it needs two, and the second one — the form a person can open
in an editor — was never built.

### A recorder MUST persist claims — there is no live fallback

`tree-walker.ts:79-85` settles what a document run does, and it constrains any
writer more than anything else in the codebase:

> The walker CLEARS it before running a line (David 2026-08-10: the JSON is the
> source of truth for all testing elements) — synthesis happens at RECORD time in
> the tab and persists into the document; a document run evaluates exactly what
> the document says and assumes nothing. **A bare card is therefore the ADR-294 D2
> failure** — reachable only by hand-editing, since the tab persists assertions on
> every recorded card.

A writer that persisted nothing would emit cards that fail by construction.

### Structure lives in the tree, and cannot be inferred back from lines

`flattenTreeLines` (`tree-walker.ts:185`) cuts a document into root-to-leaf
lines, and each line carries `parentId`, `branchId`, `forkIndex`, and its
suppressed `prefix` — all **derived from the nesting**, none of them stored per
line. A fork lives on the card branched from (`TreeCard.branches`, recursive).

This constrains the projection's shape more than anything else here: see D6.

### The document has a silent total-loss path today

1. `tools/ide/web/testing-surface/src/main.ts:807-820` — on load, a `refused`
   (newer-version) document sets `documentWriteLocked = true` and shows a named
   notice. A `malformed` one does neither. The comment is explicit: *"Malformed:
   the model already holds a fresh empty tree — degrade quietly."*
2. `main.ts:352-361` (`update()`) — every model change posts the **whole**
   document, gated only by `documentWriteLocked`.

One damaged byte means the tab opens on an empty tree with no warning, and the
first typed command serializes that empty tree over the file. The suite is gone
and nothing said so. `TestingSurfaceViewController.swift:312-320` writes
atomically and swallows write failures, so the write will not tear — it will
faithfully land the empty document.

The handling is inverted relative to the risk: a newer document is treated as
precious, a damaged one as disposable. That is ADR-307 AC-4 inheriting the
*sidecar* corruption rule (D7 — view state degrades to fresh, correct for view
state and wrong for the suite).

The CLI half is already right: `test-tree-document.ts` reports a malformed
document as an error and exits 2, and `sharpee test` never writes.

### Caution for anyone reading the types instead of the runtime

`tree-document.ts:72` comments `TreeCard.assertions` as "Authored claims only —
policy defaults synthesize live, never persist." That is **stale**: it describes
v2 behavior that record-time synthesis replaced. The live-synthesis call that
still exists (`runner.ts:858`) belongs to `runTranscript`, the ADR-294
assertion-tier path branch-tester also exports — a different runner from the
walker. Two runners, two contracts, one wire-type file whose comment describes
the wrong one. `TreeDocumentReadResult`'s own doc comment on `malformed` ("The
caller degrades to a fresh empty tree without erroring") becomes wrong under D12
and changes with it.

## Decisions

### D1 — The CLI gains a writer; the tree stays the only model

ADR-307 said the tree is the model and named the Testing tab as its recorder.
The first half stands unchanged. The second is amended: **the tab is *a* writer,
not *the* writer.** A second writer does not reintroduce the two-model problem
ADR-307 killed, because both writers produce the same tree.

### D2 — What gets built is a second serialization

The tree serializes to JSON losslessly and deterministically. It gains a
**second serialization: tree ↔ an author-editable file.** That projection is the
surface the CLI reads and writes. The CLI gets the model in a form a person can
edit — not a format of its own that has to be reconciled against the model.

This reverses ADR-307's Q-5 ("no text export — the Testing tab is the human view
and deterministic JSON is the diff"), decided when the tab was the only writer.
With a second writer, the human view cannot exist only inside the application
that half the platform's authors cannot run.

**Why this is not the retired transcript grammar returning.** ADR-307 retired
that grammar because files were **identities** — stems to maintain, renames to
cascade, `continues:` parentage, detach tracking. This is a projection: derived,
regenerable from the tree at any time, carrying no identity, no parentage of its
own, and no naming semantics. That distinction is load-bearing, and D4 and D6 are
what hold it.

### D3 — The projection is lossless, and it is proven by an identity round-trip

Everything the JSON expresses, the projection expresses: commands, all six
assertion families, channel claims, `skip`, the seed, the version, and the branch
structure. Tree → projection → tree is the identity, verified the way ADR-307
AC-1 verifies the JSON round-trip, on the serialized form.

Losslessness is the property the whole design rests on. A projection that
dropped anything would need a reconcile step to put the missing part back; a
reconcile needs a merge policy; and a merge policy over a closed, positive-only
assertion grammar cannot represent a claim the author deliberately deleted —
`TreeAssertions`' six families are all positive, and `TREE_DOCUMENT_VERSION = 1`
is closed to additive fields. Losslessness means that chain never starts.

### D4 — The JSON stays canonical; the projection is derived and regenerable

`<story-id>.tests.json` remains the document of record — what the tab writes,
what `sharpee test` runs, what ADR-307 D1 means by "files are a projection."

The new file is **derived**: the CLI writes it out of the tree, the author edits
it, the CLI reads it back and reserializes the tree. It is regenerable at any
moment from the JSON and never becomes an independent truth sitting beside the
canonical one. Two hand-editable at-rest forms of one model would be exactly the
two-model problem ADR-307 D1 killed; one canonical form plus one regenerable view
is not.

### D5 — The projection carries claims, not only commands

A projected line shows each turn's command **and** the claims recorded against
it, in an editable form. Deleting a claim in the projection deletes it from the
tree on the next write; re-recording a turn re-synthesizes it.

This is what makes the CLI a complete writer rather than a partial one. ADR-307
D3 and D10 below both hold that a claim which no longer applies is deleted or
re-recorded **as a claim** — the Testing tab does this through per-claim
`DeleteRef` mutators. A commands-only surface would leave terminal authors with
no way to delete a claim at all, permanently.

### D6 — The projection is whole-tree, never per-line

One projection per story, mirroring the whole tree with its branch structure
explicit — not one file per line.

Per-line files would have to re-encode `parentId` / `branchId` / `forkIndex` as
data, which is the file-identity model ADR-307 D1 deleted, or re-derive parentage
by matching common command prefixes, which is `continues:` inference wearing a
new name. Structure nests in the tree; it nests in the projection.

### D7 — Synthesis has exactly one spelling

The CLI calls `synthesizePolicyAssertions`. It does not carry its own copy, its
own policy constants, or its own notion of what an element is. A test authored in
a terminal and the same test recorded in the Testing tab must be identical in the
document — that is the property that makes D1 safe, and it holds only while there
is one synthesis.

This extends to the conversion that turns synthesis output into the wire shape.
`synthesizePolicyAssertions` returns a runtime `Assertion[]`; converting that to
`TreeAssertions` is `recordedTurnAssertions` / `openingDefaultClaims`, which
today live **only** in `tools/ide/web/testing-surface/src/compose.ts` (verified
2026-08-12 — a repo-wide grep for either name matches nothing under `packages/`).
A second spelling one step later in the pipeline is still a second spelling, so
those two functions relocate into `packages/branch-tester`, and both writers
import one definition.

### D8 — Granularity is the story's existing policy

The `auto-assertion:` story header governs, with
`DEFAULT_AUTO_ASSERTION_POLICY = 'room-name-and-description'` when absent. The
CLI introduces no new policy vocabulary and no per-run granularity flag; a
recording's shape is a property of the story, not of the tool that wrote it.

### D9 — Assertions are per-element, never a whole-output blob

A recorded turn carries assertions on the *elements* of its output — room name,
description, the channels ADR-300 made addressable — not one opaque block. The
author sees which element broke, and a prose change in one element fails one
assertion rather than the whole turn.

`exact` remains in the grammar and remains available deliberately, but it is
**not** the default: it is the strongest and most brittle form, and defaulting to
it would make every prose edit a corpus-wide re-bless — the normalization rot
ADR-294 D6 exists to prevent.

### D10 — There is no blessing; claims are written once and edited as claims

The tree model has no bless verb and this ADR does not introduce one. Assertions
are synthesized **at record time** from the turn's real captures and written into
the document; `compose.ts` states the invariant — "nothing synthesizes at render
or run time — what you see is what the document says, and what runs is exactly
the same." Under D5, editing the projection is how a terminal author deletes or
adjusts a claim.

ADR-294's golden tier *does* have blessing, and its D10 hazard (auto-blessing a
failing transcript enshrines broken output) is real — **in the transcript
world**. It does not transfer: that hazard exists because a golden recording is
one opaque block re-captured wholesale, and this model records addressable
per-element claims instead.

### D11 — The two surfaces agree contractually, and it is tested

A document written from the terminal opens in Chord Writer's Testing tab and
renders as an ordinary tree; a tab-recorded document re-runs from the terminal
and projects into an editable file. Neither writer may emit anything the other
refuses.

This is a **contract between the IDE and the CLI**, not a compatibility goal
(David, 2026-08-12: "we need the IDE testing and the CLI testing to contractually
agree with each other"). It is what D7's single synthesis exists to guarantee,
and it is verified by test rather than asserted in prose. A change to either
surface that breaks it is a defect in that surface, not a migration.

### D12 — A damaged document is never silently replaced

`malformed` is treated like `refused`: the reader reports it by name, the session
write-locks, and the file on disk is left exactly as it is. No writer — tab or
CLI — overwrites a document it could not read.

This amends ADR-307 AC-4, whose degrade-to-fresh rule is correct for the D7
sidecar (disposable view state) and wrong for the suite. It is a change to IDE
behavior, deliberately in scope: a design that adds a second writer to a file
with a silent total-loss path, and leaves the path open, would be incoherent.

Two mechanical obligations follow for the CLI writer, both cheap:

- **Write atomically** — temp file in the same directory, then rename, matching
  what the Swift side already does (`TestingSurfaceViewController.swift:320`,
  `options: .atomic`). A crashed writer then leaves the previous document intact
  rather than a truncated one.
- **Re-read before replacing** — hash the document's bytes when read, compare
  immediately before the rename, and refuse by name if they changed. That closes
  the two-writer window (a CLI write running while the tab has the story open)
  without trying to detect whether Chord Writer is running.

### D13 — Recording is its own command; `sharpee test` stays read-only

The writer is a peer of `play` and `test`, not a mode of `test`.

The deciding property is that **`sharpee test` cannot alter the project today,
and stays that way.** A command people run habitually — and run in CI — must not
grow a branch that writes the tree. Putting the writer in its own verb keeps the
read-only guarantee intact and matches what the command actually does. Its
spelling is Q-6.

**The help text has to change regardless.** `packages/devkit/src/cli.ts:49-50`
currently advertises `sharpee test [name|path] [transcripts…] [--tree|--chain]`
and describes it as running "the project's transcript tests" — `[transcripts…]`
and `--chain` are both retired and both rejected by name at
`packages/devkit/src/commands/test.ts:59-75`. The CLI's own help therefore
instructs users toward forms the CLI refuses. That correction lands with this
work, not after it.

## Implementation

Deliberately partial. The projection's own reader and writer cannot be specified
until Q-1 and Q-3 resolve, and no implementation plan should be written before
then. The modules below are the ones the open questions do not touch.

| Module | Change |
| --- | --- |
| `packages/branch-tester/src/auto-assertion.ts` | **Called, and extended exactly once.** `synthesizePolicyAssertions` / `synthesizeOpeningAssertions` are called, never rewritten. The one addition is a relocation, not new logic: `recordedTurnAssertions` and `openingDefaultClaims` move here from `compose.ts` per D7. |
| `tools/ide/web/testing-surface/src/compose.ts` | **Import site only.** Re-imports the two relocated functions instead of defining them. No behavior change; the surface's existing suite (`compose.test.ts`, `tree-session-real-path.test.ts`, `ac-signoff-cli.test.ts`) is the proof. |
| `packages/branch-tester/src/tree-document.ts` | **Called** — `deserializeTreeDocument`, `serializeTreeDocument`, `treeDocumentFileNameFor`. **Two comment fixes:** `TreeCard.assertions` (line 72), stale since record-time synthesis landed; and `TreeDocumentReadResult`'s `malformed` doc, which D12 reverses. |
| `tools/ide/web/testing-surface/src/main.ts` | **Extended (D12).** `malformed` write-locks and notices, like `refused` (`main.ts:807-820`). |
| `packages/devkit/src/commands/test-tree-document.ts` | **Called.** `findTreeDocument` already resolves `<story-id>.tests.json` beside the `.story` file; the writer reuses it rather than re-deriving the path. |
| `packages/devkit/src/cli.ts` | **Extended.** Register the new command as a peer subcommand, and fix the stale help at 49-50 (D13). |
| `packages/branch-tester` — the projection | **New**, shape pending Q-1. The projection serializer and parser belong beside `tree-document.ts`, not in devkit: D11 makes it a contract both surfaces are bound by, and D3's round-trip test has to live with the thing it verifies. |
| `packages/devkit/src/commands/<record>.ts` | **New**, shape pending Q-4 and Q-5. Reads the projection, replays against a real engine at the document's pinned seed, synthesizes per D7/D8/D9, writes the tree atomically per D12. |
| `packages/branch-tester/src/tree-walker.ts` | **Types reused** — `TreeGameLoader` / `TreeWalkerGame` already abstract "boot one fresh game at the document's pinned seed," which is what recording needs. No change expected; if one is needed, it is a finding. |

**Not touched**: `@sharpee/transcript-tester` (a separate world, ADR-307) and the
engine. The IDE's *behavior* changes in exactly one place, D12, named here rather
than discovered during implementation; anything further required in `tools/ide/`
to make this work would contradict D11 and should stop the work.

## Acceptance

1. A story with no tests can be given a passing test suite from a terminal on a
   machine with no Chord Writer installed. (D1)
2. Tree → projection → tree is the identity, verified on the serialized form for
   a document exercising every assertion family, `skip`, and nested branches.
   (D3, D6)
3. The same projection written twice at the same seed produces byte-identical
   documents. (D3)
4. Deleting a claim in the projection removes exactly that claim from the
   document, and nothing else. (D5)
5. A document written from the terminal opens in the Testing tab and renders as
   an ordinary tree; a tab-recorded document re-runs from the terminal and
   projects into an editable file. (D11)
6. Recording a turn whose story declares no `auto-assertion:` header produces
   `room-name-and-description` assertions — the same ones the tab would write for
   that turn, compared field by field. (D7, D8)
7. No assertion-synthesis code, and no `Assertion[] → TreeAssertions` conversion,
   exists outside `packages/branch-tester`. (D7)
8. `sharpee test` performs no writes to the project on any path. (D13)
9. Every written card carries persisted assertions; no path produces a bare
   card, which the walker treats as an ADR-294 D2 failure. (D10)
10. A malformed document is reported by name and left byte-for-byte unchanged on
    disk, by both writers; the tab write-locks rather than degrading. Verified by
    damaging a real document, opening the tab, typing a command, and comparing
    the file's bytes. (D12)
11. A writer killed mid-write leaves the previous document intact and valid.
    (D12)

## Open Questions

**Q-1 — What is the projection's concrete syntax, and how are claims spelled in
it?** Candidates: a text grammar (most editable, most design work, and the one
most needing a clear line against the grammar ADR-307 retired); an indented data
format such as YAML (lossless cheaply, structure comes free, another dependency
and another parser's edge cases); or pretty-printed JSON per line (trivially
lossless, trivially correct, and unpleasant to hand-edit — which is the entire
point of building it). D3 makes losslessness a hard requirement whatever the
answer.

**Q-2 — Is the projection committed, gitignored, or written on demand and
removed?** D4 says derived and regenerable, which permits all three. Committing
it makes suites reviewable in a diff by people without the IDE; ignoring it keeps
exactly one artifact of record; on-demand is the strictest reading of "derived"
and the least convenient to work in.

**Q-3 — What is it called and where does it live?** The project's sibling
convention (`fernhill.story`, `fernhill.tests.json`, `fernhill.config.json`)
suggests one more sibling; Q-2's answer may argue for somewhere else.

**Q-4 — What happens when the projection on disk is older than the JSON?**
Someone records in the tab after projecting. The CLI can regenerate silently (a
derived file has no standing), refuse and require an explicit re-project, or show
the difference and ask. The answer has to hold up when the tab is open at the
same time (D12's re-read-before-replace).

**Q-5 — Does a write replay the whole tree, or only lines whose commands
changed?** Whole-tree replay is simpler and obviously correct, and costs a full
run of every line every time. Selective replay is faster and has to define
"changed" precisely enough not to leave stale claims behind.

**Q-6 — What is the command called?** `sharpee record` reads as the tab's verb
and may mislead, given the CLI's input is an edited projection rather than live
play. `project`, `write`, and `sync` each describe a different half of what it
does.

## Consequences

- **Test authoring stops being macOS-only.** The CLI becomes a complete author
  tool rather than a runner, and documentation that already promises this — the
  download page's Intel guidance, `/chord/getting-started` — becomes true.
- **The suite becomes reviewable outside the IDE.** A projection a person can
  read is a projection a reviewer can read, which the JSON is not, whatever Q-2
  decides about committing it.
- **CI can author, not only verify.** A baseline can be produced on any machine
  that runs Node.
- **A second serialization is a second thing to keep correct.** D3's round-trip
  test is what keeps it honest and must be as load-bearing in the suite as
  ADR-307 AC-1's is: every grammar change from here touches two serializers.
- **Two writers now touch one file.** This is the cost of D1. D12's atomic write
  and re-read-before-replace bound the damage; they do not make concurrent
  editing safe, and nothing here claims to.
- **`auto-assertion.ts` becomes load-bearing for a third consumer.** Its
  no-second-spelling rule was a convention between two callers; it becomes the
  contract that keeps D11 true.
- **ADR-307 needs three status notes**, flipped by whoever lands the cutover and
  not before — the recorder claim (D1), Q-5's no-text-export ruling (D2), and
  AC-4's degrade rule (D12). That is the same discipline ADR-307 itself used for
  ADR-302 and ADR-306.

## Session

Session 787eea, 2026-08-12, branch `feat/adr-312-cli-test-recording`. Arose from
reviewing tree-document durability while planning CLI test authoring: reading the
document's read and write paths surfaced the silent total-loss path in
`main.ts:807-820`, and David's reframing set the design — *"We're serializing
to/from JSON to IDE and we know that contract is bullet proof. Now we need a
second serializing from JSON to file and that doesn't exist... We really need the
tree to file serialization and then `sharpee record` works with those files."*
