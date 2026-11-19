# Appendix B. Kinds, trait words, state words and their pairings {.unnumbered}

The closed word lists the compiler checks a story against: 9 kinds, 43 trait words
and 10 state words. A word marked with a `use` line belongs to an opt-in system and needs
that line in the story. Generated from the `@sharpee/chord` vocabulary (Sharpee 5.6.4 · Chord 4.0.3) by
`scripts/generate-chord-appendices.cjs`.

## Kinds {.unnumbered .unlisted}

| Kind | Needs |
| --- | --- |
| `container` |  |
| `door` |  |
| `expanse` | `use expanses` |
| `person` |  |
| `region` |  |
| `room` |  |
| `supporter` |  |
| `thing` |  |
| `vehicle` |  |

## Trait words and their settings {.unnumbered .unlisted}

| Trait word | Settings | Needs |
| --- | --- | --- |
| `attached` | anchor: a thing |  |
| `breakable` |  |  |
| `climbable` |  |  |
| `combatant` | health: a number; max-health: a number; skill: a number; base-damage: a number; armor: a number; attack-power: a number; defense: a number; experience-value: a number; hostile: a word; can-retaliate: a word; drops-inventory: a word; is-undead: a word | `use combat` |
| `concealed` |  |  |
| `costs` |  |  |
| `cuttable` | tool: a thing |  |
| `dark` |  |  |
| `detachable` |  |  |
| `diggable` | tool: a thing |  |
| `drinkable` |  |  |
| `edible` |  |  |
| `enterable` |  |  |
| `flammable` | tool: a thing |  |
| `floats` |  | `use expanses` |
| `follower` | immediate: a word; can-move: a word; announces-movement: a word; allowed-rooms: a list; forbidden-rooms: a list |  |
| `fragile` |  |  |
| `guard` | can-move: a word; announces-movement: a word; allowed-rooms: a list; forbidden-rooms: a list |  |
| `hiding-spot` |  |  |
| `light-source` | tool: a thing |  |
| `listener` |  |  |
| `lockable` | key: a thing |  |
| `loud` |  |  |
| `night-vision` |  |  |
| `open-inventory` |  |  |
| `openable` | tool: a thing |  |
| `passive` | can-move: a word; announces-movement: a word; allowed-rooms: a list; forbidden-rooms: a list |  |
| `patrol` | route: a list; loop: a word; wait-turns: a number; can-move: a word; announces-movement: a word; allowed-rooms: a list; forbidden-rooms: a list |  |
| `plural` |  |  |
| `powered` | source: a thing |  |
| `proper` |  |  |
| `pullable` |  |  |
| `pushable` |  |  |
| `readable` |  |  |
| `scenery` |  |  |
| `settable` |  |  |
| `smelly` |  |  |
| `switchable` |  |  |
| `transparent` |  |  |
| `unlisted` |  |  |
| `wanderer` | move-chance: a number; can-move: a word; announces-movement: a word; allowed-rooms: a list; forbidden-rooms: a list |  |
| `weapon` | damage: a number; skill-bonus: a number; is-blessed: a word; glows-near-danger: a word | `use combat` |
| `wearable` |  |  |

## State words {.unnumbered .unlisted}

| State word |
| --- |
| `attached` |
| `broken` |
| `closed` |
| `lit` |
| `locked` |
| `off` |
| `on` |
| `open` |
| `unlocked` |
| `worn` |

## State pairs the platform owns {.unnumbered .unlisted}

A thing with the trait word already has this pair, so a story does not declare it as states.

| State | Opposite | Trait word |
| --- | --- | --- |
| `open` | `closed` | `openable` |
| `locked` | `unlocked` | `lockable` |
| `on` | `off` | `switchable` |
| `lit` | `unlit` | `light-source` |
| `worn` | `unworn` | `wearable` |
| `whole` | `broken` | `breakable` |

## Words after `starts` {.unnumbered .unlisted}

| Word | Needs the trait word |
| --- | --- |
| `broken` | `breakable` |
| `closed` | `openable` |
| `lit` | `light-source` |
| `locked` | `lockable` |
| `off` | `switchable` |
| `on` | `switchable` |
| `open` | `openable` |
| `unlit` | `light-source` |
| `unlocked` | `lockable` |

## Words after `change … to` {.unnumbered .unlisted}

| Word | Needs the trait word |
| --- | --- |
| `broken` | `breakable` |
| `closed` | `openable` |
| `lit` | `light-source` |
| `locked` | `lockable` |
| `off` | `switchable` |
| `on` | `switchable` |
| `open` | `openable` |
| `unlit` | `light-source` |
| `unlocked` | `lockable` |
| `whole` | `breakable` |
