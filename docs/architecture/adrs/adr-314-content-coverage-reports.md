# ADR-314: Content Coverage Reports — Checking What the Story Has

**Status**: DRAFT (2026-08-12, session 787eea). Open Questions remain, so this
must not be implemented (rule 11a).
**Date**: 2026-08-12 (session 787eea)
**Parent**: ADR-294 (D13's coverage discipline — coverage computes over declared
surfaces, never over inference — **and D13's "world coverage" family, whose
ground this realizes**; see Consequences), ADR-306 (post-go-live ruling 1 — the
Testing tab *is* the surface), ADR-184/185 (`sharpee introspect` and the
`ProjectManifest` this reads), ADR-307 (the testing tree, whose job this
deliberately does not do).
**Promotes**: `docs/work/testing/design-testing-play-surface.md` §14
("response-coverage checks", David 2026-08-09 — captured, not yet ruled, pending
the platform discussion this ADR is the outcome of).
**Sibling**: ADR-313, which governs authoring *behavioural* tests. The two are
complementary and share no machinery.

## Context — verified, not assumed

Every claim in this section was read out of the working tree on 2026-08-12.

### Two different questions, one of which the tree cannot answer well

The testing tree answers *what does the story do when you play it*. There is a
second question authors ask constantly — *what does the story have* — and the
tree is the wrong instrument for it in two independent ways.

**It is ruinously expensive.** Every branch fresh-boots and replays its
suppressed prefix (ADR-307 D5). Measured on the real fernhill document —
`node packages/devkit/dist/cli.js test branch-stories/fernhill/fernhill.story
--verbose`, run 2026-08-12, which reports on its last line:

```
Tree document: fernhill.tests.json (seed 42, 3 line(s))
9 cards passing, 18 assertions passing
14 commands (8 authored + 6 replayed)
```

Three lines — a trunk and two branches — cost 14 executed commands to test 8
authored ones. A content suite is the worst possible shape for that model: a long
trunk to a location, then a bush of one-command branches. Forty `examine` checks
hanging off one room is forty boots and forty trunk replays to test forty
commands.

**It rots on contact with prose.** A test asserts *this must not change*, and
prose is the thing that changes most. Forty room descriptions pinned as
`contains` claims is a machine for producing false failures on every wording
edit — the corpus-wide re-bless that ADR-294 D6 exists to prevent and that
ADR-313 D9 refuses `exact`-by-default to avoid. A content *report* asks questions
that survive rewording: what is missing, empty, unreachable, unimplemented.

### The substrate already exists

`sharpee introspect` (ADR-184/185) loads a built story, assembles the world
through `@sharpee/bootstrap`, and emits a `ProjectManifest`: every entity, its
`displayName`, a derived `category`, and a per-trait projection. That projection
is already described as lint input:

> "The fields the IDE renders/**lints** on, keyed by trait type."
> (`packages/ide-protocol/src/types.ts:73-76`)

and it already carries what two of the three checks below need:

```ts
export interface TraitSummary {
  identity?: { description?: string };
  /** Exit directions present — drives the "room with no exits" lint. */
  room?: { exits: string[] };
  /** Co-trait lint inputs (e.g. "lockable without openable"). */
  container?: { openable: boolean; lockable: boolean };
```

Two lints of exactly this shape are already named in that file. This ADR is
continuing an established direction, not opening one.

### What the manifest does not yet carry

`IdentityTrait` holds the vocabulary a prose check needs — `name`,
`aliases: string[]`, and `adjectives: string[]`
(`packages/world-model/src/traits/identity/identityTrait.ts:17,37-38,89`) — but
`TraitSummary.identity` projects only `description`. Matching a noun found in
prose against what the parser will actually accept therefore needs the projection
widened, or the report reading the assembled world rather than the manifest. This
is a real gap, named here so it is not discovered mid-implementation.

### Apple's NLTagger, and where the idea already lives

