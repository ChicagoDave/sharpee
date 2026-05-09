# ADR-172: Spatial Sound Propagation Model

## Status: PROPOSED (revised 2026-05-08 after multi-ADR seam review with ADR-173, then again to introduce per-side acoustic modifiers and forecast acoustic conduits + visual cross-room observation)

## Date: 2026-05-08

## Builds on

- **ADR-163** (Channel-Service Platform) — establishes that the wire is
  data-only and clients render per their capabilities. ADR-163 governs
  *routing* of story→UI signals; ADR-172 fills in the *audibility model*
  that produces the sound events ADR-163 routes. Sound events become a
  first-class channel kind alongside text, status, media, etc.
- **ADR-090** (Entity-Centric Action Dispatch / Capability Dispatch) —
  the integration point for actions that emit sounds. A SAY action emits
  a content-bearing sound; a BREAK action emits an ambient sound; a
  SHOUT action raises volume tier. Sound emission is a side effect of
  existing actions, not a new action layer.
- **ADR-173** (Wall Adjacency Primitive) — establishes walls as
  IFEntity-derived entities with a whole-wall vs per-side trait
  taxonomy and a generalized obstructor protocol (obstructors carry
  capability-specific traits that determine their effects on each
  capability the wall participates in). ADR-172's propagation function
  consults wall entities for acoustic cost; ADR-172's `AcousticTrait`
  is the first whole-wall trait per ADR-173's classification, and
  ADR-172 introduces `AcousticDampenerTrait` as the first capability-
  specific obstructor trait per ADR-173's protocol. Sound propagation
  through walls exists *only* between rooms where an `IWallEntity`
  has been authored — there is no implicit wall adjacency.
- The exploratory design session preceding this ADR
  (`session-20260508-1229-main`), which framed sound propagation as
  L1 of a layered platform investment. L2 (NPC voice profile +
  conversation choreography), L3 (NPC pathing for walking
  conversations), and L4 (stealth observation extending HIDING) ride
  on top of L1 and are deferred to separate ADRs.

## Context

Sharpee has no spatial audibility model today. Sounds in stories are
either (a) absent or (b) emitted as one-off prose strings inside an
action's report phase, with no notion of which entities are within
earshot, no degradation by distance, and no awareness across rooms.
Each story that has wanted overheard conversation, distant gunshots,
or cross-room cues has had to invent its own ad-hoc handling.

The case study driving this ADR is **The Alderman**, a CLUE-like
randomized-mystery detective story set in a hotel. Its design pillars
include NPCs that converse autonomously when the player is not present,
a HIDING action already in place, and per-NPC personality traits. The
genre demands eavesdropping as a core information channel — overhearing
conversation fragments through doorways, catching the tail of an
argument as the player enters a room, witnessing whole scenes while
hidden, hearing characters call to each other across the hotel. None
of that is expressible without a platform-level audibility model.

But the value is not Alderman-specific. **Any genre with spatial
audible cues uses the same primitive:** mystery (overheard exchanges),
horror (something moving in the next room), stealth (footsteps in the
corridor), action (gunshot from upstairs), domestic drama (a piano in
the parlor). Every story that wants the world to *sound like a place
the player is moving through* will consume this model. Building it
once at the platform level is the right scope.

Three implementation paths were considered:

- **A — Conversation-only audibility helpers.** Add eavesdropping
  support inside the conversation/dialogue subsystem. Cheaper to ship
  for The Alderman v1, but the moment any story wants a non-conversation
  sound cue (a gunshot, a scream, breaking glass), the helper is
  bolted-on or refactored. Conflates audibility with conversation; the
  two are orthogonal.
- **B — Spatial sound as a first-class platform primitive.** Sound is
  modeled at the level of the world, not the dialogue system.
  Conversation beats emit sounds; gunshots emit sounds; doors slamming
  emit sounds. Propagation is shared. Higher upfront cost; correct
  layering thereafter.
- **C — Per-room "audible inventory" lists.** Each room has a list of
  sounds currently audible in it, updated by emitters. Skips a
  propagation function in favor of explicit per-room registration.
  Doesn't generalize to volume-tier degradation, doesn't compose with
  doors, and pushes propagation logic onto every emitter. Effectively
  a per-room ad-hoc system at scale.

Option B is the only choice consistent with Sharpee's principle that
the platform owns substrate concerns (channels, capability dispatch,
language layer) and stories consume them.

## Decision

### Sound as a platform primitive

**Sound** is a first-class platform concept emitted by actions and
delivered to listeners via propagation. Two related shapes participate:

