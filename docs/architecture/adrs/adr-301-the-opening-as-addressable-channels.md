# ADR-301: The Opening as Addressable Channels

**Status**: **ACCEPTED** (2026-08-04, session 088e3e) — drafted, interviewed
(seven open questions resolved via `/devarch:adr-interview`, two of them
dissolved rather than answered), `adr-review`ed clean at 18/18 after two fixes
(an ADR-163 section misnumber and an unnamed supersession owner), and accepted by
David the same day.

**Accepted ≠ implemented.** D1–D3, D5 and D6 are implemented and verified. D4 and
D7–D10 are decided and unbuilt, so AC-4, AC-5 and AC-6 are NOT MET by design —
the ADR records the decisions ahead of the work. D7's execution is ADR-302's.

**Parent**: ADR-163 (channel-service platform — channels as the universal UI
surface; §7's last-write-wins registration is how a story overrides one),
ADR-294 (golden transcripts — **D15 superseded in part**, see D3), ADR-298 (D3
— the prologue channel; the banner now joins it as the symmetric other half),
ADR-216/ADR-253 (`define channel … end channel` — the author-facing spelling D4
extends), ADR-300 (the transcript tool whose D3 grammar list gains the
`[CHANNEL:]` form this ADR makes meaningful), ADR-174 (the engine prose pipeline
that builds the banner blocks).

**Evidence**: every measurement and file reference below was taken against the
working tree on 2026-08-04, session 088e3e.

**Supersession ownership**: ADR-294's **D15** is superseded in part by D3 —
recordings still capture declared channels exactly as D15 says; only its implicit
claim to be the sole consumer is retired. The pointer note was added to
ADR-294's Status block in this session (088e3e, 2026-08-04) rather than left for
a later flip, and ADR-298's D3 carries the same treatment for the prologue/banner
pairing. Neither ADR's overall Status changes: both remain ACCEPTED, since
nothing else in either is affected.

---

## Context

David asked for the prologue, the story banner, and the first command to be
three separate tests. They were one.

**The three lived in different places, and only one was separable.** The
prologue was already its own channel (`prologueChannel`,
`packages/stdlib/src/channels/standard.ts`, replace-mode, ADR-298 D3). The
banner was not a channel at all: `handleGameStarted`
(`packages/engine/src/prose-pipeline/handlers/game.ts:33`) builds blocks keyed
`game.banner` — `game-title`, `story-version`, `platform-version`, `sub-title`,
`author-list`, `banner-spacer` — and `MAIN_KEYS` routed that key into `main`.
The first command's response is also `main`. Since the first command is what
flushes main, it carried whatever was already sitting there, and a test could
only asserted on the lump:

```
> look
DUNGEON
Story v4.3.0 (built 2026-08-02)
Sharpee v4.3.0
A port of Mainframe Zork (1981)
...
West of House
This is an open field west of a white house...
```

**The assertion tier could not address a channel at all.** Non-`main` channels
were captured only into golden recordings (`GoldenTurn.channels`,
`runner.ts:451`), while `[OK: contains "…"]` matched `actualOutput`, which is
main. So even the prologue — already separate in the engine — had no way to be
asserted.

**And an assertion with no command to attach to was silently discarded.** The
banner and the prologue both happen before anything is typed. An assertion
written above the first command parsed and was then dropped with no parse error
and no validation error, which is the third member of a family this session
found twice already (folded header values; comment ordering).

**Separately: an author cannot define a channel carrying more than one value.**
Chord has `define channel <name> … end channel` (ADR-216 spelling A, ADR-253
`return … from <event>`), and the loader already declares those channels
`contentType: 'json'` (`packages/story-loader/src/loader.ts:1052`). But
`ChannelReturn` has three kinds — `field`, `text`, `phrase` — and every one
yields a single scalar. So the JSON an author can produce is a JSON-encoded
scalar. The platform can ship a channel whose value is a record (this ADR's
banner is one); an author writing Chord cannot express the same thing.

---

## Decision

**D1 — The banner is its own channel.** `CORE_BLOCK_KEYS.GAME_BANNER` leaves
`MAIN_KEYS` for a new `BANNER_KEYS`, and `bannerChannel` projects it. The
opening stops riding the first command's response, which is what makes three
separate tests possible at all. *Implemented.*

**D2 — A channel's value may be a record, and the banner's is.** The banner is
`contentType: 'json'`, `mode: 'replace'`, carrying `BannerData`:

```ts
interface BannerData {
  title?: string;
  storyVersion?: string;
  platformVersion?: string;
  subtitle?: string;
  credits?: string[];
  tail?: string[];   // story-supplied closing lines
}
```

Properties rather than flattened prose lines, so a client decides how the pieces
are laid out instead of inheriting whatever paragraph breaks the pipeline
produced, and a test can name one piece. This follows the fyrevm model David
carried over: a channel is text, a number, or json, and json means structure.
*Implemented.*

**D3 — The assertion tier reads channels; ADR-294 D15 is superseded in part.**
D15 scoped channel capture to golden recordings. That still holds for
recordings, but it is no longer the whole story: `[CHANNEL: <id>, contains "…"]`
and its `not contains` twin read a declared channel's capture at assertion time.
A channel absent from the transcript's `channels:` header fails by name telling
the author to declare it, rather than reading an empty string and passing a
`not contains` for the wrong reason. *Implemented.*

**A dotted path addresses a property.** (Resolves the former Q-3, session
088e3e.) `[CHANNEL: banner.title, contains "DUNGEON"]` reads one property of a
record rather than substring-matching the serialized whole — without it,
`contains "DUNGEON"` also passes on a credit line or a story tail containing the
word, so the assertion says "somewhere in the banner" when the author meant "that
is the title". The path reuses dotted notation rather than inventing a second
bracket form.

Driven by D4: once authors define record channels routinely, an assertion form
that can only match records as blobs would make author-defined records
second-class the day they ship. A bare channel id keeps matching the whole
capture, which stays correct for the scalar channels D7 produces — most channels
carry one value, and substring matching is exactly right for them.

**A path may resolve to a list, and `contains` matches any element.** (Resolves
the former Q-6, session 088e3e.) `[CHANNEL: banner.credits, contains "Lebling"]`
passes when any one credit line contains the fragment. Rejected: matching the
joined whole, which lets a fragment match across an element boundary — a false
pass nobody would predict; and requiring an index (`credits.0`), which is precise
and unusable.

**`and` is available everywhere; `or` only on a list path.**

```
[CHANNEL: banner.credits, contains "Anderson" and "Cornelson"]   legal
[CHANNEL: banner.credits, contains "Anderson" or "Blank"]        legal — list
[CHANNEL: main, contains "The troll dies" or "The troll collapses"]   rejected
```

`and` is strictly stronger than a single `contains` and is sugar over two
assertion lines, so it carries no risk. `or` is `[OK: contains_any]` under a new
spelling, and ADR-294 D2 removed that form because at a pinned seed exactly one
output prints — an `or` there is the author declining to look, and it keeps
passing after a change that alters the outcome. **That reasoning is a property of
the target, not a blanket ban**: a list genuinely has many values, so "which of
several credits" is a real question, while a scalar at a pinned seed has exactly
one. Scoping `or` to list paths therefore applies D2's own test rather than
overturning it — **ADR-294 D2 stands unamended**, and `[OK: contains_any]`
remains removed grammar.

**One operator per assertion, and no parentheses.** `contains "a" and "b" or
"c"` is not legal; two conditions of different kinds are two lines. There is no
grouping to get wrong and no precedence to remember.

**D4 — An author can define a record channel in Chord, via a `record` block.**
(Resolves the former Q-1, session 088e3e.) `ChannelReturn` gains a fourth kind:
a block of named properties, each choosing its own construct from the three that
already exist — a field, a text template, or a phrase.

```
define channel vitals
  mode replace
  return record from player.vitals
    health from health
    label "HP: (health)"
    note phrase vitals-line
    tags list of tag from player.tags
  end record
end channel
```

A property may be a list (`list of <field> from <event>`), because the platform's
own banner carries `credits: string[]` — without it, D4 could not rebuild in
Chord the channel this ADR ships in TypeScript.

Chosen because it matches Chord's established `define X … end X` idiom (ADR-216
spelling A) and because per-property construct choice is what the platform's own
banner already needs: `title` is a plain value while a story tail is rendered
prose. **Rejected**: repeated `return <field> as <name> from <event>` lines —
no new block, but `from <event>` repeats on every line and nothing stops two
returns naming different events, so the channel's source stops being one thing;
and `return fields a, b from <event>` — shortest, but properties are named after
the event's fields, with no renaming and no text or phrase per property, which
cannot express the banner.

