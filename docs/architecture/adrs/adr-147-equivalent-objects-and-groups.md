# ADR-147: Equivalent Objects and Groups

## Status: DRAFT

## Date: 2026-04-09

## Context

### The Problem

Sharpee cannot handle the "bag of coins" scenario. When an author creates multiple entities with the same name (20 gold coins in a bag), three systems break:

1. **Parser disambiguation**: "take coin" triggers "Which coin do you mean?" with no way to distinguish them — they're identical.
2. **Listing**: Inventory and room descriptions show "a gold coin, a gold coin, a gold coin..." instead of "20 gold coins."
3. **Numeric commands**: Players expect "take 3 coins", "drop all coins", "count coins" — none of these work.

This is a solved problem in other IF platforms. TADS 3 provides `isEquivalent` (interchangeable objects the parser picks silently) and `CollectiveGroup` (grouped listings). Inform 7 treats instances of the same kind as indistinguishable when they share all properties. Sharpee has no equivalent mechanism.

### What Exists Today

- `IdentityTrait.nounType` supports `'mass'` for uncountable nouns ("some water") — but mass nouns are a single entity, not multiple discrete objects.
- `IdentityTrait.grammaticalNumber` supports `'plural'` for inherently plural items ("scissors") — but this is grammatical, not about object groups.
- `IdentityTrait.adjectives` helps disambiguate different objects ("red button" vs "yellow button") — but equivalent objects have no distinguishing adjectives.
- The parser returns `AMBIGUOUS` when multiple entities match a noun phrase and offers no resolution path for identical objects.
- Room/inventory listings format each entity independently with no grouping.

### Design Principles

**Equivalent objects are interchangeable.** When the parser matches "coin" and finds 5 gold coins, it silently picks one. There is no "Which coin do you mean?" — any coin will do.

**Listings group equivalent objects.** Instead of listing each entity, the display layer shows "5 gold coins" or "a bag (containing 20 gold coins)."

**Numeric commands work on groups.** "Take 3 coins" takes 3 arbitrary coins. "Drop all coins" drops them all. "Count coins" reports how many.

**Equivalence is opt-in.** Not all same-named objects are equivalent. Two "swords" might have different enchantments. The author marks objects as equivalent explicitly.

**Equivalence can break.** A coin the wizard enchants is no longer equivalent to the others. The system handles objects entering and leaving equivalence groups.

## Decision

### 1. Equivalence Flag on IdentityTrait

```typescript
class IdentityTrait {
  // ... existing fields ...

  /**
   * Equivalence group ID.
   * Objects with the same equivalenceGroup value are interchangeable —
   * the parser picks any one silently, and listings group them.
   * If undefined, the object is unique (current behavior).
   */
  equivalenceGroup?: string;
}
```

The group ID is an arbitrary string chosen by the author. Objects are equivalent if and only if they share the same `equivalenceGroup` value.

```typescript
// Author creates coins
for (let i = 0; i < 20; i++) {
  const coin = world.createEntity(`gold-coin-${i}`, EntityType.OBJECT);
  coin.add(new IdentityTrait({
    name: 'gold coin',
    equivalenceGroup: 'gold-coin',
    aliases: ['coin'],
  }));
  world.moveEntity(coin.id, bag.id);
}
```

### 2. Parser: Silent Resolution

When the parser resolves a noun phrase and finds multiple candidates in the same equivalence group:

1. If the command needs one object (e.g., "take coin"), pick the first one. No disambiguation prompt.
2. If the command specifies a number (e.g., "take 3 coins"), pick that many. If fewer exist, take all and report how many.
3. If the command uses ALL (e.g., "take all coins"), resolve to all members of the group.

When candidates span multiple equivalence groups (e.g., "take coin" matches gold coins and silver coins), disambiguate between groups, not individual objects: "Which do you mean, the gold coin or the silver coin?"

### 3. Numeric Noun Phrases

The parser recognizes numeric modifiers on noun phrases, both as digits and words:

