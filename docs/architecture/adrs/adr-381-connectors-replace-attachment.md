# ADR-381: Connections are an extension; attachment goes, and fixed or hanging things use what exists

**Status**: **ACCEPTED** (David, 2026-10-22, session 289aa0: "yes", after `adr-review` 21/21 with one N/A, the first pass's nine findings folded in: events, trait and behavior contract, the undefined option pairs, the module list and cutover order, the stock grammar, acceptance criteria, the probe's evidence, persistence, and the supersession owner). Written 2026-10-22, session 289aa0, on `chord-4-0`, during alignment-fixes Phase 11 (the Phase 8 re-read, ledger P8-4), from David's rulings in that session: "first you start with the noun, then its behavior"; "scenario: a rope is tied to two identical posts"; "an undetachable thing doesn't need attachment at all...it's just scenery"; "I think the wall is a supporter for a placard or painting or sign"; "I think rope might be an extension. However, in my story entropy, I had air cables in a space ship that would attach/connect to a suit and a port"; "go ahead, revert tied to and write the design". The first draft's seven open questions were answered by David the same day: "1 extension, 2 yes, 3 ambiguous, 4 authored, 5 yes but authored, 6 no, 7 best guess?"; and the two readings that followed: "A a, B a though going into zero G would need authored descriptions". Supersedes ADR-373 D1 (attached to, detachable, the taking refusal and pulling free) and D6 (stock tying and untying); ADR-373 D2–D5 and D7's `starts broken` (breakable, fragile, the breaking clause, destructible) stand. No implementation is authorized.

## Date: 2026-10-22

**Kind**: technical