The hard half — nouns that appear in prose but were never declared — needs
part-of-speech tagging, because an undeclared noun has no vocabulary to match
against and cannot be recognised as a noun by lookup. `design-testing-play-surface.md`
§14 (2026-08-09) records the candidates David named: spaCy and Stanford Stanza
(both strong, both Python, both requiring an environment the Node toolchain does
not have), and Apple's **NLTagger** (`NaturalLanguage`, `.lexicalClass`) —
built into macOS, zero dependencies, and already resident where the report
surfaces.

## Decisions

### D1 — Content is a report, not a test

The tree tests behaviour. This reports on content. They share no machinery, no
document, and no failure semantics. Nothing in this ADR writes a tree document,
synthesizes an assertion, or replays a command.

The two reasons are in Context and neither is about cost alone: a content check
expressed as assertions pins prose that is meant to change, and it pays a
per-branch boot to learn something computable without playing at all.

### D2 — Three checks, and the third is a subtraction

**Tier 1 — declared surfaces. Portable, mechanical, no language analysis.**

1. **NPC talk coverage** — every NPC either has a TALK TO response or topics, or
   it does not.
2. **Examine coverage over declared entities** — every declared object and piece
   of scenery either has an authored EXAMINE response or falls to the default.

Both are enumerations over the manifest. There is nothing to infer.

**Check 3 — what the prose mentions and the world does not have.** This is the
classic interactive-fiction content bug: a description names the brass lantern on
the shelf, and neither the lantern nor the shelf can be examined.

It is defined as a **subtraction**, not as a search (David, 2026-08-12: *"take
room descriptions and remove that list and you have what's left and that's what
we're logically looking for"*). Per scope S:

```
declared(S) = names ∪ aliases ∪ adjectives of every entity in scope at S,
              ∪ direction words, ∪ S's own name
residue(S)  = lemmatize(tokens(prose(S))) − stopwords − declared(S)
findings(S) = { t ∈ residue(S) : t reads as a noun }
```

The order matters, and it is what makes this tractable. The subtraction runs
first and is pure set arithmetic over data the manifest already holds. Only the
**residue** is handed to language analysis, and only to answer one narrow
question: does this leftover word read as a noun. The residue is not tiny — a
description's remainder after stopwords and declared vocabulary still carries
verbs, adjectives, and abstractions — but it is a fraction of the prose, and the
question asked of it is a single-token classification rather than a parse.

The numbering is deliberate: checks 1 and 2 are a tier, check 3 is a *stage
pipeline*, and its stages have different portability (D5).

**Resolved (David, 2026-08-12): `S` is one room, not the story.** See D9 — the
scoping choice decides which bugs check 3 finds, and room scope is the one that
finds the bug worth looking for.

### D3 — The report reads the built story, not a play session

Both tiers compute over the story's built form via `ProjectManifest` (ADR-184),
extended per D4 with the identity vocabulary it does not currently carry. The
report is global and complete: every declared entity and its prose, whether or
not anyone has ever played there. It assembles no view of its own, does not read
Chord source, and does not replay — a story's built form is what the player
meets, and it is what the report checks.

This keeps the report independent of the testing tree entirely. A story with no
tests at all gets a full report, which is the point: content checking should not
be gated on having recorded anything.

**Resolved (David, 2026-08-12): all prose the player can read.** That is
wider than the manifest carries, and D10 works out what it costs.

### D4 — The manifest gains the parser's vocabulary, and each room's scope

Two additions, both serving check 3, both additive to a projection whose index
signature is already declared forward-compatible (`types.ts:73-83`), so neither
costs an existing consumer a change.

*"Projection" here means `TraitSummary`'s per-trait view of an entity — not
ADR-313's tree projection (its author-editable second serialization), and not
ADR-307 D1's "files are a projection." Three senses, one season; this one is the
manifest's.*

**Vocabulary.** `TraitSummary.identity` projects `name`, `aliases`, and
`adjectives` alongside `description`. Without them, check 3 can find a residue
word but cannot tell whether the parser would accept it, which is the only
question that matters.

**Scope.** Each room carries the ids of the entities in scope there, computed
from the runtime's own scope evaluator at manifest-build time (D9). This is what
keeps the checker a pure function over the manifest rather than something needing
a live world — which matters because one of its two consumers is Swift (Q-1). The
cost is manifest size, roughly rooms × entities-in-scope; the alternative is
every consumer assembling a world, which the IDE cannot do.

**The runtime does not currently expose this per room, and that is Q-9.**
`WorldModel.evaluateScope(actorId, actionId?)` takes an *actor* and derives the
location from it — `const currentLocation = this.getLocation(actorId)`
(`packages/world-model/src/world/WorldModel.ts:1611-1620`, read 2026-08-12).
There is no entry point that answers "what is in scope in room X." Getting a
per-room answer therefore needs either a new location-taking entry point or a
walk that relocates an actor room by room during manifest build, and the second
mutates the world in the middle of a read. Named here so it is not discovered
mid-implementation — this is the same class of gap as the identity-projection
one above.

### D5 — The subtraction is portable; only the noun filter needs NLTagger

Because D2 makes check 3 a pipeline, its stages split cleanly by platform:

| Stage | Needs | Portable |
| --- | --- | --- |
| Tokenize; subtract declared vocabulary and stopwords | set arithmetic | **yes** |
| Lemmatize | a lemmatizer or a stemmer | **only with a portable stemmer** — see Q-7 |
| Decide which residue words read as nouns | part-of-speech tagging | **no** — `NaturalLanguage` |

Lemmatization is called out as its own row deliberately: it is the one stage
whose portability is not yet settled. On macOS `NLTagger.lemma` supplies it for
free alongside `.lexicalClass`; off macOS there is nothing supplying it today,
and Q-7 is where that is decided.

The noun filter uses Apple's `NaturalLanguage` framework (`NLTagger`,
`.lexicalClass`). No Python runtime, no model download, no third-party
dependency. **Assumed** — not established — that its tagging quality is
sufficient for ordinary English narration; Q-7's trial over real Chord prose is
the check that establishes it, and it is the same trial that answers whether the
portable path ships at all.