```
take 3 coins           → take 3 from equivalence group
drop five gold coins   → drop 5 from equivalence group
put 2 coins in box     → put 2 from equivalence group
pay clerk ten silver   → give 10 from equivalence group
trade one gold for hat → give 1 from equivalence group
```

Word-form numbers ("one" through "twenty", "dozen", "hundred") are normalized to their numeric value during tokenization, before noun phrase resolution. This means "take three coins" and "take 3 coins" produce identical parse results. The parser handles:

- Cardinal digits: `1`, `3`, `20`, `100`
- Cardinal words: `one` through `twenty`, `thirty`, `forty`, `fifty`, `hundred`
- Common quantities: `a` / `an` (= 1), `dozen` (= 12), `pair` (= 2), `half dozen` (= 6)

The number applies to the equivalence group. If non-equivalent objects match, numeric modifiers are rejected ("You can only do that with identical items.").

### 4. Listing Groups

The display layer groups equivalent objects in all listings:

**Room contents:**
```
You can see a leather bag (containing 20 gold coins, a ruby, and 3 silver coins).
```

**Inventory:**
```
You are carrying:
  a leather bag
    20 gold coins
    a ruby
    3 silver coins
  a torch (lit)
```

**Action reports:**
```
> take 3 coins
Taken (3 gold coins).

> drop all coins
Dropped (17 gold coins).
```

The grouping uses the entity's `name` with a count prefix. The plural form comes from `IdentityTrait` (existing `grammaticalNumber: 'plural'` or a new `pluralName` field).

### 5. Multi-Location Scenario

27 gold coins exist: 5 on the oak table, 5 in the leather bag (which the player carries), and 17 loose in the player's coat pocket (inventory).

**Room description (player is carrying the bag and pocket coins):**
```
Oak Study
A heavy oak table dominates the room.

On the oak table you can see 5 gold coins and a candlestick.
```

**Inventory:**
```
You are carrying:
  17 gold coins
  a leather bag
    5 gold coins
    a ruby
  a torch (lit)
```

**Taking from the table:**
```
> take 3 coins
(from the oak table)
Taken (3 gold coins).

> take coins
(from the oak table)
Taken (2 gold coins).
```

When coins exist in both the room and inventory, "take coins" resolves to the room's coins (taking prefers objects not already carried). The parser doesn't ask "which coins?" — all gold coins are equivalent, and the action scope determines which ones.

**Putting coins in the bag:**
```
> put 5 coins in bag
(from your pocket)
Done (5 gold coins put in the leather bag).
```

When the source is ambiguous (coins in pocket vs. coins already in bag), the action prefers coins NOT already in the target container.

**Counting across locations:**
```
> count coins
You have 22 gold coins (17 in your pocket, 5 in the leather bag).

> count coins on table
There are 5 gold coins on the oak table.

> count all coins
There are 27 gold coins in total (5 on the oak table, 5 in the leather bag, 17 in your pocket).
```

`count` without a location qualifier reports what the player has. `count all` reports everything in scope.

**Moving between containers:**
```
> put all coins in bag
Done (17 gold coins put in the leather bag).

> inventory
You are carrying:
  a leather bag
    22 gold coins
    a ruby
  a torch (lit)

> take 10 coins from bag
Taken (10 gold coins).
```

**Explicit source-to-destination transfer:**
```
> move 5 coins from pocket to bag
Done (5 gold coins moved from your pocket to the leather bag).

> move 3 coins from bag to table
Done (3 gold coins moved from the leather bag to the oak table).

> move coins from table to pocket
Done (5 gold coins moved from the oak table to your pocket).
```

The `move ... from ... to ...` pattern is a compound command that names both source and destination, eliminating all ambiguity. This is the natural phrasing when the player has equivalent objects in multiple locations and wants precise control over which group moves where. Without it, transferring coins between two carried containers requires "take from X" then "put in Y" — two commands for one intent.

The parser recognizes these patterns:
- `move <N> <noun> from <container> to <container>`
- `move <noun> from <container> to <container>` (all matching)
- `transfer <N> <noun> from <container> to <container>` (alias)

