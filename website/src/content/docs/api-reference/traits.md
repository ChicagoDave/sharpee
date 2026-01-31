---
title: Traits Reference
description: Complete reference for all Sharpee platform traits
---

All traits are imported from `@sharpee/world-model`. Traits are pure data structures — all logic belongs in behaviors and actions.

```typescript
import { RoomTrait, ContainerTrait, OpenableTrait } from '@sharpee/world-model';

const chest = world.createEntity('chest', 'object');
chest.addTrait(new ContainerTrait({ capacity: { maxItems: 10 } }));
chest.addTrait(new OpenableTrait({ isOpen: false }));
```

## Core

### IdentityTrait

**Type:** `'identity'` — Provides naming, description, and localization support.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `name` | `string` | — | Display name |
| `description` | `string` | — | Full description |
| `nameId` | `string` | — | Localization message ID for name |
| `descriptionId` | `string` | — | Localization message ID for description |
| `aliases` | `string[]` | `[]` | Alternative names the parser recognizes |
| `brief` | `string` | — | Short description for inventory/lists |
| `properName` | `boolean` | `false` | If true, no article used ("Bob" vs "the chest") |
| `article` | `string` | `'a'` | Article to use ("a", "an", "the", "some") |
| `concealed` | `boolean` | `false` | Hidden from room descriptions |
| `adjectives` | `string[]` | `[]` | Adjectives the parser recognizes |
| `grammaticalNumber` | `'singular' \| 'plural'` | `'singular'` | For verb conjugation |

### ActorTrait

**Type:** `'actor'` — Marks entities that can act in the world (players, NPCs).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isPlayer` | `boolean` | `false` | Whether this is the player character |
| `isPlayable` | `boolean` | `false` | Whether the player can switch to this actor |
| `state` | `string` | — | Current actor state |
| `pronouns` | `PronounSet \| PronounSet[]` | — | Pronoun sets for this actor |
| `capacity` | `{ maxItems?, maxWeight?, maxVolume? }` | — | Inventory capacity limits |
| `isTransparent` | `boolean` | `false` | Whether contents are visible |

### RoomTrait

**Type:** `'room'` — Marks entity as a location. Rooms are inherently containers.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `visited` | `boolean` | `false` | Whether the player has been here |
| `exits` | `Record<DirectionType, IExitInfo>` | `{}` | Available exits by direction |
| `blockedExits` | `Record<DirectionType, string>` | `{}` | Blocked exits with message IDs |
| `isDark` | `boolean` | `false` | Requires light source to see |
| `isOutdoors` | `boolean` | `false` | Outdoor location |
| `isUnderground` | `boolean` | `false` | Underground location |
| `initialDescription` | `string` | — | First-visit description |
| `initialDescriptionId` | `string` | — | Localization ID for first-visit description |
| `region` | `string` | — | Region grouping |
| `tags` | `string[]` | `[]` | Arbitrary tags |

### ContainerTrait

**Type:** `'container'` — Allows entities to hold other entities inside.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capacity` | `{ maxWeight?, maxVolume?, maxItems? }` | — | Size limits |
| `isTransparent` | `boolean` | `false` | Contents visible when closed |
| `enterable` | `boolean` | `false` | Whether actors can enter |
| `allowedTypes` | `string[]` | `[]` | Only these types allowed (empty = all) |
| `excludedTypes` | `string[]` | `[]` | These types blocked |

### SupporterTrait

**Type:** `'supporter'` — Allows entities to have items placed on top.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capacity` | `{ maxWeight?, maxItems? }` | — | Size limits |
| `enterable` | `boolean` | `false` | Whether actors can get on |
| `allowedTypes` | `string[]` | `[]` | Only these types allowed |
| `excludedTypes` | `string[]` | `[]` | These types blocked |

### SceneryTrait

**Type:** `'scenery'` — Marks items as fixed in place (not takeable).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cantTakeMessage` | `string` | — | Message ID when player tries to take |
| `mentioned` | `boolean` | `false` | Already mentioned in room description |
| `visible` | `boolean` | `true` | Whether visible in room |

## Interactive

### OpenableTrait

**Type:** `'openable'` — Objects that can be opened and closed (doors, containers, books).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isOpen` | `boolean` | `false` | Current state |
| `startsOpen` | `boolean` | `false` | Initial state |
| `canClose` | `boolean` | `true` | Whether closing is allowed |
| `revealsContents` | `boolean` | `true` | Show contents when opened |
| `openMessage` | `string` | — | Custom open message ID |
| `closeMessage` | `string` | — | Custom close message ID |

### LockableTrait

**Type:** `'lockable'` — Entities that can be locked/unlocked. Usually paired with OpenableTrait.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isLocked` | `boolean` | `false` | Current state |
| `startsLocked` | `boolean` | `false` | Initial state |
| `keyId` | `EntityId` | — | Required key entity |
| `keyIds` | `EntityId[]` | `[]` | Multiple accepted keys |
| `acceptsMasterKey` | `boolean` | `false` | Whether a master key works |
| `autoLock` | `boolean` | `false` | Re-locks automatically |

