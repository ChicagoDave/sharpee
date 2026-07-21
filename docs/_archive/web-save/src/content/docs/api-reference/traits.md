---
title: Traits Reference
description: Complete reference for all Sharpee platform traits and their behaviors
---

All traits are imported from `@sharpee/world-model`. Traits are pure data structures — logic lives in the associated behavior class.

```typescript
import { RoomTrait, ContainerTrait, OpenableTrait } from '@sharpee/world-model';
import { ContainerBehavior, OpenableBehavior } from '@sharpee/world-model';

const chest = world.createEntity('chest', 'object');
chest.addTrait(new ContainerTrait({ capacity: { maxItems: 10 } }));
chest.addTrait(new OpenableTrait({ isOpen: false }));

// Behaviors provide the logic
OpenableBehavior.open(chest);   // → IOpenResult
OpenableBehavior.isOpen(chest); // → true
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

**Behavior — `IdentityBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getPossessiveName(entity)` | `string` | Possessive form of name |
| `isConcealed(entity)` | `boolean` | Whether entity is hidden |
| `getWeight(entity)` | `number` | Entity weight |
| `getVolume(entity)` | `number` | Entity volume |
| `getSize(entity)` | `string` | Size category |
| `getTotalWeight(entity, getContents?)` | `number` | Weight including contents |

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

**Behavior — `ActorBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `isPlayer(entity)` | `boolean` | Check if player character |
| `isPlayable(entity)` | `boolean` | Check if switchable |
| `getPronouns(entity)` | `PronounSet` | Get pronoun set |
| `canCarry(actor, item, world)` | `boolean` | Check inventory capacity |
| `canTakeItem(actor, item, world)` | `boolean` | Full take validation |
| `takeItem(actor, item, world)` | `ITakeItemResult` | Move item to inventory |
| `dropItem(actor, item, world)` | `IDropItemResult` | Move item to location |
| `isHolding(actor, itemId, world)` | `boolean` | Check if holding item |
| `getCarriedWeight(actor, world)` | `number` | Total carried weight |
| `getRemainingCapacity(actor, world)` | `object` | Remaining weight/volume/items |
| `getState(entity)` | `string` | Get actor state |
| `setState(entity, state)` | `void` | Set actor state |
| `findPlayer(entities)` | `IFEntity` | Find player in entity list |

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

**Behavior — `RoomBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getExit(room, direction)` | `IExitInfo \| null` | Get exit in direction |
| `isExitBlocked(room, direction)` | `boolean` | Check if exit is blocked |
| `getBlockedMessage(room, direction)` | `string` | Get blocked exit message |
| `removeExit(room, direction)` | `void` | Remove an exit |
| `getAllExits(room)` | `Map<DirectionType, IExitInfo>` | All exits |
| `getAvailableExits(room)` | `Map<DirectionType, IExitInfo>` | Unblocked exits only |
| `isOutdoors(room)` | `boolean` | Check outdoor flag |
| `isUnderground(room)` | `boolean` | Check underground flag |
| `addTag(room, tag)` | `void` | Add a tag |
| `removeTag(room, tag)` | `void` | Remove a tag |

### ContainerTrait

**Type:** `'container'` — Allows entities to hold other entities inside.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capacity` | `{ maxWeight?, maxVolume?, maxItems? }` | — | Size limits |
| `isTransparent` | `boolean` | `false` | Contents visible when closed |
| `enterable` | `boolean` | `false` | Whether actors can enter |
| `allowedTypes` | `string[]` | `[]` | Only these types allowed (empty = all) |
| `excludedTypes` | `string[]` | `[]` | These types blocked |

**Behavior — `ContainerBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `addItem(container, item, world)` | `IAddItemResult` | Add item to container |
| `removeItem(container, item, world)` | `IRemoveItemResult` | Remove item from container |
| `checkCapacity(container, item, world)` | `boolean` | Check if item fits |
| `getTotalWeight(container, world)` | `number` | Weight of contents |
| `getTotalVolume(container, world)` | `number` | Volume of contents |
| `getRemainingCapacity(container, world)` | `object` | Remaining capacity |
| `isTransparent(container)` | `boolean` | Check transparency |
| `isEnterable(container)` | `boolean` | Check enterability |
| `getAllowedTypes(container)` | `string[]` | Get allowed types |
| `getExcludedTypes(container)` | `string[]` | Get excluded types |