This maps to a variant of the putting action where the source is explicit rather than inferred from inventory.

**Compound giving across equivalence groups:**
```
> pay clerk 6 gold coins and 1 silver
You give the clerk 6 gold coins and a silver coin.

> give clerk 3 gold coins, 2 silver coins, and the ruby
You give the clerk 3 gold coins, 2 silver coins, and the ruby.

> pay clerk 10 gold coins
You only have 7 gold coins. Give all of them?
> yes
You give the clerk 7 gold coins.
```

The parser recognizes compound noun phrases joined by "and" or commas, where each element can have its own numeric modifier and equivalence group. This enables natural multi-item transactions:

- `give <NPC> <N> <noun> and <N> <noun>` — multiple equivalence groups in one command
- `pay <NPC> <N> <noun>` — alias for give (story-defined, maps to giving action)
- Mixed equivalent and unique objects in the same command: "3 gold coins, 2 silver coins, and the ruby"

When the player doesn't have enough, the action reports the shortfall and optionally offers a partial transaction. The story's giving action (or a currency-aware interceptor) handles the business logic — the platform provides the parsing and resolution.

**Selling — receiving equivalent objects:**
```
> sell scarf for 10 silver
The clerk takes the scarf and hands you 10 silver coins.

> sell ruby for 5 gold and 3 silver
The clerk takes the ruby and hands you 5 gold coins and 3 silver coins.

> sell scarf for 10 silver
The clerk shakes his head. "That scarf isn't worth 10 silver."
```

`sell <item> for <N> <noun>` is a story action that involves both giving an item and receiving equivalent objects as payment.

**Barter — trading unique objects:**
```
> trade scarf for hat
The clerk takes the scarf and hands you the fur hat.

> trade 3 gold coins for the lantern
The clerk takes 3 gold coins and hands you the brass lantern.

> trade scarf for hat
The clerk shakes his head. "I don't want that."
```

`trade <noun> for <noun>` is the general form — both sides can be unique objects, equivalent groups with counts, or a mix:

- `trade scarf for hat` — unique for unique
- `trade 3 gold coins for the lantern` — equivalent group for unique
- `sell ruby for 5 gold and 3 silver` — unique for equivalent groups (sell is an alias)
- `trade 2 silver coins for 1 gold coin` — equivalent group for equivalent group

All four forms resolve to the same underlying mechanic: items on the left move to the NPC, items on the right move to the player. The platform provides:

- Parsing: `sell/trade/barter <noun-phrase> for <noun-phrase>` — each side is a compound noun phrase that can include numeric modifiers and "and" conjunctions
- Resolution: the left side resolves against the player's inventory, the right side resolves against the NPC's inventory (or is created on the fly for unlimited merchant stock)
- Transfer: `world.moveEntity()` for every object on both sides

The business logic — whether the merchant accepts the trade, what prices they offer, haggling — lives entirely in the story layer. The platform handles the grammar pattern and the multi-object resolution. A merchant NPC would typically use an action interceptor or story-specific action that validates the trade against authored price tables or barter rules.

**Key rules:**
- **Every transaction is real entity mutation.** "Pay clerk 6 gold coins" calls `world.moveEntity()` six times — 6 coin entities move from the player to the clerk. "Sell scarf for 10 silver" moves the scarf entity to the clerk AND moves 10 silver coin entities from the clerk to the player. There is no virtual ledger. After the transaction, the clerk physically has the scarf and the 6 gold coins in their inventory, and the player physically has the 10 silver coins. `world.getLocation(coin.id)` returns the clerk's entity ID. This is auditable, saveable, and testable — the world model is the source of truth.
- Equivalence grouping is **per-location**. The table has "5 gold coins" and the bag has "5 gold coins" — they're listed separately because they're in different containers.
- "Take coins" resolves to the nearest accessible group not already in inventory.
- "Put coins in X" resolves to coins in inventory (pocket), not coins already in X.
- "Take N coins from bag" explicitly targets a container.
- Compound noun phrases ("6 gold and 1 silver") resolve each element independently against its equivalence group.
- When ambiguity between locations is unresolvable, the parser asks: "Which gold coins do you mean, the gold coins on the table or the gold coins in the bag?"