The wire needs nothing: the loader already stamps `contentType: 'json'`
(`packages/story-loader/src/loader.ts:1052`). This is a parser, AST, IR, and
loader change. *Proposed, unbuilt.*

**D5 — Assertions above the first command are about the opening.** They parse
into `Transcript.opening`, run once against the capture the first command
flushed, and report as `(opening)`. This replaces a silent discard with a real
position in the grammar. *Implemented.*

**D6 — Any surface that shows the game to a person must render the opening
channels.** Moving the banner off `main` made it vanish from `--play` and
`--exec` until both were taught to render it; the browser client needed the same.
This is the standing cost of the channel model and it is recorded here because
it is the failure mode a future channel extraction will repeat: output that
leaves `main` disappears from every client that has not been told about it.
*Implemented for the CLI and `platform-browser`.*

**D7 — `main` is dissolved: every element becomes its own channel, and the
client owns layout entirely.** (Resolves the former Q-2, session 088e3e.) The
banner extraction is not a one-off; it is the first step of removing `main`
altogether. `ROOM_NAME`, `ROOM_DESCRIPTION`, `ROOM_CONTENTS`, `ACTION_RESULT`,
`ACTION_BLOCKED`, `ERROR` and `GAME_MESSAGE` each become a channel, and no
channel means "the prose window" any more. David's framing: this is the fyrevm
model done right — there, a catch-all main channel meant the engine kept making
layout decisions that belonged to the client.