**Scope**: `packages/world-model` (`traits/attached/` removed; the connector traits and `ConnectorBehavior` added; `trait-types.ts`, `implementations.ts`, `all-traits.ts`, both barrels), `packages/stdlib` (`attachment-shared.ts`, taking, removing and pulling lose their attachment parts; `tying/` and `untying/` removed; connecting and disconnecting added; `constants.ts`, `standard/index.ts`, `lifecycle/registry.ts`), `packages/parser-en-us` (`grammar/standard-en-us.story`, `src/grammar.ts` regenerated), `packages/lang-en-us` (the actions' lines, `data/verbs.ts`), `packages/chord` (catalog, parser, analyzer, `chord.ebnf` and its pin; `stdlib-manifest.ts` and `message-alias-catalog.ts` regenerated), `packages/story-loader` (`extension-registry.ts`, `setting-schema.ts`, `loader.ts`, `evaluator.ts`, `message-alias-map.ts`), `packages/world-index` (`non-physical-nouns.generated.ts`, checked), `branch-stories/upps` (the route placard, the inspection plate, the parcel twine), `docs/architecture/chord-grammar-changes.md`, the Chord guide and the IDE Docs tab.

## Parent

- **ADR-373** (physical state): D1 and D6 are what this record replaces. Its Context already measured the old trait as "data no action reads"; D1 enforced one field of it, and D6 added tying on top.
- **ADR-372** (counterpart tails): `after the player connecting to the belt` uses it.
- **The ledger**: `docs/work/archive/chord-4-0/alignment-ledger.md` P8-1–P8-4; the write-up of the model this replaces, `docs/work/archive/chord-4-0/attached-and-tied.md`.

## Context — measured, not assumed

**One trait carried three unrelated things.** ADR-373 D1 gave `AttachedTrait` one anchor (`attachedTo`) and a type (`attachmentType`), and used it for:
- a thing that never comes off (UPPS's inspection plate);
- a thing that comes off when pulled (the route placard);
- a thing tied in play (D6's `tie X to Y`).

Every rough edge in `attached-and-tied.md` sits on that seam. A knot is refused as "fixed to". The player's `attach` makes a knot while the author's `attached to` makes a fixed hold. `untie` refuses a fixed thing with "isn't tied to anything".

**Read noun-first, the first two need nothing new.**
- A thing that never comes off is scenery. Taking it already refuses: "{capitalize the item} {verb:is item} fixed in place." (`lang-en-us/src/actions/taking.ts:22`). A story that wants the anchor named writes its own refusal (`on the player taking` … `refuse`, shipped).
- A placard, painting or sign that comes down is a thing on a supporter, the wall. The room lists it, and `take placard` and `take placard from wall` are ordinary taking and removing.

**The third is a different noun, and a single anchor cannot hold it.** A rope tied to two posts has two anchors, and `attachedTo` holds one. On the reverted `tied to` work, `tied to the east post, tied to the west post` compiled; this was probed in this session with `compile()` from `packages/chord/dist`, returning `ok`. That the second then overwrote the first, and that a second `tie` in play is refused, was read from the code (the loader's `AttachedBehavior.attach` call; `tying.ts`, whose implicit take refuses a held thing), not run.

**Entropy shows the noun.** Entropy's safety cable (`../ifstories/entropy/i6/spaceport.h:143-326`) is a thing with two interchangeable ends, `a` and `b`. Things a cable can be attached to carry an `attachable` attribute: the Caledonia's control panel, the air-lock panel (a scenery supporter for its buttons, `spaceship.h:271-289`), and the player's belt (`player.h:71-93`; "me" means the belt). Its behavior:

- `attach cable to X` fills a free end ("You attach an end…", then "…the other end…"). It is refused when both ends are in use ("You must detach an end of the safety cable before you can attach it to something else.") or X is not attachable. Both ends may go to one thing, and the game starts that way.
- `detach cable from X` frees the end at X. When no end is left, the player picks the cable up.
- `take cable` is refused while an end is in something the player does not carry ("You can't carry the safety cable while it's attached to the control panel.").
- `drop cable` is refused while it is on the belt.
- Leaving the air-lock is refused while the cable joins the belt to the air-lock panel ("You can't leave the air-lock while attached to the safety cable…"). Entropy writes this in each exit (`spaceship.h:221`, `:233`), and again elsewhere with its own line ("You can't go anywhere while the safety cable is attached to you and the control panel.", `:520`).
- Story rules sit on top: the flight skin will not activate while the cable is on the belt (`systems.h:234`), and the cable anchors the player against depressurization.

The Sharpee port stopped exactly here: `// TODO: Attachable trait for safety cable` (`../ifstories/entropy/src/regions/spaceport/index.ts:77`, `orbit/index.ts:97`).

In Legs and Stops terms, the cable is the leg, and here the leg is a noun the player handles.

## Decision

**D1 — Attachment goes, tying with it.** These are removed:
- `AttachedTrait` and `AttachedBehavior`;
- the shared `attachedRefusal` (taking, removing) and pulling's attached branch;
- the stock tying and untying actions, their grammar (`tie`, `fasten`, `attach`, `untie`, `unfasten`) and their lang;
- the Chord words `attached to` and `detachable`, their gates, and the `attached` state adjective.

Nothing stands in for tying until a rope extension exists (David, Q6: "no"). Outside Dungeo, which owns its own `tie` grammar, `tie rope to hook` is not understood.

**D2 — A fixed thing is scenery; a hanging thing is on a supporter.** These are existing constructs, so no new syntax:

```chord
create the inspection plate
  a thing, scenery
  in the Sorting Room

  A steel plate riveted to the machine's flank.

  on the player taking
    refuse plate-riveted
  end on

create the wall
  a supporter, scenery
  in the Sorting Room

  A wall of grey board.

create the route placard
  a thing
  on the wall

  A placard listing the day's routes.

define phrase plate-riveted
  The plate is riveted to the sorting machine.
end phrase
```

**D3 — Connections are an extension: `use connections`** (David, Q1). Its nouns:

- **A connector** (the cable, the hose, the leash) is a thing with ends, two unless it says otherwise. Ends are interchangeable unless they are **typed**: then each end is named and fits only what takes that name (David, Q2: "yes"). Entropy's cable is untyped; a hose with a suit end and a port end is typed.
- **A connection point** is any thing that takes a connector's end: the panel, the port, the belt. It has a number of sockets, one unless it says otherwise. A connection point that only takes certain typed ends names them. It is otherwise an ordinary thing: scenery, supporter, wearable or anything else.
- **The connection** is state on the connector: which thing each end is in. It is not an object of its own, and nothing names it.
- **A person's connection point is authored** (David, Q5: "yes but authored"). A person's block names the thing that stands for them, as Entropy's belt does. `connect cable to me` then means that thing. A person who names none takes no connector.

`ConnectorBehavior` is the one owner of a connection's mutations: connect an end, disconnect an end, and the queries the rules below ask.

**D4 — Its behavior.**

| Command | Result | Refused when |
|---|---|---|
| `connect X to Y` (`attach`, `clip`, `plug … into`) | a free end of X that Y takes goes into Y | X has no free end; Y is no connection point; Y has no free socket; Y takes none of X's free ends |
| `disconnect X from Y` (`detach`, `unclip`, `unplug`) | the end of X in Y comes out; when no end is left in a thing the actor does not carry, X is the actor's | no end of X is in Y |
| `disconnect X`, one end in a thing | as above | no end is in anything |
| `disconnect X`, ends in two or more things | **ambiguous**: nothing disconnects, and a stock line names the things ("The safety cable is connected to the control panel and the belt — disconnect it from which?"); the player's next command is a fresh one, not an answer held open (David, Q3 and Q-A (a), as `out` aboard with two ways, F9) | — |
| `take X` | taken | an end of X is in a thing the actor does not carry |
| `drop X` | dropped | an end of X is in a thing the actor carries or wears |

**The grammar is stock, as steering's is.** `use` gates a construct, not grammar (`story-loader/src/extension-registry.ts`, header). Steering's grammar is always registered, and the action refuses anything that is not a naval vehicle. Connecting and disconnecting are likewise standard actions in `standard-en-us.story`, and both refuse a thing that is not a connector with `not_connector`: "{You} {can't} connect {the item} to anything." Without `use connections` no thing is a connector, so every `connect` is refused that way.

**What each records.** Every command emits or refuses (DEVARCH rule 10):

| Action | Fact recorded | Refusal event | Data |
|---|---|---|---|
| `if.action.connecting` | `if.event.connected` | `if.event.connect_blocked` | `connectorId`, `pointId`, `end` (the end's name, or its index for untyped ends) |
| `if.action.disconnecting` | `if.event.disconnected` | `if.event.disconnect_blocked` | `connectorId`, `pointId`, `end`, `taken` (true when the connector came to the actor) |

D6's clauses bind to these. `on the player connecting to the belt` is the counterpart tail on the connecting action's point slot (ADR-372), and `after the player disconnecting from the control panel` the same on disconnecting's.

**Two edge cases, inferred.**
- A connector whose ends are all in things the actor carries or wears can be taken and dropped like any thing. Dropping is still refused while an end is in something the actor carries or wears.
- A connection point that holds an end can be taken. The connection stays, whatever the other end is in. What that means, for example a cable stretching between rooms, is the story's (D5).

**D5 — The tether is authored** (David, Q4). The platform does not stop a mover who is joined to something. The extension gives a story the facts to ask: the conditions below, including whether a connector **holds** a person. The story writes the consequence: a blocked exit, a refusal, a fall, a line. That covers Entropy's air-lock: the story blocks its exits, as Entropy did. When nothing is authored, the mover simply leaves, and the connector's ends stay where they are (David, Q-B (a)). The platform describes no consequence either: what a joined mover sees and is told, a cable trailing out of the air-lock into zero G for instance, is authored description, written with the same conditions.

**D6 — What a connection does is the story's.** These conditions and clauses are what a story asks with:

- `the safety cable is connected to the belt`: an end of it is in the belt.
- `the safety cable connects the belt and the air-lock panel`: one end in each.
- `the safety cable holds Alex`: one end is in Alex's connection point, or in something Alex carries or wears, and another end is in something Alex does not carry.
- `connecting` and `disconnecting` take clauses, with the counterpart tail: `after the player connecting to the belt`, `on the player disconnecting from the control panel`.

**D7 — The words** (David, Q7: "best guess"). This record chooses:

| Says | Where | Meaning |
|---|---|---|
| `use connections` | story header | turns the extension on; without it every word below is refused with the fix-it |
| `connector` | adjective, on a thing | it is a connector with two interchangeable ends |
| `ends: <n>` | line, on a connector | it has n interchangeable ends |
| `ends: <name>, <name>` | line, on a connector | its ends are typed, named as written (`ends: suit end, port end`) |
| `sockets: <n>` | line, on any thing | it is a connection point with n sockets |
| `takes: <end name> [or <end name>]` | line, on a connection point | only those typed ends fit it |
| `connected to <the thing> [and <the thing>]` | adjective, on a connector | where its ends start; a typed end goes where it fits, and a placement two ends could fill is a compile error |
| `connects at <the thing>` | line, on a person | the thing that is that person's connection point |
| `is connected to`, `connects … and …`, `holds` | conditions | D6 |

A thing given `sockets:` while `use connections` is absent is refused with the fix-it, as `wind:` off an expanse is.

**What the compiler refuses** (inferred; each one code, one fault):

| Written | Code |
|---|---|
| `connector` and `sockets:` on one thing (a connector is not itself a connection point; an adapter between two cables is a third thing with sockets) | `analysis.connector-has-sockets` |
| `ends:` with a number below 1, or the same end name twice | `analysis.connector-ends` |
| `ends:`, `connected to` or `takes:` on a thing that is not a connector or connection point, as each requires | `analysis.connection-line-owner` |
| `sockets:` with a number below 1 | `analysis.connection-sockets` |
| `takes:` naming an end no connector in the story declares | `analysis.takes-unknown-end` |
| `connected to` naming more things than the connector has ends, or more than a point has sockets for | `analysis.connected-too-many` |
| `connected to` placing a typed end where no named point takes it, or where two ends could each go | `analysis.connected-end-ambiguous` |
| `connects at` naming a thing with no `sockets:` | `analysis.connects-at-no-sockets` |
| `connects at` on a thing that is not a person | `analysis.connection-line-owner` |

**Fit.** An untyped end fits any connection point without `takes:`. A point with `takes:` takes only the typed ends it names, so an untyped end does not fit it. A typed end fits a point without `takes:`.

**The person.** `connect X to me` means the person's `connects at` thing only while the person wears or carries it. Otherwise it is refused with `no_connection_point`: "{You} {have} nothing to connect {the item} to."

**D8 — The contract.** In `packages/world-model`, behind the extension:

```typescript
/** The connector: a thing with ends, each in at most one connection point. */
interface IConnectorData {
  /** End names in order; untyped ends are named by index ('1', '2'). */
  ends: string[];
  /** Whether the ends are typed (named by the author) or interchangeable. */
  typed: boolean;
  /** End name → the connection point's entity id; absent means the end is free. */
  connectedTo: Record<string, string>;
}

/** A connection point: a thing with sockets. */
interface IConnectionPointData {
  sockets: number;
  /** Typed end names this point takes; absent means any end that fits (D7's Fit). */
  takes?: string[];
}

/** The person's own connection point, from `connects at`. */
interface IConnectsAtData {
  pointId: string;
}

class ConnectorBehavior {
  /** The free ends of a connector that fit the point and the point has room for. */
  static fittingEnds(world: WorldModel, connector: IFEntity, point: IFEntity): string[];
  /** Put an end in the point; refuses (and changes nothing) with the reason. */
  static connect(world: WorldModel, connector: IFEntity, point: IFEntity): { end: string } | { refused: 'no_free_end' | 'not_a_point' | 'no_socket' | 'no_fit' };
  /** Take the end out of the point; refuses when no end is in it. */
  static disconnect(world: WorldModel, connector: IFEntity, point: IFEntity): { end: string } | { refused: 'not_connected' };
  /** The connection points an end of the connector is in, one entry per point. */
  static pointsOf(connector: IFEntity): string[];
  /** D6's `holds`: an end in the person's point or in what they carry or wear, and an end in something they don't carry. */
  static holds(world: WorldModel, connector: IFEntity, person: IFEntity): boolean;
  /** Whether the connector may be carried off by the actor (D4's take rule). */
  static takeRefusal(world: WorldModel, connector: IFEntity, actor: IFEntity): { point: IFEntity } | undefined;
}
```

The connector's `connectedTo` is the one record of the connection. A point carries no list of what is in it; `ConnectorBehavior` answers that by asking the connectors. Both new traits register in `trait-types.ts`, `implementations.ts` and `all-traits.ts`, and are exported from both barrels (world-model root-barrel rule).

**Persistence.** The connection is trait state and saves and restores as every trait does. No save-format or version change is needed; save-format versioning is dormant.

**D9 — The cutover order.** One change, in this order:
1. Add the connector traits, `ConnectorBehavior`, the connecting and disconnecting actions (constants, lifecycle descriptors, the registry, `standard/index.ts`), their grammar, their lang, and the `connections` row in `EXTENSION_REGISTRY` and Chord's manifest. Regenerate the grammar, the manifest and the alias catalog.
2. Add the Chord words, gates and conditions (D7) and their loader lowering; amend `chord.ebnf` and re-record its pin without a bump.
3. Move UPPS: the plate to scenery, the placard onto a wall supporter, the twine decided at the phase; re-record its a373 cards.
4. Remove attachment and tying (D1). That covers `traits/attached/` and its registrations, `attachment-shared.ts`, taking's, removing's and pulling's attached branches, `tying/` and `untying/` with their constants and lifecycle rows, their grammar, `lang-en-us/src/actions/tying.ts` and `untying.ts`, `data/verbs.ts`'s tying entries, the alias-map rows, the Chord words and the `attached` adjective. Regenerate again, and check `world-index/src/non-physical-nouns.generated.ts`.
5. Docs: grammar-changes rows, the guide section, the Docs tab.

### The safety cable, in Chord

Every line marked `## unshipped` is this record's syntax; the rest is shipped Chord.

```chord
story
  title: Entropy
  authors:
    David Cornelson
  id: entropy
  story-version: 0.1.0
  use connections                                      ## unshipped

create Alex
  a person
  playable
  starts in the Caledonia Control Room
  wears the belt
  carries the flight skin
  connects at the belt                                 ## unshipped

  You.

create the belt
  a thing, wearable
  sockets: 1                                           ## unshipped

  Your belt, with a clip for a safety cable.

create the safety cable
  a thing, connector, connected to the control panel and the control panel   ## unshipped: `connector`, `connected to`
  aka cable, tether
  in the Caledonia Control Room

  A short (one meter) length of sofsteel cabling, used to protect
  against emergency depressurization while in space.

create the control panel
  a supporter, scenery
  sockets: 2                                           ## unshipped
  in the Caledonia Control Room

  A battered control panel.

create the air-lock panel
  a supporter, scenery
  sockets: 2                                           ## unshipped
  in the Air-lock

  A panel with three buttons, and two sockets below them.

create the flight skin
  a thing, switchable

  A flight skin.

  on the player switching_on while the safety cable is connected to the belt   ## unshipped condition
    refuse skin-tethered
  end on

create the Caledonia Control Room
  a room

  The wrecked control room of the Caledonia.

  in to the Air-lock

create the Air-lock
  a room

  The air-lock.

  out to the Caledonia Control Room
  out is blocked while the safety cable holds Alex: tethered-in-air-lock      ## unshipped condition

define phrase skin-tethered
  You cannot activate the flight skin while the safety cable is attached to your belt.
end phrase

define phrase tethered-in-air-lock
  You can't leave the air-lock while attached to the safety cable.
end phrase
```

Play, as D4–D6 give it:

```
> take cable
You can't carry the safety cable while it's connected to the control panel.
> disconnect cable
You disconnect an end of the safety cable from the control panel.
> disconnect cable from panel
You disconnect the other end of the safety cable from the control panel, and take it.
> in
The air-lock.
> connect cable to me
You connect an end of the safety cable to the belt.
> connect cable to air-lock panel
You connect the other end of the safety cable to the air-lock panel.
> out
You can't leave the air-lock while attached to the safety cable.
> switch on flight skin
You cannot activate the flight skin while the safety cable is attached to your belt.
```

The first `disconnect cable` is not ambiguous: both ends are in one thing, the control panel, so it frees one. Had the ends been in the panel and the belt, it would be (D4).

A typed connector, for contrast:

```chord
create the air hose
  a thing, connector                                   ## unshipped
  ends: suit end, port end                             ## unshipped
  in the Suit Room

  A ribbed air hose.

create the space suit
  a thing, wearable
  sockets: 1                                           ## unshipped
  takes: suit end                                      ## unshipped
  in the Suit Room

  A pressure suit.

create the air port
  a thing, scenery
  sockets: 1                                           ## unshipped
  takes: port end                                      ## unshipped
  in the Suit Room

  An air port in the bulkhead.
```

`connect hose to suit` puts the suit end in. `connect hose to port` then puts the port end in. Connecting it to the suit a second time is refused, since the suit has no free socket.

## Consequences

- No thing has an anchor field. Hanging is containment, fixed is scenery, joined is a connector's state, and connectors exist only under `use connections`.
- **Tying is gone until rope exists.** The rope-to-two-posts scenario waits on a rope extension: a connector with two ends in two posts, plus tying's words. Two identical posts still need telling apart; that is the same-name problem of the syntax round, not this record's.
- **UPPS changes.** The inspection plate becomes scenery with its own refusal. The route placard goes onto a wall supporter. The parcel twine and its tying cards lose their action: either they are removed, or the twine becomes a connector under `use connections`. That is UPPS content, decided at the phase. Its a373 cards are re-recorded.
- **The work done today that this removes.** The P8-1 and P8-3 fixes touch code D1 deletes; they stand until the phase that deletes it.
- **Supersession, owned.** The session that flips this record to ACCEPTED adds supersession notes to ADR-373 D1 and D6 naming this record, in the same commit as the flip. ADR-373's D2–D5 and D7's breakable half stand. Its Status line stays ACCEPTED, with a line naming the superseded decisions.
- Dungeo is untouched. It owns its `tie` grammar, and none of its things are attached.

## Acceptance criteria

Each criterion runs on the real engine, through a compiled Chord story loaded by the story loader, unless it says otherwise. Each asserts world state, not just a message id.

1. **The safety cable, end to end.** The D7 story compiles, and its transcript plays as written. After each step the cable's `connectedTo` and its location are asserted. SELF-VERIFYING.
2. **Connect refusals.** Each of `no_free_end`, `not_a_point`, `no_socket`, `no_fit` and `not_connector` is refused with `connectedTo` unchanged: a full cable, a plain thing, a full point, a typed end at the wrong point, and a thing without `connector`. SELF-VERIFYING.
3. **Disconnect.** One end frees that end. The last end out of an uncarried point puts the connector in the actor's hands (`taken: true`). The ambiguous case frees nothing and names both points. `not_connected` changes nothing. SELF-VERIFYING.
4. **Take and drop.** A take is refused while an end is in an uncarried thing. A connector whose ends are all in carried things is taken. A drop is refused while an end is in a carried or worn thing. Taking a connection point that holds an end keeps the connection. SELF-VERIFYING.
5. **The person.** `connect X to me` reaches the `connects at` thing while it is worn, and refuses `no_connection_point` once it is dropped. SELF-VERIFYING.
6. **The tether is authored.** With no authored block, the player walks out of the air-lock and the cable's ends are unchanged. With D7's blocked exit, the exit refuses with the story's line. SELF-VERIFYING.
7. **Conditions.** `is connected to`, `connects … and …` and `holds` each read true and false on the live state, through a `while` the story reacts to. SELF-VERIFYING.
8. **The facts and clauses.** Each successful command records its event with D4's data. `on the player connecting to the belt` fires only for that point. `after the player disconnecting from the control panel` fires once. SELF-VERIFYING.
9. **Compile gates** (chord tests, no engine). Each code in D7's table fires alone on its fault, and a story using any connection word without `use connections` is refused with the fix-it. SELF-VERIFYING.
10. **Attachment is gone.** `attached to`, `detachable` and `while … is attached` are refused as unknown words. `tie rope to hook` is not understood in a story without its own grammar. `AttachedTrait` and the tying actions no longer exist, which `tsc` and a grep show. Dungeo's chain passes unchanged. PREMISE-DEPENDENT: its premise, that nothing else reads the removed code, is established by the D9 step-4 grep and the full `turbo test:ci` run.
11. **UPPS.** The plate refuses taking with its own line. The placard is taken from the wall. The re-recorded cards pass in one run. SELF-VERIFYING.

## Session

289aa0 (2026-10-22), alignment-fixes Phase 11 on `chord-4-0`. The `tied to` work this replaces (ledger P8-4) was reverted uncommitted in the same session; the P8-1 to P8-3 fixes and F24/F25 stand.