**Consumption — using equivalent objects as ammunition or reagents:**
```
> shoot arrow at target
(first taking an arrow from the quiver)
The arrow flies true and strikes the target.

> shoot arrow at target
(first taking an arrow from the quiver)
The arrow glances off the target and clatters to the floor.

> count arrows
You have 18 arrows (in the quiver).

> look
Practice Range
A straw target stands against the far wall. 2 arrows lie on the floor.

> take arrows
Taken (2 arrows).

> put arrows in quiver
Done (2 arrows put in the quiver).
```

"Shoot arrow at target" resolves "arrow" against the equivalence group. The arrow isn't in the player's hands yet — it's in the quiver — so Sharpee's implicit take fires, picking any one from the group without disambiguation. The story's shooting action then consumes the arrow by moving it — `world.moveEntity(arrow.id, room.id)` puts the spent arrow on the ground, or `world.removeEntity(arrow.id)` destroys it entirely. The arrow is a real entity before, during, and after the shot. Same pattern applies to any consumable equivalent: throw a knife, cast a spell using a reagent, load a single bullet.

The player never needs to say "shoot arrow 7" — any arrow will do. Implicit take + equivalence group resolution handles it. And because spent arrows are real entities on the floor, the player can pick them up and reuse them.

**Silent implicit take.** Today, implicit take always announces "(first taking the arrow from the quiver)." But when the taking is obvious from context — of course you nock an arrow to shoot it — the message is noise. Authors should be able to suppress it:

```typescript
// In the story's shooting action validate():
const carryCheck = context.requireCarriedOrImplicitTake(arrow, { silent: true });
```

