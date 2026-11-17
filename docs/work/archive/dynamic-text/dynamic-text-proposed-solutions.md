# Dynamic Text — Proposed Solutions (worked examples)

**Status:** design sketch / pre-ADR. Companion to `dynamic-text-scenarios.md`.
**Date:** 2026-06-25
**Purpose:** for each gap, show the **author code** and the **expected output** so the
direction is concrete before the ADRs are written.

> **Conventions.** `🆕` marks *proposed, not implemented* API/syntax. Everything else is
> existing. Examples reuse the Family Zoo / Dungeo world.
>
> **One syntax constraint drives several proposals:** the existing placeholder parser
> splits on `:` and treats the last segment as the data name (`{cap:the:item}` =
> formatters `cap`,`the` over param `item`). So new **conditional / variation**
> constructs cannot use `:` internally — this doc uses a leading **sigil + pipe** form
> (`{?…|…|…}`, `{#…|…|…}`). Final syntax (sigil-pipe vs an I7-style `[if]…[else]…[end]`
> bracket macro) is an open ADR-B question, called out at the end.

---

## ADR-A — Computed adjectives & dynamic names

**Mechanism.** Traits contribute *state-derived adjectives* at report time. `entityInfoFrom()`
walks the entity, collects `IdentityTrait.adjectives` (static) **plus** every trait that
implements a new `🆕 AdjectiveContributor` capability, and fills `🆕 EntityInfo.adjectives`.
The `a`/`an`/`the`/`list` formatters render adjectives ahead of the noun and agree the
article over the **whole** phrase. **No template syntax changes** — the magic is in the
data contract + formatters.

```ts
// 🆕 platform: standard stateful traits opt in
class OpenableTrait implements AdjectiveContributor {
  contributeAdjectives(): string[] {
    return this.isOpen ? ['open'] : (this.showClosedAdjective ? ['closed'] : []);
  }
}
```

### A1 — the headline: open vs closed cabinet

```ts
const cabinet = world.createEntity('cabinet', EntityType.CONTAINER);
cabinet.add(new IdentityTrait({ name: 'cabinet', article: 'a' }));
cabinet.add(new OpenableTrait({ isOpen: false, showClosedAdjective: true })); // 🆕 flag
```

Template (unchanged syntax):

```
There is {a:cabinet} on the north wall.
```

Expected output:

```
isOpen=false →  There is a closed cabinet on the north wall.
isOpen=true  →  There is an open cabinet on the north wall.
```

The article flips `a → an` automatically because agreement runs over `"open cabinet"`.

### A2 — stacked adjectives (static + dynamic)

```ts
const chest = world.createEntity('chest', EntityType.CONTAINER);
chest.add(new IdentityTrait({ name: 'chest', article: 'a',
  adjectives: ['small', 'iron'] }));        // static, author-ordered
chest.add(new LockableTrait({ isLocked: true }));  // 🆕 contributes 'locked'
```

```
You spot {a:chest} in the corner.
```

```
→ You spot a small locked iron chest in the corner.
```

Ordering rule (🆕, ADR-A): `static-opinion → static → dynamic-state → noun`, deduped.
Authors override by listing adjectives explicitly.

### A3 — dynamic *name* (not just adjective)

Most "name changes" are really adjectives (handled above). True noun swaps use a 🆕
computed-name hook consulted by `entityInfoFrom()`:

```ts
const figure = world.createEntity('figure', EntityType.ACTOR);
figure.add(new IdentityTrait({ name: 'hooded figure', article: 'a' }));
// 🆕 a story behavior overrides the printed name once identity is revealed:
figure.add(new DisguiseTrait({ realName: 'old wizard', revealed: false }));
// DisguiseTrait implements PrintedName: revealed ? 'old wizard' : undefined
```

```
{cap:a:figure} blocks the path.
```

```
revealed=false →  A hooded figure blocks the path.
revealed=true  →  An old wizard blocks the path.
```

### A4 — a list that carries each item's state (ADR-A feeding ADR-C / S21)

```ts
// room contains an open cabinet and a locked drawer
```

```
Against the wall you see {list:furniture}.
```

```
→ Against the wall you see an open cabinet and a locked drawer.
```

No new list code — `{list:}` already consumes `EntityInfo[]`; it now gets adjectives for free.

---

## ADR-C — Reusable contents listing & relational placement

**Mechanism.** Extract the contents-listing logic (today hardcoded in `examining-data.ts`
/ `looking-data.ts`) into a 🆕 `{contents:entity}` formatter that returns the entity's
direct contents as a grouped natural-language list, plus a relation→preposition phrase
producer for placement.

### C1 — list any container's contents in any message

```ts
const box = world.createEntity('box', EntityType.CONTAINER);
// ... a brass key and a coin are moved into the box
```