### SwitchableTrait

**Type:** `'switchable'` — Objects that can be turned on and off.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isOn` | `boolean` | `false` | Current state |
| `startsOn` | `boolean` | `false` | Initial state |
| `requiresPower` | `boolean` | `false` | Needs external power |
| `hasPower` | `boolean` | `true` | Currently has power |
| `autoOffTime` | `number` | — | Turns until auto-off |

### ReadableTrait

**Type:** `'readable'` — Entities with text to read (books, signs, notes).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `text` | `string` | — | The readable text |
| `preview` | `string` | — | Brief preview text |
| `isReadable` | `boolean` | `true` | Whether currently readable |
| `hasBeenRead` | `boolean` | `false` | Tracks if read |
| `pages` | `number` | — | Number of pages |
| `currentPage` | `number` | — | Current page |
| `pageContent` | `string[]` | `[]` | Content per page |

### LightSourceTrait

**Type:** `'lightSource'` — Allows entities to provide illumination.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brightness` | `number` | — | Light level |
| `isLit` | `boolean` | `false` | Currently providing light |
| `fuelRemaining` | `number` | — | Turns of fuel left |
| `maxFuel` | `number` | — | Maximum fuel capacity |
| `fuelConsumptionRate` | `number` | — | Fuel used per turn |

### PushableTrait

**Type:** `'pushable'` — Objects that can be pushed.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pushType` | `'button' \| 'heavy' \| 'moveable'` | — | Type of push interaction |
| `state` | `'default' \| 'pushed' \| 'activated'` | `'default'` | Current state |
| `repeatable` | `boolean` | `true` | Can be pushed again |
| `requiresStrength` | `number` | — | Minimum strength needed |
| `activates` | `string` | — | Entity ID activated by push |

### PullableTrait

**Type:** `'pullable'` — Objects that can be pulled.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pullType` | `'lever' \| 'cord' \| 'attached' \| 'heavy'` | — | Type of pull interaction |
| `state` | `'default' \| 'pulled' \| 'activated'` | `'default'` | Current state |
| `repeatable` | `boolean` | `true` | Can be pulled again |
| `requiresStrength` | `number` | — | Minimum strength needed |
| `activates` | `string` | — | Entity ID activated by pull |

### ButtonTrait

**Type:** `'button'` — Button-specific properties. Should also have PushableTrait.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `latching` | `boolean` | `false` | Stays pressed |
| `color` | `string` | — | Button color |
| `label` | `string` | — | Button label text |
| `pressed` | `boolean` | `false` | Currently pressed |

### ClimbableTrait

**Type:** `'climbable'` — Objects that can be climbed (ladders, trees, walls).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `canClimb` | `boolean` | `true` | Whether climbing is allowed |
| `direction` | `'up' \| 'down' \| 'both'` | `'up'` | Allowed climb direction |
| `destination` | `string` | — | Room ID reached by climbing |
| `blockedMessage` | `string` | — | Message when climb is blocked |

### AttachedTrait

**Type:** `'attached'` — Objects fastened to something.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `attachedTo` | `string` | — | Entity ID this is attached to |
| `attachmentType` | `'glued' \| 'nailed' \| 'screwed' \| 'tied' \| 'welded' \| 'magnetic' \| 'stuck'` | — | How it's attached |
| `detachable` | `boolean` | `false` | Can be detached |
| `loose` | `boolean` | `false` | Nearly detached |

### MoveableSceneryTrait

**Type:** `'moveableScenery'` — Large pushable/pullable objects. Should also have PushableTrait/PullableTrait.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `weightClass` | `'light' \| 'medium' \| 'heavy' \| 'immense'` | — | How hard to move |
| `revealsWhenMoved` | `boolean` | `false` | Reveals something underneath |
| `reveals` | `string` | — | Entity ID revealed |
| `moved` | `boolean` | `false` | Has been moved |
| `blocksExits` | `boolean` | `false` | Blocks room exits |
| `blockedExits` | `string[]` | `[]` | Which exits are blocked |

## Spatial

### DoorTrait

**Type:** `'door'` — Marks connection between two rooms.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `room1` | `string` | — | First connected room entity ID |
| `room2` | `string` | — | Second connected room entity ID |
| `bidirectional` | `boolean` | `true` | Accessible from both sides |

### ExitTrait

**Type:** `'exit'` — Represents passages between locations.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `from` | `string` | — | Source room entity ID |
| `to` | `string` | — | Destination room entity ID |
| `direction` | `string` | — | Direction from source |
| `visible` | `boolean` | `true` | Listed in room description |
| `bidirectional` | `boolean` | `true` | Has a return path |
| `conditional` | `boolean` | `false` | Requires condition to use |
| `conditionId` | `string` | — | Condition identifier |
| `blockedMessage` | `string` | — | Message when blocked |

### EnterableTrait

**Type:** `'enterable'` — Objects that can be entered by actors.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `preposition` | `'in' \| 'on'` | `'in'` | "get in X" vs "get on X" |