When `silent: true`, the implicit take still happens (the arrow entity moves to the player's inventory, `world.moveEntity()` fires, the mutation is real) but no `if.event.implicit_take` event is emitted, so no "(first taking...)" text appears. The player just sees:

```
> shoot arrow at target
The arrow flies true and strikes the target.
```

This requires a small extension to `requireCarriedOrImplicitTake()` — an options parameter with a `silent` flag. The default remains `false` (announce the take) for backward compatibility. The silent option is useful beyond equivalence groups — any action where the implicit take is narratively obvious ("light match", "drink potion", "read scroll") benefits from it.

### 6. Plural Name

Add an optional plural form to IdentityTrait:

```typescript
class IdentityTrait {
  // ... existing fields ...

  /**
   * Plural form of the name, used when listing groups.
   * Defaults to name + "s" if not set.
   */
  pluralName?: string;
}
```

```typescript
new IdentityTrait({
  name: 'gold coin',
  pluralName: 'gold coins',
  equivalenceGroup: 'gold-coin',
})
```

### 6. Breaking Equivalence

When an object changes in a way that makes it unique, the author clears its equivalence group:

```typescript
// The wizard enchants one coin
const enchantedCoin = pickOneFromGroup(world, 'gold-coin');
const identity = enchantedCoin.get(IdentityTrait);
identity.name = 'enchanted gold coin';
identity.equivalenceGroup = undefined; // No longer equivalent
```

The object immediately becomes unique for parser disambiguation and listing purposes.

Objects can also be moved into a new equivalence group:

```typescript
identity.equivalenceGroup = 'enchanted-coin'; // New group
```

### 7. COUNT Command

Add a `count` command to stdlib:

```
> count coins
You have 17 gold coins.

> count coins in bag
The leather bag contains 17 gold coins.
```

This is a new stdlib action that reports the count of equivalent objects matching the noun phrase in a given scope (inventory or container).

### 8. AuthorModel Convenience

`AuthorModel` provides a helper for bulk creation:

```typescript
const author = new AuthorModel(world);

// Create 20 equivalent coins in the bag
author.createEquivalent({
  count: 20,
  idPrefix: 'gold-coin',
  name: 'gold coin',
  pluralName: 'gold coins',
  equivalenceGroup: 'gold-coin',
  location: bag.id,
  traits: [/* additional traits if needed */],
});
```

## Consequences

### Positive

- Authors can create natural collections of identical objects (coins, arrows, torches)
- Parser handles identical objects without frustrating disambiguation
- Listings are clean and readable
- Numeric commands enable resource management gameplay
- OBJ-014 (Currency/Money) pattern becomes fully implementable
- PUZ-023 (Inventory Constraint) gains granularity — count matters, not just "have or don't have"

### Negative

- Parser complexity increases — numeric noun phrases and group resolution are new parsing paths
- Listing logic needs to group before formatting — ordering and grouping must be consistent
- Save/restore must handle individual entities even when displayed as groups — 20 coins are 20 entities in the world model
- Performance consideration: 100+ equivalent entities in scope shouldn't degrade parser matching

### Neutral

- Non-equivalent objects are unaffected — default behavior is unchanged
- Existing stories don't need modification
- The feature is opt-in per entity via `equivalenceGroup`

## Alternatives Considered

### A. Virtual Quantity (Single Entity with Count)

Instead of 20 coin entities, one entity with `quantity: 20`. Splitting and merging adjusts the count.

**Rejected because:**
- Breaks the entity model — a single entity can only be in one location. If the player takes 5 coins from a bag of 20, you'd need to split into two entities (5 in inventory, 15 in bag). This is the entity equivalent of cell division and creates edge cases everywhere.
- Actions that operate on individual objects (enchant one coin) require splitting first.
- TADS tried both approaches and found real entities with equivalence flags simpler to reason about.

### B. Collective Entity (Group as Single Object)

One "pile of coins" entity that represents the group. Player interacts with the pile, not individual coins.

**Rejected because:**
- Adequate for scenery ("a pile of coins you can't interact with") but not for resource management gameplay.
- Can't put 3 coins in one container and 5 in another.
- Doesn't support "take coin" (singular) naturally.
- Better suited as a separate pattern (OBJ scenery) than as the solution for equivalent objects.

## Implementation

### Platform Changes

1. **`world-model`**: Add `equivalenceGroup` and `pluralName` to `IdentityTrait`. Add `AuthorModel.createEquivalent()` helper.
2. **`parser-en-us`**: Numeric noun phrase recognition. Group-aware disambiguation (silent pick for equivalents, group-level disambiguation between groups). `ALL` resolution respects groups.
3. **`lang-en-us`**: Grouped listing formatters. Pluralized action reports ("Taken (3 gold coins).").
4. **`stdlib`**: Update taking, dropping, putting, inserting actions to handle numeric commands (take N from group). Add `count` action.
5. **`engine`**: No changes — equivalence is a world-model + parser + display concern.

### Story-Level

1. Set `equivalenceGroup` on identical objects.
2. Optionally set `pluralName` for irregular plurals.
3. Use `AuthorModel.createEquivalent()` for bulk creation.

## Open Questions

1. **Should equivalence extend to nested properties?** If two coins are in different containers, are they still equivalent for listing purposes? (Probably no — grouping is per-location.)

2. **Should the parser support ordinal reference?** "Take the third coin" — useful for disambiguation when equivalence doesn't apply, but adds parser complexity. Likely a separate ADR.

3. **Should there be a maximum group size for performance?** In practice, stories rarely need more than 100 equivalent objects, but the system shouldn't fail if an author creates 1000.

4. **How does this interact with the scoring system?** If coins have `points`, does each coin score independently? (Probably yes — they're individual entities.)

## References

- TADS 3 `isEquivalent` property and `CollectiveGroup` class
- Inform 7 indistinguishable instances of kinds
- `packages/world-model/src/traits/identity/identityTrait.ts`: Current IdentityTrait
- `packages/parser-en-us/src/english-parser.ts`: Disambiguation logic
- OBJ-014 (Currency/Money) design pattern
- PUZ-023 (Inventory Constraint) design pattern