Adjective+noun phrases are checked as phrases, not only as bare nouns, because
interactive fiction prose and interactive fiction *parsers* both work in that
unit: "the brass lantern" must be checked against `adjectives: ['brass']` +
`name: 'lantern'`, not against `lantern` alone. A story that declares the lantern
but not its adjective still fails the player who types what the prose taught
them.

**The macOS-only surface is therefore one filter, not one check** — a materially
smaller asymmetry than it first appeared, and the reason to state the pipeline
explicitly. An author without `NaturalLanguage` still gets checks 1 and 2 in full
and the residue of check 3, unfiltered: noisier, since it carries verbs and
abstractions the tagger would have dropped, but the substance is there.

**The subtraction is the same computation on every platform; its input and its
output precision both vary with the language stage available.** The earlier
formulation here — "computed identically on every platform, precision is what
varies, never the finding set's basis" — was too strong, and the lemmatize row
above is why: if two platforms lemmatize differently, they subtract different
tokens and the residues genuinely differ. Only once Q-7 settles lemmatization can
the stronger claim be made, and it should be restated here when it is.

The alternative — a Python environment in a Node toolchain for spaCy or Stanza —
remains a much larger tax on every author to serve one filter. Q-7 asks whether
the unfiltered residue is good enough to ship as the portable default.

### D6 — A report says what it could not check

When the noun filter does not run, the report says so by name and labels check
3's findings as unfiltered residue. It never silently omits a section, and it
never implies precision it did not compute. An author on Linux must be able to
tell the difference between "no unaccounted nouns" and "the residue was never
filtered down to nouns."

### D7 — Check 3's findings are suggestions; Tier 1's are facts

An entity with no description is a fact. A noun in prose with no matching
entity is a *suggestion*, because prose legitimately names things that are not
implemented and should not be — the wind, the dark, the smell of coal dust,
every abstraction and every part-of-a-part. A tool that reports those as defects
is noise, and a noisy report is an ignored report.

This is ADR-294 D13's discipline applied unchanged: coverage computes over
declared surfaces, never over inference. Tier 1's denominator is the declared
entity set. Check 3 has no honest denominator — there is no total against which
"nouns correctly implemented" could be measured — and must not present one.

### D8 — Findings are grouped into cards, never a flat list

