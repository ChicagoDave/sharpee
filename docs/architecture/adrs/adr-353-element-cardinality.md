# ADR-353: Element cardinality — what an Element *is*, as against how it is carried

**Status**: **DRAFT — reviewed, awaiting David's flip** (2026-09-15, session c35f3d, on `main`). All six questions this ADR opened are resolved and the Open Questions section is removed, as its shared contract requires.

**`adr-review` ran in multi-ADR mode** (2026-09-15, same session, over ADR-349, ADR-352 and this one), and found one blocker at the D6/D8 seam that neither decision showed alone: D8's replay re-runs commands from history, meta commands are deliberately not in history (`meta-registry.ts:5`), so a typed VERBOSE would never be re-applied and an undo would silently revert the viewer's display mode — which AC-13 had *required*, in its original wording. D8 now states that replay reconstructs world facts and leaves session facts untouched, AC-13 is scoped to world facts, and AC-17 tests the seam directly. Six smaller findings folded the same pass: the Scope line's reach, ADR-163's supersession ownership and flip trigger, D7's cache lifecycle, the Open Questions section's format, and a citation corrected below. Split out of ADR-352 at David's ruling that it is seminal and owed its own ADR and its own discussion. The Context was written first because the question turned out to be mis-stated as "fixed by the vocabulary or chosen per registration": the repository shows `mode` doing at least three unrelated jobs at once, and which of them belong to an Element's identity is the real fork.

**D1 is settled** (David, 2026-09-15, at "exists between turns is the right cut"), by a sweep of known IF output rather than by argument — the question asked was whether an Element has one cardinality or two, and the catalogue answered that it has both readings always, with the *kind* of Element deciding which are populated. **D2 and D3 follow** (David, same session, at "take the first", and at "VERBOSE and BRIEF are meta commands to me"): the four missing state readings get built, and preference commands move to the client. **D4 and D5 follow** (David, same session, at "model yes and no" then "yes, fold both"): auto-pinning is gated on whether a value's realization made a state-dependent choice, tracked per run, with identity claims as the complement. **D6 follows** (David, same session): viewer preferences are one state Element, a record, which is what lets D3's client-side rendering decision persist, synchronize and be tested. **D7 follows** (David, same session): the description's state reading detects change by evaluating its registered predicates rather than realizing its tree, because realization is not side-effect-free. **D8 follows** (David, same session, at "if I undo I should be re-running the previous turn"): undo replays rather than restoring a snapshot, which ADR-293's determinism makes available and which removes undo as a packet-shape exception. **D9 follows** (David, same session, at "we're still greenfield" — migration was the only argument against it): the turn packet splits into state and occurrence sections keyed by Element id, and the three one-fact-two-channel pairs collapse. **D10 closes the last one** (David, same session): a story declares presentation by name and a client may honour it, which is ADR-174's decoration discipline extended from appearance to behaviour.

**Scope**: `packages/if-domain/src/channels/` (the `ChannelMode` / `ChannelEmitPolicy` contracts and the packet types), `packages/stdlib/src/channels/` (the shipped channel set) and `packages/stdlib/src/actions/standard/looking/` (D2's readings, D3's stubs), `packages/world-model` (D2's projections, D7's predicate evaluation), `packages/engine/src/prose-pipeline/` and `packages/engine/src/turn/` (D4's provenance accumulation, D8's undo), `packages/lang-en-us/src/assembler/` (D4's per-run provenance), `packages/transcript-tester/src/assertion-core.ts` and `packages/branch-tester` (D4 and D5's auto-pinning), `packages/platform-browser` and `tools/ide/web/testing-surface` (D3, D9, D10 — the clients), and every other client that renders a turn packet.

## Date: 2026-09-15

## Parent

**Depends on** ADR-352 (IF Elements — this decides one property of the layer that ADR establishes) and on ADR-293 (choice points and per-point streams — its determinism at a pinned seed is what makes D8's replay undo available at all). **Revisits** ADR-163 §4 and §5, whose `mode` and `emit` axes are the thing under examination. **Related**: ADR-300 D8 (there is no catch-all `main` channel; each element of a turn's prose is its own channel) and D9 (`preferred-layout` — the engine states a reading order and calls it a preference), ADR-349 D3a (the two surfaces may never differ).

