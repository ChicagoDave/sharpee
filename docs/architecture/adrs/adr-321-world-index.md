# ADR-321: The World Index — Map, Reach, Incomplete

**Status**: ACCEPTED (2026-08-19, session 317706) — all six open questions resolved by
interview, `adr-review` findings addressed, flipped with David's approval. Acceptance does
not authorize implementation; the implementation plan is a separate step.
**Amended**: Amendment 1 (2026-08-19, session 4db9d0) adds D10–D15 (contracts in D11a) — response prose, IDE-side
part-of-speech re-heading, tool/progression-info/atmosphere-info roles, the progression chain
captured from the Reach fixed point, the unnamed-tool finding, and the background-thread
placement that makes a deeper scan affordable — raised by David during Phase 6 and measured on
Fernhill before being written. D6b's deferral of a
part-of-speech pass is superseded by D11; every other original decision stands.
**Date**: 2026-08-19 (session 317706)
**Supersedes in part**: [ADR-131](adr-131-automated-world-explorer.md) — its BFS walk is
demoted from the centre of the feature to an optional later stage. ADR-131 is not
retired: its *reachability* mode (added by ADR-303 D6) and its Phase 3 description-noun
idea both survive, the latter as this ADR's Incomplete view.
**Flip owner and trigger**: *whoever accepts this ADR* amends ADR-131's Status in the same
commit as the acceptance, marking it SUPERSEDED IN PART by ADR-321 and pointing its Decision
at this one. The trigger is acceptance of this ADR; the owner is the accepter, not a later
reader. The same accepter files the ADR-093 amendment noted in Consequences — an unowned flip
is why Status lines across this corpus cannot be trusted, and this ADR does not add another.
**Related**: ADR-303 D2 (the transcript tree models the test suite, never the story — why
this is not a Testing tab view), ADR-303 D5/D6 (unwinnability layers; the explorer
widening), ADR-093 (entity vocabulary and adjective disambiguation — its
`adjectives` field, found redundant with the validator's name-word derivation; see D5),
ADR-210 (the Chord Story IR this reads), ADR-297 (IDE
appearance), ADR-308 (testing navigation — a different graph, over the suite)
**Prototype**: `docs/work/explorer/world-index.js` and the surface study at
`docs/work/explorer/world-index-mock.html`. Every figure quoted below is that
prototype's real output on the repository's three Chord stories.

---

## Context

ADR-131 (February 2026) proposed an **Automated World Explorer**: a BFS bot that walks
every room, probes every entity, records all prose, and diffs it against a golden
baseline. The artifact it produced was a diff, its audience was a regression check, and
it was never built — nothing in `packages/` or `repokit` implements it, and the only
explorer code in the repository is `tools/vscode-ext/src/world-explorer.ts`, which
computes the graph-static half for a VS Code webview.

David's reframing (2026-08-19): what an author actually needs is the ability to
**examine the atomic story — see its progress, map its logic, see its missing pieces**,
and then, narrowed: **map, reach, and incomplete**. That is not a regression tool. The
artifact is a surface the author reads, and the questions are about the story's own
shape, not about prose drift over time.

**The reframing changes what the feature costs.** Prose-diffing is simultaneously the
most expensive thing ADR-131 proposed and the thing that answers none of those three
questions. When the questions are asked directly against the compiled Story IR, they turn
out to be a **static join, not a walk**: the IR carries structured conditions
(`{kind:'predicate', pred:'is', subject, object}`), typed mutations (`change`, `move`,
`win`/`lose`/`kill`), full room topology, and a `span` on every node. One pass answers
the map, the reachability, and the vocabulary gaps, in the time a build already takes.

**Two things were learned building the prototype, and both are load-bearing.**

*The IR lists authored rows, not wired ones.* An early pass reported three one-way exits
in Fernhill. There are none: `connectRooms` stamps the reverse exit for every connection,
door or not (`packages/world-model/src/world/WorldModel.ts:1854`). Reading IR rows
literally invents findings — and that is the same computation the VS Code extension
performs today.

*Topology is too optimistic to be worth shipping.* A walk-the-graph reachability check
declared a deliberately-broken Fernhill clean: the cellar sits one exit from the stairs,
so the graph reaches it, even with the cellar door locked and its key sealed inside the
cellar. The check only earns its place once it honours locked doors and asks where the
key sits. That is precisely the bug an author cannot see by reading their own map.

---

## Decision

**D1 — The World Index is an IDE surface with exactly three views: Map, Reach,
Incomplete.** Not a report, not a CLI mode, not a coverage dashboard. Three questions an
author asks about their own story, each answerable in a glance:

| View | The question |
|---|---|
| **Map** | what is the shape of the place? |
| **Reach** | can the player actually get to what I authored? |
| **Incomplete** | what did I name that isn't there yet? |

Anything that is not one of those three questions does not go on this surface. The
logic-graph, progress-ratio, and cost-tier material explored during design is explicitly
**out** — it was interesting and it was not what an author opens a panel to learn.

**D2 — It is derived from the compiled Story IR by a static pass, with no engine run,
running in a TypeScript workspace package the IDE shells out to.** Recomputes on every
build, which is what makes the surface always-current rather than something the author
remembers to regenerate.

The package imports `@sharpee/chord`'s IR types directly, so D3's rules compile against
their source and an IR schema change fails the build in the same commit (DEVARCH 8b). The
subprocess boundary costs nothing new: the IDE already spawns `node` and carries
`Build/ShellEnvironment.swift` specifically to supply the login-shell PATH for it. A Swift
reimplementation was rejected — it would restate D3's six loader-semantics rules in a
second language where no compiler checks them, which is the exact failure that produced
every false finding during prototyping. Emitting the analysis from the Chord compiler was
rejected too: it would put an author-facing heuristic (D6, the noun extractor) inside the
language toolchain's contract, where its stop lists would become a versioning concern.

Running outside the IDE is a free consequence, not a goal — `repokit` or an author's own
script can invoke the same package.

**D3 — The derivation models the loader's semantics, never the literal IR rows.** This is
a correctness requirement, not an implementation note, because every violation of it
produces a confident false finding. The rules the prototype had to learn, each verified
against source rather than assumed:

| Rule | Source |
|---|---|
| `states[0]` is the implicit initial state | `story-loader/src/loader.ts:608` |
| every exit is bidirectional — `connectRooms` stamps the mirror | `world-model/src/world/WorldModel.ts:1854` |
| doors default to `isLocked: true`; other lockables do not | `story-loader/src/loader.ts:2003` |
| `starts unlocked` / `starts locked` override that | `chord/src/catalog.ts:108` |
| `locked`/`open`/`on` are platform trait states, not author states | `chord/src/catalog.ts:108`, `loader.ts:2769` |
| `lit` is readable but not startable | `loader.ts:2733` `detailTraitShape` |

A finding the author cannot reproduce costs more than a finding never reported. **When
the analyzer cannot model a rule, it drops the check rather than guessing** — the
prototype dropped a "missing phrase key" check on exactly these grounds, because inline
`phrase` bodies are not carried in the IR's locale map and a real gap could not be
distinguished from an artifact of where the text lives.

**D4 — Reach is obstacle-aware, not topological.** It honours locked doors, reads each
door's start state, finds the declared key, and opens an edge only when that key is
reachable first — iterating to a fixed point, since reaching a room can yield the key
that opens the next. It reports the *reason*, not just the fact: *the key is inside the
room it opens* is the finding, not *cellar unreached*.

**Gates are modelled as fully as locks, and in the same computation.** A
`<dir> is blocked while <cond>` gate opens only when some `change` statement moves the
entity out of the blocking state *and* that statement is itself triggerable from a state
already reached. This is deliberately the full analysis rather than the cheap
does-any-writer-exist check, and it requires the narrow slice of the writer/reader join that
D1 otherwise puts out of scope — one question, asked per gate, not the whole logic map.

**Locks and gates are one fixed point, not two passes.** Opening a gate can expose the room
holding a key, and using a key can expose the room holding whatever falsifies a gate
condition. Iterating locks to convergence and then gates would report false blocks in either
order; the two expand the same frontier together until nothing new is reached.

*This is the polarity that produced a false finding during prototyping.* `blocked while X`
was first read as `passable while X`, which reported both of Fernhill's gates as permanently
sealed. D3 governs it, and it is named here because a wrong answer about the author's own
map is the most expensive kind this surface can give.

**Performance is the stated limit on D4's ambition, and it is measured, not assumed.** The
full analysis is kept until it hits a wall. Before this ships, the derivation is timed
against synthetic Chord stories at **20, 40, 60, 80, and 100 rooms** — synthetic because the
corpus tops out at 13 rooms and Dungeo is a TypeScript story that produces no Chord IR. If
the fixed point proves superlinear enough to matter at authoring speed, the documented
fallback is the cheap check — does any writer leave the blocking state, without verifying
that writer is reachable — which is strictly weaker and still catches the sealed-gate case.

Reach covers rooms, things and people, exits that resolve to a real room, and things with
a description. Objects with no placement that enter play through a `move` statement are
reachable and stay quiet.

**D5 — Incomplete is a vocabulary check, resolved the way the parser resolves a player's
command.** Extract every noun phrase from every authored description and resolve it against
the same vocabulary the validator builds: **name content words + alias content words +
authored adjectives**, derived on demand from the current name
(`stdlib/src/validation/command-validator.ts:1037`), with a modifier counting as matched when
that set covers it — "adjective, name word, or alias word" (same file, line 1166).

*Chord needs no adjective syntax, and this was checked against the canonical cases rather
than assumed.* `create the red ball` yields the vocabulary `{red, ball}`, so `take ball`
raises a disambiguation across the three balls and `take red ball` scores a
`modifier_match_red` and resolves; `potted plant` yields `{potted, plant}`, so `plant`,
`potted plant`, and `potted` all match. `IdentityTrait.adjectives` remains supported and is
redundant with the name in every use in this repository — Dungeo declares
`name: 'yellow button'` with `adjectives: ['yellow']`, `'trap door'` with `['trap']`,
`'shiny wire'` with `['shiny']`, all predating the name-word derivation. `aka` stays what it
is: **alternate names, not modifiers.**

Three distinct failures, and they are not interchangeable:

- **Missing word** — the object exists but the prose calls it something the parser will
  not accept. Fernhill: *the **hurricane** lamp* where `oil-lamp` answers only to
  *oil lamp, lamp*; *a long **iron** poker* where `furnace-poker` answers to
  *furnace poker, poker*. 17 in a finished, tested story. *(Corrected 2026-08-19, Amendment 1:
  **20**, not 17. The prototype's figure was measured with a head-noun index, a four-letter
  head floor, and first-visit prose unread; the built analyzer models the validator's
  whole-vocabulary rule and pins Fernhill at 20 missing-word / 9 ambiguous / 58 no-object.
  Both quoted examples survive the correction and are asserted by name in the corpus test.)*
  This is the sharpest class,
  because the player is reading the author's own words back and being refused. **The fix is
  always an alternate name** — `aka hurricane lamp` — because each of these prose phrases is
  itself a noun phrase naming the thing. No bare adjective needs a home.
- **Ambiguous** — two or more objects answer to the same noun and nothing separates them.
  Fernhill: *the study door* reaches three door objects, none of which is a study door.
- **No object** — named in the prose, nothing behind it. Fernhill: `scrollwork`,
  `keyhole`, `bolt`, `cache`.

**D6 — Incomplete ships as a candidate list, and says so.** It is read out of prose by
heuristic; some entries are scenery the author meant to skip. A surface that presents
candidates as defects trains the author to stop reading it. Counts are honest and the
framing is "places a player will reach for something that isn't there," never "errors."

**D6a — Findings are suppressible, and the suppression lives in the story source.** The
World tab itself stays stateless: it reruns on every build and shows every finding it has,
with no dismissal store, no acknowledged-findings sidecar, and no per-story UI state. An
author silences a finding by *saying so in the story*, and the analyzer reads that
declaration out of the IR like everything else it reads.

Two scopes, because the noise has two shapes: **story-level** for words that are never
objects anywhere in this work (`wall`, `window`, `sky`), and **per-entity** for a word that
is deliberately unimplemented in one description only (`scrollwork` on the Iron Gates).

**The Chord syntax is deliberately not decided here, and this ADR does not depend on it to
ship.** A suppression declaration is a language change — parser, analyzer, an IR field, and a
`CHORD_LANGUAGE_VERSION` bump, which ADR-257 D3 stamps into every compiled story — and
CLAUDE.md requires platform changes be discussed before implementation. Defining it inside an
IDE-surface ADR would smuggle language surface past that rule. It gets its own ADR; what is
decided *here* is only that suppression is **source, not sidecar**, so that when the syntax
lands the World tab reads it out of the IR like everything else and stays stateless.

Until it lands, the World tab ships **without suppression** — every finding, every build,
exactly as D6a first read. That is a shippable state, not a degraded one: it is the behaviour
David chose before the precision trade-off was raised (*"the author gets to be annoyed by the
gaps"*), and it is what makes D6b's recall tuning safe to adopt now rather than later.

This keeps three properties that a dismissal store would cost: the suppression is visible in
a diff and reviewable, it survives a project move or rename without a key that can go stale,
and it cannot silently outlive the prose it was made against — rewriting the description
puts the author back in the file where the suppression sits. The gaps are still meant to nag
(David, 2026-08-19: *"the author gets to be annoyed by the gaps"*); the escape is to make a
decision and record it, not to click it away.

**D6b — The extractor is a documented heuristic tuned for recall, pinned by a corpus
test.** Its stop and boundary lists are the specification, and a test runs it against the
repository's stories with expected findings pinned, so tuning drift is visible. Recall over
precision: a missed gap is worse than a junk entry, because the list exists to nag and the
author can read past junk in a second — and, under D6a, silence it permanently. That
trade-off is only defensible *because* D6a exists; without a suppression mechanism the same
list would decay into noise nobody reads. A part-of-speech pass is the upgrade path if the
junk rate proves worse on a real mid-authoring story than it looks on finished ones; it is
not taken now, since `lang-en-us`'s `commonAdjectives` is recorded by ADR-093 as never
having been wired up, so there is no lexicon to build on. *(Superseded by D11, Amendment 1:
macOS ships the lexicon this paragraph looked for, and the measured effect is the opposite of
what was expected here — the pass raises recall rather than cutting junk.)*

**D7 — The map auto-lays out on a compass grid, with collision resolution and persisted
manual nudges.** Walking exits from the start and stepping one cell per compass
direction, measured across the repository's three Chord stories:

| Story | Rooms | Result |
|---|---|---|
| The Alderman | 8 | clean grid |
| Ides of March | 5 | clean grid |
| Fernhill | 13 | 11 placed, **1 collision** |

Fernhill's collision: Study (west of Entrance Hall) and Folly Hill (north of Greenhouse)
claim the same cell, stranding Folly Hill and the Folly behind it. **Direction skew is
zero in all three** — no cycle disagrees with itself, which is the failure that would
make auto-layout genuinely hard. The geometry is not wrong; the unit grid is too rigid,
and a real house can put a study and a hillside in the same compass sector. Resolution is
a spaced grid with collided rooms pushed to free adjacent cells, plus per-story manual
positions persisted for the cases the solver renders badly.

**D8 — The surface is a new World tab in the IDE's right panel.** It joins the strip in
`tools/ide/SharpeeIDE/Play/RightPanelViewController.swift` — Build, Play, Testing, Index,
Diagnosis, Documentation, Publish — as a **sibling of Index, not part of it**. The two are
complementary projections of the same IR: Index *enumerates* (rooms, things, people,
actions, phrases, hatches, every row span-navigable), World *analyses* (map, reach,
vocabulary gaps). Both are IDE-side and carry no platform contract, the ruling
`Compose/StoryIndex.swift` already records for Index.

It is **not** a Testing tab view. ADR-303 D2 is explicit that the transcript tree models
the test suite and never the story; everything here is a projection of the *story* and
holds with zero tests written.

**D9 — ADR-131's BFS walk is demoted to an optional later stage, and is not part of this
ADR's scope.** Running the world adds two things the static pass cannot produce: which
edges actually *fired*, and unwinnability that is invisible statically (resource
exhaustion, ordering). Both are worth having and neither is what an author opens the
World Index to learn. The static half of ADR-131 that lives in `tools/vscode-ext` is
subsumed here; per ADR-131's own consequences, the extension copy is not deleted until
this surface renders.

---

## Amendment 1 — prose coverage, part-of-speech re-heading, and mention roles (2026-08-19)

Raised by David during Phase 6, after the World tab was built and rendering: *how are we
identifying room description or NPC/Action messages with embedded nouns and adjective nouns?
Those won't be in any object unless the author has created those objects.* The answer exposed
one gap, one deferred decision now ready to make, and one classification the analyzer was
computing and discarding. They are amended in together because each makes the others
honest: roles make the noise rankable, part-of-speech work makes the recall trustworthy, and
response prose is where both matter most.

**Every figure below was measured on `branch-stories/fernhill` during this session
(2026-08-19), not estimated.**

**D10 — Incomplete reads every authored phrase, not only descriptions.** `describedProse`
reads exactly two keys per entity, `descriptionKey` and `initialDescriptionKey`. Fernhill
declares **124 phrases; 64 are read and 60 are not** — NPC replies, action responses, refusal
messages, and event text, which is precisely where an author writes *"the brass key is on the
mantel"* about a mantel that does not exist. Scanning them adds **85 no-object and 2 ambiguous
candidates** on Fernhill, roughly 2.5x the current list.

Response prose is **attributed by phrase key and by the clause or action that fires it**, not
by an owning entity: a finding today carries `where`/`whereName` naming the entity whose
description holds the phrase, and a response has no such owner. It is **reported in its own
section**, not merged into the description counts, so a noisier source cannot bury the
description findings that are currently clean.

**D11 — Part-of-speech tagging is an IDE-side refinement that RE-HEADS candidates and never
drops them.** D6b named a part-of-speech pass as the upgrade path and declined it for want of
a lexicon. macOS ships one: `NaturalLanguage`'s `NLTagger` with `.lexicalClass`, which is why
this sat open since 2026-08-09 (`docs/work/testing/design-testing-play-surface.md` §14, where
it is captured as *"likely sufficient and preferred… quality-check against real Chord prose
before committing"*). The quality check has now been run, over **all 172 no-object candidates
in Fernhill's prose**:

| | count | share |
|---|---|---|
| head is already a noun — unchanged | 142 | 83% |
| head is not a noun, a noun sits earlier — **re-headable** | 21 | 12% |
| no noun anywhere | 9 | 5% |

It inverts §14's framing. **The tagger is a recall tool, not a filter.** The 21 re-headable
cases are exactly the verb-swallowing limit D6b documents and pins a test against —
`brass plate insists` → `brass plate`, `plunger sinks` → `plunger`, `the hurricane lamp burns`
→ `hurricane lamp` — findings currently being *lost*, which it recovers. It does not
meaningfully reduce junk.

And it must never be used to drop: of the 9 phrases with no noun anywhere, roughly four are
tagger errors rather than extractor errors (`grate/Adjective`, `shroud/Adverb`, `well/Adverb`,
`wooden/Adjective`). A grate the prose names with nothing behind it is the finding. A
drop-if-head-is-not-a-noun rule would delete real gaps to remove junk the author reads past in
a second, which is D6b's trade-off run backwards.

The effect concentrates in exactly the prose D10 adds: **16 of the 21 re-headable cases are in
response text** — about 19% of response candidates against 6% of description candidates.
Response prose is verb-dense, so the extractor loses three times as much there.

**And the budget says go further than re-heading: drop the article gate.** The extractor only
reads phrases opened by `the`/`a`/`an`, a gate that exists purely because ungated extraction
without part-of-speech information is too noisy to ship. Measured cost of removing it —
tagging every word of every phrase rather than only the candidates — is **9.2ms over all of
Fernhill's prose** (10.8ms with lemmas, ~2,400 words), which extrapolates to under 100ms on a
100-room story. AC-8 measured the whole analysis at ~1ms against a 63.5ms process-startup
floor, so this is spending 2% of a five-second budget the surface does not have to honour
anyway.

What it buys, measured by chunking Fernhill's prose into adjective-noun runs with no gate and
resolving the result through the real vocabulary index:

| | phrases | resolved edges | unresolved candidates |
|---|---|---|---|
| article-gated (today) | 249 | 71 | 172 |
| POS-chunked, ungated | 758 | **+98 new** | **+445 new** |

The **98 new edges are the prize** — `plunger` → `primer-plunger`, `staging` →
`staging-benches`, `fuse` → `fuse`, `smoke` → the cat — prose naming real things that the
article gate makes the analyzer blind to, more than doubling the edge count D12 and D13 are
built on. It also means **D13's figure of 11 unnamed things is inflated by this blindness**,
which is the recall caveat recorded there, quantified.

**What it actually bought, measured after implementing (2026-08-19, NLTagger on macOS
26.5.2).** Both predictions above were made against UNFILTERED chunking; the shipped chunker
applies the published head filters — stopwords, minimum head length, inflected heads — so both
figures come in lower:

| | candidates | resolved edges |
|---|---|---|
| predicted above | +445 | +98 |
| **measured, shipped** | **+260** (173 → 433) | **+54**, naming 26 entities |

Fernhill's candidate list goes 23/14/136 to 52/22/359. The prediction is left standing above
rather than edited, because the gap between it and the measurement is the useful record: a
probe run without the filters the surface actually applies overstates both the cost and the
prize.

The 445 new candidates are the cost, and most are junk (`one`, `resistance`, `thumps`, and
`hurricane` split off its lamp). At 3.5x the current list they would be unreadable as a flat
list — **which is why this is only safe alongside D12.** Ungated extraction without roles is a
worse surface than the article gate; ungated extraction ranked by role is a better one. Neither
half ships without the other.

**Where it runs, and what has to cross for it to work.** `NLTagger` is macOS-and-Swift; the
extractor is TypeScript in `packages/world-index`, and Incomplete is today a pure function of
the IR that `sharpee world-index` reproduces headlessly.

A phrase the IDE chunks is worth nothing until it is **resolved** against the story's
vocabulary, so ungated chunking cannot be IDE-side while resolution stays analyzer-side — the
98 new phrases would have nothing to resolve against, and D12 could not role them because the
analyzer never saw them. *(Caught by `adr-review`, 2026-08-19: the first draft of this
decision asserted both halves and was undischargeable.)*

The split is therefore drawn one notch lower. **The analyzer alone BUILDS the vocabulary
index** — `deriveNameVocabulary` is the parser's own function and modelling it twice is the
D3-class error this ADR exists to avoid — and it **publishes that index on the wire** as a
`vocabulary` surface. Chord Writer chunks, resolves against the published surface, and roles
the result with the progression chain the same document carries. It never derives vocabulary;
it applies what it was given.

Measured cost of publishing it: **2.3KB of JSON for Fernhill** — 64 entities, 129 distinct
words.

**Amended while implementing D11 (2026-08-19): the split needs FOUR surfaces, not one, and the
vocabulary surface needs both of its tiers.** Each was found by building the IDE side against
the document and discovering it could not be written:

1. **`vocabulary` carries `exactForms` as well as `wordsOf`.** `resolvePhrase` has two tiers,
   and a phrase equalling a whole name resolves there *and nowhere else*. Publishing only the
   content words hands the IDE a resolver that disagrees with the analyzer on precisely the
   phrases exact forms exist to disambiguate. Fernhill: 149 forms, 6.2KB rather than 2.3KB.
2. **`prose` carries every authored passage, once.** A passage that produced no finding and no
   edge reaches the IDE nowhere else — **21 of Fernhill's 124 are invisible without it** — so
   "chunk all the prose" would silently have meant "chunk the prose that already said
   something". 28.6KB for Fernhill.
3. **`filters` carries the shared head filters.** The two readings chunk differently by design
   — articles this side, part of speech the other — but they must agree on what counts as a
   head worth reporting, or the IDE's list is a different reading of the story rather than the
   same one seen deeper. `BOUNDARY_WORDS` is deliberately NOT published: it ends runs for the
   article gate only.
4. **`roles`**, added under D12 for its own reasons, is the fourth.

The document runs 116KB for Fernhill with all four. Roughly 88KB of that is passage text
repeated inside every finding's embedded site; converting findings to site-by-reference would
shrink it several-fold and is **not** done here — it is a wire refactor across every view, not
a step of this decision.

**And roles cannot rank the candidates ungating adds.** A role attaches to a resolved entity;
the +445 new candidates are *no-object*, which by definition name nothing. Ranking them by
role is therefore done through the **passage's owner** — a missing noun in a
progression-critical thing's prose outranks one in a room's scenery — with an unowned passage
sorting last rather than being hidden. Without this reading, "ungated extraction ranked by
role is a better surface" is unimplementable for the very rows that make it necessary. The alternative, a second subprocess round-trip to resolve the IDE's chunks, buys
nothing and costs another 63.5ms process start plus a protocol no other caller needs.

**How the two readings meet: union, never replacement.** The IDE's list is the analyzer's
findings *plus* what chunking adds, deduplicated on site and phrase — which makes AC-16 hold by
construction rather than by argument, and makes "never drops" absolute rather than approximate.
It has to be a union: the tagger mis-tags real nouns (`shroud` and `well` both come back
adverbs on this corpus), so a reading that trusted the tagger alone would delete findings the
author needs. The visible cost is that a re-headed phrase and the phrase it was re-headed from
can both appear — *hurricane lamp* as a missing-word finding beside *hurricane lamp burns* as a
no-object one — and that is the right trade against silently dropping either.

The cost, stated rather than discovered: **the IDE and the CLI report different counts for the
same story.** That is acceptable here and nowhere else — D6 defines Incomplete as a candidate
list rather than an error list, the divergence is bounded to the recall direction (the IDE
sees strictly more, never fewer), and the headless list stays a correct, usable subset. It
would not be acceptable for Reach or Map, which are claims about the world rather than a
reading of prose, and neither of those may acquire an IDE-side derivation.

**D11a — The wire contract for all of the above, written down.** Amendment 1 adds required
fields to the document, so the schema **bumps to `world-index/2`**: `WORLD_INDEX_SCHEMA` in
`packages/world-index/src/document.ts` and `worldIndexSchema` in
`tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` move together, and the Swift decoder's
existing refusal to read an unknown schema is what makes the bump load-bearing rather than
cosmetic — an unbumped analyzer would be silently read as `world-index/1` by every shipped
app.

```ts
/** Where a mention sits on the story's spine (D12). */
export type MentionRole = 'tool' | 'progression-info' | 'atmosphere-info';

/** What kind of passage a phrase was read from (D10). */
export type ProseKind = 'description' | 'first-visit' | 'response';

/**
 * Where a phrase was found. ONE shape for every prose source, with BOTH attribution
 * fields independently optional — corrected against Fernhill's IR while implementing
 * D10, where an earlier draft of this block had it wrong. A response usually DOES have
 * an owner (`folly-jammed` hangs off `folly-door`'s `on opening`), and some passages
 * have neither: 22 of Fernhill's 124 are story-level, referenced from no entity at all.
 * The phrase key is the only identity every passage is guaranteed to have, which is why
 * it and not the owner is the attribution of record.
 */
export interface ProseSite {
  key: string;                 // the locale-table key — always present
  kind: ProseKind;             // 'response' covers on-clause text, topics, and action responses
  owner: string | null;        // the entity it hangs off, when one does
  ownerName: string | null;
  firedBy: string | null;      // the clause or action that fires it, e.g. 'on opening'
  line: number | null;
  text: string;                // the whole passage — the part-of-speech pass's input
}

/** A phrase that resolved: the prose-points-at-thing edge D12 roles. */
export interface MentionEdge {
  phrase: string;
  entity: string;
  role: MentionRole;
  site: ProseSite;
}

/**
 * An obstacle the fixed point overcame, and what it took (D14). Same shape as the
 * BlockedEdge it would have produced — its `reason` reads why it OPENED — plus the
 * two facts only the loop knows.
 */
export interface LiftedObstacle extends BlockedEdge {
  pass: number;                // fixed-point pass it lifted on; 0 = open from the start
  requires: string[];          // entities that had to be reachable first
}

/** A thing the mechanics need that no prose names (D13). */
export interface UnnamedTool {
  entity: string;
  name: string;
  role: MentionRole;           // 'progression-info' here is the severe case
  reason: string;              // what needs it, in the author's terms
}

/** The resolution surface the IDE applies but never derives (D11). */
export interface VocabularySurface {
  wordsOf: Record<string, string[]>;   // entity id -> the words it answers to
}
```

`ReachResult` gains `lifted: LiftedObstacle[]` beside `blocked`, and
`progression: string[]` — the closure of entities on the chain, which is what D12 consumes and
what the Swift side roles against. `IncompleteResult` gains `edges: MentionEdge[]`, and its
three finding types replace `where`/`whereName`/`line` with a single `site: ProseSite`.
`roles.ts` exports `deriveRoles(ir, reach, edges): MentionEdge[]` and
`unnamedTools(ir, reach, edges): UnnamedTool[]` (D13). The document gains `vocabulary:
VocabularySurface`.

**Amended while implementing D12 (2026-08-19): `roles.ts` also exports
`roleTable(ir, reach): Map<string, MentionRole>`, and the document gains
`roles: Record<string, MentionRole>` covering EVERY declared entity.** `deriveRoles` alone
cannot serve the IDE. Under D11 Chord Writer chunks phrases the analyzer's article-gated
extractor never resolves, so it holds edges the analyzer never made and would have to
re-implement the role rule in Swift to place them — the drift D11a exists to prevent. The
Alderman shows this is not hypothetical: all six `accusable` suspects are proper-named, so not
one of them appears in an analyzer edge today, and every one is a tool the moment ungated
chunking finds it. Publishing the table rather than the rule keeps one derivation and one
answer. Cost measured on Fernhill: ~2.6KB, beside the vocabulary surface's 2.3KB.

**D12 — Every mention carries one of three roles: tool, progression-info, or
atmosphere-info**, and BOTH sides derive them with the same rule — the analyzer over the
edges it resolved, Chord Writer over the edges it chunked, from the same published
`progression` list. David's framing, 2026-08-19: the explorer *"should differentiate on things
that are used in the story and things that provide information to progress the story"*, *"and
that things that just add atmosphere"*, then narrowed to *"tool or progression-info or
atmosphere-info — and I suspect we can deduce if info has no bearing on a puzzle or
progressing the story."*

| role | the mention names | derived from |
|---|---|---|
| **tool** | a thing the player acts on | its own affordances — takeable, openable, switchable, an on-clause bound to a player action |
| **progression-info** | something on the progression chain | the Reach fixed point's own record of what gated what, and what lifted it (D14) |
| **atmosphere-info** | anything else the prose resolves to | the residual, after the two above |

**The info edge is already computed and thrown away.** `classify` opens with
`if (candidates.length === 1) return undefined` — a phrase resolving cleanly to exactly one
entity is discarded, and that resolution *is* the prose-points-at-thing edge. Nothing new is
derived to get the edges; what exists is kept.

**The three-way split is a correction, not a refinement, and the measurement is why.** This
decision was first drafted as a two-way tool/info split with *tool* defined as "referenced
anywhere outside its own declaration." Measured on Fernhill that rule calls **41 of 65
entities** tools and **48 of 71** prose edges info. The progression chain is
**six entities** — `folly-door`, `pantry-door`, `cellar-door`, `tarnished-key`, `boiler`,
`mrs-kettle` — and **five** prose edges point at them. The draft rule was roughly eight times
too generous: it filed the sherry bottle beside the cellar door, which is exactly the
distinction the author opened the view to see.

**Where a tool's affordance actually lives, measured (2026-08-19).** Four sources, any one of
which is enough, and the second was missing from this decision as first written: an on-clause
of the entity's own; **an on-clause on a story-declared trait the entity composes**; a
composition that is itself an affordance (`openable`, `lockable`, `switchable`, `readable`,
`wearable`, `edible`, `cuttable`, `pushable`, `pullable`, `climbable`, `container`,
`supporter`); or plain portability. Fernhill's `case-clock` is the case that forced the second:
its only clause of its own is `on every turn`, it is scenery, and it is a tool solely because
`windable` answers `on winding` in `ir.traits`. This is the same shape of miss D14 fixed for
the chain — the mechanism sits one indirection from where the obvious reading looks.

**Portability has no row to read.** There is no `takeable` field anywhere in the IR: world-model
grants portability by default and `scenery` withdraws it (`IFEntity.isTakeable`). A derivation
that hunts for an affordance row therefore calls every unadorned object inert, which is
backwards — the unadorned object is exactly the one the player can pick up. The rule is
mirrored in `loader-semantics.ts` as `isPortableByDefault` and pinned against world-model's own
getter, not against this paragraph.

**Places and the player can never be tools.** Measured before that guard existed, Fernhill
called `grounds`, `house` and `iron-gates` tools: a region and a room answer `on entering`,
which is player-fired by every test above, and the player is portable because nothing withdraws
it. The guard moved 13 Fernhill edges from tool to atmosphere.

**The corpus after the split**: Fernhill **26 tool / 7 progression-info / 43 atmosphere-info**
of 76 edges; The Alderman 7/0/18 of 25; Ides of March 41/0/20 of 61 (both have no gates, so no
chain). Against the rejected two-way rule's 41-of-65 tools and 48-of-71 info, the sherry bottle
now files as a tool and the cellar door as progression-info, which is the distinction the view
was opened to see.

**Atmosphere-info is a residual, not a classification, and that is a limit not a defect.**
Nothing in the IR says "this is atmosphere" — it is what is left when a mention is neither an
affordance nor on the chain. Rooms land there too: nine of Fernhill's twenty-two
atmosphere-role entities are places. A fourth role for them is not this decision's, and was not
invented while implementing it. This is the case D6a's source-level suppression exists to serve,
and it narrows what that suppression must cover: the author confirms a residual rather than
silencing an undifferentiated list. D6a is unchanged and still ships without suppression until
its own ADR lands.

**D13 — A new Reach-adjacent finding: a tool no prose ever names.** A thing the mechanics
require that no description and no response mentions leaves the player no way to learn it
exists. Fernhill has **11** once rooms and the player are excluded: `winding-key`, `crowbar`,
`deed-box`, `deed`, `kipper`, `kipper-tin`, `nailed-crate`, `mantel`, `grey-overcoat`,
`doormat`. That is closer to unwinnability than anything Incomplete reports today, and it falls out of
D12's edges. Its sharpest form is the intersection with D14: a **progression-critical** thing
no prose names is not a nag, it is a story the player cannot finish by reading.

**It is gated on D10, D11, and D14, and must not ship before them.** "No prose names it" means "no
phrase the extractor pulls resolves to it," and the extractor is article-gated, three-word
capped, and loses phrases to verbs. A crowbar named without an article is invisible to it, so
that count is an **upper bound** until recall is fixed. Shipping D13 on today's extractor
would report authored things as unnamed, which is the class of false finding D4's polarity
guard exists to prevent.

**D14 — The progression chain comes from the Reach fixed point recording its own successes,
never from a static scan of the IR.** D4's loop already computes it and discards it:

```js
const block = obstacleOn(edge, gates, containment, reached, byName, world);
if (block !== undefined) { blocks.set(edgeKey(edge.from, edge.direction), block); continue; }
blocks.delete(edgeKey(edge.from, edge.direction));   // <- the obstacle lifted; what lifted it is dropped
reached.add(edge.to);
```

`obstacleOn` returning `undefined` means *this edge opens*, and the `BlockedEdge` it would
have produced — carrying the door, the key, and the key's room — is deleted rather than
recorded. Kept instead, in a `lifted` list beside `blocked`, it is the dependency graph of
progress: which obstacle gated which room, and what had to be reachable first.

**A static scan cannot substitute, and the corpus proves it — implemented and measured
2026-08-19.** The two chains for Fernhill are the same SIZE and a different SET:

| | chain |
|---|---|
| static scan (rejected) | `folly-door`, `pantry-door`, `cellar-door`, `tarnished-key`, `boiler`, `mrs-kettle` |
| fixed point (D14) | `boiler`, **`stopcock`**, **`primer-plunger`**, `mrs-kettle`, `cellar-door`, `tarnished-key` |

The scan invents two doors that gate nothing — neither `folly-door` nor `pantry-door` starts
locked — and misses both machine triggers. "The scan under-counts" would be the wrong way to
describe that; it is wrong in both directions at once, which is worse, because the count looks
right.

**The mechanism, stated precisely, because this ADR's first draft named the wrong one.**
Fernhill's greenhouse gate reads `north is blocked while the boiler is off`. `off` is the
**`switchable` trait's** state, so Phase 2 was right that a standard action flips it — but
whether that action *succeeds* is governed by `refuse when it is cold` / `refuse when it is
filled` on the boiler, and the boiler only leaves those states through `define machine the
boiler works`, whose transitions are `when turning the stopcock` → filled, `when pushing the
primer plunger` → primed. **The machine is a top-level IR construct**, not a clause on any
entity: `ir.machines`, with its own roles and transitions. The stopcock appears in no
condition, in no `change` statement, and nowhere in the boiler's own clauses. A per-entity
scan cannot reach it by construction, and the fixed point reaches it because
`machineDrivers` resolves each machine's role to the entity it plays and reads the triggers
that advance it.

Verified by mutation, not only by a green run: blinding the walk to `ir.machines` drops
`stopcock` and `primer-plunger` from the chain and fails three tests.

**D15 — The derivation runs off the main actor and the tab says so while it does; duration is
therefore not a constraint on this amendment's scope.** David's ruling, 2026-08-19: *"if we run
it on a background thread with a Loading message on the tab, I think we're safe."*

Of AC-8's 71ms for a 100-room story, 63.5ms is Node starting up and ~1ms is the derivation, and
the analysis already runs after a build completes rather than during one. What the ruling adds
is the two properties that make a *deeper* scan safe rather than merely fast: the child's
output is decoded in the termination handler's own context, so a document carrying a source
sentence per candidate never parses on the main actor, and the World tab holds an explicit
loading state between the build finishing and the analysis landing.

Loading is a state of its own, not a stale render. Leaving the previous analysis on screen
through a rebuild — with its finding badge — attributes one version of the story's findings to
another, which is the same lie the AC-9 empty states exist to prevent.

**What still binds is placement.** This work must not move onto a keystroke, a save, or the
compose loop that feeds the Index tab. There, a background thread does not help: the author is
waiting on the result, and a five-second scan becomes the reason the feature gets turned off.
Post-build, and only post-build.

### Acceptance for this amendment

- **AC-10 — response prose is read and attributed.** Every phrase in the locale table is
  scanned, response findings are attributed by phrase key and firing clause, and they are
  reported in their own section. The corpus figures (D6b) are re-pinned across both sources.
  *(SELF-VERIFYING.)*
- **AC-11 — the tagger re-heads and never drops.** A test asserts that no candidate is removed
  by the part-of-speech pass, and that the phrases D6b pins as lost to verb-swallowing —
  `the hurricane lamp burns` among them — are recovered at their real head. *(SELF-VERIFYING.)*
- **AC-11a — ungated chunking recovers the edges the article gate hides.** `plunger`,
  `staging`, `fuse`, and `smoke` resolve to their entities, and the corpus edge count is
  pinned before and after so the gain is a recorded figure rather than a claim. The
  part-of-speech pass over a whole story's prose stays under 250ms. *(SELF-VERIFYING.)*
- **AC-12 — roles are derived and pinned.** Every resolved prose edge lands in exactly one of
  tool, progression-info, atmosphere-info, with the corpus counts pinned per story.
  *(SELF-VERIFYING.)*
- **AC-13 — the unnamed-tool finding is correct on the corpus.** Each reported tool is
  confirmed absent from every authored phrase by direct search of the prose, not only by the
  extractor's own reading — the check that keeps an extractor recall gap from being reported
  as an authoring gap. *(SELF-VERIFYING.)*
- **AC-14 — the progression chain is the fixed point's, not a scan's.** `stopcock` is reported
  progression-critical on Fernhill — the case a static scan gets wrong because the boiler gate
  lifts through the `switchable` trait — and a test asserts it, so a later refactor cannot
  quietly substitute a scan. *(SELF-VERIFYING; this is D14's regression, the way AC-5 is
  D4's.)*
- **AC-15 — the tab never blocks and never lies while working.** The decode is callable off
  the main actor (a test drives it from a detached task), the tab reports loading between a
  build and its analysis, and both an analysis and a failure clear that state — a tab that
  spins forever on an absent toolchain is the failure mode this state introduces.
  *(SELF-VERIFYING; satisfied by Phase 6, ahead of the rest of this amendment.)*
- **AC-16 — the headless list is a subset, not a different reading.** For every corpus story,
  every finding the CLI reports appears in the IDE's list with the same site and the same
  phrase, and the IDE's count is greater than or equal to the CLI's. This is the test that
  keeps D11's accepted divergence bounded to recall — without it, "the IDE sees strictly more"
  is an argument rather than a property. *(SELF-VERIFYING.)*

---

## Implementation

Not authorized by this ADR. The prototype is `docs/work/explorer/world-index.js` — one file,
no dependencies, `node world-index.js <story>.ir.json`, emitting all three views as JSON. It
is a specification by example, not shippable code: JavaScript outside the workspace, no
tests, and a hand-tuned extractor.

**Modules affected**, when authorized:

| Module | Change |
|---|---|
| `packages/world-index` (new) | the derivation; imports `@sharpee/chord` IR types directly. **One** registration point: `ts-forge.config.json`. *Corrected twice, 2026-08-19. This table first said six, counting the root `package.json` `workspaces` array; `session-planner` cut it to five, since pnpm reads `pnpm-workspace.yaml` whose `packages/*` glob already covers a new package and the array is vestigial (it lists `packages/forge`, `packages/cli`, neither on disk). Building the package cut it to one: the remaining four were the umbrella's `package.json`/`index.ts`/`tsconfig.json`, and the umbrella is the story-runtime import contract (ADR-178), not a registry of every package. `@sharpee/ide-protocol` — the closest peer, a tooling package depending on `@sharpee/chord` — is registered in `ts-forge.config.json` alone and appears in none of the umbrella's files. The six-point checklist applies to a runtime package an author imports, which this is not.* |
| `tools/ide/SharpeeIDE/Play/RightPanelViewController.swift` | the World tab joins the strip |
| `tools/ide/SharpeeIDE/World/` (new) | the tab's three views |
| `tools/ide/SharpeeIDE/Build/BuildRunner.swift` | invoke the analyzer after a successful build |
| `tools/vscode-ext/src/world-explorer.ts` | deleted **only after** the World tab renders (ADR-131's own consequence) |
| *Amendment 1* — `packages/world-index/src/incomplete.ts` | reads every authored phrase, not two keys per entity (D10); keeps the resolved prose edge it discards today (D12) |
| *Amendment 1* — `packages/world-index/src/roles.ts` (new) | tool/progression-info/atmosphere-info derivation and the unnamed-tool finding (D12, D13) |
| *Amendment 1* — `packages/world-index/src/reach.ts` | keeps the obstacle it lifts instead of deleting it — the progression chain (D14) |
| *Amendment 1* — `packages/world-index/src/document.ts` | schema bumps to `world-index/2`; carries `ProseSite` (with the source sentence), `MentionEdge`, `LiftedObstacle`, and the `vocabulary` surface (D11a) |
| *Amendment 1* — `tools/ide/SharpeeIDE/World/WorldIndexDocument.swift` | `worldIndexSchema` bumps with it, and the new shapes decode (D11a) |
| *Amendment 1* — `tools/ide/SharpeeIDE/World/` | `NLTagger` re-heading before render, and role-ranked sections (D11, D12) |

**The IDE↔analyzer boundary.** The analyzer is a subprocess reading a `.ir.json` path and
writing one JSON document to stdout; the IDE parses it and renders. The document's schema is
the contract and is versioned with the package. Failure is a first-class state the tab must
render, not a crash: a missing or malformed IR, an absent `node`, or a non-zero exit shows the
World tab in an explanatory empty state naming the cause, the same way the Testing tab shows
its build-first placeholder.

**Sequencing.** Package first with the corpus test (D6b) and the acceptance suite below;
tab second; extension deletion last. The Chord suppression ADR is independent and can land at
any point after.

---

## Acceptance

**The acceptance method is fault injection against a real story's IR**, which is how this
session demonstrated the surface's own failure states. A real story is parsed, a known fault
is written into its IR, and the analyzer must name that fault. The four faults below were
executed against `fernhill.ir.json` during design and produced exactly the output quoted.

- **AC-1 — clean corpus.** All three Chord stories (Fernhill 13 rooms, The Alderman 8, Ides of
  March 5) report zero Reach findings unmodified. *(SELF-VERIFYING.)*
- **AC-2 — the key inside the room it opens.** Moving `tarnished-key` into `cellar` yields
  `cellar` unreached with the reason *key is inside the room it opens*, and `tarnished-key`
  plus `crowbar` reported stranded. *(SELF-VERIFYING.)*
- **AC-3 — exit to nowhere.** Adding `kitchen east → scullery` yields one broken exit and does
  not inflate the reachable-room count. *(SELF-VERIFYING — this exact case first produced a
  14-of-13 count, so the assertion is on the count as well as the finding.)*
- **AC-4 — missing description.** Clearing a thing's `descriptionKey` reports it as reachable
  and examinable with nothing to read. *(SELF-VERIFYING.)*
- **AC-5 — the polarity guard.** Fernhill's two gates report as openable, not sealed. *(SELF-
  VERIFYING; this is the regression test for the `blocked while` inversion in D4.)*
- **AC-6 — loader-semantics pins.** One test per row of D3's table, asserting the analyzer's
  reading matches the platform's. *(PREMISE-DEPENDENT — each premise is the cited source line,
  which the test reads behaviourally rather than by line number.)*
- **AC-7 — vocabulary cases.** `red ball`/`green ball`/`blue ball` and `potted plant` resolve
  as D5 describes, with no `adjectives` declared. *(SELF-VERIFYING.)*
- **AC-8 — scale.** The derivation is timed on synthetic Chord stories at 20/40/60/80/100
  rooms; D4's full gate analysis is kept if timings stay within an authoring-speed budget, and
  the documented fallback is taken if not. *(PREMISE-DEPENDENT — the budget is set when the
  first timings exist; no number is asserted here.)*
- *(AC-10 through AC-13 are Amendment 1's, and live in its own Acceptance subsection above.)*
- **AC-9 — failure states render.** Missing IR, malformed IR, and absent `node` each produce
  the explanatory empty state rather than a crash or a silent blank tab. *(SELF-VERIFYING.)*

---

## Consequences

- **The author gets a correctness check that no test suite provides.** Reach's
  key-inside-the-locked-room finding is not expressible as a transcript assertion; it is a
  property of the world's initial state.
- **The IDE gains a second graph, and the two must not be confused.** The Testing tab's
  tree is the suite; the World Index's map is the story. ADR-308's navigation work is over
  the former and shares nothing with this.
- **Incomplete has a false-positive budget, permanently.** It is heuristic by nature. D6
  makes that a stated property rather than a defect to be driven to zero.
- **The derivation is coupled to loader semantics.** Every rule in D3's table is a place
  where a platform change silently breaks the World Index's correctness. That coupling is
  the price of the static approach; AC-6 is the pin.
- **A finished story returns almost clean, and that is the honest result.** Fernhill,
  The Alderman, and Ides of March all pass Reach unmodified. The value lands on a story
  mid-authoring, where the gaps are the work not yet done — which is also why the surface
  study had to inject faults to show its own failure states.
- **ADR-093's `adjectives` field is confirmed redundant for new stories.** The validator's
  name-word derivation covers the canonical disambiguation cases; the field stays supported
  and nothing new needs to set it. Worth an ADR-093 amendment, out of scope here.
- **ADR-131 stops being a thing anyone should build from as written.** Its Decision now
  describes the least valuable stage of a feature whose centre moved.
- **The IDE gains its second subprocess contract.** `node` was already a hard dependency
  (`Build/ShellEnvironment.swift` exists for it), but build output was the only thing crossing
  that boundary. The analyzer's JSON is now a versioned schema two languages must agree on,
  and AC-9 exists because a subprocess that can fail is a state the UI has to render.
- **The World tab is stateless, and that is a deliberate cost.** No dismissal store means no
  key that can go stale and no suppression that outlives the prose it was made against — at
  the price of a longer list until the Chord suppression ADR lands.
- **A Chord language change is now queued behind this.** D6a's source-level suppression needs
  its own ADR, a `CHORD_LANGUAGE_VERSION` bump, and the platform discussion CLAUDE.md
  requires. This ADR ships without it and gains it later.
- **Locks and gates being one fixed point is the expensive decision.** D4 takes the full
  analysis knowingly; AC-8 is the tripwire, and the fallback is documented rather than
  discovered under pressure.

---

## Session

## Amendment 2 — say where, say which, say why (2026-08-20)

Raised by David reading the shipped Incomplete list against Ides of March: *"This is not
pointing to the right place and the message isn't even correct."* Three separate defects
under one complaint, each verified against the story source before anything was changed.

**D15 — A hyphen joins, and a possessive names its owner.** The extractor turned every
non-letter into a boundary, so `the tiring-house door` was unreadable to it — while the
IDE's part-of-speech pass, tokenising with `.omitPunctuation`, split the compound and
reported a phrase the author never wrote (*"tiring house door" does not answer to "tiring",
"house"*) about a door whose own name is `tiring-house door`. Both sides now keep hyphenated
compounds whole. Possessives end a run rather than becoming names: no player types
*house's first play*, so reporting `play-book` for not answering to `house's` is a finding
about nothing. Measured on Fernhill's descriptions: 20/9/58 → 27/10/51, where the seven
added missing-word findings are compound-adjective phrases the hyphen boundary used to
shred (*cast-iron estate boiler*, *long-handled primer plunger*, *wooden-handled tin
opener*) and the seven lost no-object rows are their fragments.

**D16 — A passage publishes its whole span, and a finding says which word reached its
target.** `ProseSite` carried only the passage's first line, so every finding in a
five-line description navigated to the same place; `stage.description` runs 34–38 and holds
*tiring-house door* on 37. The wire now carries the whole span and the IDE resolves the
phrase inside it against the source text — matching words across line breaks, never leaving
the passage, falling back to its first line. Findings also carry `matched`, the word that
reached the target, because *"house's first play" → play-book* is an assertion the reader
cannot check until the row says the head word `play` is what did it.

**D17 — Every entity publishes its name, its declaration span and its room.** A finding
named `oil-lamp`, which is neither what the author wrote nor anywhere they can go. The new
`declarations` table carries all three, which is what lets a row say *the oil lamp*, take
the reader to the `create` that made it, and — under Amendment 3 — put a new thing where it
belongs. **Wire bumped to `world-index/3`**: `prose[].span` REPLACES `line`, so a v2 reader
finds no `line` at all.

**D18 — The candidate list does not badge the tab.** The tab strip badges defect counts;
World's number is the size of a heuristic candidate list, most of it scenery the author
meant to leave as words. Badging it dressed *"631 things to read"* as *"631 problems"*
(David's ruling). The per-class counts stay inside the tab, where the reader can see what
they count.

**D19 — Naming a manner or an act is not naming a thing.** `No object` is defined by a
negative — *nothing answers to this* — so it necessarily catches every noun in the prose
that is not an object, which is most of English: Ides of March raised 611. Three tests were
considered (David's framing: the senses test, the dependency test, the nominalized-verb
test). Only the last is mechanizable without a lexicon, so the rule is layered:

1. **An override**, checked first — words this project insists can be things whatever any
   authority says. It carries the written-instrument class (`deed`, `ticket`, `petition`,
   `commission`) and conferrable status (`knighthood`, `lordship`, `apprenticeship`),
   because a story can hand the player a knighthood and a candidate list that hides the
   word is hiding a thing (David's ruling).
2. **A five-word hand list** — `flourish jig clank whump wheeze` — the zero-derived cases a
   lexicon lets through because they have one concrete sense (a jig is also a workshop
   fixture; a flourish is also the ink).
3. **The lexicon**, 12,444 lemmas with no `physical entity` sense in Open English WordNet
   2024, supplied by David and reduced from 16,958 by dropping three branches that leak
   things: `group` (`crowd`, `audience`), `measure` (`coin`), and `communication` (the
   whole written-prop class). CC BY 4.0; attribution ships in the data file and the
   generated module.
4. **Morphology**, last, for words no dictionary lists — `-ness` attaches to any adjective,
   so the class is open and 12,444 lemmas can only be a snapshot. `-ship` and `-hood` are
   absent: what they collect in English is conferrable status.

A syntactic manner rule (*with a flourish*) was written, measured and **removed**: across
Fernhill and Ides it correctly suppressed four and wrongly suppressed six things an author
might genuinely have left unimplemented (`a bolt`, `a coat pocket`, `a bright slot`, `a
mended sleeve`). D6b prices a missed gap above a junk row. The lexicon stays in the
analyzer; only the verdicts for words this story contains cross the wire (75–85 per story,
under 1.5KB, against ~180KB for the dictionary).

Measured: Ides of March no-object 207 → 181, Fernhill 127 → 115, suppressions published as
`notThings` rather than dropped silently.

## Amendment 3 — the list acts (2026-08-20)

Raised by David after using the amended surface: the roles were invisible, the volume was
unrankable, and a row that says *the door does not answer to "stout"* and leaves the author
to go and type it is a diagnosis with no treatment.

**D20 — The role bands are tabs, and No object ranks by recurrence.** D12's roles shipped as
a sort order, which left them invisible: a reader scrolling six hundred candidates cannot
see where the puzzle-critical ones stopped. Story / Tools / Atmosphere are now a strip of
their own with their own counts. Within a band, the one class with no target to rank
against ranks by how often the prose says the phrase — a phrase named four times is a
better candidate than one named once, and the row says so.

**D21 — An author can dismiss a phrase, and the dismissal lives with the story.** Ignoring
is per phrase and story-wide (dismissing *the word* means the phrase, not its fifth row),
written to `<story>.world-ignore.json` beside the `.story` file: diffable, committed, and
true on the next machine. `SessionState` is window geometry; this is authored content. The
list is filtered All / Remaining / Ignored, defaulting to Remaining, and an empty list
deletes its file rather than leaving an artifact in the author's repository.

**D22 — Each candidate is a card that carries its own fix.** A button per word the prose
used (`+ stout`, `+ oak`), `Define as scenery` for a phrase nothing answers to, `Write the
description` for a thing that says nothing, plus navigation and Ignore. Three rules hold
across all of them:

- **The card offers; the window applies.** Edits go through the editor's undoable
  `replaceText`, so an accepted offer is an ordinary typing edit — ⌘Z works, the tab goes
  dirty, the author saves when they choose. Nothing writes the file behind them.
- **Nothing invents prose.** Adding `stout` uses the author's own word for that door.
  Declaring scenery writes the `create` block and stops at the description; `Write the
  description` writes a blank line and an indent. What goes there is the author's.
- **Edits are computed against the buffer, and anchored to text.** The analysis describes
  the story as it was BUILT; the buffer moves the moment the author types or accepts
  another offer. An edit measured against the file while the buffer has moved lands that
  many characters wrong — which is how a declaration landed inside a `define phrase` block
  during review. Blocks are found by their `create` line and ended by where indentation
  stops.

**D23 — A new thing goes next to what named it.** Not at the end of the file: a story is
read in the order it is written, and appending scatters a room's furniture across the file
in the order the author happened to accept offers. The host need not be a room — *the pen*
is named in a poet's topic list, so it belongs beside the poet, in the room the poet is in.
Those are two different questions and the placement answers both from the same host: the
room for the `in the …` line, the host for the file position. A passage owned by nothing
has neither, and only then does the declaration go to the end.

**D24 — After every tap, the card asks whether it is finished.** The analysis keeps
reporting a finding the author has just fixed until the next build, so the card answers for
itself in between: each accepted word leaves it, and the last one marks it **done** —
fixed, not ignored. The distinction is the point: ignoring is what an author does to a
finding they disagree with. Done is session state, cleared by the next analysis; ignoring
is a decision that outlives the session. Accepting `Define as scenery` does not remove the
card either — it becomes *"declared, and says nothing"*, because the author is already here
with the file open.

**D25 — Undescribed is the fourth class, and it is not a build error.** A thing with no
description answers *"You see nothing special about the bankside sign"* — a fine answer for
a thing that exists to be mentioned, and a hole for everything else. It compiles and plays,
so failing a build over it would fail builds over an authoring judgement, and a warning
that fires on every deliberately-plain object is one authors learn to scroll past (David's
ruling). It is derived from the IR (`descriptionKey` and `initialDescriptionKey` both
absent), which means it also catches what the author declared by hand months ago — not only
what this surface created. Regions and the player are excluded: nobody examines a region,
and the player's description is the story's business. Both corpus stories report zero,
which is the pin that matters: a class that fires on a clean story is one nobody trusts
when it fires on a dirty one.

Session `317706` (2026-08-19, branch `main`). Originated in a review of open ADRs, which
surfaced ADR-131 as unbuilt; David reframed its intent, then narrowed the surface to Map /
Reach / Incomplete. The prototype and surface study were built and corrected against
source across the session — four classes of false finding were caught and fixed before
anything was reported as real (literal exit rows, `lockable` read as locked, trait states
read as author states, `states[0]` not treated as initial).

All six open questions were resolved by interview in the same session, and `adr-review`
returned NEEDS WORK (9/18) on the result — the Implementation section left stale by the
folds, no acceptance criteria, unowned supersession, stale consequences, and a Chord
language change carried inside an IDE ADR. All five findings were addressed before the
acceptance offer; the language change was split out rather than defined here.
