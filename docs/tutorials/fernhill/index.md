
# The Folly at Fernhill

*The Folly at Fernhill* is a complete estate mystery written entirely in
**Chord**, Sharpee's story language. One winter night, one player, thirteen
rooms, three NPCs, a boiler with opinions — and the deed that keeps Fernhill
in the family, if you can find it before dawn.

This tutorial walks through the whole story, pattern by pattern. By the end
you will have seen every major Chord surface used in a real, shipping game:
the world model, objects and tools, people and conversation, time and
machines, custom state and verbs, scoring and endings, and the browser
presentation layer.

## Chord is a modeling language

Before the first line: Chord is a domain **modeling** language, not a
programming language in story-shaped clothes. You write facts about the
world — *the cellar is dark*, *the door unlocks with the tarnished key*,
*Smoke follows you once she's been fed* — and the engine makes them true.
There are no variables, no loops, and no `if` statement.

That last absence is deliberate. **If you find yourself reaching for `if`,
you haven't found the domain abstraction yet.** Every conditional in
Fernhill is a fact with a condition attached (`north is blocked while the
boiler is off`), a state an entity is in (`states: coiled, lit, cut`), or a
rule scoped to a moment (`after entering it while the player has the
deed`). The world holds the logic; the prose stays prose.

The rule of thumb when something won't express: **IF concepts belong in
Chord; engine concepts belong in Sharpee; general computation belongs in
TypeScript.** If Chord can't say an interactive-fiction idea, that's a gap
to raise — the platform improves Chord rather than asking your story to
drop into TypeScript.

## Three tiers of vocabulary

Reading any `.story` file, every adjective on a `create` line comes from one
of three places. Knowing which is which makes the whole language legible:

| Tier | Examples in Fernhill | Where it comes from |
|------|---------------------|---------------------|
| Core catalog | `scenery`, `concealed`, `switchable`, `readable`, `wearable`, `a container`, `dark` | Built into Chord — always available |
| Extension & NPC library | `follower`, `guard`, `patrol with route […]`, `define machine` (via `use state-machines`) | Platform manifests, some behind a `use` line |
| Authored traits | `feedable`, `prunable`, `windable` | Defined in the story itself with `define trait` |

## One concept you'll see everywhere: `phrase`

A `phrase` is a named piece of prose. Everything the game says beyond bare
descriptions flows through one: refusal messages, event narration, replies,
endings. Declare it once (`define phrase clock-chime … end phrase`), speak
it from any rule (`phrase clock-chime`), give it variants and a strategy
(`randomly`, `cycling`, `first-time`), or gate it on world state. When a
chapter says "and speaks its line," it means a `phrase`.

## The game

**Premise**: Fernhill goes to auction at dawn. Great-Aunt Verity hid the
original deed somewhere on the estate twenty years ago, the night of the
folly fire. You have one night to find it.

**Shape**: 13 rooms in two regions (the frozen Grounds, the shut-up House),
a housekeeper who guards the study, a groundskeeper on patrol who knows
more than he says, a cat who can be bribed with a kipper, a three-stage
boiler that unfreezes the greenhouse, a vine that fruits silver, a fuse
with real stakes, three endings, and a perfect score of 50.

## What you'll learn

| Chapter | Pattern group | Highlights |
|---------|--------------|------------|
| [The world](./world.md) | A — rooms, doors, regions | compass map, `through` doors, darkness, live blocked exits, crossing reactions, daemons |
| [Things](./things.md) | B — objects & tools | containers, the declarative capability family, concealment, readables, scenery craft |
| [People](./people.md) | C — NPCs & conversation | guard, patrol, give-gating, topic tables |
| [The long night](./time.md) | D — time & causality | timelines, the fuse, recurring events, state machines |
| [State & verbs](./state.md) | E — custom mechanics | entity state chains, authored traits, custom verbs, refusals |
| [Endings & text](./endings.md) | F, G1–G2 — payoff | owner-attached scores, three endings, phrase strategies, gated detail |
| [The browser](./browser.md) | G4–G5 — presentation | sound, images, ambient beds, dynamic channels, graceful text degradation |

## Prerequisites

- Node.js 18+
- No TypeScript required — Fernhill is pure Chord

## Setting up

Install the author tool and scaffold a project:

```bash
npm i -g @sharpee/devkit
sharpee init fernhill
cd fernhill
npm install
```

`sharpee init` scaffolds a Chord project by default: your whole story lives
in `fernhill.story`, and `src/browser-entry.ts` is the (optional) browser
wiring you'll meet in the last chapter. The working loop is three commands:

```bash
sharpee build            # compile gate — every load error, before anything runs
sharpee test             # run your transcript tests
sharpee play             # play in the terminal
```

and one more when you're ready to ship:

```bash
sharpee build --browser  # a self-contained playable page in dist/web/
```

The full grammar reference lives in the repository at
`docs/reference/chord-grammar.md`; each chapter names the sections it
draws on. Start with [the world](./world.md).
