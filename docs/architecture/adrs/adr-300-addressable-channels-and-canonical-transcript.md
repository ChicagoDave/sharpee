# ADR-300: Addressable Channels and the Canonical Transcript

**Status**: ACCEPTED — partly implemented (see Decision Status)
**Date**: 2026-08-04, consolidated 2026-08-04 (session 5113ca)
**Supersedes**: ADR-299 (artifact and verification model)
**Supersedes in part**: ADR-294 D15 (assertions read `main` only)
**Extends**: ADR-298 D3
**Relates to**: ADR-163 (channels), ADR-210 (Chord), ADR-293 (determinism)

> **Consolidation note.** This ADR replaces an earlier ADR-300 ("the standalone
> transcript editor") and ADR-301 ("the opening as addressable channels"), both
> of which were removed rather than archived. The editor program is not recorded
> here: it is TBD and now holds the 301 number, as
> [ADR-301: The Sharpee Transcript Editor](adr-301-sharpee-transcript-editor.md).
>
> **Two numbers therefore mean something different than they did on 2026-08-04.**
> Session notes citing **ADR-301** mean the deleted "Opening as Addressable
> Channels" — its eleven decisions are D6–D16 below. Session notes citing a
> planned **ADR-302** mean dissolving `main` — that is D8 below, and 302 was
> never written and is unused.

---

## Context

Two problems turned out to be one.

**The transcript had no canonical form.** `.transcript` files are the
repository's regression baseline — 185 of them, including the walkthrough chain
— but nothing had ever written one back out from the parsed model. Formatting
was whatever each author or generator happened to emit, and any tool that wanted
to edit a transcript would have had to reproduce that variation by hand.

**Channels were not addressable.** ADR-163 made channels the universal carrier
of every story→UI signal, but `main` remained a catch-all: the banner, room
name, room description, contents, action results, errors and game messages all
routed into one append-mode prose stream. The assertion tier could only address
`main`, so a test could not distinguish the banner from the prologue from the
first command's response — they arrived as one blob of text. Worse, `main`
meant the engine was still making layout decisions that belong to the client,
which is the mistake fyrevm made and the reason not to repeat it.

The connection: a transcript is how you *say something about* what the engine
emitted. As long as the engine emitted one undifferentiated stream, the
transcript could only make coarse claims about it. Making channels addressable
and giving the transcript a canonical, machine-owned form are the same work seen
from two ends.

---

## Decision

### The artifact and its format

**D1 — The artifact is the `.transcript` file. There is no second format.**
The file the runner runs, the repository commits, and the walkthrough chain uses
as its regression baseline is the only artifact. `.skein` is retired: no new
writer, no reader, and `play-testing/` stops being a committed artifact
directory.

**D2 — Verification is running the transcript. There is no second engine.**
Anything that verifies a transcript calls `runTranscript` against the real
engine. No parallel expectation format, no second results model, no exporter
converting one into the other.

**D3 — The file is written by a canonical serializer; formatting is
machine-owned.** A transcript is parsed into the model
`@sharpee/transcript-tester` already produces, edited as a model, and
re-serialized whole on save — gofmt's terms. The corpus is normalized once, in a
single reviewable commit, and thereafter serialization is deterministic over an
already-canonical corpus, so an ordinary edit produces a minimal diff. Backward
compatibility is not a constraint; the standing project rule is what makes this
available.

**D4 — The canonical form ratifies the corpus's dominant style.** Majority
rules: every rule is the convention the corpus already followed most often, so
normalization is as small as possible and no rule is a matter of taste anyone
has to relitigate. Surveyed over all 185 files, 2026-08-04.

*Unanimous or near-unanimous:*

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

*Split, decided by majority:* a blank line precedes each stanza (1861 / 3550),
where a stanza is its leading comments plus the command plus its assertions; and
a blank line precedes the `---` separator (113 / 185), chosen on churn rather
than aesthetics and the cheapest rule to overturn.

*Forced by the model:* header fields emit in enumeration order — `title`,
`story`, `entry`, `author`, `description`, `seed`/`seeds`, `channels`, `events`,
`locale`, `forces`, `point-seed` — absent fields skipped; assertions emit in
model order and are never reordered; a block's `text`/`end text` sit at column 0
with verbatim content and no blank line between an assertion and its block.

**D5 — `[TODO:]` is kept; `[EVENTS: N]` is dropped.** Both had zero uses and
both survived ADR-294's cull, but they fail for opposite reasons. `[TODO: note]`
marks a turn pending — a real workflow that has never had a surface, reachable
today only by hand-typing a form you would have to already know exists.
`[EVENTS: N]` asserts a bare event count without naming the events; `[EVENT: …]`
at 209 uses does the meaningful version, and a count breaks whenever any
unrelated event is added anywhere in the turn. Its removal is a parser change
tracked as [issue #222](https://github.com/ChicagoDave/sharpee/issues/222).

### Channels

**D6 — The banner is its own channel.** `CORE_BLOCK_KEYS.GAME_BANNER` leaves
`MAIN_KEYS` for `BANNER_KEYS` and a `banner` channel carries it. This is the
first step of D8, not a one-off.

**D7 — A channel's value may be a record, and the banner's is.** A channel is
text, a number, or json, and json means real structure — the banner carries
`title`, `storyVersion`, `platformVersion`, `subtitle`, `credits[]`, `tail[]`,
not a formatted string the assertion tier has to pattern-match. Carried from
fyrevm, where a channel could hold any of the three.

**D8 — `main` is dissolved: every element becomes its own channel, and the
client owns layout entirely.** `ROOM_NAME`, `ROOM_DESCRIPTION`, `ROOM_CONTENTS`,
`ACTION_RESULT`, `ACTION_BLOCKED`, `ERROR` and `GAME_MESSAGE` each become a
channel, and no channel means "the prose window" any more. This is the fyrevm
model done right: there, a catch-all main channel meant the engine kept making
layout decisions that belonged to the client.

**D9 — Ordering rides its own channel.** The sequence blocks were emitted in is
not a property of any narrative channel and is not a relationship the narrative
channels carry between themselves — it is a separate signal on a separate
channel. A `preferred-layout` channel states the order the engine thinks its
output reads in; the client honours it, reorders it, or ignores it.

Rejected: sequence numbers on every narrative channel (makes each channel carry
a field about its neighbours), and a fixed declared render order (wrong the
moment a turn emits an action result before a room description, which any move
printing a result first does). Both encode a relationship inside the things
being related. This is also what keeps D8 honest — the engine's ordering
knowledge does not vanish with `main`; it stops being smuggled inside an
append-mode stream and becomes something a client may disagree with.

**D10 — An author can define a record channel in Chord, via a `record` block.**
The platform can build record-valued channels (D7) but `define channel` can only
describe a scalar, so an author cannot say in a `.story` file what the engine
already does. `record` closes that seam, with `list of` for repeated members.
This is a language change touching the Chord parser, the AST, the IR, and the
loader's channel mapping.

### Assertions

**D11 — The assertion tier reads channels.** `[CHANNEL: <id>, contains "…"]` and
`not contains`, with dotted-path property addressing into records, list
any-element matching, `and` everywhere, and `or` on list paths only. Scoping
`or` to lists applies ADR-294 D2's own test rather than overturning it; D2
stands unamended.

**D12 — Assertions above the first command are about the opening.** The banner
and the prologue happen before anything is typed, so they have no command to
hang off. They parse into `Transcript.opening` and report as `(opening)`.

**D13 — The assertion vocabulary covers every channel content type.** Text,
number and record each get their forms, including `is absent` for
sparse-channel silence, and a wrong-type assertion fails by name rather than
silently missing.

**D14 — The capture set is inferred from the assertions; provenance records the
result.** A transcript does not separately declare which channels to capture —
what it asserts about is what gets captured, and the golden's provenance records
what that turned out to be.

**D15 — Any surface that shows the game to a person must render the opening
channels.** Moving the banner off `main` must not make it vanish from `--exec`,
`--play`, or a browser client.

**D16 — The prologue stays a scalar; its authored form is text or phrase.**
It is one piece of prose, and a record would be structure for its own sake.

### Chains

**D17 — Chain membership is a directory convention, not grammar.** A `wt-*`
file is an ordinary transcript: same model, same serializer, same assertions.
`walkthroughs/*.transcript`, sorted by filename, is one chain per story. All 26
chain files in the repository follow `wt-NN-slug.transcript` (dungeo 17,
friendly-zoo 7, fernhill 1, channel-service-test 1) and none declares
membership.

**Running a chain member is never in isolation** — running `wt-07` means running
`wt-01` through `wt-07`, and sign-off means a clean chain run through that
member. The save cache is keyed on story build + prefix + seed, and for a chain
member the prefix is the preceding files rather than earlier turns in the same
file.

*Rejected at the time:* a `chain:` header field, on the grounds that it adds
grammar to prevent failures — two chains in one story, a member outside
`walkthroughs/` — that four stories had never produced.

> **SUPERSEDED IN PART (2026-08-05)** by
> [ADR-302: Transcript Branches](adr-302-transcript-branches.md), ACCEPTED the
> same day. Testing authored *variation* — two paths diverging from the same
> state — is the case this decision's rejection of a header field did not
> consider, and it is the one capability ADR-299's supersession knowingly gave up
> (see Consequences).
>
> **Superseded:** "convention, not grammar." Membership is now declared by a
> `continues:` header naming a parent (ADR-302 D1), filename ordering is retired
> (D3), and `--chain` is retired with running the harness meaning every path
> (D10). ADR-302's harness is a new package, `@sharpee/branch-tester` (D15).
>
> **Still in force, for `@sharpee/transcript-tester`:** everything below. Dungeo
> and the Family Zoo tutorial stay on that harness permanently (ADR-302 D9/D12),
> so `walkthroughs/*.transcript` sorted by filename remains how *their* chains
> are read, running a member still means running its prefix, and the
> prefix-keyed save cache is unchanged — ADR-302 D3 keeps that caching strategy.

---

## Decision Status

**Shipped and verified in code (2026-08-04, session 088e3e):**

| Decision | Evidence |
| --- | --- |
| D3, D4 | `packages/transcript-tester/src/serializer.ts`; 152 of 185 files normalized, corpus is a serializer fixed point |
| D6 | `BANNER_KEYS`, `packages/stdlib/src/channels/keys.ts:44` |
| D7 | `banner` channel carries `BannerData` |
| D11 | `[CHANNEL:]` grammar, `packages/transcript-tester/src/parser.ts:952` |
| D12 | `Transcript.opening`, `packages/transcript-tester/src/types.ts:301` |
| D15 | `packages/platform-browser/src/channels/info.ts:107`; `scripts/bundle-entry.js` |
| D16 | prologue unchanged, already its own channel |
| D2 | already true — `runTranscript` is the only verification path |

**Shipped and verified in code (2026-08-05, session 86e85a):**

| Decision | Evidence |
| --- | --- |
| D8 | Seven prose channels, `packages/stdlib/src/channels/standard.ts`; routing table `PROSE_CHANNEL_BY_BLOCK_KEY`, `packages/stdlib/src/channels/keys.ts`; `mainChannel` deleted, `main` absent from `STANDARD_CHANNELS` |
| D9 | `preferredLayoutChannel`, `packages/stdlib/src/channels/standard.ts`; composition rule `composeProse`, `packages/channel-service/src/utils/prose.ts`; browser flush, `packages/platform-browser/src/channels/prose.ts` |

**Remaining.** The harness column was added 2026-08-05, after
[ADR-302](adr-302-transcript-branches.md) split the harness in two and froze
`@sharpee/transcript-tester` on its grammar and runtime semantics (D12/D15).
Before that split every row implicitly meant "the harness"; several now mean one
harness specifically, and one of them cannot be done in a frozen package at all.

| Decision | Lands in | Shape of the work |
| --- | --- | --- |
| D10 | **Chord** (`packages/chord`, `story-loader`) | `record` block — parser, AST, IR, loader channel mapping. Additive, independent of everything else here, and the item that closes the platform/Chord seam |
| D13, D14 | **`branch-tester` only** | Assertion vocabulary and capture inference. These extend the assertion grammar, which ADR-302 D15 freezes in `transcript-tester` — so they land in the new harness and are **not** back-ported |
| D5 | **`transcript-tester`, before the copy** | `[EVENTS: N]` removal — issue #222. A removal of zero-use grammar, so it is safe under the freeze, and doing it before ADR-302's copy means `branch-tester` inherits a clean grammar rather than the removal being done twice |
| D1 | **`tools/ide` (Swift)** | `.skein` retirement is unexecuted: `tools/ide/SharpeeIDE/Skein/` and `stories/fernhill/play-testing/` are still committed. Deleting them needs explicit confirmation |

**Sequencing consequence — D8 must precede ADR-302's copy.** *(Discharged
2026-08-05: D8/D9 shipped before any harness copy existed.)* Dissolving `main`
after `branch-tester` exists means migrating the assertion tier in two packages;
freezing `transcript-tester` before D8 lands would freeze Dungeo's 1966
assertions against a channel about to disappear, which would make ADR-302 D9's
"keeps working unchanged" false on the day D8 ships. The channel model settles
first, then the harness splits.

---

## Acceptance Criteria

**AC-1 — round-trip fidelity.** For every `.transcript` under `stories/` (185
files): parse → serialize → parse yields a model equal to the first.
*SELF-VERIFYING.* **Met.**

**AC-2 — the serializer is idempotent.** Serializing an already-canonical file
is a byte no-op. *SELF-VERIFYING*, and the property that makes D3's "an ordinary
edit produces a minimal diff" true rather than aspirational. **Met.**

**AC-3 — normalization is semantics-preserving.** After the normalization
commit, the walkthrough chain's output is byte-identical to the run before it,
one run each side. *PREMISE-DEPENDENT* on pinned-seed determinism, established
by ADR-293 Phase D. **Met** — 952 passing both sides.

**AC-4 — the opening is separately assertable.** A transcript can assert the
banner, the prologue, and the first command's response as three independent
claims, and an assertion that names the wrong one fails. **Met.**

**AC-5 — no channel means "the prose window."** After D8, no client receives a
channel whose contract is "append this to the main text area," and reordering
`preferred-layout` changes what the player sees without an engine change.
**Met** (2026-08-05, session 86e85a). Both halves are pinned by
`packages/platform-browser/tests/channels/prose.test.ts`: driving all seven
prose renderers with no layout renders nothing, and the same payload under two
different layouts produces two different reading orders on screen.

**AC-6 — an author can declare what the engine can emit.** A `.story` file
defines a record channel and the running game populates it, with no TypeScript
escape hatch. *Pending.*

### What AC-1 and AC-2 cannot see

Added after both gates passed through two separate losses. They are round-trip
gates: they compare the model against itself. Anything the *parser* discards on
the first read is already gone from both sides, so they agree about a file that
has already lost it. Two real cases hit this — folded header values being
dropped (176 lines across 41 files) and blank lines between comments being
collapsed — and both were green through AC-1 and AC-2 the whole time. Do not
treat these criteria as proving nothing is lost; that claim requires checking
the parser against the file, which is a different test.

---

## Consequences

**The corpus is a fixed point.** Any tool that writes a transcript writes the
canonical form, so diffs show intent rather than formatting. A second pass over
the normalized corpus reports zero byte changes.

**D8 was cheaper than measured.** The estimate assumed 2921 `contains`
assertions and 21 goldens would need migrating. They did not: measured
2026-08-05, the corpus contained **zero** `[CHANNEL: main, …]` assertions, so
every one of the 2921 read `main` only *implicitly*, through the turn text the
harness composed for it. Preserving that composition — `composeProse` in
`preferred-layout` order, then the existing join rule — left every assertion
and every recorded turn byte-identical. The 21 goldens changed by one line
each: the provenance `channels:` field, `main` → `(none)`.

The walkthrough chain ran 952 passing against the *pre-existing* recordings,
with no re-blessing, which is what makes this a migration rather than a
re-baseline: a bless would have overwritten the evidence it was asked to
provide. D13 and D14 remain cheaper after D8, and D10 stays independent.

**D10 is the seam.** The platform can already do what D7 describes; Chord
cannot say it. Until that closes, an author reaches around the language for
something the engine does natively, which is the shape of misalignment the
platform and the language are supposed to avoid.

**The editor is not decided here.** An editor over this model is TBD and gets
ADR-301. What this ADR guarantees it is that the model, the serializer, the
grammar, and the channel addressing all exist and are pinned by tests, so an
editor is a surface over a settled substrate rather than a program that has to
invent one.

---

## Session

Consolidated in session 5113ca (2026-08-04, branch `main`) from the earlier
ADR-300 and ADR-301, both deleted without archive at David's instruction. The
channel and opening decisions originated in session 088e3e, arising from David's
ruling that the prologue, the banner, and the first command should be three
separate tests; D7's record shape and D8's dissolution of `main` are his,
carried from fyrevm. The transcript-format decisions originated in session
c42886. The standalone-editor program that occupied the earlier ADR-300 was
dismantled in session 5113ca: its host was never settled, the CLI it assumed is
a testing tool rather than an authoring product, and the platform is secondary
to Chord and the IDE.