### VehicleTrait

**Type:** `'vehicle'` — Enterable containers that transport actors.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `vehicleType` | `VehicleType` | — | Type of vehicle |
| `movesWithContents` | `boolean` | `true` | Contents travel along |
| `blocksWalkingMovement` | `boolean` | `false` | Must exit before walking |
| `isOperational` | `boolean` | `true` | Currently working |
| `notOperationalReason` | `string` | — | Why it's broken |

## Items

### WearableTrait

**Type:** `'wearable'` — Base trait for all wearable items.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `worn` | `boolean` | `false` | Currently being worn |
| `wornBy` | `string` | — | Entity ID of wearer |
| `slot` | `string` | — | Body slot (e.g., "head", "hands") |
| `layer` | `number` | `0` | Layer order (higher = outer) |
| `canRemove` | `boolean` | `true` | Whether it can be taken off |

### ClothingTrait

**Type:** `'clothing'` — Specialized wearable for clothing with condition tracking. Extends WearableTrait properties.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `condition` | `'pristine' \| 'good' \| 'worn' \| 'torn' \| 'ruined'` | `'good'` | Current condition |
| `material` | `string` | — | Fabric/material type |
| `style` | `string` | — | Clothing style |
| `damageable` | `boolean` | `false` | Can be damaged |

### EdibleTrait

**Type:** `'edible'` — Objects that can be eaten or drunk.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `nutrition` | `number` | — | Nutrition value |
| `servings` | `number` | `1` | Number of servings |
| `liquid` | `boolean` | `false` | Is a liquid (drink vs eat) |
| `consumeMessage` | `string` | — | Custom consumption message ID |
| `effects` | `string[]` | `[]` | Effect IDs applied on consumption |

### WeaponTrait

**Type:** `'weapon'` — Objects that can be used to attack.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `damage` | `number` | — | Base damage |
| `minDamage` | `number` | — | Minimum damage roll |
| `maxDamage` | `number` | — | Maximum damage roll |
| `skillBonus` | `number` | `0` | Bonus to hit |
| `weaponType` | `string` | — | Weapon category |
| `twoHanded` | `boolean` | `false` | Requires both hands |
| `breakable` | `boolean` | `false` | Can break from use |
| `durability` | `number` | — | Current durability |

### EquippedTrait

**Type:** `'equipped'` — Indicates item is currently equipped by an actor.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `slot` | `'weapon' \| 'armor' \| 'shield' \| 'helmet' \| 'boots' \| 'gloves' \| 'ring' \| 'amulet' \| 'accessory'` | — | Equipment slot |
| `isEquipped` | `boolean` | `false` | Currently equipped |
| `modifiers` | `{ attack?, defense?, health?, speed? }` | — | Stat modifiers when equipped |

## Combat

### CombatantTrait

**Type:** `'combatant'` — Entities that can engage in combat.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `health` | `number` | — | Current health |
| `maxHealth` | `number` | — | Maximum health |
| `skill` | `number` | — | Combat skill level |
| `baseDamage` | `number` | — | Unarmed damage |
| `isAlive` | `boolean` | `true` | Currently alive |
| `isConscious` | `boolean` | `true` | Currently conscious |
| `hostile` | `boolean` | `false` | Attacks on sight |
| `armor` | `number` | `0` | Damage reduction |
| `canRetaliate` | `boolean` | `true` | Fights back when attacked |
| `dropsInventory` | `boolean` | `true` | Drops items on death |

### BreakableTrait

**Type:** `'breakable'` — Objects that can be broken with a single hit.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `broken` | `boolean` | `false` | Currently broken |

### DestructibleTrait

**Type:** `'destructible'` — Objects requiring multiple hits or specific tools to destroy.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `hitPoints` | `number` | — | Current HP |
| `maxHitPoints` | `number` | — | Maximum HP |
| `requiresWeapon` | `boolean` | `false` | Needs a weapon to damage |
| `requiresType` | `string` | — | Specific weapon type needed |
| `invulnerable` | `boolean` | `false` | Cannot be damaged |
| `transformTo` | `string` | — | Becomes this entity when destroyed |
| `revealExit` | `string` | — | Exit revealed when destroyed |

## NPC

### NpcTrait

**Type:** `'npc'` — Marks entity as an autonomous NPC with turn cycle participation.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isAlive` | `boolean` | `true` | Currently alive |
| `isConscious` | `boolean` | `true` | Currently conscious |
| `isHostile` | `boolean` | `false` | Hostile to player |
| `canMove` | `boolean` | `true` | Can move between rooms |
| `allowedRooms` | `EntityId[]` | `[]` | Rooms the NPC can visit |
| `forbiddenRooms` | `EntityId[]` | `[]` | Rooms the NPC cannot enter |
| `behaviorId` | `string` | — | Registered behavior plugin ID |
| `conversationState` | `string` | — | Current dialogue state |
| `knowledge` | `Record<string, unknown>` | `{}` | NPC knowledge store |
| `goals` | `string[]` | `[]` | Current NPC goals |