The report presents findings as a set of **cards** — small grouped panels, each
holding a short list — rather than one long enumeration (David, 2026-08-12:
*"noisy is countered by per card lists"*). "Card" here is a unit of presentation,
not the tree document's `TreeCard`; the report has no relationship to the tree.

This is the answer to noise, and a better one than filtering. Three undeclared
nouns on the Fountain Court card is a reading an author acts on. The same three
inside a list of four hundred is a list nobody opens. The identical finding is
signal or noise depending only on how it is grouped.

A consequence worth stating: grouping also makes recurrence visible. The same
suggestion appearing on card after card across a region reads as one decision to
make, not forty defects — which a flat list actively hides.

The grouping unit is Q-5.

### D9 — `declared(S)` is room-scoped, and the scope is the parser's own

**Resolved (David, 2026-08-12): room-scoped — "that's the bug we're looking
for."**

Global subtraction only ever reports a noun that was never implemented anywhere.
Room scope also catches the failure that actually happens to authors: the prose
here names something whose entity lives somewhere else, so the player reads about
it in this room and cannot examine it in this room. That is the bug. Global
subtraction is blind to it by construction, because the entity exists.

**Scope is computed, not approximated.** The runtime's scope evaluator already
answers "which entities are in scope for this actor, at wherever this actor is,"
and it is what populates the parser's entity vocabulary before every turn
(`packages/world-model/src/scope/scope-evaluator.ts:1-13`). The report uses that
evaluator. The question check 3 asks is *would the player be able to refer to
this here*, and the runtime already has one answer to that — a second
implementation would be a second answer, and the two would drift. This is the
same discipline ADR-313 D7 applies to assertion synthesis.

The evaluator's current entry point is actor-shaped rather than room-shaped, so
"the report uses it" costs a small addition rather than nothing; D4 states the
gap and Q-9 decides how it is closed. What is settled here is that the answer
comes from the evaluator and not from a second traversal written for this report.

**Two finding kinds fall out, and one is far stronger.** Once scope is per room,
a residue word can be tested against the global entity set for one more bit:

- **Out of scope here** — declared somewhere in the story, not in scope in this
  room. Near-certainly a defect: the author implemented the thing, so they
  intended it to be examinable, and the prose points at it from a place it cannot
  be reached.
- **Unimplemented** — matches nothing anywhere. Weaker: this is where the wind
  and the dark and the smell of coal dust live, and where D7's "suggestion, never
  defect" framing does its work.

Separating them costs one set lookup and is the difference between a report with
a high-signal section and a report that is uniformly advisory.

**A stated limitation:** scope depends on world state — a container being open, a
door unlocked, an NPC present — and the report evaluates it in the story's
initial state. A thing that only comes into scope later reads as out of scope.
This is a known false-positive source, accepted for a first version, and it is
the price of not replaying (D3).

### D10 — The corpus is every string the player can read

**Resolved (David, 2026-08-12): "all prose the player can read."**

Not room descriptions, and not description fields. Every string the story can put
in front of a player: room and object descriptions, examine text, initial
appearances and listings, NPC dialogue and topic responses, authored action and
event responses, death text, the banner and prologue.

The narrower reading would have missed the most common instance of the bug it
exists to find. *"The desk has a shallow drawer"* lives in the **desk's examine
text**, not in the room description, and there is no drawer. Room descriptions
alone would never see it.

**This means two sources, not one.** The manifest supplies vocabulary (D4) and
scope (D9); it does not hold most of this prose. Authored prose is spread across
the Chord AST/IR by node kind — prose blocks (`ast.ts:453,462-464`), per-entity
phrase overrides (`:535`), message overrides (`:743,758`), `define-text`
(`:843`), death text (`:640`). The prose inventory therefore comes from the built
story's IR, and the manifest answers what is declared and what is in scope where.
D3's "reads the built story" holds; "via `ProjectManifest`" alone does not.

**Every string needs a scope, and not every string has one.** D9 subtracts
against a room, so each piece of prose has to be assigned one:

| Prose | Scope `S` |
| --- | --- |
| A room's own description | that room |
| Prose attached to an entity | the entity's location in the initial world state |
| Prose with no location — banner, prologue, global event text, death text | none |