```
You pry the lid up. Inside {the:box} {is:box} {contents:box}.
```

```
→ You pry the lid up. Inside the box is a brass key and a coin.
empty → You pry the lid up. The box is empty.   (🆕 empty-aware variant)
```

`{contents:box}` internally builds `EntityInfo[]` (so adjectives from ADR-A apply) and
runs the `list` formatter. Depth is bounded; 🆕 `{contents.deep:box}` recurses one level:
`"a box (in which is a ring)"`.

### C2 — relational placement from the world model

```ts
const lantern = world.createEntity('lantern', EntityType.ITEM);
world.moveEntity(lantern.id, shelf.id);   // shelf is a SUPPORTER
```

```
{cap:contents-of:shelf}        // 🆕 placement-aware producer
```

```
→ On the shelf is a lantern.
```

The preposition (`on`/`in`/`under`) comes from the support/containment relation, not author prose.

### C3 — author-declared placement for fixed scenery (walls, etc.)

```ts
const sign = world.createEntity('welcome sign', EntityType.SCENERY);
sign.add(new IdentityTrait({ name: 'welcome sign', article: 'a' }));
sign.add(new SceneryTrait({ placement: 'on the north wall' }));  // 🆕 optional field
```

Room description auto-appends placed scenery (🆕 opt-in):

```
→ A welcome sign hangs on the north wall.
```

---

## ADR-B — Conditionals, variation & first-time text (the design-tension one)

**Mechanism & key boundary.** Conditionals read **params only**, never arbitrary world
state — the action/handler still decides what to expose. This keeps the separation
mostly intact: the template branches on a value the report layer chose to publish.

### B1 — inline conditional (reads a param)

```ts
// action/report builds the param:
params: { isOpen: cabinet.get(OpenableTrait)!.isOpen }
```

```
The cabinet is {?isOpen | open | closed}.          // 🆕  {? param | then | else }
```

```
→ The cabinet is open.     /     The cabinet is closed.
```

Negation and the else-less form: `{?!isLocked | unlocked}` → emits "unlocked" only when
`isLocked` is false, and renders **nothing** (punctuation-safe) otherwise.

### B2 — random variation (seeded, save-safe)

```
{#random | You can't go that way. | There's no exit there. | The wall blocks you. }
```

```
turn 4 → There's no exit there.
turn 9 → The wall blocks you.
```

🆕 `#random` is seeded from deterministic turn/entity state (never `Math.random()`), so a
save/restore or replay reproduces the exact same line.

### B3 — cycling (needs persistent per-message state)

```
The parrot squawks: "{#cycle | Pieces of eight! | Hello! | Awk! }"
```

```
turn 1 → Pieces of eight!
turn 2 → Hello!
turn 3 → Awk!
turn 4 → Pieces of eight!   (wraps)
```

Selectors: `#cycle` (wrap), `#stop` (advance, hold last), `#shuffle`. Position is stored
in a 🆕 **text-state store** keyed by `(entityId, messageKey)`, serialized with the world
(this is the load-bearing new state for all of section D).

### B4 — first-time vs subsequent + the room bugfix

```
{#first | The dusty study, untouched for years. | The dusty study. }
```

```
1st visit → The dusty study, untouched for years.
later     → The dusty study.
```

Plus the near-term **bugfix** this surfaces: wire `RoomTrait.initialDescription` to the
`visited` flag and remove the `// first visit hardcoded true` in `looking-data.ts:103`, so
built-in initial-vs-revisit descriptions actually switch.

---

## ADR-D — Output object & gendered pronouns

**Mechanism.** Extend the existing perspective/placeholder resolver
(`lang-en-us/perspective/`) to **objects**: the engine tracks the last-mentioned entity per
turn; `🆕 {It}`/`{Them}` resolve against it; `🆕 {They}/{Them}/{Their}` for actors use the
already-present `ActorTrait.pronouns`.

### D1 — object pronoun for the last-mentioned thing

```
You open {the:cabinet}. {cap:It} is empty.
```

```
→ You open the cabinet. It is empty.
plural subject → You gather the coins. They jingle in your pack.
```

### D2 — gendered NPC (data already exists)

```ts
alice.add(new ActorTrait({ pronouns: 'she/her' }));
```

```
{cap:the:npc} nods. You hand the map to {object:npc}.   // 🆕 {object:npc} → her
```

```
→ Alice nods. You hand the map to her.
```

---

## ADR-E — Verbatim / preformatted block

**Mechanism.** A 🆕 `[pre: … ]` block decoration that preserves exact whitespace, renders
as a monospace block (browser: `<span class="sharpee-pre">` with `white-space: pre`;
terminal: passthrough), and is **exempt** from the deferred whitespace-collapse.

### E1 — ASCII map / banner

