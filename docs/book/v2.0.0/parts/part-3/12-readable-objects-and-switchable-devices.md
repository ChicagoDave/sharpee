# Readable Objects & Switchable Devices: Things That Carry State

A zoo is full of things to read. Brass plaques by the enclosures, a glossy
brochure at the entrance, a yellow warning sign outside the nocturnal exhibit.
Each sign *says* something the player wants to take in, separate from what it
*looks* like. And tucked on a shelf in the supply room is a battered radio that
clicks on and off but sheds no light at all. This chapter covers two small,
self-contained traits that round out an ordinary world: `ReadableTrait` for
things with words, and `SwitchableTrait` for devices with an on/off state.

`ReadableTrait` is new this chapter; `SwitchableTrait` you met in *Light & Dark*
and your file already imports it. Add only the new name to your world-model
import (TypeScript rejects importing the same identifier twice, so don't paste a
second `SwitchableTrait`):

```typescript
import { ReadableTrait } from '@sharpee/world-model';
```

The snippets below go in `initializeWorld`, alongside the rooms you've built since
Chapter 4. `entrance`, `pettingZoo`, and `supplyRoom` are the same room entities
from earlier chapters.

## ReadableTrait: what an object says

`ReadableTrait` gives an entity text that the `read` action displays:

```typescript
plaque.add(new ReadableTrait({
  text:
    'PYGMY GOATS: These Nigerian Dwarf goats are gentle, ' +
    'curious, and always hungry.',
}));
```

`read` and `examine` are different verbs that pull from different traits,
`ReadableTrait.text` versus `IdentityTrait.description`:

| Command | Trait used | What it shows |
|---|---|---|
| `examine plaque` | `IdentityTrait.description` | What the object looks like |
| `read plaque` | `ReadableTrait.text` | What the object says |

A brass plaque *looks like* "a brass plaque mounted on a wooden post." It
*says* "PYGMY GOATS: These Nigerian Dwarf goats are gentle, curious, and
always hungry." Two different strings, two different verbs.

The test for whether something wants a `ReadableTrait`: would a real person say
"I want to *read* this"? A sign, a book, a letter, a label: yes. A rock, a
fence, a tree: no; those just need a description.

## Readable scenery: the info plaque

Plaques are scenery you can read but can't take. Each includes `IdentityTrait`,
`ReadableTrait`, and `SceneryTrait`.

```typescript
const pettingPlaque = world
  .createEntity('info plaque', EntityType.SCENERY);
pettingPlaque.add(new IdentityTrait({
  name: 'info plaque',
  description:
    'A brass plaque mounted on a wooden post near the petting ' +
    'zoo gate. It has text etched into the metal.',
  aliases: ['plaque', 'info plaque', 'brass plaque'],
  properName: false,
  article: 'an',
}));
pettingPlaque.add(new ReadableTrait({
  text:
    'PYGMY GOATS: These Nigerian Dwarf goats are gentle, ' +
    'curious, and always hungry. They can eat up to 3% of ' +
    'their body weight daily. Please use only zoo-approved ' +
    'feed from the dispensers.\n\nHOLLAND LOP RABBITS: Known ' +
    'for their floppy ears and calm temperament. Our pair, ' +
    'Biscuit and Marmalade, were born right here at ' +
    'Willowbrook in 2023.',
}));
world.moveEntity(pettingPlaque.id, pettingZoo.id);
```

Note the `\n\n` between the two animals. Readable text is shown as-is, so line
breaks are yours to place.

> **The mistake everyone makes once:** writing one long unbroken paragraph and
> wondering why it reads like a wall. Use `\n` (or `\n\n`) to break readable
> text into lines and stanzas the way a real sign or page would.

## Readable items: the brochure

`ReadableTrait` works on portable things too. Leave off `SceneryTrait` and the
player can pick the object up and read it anywhere:

```typescript
const brochure = world
  .createEntity('zoo brochure', EntityType.ITEM);
brochure.add(new IdentityTrait({
  name: 'zoo brochure',
  description:
    'A glossy tri-fold brochure with "WILLOWBROOK FAMILY ' +
    'ZOO" on the cover in cheerful yellow letters.',
  aliases: ['brochure', 'zoo brochure', 'pamphlet', 'leaflet'],
  properName: false,
  article: 'a',
}));
brochure.add(new ReadableTrait({
  text:
    'WILLOWBROOK FAMILY ZOO: Your Guide\n\n' +
    'EXHIBITS:\n' +
    '  Petting Zoo ............ East from Main Path\n' +
    '  Aviary ................. West from Main Path\n' +
    '  Nocturnal Animals ...... Staff Area (ask a keeper!)\n\n' +
    '"Where every visit is a wild adventure!"',
}));
world.moveEntity(brochure.id, entrance.id);
```