An entity's location in the initial state is the same approximation D9 already
takes for scope, and it fails the same way: a thing that moves is analysed where
it started. Prose with no location can still be checked, but only for the
**unimplemented** finding kind — "out of scope here" is meaningless when there is
no *here*.

**Markers are not prose.** A prose block carries `{…}` markers extracted at parse
time and not validated (`ast.ts:453`). Only literal spans are tokenized; a marker
is a slot, not a word the player reads.

### D11 — The report is read-only

It writes no story file, no tree document, and no configuration. This keeps it
entirely outside the two-writer problem ADR-313 D12 is about, and makes it safe
to run while Chord Writer has the project open.

**The manifest is computed per invocation and never persisted beside the
project.** Stating it, because D4 changes the manifest and the report is not the
only thing that reads one: a `<story-id>.manifest.json` landing next to
`<story-id>.tests.json` would acquire exactly the concurrency exposure ADR-313
D12 just closed for the tree document, and would inherit none of the fix. If a
cached manifest is ever wanted for speed, that is a decision to take against
ADR-313 D12's atomic-write and re-read rules, not a detail to slip in.

### D12 — It surfaces in both places, from one implementation

The Testing tab is where a report belongs in the IDE — never the play surface or
its run column. The CLI carries the same report for Tier 1. Both render one
computation; neither reimplements it. Where the one implementation lives is Q-1,
and that question is what makes "neither reimplements it" a decision rather than
a hope.

**The authority for the tab is ADR-306's post-go-live ruling 1, not an
authoring/reading split.** An earlier draft of this decision cited "ADR-306 D4's
authoring/reading boundary." ADR-306 has no D4 — that boundary is ADR-305's, and
ADR-306 records David's ruling that it is *superseded*: *"The Testing tab IS the
surface... there is no separate reading surface."* The conclusion is unchanged
and in fact better supported: the tab is the surface, so the report goes there.

## Implementation

| Module | Change |
| --- | --- |
| `packages/ide-protocol/src/types.ts` | **Extended (D4).** `TraitSummary.identity` gains `name`, `aliases`, `adjectives`. |
| `packages/bootstrap/src/introspect.ts` | **Extended (D4).** `buildManifest` projects the three new identity fields it already has in hand, and attaches each room's in-scope entity ids. The second half is blocked on Q-9 — the evaluator has no room-shaped entry point today. |
| `packages/world-model` — scope evaluator | **Possibly extended**, pending Q-9. A location-taking entry point beside `evaluateScope(actorId)`; the evaluator already builds its `IScopeContext` from a `currentLocation`, so this is an entry point rather than new logic. If Q-9 resolves the other way, this row goes away and the walk lives in `buildManifest`. |
| Prose inventory over the Chord IR | **New**, location pending Q-1. D10's second source: walks the built story's IR by node kind — prose blocks (`ast.ts:453,462-464`), per-entity phrase overrides (`:535`), message overrides (`:743,758`), `define-text` (`:843`), death text (`:640`) — and yields (prose, scope) pairs per D10's table. Literal spans only; `{…}` markers are slots, not words. Without this the manifest alone sees room descriptions and the desk/drawer case is invisible. |
| Tier 1 checker | **New**, location pending Q-1. Pure function over `ProjectManifest` → findings. No I/O, no engine, trivially testable. |
| `packages/devkit/src/commands/` | **New command**, spelling pending Q-2. Runs Tier 1 and check 3's subtraction, renders findings, labels the residue unfiltered per D6. |
| `tools/ide` (Swift) | **New.** The NLTagger pass (D5) and the Testing tab's report view (D12). |
| The tree document, `sharpee test`, `sharpee record` | **Not touched.** D1 and D11. |

## Acceptance

1. A story with an NPC that has no TALK TO response and no topics is named in the
   report. (D2.1)
2. A declared entity with no authored EXAMINE response is named in the report.
   (D2.2)
3. A description mentioning an adjective+noun phrase whose adjective is not in
   the entity's `adjectives` is reported, even when the bare noun matches. (D5)
