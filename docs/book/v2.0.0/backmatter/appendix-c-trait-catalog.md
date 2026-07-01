# Appendix C — Trait Catalog {.unnumbered}

Every trait type defined by `@sharpee/world-model`. A trait is a unit of state and
capability you `add` to an entity. Generated from the platform's public `TraitType`
map; 40 traits.

| Trait type | Description |
|---|---|
| `actor` | A living being — the player or an NPC. |
| `attached` | Fixed to another object; cannot be taken on its own. |
| `breakable` | Can be broken by force. |
| `button` | A pressable control. |
| `characterModel` | Rich NPC character data (ADR-141). |
| `climbable` | Can be climbed. |
| `clothing` | A wearable garment (a specialized wearable). |
| `combatant` | Takes part in combat (health, attack). |
| `container` | Holds other objects inside it. |
| `destructible` | Can be destroyed. |
| `door` | A connection between two rooms; often openable/lockable. |
| `edible` | Can be eaten or drunk. |
| `enterable` | The player can get inside or onto it. |
| `equipped` | Currently equipped or wielded. |
| `exit` | A directional exit object. |
| `identity` | Name, description, aliases, and article — every entity's basic identity. |
| `if.trait.acoustic` | Emits or carries sound (acoustic model). |
| `if.trait.acoustic_dampener` | Dampens sound passing through it. |
| `if.trait.concealed_state` | Tracks whether the object is currently concealed. |
| `if.trait.concealment` | Conceals other objects. |
| `if.trait.listener` | Reacts to sounds it can hear. |
| `lightSource` | Provides light; banishes darkness when lit. |
| `lockable` | Can be locked and unlocked with a key. |
| `moveableScenery` | Scenery that can be moved to reveal something. |
| `npc` | Marks a non-player character with behavior. |
| `openInventory` | Its contents are visible without opening it. |
| `openable` | Can be opened and closed. |
| `pullable` | Can be pulled. |
| `pushable` | Can be pushed. |
| `readable` | Has text the player can read. |
| `region` | Groups rooms into a named region. |
| `room` | A location the player can occupy. |
| `scene` | A scripted scene with activation/deactivation. |
| `scenery` | Fixed background detail; not takeable, not listed in room contents. |
| `storyInfo` | Story metadata — title, author, version. |
| `supporter` | Holds other objects on top of it. |
| `switchable` | Can be switched on and off. |
| `vehicle` | A conveyance the player can enter and travel in. |
| `weapon` | Can be used to attack. |
| `wearable` | Can be worn. |
