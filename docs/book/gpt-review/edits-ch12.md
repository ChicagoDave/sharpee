# Ch 12 — Readable Objects & Switchable Devices: edit proposals

Entirely em-dash removal, including em dashes inside the quoted plaque/brochure
text and code comments. The prose is otherwise clear; nothing terse or
over-complex to rework. Each entry: location, reason, OLD → NEW.

Note: the em dashes inside the readable `text:` strings are part of in-world
sign/heading copy ("PYGMY GOATS — ...", "HOLLAND LOP RABBITS — ...", "ZOO FM — ...").
They are recast below to match the no-em-dash preference; if the author considers
these in-world prose rather than book prose, they can be left as-is.

---

### 1. "ReadableTrait — what an object says" example text — emdash
OLD: `text: 'PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, ' +`
NEW: `text: 'PYGMY GOATS: These Nigerian Dwarf goats are gentle, curious, ' +`

### 2. Body paragraph after the table — emdash
OLD: A brass plaque *looks like* "a brass plaque mounted on a wooden post." It *says* "PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, and always hungry."
NEW: A brass plaque *looks like* "a brass plaque mounted on a wooden post." It *says* "PYGMY GOATS: These Nigerian Dwarf goats are gentle, curious, and always hungry."

### 3. "The test for whether something wants a ReadableTrait" — emdash
OLD: A sign, a book, a letter, a label — yes. A rock, a fence, a tree — no; those just need a description.
NEW: A sign, a book, a letter, a label: yes. A rock, a fence, a tree: no; those just need a description.

### 4. "Readable scenery: the info plaque" code — emdash (in readable text string)
OLD:     'PYGMY GOATS — These Nigerian Dwarf goats are gentle, curious, ' +
NEW:     'PYGMY GOATS: These Nigerian Dwarf goats are gentle, curious, ' +

### 5. "Readable scenery: the info plaque" code — emdash (in readable text string)
OLD:     'HOLLAND LOP RABBITS — Known for their floppy ears and calm ' +
NEW:     'HOLLAND LOP RABBITS: Known for their floppy ears and calm ' +

### 6. "Readable items: the brochure" code — emdash (in readable text string)
OLD:     'WILLOWBROOK FAMILY ZOO — Your Guide\n\n' +
NEW:     'WILLOWBROOK FAMILY ZOO: Your Guide\n\n' +

### 7. After the brochure code — emdash
OLD: Readable scenery (plaques, warning signs) and readable items (brochures, letters, books) are the same trait — the only difference is whether you also add `SceneryTrait`.
NEW: Readable scenery (plaques, warning signs) and readable items (brochures, letters, books) are the same trait; the only difference is whether you also add `SceneryTrait`.

### 8. "SwitchableTrait — a device with on/off state" — emdash
OLD: But `SwitchableTrait` stands perfectly well on its own — for any device with an on/off state that isn't a light.
NEW: But `SwitchableTrait` stands perfectly well on its own, for any device with an on/off state that isn't a light.

### 9. After the radio code — emdash
OLD: The player can `switch on radio`, `switch off radio`, `turn on radio`, or `turn off radio` — the stdlib handles all four phrasings and reports the toggle.
NEW: The player can `switch on radio`, `switch off radio`, `turn on radio`, or `turn off radio`; the stdlib handles all four phrasings and reports the toggle.

### 10. "Switchable vs. openable" — emdash
OLD: `SwitchableTrait` and `OpenableTrait` look like twins — both hold a boolean, both have paired verbs — but they model different kinds of object, and the parser keeps their verbs apart:
NEW: `SwitchableTrait` and `OpenableTrait` look like twins (both hold a boolean, both have paired verbs), but they model different kinds of object, and the parser keeps their verbs apart:

### 11. "Try it" block comments — emdash
OLD: `> take keycard               Grab the staff keycard — it's here at the entrance`
NEW: `> take keycard               Grab the staff keycard; it's here at the entrance`

### 12. "Try it" block comments — emdash
OLD: `> read brochure              Read the guide — different from examine!`
NEW: `> read brochure              Read the guide, different from examine!`

### 13. "Try it" block comments — emdash
OLD: `> switch on radio            Click — it's on`
NEW: `> switch on radio            Click, it's on`

### 14. "Try it" block comments — emdash
OLD: `> switch off radio           Click — off again`
NEW: `> switch off radio           Click, off again`

### 15. "Try it" block comments — emdash
OLD: `> take radio                 Can't — it's scenery`
NEW: `> take radio                 Can't, it's scenery`

### 16. Key takeaway — emdash (contains em dashes, so fixed per instructions)
OLD: `SwitchableTrait` gives any device an on/off toggle through the `switch`/`turn` verbs — alone for a plain device like the radio, or paired with another trait when the switch should drive something. It's the sibling of `OpenableTrait`: same shape, different verbs, different kind of object.
NEW: `SwitchableTrait` gives any device an on/off toggle through the `switch`/`turn` verbs, alone for a plain device like the radio, or paired with another trait when the switch should drive something. It's the sibling of `OpenableTrait`: same shape, different verbs, different kind of object.