```
You unfold the crumpled map:

[pre:
  +----+----+
  | N  |    |
  +----+----+
  |    | SE |
  +----+----+
]
```

```
→ (rendered verbatim, monospace, columns aligned)
```

### E2 — score table

```
[pre:
  Treasure        Points
  ----------      ------
  gold coin           10
  jeweled egg         25
]
```

Inline emphasis still works *outside* `[pre:]`; inside, brackets are literal unless escaped.

---

## ADR-F — Appendable / compositional output (deferred close / extend)

**Mechanism.** A template declares a 🆕 named **append slot** `{+key}` with the terminator
*outside* it. During the turn, any number of contributors push clauses to `key`; at
finalize the assembler orders them (priority, then stable), joins them with **one central
punctuation rule** (serial commas + final "and"), and renders into the slot — or renders
`""` if nothing contributed. Contributors hand the assembler **bare clause content**; the
**slot owns** the lead-in and connectives, so punctuation stays correct for 0 / 1 / N.

### F1 — the cabinet detail slot

```
Template:  {cap:a:cabinet}{+cabinet-detail}.      // 🆕 {+key} append slot; "." is outside it
```

Contributions to `cabinet-detail` (each optional, any order):

```ts
// platform, automatic from state — the ADR-A / ADR-C machinery acting as contributors:
OpenableTrait   → contributes  "which is open"
ContainerTrait  → contributes  "containing {contents:cabinet}"   // only if open & non-empty

// a story behavior, during the turn:
ctx.appendTo('cabinet-detail', 'glowing faintly');   // 🆕 bare clause, no punctuation
```

Output by what actually contributed:

```
nothing            →  A cabinet.
open only          →  A cabinet, which is open.
open + contents    →  A cabinet, which is open, containing a brass key and a coin.
open + contents +  →  A cabinet, which is open, containing a brass key and a coin,
  story glow            and glowing faintly.
```

One template line, one `.`; everything between the noun and the period is dynamic and may
be empty.

### F2 — "close `.` / extend `, revealing …`" across independent contributors

The opening action declares the slot; the container contributes its contents; a daemon adds
atmosphere — none of them know about the others:

```ts
// opening action template:
"You open {the:box}{+open-box}."

// ContainerBehavior, on open with contents:
ctx.appendTo('open-box', 'revealing {contents:box}');                  // 🆕

// a story daemon watching the box (later priority):
ctx.appendTo('open-box', 'a puff of cedar-scented dust escapes', { priority: 90 }); // 🆕
```

```
empty box        →  You open the box.
contents         →  You open the box, revealing a brass key and a coin.
contents + dust  →  You open the box, revealing a brass key and a coin, and a puff of
                    cedar-scented dust escapes.
```

### Punctuation reconciliation (the invariant, as ACs)

```
0 contributions →  stem + "."                       (no dangling comma)
1 contribution  →  ", " + clause + "."
N contributions →  ", " + c1 + ", " + … + ", and " + cN + "."   (serial comma per story setting)
```

Contributions keep `EntityInfo` / decorations intact (ADR-A adjectives, `[em:…]`); ordering
is deterministic (priority then stable) so saves and transcript tests reproduce the sentence.

---

## Minor — numbers

```
You count {words:coins} coins.            // 🆕 {words:n}   → "fifteen"
This is your {ordinal:attempts} attempt.  // 🆕 {ordinal:n} → "third"
```

```
→ You count fifteen coins.   /   This is your third attempt.
```

---

## Open questions these examples expose (for the ADRs)

1. **Conditional/variation syntax (ADR-B):** sigil-pipe `{?p|a|b}` / `{#cycle|…}` (shown
   here, parser-cheap, avoids the `:` collision) **vs** an I7-flavored bracket macro
   `[if open]…[else]…[end]` (prettier, more parser work, reopens block-control parsing).
   Recommendation: sigil-pipe.
2. **Predicate source (ADR-B):** params-only (shown — preserves separation) **vs** giving
   templates read-only access to entity state (more powerful, more coupling).
   Recommendation: params-only first.
3. **Determinism (ADR-B):** confirm the seed source for `#random`/`#shuffle` so saves and
   the transcript-test harness stay reproducible.
4. **Adjective salience defaults (ADR-A):** does an openable show "closed" by default, or
   only "open"? Per-trait default + per-entity override (`showClosedAdjective`).
5. **Where placed scenery renders (ADR-C):** inside the room body, or a trailing
   "Also here:" clause? Affects C2/C3 phrasing.
6. **Contributor contract (ADR-F):** contributor supplies **bare clause content** with the
   slot owning lead-ins/connectives (shown — keeps punctuation central and clean) **vs**
   contributor supplies its own lead-in/connective (more flexible, but reintroduces the
   fragile first/last problem). Recommendation: bare clause + slot-owned grammar.
