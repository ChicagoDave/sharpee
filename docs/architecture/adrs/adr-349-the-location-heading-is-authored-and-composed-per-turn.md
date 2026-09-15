# ADR-349: The location heading is authored and composed per turn

**Status**: **DRAFT** (written 2026-09-14, session 4ca16b, on `main`, at David's "two ADRs — one for the room name". Raised by his report of a gap in Chord — "a maze puzzle where all the room names are identical" — which the session traced through four successively better framings, each retired by a case he supplied: the maze, the Kitchen at night and in daylight, the Dungeo barrel, and finally the well-room bucket, which is the one the decision is shaped around. **Nothing here is accepted and no implementation is authorized.** The Open Questions section is non-empty, so this document is DRAFT by rule 11a and must not be marked ACCEPTED while it stands.

**`adr-review` ran at 3/13 BLOCKED** (2026-09-14, same session, at David's "let's run 349"), ten findings. The blocker was the one the checklist's newest item exists to catch, and it hit the first document reviewed after that item was added: **D3's "single function" had no home**, because engine depends on stdlib and not the reverse, so a projection in `packages/engine` is unreachable from the `location` channel producer in `packages/stdlib` — and every viable host package was absent from the Scope line, which made AC-2, AC-3, AC-4 and AC-7 undischargeable as written.

Six findings folded the same session: D11 names `packages/world-model` as the home and pins `resolve`'s signature; the Scope line gains `world-model`, `if-domain` and `channel-service` (whose `renderStatusLine` is a second status-rendering path the ADR had not named); D12 states the one-shot cutover the wire change implies; AC-8 adds the transition cases — entering, leaving, and riding a vehicle between rooms, the bucket's actual motivating moment, which AC-4 and AC-7 straddled without covering; AC-9 adds the all-arms-fail negative.

The rest are **not folded because they need David's rulings**, and are recorded as Q-2 and Q-6: the `location` payload's exact shape, which is the update contract and blocks implementation outright; and **who owns the separator between the place's text and the enclosure's**, which the review found as the language-layer-separation failure and which an earlier turn of the design had answered and then dropped. Folding left the decision unchanged and added no criterion that is not dischargeable within the amended scope.

**Amended the same session — D3a, from FyreVM's precedent.** The review's Q-4 asked whether the two surfaces might ever differ. David answered it as the designer of the system Sharpee's channel model comes from: in FyreVM, `locationName` was **singular**, serving the status line and the inline printout alike. That is now D3a, and it reframed the Context — the fact has accumulated **three** names in Sharpee (`room.name`, `room-name`, `location`) across two channels with two resolvers, which is the same shape ADR-347 recorded for the story's ending and is what GH #468 fell through. Q-4 was replaced by the question D3a raises instead: whether the two channels should collapse back into one.

**Two more rulings the same session.** **Q-4 — collapse**, "as FyreVM had it": `roomNameChannel` and `locationChannel` become one prose-typed channel for one fact. The ruling stands; what it leaves is a cadence conflict recorded under Q-4, since the scrollback wants sparse-append and the status bar wants always-replace, and a LOOK in an unchanged room must reprint a heading whose value did not change. **Q-1 — a region may contribute**, "at the author's design", which is now D4 and D4b: a region contributes a *part*, never a template and never by default, and because regions nest this lifts the two-contribution cap the ADR had claimed.

**Q-6 remains the one open blocker**, and the explanation David asked for found that it is not a new decision: `packages/lang-en-us/src/assembler/english-assembler.ts:4-7` already declares the English Assembler "the SOLE authority for every cross-cutting correctness concern — article, agreement, **punctuation, whitespace**, reference, and case". Joining the parts is therefore the assembler's by a contract that predates this ADR, and the three candidates the question weighed were all about to take it from the component the platform names as its owner.)

**Scope**: `packages/world-model` (**the projection's home** — D11; `VisibilityBehavior.getDescribableLocation` is already there), `packages/chord` (the `room name` construct — grammar, analyzer, IR), `packages/story-loader` (the registration seam), `packages/engine/src/prose-pipeline/handlers/room.ts` (the heading block), `packages/stdlib/src/channels/standard.ts` and `src/channels/world-helpers.ts` (the `location` channel), `packages/if-domain/src/channels/types.ts` (the channel payload type), `packages/channel-service/src/render-to-string.ts` (`renderStatusLine`, the second status-rendering path), `packages/platform-browser/src/channels/status.ts` (the status renderer), and `packages/stdlib/src/actions/standard/looking/looking-data.ts` (`inVehicle`, which D8 supersedes).

## Date: 2026-09-14

## Parent

**Supersedes nothing.** **Revisits** ADR-107 (`IdentityTrait.nameId`, the localized-name seam) — not to overturn it, but because it settled how a name is *localized* without asking whether the heading is a name at all. **Depends on** ADR-174 (bracket decorations, the span-and-class wire shape), ADR-163 (channels as the universal UI surface), and ADR-165 (a renderer per channel). **Related**: ADR-090 (capability dispatch, the pattern the Dungeo basket uses), ADR-289 D6 (exits are a room-block line), ADR-255 (the author's message-override surface, which this decision deliberately does not extend).

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

and two channels — `roomNameChannel` (`:181`, prose, `json`/`append`/`sparse`) and `locationChannel` (`:269-275`, status, `text`/`replace`/`always`) — carrying the same fact by two routes from two different resolvers.

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

**D10 — Rooms and enclosures both take the construct, and neither is gated on the other's traits.** ADR-289 D6 makes exits a room-block line; this is deliberately not that shape, because the bucket is the motivating case and it is not a room.

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
  /** The entity that supplied this text — the place, or the enclosure. */
  readonly ownerId: string;
  /** The winning arm's resolved prose, pre-decoration. */
  readonly text: string;
  readonly role: 'place' | 'enclosure';
}
```

It returns *parts*, not a joined string, because who joins them is Q-6 and the projection must not pre-empt that answer. Both consumers call `resolve` and differ only in what they do with the parts. `world-model` holds no language provider, so an arm's text is resolved from IR-registered story prose rather than through `getMessage` — the registration seam in `story-loader` is where that lands.

**D12 — This is a one-shot cutover, with no compatibility path.** The `location` channel's payload changes shape and the old `string` form is not kept alongside it. No story is affected (D7), and the repository's stance is that back-compat shims are not written. A client that renders `location` moves in the same change or breaks loudly, which is the intended failure mode.

## Acceptance Criteria

None are discharged — nothing is implemented.

1. **AC-1 (D1, the maze).** Twelve rooms with distinct entity names and identical `room name` blocks compile with no `analysis.duplicate-entity` diagnostic, and all twelve render the same heading. **MECHANICAL** — a Chord fixture plus a transcript.

2. **AC-2 (D2, state-varying).** A room whose `room name` has a `while` arm renders one heading before the condition holds and the other after, with no look in between forcing it. **SELF-VERIFYING** — pinning the arms as literals fails it.

3. **AC-3 (D3/D3a, parity).** For every turn of a walkthrough, the `room.name` block's content and the `location` channel's value are equal — asserted across the run rather than at one point, so a path that recomputes independently fails somewhere. **SELF-VERIFYING**, and it is what makes D3a enforceable rather than merely intended: the only way to pass it is to have one projection, which is the property FyreVM got from having one `locationName` and Sharpee lost by having three names.

4. **AC-4 (D4/D5, the bucket).** With the player inside a transparent vehicle, the heading carries the room's text and the vehicle's, the vehicle's arms respond to its own state, and neither room mentions the vehicle in its own source. **REAL-PATH** (rule 13a) — driven through an assembled engine, not a stubbed composer. **Written in TypeScript, not Chord**: ADR-350 is research and not scheduled (David, 2026-09-14), so no Chord vehicle surface exists to write it against. The criterion tests the platform projection, which is what this ADR decides; a Chord fixture becomes possible only if ADR-350 is ever taken up.

5. **AC-5 (D7, no regression).** Every existing transcript and walkthrough passes unchanged, because no story declares a `room name` block. **MECHANICAL.**

6. **AC-6 (D8).** `grep -rn "inVehicle" packages` returns nothing. **MECHANICAL.**

7. **AC-7 (D4a, the opaque vehicle).** With the player inside an opaque vehicle that is itself inside a room, the heading and the status line both name the vehicle, and the vehicle's own `room name` arms respond to its state. **SELF-VERIFYING, and it fails on today's code** — `getContainingRoom` names the surrounding room, so this criterion is the one that catches a projection built on the wrong resolver. Written as a regression test first, since the divergence exists before this ADR does.

8. **AC-8 (D4/D5, the transitions).** Three moments, not three states: **entering** an enclosure adds its part on that turn; **leaving** it removes the part on that turn; and a **vehicle moving between rooms with the player aboard** changes the place part while the enclosure part survives unchanged. The third is the bucket's whole motivating case, and AC-4 and AC-7 pin only the states either side of it. **SELF-VERIFYING** — a projection cached per room rather than computed per turn passes AC-4 and fails this.

9. **AC-9 (D1/D7, every arm fails).** A `room name` block whose arms all carry conditions, none of which hold, falls back to the entity name exactly as an absent block does — it does not render empty, and it does not render the last arm. Paired with the positive case: an unconditional arm present alongside failing conditional ones wins. **NEGATIVE, MECHANICAL.**

## Consequences

- **The entity name stops being what the player reads, and keeps being what everything else reads.** GO TO, the map editor, transcript assertions keyed on a room name, and the `--introspect` manifest all continue to see `maze-5`. For a maze that is arguably correct; it is stated here so it is a decision rather than a discovery.
- **The `location` channel's payload changes shape**, from `text` to structured content, and `createLocationChannelRenderer` (`packages/platform-browser/src/channels/status.ts:22-31`) changes with it. `renderTextContent` already exists for exactly this (`packages/platform-browser/src/channels/text-content.ts:26`), so the renderer change is small — but it is a shipped wire contract, and any non-browser client rendering `location` has to move with it.
- **A per-turn projection is a per-turn cost.** The arms of the current place and its enclosure are evaluated every turn. That is two condition evaluations in the common case, and the `replace`/`always` channel semantics absorb the no-change case, but it is work the turn loop does not do today.
- **`transparent` becomes load-bearing.** It defaults to `true` and nothing but `getDescribableLocation` reads it, so its value has never mattered much. Under D5 it decides whether a vehicle contributes to the heading at all.
- **The construct is a second place a location can get text**, beside its description. That is the point, but it means a story can now say the same thing twice, and nothing stops it.

## Open Questions

1. **Does a region carry a `room name` for its members?** David: "I wouldn't use any scopes for this … I might let region into the mix somehow, but not trait." The maze is the case for it — twelve identical blocks is exactly the repetition a region removes, and fernhill's regions already carry behavior member rooms inherit (`fernhill.story:28-45`). Trait is ruled out. Unresolved: region in v1, region later, or never.

2. **What is the `location` channel's new payload, exactly?** `TextContent[]` directly, the `ProseEntry` shape the prose channels use (`standard.ts:162-177`), or a new shape. This determines how far the change reaches into clients.

3. **Is the no-lid container bug in scope? (GH #467)** A `CONTAINER` with no `OpenableTrait` falls through to the closed branch (`VisibilityBehavior.ts:581-595`), so the coal-mine basket hides the Shaft Room from a player sitting in it. "No lid" should mean "always open." Fixing it changes the basket's behavior and brings it under D5; leaving it out means D5 covers vehicles and openable containers but not lidless ones. Now filed separately as **GH #467** with a reproduction, so it will be fixed on its own schedule — the question here is only whether this ADR waits on it.

4. **RESOLVED — the channels collapse, as FyreVM had it** (David, 2026-09-14: "Q4 collapse as FyreVM had it"). `roomNameChannel` and `locationChannel` become one prose-typed channel for one fact, restoring the singular `locationName` the Context describes. Two details the collapse must settle, neither of which reopens the ruling:
   - **The name.** `location-name` matches FyreVM's `locationName` under Sharpee's kebab channel convention; `location` keeps one of the two existing ids. Either way `room-name` goes.
   - **The cadence conflict, which is real.** The two channels differ in emission as well as content: prose channels are `append`/`sparse` and route to the scrollback (`createProseChannelRenderers(layout.main, PROSE_CHANNEL_IDS, …)`, `packages/platform-browser/src/channels/index.ts:182`), while `location` is `replace`/`always` and routes to the status slot (`:198`). One channel cannot be both. Change-detection in the client is *not* sufficient — LOOK in an unchanged room must reprint the heading while the value has not changed — so the collapsed channel needs a way to say "print this now" alongside "this is where you are." Whether that is one channel carrying both signals, or the channel carrying state while the inline heading stays a block, is the implementation question the collapse leaves.

5. **What happens to transcript assertions that match on a room name?** `auto-assertion: room-name-and-description` (`packages/chord/src/ir.ts:228`) pins the heading. Under D2 the heading can now vary with world state, which makes that policy's output state-dependent in a way it was not. Whether that is a feature, a gate, or a diagnostic is undecided.

6. **Who owns the separator between the place's part and the enclosure's?** D4 says there are two contributions and never says what sits between "Top of Well" and "in the bucket" — a comma, a space, a dash, a line break. This is user-facing text, so it has a language-layer home somewhere, and the candidates differ in what they allow:
   - **the client**, matching ADR-174's span-and-class model and letting a status bar and a title line punctuate differently (block-to-block separators already work this way — `renderToString`'s "smart separators between same-key vs different-key block transitions", `packages/channel-service/src/render-to-string.ts`) — but this separator is *inside* one block, so that machinery does not reach it;
   - **the author**, by writing the leading punctuation into the enclosure's own arm (`, in the bucket`), which is simple and makes a part unusable in a position its punctuation does not suit;
   - **`lang-{locale}`**, as a core template, which is where platform-authored user-facing text belongs — but D9 deliberately keeps this decision out of the core-template surface.

   D11's `resolve` deliberately returns parts rather than a joined string so this stays open; nothing can be implemented past the projection until it is answered. **Found by `adr-review`, 2026-09-14**, as the language-layer-separation failure.

## What would falsify this

A location whose heading legitimately needs contributions from more than the place and one enclosure — nested vehicles, or an enclosure whose own enclosure should also speak. D4 would then be too narrow and the ordered-contribution machinery this decision avoids would be the right answer after all. Nothing in the three motivating cases needs it, and `getDescribableLocation` cannot currently produce it.

## Session

Session 4ca16b, 2026-09-14, on `main`. Written at David's instruction after an eight-turn design conversation in which he supplied every motivating case and retired four of my framings — the display-name split, the `nameId` route, the core-template-plus-slots route, and platform-named components. The well-room bucket, raised last, is what the decision is shaped around.
