# Em-dash review — Chapter 12: Readable Objects & Switchable Devices

Six em-dash occurrences across six lines. Lines 22 and 117 are `##` headings (recast the trait-name gloss dash to a colon). Lines 4, 19, and 51 are prose paragraphs (recast). Line 130 is in-world copy on a radio sticker the player reads (LEAVE).

### 1. Line 4 — opening paragraph (warning sign appositive) — prose
OLD:
A zoo is full of things to read. Brass plaques by the enclosures, a glossy
brochure at the entrance, a yellow warning sign outside the nocturnal exhibit —
each one *says* something the player wants to take in, separate from what it
*looks* like. And tucked on a shelf in the supply room is a battered radio that
clicks on and off but sheds no light at all. This chapter covers two small,
self-contained traits that round out an ordinary world: `ReadableTrait` for
things with words, and `SwitchableTrait` for devices with an on/off state.

NEW:
A zoo is full of things to read. Brass plaques by the enclosures, a glossy
brochure at the entrance, a yellow warning sign outside the nocturnal exhibit.
Each sign *says* something the player wants to take in, separate from what it
*looks* like. And tucked on a shelf in the supply room is a battered radio that
clicks on and off but sheds no light at all. This chapter covers two small,
self-contained traits that round out an ordinary world: `ReadableTrait` for
things with words, and `SwitchableTrait` for devices with an on/off state.

### 2. Line 19 — "snippets go in initializeWorld" paragraph — prose
OLD:
The snippets below go in `initializeWorld`, alongside the rooms you've built since
Chapter 4 — `entrance`, `pettingZoo`, and `supplyRoom` are the same room entities
from earlier chapters.

NEW:
The snippets below go in `initializeWorld`, alongside the rooms you've built since
Chapter 4. `entrance`, `pettingZoo`, and `supplyRoom` are the same room entities
from earlier chapters.

### 3. Line 22 — `ReadableTrait` section heading — heading
OLD:
## ReadableTrait — what an object says

NEW:
## ReadableTrait: what an object says

### 4. Line 51 — "Plaques are scenery" paragraph — prose
OLD:
Plaques are scenery you can read but can't take. Stack three traits — identity,
readable text, and scenery:

NEW:
Plaques are scenery you can read but can't take. Each includes `IdentityTrait`,
`ReadableTrait`, and `SceneryTrait`.

### 5. Line 117 — `SwitchableTrait` section heading — heading
OLD:
## SwitchableTrait — a device with on/off state

NEW:
## SwitchableTrait: a device with on/off state

### 6. Line 130 — radio sticker copy ("ZOO FM") — in-world
OLD:
    'A battered portable radio held together with duct tape. A faded ' +
    'sticker on the side reads "ZOO FM — All Animals, All The Time."',

NEW:
    'A battered portable radio held together with duct tape. A faded ' +
    'sticker on the side reads "ZOO FM | All Animals, All The Time."',
