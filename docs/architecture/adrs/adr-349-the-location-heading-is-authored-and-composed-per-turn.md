# ADR-349: The location heading is authored and composed per turn

**Status**: **ACCEPTED** (2026-09-14, session 483831, at David's "accept 349" — his flip, made with the Open Questions section empty as rule 11a requires. Written 2026-09-14, session 4ca16b, on `main`, at David's "two ADRs — one for the room name". Raised by his report of a gap in Chord — "a maze puzzle where all the room names are identical" — which the session traced through four successively better framings, each retired by a case he supplied: the maze, the Kitchen at night and in daylight, the Dungeo barrel, and finally the well-room bucket, which is the one the decision is shaped around. **Implementation in progress** (updated 2026-09-15, session c35f3d). Phases 1-4 of `docs/work/adr-349-location-heading/plan.md` have landed on `main`: the projection and its registry in `world-model`, the `room name` construct in Chord, the story-loader registration seam, and the one-shot wire cutover. **Discharged**: AC-2, AC-3, AC-4, AC-6, AC-7, AC-8, AC-9, AC-10, AC-12, AC-13, AC-14. **Not discharged**: AC-1 and AC-5 (Phase 6, the maze fixture and the regression sweep) and **AC-11, which moved** — see its entry below.

**`adr-review` ran at 3/13 BLOCKED** (2026-09-14, same session, at David's "let's run 349"), ten findings. The blocker was the one the checklist's newest item exists to catch, and it hit the first document reviewed after that item was added: **D3's "single function" had no home**, because engine depends on stdlib and not the reverse, so a projection in `packages/engine` is unreachable from the `location` channel producer in `packages/stdlib` — and every viable host package was absent from the Scope line, which made AC-2, AC-3, AC-4 and AC-7 undischargeable as written.

Six findings folded the same session: D11 names `packages/world-model` as the home and pins `resolve`'s signature; the Scope line gains `world-model`, `if-domain` and `channel-service` (whose `renderStatusLine` is a second status-rendering path the ADR had not named); D12 states the one-shot cutover the wire change implies; AC-8 adds the transition cases — entering, leaving, and riding a vehicle between rooms, the bucket's actual motivating moment, which AC-4 and AC-7 straddled without covering; AC-9 adds the all-arms-fail negative.

The rest are **not folded because they need David's rulings**, and are recorded as Q-2 and Q-6: the `location` payload's exact shape, which is the update contract and blocks implementation outright; and **who owns the separator between the place's text and the enclosure's**, which the review found as the language-layer-separation failure and which an earlier turn of the design had answered and then dropped. Folding left the decision unchanged and added no criterion that is not dischargeable within the amended scope.

**Amended the same session — D3a, from FyreVM's precedent.** The review's Q-4 asked whether the two surfaces might ever differ. David answered it as the designer of the system Sharpee's channel model comes from: in FyreVM, `locationName` was **singular**, serving the status line and the inline printout alike. That is now D3a, and it reframed the Context: the fact is resolved **twice** in Sharpee, once through `getDescribableLocation` for the block and once through `getContainingRoom` for the status channel, which is the shape ADR-347 recorded for the story's ending and is what GH #468 fell through.

**Two more rulings the same session, and a correction to how the first was asked.** **Q-4 — collapse**, "as FyreVM had it". The ADR then asked *which channel* survives, and David corrected the question: *"channels and text blocks are different things."* He is right, and the ADR had conflated them — `room-name` is the transport that routes the `room.name` block to the scrollback, not a rival derivation of the location. So what collapses is the **derivation and the name**, not the channel count: both surfaces call D11's `resolve`, two channels stay because a scrollback entry and a status value are different surfaces, and the "cadence conflict" a prior revision recorded under Q-4 was an artifact of the bad framing rather than a real constraint. Q-4 and the Context are rewritten accordingly.

**Q-1 — a region may contribute**, "at the author's design", which is now D4 and D4b: a region contributes a *part*, never a template and never by default, and because regions nest this lifts the two-contribution cap the ADR had claimed.

**All six open questions are resolved** (2026-09-14, same session). Q-6 turned out not to be a new decision at all: `packages/lang-en-us/src/assembler/english-assembler.ts:4-7` already declares the English Assembler "the SOLE authority for every cross-cutting correctness concern — article, agreement, **punctuation, whitespace**, reference, and case", so joining the heading's parts was always the assembler's, and the three candidates the question weighed were each about to take it from the component the platform names as its owner. David ruled the parts join as a **Sequence**, not a list. Q-5 he ruled as **refusal**: a heading that can vary is never auto-pinned, the author writes that assertion by hand, and the test is static because a `while` arm is an IR property known before a turn runs. Q-2 then fell out of Q-4 and Q-6 together rather than needing a ruling of its own.

Two criteria were added for the new rulings (AC-10, AC-11), and the Scope line gained `packages/lang-en-us/src/assembler/` and `packages/branch-tester/src/auto-assertion.ts`. The Open Questions section is now empty, which under rule 11a is what made the ACCEPTED status above possible.)

**Amended the same session — D15, D16, D16a.** The review's two surviving failures were the Chord IR shape and the boundary contracts, both of which had waited on Q-1. With regions ruled in, they are written: the arms reuse the numbered-key convention `detail` already uses, the loader hands `world-model` closures rather than `IRCondition`s in the shape the snippet and slot gates already use, and `resolve` walks contributors through region membership `WorldModel` already models. Writing them exposed one defect in the decision as it stood: **D7's entity-name fallback was too wide** — a maze whose text lives on its region would have rendered "maze-1, Maze of twisty little passages, all alike", because a silent room contributed its own name. D16a narrows the fallback to "no contributor produced a part at all", and AC-13 is the test that fails without it.

**Amended 2026-09-14 after a second `adr-review`** (session 483831, at David's "run 349"), which scored **11/14 BLOCKED** against the accepted text. Three folds, none of them a change of decision. **D11's `HeadingPart.role` gains `'region'`** — Q-1's ruling made a region a contributor and D11, written before it, never moved. **D16's contract 2 moves the arm predicates off a carrier trait into an entity-keyed registry**, because a trait is serialized and a closure is not: the accepted shape would have come back from a save with every arm unconditional, and AC-14 is now the test for it. **AC-3 is restated as a structural unit test**, after David's objection that its "walkthrough" wording pointed at `transcript-tester` — Sharpee's own hand-authored suite — for a Chord construct; the harness split it turned on is now recorded in `docs/core-concepts/README.md`.

**Scope**: `packages/world-model` (**the projection's home** — D11; `VisibilityBehavior.getDescribableLocation` is already there), `packages/chord` (the `room name` construct — grammar, analyzer, IR), `packages/story-loader` (the registration seam), `packages/engine/src/prose-pipeline/handlers/room.ts` (the heading block), `packages/stdlib/src/channels/standard.ts` and `src/channels/world-helpers.ts` (the `location` channel), `packages/if-domain/src/channels/types.ts` (the channel payload type), `packages/channel-service/src/render-to-string.ts` (`renderStatusLine`, the second status-rendering path), `packages/platform-browser/src/channels/status.ts` (the status renderer), `packages/lang-en-us/src/assembler/` (the English Assembler joins the parts — Q-6), `packages/branch-tester/src/auto-assertion.ts` (the auto-assertion refusal — Q-5), and `packages/stdlib/src/actions/standard/looking/looking-data.ts` (`inVehicle`, which D8 supersedes).

## Date: 2026-09-14

## Parent

**Supersedes nothing.** **Revisits** ADR-107 (`IdentityTrait.nameId`, the localized-name seam) — not to overturn it, but because it settled how a name is *localized* without asking whether the heading is a name at all. **Depends on** ADR-174 (bracket decorations, the span-and-class wire shape), ADR-163 (channels as the universal UI surface), and ADR-165 (a renderer per channel). **Related**: ADR-090 (capability dispatch, the pattern the Dungeo basket uses), ADR-289 D6 (exits are gated to rooms at compile time), ADR-255 (the author's message-override surface, which this decision deliberately does not extend).

## Context — verified, not assumed

### The heading is a string, and the description beside it is not

The room description renders through the phrase pipeline, against a core template with contribution slots:

```ts
// packages/lang-en-us/src/language-provider.ts:106
'if.room.description_body': '{verbatim:description}{slot:detail}{slot:here}',
```

Three lines above it, the same file says what the name is instead:

> The room name is a separate structural block emitted by the room handler.

And it is:

```ts
// packages/engine/src/prose-pipeline/handlers/room.ts:97-101
const resolvedName = extractValue(name);
blocks.push(createBlock(BLOCK_KEYS.ROOM_NAME, `[room:${resolvedName}]`));
```

The asymmetry is the gap. Everything the platform has for conditional, per-turn, multi-owner prose — ADR-212 slot entries, ADR-192/195 phrase realization, ADR-209 snippets — reaches the description and stops at the heading.

### Identity and display are the same string in Chord

`collectEntity` derives the entity id from the name and registers the lowercased name as the uniqueness key:

```ts
// packages/chord/src/analyzer.ts:3883, 3902
const id = nameWords.join('-').toLowerCase();
if (!this.registerUnique('entity', nameWords.join(' ').toLowerCase(), decl.name.span, 'analysis.duplicate-entity')) {
```

So `create the maze` twice is an error, and a Zork maze — twelve rooms that all read "Maze of twisty little passages, all alike" — cannot be written.

**This is not the constraint it appears to be**, and three turns of this session's design were spent on a split that turns out to be unnecessary. Once the heading is authored separately from the entity name, `maze-1` … `maze-12` are distinct entity names, the gate never fires, and the heading is identical for all twelve. No change to the gate, no separate display-name field, no change to the IR's existing `id`/`name` pair (`packages/chord/src/ir.ts:243-246`).

### Conditional prose keyed to a message id does not stay conditional

The route that looks obvious — point the heading at a Chord phrase through ADR-107's `nameId` — cannot carry a condition. Every phrase registers flat:

```ts
// packages/story-loader/src/loader.ts:994-997
for (const [key, phrase] of Object.entries(table)) {
  registry.addMessage(key, templateFor(phrase));
}
```

`templateFor` (`:2647-2649`) reads only `verbatim`, `strategy` and `variants`; `phrase.condition` is dropped, and a multi-variant phrase registers the literal placeholder `{variants}`, which the heading path never expands (`getMessage(nameId, {})` then `extractValue`, `assemble.ts:110-121`). Conditional prose in Chord today is delivered by purpose-built seams — `registerPresentEntries` (`loader.ts:1281-1310`), snippet gates (`:2361-2368`), detail providers (`:2446-2466`) — one at a time, never by a general rule.

### Author-named parts already work, so no component vocabulary is needed

Every string that becomes a block is bracket-parsed:

```ts
// packages/engine/src/prose-pipeline/assemble.ts:53-57
export function createBlock(key: string, text: string, opts?: CreateBlockOptions): ITextBlock {
  const content: TextContent[] = parseDecorations(text);
```

and author names pass through verbatim:

```ts
// packages/engine/src/prose-pipeline/decorations/resolver.ts:30-35
if (PLATFORM_VOCABULARY.has(rawName)) return `sharpee-${rawName}`;
return rawName;
```

So an author writing `[wet:filled with water]` in ordinary Chord prose already produces `{ className: 'wet', content: ['filled with water'] }` on the wire, and the story's CSS owns it. An earlier draft of this decision introduced platform-named components (`enclosure`, `state`) and a story-level template listing them; David rejected the platform naming outright — "we can't assume 'enclosure' or 'state' are relative to what the Author has in mind" — and the bracket parser makes the apparatus unnecessary anyway.

### The platform already computes the enclosure and throws it away

`VisibilityBehavior.getDescribableLocation` (`packages/world-model/src/world/VisibilityBehavior.ts:548-600`) returns `{ location, immediateContainer }` and branches four ways: a room short-circuits first (`:562-565`); a **transparent** vehicle returns the room plus itself as `immediateContainer` (`:569-579`); an **open** container does the same (`:581-593`); anything else returns itself as the location.

The builder records the result faithfully:

```ts
// packages/stdlib/src/actions/standard/looking/looking-data.ts:67, 148, 327
inVehicle: immediateContainer?.name || null,
```

`inVehicle` has **three writes and zero reads** — measured across `packages/*/src/` and against every `lang-en-us` template, 2026-09-14. The fact is computed on every look and dropped.

### The well-room bucket is the case the decision is shaped around

```ts
// stories/dungeo/src/regions/well-room.ts:287-300
bucket.add(new EnterableTrait());
bucket.add(new OpenableTrait({ isOpen: true }));
bucket.add(new VehicleTrait({ vehicleType: 'counterweight',
  positionRooms: { 'top': topOfWellId, 'bottom': wellBottomId }, ... }));
bucket.add(new BucketTrait({ hasWater: false }));
```

`transparent` is not passed and defaults to `true`, with the trait's own doc comment naming this object:

```ts
// packages/world-model/src/traits/vehicle/vehicleTrait.ts:81-94
// - Bucket, raft, boat: transparent (can see the room you're in)
this.transparent = options.transparent ?? true;
```

So riding the bucket, `getDescribableLocation` already returns `{ location: Top of Well, immediateContainer: bucket }`. Today the heading reads "Top of Well", in the prose and in the status line both, with no mention of the bucket the player is sitting in — and `BucketTrait({ hasWater })` is the state that ought to qualify it.

The bucket is decisive in two directions. It **rules out making the enclosure a room**: a transparent vehicle exists to relocate the player while they stay inside it and see out, which is the opposite of a room. And it **rules out the room owning the enclosure's text**: the bucket travels between Top of Well and Well Bottom, so both rooms — and any third it ever reached — would have to describe it.

The coal-mine basket (`stories/dungeo/src/regions/coal-mine.ts:465-494`) is a second shape: a fixed `SceneryTrait` container the player climbs into, which lowering *ejects* them from (`traits/basket-elevator-behaviors.ts:41-56`).

### An opaque moving enclosure is a third shape, and it is the place

David's case: "a vehicle could be an enclosed tube underground." Opaque, and it travels. `getDescribableLocation` already answers it — the vehicle branch falls past the transparency check and returns the vehicle itself:

```ts
// packages/world-model/src/world/VisibilityBehavior.ts:576-578
// Opaque vehicle - describe the vehicle interior
return { location: immediateLocation, immediateContainer: null };
```

So an opaque vehicle occupies the *place* slot, not the enclosure slot, and composes with nothing. The Dungeo barrel is the same shape — it carries the player down the Frigid River, so it moves, and it is opaque.

**This retires the idea that such an enclosure should be modelled as a room**, which an earlier turn of this session's design proposed. Rooms do not move. An opaque vehicle is the correct model for both the tube and the barrel, and it needs no nesting of rooms inside rooms.

### The heading and the status line already name different entities

The two surfaces resolve the player's location by different functions, and for an opaque vehicle they disagree:

- the heading uses `getDescribableLocation`, which stops at the opaque vehicle;
- the status line uses `getContainingRoom` (`packages/stdlib/src/channels/world-helpers.ts:63`), which walks past it to the first `ROOM` ancestor (`packages/world-model/src/world/WorldModel.ts:1217-1235`).

A player riding an opaque tube through a station therefore reads the tube's name in the prose and the station's in the status bar, today, in shipped code and independently of anything this ADR proposes. It is direct evidence for D3: two surfaces deriving the same fact by two routes do not stay equal, and the fix is one projection rather than a second route corrected to match. **Filed as GH #468**, with a reproduction run against the built world-model; it is a defect independent of this ADR, and AC-7 below is its regression test.

### The status line reads a different source from the heading

```ts
// packages/stdlib/src/channels/world-helpers.ts:58-68
const room = world.getContainingRoom?.(player.id);
const name = (room as { name?: string }).name;
```

`locationChannel` is `contentType: 'text'`, `mode: 'replace'`, `emit: 'always'` (`packages/stdlib/src/channels/standard.ts:263-275`), and `ChannelProduceContext` carries `world`, `events`, `blocks`, `turn`, `prevValue` — no language provider (`packages/if-domain/src/channels/types.ts:287-297`). So the heading and the status line derive from two different places by two different routes, and any change to one has to be mirrored by hand into the other.

Infocom's status line showed the composed location, which is the requirement David stated: "the status line has to show the same thing."

### The original design had one name for this, and Sharpee has three

Sharpee's channel model is FyreVM's, credited in ADR-163 as "Original FyreVM channel I/O design — David Cornelson, 2010-era fyrevm-server" (`:923-924`), and `text-blocks` says so at the point where it defines block keys: "Keys act as channels (FyreVM pattern)" (`packages/text-blocks/src/types.ts:81`).

**In FyreVM, `locationName` was singular** — one channel serving the status line and the inline printout alike (David, 2026-09-14, as its designer). Sharpee has three names for it:

```
packages/text-blocks/src/types.ts:181         ROOM_NAME: 'room.name'    // block key
packages/stdlib/src/channels/standard.ts:721  ROOM_NAME: 'room-name'    // prose channel id
packages/stdlib/src/channels/standard.ts:730  LOCATION:  'location'     // status channel id
```

Of those, `room.name` is a block key and `room-name` is the channel that transports that block — one fact, one route. The split that matters is the **third**: `locationChannel` (`:269-275`, status, `text`/`replace`/`always`) derives the location independently, through `getContainingRoom`, while the block derives it through `getDescribableLocation`. Two resolvers, one fact.

That is the shape ADR-347 recorded for the story's ending, where one fact had accumulated four namings and the consumers disagreed. Here it has three, and GH #468 is the disagreement it permitted. The divergence is not an implementation slip on top of a sound model; it is what a split concept produces eventually, and the original design did not have the split.

## Decision

**D1 — The location heading is an authored construct, not the entity's name.** A `room name` block on a `create` block supplies it. Its body is ordinary Chord prose; it takes optional `while` arms, matching the shipping `phrase <key> while <cond>:` idiom (`packages/chord/chord.ebnf:858-859`, used at `branch-stories/fernhill/fernhill.story:487-493`). Arms resolve first-match-wins with the unconditional arm last.

**D2 — The heading is a per-turn projection, never stored state.** Its arms are evaluated against the live world on every turn. It is not written into `IdentityTrait.name`, not serialized, and not present in a save. The entity's name remains what it is today and is unaffected.

**D3 — One projection, two consumers.** A single function computes the heading; the `room.name` block and the `location` status channel both call it. They cannot disagree, because there is no second code path to disagree with. The block is emitted when a room description is (sparsely, on look and movement); the channel emits every turn, so a heading that changes without a look — the bucket filling with water while the player sits in it — reaches the status line on the turn it changes.

**D3a — The two surfaces may never differ.** One projection means one value: the status line and the inline heading show the same thing, always, with no abbreviated variant and no per-surface override. This is not a new ruling but the restoration of an old one — FyreVM's `locationName` was singular by design, and Sharpee's three names for it are the drift, not the intent (David, 2026-09-14, as FyreVM's designer). A story that wants a narrower status bar solves it in presentation, where ADR-174's classes already allow a client to drop or shorten a part it has no room for, not by emitting different content to the two surfaces.

**D4 — The contributors are the place, at most one enclosure, and any region the author opts in.** `getDescribableLocation` decides the first two — its `location` is the place and its `immediateContainer` is the enclosure. The third is David's ruling on Q-1 (2026-09-14): *"location name can be modified by its region name at the author's design"* — a region may contribute to its members' headings, and only because the author says so, never by default. There is still no inheritance chain and no template precedence: a region **contributes a part**, it does not supply or override a member's `room name`.

**D4b — Regions lift the two-part cap, and the ADR no longer claims one.** An earlier revision capped the heading at two contributions because `getDescribableLocation` yields at most one enclosure. Regions nest (`parentRegionId`, `packages/chord/src/ir.ts:287-288`), so an opted-in chain can be longer, and the number of parts is bounded by the region depth rather than by a constant. What does **not** change is that every part has a named owner and an order derived from structure, so this is still not the ordered multi-owner slot machinery the decision avoids.

**D4a — "The place" is not always a room.** An opaque vehicle occupies the place slot and composes with nothing; a transparent one occupies the enclosure slot and composes with the room. The distinction is the vehicle's own transparency, not its kind, and neither case is modelled by making the enclosure a room. Both consumers in D3 resolve the place through `getDescribableLocation`; **neither may use `getContainingRoom`**, which walks past an opaque vehicle and is the source of the divergence recorded in the Context.

**D5 — The enclosure owns its own text.** A transparent vehicle or open container the player is inside supplies its own `room name` arms, gated by the platform fact that the player is inside it — not by a condition the author writes, and not by the surrounding room describing it. The bucket says "in the bucket"; Top of Well and Well Bottom say nothing about the bucket.

**D6 — No component vocabulary is introduced.** Arms are prose. An author who wants styled parts writes bracket decorations, which already resolve author names verbatim (`resolver.ts:30-35`). The platform contributes no part names — not `enclosure`, not `state`, not `title`.

**D7 — Absence falls back to the entity name.** A room with no `room name` block renders exactly as it does today. This decision adds a capability and changes no existing story's output.

**D8 — `inVehicle` is superseded.** The fact it carries is what gates D5; the field itself, being written three times and read nowhere, is removed rather than left beside the new path.

**D9 — This decision does not extend ADR-255.** No core template becomes author-overridable, no alias namespace grows past `if.action.*`, and `if.room.description_body` is untouched. An earlier draft required all of that; D6 removes the need.

**D10 — Rooms and enclosures both take the construct, and neither is gated on the other's traits.** ADR-289 D6 gates exits to rooms at compile time; this is deliberately not that shape, because the bucket is the motivating case and it is not a room. (Corrected 2026-09-15: earlier revisions described D6 as making exits "a room-block line", which is not what it says. The contrast the decision rests on is unaffected — D6 restricts a construct to rooms, and this one is legal on rooms and enclosures alike.)

**D11 — The projection lives in `packages/world-model`, beside `getDescribableLocation`.** D3's "single function" needs a home both consumers can reach, and the dependency graph leaves exactly one sensible answer. Measured 2026-09-14:

```
engine  deps: @sharpee/channel-service core event-processor plugins if-domain
              if-services lang-en-us parser-en-us stdlib text-blocks world-model
stdlib  deps: @sharpee/core if-domain if-services lang-en-us text-blocks world-model
```

**Engine depends on stdlib; stdlib does not depend on engine.** The heading block is built in `packages/engine/src/prose-pipeline/handlers/room.ts`; the `location` channel producer is in `packages/stdlib/src/channels/`. A function in `engine` is unreachable from the channel. `world-model` is the one shared home that already owns the inputs — `VisibilityBehavior.getDescribableLocation` lives there, and `looking-data.ts` already calls it across the boundary (`:34, 86, 178, 300`).

The contract:

```ts
// packages/world-model/src/world/LocationHeadingBehavior.ts
static resolve(observer: IFEntity, world: WorldModel): ReadonlyArray<HeadingPart>;

interface HeadingPart {
  /** The entity that supplied this text — the place, the enclosure, or a region. */
  readonly ownerId: string;
  /** The winning arm's resolved prose, pre-decoration. */
  readonly text: string;
  readonly role: 'place' | 'enclosure' | 'region';
  /** Amendment 2026-09-15 — see below. */
  readonly variable?: boolean;
}
```

**Amended 2026-09-15 (session c35f3d): `HeadingPart` gains `variable?: boolean`.** D11 pinned this contract by enumerating three fields, so adding a fourth amends it rather than extending it quietly. The field says the contributor declared at least one conditional arm — static, true whether or not that arm won, because a heading that *can* vary is what D14 must not pin. Its reader is `@sharpee/lang-en-us`, which wraps a variable part so the realized run carries ADR-353 D4's provenance to the wire; `HeadingPart` is the only channel from the projection to the locale. Because `HeadingPart` is also the `location` channel's payload, the field reaches clients too, where nothing reads it — a consequence of this ADR's one-type-two-uses design, recorded rather than left to be found later.

It returns *parts*, not a joined string, because who joins them is Q-6 and the projection must not pre-empt that answer. Both consumers call `resolve` and differ only in what they do with the parts. `world-model` holds no language provider, so an arm's text is resolved from IR-registered story prose rather than through `getMessage` — the registration seam in `story-loader` is where that lands.

**D12 — This is a one-shot cutover, with no compatibility path.** The `location` channel's payload changes shape and the old `string` form is not kept alongside it. No story is affected (D7), and the repository's stance is that back-compat shims are not written. A client that renders `location` moves in the same change or breaks loudly, which is the intended failure mode.

**D13 — The English Assembler joins the parts, as a `Sequence`.** D11's `resolve` returns parts and never a joined string; realizing them into text is the locale's job, and the assembler already holds it by written contract — "the SOLE authority for every cross-cutting correctness concern — article, agreement, **punctuation, whitespace**, reference, and case" (`packages/lang-en-us/src/assembler/english-assembler.ts:4-7`). Parts are positional and take no conjunction: "Top of Well, in the bucket", never "Top of Well and the bucket". A `PhraseList` would impose ADR-190's comma-and-and list semantics, which reads an enclosure as a second item in a list of places. This is locale-owned realization, not a template, so D9 stands untouched.

**D14 — A heading that can vary is never auto-pinned.** The `room-name-and-description` auto-assertion policy refuses to synthesize an assertion for a room whose `room name` carries a `while` arm, and the author writes it by hand. **The test is static**: a conditional arm is an IR property, known before a turn runs, so the refusal needs no heuristic and no repeated run. An unconditional `room name`, or a room with none, auto-pins exactly as today. Refusal rather than a warning, because an auto-pinned varying heading produces a test that passes for whichever state it was recorded in and later fails in a way that reads as a regression.

**D15 — The IR carries the arms under the existing numbered-key convention; no new IR structure.** Chord already stores multi-arm conditional entity phrases in the flat phrase table by numbering the arms, and `room name` uses that idiom unchanged:

```ts
// the shape already used for `detail` — packages/story-loader/src/loader.ts:2453-2456
for (let i = 1; ; i++) {
  const key = i === 1 ? `${irEntity.id}.detail` : `${irEntity.id}.detail.${i}`;
  const phrase = table[key];
  if (!phrase) break;
```

So the arms live at `<entityId>.room-name`, `<entityId>.room-name.2`, `<entityId>.room-name.3`, … — first unsuffixed, the rest numbered from 2 in declaration order, read until the first gap. Each is an ordinary `IRPhrase` carrying its optional `condition`. `IREntity` gains no field and `IRPhrases` gains no shape.

Analyzer gates: **at most one unconditional arm**, and if present it must be **last** (an unconditional arm before a conditional one makes the later arm dead, which is a compile error rather than a silent no-op); and a `room name` block is legal on a room, on an enterable enclosure, and on a region, which is every block kind D4 names as a contributor.

**D16 — The three boundary contracts.**

1. **chord → story-loader** is D15's key convention. Chord emits numbered phrase entries and nothing else; the dotted platform vocabulary stays out of the compiler exactly as ADR-255 Interface Contract 3 requires.

2. **story-loader → world-model** is a compile pass in the shape of the ones beside it. `compileLocationNames(world)` walks `ir.entities`, reads each entity's numbered keys, and for any entity with at least one arm **registers** them:

```ts
// packages/world-model/src/location-heading-registry.ts
interface LocationNameArm {
  /** Absent on the unconditional fallback arm. */
  readonly holds?: () => boolean;
  readonly text: string;
}
function registerLocationName(entityId: string, arms: ReadonlyArray<LocationNameArm>): void;
function lookupLocationName(entityId: string): ReadonlyArray<LocationNameArm> | undefined;
function clearLocationNames(): void;
```

   **The predicates are closures, not `IRCondition`s.** The loader closes over its own evaluator — `() => this.evaluator.evalCondition(condition, { world })` — exactly as the snippet gate (`loader.ts:2368`) and the slot-entry gate (`:1304`) already do, so `world-model` never learns what an `IRCondition` is and the dependency direction stays intact.

   **A registry keyed by entity id, not a carrier trait, and the reason is the save file.** `IFEntity.toJSON` spreads every trait (`if-entity.ts:433`) and `JSON.stringify` silently drops function-valued fields, while `trait-rehydrator.ts` restores prototypes for registered core types and cannot reconstruct a per-instance closure. Arms stored on a trait would therefore survive a round trip stripped of their conditions, leaving every arm unconditional and the first one winning permanently — a failure that reads as a story bug and is a serialization one. The registry is the shape the platform already uses for exactly this: `registerSnippetGate` keys live gates by `(roomId, marker)` under a written lifecycle contract — "nothing here is serialized — a gate is a live closure and never touches a save file" (`packages/stdlib/src/actions/standard/looking/snippet-gate-registry.ts:20-24`) — and `state-clauses.ts` is the same Map-based, idempotent-last-wins family already living in `world-model`. **The lifecycle is that contract**: the loader re-registers on every story load, a story switch clears first, an in-game RESTORE reuses the registrations already in place, and nothing is written to a save. AC-14 is the test.

3. **world-model → both consumers** is D11's `resolve`, which reads the trait off each contributor D4 names and needs no new lookup to do it: the place and the enclosure come from `getDescribableLocation`, and the region chain from `RoomTrait.regionId` → `RegionTrait.parentRegionId`, both of which `WorldModel` already models (`assignRoom`, `isInRegion`, `WorldModel.ts:487-488`).

**D16a — Part order, and a refinement D7 needs.** Parts are emitted **place, then enclosure, then regions innermost-to-outermost**.

And D7's fallback is narrower than it was written: **the entity-name fallback applies only when no contributor produced a part at all.** As first written — "a room with no `room name` falls back to its entity name" — a maze whose text lives on the region would render "maze-1, Maze of twisty little passages, all alike", because the room's silence became a part. A silent contributor contributes nothing; the entity name appears only when the whole heading would otherwise be empty. This is what makes the region form of the maze work, and it is the reason Q-1's ruling could not be folded without touching D7.

## Acceptance Criteria

None are discharged — nothing is implemented.

1. **AC-1 (D1, the maze).** Twelve rooms with distinct entity names and identical `room name` blocks compile with no `analysis.duplicate-entity` diagnostic, and all twelve render the same heading. **MECHANICAL** — a Chord fixture plus a transcript.

2. **AC-2 (D2, state-varying).** A room whose `room name` has a `while` arm renders one heading before the condition holds and the other after, with no look in between forcing it. **SELF-VERIFYING** — pinning the arms as literals fails it.

3. **AC-3 (D3/D3a, parity).** The room-block handler and the `location` channel producer each obtain their text from D11's `resolve` and from nowhere else — a unit test over the two call sites, which is where the property actually lives. **STRUCTURAL**, and it is what makes D3a enforceable rather than merely intended: it fails the moment a second derivation appears, rather than wherever a sampled turn happens to notice. The property is the one FyreVM got from having a single `locationName` and Sharpee lost by having three names. A runtime companion, if one is wanted, is a **branch-tester tree claim** comparing the two channels at a state where both emit — never a `.transcript`: walkthroughs are Sharpee's own hand-authored suite over Dungeo, which declares no `room name` and is not a design input for Chord work (the split is recorded in `docs/core-concepts/README.md`). The earlier wording asked for per-turn equality across a walkthrough, which is not expressible — every assertion form compares one source against a literal (`packages/transcript-tester/src/types.ts:238-244`) — and which D3's own sparsity makes ill-posed, since `location` emits every turn and `room-name` only when a room description is produced.

4. **AC-4 (D4/D5, the bucket).** With the player inside a transparent vehicle, the heading carries the room's text and the vehicle's, the vehicle's arms respond to its own state, and neither room mentions the vehicle in its own source. **REAL-PATH** (rule 13a) — driven through an assembled engine, not a stubbed composer. **Written in TypeScript, not Chord**: ADR-350 is research and not scheduled (David, 2026-09-14), so no Chord vehicle surface exists to write it against. The criterion tests the platform projection, which is what this ADR decides; a Chord fixture becomes possible only if ADR-350 is ever taken up.

5. **AC-5 (D7, no regression).** Every existing transcript and walkthrough passes unchanged, because no story declares a `room name` block. **MECHANICAL.**

6. **AC-6 (D8).** `grep -rn "inVehicle" packages` returns nothing. **MECHANICAL.**

7. **AC-7 (D4a, the opaque vehicle).** With the player inside an opaque vehicle that is itself inside a room, the heading and the status line both name the vehicle, and the vehicle's own `room name` arms respond to its state. **SELF-VERIFYING, and it fails on today's code** — `getContainingRoom` names the surrounding room, so this criterion is the one that catches a projection built on the wrong resolver. Written as a regression test first, since the divergence exists before this ADR does.

8. **AC-8 (D4/D5, the transitions).** Three moments, not three states: **entering** an enclosure adds its part on that turn; **leaving** it removes the part on that turn; and a **vehicle moving between rooms with the player aboard** changes the place part while the enclosure part survives unchanged. The third is the bucket's whole motivating case, and AC-4 and AC-7 pin only the states either side of it. **SELF-VERIFYING** — a projection cached per room rather than computed per turn passes AC-4 and fails this.

9. **AC-9 (D1/D7, every arm fails).** A `room name` block whose arms all carry conditions, none of which hold, falls back to the entity name exactly as an absent block does — it does not render empty, and it does not render the last arm. Paired with the positive case: an unconditional arm present alongside failing conditional ones wins. **NEGATIVE, MECHANICAL.**

10. **AC-10 (Q-6, joining).** A heading with a place part and an enclosure part renders with the assembler's punctuation and no conjunction — "Top of Well, in the bucket", not "Top of Well and the bucket" — and a heading with one part renders with no separator at all. **MECHANICAL**, and it fails if the parts are realized as a `PhraseList`.

11. **AC-11 (Q-5, auto-assertion refusal).** A room whose `room name` carries a `while` arm is not auto-pinned under `room-name-and-description`; a room whose `room name` is unconditional, and a room with none, are pinned exactly as today. **SELF-VERIFYING, and probed in both directions** — removing the refusal pins the varying heading, and over-applying it stops pinning the unconditional ones.

    **Discharged by ADR-353 AC-10, not here** (2026-09-15). Phase 5 could not build D14's refusal as a rule about headings: the IDE's recording path has no way to see the condition, and four *other* values — a spliced snippet, a state-derived detail clause, an occupant clause, a `Choice` — were already being auto-pinned with the same defect and predate this ADR. ADR-353 D4 replaces the heading-shaped rule with the general one (a value is pinnable where its realization made no state-dependent choice, tracked per run), and its AC-10 requires that **no rule naming headings appears in the implementation at all** — which is what proves D14 was generalized rather than relocated. D14 stands as written; what changed is where it is implemented.

12. **AC-12 (D15, the arms).** A `room name` block with three arms compiles to `<id>.room-name`, `<id>.room-name.2`, `<id>.room-name.3` in declaration order, and the first arm whose condition holds wins at runtime. Two negatives: a second unconditional arm is a compile error, and an unconditional arm followed by a conditional one is a compile error. **MECHANICAL.**

13. **AC-13 (D4/D16a, region contribution and the maze).** A region carrying a `room name` contributes a part to each member room's heading; a member with its own arm renders both parts in place-then-region order; and **a member with no arm of its own renders the region's part alone, not its entity name beside it.** The third is D16a's refinement and the reason the maze can be written once on the region. **SELF-VERIFYING** — the pre-refinement fallback renders "maze-1, Maze of twisty little passages, all alike" and fails.

14. **AC-14 (D2/D16, the round trip).** A room whose `room name` carries a `while` arm renders the arm-appropriate heading **after a save and restore**, not the first arm permanently. **NEGATIVE, SELF-VERIFYING** — it fails for any implementation that stores the arm predicates on a serialized trait, and it is the criterion the registry in D16 contract 2 exists to satisfy.

## Consequences

- **The entity name stops being what the player reads, and keeps being what everything else reads.** GO TO, the map editor, transcript assertions keyed on a room name, and the `--introspect` manifest all continue to see `maze-5`. For a maze that is arguably correct; it is stated here so it is a decision rather than a discovery.
- **The `location` channel's payload changes shape**, from `text` to structured content, and `createLocationChannelRenderer` (`packages/platform-browser/src/channels/status.ts:22-31`) changes with it. `renderTextContent` already exists for exactly this (`packages/platform-browser/src/channels/text-content.ts:26`), so the renderer change is small — but it is a shipped wire contract, and any non-browser client rendering `location` has to move with it.
- **A per-turn projection is a per-turn cost.** The arms of the current place and its enclosure are evaluated every turn. That is two condition evaluations in the common case, and the `replace`/`always` channel semantics absorb the no-change case, but it is work the turn loop does not do today.
- **`transparent` becomes load-bearing.** It defaults to `true` and nothing but `getDescribableLocation` reads it, so its value has never mattered much. Under D5 it decides whether a vehicle contributes to the heading at all.
- **The construct is a second place a location can get text**, beside its description. That is the point, but it means a story can now say the same thing twice, and nothing stops it.

## Open Questions

None. All six were resolved the same session the ADR was written — five by David's rulings (Q-1, Q-4, Q-5, Q-6, and Q-2 falling out of Q-4 and Q-6 together), and Q-3 by inspection:

**Q-3 — the no-lid container bug (GH #467) — does not block this ADR.** D4a and D5 are expressed in terms of what `getDescribableLocation` returns, not in terms of which traits an enclosure carries, so they are correct whether or not a lidless container is fixed to report itself as transparent. If #467 is fixed, such a container starts occupying the enclosure slot and contributes a part; if it is not, it occupies the place slot and supplies the whole heading. Either is well-defined here, so the two can ship in either order.

The remaining decisions are recorded as D1 through D16a above.

## What would falsify this

A location whose heading legitimately needs contributions from more than the place and one enclosure — nested vehicles, or an enclosure whose own enclosure should also speak. D4 would then be too narrow and the ordered-contribution machinery this decision avoids would be the right answer after all. Nothing in the three motivating cases needs it, and `getDescribableLocation` cannot currently produce it.

## Session

Session 4ca16b, 2026-09-14, on `main`. Written at David's instruction after an eight-turn design conversation in which he supplied every motivating case and retired four of my framings — the display-name split, the `nameId` route, the core-template-plus-slots route, and platform-named components. The well-room bucket, raised last, is what the decision is shaped around.