### SupporterTrait

**Type:** `'supporter'` — Allows entities to have items placed on top.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `capacity` | `{ maxWeight?, maxItems? }` | — | Size limits |
| `enterable` | `boolean` | `false` | Whether actors can get on |
| `allowedTypes` | `string[]` | `[]` | Only these types allowed |
| `excludedTypes` | `string[]` | `[]` | These types blocked |

**Behavior — `SupporterBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `addItem(supporter, item, world)` | `IAddItemToSupporterResult` | Place item on supporter |
| `removeItem(supporter, item, world)` | `IRemoveItemFromSupporterResult` | Remove item from supporter |
| `canAccept(supporter, item, world)` | `boolean` | Check if item allowed |
| `checkCapacity(supporter, item, world)` | `boolean` | Check if item fits |
| `getTotalWeight(supporter, world)` | `number` | Weight of items on top |
| `getRemainingCapacity(supporter, world)` | `object` | Remaining capacity |
| `isEnterable(supporter)` | `boolean` | Check enterability |

### SceneryTrait

**Type:** `'scenery'` — Marks items as fixed in place (not takeable).

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `cantTakeMessage` | `string` | — | Message ID when player tries to take |
| `mentioned` | `boolean` | `false` | Already mentioned in room description |
| `visible` | `boolean` | `true` | Whether visible in room |

**Behavior — `SceneryBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getUntakeableReason(entity)` | `string` | Reason entity can't be taken |
| `getCantTakeMessage(entity)` | `string` | Custom can't-take message |
| `isMentioned(entity)` | `boolean` | Already mentioned in description |

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

**Behavior — `OpenableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canOpen(entity)` | `boolean` | Check if can be opened |
| `canClose(entity)` | `boolean` | Check if can be closed |
| `open(entity)` | `IOpenResult` | Open the entity |
| `close(entity)` | `ICloseResult` | Close the entity |
| `toggle(entity)` | `IOpenResult \| ICloseResult` | Toggle open/closed |
| `isOpen(entity)` | `boolean` | Check current state |
| `revealsContents(entity)` | `boolean` | Check if contents shown |

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

**Behavior — `LockableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `lock(entity, keyEntity?)` | `ILockResult` | Lock the entity |
| `unlock(entity, keyEntity?)` | `IUnlockResult` | Unlock the entity |
| `isLocked(entity)` | `boolean` | Check locked state |
| `getLockedMessage(entity)` | `string` | Get locked message |

### SwitchableTrait

**Type:** `'switchable'` — Objects that can be turned on and off.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `isOn` | `boolean` | `false` | Current state |
| `startsOn` | `boolean` | `false` | Initial state |
| `requiresPower` | `boolean` | `false` | Needs external power |
| `hasPower` | `boolean` | `true` | Currently has power |
| `autoOffTime` | `number` | — | Turns until auto-off |

**Behavior — `SwitchableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canSwitchOn(entity)` | `boolean` | Check if can turn on |
| `canSwitchOff(entity)` | `boolean` | Check if can turn off |
| `switchOn(entity)` | `ISwitchOnResult` | Turn on |
| `switchOff(entity)` | `ISwitchOffResult` | Turn off |
| `toggle(entity)` | `ISwitchOnResult \| ISwitchOffResult` | Toggle on/off |
| `setPower(entity, hasPower)` | `ISemanticEvent[]` | Set power state |
| `updateTurn(entity)` | `ISemanticEvent[]` | Tick auto-off timer |
| `isOn(entity)` | `boolean` | Check current state |
| `getTimeRemaining(entity)` | `number` | Turns until auto-off |
| `getPowerConsumption(entity)` | `number` | Power usage |

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

**Behavior — `ReadableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getText(entity)` | `string` | Get full text |
| `getPreview(entity)` | `string` | Get preview text |
| `read(reader, readable)` | `ISemanticEvent[]` | Read the entity (emits events) |

### LightSourceTrait

**Type:** `'lightSource'` — Allows entities to provide illumination.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `brightness` | `number` | — | Light level |
| `isLit` | `boolean` | `false` | Currently providing light |
| `fuelRemaining` | `number` | — | Turns of fuel left |
| `maxFuel` | `number` | — | Maximum fuel capacity |
| `fuelConsumptionRate` | `number` | — | Fuel used per turn |