Readable scenery (plaques, warning signs) and readable items (brochures,
letters, books) are the same trait; the only difference is whether the thing is
fixed in place.

## SwitchableTrait: a device with on/off state

Back in *Light & Dark* the flashlight combined `SwitchableTrait` with
`LightSourceTrait`. But `SwitchableTrait` stands perfectly well on its own, for
any device with an on/off state that isn't a light. The supply-room radio is
exactly that:

```typescript
const radio = world.createEntity('radio', EntityType.ITEM);
radio.add(new IdentityTrait({
  name: 'radio',
  description:
    'A battered portable radio held together with duct ' +
    'tape. A faded sticker on the side reads "ZOO FM | All ' +
    'Animals, All The Time."',
  aliases: ['radio', 'portable radio'],
  properName: false,
  article: 'a',
}));
radio.add(new SwitchableTrait({ isOn: false }));   // starts off
// bolted to the shelf
radio.add(new SceneryTrait());
world.moveEntity(radio.id, supplyRoom.id);
```

The player can `switch on radio`, `switch off radio`, `turn on radio`, or `turn
off radio`; the stdlib handles all four phrasings and reports the toggle. The
radio has no `LightSourceTrait`, so switching it on changes its state but
illuminates nothing. The `SceneryTrait` means it can't be carried off.

> **The mistake everyone makes once:** expecting a bare `SwitchableTrait` to do
> something dramatic. On its own it just tracks `isOn`. Combine it with
> `LightSourceTrait` for a controllable light, or react to its state with an
> event handler (the next volume of the book) when you want flipping the switch to
> *do* something.

## Switchable vs. openable

`SwitchableTrait` and `OpenableTrait` look like twins (both hold a boolean,
both have paired verbs), but they model different kinds of object, and the
parser keeps their verbs apart:

| Trait | Verbs | Models | Examples |
|---|---|---|---|
| `SwitchableTrait` | switch on / off, turn on / off | Devices, electronics | Radio, flashlight, alarm, fan |
| `OpenableTrait` | open / close | Physical barriers | Door, container, book, lid |

You'd never "switch on" a door or "open" a radio. Pick the trait whose verbs
match how a person would actually talk about the object.

## Try it

```
> take brochure              Pick up the zoo brochure
> take keycard               Grab the staff keycard; it's here at the entrance
> read brochure              Read the guide, different from examine!
> examine brochure           See the physical brochure
> south                      Main Path
> east                       Petting Zoo
> read plaque                Read about the goats and rabbits
> examine plaque             See the brass plaque itself
> west                       Back to Main Path
> unlock gate with keycard   Open the staff area
> open gate                  Open the staff gate
> south                      Supply Room
> examine radio              See the battered radio
> switch on radio            Click, it's on
> switch off radio           Click, off again
> take radio                 Can't, it's scenery
```

## Test it

Add `tests/transcripts/readables.transcript` — it pins the read-versus-examine
distinction on both the plaque and the brochure:

```text
title: Readables and switchables
story: familyzoo
description: Plaque, brochure, and radio carry state

---

> take brochure
[OK: contains "Taken"]

> take keycard
[OK: contains "Taken"]

> read brochure
[OK: contains "Your Guide"]

> examine brochure
[OK: contains "glossy"]

> south
[OK: contains "Main Path"]

> east
[OK: contains "Petting Zoo"]

> read plaque
[OK: contains "PYGMY GOATS"]

> examine plaque
[OK: contains "brass plaque"]

> west
[OK: contains "Main Path"]

> unlock gate with keycard
[OK: not contains "can't"]

> open gate
[OK: not contains "can't"]

> south
[OK: contains "Supply Room"]

> examine radio
[OK: contains "duct tape"]

> switch on radio
[OK: not contains "can't"]

> switch off radio
[OK: not contains "can't"]

> take radio
[OK: contains "fixed in place"]
```

## Key takeaway

`ReadableTrait` separates what an object *says* (`read`) from what it *looks
like* (`examine`); type fixed plaques and signs `EntityType.SCENERY` and leave
portable brochures and books as plain items, and use `\n` to shape the text. `SwitchableTrait`
gives any device an on/off toggle through the `switch`/`turn` verbs, alone for a
plain device like the radio, or paired with another trait when the switch should
drive something. It's the sibling of `OpenableTrait`: same shape, different verbs,
different kind of object.