4. The same story reports identical Tier 1 findings from the CLI and from the
   Testing tab. (D12) — **premise-dependent**: it can only be run once Q-1 has
   placed the one implementation somewhere both surfaces reach. Until then this
   AC asserts a property whose mechanism does not exist.
5. On a machine without `NaturalLanguage`, the report completes, states that
   the noun filter did not run, labels check 3 unfiltered, and exits the same
   way it would with no findings. (D6) — **premise-dependent**: needs a non-macOS
   runner, and needs Q-7 to have settled what the portable path does about
   lemmatization. Name the machine the check runs on.
6. No check 3 finding is presented as a failure or a defect. (D7)
7. No view presents findings as one undifferentiated list; every finding arrives
   inside a group small enough to read at a glance. (D8)
8. A story with no tree document at all produces a complete report. (D3)
9. A noun named in room A's description whose entity is declared but in scope
   only in room B is reported against room A as **out of scope here**, and is
   distinguished in the output from a noun matching no entity anywhere. (D9)
10. Two rooms whose descriptions name the same unimplemented noun each report it
    against themselves; no finding is reported against a room whose prose does
    not contain it. (D9)
11. Running the report leaves every file in the project byte-identical, including
    while Chord Writer holds the project open. (D11) — assert this with the same
    shared project-directory no-write helper ADR-313 AC-8 uses; it is one
    property, and testing it twice two ways is how the two answers drift apart.
12. A drawer named only in the **desk's examine text**, with no drawer entity
    anywhere, is reported against the desk's room. (D10) — the case D10 calls the
    most common instance of the bug this exists to find, and the one that fails
    if the prose inventory is built from the manifest alone.
13. A story whose prose is reached only through the IR — an NPC topic response,
    an authored action response, death text — contributes findings; prose with no
    location (banner, prologue, global event text) contributes **unimplemented**
    findings only, never **out of scope here**. (D10)

## Open Questions

**Q-1 — Where does the Tier 1 checker live?** It is a pure function over the
manifest with two consumers, one of them Swift. `@sharpee/ide-protocol` puts it
beside the type it reads; a new package isolates it; `@sharpee/devkit` is the
simplest and strands the IDE. Rule 8b (co-located wire types share by direct
import) bears on this and may settle it.

**Q-2 — What is the command called, and does it stand alone?** `sharpee report`,
`sharpee check`, `sharpee coverage`, or a flag on `introspect`, which already
loads exactly what the report needs. **Decide this together with ADR-313's Q-6**
— both ADRs add a verb to one CLI in the same season, and two independent answers
can easily produce a command list nobody can read. Note also that `--coverage` is
already retired by name on `sharpee test` (`packages/devkit/src/commands/test.ts:62`),
so reusing that word needs to be a deliberate reclaiming rather than an accident.

**Q-3 — What counts as a vocabulary match for an adjective+noun phrase?** Head
noun matches and adjective does not; adjective matches another entity's; the
phrase spans two entities ("the greenhouse door"). Each has a defensible answer
and they produce very different noise levels.

**Q-4 — Does the report ever exit non-zero?** Never (purely informational),
always on Tier 1 findings (CI-usable), or on request. D7 already settles that
Check 3 must not affect it.

**Q-5 — What is a card grouped by?** Per room, per entity, per finding type, per
source file, or per check. The unit decides how many cards a large story
produces and whether any single card ever gets long enough to be a flat list
again. It may differ — Tier 1's findings are about entities, check 3's are about
passages of prose.

**Q-6 — Does a suggestion need silencing?** "The wind" is correctly flagged and
never going to be implemented. Whether grouping alone makes that tolerable, or
whether a dismissal must persist somewhere — and where, given D11 says the report
writes nothing — is unresolved. Prefer looking at a real report over real Chord
prose before designing a mechanism for noise D8 may already have handled.

**Q-7 — Is the unfiltered residue good enough to be the portable default?** D5
splits check 3 so a non-macOS author still gets the subtraction. Whether that
remainder is *useful* — or so full of verbs and abstractions that shipping it
does more harm than saying "not available" — is an empirical question about real
Chord prose, not a design one. It also decides whether a portable stemmer is
needed for `lemmatize()`, since `NLTagger.lemma` is not there to supply it.