**Behavior — `LightSourceBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `light(source)` | `boolean` | Light the source |
| `extinguish(source)` | `void` | Extinguish the source |
| `isLit(source)` | `boolean` | Check if lit |
| `getBrightness(source)` | `number` | Get brightness level |
| `getFuelRemaining(source)` | `number` | Get remaining fuel |
| `consumeFuel(source, amount?)` | `boolean` | Consume fuel (returns false if empty) |
| `getFuelPercentage(source)` | `number` | Fuel remaining as percentage |

### PushableTrait

**Type:** `'pushable'` — Objects that can be pushed. *No dedicated behavior — handled by the pushing stdlib action.*

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pushType` | `'button' \| 'heavy' \| 'moveable'` | — | Type of push interaction |
| `state` | `'default' \| 'pushed' \| 'activated'` | `'default'` | Current state |
| `repeatable` | `boolean` | `true` | Can be pushed again |
| `requiresStrength` | `number` | — | Minimum strength needed |
| `activates` | `string` | — | Entity ID activated by push |

### PullableTrait

**Type:** `'pullable'` — Objects that can be pulled. *No dedicated behavior — handled by the pulling stdlib action.*

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `pullType` | `'lever' \| 'cord' \| 'attached' \| 'heavy'` | — | Type of pull interaction |
| `state` | `'default' \| 'pulled' \| 'activated'` | `'default'` | Current state |
| `repeatable` | `boolean` | `true` | Can be pulled again |
| `requiresStrength` | `number` | — | Minimum strength needed |
| `activates` | `string` | — | Entity ID activated by pull |

### ButtonTrait

**Type:** `'button'` — Button-specific properties. Should also have PushableTrait. *No dedicated behavior.*

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

**Behavior — `ClimbableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `isClimbable(entity)` | `boolean` | Check if can be climbed |
| `climb(entity)` | `IClimbResult` | Perform climb |
| `getDirection(entity)` | `string` | Get allowed direction |
| `getDestination(entity)` | `string` | Get destination room ID |

### AttachedTrait

**Type:** `'attached'` — Objects fastened to something. *No dedicated behavior.*

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `attachedTo` | `string` | — | Entity ID this is attached to |
| `attachmentType` | `'glued' \| 'nailed' \| 'screwed' \| 'tied' \| 'welded' \| 'magnetic' \| 'stuck'` | — | How it's attached |
| `detachable` | `boolean` | `false` | Can be detached |
| `loose` | `boolean` | `false` | Nearly detached |

### MoveableSceneryTrait

**Type:** `'moveableScenery'` — Large pushable/pullable objects. Should also have PushableTrait/PullableTrait. *No dedicated behavior.*

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

**Behavior — `DoorBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getRooms(door)` | `[string, string]` | Get both room IDs |
| `getOtherRoom(door, currentRoom)` | `string` | Get room on other side |
| `isBidirectional(door)` | `boolean` | Check bidirectionality |
| `getEntryRoom(door)` | `string` | Get room1 |
| `getExitRoom(door)` | `string` | Get room2 |

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

**Behavior — `ExitBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `getBlockedReason(exit)` | `string` | Get blocked message |
| `getExitsFrom(locationId, world)` | `IFEntity[]` | All exits from a location |
| `getVisibleExitsFrom(locationId, world)` | `IFEntity[]` | Only visible exits |
| `getListedExitsFrom(locationId, world)` | `IFEntity[]` | Only listed exits |
| `getReverseDirection(direction)` | `string` | Opposite direction |
| `getReverseCommand(command)` | `string` | Reverse command string |

### EnterableTrait

**Type:** `'enterable'` — Objects that can be entered by actors. *No dedicated behavior.*

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

**Behavior — standalone functions:**

| Function | Returns | Description |
|----------|---------|-------------|
| `isVehicle(entity)` | `boolean` | Check if entity is a vehicle |
| `isActorInVehicle(world, actorId)` | `boolean` | Check if actor is in any vehicle |
| `getActorVehicle(world, actorId)` | `IFEntity` | Get actor's current vehicle |
| `getVehicleOccupants(world, vehicleId)` | `IFEntity[]` | Get all occupants |
| `moveVehicle(...)` | — | Move vehicle and contents |
| `canVehicleMove(vehicle)` | `{ canMove, reason? }` | Check if vehicle can move |
| `canActorLeaveLocation(...)` | — | Check if actor can leave via walking |
| `canActorWalkInVehicle(...)` | — | Check if walking is blocked |

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

