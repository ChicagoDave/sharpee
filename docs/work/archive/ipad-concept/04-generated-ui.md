# 04 — The inspector is generated, not designed

**Created**: 2026-09-11
**Status**: EXPLORATORY

This is the strongest mechanism in the concept and the reason the app is
smaller than it looks.

## A trait declaration is a UI schema

```
define trait lockable
    data
        key: entity
        stiffness: optional one of easy, stiff, starts easy
    states, reversible: locked, unlocked
    score picking-it worth 5
    phrases en-US
        locked-shut:
            It is locked.
        unlocks:
            The lock turns over with a soft clack.
end trait
```

Every row of that block determines a control. Five rules cover it:

| Declaration | Control |
|---|---|
| `key: entity` | Thing picker, required — the trait cannot be left half-set |
| `… one of a, b` | Segmented control, one segment per value |
| `optional` | Adds a *Not set* segment |
| `… : number` | Stepper |
| `states[, reversible]: …` | Segmented control writing `starts <state>`; reversible means both directions are offered later as `on…` steps |
| `score X worth N` | Points row — shown *only* because the trait carries one |
| `phrases <locale>` | One editable prose row per key |

Nothing about any trait is compiled into the app. The palette is the character
manifest plus every `define trait` in the open story; a trait that arrives
later with the language gets a tile and a working inspector the moment the file
parses, with no app release involved.

The same argument extends beyond traits. Chord's closed vocabularies —
dispositions, moods, forces, act categories, strategies, priorities, landing
strategies — are all pickers by construction rather than by hand.

## Editing a phrase row

Changing a line in the trait's `phrases` block from a *thing's* inspector
writes a per-entity `phrase` override on that thing. It never touches the
trait. This distinction must be visible somewhere or a child will eventually
edit one door and change every door; currently it is only implied.

## The filter

The novice-facing surface is an **allow-list of construct kinds**, not a
different language and not a different parser.

Exposed: `create` (rooms, things, people, containers, supporters, doors),
compositions and trait settings, `states`, placement (`in`, `starts in`,
`carries`, `wears`), exits with `through` and `one-way`, descriptions and
`first time`, `phrase` with variants and strategies, `on`/`after` with the
statement set below, `score`/`award`, the start block, and the story header's
`title` / `authors` / `prologue` / `ifid`.

Statements exposed: `phrase`, `award`, `move`, `change <x> to <state>`,
`remove`, `win`, `lose`, `refuse … :`, each with the `when` suffix.

Filtered out: the character model (ADR-310), the normative layer (ADR-318),
conversations and manner (ADR-320), machines, timers, chapters, counters,
regions, channels, assets, phrasebooks, message overrides, action definition
and alteration.

**The filter is not a fork.** A story using any of it still opens, parses,
compiles and plays; the filtered blocks render as read-only source cards on
the canvas. That property falls out of D1 and is the reason the cap can be
moved later without a migration.
