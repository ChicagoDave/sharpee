# ADR-321: The World Index — Map, Reach, Incomplete

**Status**: ACCEPTED (2026-08-19, session 317706) — all six open questions resolved by
interview, `adr-review` findings addressed, flipped with David's approval. Acceptance does
not authorize implementation; the implementation plan is a separate step.
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
  *furnace poker, poker*. 17 in a finished, tested story. This is the sharpest class,
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
having been wired up, so there is no lexicon to build on.

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
