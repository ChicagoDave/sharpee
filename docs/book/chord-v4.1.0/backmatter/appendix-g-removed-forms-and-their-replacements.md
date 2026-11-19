# Appendix G. Removed forms and their replacements {.unnumbered}

Forms Chord no longer accepts: 28 of them. The compiler still knows each one by name, so a story
that uses one gets an error that says what to write instead. The table gives each form, its
replacement and the error's code; the entries under it show a source that raises the error and the
compiler's own words. Generated from the `@sharpee/chord` registry of removed forms (Sharpee 5.7.0 · Chord 4.1.0) by
`scripts/generate-chord-appendices.cjs`.

| Removed form | Write instead | Error |
| --- | --- | --- |
| `it` and `its` outside `define trait` | the owner's name | `analysis.it-removed` |
| a channel's `from event` line | `return <construct> from <event>` | `parse.channel-from-removed` |
| a channel's `take` line | a `return` line | `parse.channel-take-removed` |
| `version:`, `blurb:` and `by:` in the story header | `story-version:`, `description:` and `authors:` | `parse.header-unknown-field` |
| a vehicle's `passage:` line | `pace: <n> turns` | `parse.passage-is-pace` |
| the one-line `passage <command> to <room>`, `… is blocked` and `… is deadly` lines | a `passage to <room>` block | `parse.passage-line-form` |
| the phrase strategies `ordered` and `once` | `stopping` and `first-time` | `parse.phrase-strategy-retired` |
| phrase text on the same line as its key | an indented prose block under the key | `parse.phrase-text-form` |
| `define action <name> from …` | a `define action <name>` block with an indented body | `parse.removed-action-hatch` |
| `define behavior … from` | a `define trait` with clauses, composed on the entity | `parse.removed-behavior-hatch` |
| `with max items`, `with max weight` and `with capacity` on a kind | a `holds <n>` line | `parse.removed-capacity-setting` |
| `define chain … from` | nothing yet: Chord has no form for this | `parse.removed-chain-hatch` |
| `with key the …` and `with tool the …` | `with the <thing>` | `parse.removed-config-keyword` |
| a region's `containing` line | an `in the <region>` line in each room, or `rooms <name> <first> to <last>` | `parse.removed-containing` |
| `create the player` | a named `playable` person, given the role in a `before the game starts` block | `parse.removed-create-player` |
| `define verb` | an `extend action <name>` block with a `grammar` line | `parse.removed-define-verb` |
| a top-level `every N turns` rule | a `define sequence`, or an `on every turn` clause on the owner | `parse.removed-every` |
| `define flag` | `states:` on the owner, or a condition over the world | `parse.removed-flag` |
| the `flag` field type in a trait's data | `states:` on the trait | `parse.removed-flag-field` |
| a clause head that ends in `it`, as in `on taking it` | a head that names who acts, as in `on the player taking` | `parse.removed-head-it` |
| `if` blocks | a `must` line, a `when` suffix on a statement, or `select` | `parse.removed-if` |
| a top-level `once <condition>` rule | a `, once` modifier on a clause of the owner | `parse.removed-once` |
| `define score` | a `score <name> worth N` line on the owner or in the story header | `parse.removed-score` |
| the `(name)` and `:name` slot spellings | `the <name>` | `parse.removed-slot-spelling` |
| `story "Title" by "Author"` | a bare `story` line with indented `title:` and `authors:` fields | `parse.removed-story-header` |
| `define text … from` | a `define phrase`, with a strategy if the text varies | `parse.removed-text-hatch` |
| a top-level `when` rule | an `after the player <verb>` clause on the entity or room it is about | `parse.removed-when` |
| the `select` strategies `ordered` and `once` | `stopping` and `first-time` | `parse.select-strategy-retired` |

## `analysis.it-removed` {.unnumbered .unlisted}

```text
create the sword
  a thing

  on the player taking
    remove it
  end on
```

```text
`it` is no longer a form outside `define trait` — name the owner: `the sword`.
```

## `parse.channel-from-removed` {.unnumbered .unlisted}

```text
define channel clock
  mode replace
  from event estate-clock
end channel
```

```text
`from event` was removed — the event rides the `return … from <event>` clause: `return <construct> from <event>`.
```

## `parse.channel-take-removed` {.unnumbered .unlisted}

```text
define channel clock
  mode replace
  take hour
end channel
```

```text
`take` was removed — a channel `return`s a construct: `return <field> from <event>`, `return "text (slot)" from <event>`, or `return phrase <key> from <event>`.
```

## `parse.header-unknown-field` {.unnumbered .unlisted}

```text
story
  title: The Lamp
  authors:
    A. Writer
  version: 1.0.0
```

```text
`version:` was removed from the story header — use `story-version:` instead.
```

## `parse.passage-is-pace` {.unnumbered .unlisted}

```text
create the gondola
  a vehicle
  passage: 5 turns
```

```text
`passage:` is retired — a flight vehicle's trip time is `pace: <n> turns`, the line every moving vehicle uses.
```

## `parse.passage-line-form` {.unnumbered .unlisted}

```text
create the Trench
  a room
  passage climb the rope to the Loft
```

```text
A passage is a block: `passage to <room>`, then `grammar` with one command per line under it, and `end passage`. For example:
  passage to the Loft
    grammar
      climb the rope
  end passage
```

## `parse.phrase-strategy-retired` {.unnumbered .unlisted}

```text
define phrase hint, ordered
  One.
or
  Two.
end phrase
```