## Context — verified, not assumed

### What ships today, counted

Twenty-one standard channels, by the two axes ADR-163 gives them (`packages/stdlib/src/channels/standard.ts`, read 2026-09-15):

| mode + emit | channels |
| --- | --- |
| `replace` + `always` | `preferred-layout`, `prompt`, `location`, `score`, `turn`, `info`, `ifid`, `prologue` |
| `replace` + `sparse` | `banner`, `story-ending` |
| `append` + `sparse` | the seven prose channels — `room-name`, `room-description`, `room-contents`, `action-result`, `action-blocked`, `error`, `game-message` — plus the author channel |
| `event` + `sparse` | `death`, `endgame`, `score_notify`, `lifecycle` |

### `mode` is doing three unrelated jobs

Read against `ChannelMode`'s own documentation (`packages/if-domain/src/channels/types.ts:161-172`), the three values differ along three axes at once, and no channel can pick them separately.

1. **Accumulation.** Does a new value supersede the last (`replace`) or join a list (`append`)?
2. **Replay on a mid-session join.** `replace` replays the latest value, `append` replays the whole list, `event` replays nothing — "not persisted; mid-session joins do not see prior `event` emissions."
3. **Client obligation.** A `replace` channel implies a surface that holds a value — a status field. An `append` channel implies a surface that grows — a scrollback. An `event` channel implies a surface that flashes and forgets.

`emit` (`always` | `sparse`, `types.ts:205-214`) is a fourth axis crossed with these: whether an unchanged value is restated every turn.

A decision that says "cardinality is part of an Element's definition" has to say **which of these four** it means, because they are not the same question and the current type conflates them.

### `replace` already means two different things

`score` and `location` are live current values: they change as the world does, and `always` restates them every turn. `ifid`, `info`, `banner` and `prologue` are constants set at boot. `prologue`'s own header says so: *"Emitted once in practice: the value is set before the first packet and replace-mode carries it unchanged"* (`standard.ts:471-479`).

So `replace` is carrying both "this is the current reading of something that varies" and "this was established once and persists". Those have opposite answers for ADR-349 D14's refusal — a varying value must never be auto-pinned, and a constant is exactly what *should* be pinned — and the wire cannot tell them apart today.

### The same fact ships at two cardinalities, right now

After ADR-349 the location heading reaches the player two ways:

- `location` — `replace` + `always`, a `LocationHeadingValue`, restated every turn whether it changed or not.
- `room-name` — `append` + `sparse`, a `ProseEntry`, present only on a turn that produced a room description.

ADR-349 D3a rules that the two may never differ in content, and Phase 4 made that true by giving both a single derivation. But their **cardinality** still differs, and nothing rules on that. This is the concrete instance of the question: one Element, two cardinalities, both shipped, both correct for their surface.

It admits a reading that neither of ADR-352's framings anticipated — that an Element has *both* a current value and an occurrence stream, and a client chooses which it consumes. That is what the DOM does: live state, plus mutation observation. It is also, accidentally, what Sharpee already does for this one Element.

### Why the answer decides the wire

If cardinality is fixed per Element, a turn packet is a **mutation batch over a document whose shape every client already knows** — which is what lets ADR-352's naive client allocate a status field for `location-name` before it has seen the story. If cardinality is chosen per registration, a client cannot know the shape of a story's output until it reads the manifest, and two stories may carry the same Element differently.

## Decision

**D1 — Every Element has two readings, and one mechanical test decides which are populated: does the thing exist between turns?**

The two readings:

- **State** — what is true now. There is an answer at any moment, including on a turn where nothing touched it.
- **Occurrence** — it happened on this turn. There is no value between turns; there was an event.

Three kinds fall out, and the assignment is not a per-Element judgement call:

| Kind | Test | Readings |
| --- | --- | --- |
| **World fact** | exists between turns, and is part of the fiction | **both** |
| **Session fact** | exists between turns, and is machinery or packaging | **state only** |
| **Narration** | does not exist between turns | **occurrence only** |