**D8 — Ordering rides its own channel.** (Resolves the former Q-7, session 088e3e.)
The sequence blocks were emitted in is not a property of any narrative channel
and is not a relationship the narrative channels carry between themselves — it
is a separate signal, and it goes on a separate channel. A `preferred-layout`
channel states the order the engine thinks its output reads in; the client
honours it, reorders it, or ignores it. That is what "the client owns layout"
has to mean if it means anything.

Rejected: sequence numbers on every narrative channel (makes each channel carry
a field about its neighbours) and a fixed declared render order (wrong the
moment a turn emits an action result before a room description, which any move
printing a result first does). Both try to encode a relationship inside the
things being related.

This is also what keeps D7 honest. The engine's ordering knowledge does not
vanish with `main`; it stops being smuggled inside an append-mode stream and
becomes something the engine says out loud — and something a client is allowed
to disagree with.

**Scope**: this ADR records the decision; it does not execute it. The
execution is ADR-302's, because it is far larger than the banner extraction and
carries an unresolved design problem (Q-7) plus a corpus migration: 2921
`contains` assertions read `main` today, and 21 golden recordings store its
output as `GoldenTurn.output`. *Decided, unbuilt.*

**D11 — The prologue stays a scalar; its authored form is text or phrase.**
(Resolves the former Q-5, session 088e3e.) The banner became a record because it
demonstrably has parts — the engine builds six differently-classed blocks. The
prologue has one part, and inventing structure against a hypothetical epigraph or
dateline is how a format grows fields nobody fills.

This ratifies what already exists rather than changing it: `StoryConfig.prologue`
is `string | { kind: 'literal' | 'phrase-ref'; value: string }`
(`packages/engine/src/story.ts:56`), the engine resolves either form into text
before it reaches the channel (`game-engine.ts:822`), and Chord's header field is
a `HeaderProseValue`. Text or phrase is also two of D4's three per-property
constructs, so the prologue is consistent with the record grammar without being
a record.

An author who wants a structured prologue is not blocked: D4 lets them define a
record channel and ADR-163 §7's last-write-wins registration lets them override
`prologue` by id. The platform does not guess at the shape on their behalf.
*Ratified; no change required.*

**D10 — The capture set is inferred from the assertions; provenance records
the result.** (Resolves the former Q-4, session 088e3e.) The `channels:` header
declares what to capture, defaulting to `['main']` — a transcript names nothing
and gets the one channel that matters. D7 removes that default: with no `main`,
every transcript would hand-maintain a manifest of every element it touches,
duplicating what its assertions already say.

The header was doing two jobs, and only one is the author's:

- **What to capture** — inferred from the assertions. A channel is named once,
  in the assertion that reads it.
- **What was captured** — unchanged, in the golden's provenance (ADR-294 D3/D7).
  A widened capture set is therefore still a provenance change on the recording,
  and still fails as a named `stale recording — re-bless` rather than sliding by.

So the author stops maintaining a list and the recording keeps its scope. The
`channels:` header's future — optional override, or removed outright — is
ADR-302's, alongside the rest of D7's migration. *Decided, unbuilt.*

**D9 — The assertion vocabulary covers every channel content type.** (Session
088e3e.) `ChannelContentType` is `'text' | 'number' | 'json'`, but `contains` is
a string operation — so a number channel is unassertable today, as is a boolean,
a list length, or an absence. Under D7 that stops being a niche gap: once every
element is its own channel, channel assertions become the primary testing
surface rather than a supplement, so the vocabulary has to cover the type system.

```
[CHANNEL: score.current, is 42]                    number, exact
[CHANNEL: score.current, is at least 10]           number, comparison
[CHANNEL: banner.title, is "DUNGEON"]              string, exact
[CHANNEL: banner.title, contains "DUNG"]           string, substring
[CHANNEL: banner.credits, has 2 entries]           list, length
[CHANNEL: banner.credits, contains "Anderson"]     list, any element
[CHANNEL: score.max, is absent]                    property missing
[CHANNEL: death, is absent]                        sparse channel stayed silent
[CHANNEL: banner.subtitle, is present]
```