```ts
// What an emitter declares
interface Sound {
  source_location: EntityId;     // room or container the sound originates in
  source_entity?: EntityId;      // optional metadata for renderers attributing
                                 //   the sound to a specific entity
                                 //   ("Hervé says…" vs "someone says…").
                                 //   Propagation does not consult this field.
  volume: VolumeTier;            // discrete tier — see below
  kind: string;                  // domain identifier: 'speech', 'gunshot',
                                 //   'breaking-glass', 'footstep', 'piano', ...
  content?: SoundContent;        // optional: present iff content-bearing.
                                 //   Includes verbal speech, sung lyrics,
                                 //   AND structured patterns (knock codes,
                                 //   rhythmic taps) — both are content.
  tone?: ToneTag;                // optional: 'whisper', 'argument', 'normal'
}

// What a listener receives after propagation
interface AudibilityEvent {
  sound_kind: string;            // copied from Sound.kind
  tier: AudibilityTier;          // 'silent' is excluded — silent means
                                 //   no event is delivered to this listener
  source_location: EntityId;
  source_entity?: EntityId;
  content?: SoundContent;        // present iff tier > 'presence-only' AND
                                 //   the original sound was content-bearing.
                                 //   Degraded forms (fragments, muffled)
                                 //   carry the original content; the
                                 //   language layer renders the degradation.
  entry_room: EntityId;          // last room on the propagation path
                                 //   before reaching the listener — used
                                 //   by the language layer for directional
                                 //   prose ("you hear voices to the north")
  path_cost: number;             // raw cost the propagation accumulated;
                                 //   exposed for renderers wanting
                                 //   continuous distance information
}
```

Sounds are emitted, not stored. Emission triggers propagation; propagation
delivers an `AudibilityEvent` to each listener within reach. The platform
does not maintain a "currently audible sounds" registry — sounds are
turn-scoped events. `AudibilityEvent` is the runtime contract that L2-L4
consumers (NPC voice/choreography, NPC pathing, stealth observation)
will ride on; its shape is stable.

### Volume as a discrete tier set

Five tiers, ordered, each with a numeric **propagation budget** that
the propagation algorithm consumes against accumulated path cost:

| Tier       | Budget | Examples                                          |
|------------|--------|---------------------------------------------------|
| `whisper`  | 1      | Conspiratorial murmuring, "kept voices"           |
| `subdued`  | 2      | Polite conversation, careful footsteps            |
| `normal`   | 5      | Ordinary speech, walking, doors closing normally  |
| `raised`   | 7      | An argument, a slammed door, a dropped tray       |
| `shouting` | 9      | Yelling, gunshots, breaking glass, screams        |

Discrete tiers are chosen over continuous numeric volumes for three
reasons: (1) authoring is materially simpler — authors think in
qualitative terms, not decibels; (2) the prose layer renders per-tier
descriptions, which need a finite tier set anyway; (3) continuous
values invite balance-tuning sessions that produce no gameplay value.

The numeric budgets are platform configuration; stories that want a
different acoustic register (a horror story with sound that carries
unnaturally far, a soundproofed bunker setting where nothing carries)
override the budget table without the platform code changing.

### Audibility as a discrete tier set at the listener

Propagation produces an audibility tier at each listener's location:

| Tier             | Listener experience                                              |
|------------------|------------------------------------------------------------------|
| `silent`         | No signal reaches the listener; no event delivered.              |
| `presence-only`  | Listener knows a sound occurred (kind, rough direction) but no content. |
| `fragments`      | Partial content — key words, broken phrases.                     |
| `muffled`        | Full content, rendered with distortion at the prose layer.       |
| `full`           | Clean reception; verbatim content.                               |

The audibility tier is the runtime contract between the propagation
function and the rendering layer. The prose layer (lang-{locale})
maps each `(kind, audibility_tier)` pair to descriptive output. Story
authors do not write per-tier prose for every kind; the language layer
ships defaults, and authors override per kind if they want.

Content-bearing sounds with structured content (knock codes, rhythmic
taps) degrade through the same tiers: full preserves the pattern
verbatim; muffled distorts it; fragments render only key beats;
presence-only renders only the kind ("you hear something tapping").
Pattern-as-content is not a separate dimension.

### Whole-wall trait: AcousticTrait

Per ADR-173's whole-wall vs per-side taxonomy, sound's intrinsic
acoustic-cost data lives in a **whole-wall trait**, `AcousticTrait`,
attached to wall entities. The wall's *base* acoustic cost (its
material's contribution) is symmetric from both sides and lives in
the whole-wall slot.

```ts
type AcousticTier = 'thin' | 'default' | 'thick' | 'soundproof';

class AcousticTrait implements ITrait {
  static readonly type = 'if.trait.acoustic';
  static readonly slot = 'whole-wall';   // per ADR-173 taxonomy
  constructor(public readonly tier: AcousticTier) {}
}
```

Tier costs (in path-cost units):

