---
title: Grammar & Commands Reference
description: Player-facing command syntax and grammar patterns
---

This is a reference of all built-in commands available to players. Stories can extend grammar with additional commands.

## Directions

Players can move using direction words or single-letter abbreviations:

| Direction | Abbreviation | Direction | Abbreviation |
|-----------|-------------|-----------|-------------|
| north | n | south | s |
| east | e | west | w |
| northeast | ne | northwest | nw |
| southeast | se | southwest | sw |
| up | u | down | d |
| in | — | out | — |

All directions also work with `go`: `go north`, `go up`, etc.

## Object Manipulation

```
take/get/grab <item>          Pick up an item
pick up <item>                Pick up (phrasal verb)
drop/discard <item>           Put down a held item
put down <item>               Put down (phrasal verb)
put <item> in <container>     Place item inside container
put <item> on <supporter>     Place item on surface
insert <item> in <container>  Same as "put in"
hang <item> on <hook>         Hang item on supporter
remove <item> from <source>   Remove from container/supporter
throw <item> at <target>      Throw at target
throw <item> to <recipient>   Throw to person
```

## Looking & Examining

```
look / l                      Describe current location
examine/x/inspect <target>    Examine something closely
look at <target>              Same as examine
search <target>               Search inside something
look in/inside <target>       Same as search
look through <target>         Same as search
rummage in/through <target>   Same as search
```

## Containers & Doors

```
open <target>                 Open a door, container, or book
close <target>                Close something
lock <target>                 Lock with default key
lock <target> with <key>      Lock with specific key
unlock <target>               Unlock with default key
unlock <target> with <key>    Unlock with specific key
open <target> with <tool>     Open with a tool
```

## Devices

```
turn on <device>              Turn on a device
turn <device> on              Same (alternate word order)
switch/flip on <device>       Synonyms for turn on
turn off <device>             Turn off a device
switch/flip off <device>      Synonyms for turn off
push/press/shove <target>     Push something
pull/drag/yank <target>       Pull something
lower <target>                Lower something
raise/lift <target>           Raise something
```

## Entry & Exit

```
enter <portal>                Enter a container or vehicle
get in/into <portal>          Same as enter
climb in/into <portal>        Same as enter
board <vehicle>               Board a vehicle
get on <vehicle>              Get on a vehicle
exit                          Leave current container/vehicle
get out / leave / climb out   Synonyms for exit
disembark                     Leave a vehicle
get off <vehicle>             Same as disembark
```

## Wearing

```
wear <item>                   Put on wearable item
put on <item>                 Same as wear
take off <item>               Remove worn item
remove <item>                 Remove worn item
doff <item>                   Same as take off
```

## Senses

```
read/peruse/study <target>    Read text on something
touch/feel/rub <target>       Touch something
pat/stroke/poke/prod <target> Touch synonyms
listen                        Listen to surroundings
listen to <target>            Listen to something
smell                         Smell surroundings
smell <target>                Smell something
```

## Communication

```
talk to <npc>                 Talk to someone
give/offer <item> to <npc>    Give item to NPC
give <npc> <item>             Alternate word order
show <item> to <npc>          Show item to NPC
show <npc> <item>             Alternate word order
ask <npc> about <topic>       Ask about something
tell <npc> about <topic>      Tell about something
```

## Combat

```
attack/kill/fight <target>    Attack something
hit/strike/slay <target>      Synonyms for attack
attack <target> with <weapon> Attack using specific weapon
hit <target> with <weapon>    Same with synonym
```

## Consumption

```
eat <item>                    Eat food
drink/quaff <item>            Drink liquid
```

## Meta Commands

```
inventory / inv / i           Show what you're carrying
wait / z                      Wait one turn
sleep                         Try to sleep
score                         Show current score
save                          Save game
restore                       Load saved game
restart                       Restart game
undo                          Undo last command
again / g                     Repeat last command
quit / q                      Exit game
help                          Show help
about                         Show game information
version                       Show version
```

## Extending Grammar in Stories

Stories can add custom commands in `extendParser()`:

```typescript
extendParser(parser: Parser): void {
  const grammar = parser.getStoryGrammar();

  // Simple literal command
  grammar
    .define('ring bell')
    .mapsTo('dungeo.action.ring_bell')
    .withPriority(150)
    .build();

  // Command with a slot
  grammar
    .define('say :message')
    .mapsTo('dungeo.action.say')
    .withPriority(150)
    .build();

  // Command with trait constraint
  grammar
    .define('turn :dial to :number')
    .where('dial', (scope) => scope.visible().matching({ type: 'dial' }))
    .mapsTo('dungeo.action.turn_dial')
    .withPriority(150)
    .build();
}
```

Use priority 150+ for story-specific commands to ensure they take precedence over built-in patterns.

## Parser Notes

- **Multi-object support**: Commands like `take all`, `drop all but lamp`, and `take sword and shield` are handled automatically by the parser.
- **Abbreviations**: Single-letter abbreviations (n, s, e, w, u, d, l, x, i, z, g, q) are recognized.
- **Disambiguation**: When a command is ambiguous ("take ball" with multiple balls present), the parser asks the player to clarify.
- **Articles ignored**: "the", "a", and "an" are stripped — `take the lamp` and `take lamp` are equivalent.