```text
`ordered` is no longer a strategy adverb — use `stopping`.
```

## `parse.phrase-text-form` {.unnumbered .unlisted}

```text
define phrases en-US
  greet: "Hello."
```

```text
Phrase text goes in an indented prose block — the same-line form was removed.
```

## `parse.removed-action-hatch` {.unnumbered .unlisted}

```text
define action juggling from "./stunts.ts"
```

```text
`define action juggling from …` was removed — an action is written in Chord. Write it as a `define action juggling` block with an indented body.
```

## `parse.removed-behavior-hatch` {.unnumbered .unlisted}

```text
define behavior glowing from "./glow.ts"
```

```text
`define behavior … from` was removed — it had no binding key and could never fire. Author the behavior in Chord: `define trait <name>` with `on the player <verb>` clauses, composed on the entity.
```

## `parse.removed-capacity-setting` {.unnumbered .unlisted}

```text
create the jar
  a container with max items 3
```

```text
`with max items` was removed — write the capacity as its own line: `holds 3`.
```

## `parse.removed-chain-hatch` {.unnumbered .unlisted}

```text
define chain opened-revealed from "./reveal.ts"
```

```text
`define chain … from` was removed — a story cannot replace a standard event chain with its own code. Chord has no form for this yet; the behavior needs support in the language.
```

## `parse.removed-config-keyword` {.unnumbered .unlisted}

```text
create the gate
  a door
  lockable with key the brass key
```

```text
`with key the …` was removed — write the entity directly: `with the brass key`.
```

## `parse.removed-containing` {.unnumbered .unlisted}

```text
create the Cellars
  a region
  containing the Vault
```

```text
`containing` was removed — a region declares identical rooms with `rooms <name> <first> to <last>`, and any other room joins it with an `in the <region>` line in its own block.
```

## `parse.removed-create-player` {.unnumbered .unlisted}

```text
create the player
  a person
```

```text
`create the player` was removed — name the character, mark it `playable`, and assign the role in a `before the game starts` block.
```

## `parse.removed-define-verb` {.unnumbered .unlisted}

```text
define verb hang means put the item on the hook
```

```text
`define verb` was removed — add the verb onto the action directly: `extend action <name>` with a `grammar` pattern line (e.g. `extend action putting` → `hook the item on the hook`).
```

## `parse.removed-every` {.unnumbered .unlisted}

```text
every 3 turns
  phrase drip
end every
```

```text
Top-level `every N turns` rules were removed — use a story-owned `define sequence`, or an every-turn clause on the owner.
```

## `parse.removed-flag` {.unnumbered .unlisted}

```text
define flag lamp-found
```

```text
`define flag` was removed (Chord has no global booleans) — model the fact as `states:` on its owner, or derive it with a condition over world state.
```

## `parse.removed-flag-field` {.unnumbered .unlisted}

```text
define trait sticky
  data
    glue: flag starts false
end trait
```

```text
The `flag` field type was removed (Chord has no booleans at any scope) — declare `states[, reversible]: …` on the trait and name what the thing IS in each state.
```

## `parse.removed-head-it` {.unnumbered .unlisted}

```text
create the sword
  a thing

  on taking it
    phrase sharp
  end on
```

```text
`on taking it` is no longer a form — name who acts: `on the player taking` (or the actor's name).
```

## `parse.removed-if` {.unnumbered .unlisted}

```text
create the Hall
  a room

  on the player entering
    if the lamp is lit
      win
    end if
  end on
```

```text
`if` was removed — use a `must` requirement for guards (`it must be hungry: already-fed`), a statement `when` suffix for conditionals (`award X when <condition>`), or `select` for branching.
```

## `parse.removed-once` {.unnumbered .unlisted}

```text
once the lamp is lit
  win
end once
```

```text
Top-level `once <condition>` rules were removed — use a `, once` clause modifier on the owner: `on every turn while <condition>, once`.
```

## `parse.removed-score` {.unnumbered .unlisted}

```text
define score treasure worth 10
```

```text
`define score` was removed — attach the score to its earning owner: `score <name> worth N` in the owner's create/trait/action block or the story header.
```

## `parse.removed-slot-spelling` {.unnumbered .unlisted}

```text
extend action smelling
  grammar
    sniff (something)
```

```text
The `(something)` slot spelling was removed — write `the something`.
```

## `parse.removed-story-header` {.unnumbered .unlisted}

```text
story "The Lamp" by "A. Writer"
```

```text
`story "Title" by "Author"` was removed — use the fielded form: a bare `story` line, then indented `title: <title>` and an `authors:` list (one name per indented line).
```

## `parse.removed-text-hatch` {.unnumbered .unlisted}

```text
define text garbled from "./extras.ts"
```

```text
`define text … from` was removed — a story's text is written in Chord. Write it as a `define phrase`, with a strategy (`cycling`, `first-time`, `randomly`, `sticky`, `stopping`) if it varies.
```

## `parse.removed-when` {.unnumbered .unlisted}

```text
when the player takes the lamp
  win
end when
```

```text
Top-level `when` rules were removed — attach the rule to its owner: `after the player <verb>` on the entity or room it is about.
```

## `parse.select-strategy-retired` {.unnumbered .unlisted}

```text
create the lever
  a thing

  on the player pulling
    select ordered
      phrase first-pull
    or
      phrase second-pull
    end select
  end on
```

```text
`ordered` is no longer a strategy adverb — use `stopping`.
```