**Q-8 — How does this compose with §13's annotated puzzle coverage, and with
ADR-294 D13?** That design (`design-testing-play-surface.md` §13) proposes
author-declared coverage surfaces evaluated over visited states. One report or
two, and does the annotated denominator belong beside these findings or apart
from them?

The larger half of this question is ADR-294 D13, which is ACCEPTED and already
claims part of this ground: its **world coverage** family is *"rooms never
visited, objects never referenced, actions never exercised by any transcript —
computed from the world model / `--introspect` manifest (ADR-184)."* Same
substrate, overlapping question, decided in an accepted ADR. Two differences
matter and should drive the answer: D13's denominator is *play* ("by any
transcript") where Tier 1's is the declared entity set with no play at all (D3);
and D13's delivery vehicle was "a CLI `--coverage` report", which no longer
exists — `--coverage` is retired by name at `packages/devkit/src/commands/test.ts:62`.
So this ADR is realizing part of D13 on a new vehicle. Say so explicitly, and
say which parts of D13's family this does *not* take (its prose-and-plumbing and
outcome-class families both need play traces this report never gathers).

**Q-9 — How does the report get a per-room scope answer?**
`WorldModel.evaluateScope(actorId, actionId?)` derives the location from the
actor (`WorldModel.ts:1611-1620`); nothing answers "what is in scope in room X."
Either the evaluator gains a location-taking entry point — cheap, since
`IScopeContext` is already built from a `currentLocation` — or `buildManifest`
walks an actor room by room, which mutates the world during what is otherwise a
read. D4 and D9 both depend on the answer, and D9's "computed, not approximated"
is not satisfiable until it lands.

## Consequences

- **Content checking stops being something authors would express as tests.**
  The forty-examines suite nobody wants to run, and nobody wants to re-bless
  after a wording change, stops being the only available answer.
- **`ProjectManifest` becomes a lint substrate in name as well as in comment.**
  Two lints were already described in its types; this makes the surface real, and
  every future check has an obvious home.
- **The report is complete from day one, which is a cost as well as a virtue.**
  Because it computes over the built story rather than over recorded play (D3),
  a story with no tests still gets every finding — including, on first run, all
  of them at once. D8's grouping is what makes that landable; without it the
  first run of a large story is unreadable.
- **One capability becomes macOS-only**, in the same season as ADR-313 removes a
  macOS gate. D5 accepts it and D6/D7 bound it — the portable tier is the
  majority of the value and nothing about correctness depends on the platform —
  but it is a real asymmetry and should be revisited if a credible portable
  tagger appears that does not drag in a second runtime.
- **`design-testing-play-surface.md` §14 stops being an unruled capture.** Its
  status marker should be updated to point here by whoever lands this.
- **ADR-294 D13 needs a status note, flipped by whoever lands this and not
  before.** D13's world-coverage family and its `--coverage` delivery vehicle are
  both overtaken — the vehicle already gone from the code, the family realized
  here on a different denominator (Q-8). Left unowned, D13 reads as live and a
  future session re-derives it. Same discipline ADR-313 applies to its three
  ADR-307 notes.

## Session

Session 787eea, 2026-08-12, branch `feat/adr-312-cli-test-recording`. Arose while
designing ADR-313's authoring format: examining the cost of a content test suite
in the tree model produced the fernhill 14-for-8 measurement, and David's
response — *"or we could do this programmatically as a report"* — reframed the
problem. The NLTagger half was recorded in `design-testing-play-surface.md` §14
on 2026-08-09 as "captured, not yet ruled... needs a platform discussion before
it becomes scope." This ADR is that discussion's outcome.

D8 came from David's answer to the noise objection — *"noisy is countered by per
card lists."* Recorded here because it was first mis-read as the tree document's
`TreeCard`, which produced a draft coupling this report to recorded play: check 3
reading replayed output, findings anchored to turns, coverage bounded by the
tree. David corrected it — the word was meant abstractly, as a unit of
presentation. The report has no relationship to the tree, and D3 keeps it that
way deliberately.
