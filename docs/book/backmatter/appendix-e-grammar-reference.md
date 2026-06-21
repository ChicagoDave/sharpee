# Appendix E — Grammar Reference {.unnumbered}

The core grammar patterns the English parser (`@sharpee/parser-en-us`) ships, generated
from the platform's grammar definitions; 118 core rules. Stories add their own with
`extendParser` (Volume V); the parser also auto-generates a `verb [object]` pattern for every
registered verb (see Appendix B for verb phrasings).

## Pattern syntax

| Token | Meaning |
|---|---|
| `word` | a literal word the player types |
| `a\|b` | alternatives — any one of the listed words |
| `:slot` | an object slot — matches an entity the player names (`:target`, `:item`, …) |
| `[word]` | an optional word (skipping it costs a little match confidence) |

**Priority** orders competing rules (higher wins): 100+ for semantic rules with trait
constraints, 100 standard, 95 synonyms, 90 abbreviations. **Constraint** shows trait
requirements on a slot (e.g. `container` → container) that make a rule match only suitable
objects.

## Core grammar rules

| Pattern | Action | Priority | Constraint |
|---|---|---|---|
| `look\|l` | `if.action.looking` | — | — |
| `examine\|x\|inspect :target` | `if.action.examining` | — | — |
| `look at :target` | `if.action.examining` | 95 | — |
| `look [carefully] at :target` | `if.action.examining_carefully` | 96 | — |
| `look [around]` | `if.action.looking` | 101 | — |
| `search [carefully]` | `if.action.searching` | 100 | — |
| `search :target` | `if.action.searching` | 100 | — |
| `look in\|inside :target` | `if.action.searching` | 100 | — |
| `look through :target` | `if.action.searching` | 100 | — |
| `rummage in\|through :target` | `if.action.searching` | 95 | — |
| `take\|get\|grab :item` | `if.action.taking` | — | — |
| `pick up :item` | `if.action.taking` | 100 | — |
| `drop\|discard :item` | `if.action.dropping` | — | — |
| `put down :item` | `if.action.dropping` | 100 | — |
| `eat\|consume\|devour :item` | `if.action.eating` | — | — |
| `drink\|sip\|quaff :item` | `if.action.drinking` | — | — |
| `put :item in\|into\|inside :container` | `if.action.inserting` | 100 | `container` → container |
| `insert :item in\|into :container` | `if.action.inserting` | 100 | `container` → container |
| `put :item on\|onto :supporter` | `if.action.putting` | 100 | `supporter` → supporter |
| `hang :item on :hook` | `if.action.putting` | 110 | — |
| `read\|peruse\|study :target` | `if.action.reading` | — | — |
| `inventory\|inv\|i` | `if.action.inventory` | — | — |
| `go :direction` | `if.action.going` | 100 | custom constraint |
| `` | `if.action.going` | — | directions |
| `open :door` | `if.action.opening` | 100 | `door` → openable |
| `close :door` | `if.action.closing` | 100 | `door` → openable |
| `turn\|switch\|flip on :device` | `if.action.switching_on` | — | `device` → switchable |
| `turn\|switch\|flip off :device` | `if.action.switching_off` | — | `device` → switchable |
| `turn :device on` | `if.action.switching_on` | — | `device` → switchable |
| `turn :device off` | `if.action.switching_off` | — | `device` → switchable |
| `push\|press\|shove\|move :target` | `if.action.pushing` | — | — |
| `pull\|drag\|yank :target` | `if.action.pulling` | — | — |
| `lower :target` | `if.action.lowering` | — | — |
| `raise\|lift :target` | `if.action.raising` | — | — |
| `wait\|z` | `if.action.waiting` | — | — |
| `save` | `if.action.saving` | 100 | — |
| `restore` | `if.action.restoring` | 100 | — |
| `restart` | `if.action.restarting` | 100 | — |
| `quit\|q` | `if.action.quitting` | — | — |
| `undo` | `if.action.undoing` | 100 | — |
| `score` | `if.action.scoring` | 100 | — |
| `version` | `if.action.version` | 100 | — |
| `help` | `if.action.help` | 100 | — |
| `about` | `if.action.about` | 100 | — |
| `info` | `if.action.about` | 100 | — |
| `credits` | `if.action.about` | 100 | — |
| `trace` | `author.trace` | 100 | — |
| `trace on` | `author.trace` | 100 | — |
| `trace off` | `author.trace` | 100 | — |
| `trace parser on` | `author.trace` | 100 | — |
| `trace parser off` | `author.trace` | 100 | — |
| `trace validation on` | `author.trace` | 100 | — |
| `trace validation off` | `author.trace` | 100 | — |
| `trace system on` | `author.trace` | 100 | — |
| `trace system off` | `author.trace` | 100 | — |
| `trace all on` | `author.trace` | 100 | — |
| `trace all off` | `author.trace` | 100 | — |
| `give :item to :recipient` | `if.action.giving` | 100 | `recipient` → actor |
| `give :recipient :item` | `if.action.giving` | 95 | `recipient` → actor |
| `offer :item to :recipient` | `if.action.giving` | 100 | `recipient` → actor |
| `show :item to :recipient` | `if.action.showing` | 100 | `recipient` → actor |
| `show :recipient :item` | `if.action.showing` | 95 | `recipient` → actor |
| `throw :item at :target` | `if.action.throwing` | 100 | — |
| `throw :item to :recipient` | `if.action.throwing` | 100 | — |
| `take :item from :container with\|using :tool` | `if.action.taking_with` | 110 | instrument |
| `unlock :door with\|using :key` | `if.action.unlocking` | 110 | instrument |
| `open :container with\|using :tool` | `if.action.opening_with` | 110 | instrument; `container` → openable |
| `cut :object with\|using :tool` | `if.action.cutting` | 110 | instrument |
| `attack\|kill\|fight\|slay\|murder\|hit\|strike :target` | `if.action.attacking` | — | — |
| `attack :target with\|using :weapon` | `if.action.attacking` | 110 | instrument |
| `kill :target with\|using :weapon` | `if.action.attacking` | 110 | instrument |
| `hit :target with\|using :weapon` | `if.action.attacking` | 110 | instrument |
| `strike :target with\|using :weapon` | `if.action.attacking` | 110 | instrument |
| `dig :location with\|using :tool` | `if.action.digging` | 110 | instrument |
| `say :message` | `if.action.saying` | 100 | — |
| `say :message to :recipient` | `if.action.saying_to` | 105 | `recipient` → actor |
| `write :message` | `if.action.writing` | 100 | — |
| `write :message on :surface` | `if.action.writing_on` | 105 | — |
| `shout :message` | `if.action.shouting` | 100 | — |
| `whisper :message to :recipient` | `if.action.whispering` | 100 | `recipient` → actor |
| `tell :recipient about :topic` | `if.action.telling` | 100 | `recipient` → actor |
| `ask :recipient about :topic` | `if.action.asking` | 100 | `recipient` → actor |
| `touch\|rub\|feel\|pat\|stroke\|poke\|prod :target` | `if.action.touching` | — | — |
| `enter :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `get in :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `get into :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `climb in :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `climb into :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `go in :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `go into :portal` | `if.action.entering` | 100 | `portal` → enterable |
| `exit` | `if.action.exiting` | 100 | — |
| `get out` | `if.action.exiting` | 100 | — |
| `leave` | `if.action.exiting` | 95 | — |
| `climb out` | `if.action.exiting` | 100 | — |
| `board :vehicle` | `if.action.entering` | 100 | `vehicle` → enterable |
| `get on :vehicle` | `if.action.entering` | 100 | `vehicle` → enterable |
| `exit :container` | `if.action.exiting` | 100 | `container` → enterable |
| `disembark` | `if.action.exiting` | 100 | — |
| `disembark :vehicle` | `if.action.exiting` | 100 | `vehicle` → enterable |
| `get off :vehicle` | `if.action.exiting` | 100 | `vehicle` → enterable |
| `alight` | `if.action.exiting` | 95 | — |
| `again` | `if.action.again` | 100 | — |
| `g` | `if.action.again` | 90 | — |
| `hide behind :target` | `if.action.hiding` | 100 | — |
| `duck behind :target` | `if.action.hiding` | 100 | — |
| `crouch behind :target` | `if.action.hiding` | 100 | — |
| `hide under :target` | `if.action.hiding` | 100 | — |
| `duck under :target` | `if.action.hiding` | 100 | — |
| `crouch under :target` | `if.action.hiding` | 100 | — |
| `hide on :target` | `if.action.hiding` | 100 | — |
| `hide in :target` | `if.action.hiding` | 100 | — |
| `hide inside :target` | `if.action.hiding` | 100 | — |
| `duck inside :target` | `if.action.hiding` | 100 | — |
| `stand up` | `if.action.revealing` | 100 | — |
| `come out` | `if.action.revealing` | 100 | — |
| `reveal myself` | `if.action.revealing` | 100 | — |
| `unhide` | `if.action.revealing` | 100 | — |
| `stop hiding` | `if.action.revealing` | 100 | — |