Verified against a sweep of known IF output — Infocom status lines, Inform room presentation, the standard meta verbs, and Sharpee's own twenty-one channels (2026-09-15). World facts: location name, location description, room contents, exits, inventory, score, time of day, chapter, ending, death, a pending disambiguation, an open menu or topic list. Session facts: story title, author, version, IFID, prologue, prompt, turn count. Narration: action success, action blocked, parser error, implicit-action reports, daemon and fuse output, NPC action reports, sound from elsewhere, save/restore/undo confirmations, footnotes, AMUSING, quotations.

No case resisted. The one expected to — time of day — obeys: it is a world fact, so it carries both a state (`9:05 AM` in *Deadline*'s header) and an occurrence ("The clock strikes nine").

**Why "exists between turns" and not "lives in the world model".** The alternative cut was tested and rejected: it would move the prompt and the turn count out of the state kind while leaving everything else where it is, which buys nothing and ties a semantic vocabulary to one package's storage.

**This dissolves ADR-352's override question rather than answering it.** A story that wants every location change narrated as prose instead of replacing a status field is consuming the occurrence reading. It is not overriding a cardinality, and it has no reason to mint its own Element.

**What D1 says about the three surviving axes in the Context.** Accumulation, replay, and client obligation are not free choices: they follow from which reading is being consumed. A state reading supersedes, replays its latest value, and implies a surface that holds; an occurrence reading accumulates, replays as a list, and implies a surface that grows. Restatement — `emit`'s `always` / `sparse` — is the one axis left genuinely free, and it is a transport concern with no bearing on what an Element is.

**D2 — The four missing state readings get built.** Room contents, exits, inventory, and the location description each gain a state reading, and each derives both of its readings from one function, which is ADR-349 D3 generalized past the one Element it was written for. This is what makes ADR-352's interoperability claim real rather than aspirational: a client can render a room it has arrived in without the engine volunteering a print, and without sending LOOK to provoke one.

Three of the four are projections over state the world model already holds — contents is a visibility query, exits is `RoomBehavior`'s exit table plus door state, inventory is the player's contents. The description is not: its current value is *computed*, through the phrase pipeline, with ADR-209 snippet splicing, ADR-240 detail clauses and ADR-195 slot contributions, all reading the live world. How it knows it changed without recomputing every turn is Q-2 below, and it is the one genuinely unsolved piece of this decision.

**D3 — A preference command is a viewer's choice about whether an Element's occurrence reading is rendered, and therefore belongs to the client.** VERBOSE, BRIEF, SUPERBRIEF and NOTIFY move out of the engine.

The pattern was already in the repository, under its own heading. `packages/stdlib/src/actions/meta-registry.ts:42-47` groups exactly these four as "Preference commands", and the registry's own header says meta-commands "don't increment turns, trigger NPCs, or get recorded in history" (`:5`) — so there is no turn accounting to preserve and never was. VERBOSE/BRIEF asks whether the description's occurrence is shown; NOTIFY asks whether the score's is. Same question, two Elements. SUPERBRIEF is the degenerate case — never show it — and it is the one that proves the pattern, because nothing about it involves the world at all.

Under D1 a client holding a state reading can answer all four itself. Under ADR-352 D2, deciding how something is presented is what a client is for.

**What is being finished, not replaced.** The feature is declared, categorized correctly, and unimplemented. `game-meta` carries a `verboseMode: boolean` (`packages/stdlib/src/capabilities/game-meta.ts:30,46`); `looking-data.ts` hardcodes `const verboseMode = true;` twice, each under `// TODO: Wire verbose mode from game-meta state when brief/verbose commands are implemented` (`:100-101`, `:347-348`); and `room_description_brief` — `"{name}"` — sits in `packages/lang-en-us/src/actions/looking.ts:24` with no reachable path to it. D2 supplies what those TODOs were waiting for.

**D4 — A value is safe to auto-pin exactly where its realization made no state-dependent choice, and provenance is tracked per run so the stable segments are pinned and the chosen ones are skipped.**

Reached by sweeping auto-assertion scenarios rather than by argument (2026-09-15). Safe: a plain room's name and description, `"Taken."`, a parser error, `info.title`, the prologue — fixed text that came out the same way regardless, whose only failure mode is an edit to that text, which is the test working. Unsafe: a `while`-armed `room name`, a description with a spliced ADR-209 snippet, a description carrying ADR-240 state-derived detail clauses, a description whose `{slot:here}` occupant channel named a present NPC, a description holding an ADR-196 `Choice`. Every unsafe case is a value *selected from alternatives* at render time by consulting the world.

**Four of the five unsafe cases predate ADR-349.** A snippet-bearing description, a room with detail clauses, a room with an NPC standing in it, and a description holding a `Choice` are auto-pinned today and break for reasons unrelated to the command under test. D14 saw the pattern in the one place ADR-349 made newly visible and wrote a rule for headings; the rule generalizes, and these four close as a consequence rather than as separate fixes.

**Per run, not per value, and that is what makes the rule usable.** An all-or-nothing refusal degrades exactly where testing matters most: a room description carries an occupant clause whenever an NPC is standing there, so in a character-driven story most turns would refuse. Provenance per run lets the synthesis pin what does not move:

```
"A tidy kitchen.  Bob is here."
 └─ stable ────┘  └─ chosen ─┘

pinned:  [OK: contains "A tidy kitchen."]
```

That is the assertion an experienced author writes by hand. And **ADR-349 D14 stops being a special rule**: a heading composed entirely of a winning `while` arm has no stable segment, so nothing is pinned. The refusal falls out of the general mechanism.

**Amended 2026-09-15 (session c35f3d): the wire carriage is a third `TextContent` variant.** D4 decides that provenance is tracked per run; it did not decide how a run's provenance reaches a consumer, and the IDE's recording path has no route to it other than the wire. `@sharpee/text-blocks` gains `IChosen { chosen: true; content }` alongside `string` and `IDecoration`, and a chosen run is wrapped in one. **Deliberately not a field on `IDecoration`**: a decoration is an author's CSS hook that a renderer styles, while this says only that the world chose this text, and every renderer passes through it transparently — one type with two reasons to change is what the separation avoids. Where a run is both chosen and decorated the decoration nests inside, because the decoration presents that text and the provenance is a statement about the whole span. Verified before landing: six of the eight `TextContent` consumers already recurse through `.content` and need no change, the two that discriminate on decoration-ness are updated to render straight through, and none indexes `content[0]`. Goldens record rendered text with `channels: (none)`, so none moves.

**Where the provenance comes from.** The assembler already accumulates exactly this shape — `Run` carries `deco`, `verbatim`, `sentenceInitial` and `capEligible`, and `realizeToRuns` propagates them outward through every combinator, so `Slot`, `Contents`, `Choice` and `Optional` marking a run and `Sequence` / `PhraseList` unioning upward is the path that already exists. The pre-realize choosers are the work: `LocationHeadingBehavior.resolve` picks an arm, `resolveSnippetDescription` consults gates, and `getStateClauses` reads state, all before a tree exists, so each must mark what it produced as the tree is built.

**D5 — An identity claim is the complement of a prose claim, not a substitute for it.** A state reading of a world fact carries what it is *about*, not only what it says — `HeadingPart.ownerId` already does, as of ADR-349 Phase 4 — so auto-assertion can also claim "after GO NORTH the place is `r_kitchen`". That claim is immune to prose churn and to all five choosing mechanisms.

It does not replace D4's prose claim, because the two catch different failures: a prose claim catches the text regressing, an identity claim catches the world going wrong, and a story can render the wrong prose from a right world or right prose from a wrong one. A suite with only one of them passes while half the system is broken.

D5 is cheap and D4 is not: identity needs no new wire field, because `ownerId` is already there.

**D6 — Viewer preferences are one state Element, a record.**

The display mode is the first of them. VERBOSE / BRIEF / SUPERBRIEF is a value that exists between turns and is machinery rather than fiction, so by D1 it is a session fact carrying a state reading and no occurrence. The client decides how to render (D3); the mode it decides against is addressable state, not a variable living inside one client.

This is what makes D3 work rather than contradicting it. A preference held only in a client is lost on reload, invisible to a second surface, unassertable in a test, and absent from a save. Held as a state Element it persists, synchronizes across every surface, and can be claimed by a test like any other session fact.

It also answers Q-3 as it was posed. A typed VERBOSE does not need the client to intercept it before the engine: `verbose`, `brief` and `superbrief` are already registered meta verbs (`packages/stdlib/src/actions/meta-registry.ts:44-46`), so the command sets the Element and the client reads the new value. The existing meta-verb layer keeps working unchanged.

The display mode's own value is an enum of three, not a boolean. `game-meta` today carries `verboseMode: boolean` (`packages/stdlib/src/capabilities/game-meta.ts:30,46`), which cannot express SUPERBRIEF.

**One Element, not one per preference.** The known preferences are the display mode and score notification; ADR-352 D3's open vocabulary means an author may add more. They share a single record rather than each becoming its own Element, because a preference is not a fact about the *work* — it is a fact about how this viewer wants the work shown, and that is one thing with several fields. A client reads the record once and honours what it understands; an author's own preference is a field in it, so adding one does not add an Element to the vocabulary every client must learn (ADR-352 D4 would otherwise make each new preference invisible to every client that did not ship support for it).

**D7 — The description's state reading detects change by evaluating its registered predicates, never by realizing its tree.**

The obvious approach — recompute and compare — is not merely expensive, it is wrong. `Choice` advancing its `textState` counter is the assembler's one declared realize-time mutation (`packages/lang-en-us/src/assembler/english-assembler.ts:18-20`, ADR-196 §3). A detector that realized the description each turn to see whether it moved would advance every `Choice` in it on turns nobody looked, burning a story's cycling variants invisibly. The detector would change the output it exists to watch.

So change detection runs one layer below realization. The causes split in two, and the split is mechanical:

- **Structural** — the player moved to a different room, the room became visited, an entity entered or left. The world model already knows; detection is free.
- **Predicate** — a snippet's presence gate flipped (ADR-209), or a state-derived detail clause changed its mind (ADR-240). Each is registered and addressable: gates by `(roomId, marker)` in the snippet-gate registry, clauses per entity. Evaluating them is a set of booleans, and because the tree is never walked there is no `Choice` to advance.

Realize only when a predicate's answer differs from the previous turn's, or a structural fact moved.

**The predicate causes are exactly D4's chosen segments**, arrived at from the opposite direction: the parts expensive to detect and the parts that must never be auto-pinned are the same set. Both follow from "this part of the text was selected by consulting the world", which is the same fact serving two purposes.

**Three obligations this creates**, stated here so they are contracts rather than discoveries:

1. **A gate must be pure.** It is story code, and it will now run every turn rather than only on a render. Evaluating it must not mutate. This wants a test, not a warning.
2. **`getStateClauses` must separate asking from computing.** If reading a room's detail clauses *is* the computation, the cheap check is the render minus the assembler and D7's economy is lost. This needs verifying against `packages/world-model` before D7 is implemented.
3. **The cache's lifecycle is the registry's.** The previous turn's predicate answers are held per session, keyed as the predicates are — `(roomId, marker)` for a snippet gate, the entity id for a detail clause — cleared when those registrations are cleared (a story switch inside one process), and never serialized. An undo does not clear it: D8 replays world facts, and a stale answer costs one wasted realization rather than a wrong one.
4. **Over-reporting is acceptable; under-reporting is not.** A predicate that flips and flips back between turns registers as a change and costs one wasted realization. A predicate the detector cannot see does not exist, because the detector runs the predicate itself.

**D8 — Undo re-runs the turn rather than restoring a snapshot of it.**

Today it is a snapshot: `packages/engine/src/turn/undo-snapshot.ts` calls `createUndoSnapshot(world, turn)` before every undoable turn, and undo restores that world. Under D8, undo replays to the target turn instead.

**ADR-293 is what makes this possible.** Runs are deterministic at a pinned seed — walkthrough chains are byte-identical run to run, verified three times on 2026-08-02 — so re-running to turn N-1 reproduces exactly the state and exactly the output that turn produced the first time. Without that determinism this decision would be unavailable.

**The argument is maintenance, not a present defect.** A snapshot is correct only while the serializer knows about everything that matters, and this ADR is in the business of adding state: five new state readings under D2, a preferences record under D6, a change-detection cache under D7. Each is one more thing a snapshot must remember to include, and the failure mode of forgetting is silent — an undo that looks like it worked. Replay has nothing to keep in sync, because it recomputes rather than remembers.

**Its cost is time.** Replaying from turn 0 on every undo is O(n). The standard mitigation applies — keep periodic snapshots and replay forward from the nearest — which is a performance shape rather than a change of decision, and it keeps snapshots as an optimization whose incompleteness cannot produce a wrong answer.

**Replay reconstructs world facts, not session facts.** A replay re-runs the commands in history, and meta commands are deliberately not in it — `packages/stdlib/src/actions/meta-registry.ts:5` says they "don't increment turns, trigger NPCs, or get recorded in history". So a naive replay would never re-apply a typed VERBOSE, and would silently revert the preferences record D6 adds. That would be wrong, and not on a technicality: a viewer preference is a property of the session rather than of the turn, and undoing a move is not a request to forget how the player wants the work shown. The prompt is the same kind of thing. **Undo restores the world to turn N-1 and leaves every session fact exactly as it is**, which AC-17 tests directly.

**For the packet shape, it removes undo as a special case.** State no longer moves backward independently of occurrences: a client truncates its occurrence log to the target turn and takes the replayed state, and the two are coherent by construction rather than by rule.

**What this deliberately does not decide.** If undo is replay, a *save* could be a command log rather than a world snapshot. That follows naturally and is not decided here. Save-format handling is interim by standing ruling and is not to be extended; whether it is replaced by a log is a question for whatever supersedes it, not a consequence to be taken quietly from this ADR.

**D9 — The turn packet is split into a state section and an occurrence section, keyed by Element id.**

```
{ kind: 'turn', turn_id: 'turn-7',
  state:    { 'location-name': { text: 'Top of Well', parts: [...] },
              score: { current: 10, max: 100 },
              preferences: { displayMode: 'verbose', scoreNotify: true } },
  occurred: { 'location-name': [ { content: ['Top of Well'] } ],
              'location-description': [ { content: ['The well head.'] } ],
              'action-result': [ { content: ['Taken.'] } ] },
  layout:   ['location-name', 'location-description', 'action-result'] }
```

A client holds `state` and appends `occurred`, structurally, with no per-channel lookup. An attach or restore packet is a full `state` and an empty `occurred`, which is expressible for the first time. D8's undo names both halves: truncate the log to the target turn, take the replayed state.

**One fact appears once.** `location` and `room-name` become the two readings of `location-name`; `score` and `score_notify` become the two readings of `score`; `story-ending` and `endgame` become the two readings of the ending. The three pairs stop existing, and ADR-349 D3a stops being a rule holding two things in step — there is one thing.

**Channels become routing, and the manifest declares Elements.** This is where ADR-352 D2 cashes out: Elements are the content of the packet, and a channel describes which surface receives which Element. ADR-349 D3a was already implying it when it ruled that two channels carrying one fact may never differ.

**Why keyed by Element id rather than channel id**, in the terms the argument was actually settled in: the turn packet is a Published Language, and a Published Language is expressed in the domain's terms. Channel ids are transport identifiers, so keying by them lets infrastructure name the domain's vocabulary for every consumer downstream. The three-names problem ADR-349's Context recorded — `location`, `room-name`, `locationName` — is the ordinary consequence of a concept with no single name.

**Supersession ownership.** D9 supersedes ADR-163 §4 and §5 in one respect only: `mode` stops being the key a client dispatches on, because the packet's sections say it structurally. The rest of ADR-163 stands — the closure-per-channel model, capability gating, the manifest's existence. **David flips ADR-163's Status to SUPERSEDED IN PART, triggered by the first commit that lands D9's packet shape**, and not before: until then ADR-163 describes the wire accurately, and an early flip would make its Status the very thing this repository's standing caution warns about.

**No compatibility form is kept.** The corpus that moves — golden recordings, transcript `channel` assertions, the IDE's capture list, branch-tester's channel claims — maps mechanically: `room-name` to `location-name`'s occurrence, `location` to its state. Nothing has shipped to a player, so there is no consumer to strand and no adapter to write.

**D10 — A story declares presentation by name, and a client may honour it. The name is never an instruction.**

The declarative authorial system already exists for appearance, and D10 extends its discipline to behaviour rather than inventing a second one. ADR-174's decoration model carries `{ className, content }` and nothing else — no inline styles, no semantic HTML. Platform vocabulary resolves to `sharpee-`-prefixed classes and author names pass through verbatim (`packages/engine/src/prose-pipeline/decorations/resolver.ts:30-35`); ADR-183 lets a parameterized decoration carry a value as a `data-value` attribute for CSS to read.

**The wire carries names, the stylesheet carries appearance, and the author owns the stylesheet.** An author who wants red text writes a class and a CSS rule; the engine never transmits a colour. That is what lets a client with no colour, or a screen reader, degrade gracefully rather than break — and the author's control is complete, because they wrote the stylesheet.

D10 says a story may declare behavioural intent the same way: a name on an Element, honoured by a client that understands it and ignored by one that does not — **and reported as a console warning when it is ignored**, per ADR-352 D4. A declaration that changes nothing and says nothing is indistinguishable from a typo. A story that wants a full description reprinted on every re-entry, or suppressed in a maze, says so as a preference. The client decides.

**Never an instruction**, because the alternative retires ADR-352's interoperability claim. A name a client *must* honour is a name that breaks every client which cannot, which is the same failure ADR-352 D4 avoids by having an unknown Element ignored rather than rendered generically. `preferred-layout` already carries this wording — the engine states a reading order and calls it a preference (ADR-300 D9) — and ADR-349 D6 already made the ruling once for heading parts: no component vocabulary, no platform-contributed part names, authors use decorations.

**A story that needs the effect guaranteed writes it into the prose**, where it is content rather than presentation, and no client can decline it.

## What D1 exposes

Three findings from the sweep, all verified against `packages/stdlib/src/channels/standard.ts`.

**Sharpee has no state reading for most of its world facts.** The location description and the room contents are occurrence-only. The exits and the inventory are worse than that: neither is emitted as an Element at all, in either reading — there is no exits block key and no exits channel anywhere in the prose pipeline, and no inventory channel in the standard set (both verified 2026-09-15). An earlier revision described exits as "a room-block line under ADR-289 D6", inheriting a misreading from ADR-349; ADR-289 D6 gates exits to rooms at compile time and says nothing about a block. A client cannot ask what this room looks like right now; it can only catch the print when the engine decides to emit one. That is the identical gap ADR-349 closed for the location name, and D1 says it is systematic rather than three separate oversights. It is also why LOOK exists as a refresh command.

**Two of the three existing reading-pairs are two derivations of one fact.** The location name derives both readings from `LocationHeadingBehavior.resolve` as of ADR-349 Phase 4. `score` reads the ADR-129 ledger while `score_notify` reads an `if.event.score_changed` event; `story-ending` reads the world while `endgame` reads a game-won/lost event. The second and third are free to disagree — the ADR-349 D3 defect, at the Element layer.

**D1 appeared to settle ADR-349 D14 and did not — recorded because the wrong answer is instructive.** The reasoning was: an occurrence is a fact about a turn, so it is always safe to pin; a state reading may vary; therefore the refusal rides the reading and needs no flag. It fails on the case that raised it. After ADR-349 Phase 4 the location name's occurrence reading carries the *composed heading*, so pinning the occurrence pins the winning `while` arm exactly as thoroughly as pinning the state would. The danger is not in the reading. D4 is where it actually lives.

## Acceptance Criteria

None are discharged — nothing is implemented.

1. **AC-1 (D1/D2, one derivation).** For each of location name, location description, room contents, exits and inventory, the state reading and the occurrence reading are produced by a single function, and no surface computes either any other way. **STRUCTURAL**, in the shape of ADR-349 AC-3.

2. **AC-2 (D2, the naive client).** A client rendering a room the player has just entered shows its name, description, contents and exits from state readings alone, with no LOOK issued and no room-description occurrence emitted that turn. **SELF-VERIFYING** — it fails for any Element still occurrence-only.

3. **AC-3 (D3, preference commands).** VERBOSE, BRIEF and SUPERBRIEF change what the client renders with no turn consumed, no engine round trip, and no change to any state reading's value. **SELF-VERIFYING.**

4. **AC-4 (D3, NOTIFY).** NOTIFY ON/OFF suppresses and restores the score's occurrence reading in the client while the score's state reading is unaffected. **MECHANICAL** — the second instance that shows D3 is a pattern rather than a special case for the description.

5. **AC-5 (D2, the stubs close).** `grep -rn "verboseMode = true" packages` returns nothing, and `room_description_brief` is reachable. **MECHANICAL.**

6. **AC-6 (no regression).** Every existing transcript and walkthrough passes unchanged: the default client behavior is today's always-verbose, so no story's output moves. **MECHANICAL.**

7. **AC-7 (D2/D7, the description's cost).** A turn that changes nothing the description reads does not realize it: the phrase pipeline is not entered, and a `Choice` in that description does not advance. **SELF-VERIFYING, and the `Choice` half is the load-bearing clause** — a recompute-and-compare implementation passes the first and fails the second, silently, which is the failure D7 exists to prevent.

8. **AC-8 (D4, the stable segment).** A room description reading "A tidy kitchen." with an occupant clause appended auto-pins `contains "A tidy kitchen."` and does not pin the occupant clause; the same room with no NPC present pins the same claim. **SELF-VERIFYING** — an all-or-nothing implementation pins nothing in the first case and fails.

9. **AC-9 (D4, the four that predate this).** A snippet-bearing description, a description with state-derived detail clauses, a description with an occupant clause, and a description holding a `Choice` each auto-pin only their stable segments. **MECHANICAL, and it is a regression test for four defects that exist today** — each currently pins a value that breaks for a reason unrelated to its command.

10. **AC-10 (D4, ADR-349 AC-11 discharged).** A room whose `room name` carries a `while` arm is not auto-pinned, and a room whose `room name` is unconditional is pinned exactly as today — with no rule naming headings anywhere in the implementation. **SELF-VERIFYING, probed both directions**, and the "no rule naming headings" half is what proves D4 generalized rather than relocated ADR-349 D14.

11. **AC-11 (D5, identity beside prose).** A movement command auto-pins both the prose claim and an identity claim naming the place entity; editing the room's prose fails the first and not the second, and moving the exit fails the second and not the first. **SELF-VERIFYING** — it fails for any implementation that treats the two as alternatives.

12. **AC-12 (D6, the preferences record).** Setting the display mode through the VERBOSE meta verb changes the preferences Element's state reading with no turn consumed; the value survives a save and restore; and a second surface attached to the same session reads the same value. An author-declared preference is a field in the same record and requires no new Element. **SELF-VERIFYING** — a preference held only in a client fails the second and third clauses.

13. **AC-13 (D8, undo re-runs).** Undoing turn N and re-issuing the same command produces output byte-identical to the original turn N, and every **world fact** reading matches its value at turn N-1, including the readings D2 adds. **SELF-VERIFYING** — a snapshot implementation that omits any of them passes on the readings it remembered and fails on the rest, which is the silent failure D8 exists to remove.

14. **AC-14 (D9, one fact appears once).** No Element is reachable under two ids in a turn packet, and `location-name`, `score` and the ending each appear as a single key with up to two readings. **STRUCTURAL** — it fails the moment a second id for one fact reappears, which is the defect the three pairs were.

15. **AC-15 (D9, attach).** A client attaching mid-session receives a packet whose `state` is complete and whose `occurred` is empty, and renders the current room from it alone. **SELF-VERIFYING** — indistinguishable from a normal turn under the flat shape, which is why it could not be tested before.

16. **AC-16 (D10, declared and ignorable).** A story declaring a presentation name on an Element has it delivered on the wire unchanged; a client that understands the name honours it; a client that does not renders exactly as though the name were absent, with no failure and no generic fallback, **and reports the unrecognized name as a console warning**. **SELF-VERIFYING** — an implementation that treats the name as an instruction fails the third clause, and one that drops it silently fails the fourth.

17. **AC-17 (D6/D8, a preference survives an undo).** Setting the display mode to BRIEF at turn N and then undoing leaves the display mode BRIEF, and leaves the prompt unchanged. **SELF-VERIFYING, and it is the seam test** — a replay that reconstructs session facts alongside world facts reverts the preference and fails, which is the defect this criterion exists to catch.

## What would falsify this

The framing falsifies if the four axes turn out not to be separable in practice — if every real combination that matters is already one of the three `mode` values, and splitting them produces a type nobody can use.

## Session

Session c35f3d, 2026-09-15, on `main`. Written as the question; ADR-352 Q-1 points here, and ADR-349 Phase 5 is blocked behind both.