**Behavior — `WearableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canWear(item, actor)` | `boolean` | Check if item can be worn |
| `canRemove(item, actor)` | `boolean` | Check if item can be removed |
| `wear(item, actor)` | `IWearResult` | Put on item |
| `remove(item, actor)` | `IRemoveResult` | Take off item |
| `isWorn(item)` | `boolean` | Check if currently worn |
| `getWearer(item)` | `string` | Get wearer entity ID |
| `getSlot(item)` | `string` | Get body slot |
| `getLayer(item)` | `number` | Get layer number |
| `getBlockedSlots(item)` | `string[]` | Get slots this blocks |

### ClothingTrait

**Type:** `'clothing'` — Specialized wearable for clothing with condition tracking. Extends WearableTrait properties. *Uses WearableBehavior.*

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

**Behavior — `EdibleBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canConsume(item)` | `boolean` | Check if consumable (has servings) |
| `consume(item, actor)` | `ISemanticEvent[]` | Consume a serving |
| `isEmpty(item)` | `boolean` | Check if all servings used |
| `isLiquid(item)` | `boolean` | Check if liquid |
| `getNutrition(item)` | `number` | Get nutrition value |
| `getServings(item)` | `number` | Get remaining servings |
| `getTaste(item)` | `TasteQuality` | Get taste quality |
| `getEffects(item)` | `string[]` | Get effect IDs |
| `hasEffect(item)` | `boolean` | Check if has effects |
| `satisfiesHunger(item)` | `boolean` | Check hunger satisfaction |

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

**Behavior — `WeaponBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `calculateDamage(weapon)` | `IWeaponDamageResult` | Roll damage |
| `canDamage(weapon, targetType?)` | `boolean` | Check if weapon works on target |
| `getWeaponType(weapon)` | `string` | Get weapon type |
| `isTwoHanded(weapon)` | `boolean` | Check two-handed |
| `repair(weapon)` | `boolean` | Repair weapon |
| `isBroken(weapon)` | `boolean` | Check if broken |

### EquippedTrait

**Type:** `'equipped'` — Indicates item is currently equipped by an actor. *No dedicated behavior.*

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

**Behavior — `CombatBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canAttack(entity)` | `boolean` | Check if can attack |
| `attack(entity, damage, world)` | `ICombatResult` | Apply damage to entity |
| `heal(entity, amount)` | `number` | Heal entity, returns new health |
| `resurrect(entity)` | `boolean` | Bring back to life |
| `isAlive(entity)` | `boolean` | Check if alive |
| `getHealth(entity)` | `number` | Get current health |
| `getHealthPercentage(entity)` | `number` | Health as percentage |
| `isHostile(entity)` | `boolean` | Check hostility |
| `setHostile(entity, hostile)` | `void` | Set hostility |

### BreakableTrait

**Type:** `'breakable'` — Objects that can be broken with a single hit.

| Property | Type | Default | Description |
|----------|------|---------|-------------|
| `broken` | `boolean` | `false` | Currently broken |

**Behavior — `BreakableBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `break(entity, world)` | `IBreakResult` | Break the entity |
| `isBroken(entity)` | `boolean` | Check if broken |

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

**Behavior — `DestructibleBehavior`:**

| Method | Returns | Description |
|--------|---------|-------------|
| `canDamage(entity, weaponType?)` | `boolean` | Check if can be damaged |
| `damage(entity, damage, weaponType, world)` | `IDamageResult` | Apply damage |
| `isDestroyed(entity)` | `boolean` | Check if HP reached zero |
| `getHitPoints(entity)` | `number` | Get current HP |
| `repair(entity)` | `boolean` | Restore to max HP |

## NPC

### NpcTrait

**Type:** `'npc'` — Marks entity as an autonomous NPC with turn cycle participation. *NPC behavior is handled by the plugin-npc package via registered behavior plugins, not a world-model behavior class.*

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