| Tier         | Cost     | Effect                                                           |
|--------------|----------|------------------------------------------------------------------|
| `thin`       | 2        | Plaster, hotel-room partition; sound passes readily              |
| `default`    | 4        | Ordinary interior wall; muffles most ordinary speech             |
| `thick`      | 6        | Stone, masonry; only loud sounds leak                            |
| `soundproof` | ∞        | Acoustically opaque; no sound transmits regardless of volume     |

A wall declared without an `AcousticTrait` defaults to `default`.
Authors override per wall by attaching an explicit trait at wall
creation (per ADR-173's authoring API).

### Per-side acoustic modifiers

ADR-173's per-side `obstructedBy` field references an entity in the
corresponding room. Per ADR-173's generalized obstructor protocol,
the obstructor's *own traits* determine its contributions to each
capability the wall participates in. ADR-172 introduces
**`AcousticDampenerTrait`** as the first such capability-specific
obstructor trait:

```ts
class AcousticDampenerTrait implements ITrait {
  static readonly type = 'if.trait.acoustic-dampener';
  static readonly slot = 'obstructor';   // applies when this entity
                                         //   is referenced by a wall's
                                         //   per-side obstructedBy field
  constructor(public readonly contribution: number) {}
  // Positive contribution adds to effective cost (dampens sound).
  // Negative contribution subtracts (sound passes more readily —
  // a hole, peephole, or other opening).
}
```

The wall's **effective acoustic cost** is computed at propagation
time:

```
effective_cost(wall) =
    base_cost(wall.AcousticTrait)
  + Σ obstructor.AcousticDampenerTrait.contribution
      for each side's obstructedBy entity that
        - is currently located in the corresponding room, AND
        - carries an AcousticDampenerTrait
```

Both sides' contributions apply because sound passing through the
wall must traverse what's on both faces. The formula is symmetric:
a tapestry on Side A adds to the cost regardless of flow direction.

Obstructor examples:

| Obstructor entity | Traits carried | Effect on this wall |
|-------------------|----------------|----------------------|
| Tapestry          | `AcousticDampenerTrait { +2 }` | +2 to effective acoustic cost when on a side |
| Peephole          | `AcousticDampenerTrait { -2 }` (plus future `VisualConduitTrait`) | −2 to acoustic cost (more permeable); enables line-of-sight (future) |
| Bookcase          | `BreachBlockerTrait { ... }` (no acoustic trait) | Blocks breach from this side; *no* effect on sound |
| Heavy curtain     | `AcousticDampenerTrait { +1 }` | Mild dampening |

The puzzle pattern falls out: the author declares the tapestry as a
takeable entity carrying `AcousticDampenerTrait`. When the player
TAKEs the tapestry, it leaves the room; the wall's per-side
obstructor resolution returns "not present"; the contribution is no
longer applied; the effective cost drops; sound now leaks through
the wall. Detective gameplay emerges from environmental manipulation
without any platform-level "tapestry rule."

### Propagation function

```
propagate(sound, listener, world) → AudibilityEvent | null
```

Returns `null` (no event delivered) if propagation reaches `silent`;
otherwise returns an `AudibilityEvent` for delivery to the listener.

Algorithm:

1. Build the **acoustic edge graph** from the world. Two rooms are
   connected for propagation if any of the following spans them:
   - An exit (per `IExitInfo`), with cost from door state.
   - A wall entity (per ADR-173), with cost from the wall's effective
     acoustic cost (base + obstructor contributions).
   - An acoustic conduit (future primitive, see §Deferred), with cost
     from the conduit's contribution.
   The algorithm is agnostic to edge source — any future acoustic
   primitive contributing edges follows the same shape.
2. Find the **lowest-cost path** from `sound.source_location` to
   the listener's location through the acoustic edge graph.
   Accumulate path cost: each room hop adds the room-traversal cost
   (default: 1 cost unit); each crossed edge adds its edge cost.
3. Compute clarity: `clarity = volume_budget(sound.volume) - path_cost`.
   Higher clarity = clearer audibility.
4. Map clarity to audibility tier:

   | Clarity      | Tier            |
   |--------------|-----------------|
   | ≥ 4          | `full`          |
   | 3            | `muffled`       |
   | 2            | `fragments`     |
   | 1            | `presence-only` |
   | ≤ 0          | `silent`        |

5. If listener and source are in the same location, path cost is 0
   and audibility is always `full`, regardless of intervening
   boundaries (degenerate case).

If no path exists in the graph (rooms acoustically isolated — no
exit, no wall, no conduit between them or any chain), audibility is
`silent` and no event is delivered. This is the natural consequence
of the "100% author-driven" stance — the platform does not invent
adjacency.

The cost-mapping table is platform configuration; stories can shift
both the volume budgets and the clarity thresholds for their own
acoustic register.

### Acoustic edge cost contributors

Three categories of edge contribute to the acoustic graph today
(plus future kinds via the same agnostic interface):

- **Door (per IExitInfo)**:
  - Open: cost 1
  - Closed: cost 4
  - Locked: cost 4 (lock state does not increase acoustic cost)
- **Wall entity (per ADR-173)**: effective acoustic cost as defined
  in §Per-side acoustic modifiers — base from `AcousticTrait`, plus
  per-side obstructor contributions.
- **Acoustic conduit (future ADR)**: a passage through ductwork, a
  pipe, a dumbwaiter shaft, or similar non-adjacent acoustic
  connection. Contributes edges between non-adjacent rooms;
  multi-endpoint conduits (e.g., a building-spanning pipe)
  contribute edges between every pair of endpoints.

Default propagation outcomes from the cost table, given a single
boundary between source and listener room:

| Volume     | Same room | Open door (1) | Closed door (4) | thin wall (2)  | default wall (4) | thick wall (6) |
|------------|-----------|---------------|-----------------|----------------|------------------|----------------|
| `whisper`  | full      | silent        | silent          | silent         | silent           | silent         |
| `subdued`  | full      | presence-only | silent          | silent         | silent           | silent         |
| `normal`   | full      | full          | presence-only   | muffled        | presence-only    | silent         |
| `raised`   | full      | full          | muffled         | full           | muffled          | presence-only  |
| `shouting` | full      | full          | full            | full           | full             | muffled        |

Multi-room paths add room-traversal cost (default 1 per intermediate
room); the algorithm composes naturally.

### Content-bearing vs ambient sounds

Sounds split into two flavors based on whether `content` is present:

- **Content-bearing** (`content` field set): a line of dialogue, a
  shouted phrase, a sung lyric, a coded knock pattern. Audibility
  tier modulates the content delivered to the listener. At `full`,
  the content is verbatim; at `muffled`, the language layer renders
  it with distortion-style framing; at `fragments`, only key parts
  pass through; at `presence-only`, no content passes — the listener
  only knows that the sound occurred.
- **Ambient** (`content` omitted): a gunshot, breaking glass,
  footsteps, a piano, a closing door. Audibility tier modulates the
  description of the sound itself, not the content. At `full`, the
  language layer renders a rich description; at degraded tiers, it
  renders progressively distant variants. At `silent`, nothing is
  delivered.

The propagation function is identical for both. Rendering differs at
the language layer. This is consistent with the platform's separation
of concerns (engine emits semantic events; lang-{locale} owns prose).

### Multi-listener dispatch

Propagation is per-listener. The platform invokes the propagation
function for every entity in the world that is a `Listener`. The
**player gains the Listener trait automatically during engine
initialization**; story authors do not need to add it manually. NPCs
gain the trait when their authoring opts in (used by L2+ for NPC
reactivity — e.g., an NPC hears a scream and runs toward it).
Devices may also be Listeners (an intercom microphone, a phone
receiver — see §Active acoustic devices, deferred). Entities without
the trait are skipped.

L1 defines the dispatch primitive and the `AudibilityEvent` shape.
L2+ defines what NPCs do with the events they hear; L1 does not
specify NPC reactivity. The `AudibilityEvent` interface is the
contract — additions to it require a future ADR.

### Channel routing

Sound events flow through the channel system per ADR-163. A new
channel kind, **`audibility`**, is reserved for this purpose. Each
emitted sound, after propagation, becomes an audibility-channel event
delivered to the listener with the `AudibilityEvent` payload defined
above.

> **Note (resolved during Phase 5 implementation, 2026-05-09):** the
> channel id is `audibility`, not `sound`. The `sound` id is owned by
> ADR-163 for the media-cue channel (`media.sound.play` payloads).
> The original ADR-172 draft reserved `sound` without spotting that
> collision; the rename to `audibility` keeps both subsystems intact
> and was the option David chose in implementation.

Renderers consume the audibility channel per their capability:

- **Text-only clients** (terminal, plain-text web): the language layer
  renders descriptive prose ("you hear hushed voices to the north")
  and the audibility channel data feeds the prose channel. The
  audibility channel is **not** capability-gated for this reason —
  every surface renders sound prose.
- **Audio-capable clients** (browser, with the existing Web Audio
  infrastructure from ADR-169): the audibility channel can
  additionally carry an audio cue identifier; the client plays the
  cue at a computed playback volume mapped from the audibility tier.
  The client may also render the prose, or suppress prose for
  ambient sounds where the audio is sufficient — that choice is
  per-client and per-story configuration, not platform-decided.

The wire shape is the `AudibilityEvent`; clients render what they
can. This honors ADR-163's "wire is data-only, never assume locked-in
client choices."

### Action integration via capability dispatch

Sound emission is a side-effect of actions. Per ADR-090, actions and
behaviors can emit events; sound is a new event kind. The
authoring API for an action that emits a sound is:

```ts
context.emitSound({
  source_location: actor.location,
  source_entity: actor.id,
  volume: 'normal',
  kind: 'speech',
  content: { messageId: 'dungeo.alderman.parlor.beat-3' },
});
```

The platform's emit function performs propagation and delivers
`AudibilityEvent`s to every listener within reach. The action does
not enumerate listeners; it does not compute distances; it declares
the sound and the platform handles the rest.

### Authoring API summary

What authors write:

- **Action emissions**: `context.emitSound({...})` from any action,
  behavior, or event handler.
- **Wall acoustic properties** (optional): attach an `AcousticTrait`
  to wall entities at creation per ADR-173's authoring API. Default
  walls (`default` tier) work without explicit declaration.
- **Acoustic obstructors** (optional): give entities (tapestries,
  peepholes, holes, foam panels) an `AcousticDampenerTrait` with a
  contribution value. Reference them via wall per-side `obstructedBy`
  per ADR-173.
- **Listener trait** on NPCs and devices: opt-in via the entity's
  traits when reactivity to sounds is desired. The player's Listener
  trait is added automatically by the engine.

What the platform handles:

- Propagation math and edge-graph traversal.
- Channel routing.
- Audibility tier → prose mapping (via lang-{locale} defaults).
- Multi-listener dispatch.

### Rejection rules

The `emitSound` API rejects on the following input conditions:

- **Missing `source_location`**: throws. Sound must originate in a
  located place.
- **`source_entity` provided but not located in any room**: emission
  is dropped silently with a debug warning. Detached entities cannot
  emit propagating sound.
- **Unknown `volume` tier**: TypeScript prevents at compile time;
  runtime check throws for stories using untyped paths.
- **Unknown `kind`**: not rejected at the platform — `kind` is a
  freeform domain identifier. Stories that emit unknown kinds get
  the language layer's fallback prose ("you hear something") at any
  audibility tier.
- **No reachable listeners**: emission completes silently. This is
  not an error — sounds in unoccupied rooms are valid.

### End-to-end scenario

*Setup:* Three rooms — Parlor, Library, Hall — connected as follows.
Parlor and Library share a thick stone wall (`AcousticTrait('thick')`,
cost 6) — the original load-bearing wall of the hotel. Parlor and
Hall share an open door (cost 1). Hall and Library share a thin
plaster wall (`AcousticTrait('thin')`, cost 2) — the Hall was
sub-divided from a larger room when the hotel renovated.

*The player is in the Parlor.* Hervé is in the Library. Hervé's
voice rises in argument with Marguerite; the speech action emits:

```ts
context.emitSound({
  source_location: library.id,
  source_entity: herve.id,
  volume: 'raised',           // budget = 7
  kind: 'speech',
  content: { messageId: 'lib.hervé.confession-shard' },
});
```

*Propagation evaluates two paths from Library to Parlor:*

- **Path 1 (direct via thick wall)**: edge cost = 6 (thick wall),
  no intermediate room. Total path cost = 6. Clarity = 7 − 6 = 1
  → **`presence-only`**.
- **Path 2 (via Hall)**: thin wall (2) + room hop into Hall (1) +
  open door from Hall to Parlor (1). Total path cost = 4. Clarity
  = 7 − 4 = 3 → **`muffled`**.

The propagation function returns the event for the **best path**
(higher clarity). Path 2 wins. The Parlor listener receives:

```ts
{
  sound_kind: 'speech',
  tier: 'muffled',
  source_location: library.id,
  source_entity: herve.id,
  content: { messageId: 'lib.hervé.confession-shard' },
  entry_room: hall.id,            // last room before the listener
  path_cost: 4,
}
```

The language layer renders this for the player as muffled prose
referring to the Hall direction (since `entry_room = hall.id`):
*"From the direction of the hall, you make out a man's voice — agitated,
distorted: '… and then I … never meant for it to …'"*

Hervé's voice carried farther through the thin Hall wall + open door
than directly through the thick stone, which is the gameplay-relevant
detective insight: **the architecture itself shapes what the player
can overhear.** Detective payoff: a savvy player who's mapped the
hotel's structure realizes the Hall is the better eavesdropping
post for that room.

*Variant — the tapestry puzzle:* Suppose a tapestry hangs on the
Hall side of the Hall ↔ Library wall, with
`AcousticDampenerTrait({ contribution: +3 })`. Effective acoustic
cost of the wall becomes 2 + 3 = 5. Path 2 cost becomes 5 + 1 + 1 = 7.
Clarity = 7 − 7 = 0 → **`silent`**. Path 1 cost still = 6 → clarity 1
→ presence-only. Path 1 wins by default but content is lost — the
player only knows someone is talking. The puzzle resolution: the
player TAKEs the tapestry from the Hall, the contribution is no
longer applied, Path 2 returns to muffled, and the confession-shard
becomes overhearable.

## Implementation Modules

The following packages and files own each piece of the decision:

| Piece | Package | File (proposed) |
|-------|---------|-----------------|
| `Sound`, `AudibilityEvent`, `VolumeTier`, `AudibilityTier` types | `@sharpee/if-domain` | `src/sound/types.ts` (new) |
| `AcousticTrait`, `AcousticDampenerTrait` | `@sharpee/world-model` | `src/traits/acoustic/` (new) |
| Propagation function | `@sharpee/engine` | `src/sound/propagation.ts` (new) |
| `Listener` trait + automatic player attachment | `@sharpee/world-model` (trait), `@sharpee/engine` (player init) | `src/traits/listener/listener-trait.ts` (new); engine player-init extension |
| `context.emitSound` on `ActionContext` | `@sharpee/stdlib` | `src/actions/types.ts` (extend) |
| `audibility` channel kind registration (`audibilityChannel`) | `@sharpee/stdlib` (channel infrastructure per ADR-163) | `src/channels/sound-events.ts` (new) |
| Sound message defaults (per-`(kind, tier)` prose) | `@sharpee/lang-en-us` | `src/sound-messages.ts` (new) |
| Web Audio cue mapping | `@sharpee/platform-browser` | extends ADR-169 audio infrastructure |

Module ownership respects Sharpee's existing dependency direction:
domain types in `if-domain`; world-state primitives in `world-model`;
behavior in `engine` and `stdlib`; rendering in `lang-en-us` and
client packages.

## Acceptance Criteria

L1 is complete when the following are demonstrable:

- **AC-1**: The propagation function returns the correct
  `AudibilityEvent` (or `null` for silent) for every (volume × path
  cost) combination in the documented cost table, verified by unit
  tests against synthesized room graphs.
- **AC-2**: Emission of a content-bearing `raised`-volume sound from
  one room delivers a `muffled` `AudibilityEvent` to a Listener in
  an adjacent room across a closed door (cost 4), with `content`
  carrying the original message ID.
- **AC-3**: A wall declared (per ADR-173) with `AcousticTrait('thin')`
  between two rooms permits `normal`-volume sound to cross at
  `muffled`; without an explicit `AcousticTrait`, the wall defaults
  to `default` tier and the same sound is `presence-only`.
- **AC-4**: Multiple listeners in different rooms receive
  per-listener-correct `AudibilityEvent`s from a single emission, with
  each event's `tier` and `entry_room` reflecting that listener's
  best path.
- **AC-5**: An emission with no reachable listeners (all listeners
  beyond `silent` threshold) completes without error and delivers no
  events.
- **AC-6**: The browser client renders `AudibilityEvent`s through the
  audio channel at playback volumes mapped from `tier`, composing
  with ADR-169's fade infrastructure without conflict; the text
  channel renders prose for the same events at all clients.
- **AC-7**: An obstructor entity carrying
  `AcousticDampenerTrait({ contribution: +N })`, while located in a
  room and referenced by the wall's per-side `obstructedBy`, raises
  the wall's effective acoustic cost by N. Removing the obstructor
  from the room (TAKE, MOVE, etc.) causes the wall's effective cost
  to drop accordingly; subsequent emissions reflect the change.
- **AC-8**: An obstructor entity *without* `AcousticDampenerTrait`
  (e.g., a bookcase carrying only `BreachBlockerTrait`) does not
  affect acoustic propagation through the wall; an emission across
  such an obstructed wall yields the same `AudibilityEvent.tier` as
  across the same wall with no obstructor.

Each AC has a real-path test per the integration-reality discipline
in CLAUDE.md.

## Consequences

### What this enables (immediately)

- **The Alderman** can author conversation choreography (L2/L3 work)
  on top of L1 without the propagation question being open. Tapestry
  puzzles, peephole-leak puzzles, and thin-wall eavesdropping
  scenarios all compose declaratively.
- **Any story** can emit sounds from any action and trust that
  audibility is correctly modeled across rooms, doors, walls (per
  ADR-173), and obstructors.
- **Audio-capable clients** (web client with Web Audio) can render
  sound cues with playback volumes derived from audibility tiers,
  composing cleanly with the existing fade infrastructure (ADR-169).
- **Future ADRs** for L2 (NPC voice profile + conversation
  choreography), L3 (NPC pathing), and L4 (stealth observation
  extending HIDING) can specify their primitives in terms of "emit a
  sound" rather than re-deriving propagation. The `AudibilityEvent`
  shape is the contract those ADRs ride on.

### What this constrains

- Every sound feature uses this primitive. Per-action ad-hoc audibility
  is no longer a path; new actions that produce sound declare it via
  `emitSound`.
- Cross-wall acoustic propagation requires a declared `IWallEntity`
  per ADR-173. Two rooms with no exit, no declared wall, and no
  declared conduit are acoustically isolated regardless of geometric
  "closeness."
- The channel system gains an `audibility` channel kind. Clients that
  render sound (audio cues, distance-aware prose styling) consume it;
  others ignore it without breaking.
- Capability dispatch gains a side-effect path for `emitSound`,
  parallel to event emission.
- The `AudibilityEvent` interface is a stable platform contract.
  Additions to it require a future ADR.
- `AcousticDampenerTrait` is the canonical capability-specific trait
  for acoustic obstructors. Future capabilities (visual, olfactory,
  thermal) follow the same protocol with their own trait kinds —
  composing cleanly per ADR-173's generalized obstructor pattern.

### What this does *not* specify (deferred)

- **NPC voice profile** (per-NPC baseline volume, speaking-style
  traits): L2, separate ADR.
- **Conversation choreography** (beat sequences, attention targets,
  tone tags): L2, separate ADR. Choreography emits sounds via L1 but
  is orthogonal to L1.
- **NPC pathing** (multi-turn movement plans for walking
  conversations): L3, separate ADR or extension to existing NPC turn
  phase.
- **Stealth observation** (HIDING + WAIT to passively listen,
  LISTEN AT exit, trailing dialogue on entry): L4, separate ADR
  composing prior layers.
- **Acoustic Conduits** (vents, ducts, dumbwaiter shafts, speaking
  tubes, pipes): a future sibling primitive to ADR-173 walls.
  IFEntity-derived edges that connect rooms acoustically without
  geographic adjacency, with terminal entities visible/examinable
  in each connected room. Multi-endpoint conduits (a
  building-spanning pipe) connect three or more rooms. Contributes
  edges to ADR-172's propagation graph; the algorithm is already
  agnostic to edge source. The conduit primitive composes with
  ADR-173's obstructor protocol — terminals can be obstructed
  (covered, plugged) using `AcousticDampenerTrait` the same way
  walls' per-side data is.
- **Active acoustic devices** (intercoms, wired phones, recorders,
  microphones, security camera feeds, public-address systems):
  *not* a new platform primitive. These compose existing primitives
  — `Listener` trait (the device perceives sounds in its room),
  device-state traits (`SwitchableTrait` for ON/OFF; richer state
  for phones), event handlers (ADR-052) responding to incoming
  `AudibilityEvent` by emitting a derived sound at the paired
  device's location. Documented as a composition pattern; may
  warrant a "patterns" doc but not its own ADR.
- **Visual cross-room observation** (peepholes, two-way mirrors,
  scrying glasses, security camera feeds, line-of-sight across
  edges): a future sibling consumer to ADR-172, riding on ADR-173's
  walls and on the future Acoustic Conduits primitive. Will
  introduce `VisualTrait` (whole-edge intrinsic) and
  `VisualConduitTrait` (per-side or per-terminal — establishes
  line-of-sight). The Alderman's spying mechanics consume this ADR.
- **Hidden state & discovery** (secret passages, concealed peepholes,
  hidden doors): a future ADR establishing a hidden-state pattern
  for entities (walls, peepholes, etc.) that are imperceptible
  until discovered, plus the discovery transition (often: a wall
  gains an exit when revealed). The Alderman's secret-passage
  mechanics consume this ADR.
- **Listener attributes** (deafness, focused listening, distraction
  modifiers): extension to the propagation function via a per-listener
  perception modifier; deferred until a story needs it.
- **Sound stacking / continuous-time accumulation** (multiple sounds
  reaching a listener in one turn, ordering, suppression): the L1
  model emits one event per propagated sound per listener; the
  language layer renders multiple events as multiple prose lines if
  they arrive in the same turn. Stacking semantics (combining,
  ordering, suppressing repeats) are deferred.
- **Directional language extensions** (player-facing prose for "you
  hear voices to the north," parser support for "LISTEN NORTH" /
  "LOOK AT NORTH WALL"): both ADR-172 (rendering) and ADR-173
  (parser) defer this. A future "directional language extensions"
  ADR should address both sides coherently. The platform exposes
  `entry_room` on `AudibilityEvent` so the language layer has the
  data when that ADR lands.

### Risks and trade-offs

- **Tuning the cost table**: the default mapping from path cost to
  audibility tier produces intuitive results for typical IF rooms,
  but unusual story geometries (a 30-room hotel with long corridors,
  a single open warehouse modeled as one room, etc.) may need
  per-story configuration. The table is exposed; this is acceptable.
- **Performance**: propagation per emit per listener walks the room
  graph. IF room graphs are small (typically <100 rooms); this is
  cheap. If a story has tens of thousands of sound emissions per turn,
  optimization is possible (cache the per-listener reachability
  graph, recompute only when topology changes). Not a concern for
  typical stories.
- **Authorial complexity**: authors who don't care about sound never
  see this model — silence is the default, and `emitSound` is opt-in.
  Authors who do care write declarative emissions and accept the
  platform's propagation. Cross-wall propagation requires authors to
  declare walls (per ADR-173) — this is more work than auto-inference
  would be, but matches the project's "platform does not invent world
  structure" principle.
- **Discrete tier coarseness**: five volume tiers and four
  AcousticTrait tiers may feel coarse to authors with strong acoustic
  intentions. Per-story cost-table overrides express finer gradations
  indirectly; per-side `AcousticDampenerTrait` modifiers allow
  obstructors to fine-tune individual edges. If this proves
  insufficient, the tier set can be extended in a future ADR.
  Coarse-by-default avoids the tuning-hell trap of continuous values.

### Backwards compatibility

None. Sharpee has no existing sound system; this is greenfield. Per
project policy (no backwards-compatibility shims), nothing is migrated
or shimmed. Stories that don't emit sounds remain silent and behave
identically to today.

## Session

This ADR was produced in `session-20260508-1229-main` from the
brainstorming exchange that progressively refined the model from
"trailing dialogue for The Alderman" to "spatial sound propagation as
the L1 of a layered platform investment." The session captured the
layered framing (L1 sound → L2 voice/choreography → L3 pathing → L4
stealth observation) and explicitly chose the platform-level scope
over the conversation-only alternative on the principle that "The
Alderman is the case study, but we want to provide the tools to the
platform regardless of genre."

The ADR was revised twice in the same session:

1. After a multi-ADR seam review with ADR-173 surfaced three blockers
   rooted in the original treatment of walls as edge-kind metadata.
   Walls were promoted to IFEntity (per ADR-173); ADR-172 cites
   ADR-173, formalizes `AcousticTrait` as a whole-wall trait, and
   adds `AudibilityEvent` as the L2+ contract.
2. After scenario stress-testing (tapestry puzzle, peephole, vents,
   intercoms, pipes, stomping, banging) revealed (a) the strict
   "obstructions never affect sound" rule was too restrictive — a
   tapestry SHOULD be able to dampen sound as a puzzle mechanic;
   (b) a richer obstructor protocol generalizes cleanly to multiple
   capabilities (acoustic, breach, future visual/olfactory/thermal);
   (c) acoustic conduits, active acoustic devices, visual
   cross-room observation, and hidden state belong in a forecasted
   ADR roadmap rather than being absorbed inline. The current
   revision adds `AcousticDampenerTrait`, the per-side acoustic
   modifier formula, and forecasts the four future ADRs in the
   deferred section.

## Implementation phasing (not a migration plan)

L1 ships in phases that each deliver standalone value:

1. **Sound and AudibilityEvent types** in `@sharpee/if-domain` — pure
   domain types, no behavior. Tests verify the type shapes compile
   against expected consumer signatures.
2. **AcousticTrait + AcousticDampenerTrait + Listener trait** in
   `@sharpee/world-model` — trait shapes only, no behavior beyond
   storage. Tests verify trait composition with the existing trait
   system.
3. **Propagation function** in `@sharpee/engine` — pure logic, fully
   unit-testable without real worlds beyond synthesized room graphs.
   Tests exercise the cost table, all paths through the algorithm,
   per-side obstructor contribution, and rejection cases.
4. **Player Listener trait wiring** in engine player initialization —
   tests verify a freshly-initialized player has the trait without
   story authoring.
5. **Channel integration** — `audibility` channel kind registered (in
   `@sharpee/stdlib` alongside the standard / media channel kits per
   ADR-163 §7); `AudibilityEvent`s flow through ADR-163's routing
   carried by the `sound.audibility.heard` semantic event; lang-en-us
   ships per-`(kind, tier)` defaults under `sound.heard.<kind>.<tier>`
   message ids.
6. **Action integration** — `context.emitSound` exposed; capability
   dispatch wired; integration tests exercise emission → propagation
   → channel → rendering with real worlds, including a tapestry-
   removal puzzle scenario.
7. **Audio-channel rendering in the browser client** — audibility
   channel events trigger Web Audio cues per ADR-169's playback
   infrastructure.

Each phase has a real-path test (per the integration-reality discipline
in CLAUDE.md): propagation tests use real room graphs, channel tests
use the real channel router, browser audio tests use a real browser
with the real Web Audio API. No phase passes on stubs of the
subsystem under test.