The verbs, each mapping to a distinction the type system already makes:

| Verb | Applies to |
| --- | --- |
| `contains` / `not contains` | strings; any-element on lists |
| `is` / `is not` | exact equality against a typed literal — string, number, `true`, `false`, `null` |
| `is at least` / `is at most` / `is more than` / `is less than` | numbers |
| `has <n> entries` | lists |
| `is absent` / `is present` | a missing property, or a whole sparse channel that emitted nothing this turn |

**Silence is assertable, and this is the point of `is absent`.** Channels declare
`emit: 'sparse'`, so emitting nothing is a legitimate outcome — the `death`
channel says nothing on a turn where nobody died. "This channel stayed quiet" is
a real claim about a turn and is currently unexpressible, which means the
negative case of every event-driven channel is untested.

**A wrong-type assertion fails by name.** `[CHANNEL: banner.title, is at least
10]` reports that `banner.title` is text, not a number — it does not quietly
evaluate false. Same principle as the undeclared-channel error above: a silent
false is a test that passes for the wrong reason forever, and an author applying
a number comparison to prose has made a mistake worth being told about.

*Decided, unbuilt.*

---

## Acceptance Criteria

**AC-1 (D1, D3, D5) — the three are separately assertable, and each rejects the
others' text.** *SELF-VERIFYING.* Verified 2026-08-04 against Dungeo:

```
> (opening)     PASS   [CHANNEL: banner, contains "DUNGEON"]
                       [CHANNEL: banner, contains "A port of Mainframe Zork"]
                       [CHANNEL: banner, not contains "West of House"]
> look          PASS   [OK: contains "West of House"]
                       [OK: not contains "DUNGEON"]
```

**AC-2 (D6) — the player-visible opening is unchanged.** `--exec "look"` prints
the same banner text, in the same order, as before the extraction. *VERIFIED.*

**AC-3 (D3) — an undeclared channel fails by name**, never by silently reading
empty. *SELF-VERIFYING.*

**AC-4 (D2, D3) — the banner's pieces are addressable individually**, not only
as one blob: a test asserts `banner.title` without matching `credits`. *NOT MET
— the dotted path is decided and unbuilt.*

**AC-5 (D4) — an author-defined record channel round-trips** from Chord source
to a captured JSON record a transcript can assert on. *NOT MET — D4 is unbuilt.*

**AC-6 (D9) — every channel content type is assertable.** A `number` channel
compares, a list's length checks, a sparse channel's silence asserts, and a
wrong-type assertion fails by name rather than evaluating false. *NOT MET —
decided and unbuilt.*

---

## Consequences

**`main` means "a command's response" and nothing else.** That is a sharper
contract than it had, and it is the reason the extraction was worth doing.

**Every client carries a rendering obligation.** Two surfaces needed teaching
(CLI, `platform-browser`); a third that appears later and forgets will silently
lose the banner. D6 records this; it is not hypothetical, it happened during
implementation.

**Four golden recordings were re-blessed** — the banner left their first turn's
main output. `wt-01-get-torch-early`, `info-channel-baseline`,
`force-forest-ambience`, `force-villain-killed`. The walkthrough chain is green
at 952 across 17 transcripts.

**One bootstrap test moved from prose-matching to property-matching.** ADR-248's
restart test proved a fresh story instance by finding its title in `look`
output; it now asserts `banner.title`, which names the field instead of
substring-searching a room description. A stronger test, arrived at by
accident.

**ADR-294 D15 is superseded in part, not wholly.** Golden recordings still
capture declared channels exactly as D15 says. Only its implicit claim — that
recordings are the *only* consumer — is retired.

**D4 is a language change and will need its own phasing.** It touches the Chord
parser, the AST, the IR, and the loader's channel mapping, none of which this
session touched.

---

## Session

Session 088e3e (2026-08-04, branch `main`). Arose mid-session from David's
observation that a transcript can test the banner and the opening, followed by
the ruling that the prologue, the banner, and the first command should be three
separate tests. D2's record shape is his — carried from fyrevm, where a channel
could be text, a number, or json. D4 was added at his request in the same
conversation, after the implementation surfaced that Chord's `define channel`
cannot express what the platform's own banner channel does.

Implementation landed in `packages/stdlib` (channel + key split),
`packages/transcript-tester` (grammar, parser, runner, CLI opening render),
`packages/platform-browser` (banner renderer), and `scripts/bundle-entry.js`
(play and exec render).
