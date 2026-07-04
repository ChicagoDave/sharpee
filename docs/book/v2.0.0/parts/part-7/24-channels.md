::: {.part-page}

# Volume VII — Presentation {.part .unnumbered}

:::

# Channels: The Universal UI Surface

You've built a complete game, but the book has quietly treated "what the player
sees" as one thing: prose. A running story shows far more: where you are, your
score, the turn count, a command prompt, and, in a rich client, images and sound.
How does all of that travel from the engine to the screen, the same way whether the
game runs in a terminal, a browser, or a multi-user server? Through **channels**,
the foundation this whole volume builds on.

## One surface for everything

A **channel** is a named stream of signals from the story to the UI. The key idea
is that *everything* the player perceives travels over a channel, not just the
prose. The narrative is the `main` channel; the location and score are the
`location` and `score` channels; the command prompt is the `prompt` channel; images
and sound are media channels. There is no special path for prose and a separate one
for the status bar. One mechanism carries it all, which is why channels are called
the universal UI surface.

## A turn produces a packet

Each turn, the engine asks every channel "what do you have this turn?" and
assembles the answers into a **turn packet**: the set of channels that emitted,
each with its value. On the other side, the client hands each channel's payload to a
matching **renderer** that updates the corresponding piece of UI: the prose window,
the status line, the score display.

Because the packet is just data, the same turn packets can drive an in-process
browser client *and* a multi-user server with one renderer per connected player.
The engine produces signals; how (and where) they're drawn is entirely the client's
business.

## Channel modes

Every channel has a **mode** that tells the renderer how its value behaves from turn
to turn:

| Mode | Meaning | Examples |
|---|---|---|
| `replace` | A single current value that supersedes the last | `location`, `score`, `prompt` |
| `append` | New entries each turn that accumulate | `main` (the prose log) |
| `event` | A one-off, transient signal | `death`, `endgame`, a sound |

The mode is what lets the score display *overwrite* while the prose window *grows*
and a death notice *fires once*. It's the first thing you decide when defining a
channel.

## The channels you get for free

The standard library registers a full set of channels, fed by the same world and
events the rest of your story already produces. You wire none of them:

| Channel | Mode | Carries |
|---|---|---|
| `main` | append | the prose-pipeline text blocks |
| `location` | replace | the player's current room name |
| `score` | replace | the score (from the ledger in Volume VI) |
| `turn` | replace | the turn count |
| `prompt` | replace | the command prompt |
| `info`, `ifid` | replace | story metadata |
| `death`, `endgame`, `score_notify` | event | endgame and scoring signals |
| `lifecycle` | event | save/restore outcome signals (saved, restored, failed) |

The `score` channel reads the ledger you set up in *Scoring & Endgame*; the
`location` channel reads the player's room; the `main` channel carries the blocks
the prose pipeline rendered. Channels are the seam where everything you've already
built becomes something a client can show.

## Capability negotiation

Not every client can display everything. At startup the client declares its
**capabilities**, and the engine replies with a **manifest** listing the channels
available to *that* client; a text-only terminal simply never sees the media
channels. After the manifest, the per-turn packets flow. As an author you rarely
touch this. It's the machinery that lets one story serve a bare terminal and a
graphical browser from exactly the same code.

## Defining your own channel

When your story has a UI signal the standard channels don't cover, such as an
ambient mood line, a custom HUD value, or a trigger for a story-specific overlay,
you define your own **`IOChannel`** in the `registerChannels` hook. The hook's
types come from `@sharpee/if-domain`, so this chapter adds one import:

```typescript
import type { IChannelRegistry, ChannelProduceContext } from '@sharpee/if-domain';
```

A channel is an
object with an
`id`, a `contentType`, a `mode`, an `emit` policy, and a `produce` closure:

```typescript
// A mood line per room; rooms not listed clear the line.
const AMBIENCE_BY_ROOM: Record<string, string> = {
  'Aviary': 'The air is alive with birdsong and the rustle of wings.',
  'Nocturnal Animals Exhibit': 'Your eyes strain against the warm red dark.',
};

registerChannels(registry: IChannelRegistry): void {
  registry.add({
    id: 'zoo.ambience',
    contentType: 'text',
    mode: 'replace',
    emit: 'sparse',          // only re-emit when the value changes
    produce: (ctx: ChannelProduceContext) => {
      const world = ctx.world as WorldModel;
      const room = world.getEntity(world.getLocation(world.getPlayer()!.id)!);
      // a mood line for the current room, or '' to clear the line
      return room ? AMBIENCE_BY_ROOM[room.name] ?? '' : '';
    },
  });
}
```

`produce` receives a context with the turn's `world`, `events`, `blocks`, `turn`
number, and the channel's `prevValue`. Return a value to emit it, or `undefined` to
stay silent. The `emit` policy decides idle turns: `sparse` emits only when the
value changes; `always` emits every turn. To *override* a standard channel, register
one with the same `id`. Last write wins.

One subtlety to internalize, because it bites everyone once: on a `sparse`
`replace` channel, `undefined` means *"no change this turn,"* **not** *"clear the
line."* The channel doesn't re-emit, so whatever it last showed stays on screen. If
you returned `undefined` for "rooms without a mood," the previous room's line would
follow the player around. To actually blank the line you must emit a *different*
value, here the empty string `''`, which is a real transition the renderer paints
as blank (and `sparse` then stays quiet until the mood changes again). Reach for
`undefined` only when you genuinely want the current value to persist untouched.

Crucially, a channel emits **data** (text, a number, JSON), never UI. The value
says *what*; the renderer (next chapter) decides *how* it looks. That data-only wire
is what keeps presentation in the client's hands, where an author can restyle or
replace it per story.

Family Zoo's `ch24-27-presentation/` snapshot ships exactly this `zoo.ambience`
channel, a one-line mood description
for each area, and its browser entry registers a renderer that creates a dedicated
page element and paints the line into it. The chapters ahead build on that concrete
example.

## Key takeaway

Channels are the universal UI surface: every story-to-player signal (prose, status,
prompt, media) travels as a named channel, and each turn the engine emits a packet
of the ones that changed for the client to render. A channel's **mode**
(`replace`/`append`/`event`) tells the renderer how its value behaves; the standard
channels come free, and you add your own `IOChannel` in `registerChannels`,
returning data, never UI. Because the wire is data-only, one story drives a
terminal, a browser, or a multi-user server unchanged. That portability is the
subject of the chapters ahead.
