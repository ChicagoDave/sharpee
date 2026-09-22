# Channel I/O: a primer for IF people who don't know Sharpee

You know parser IF. You have shipped something in Inform, or TADS, or Dialog, or
you have written your own engine. This document assumes all of that and assumes
nothing about Sharpee. It explains one subsystem: **channel I/O**, the thing that
sits between "the turn finished" and "the player sees something."

If you read only one paragraph: in most IF systems a turn produces a stream of
text, and the interpreter's job is to print it. In Sharpee a turn produces a
**packet of named, typed values**, and the client's job is to decide what each
one becomes. The room name is not the first line of a blob; it is a channel
called `room-name` that a client may render as a heading, a window title, a
breadcrumb, a spoken announcement, or nothing at all.

---

## 1. The problem this solves

Glk gave IF a real answer to "where does text go": windows. The game opens them,
arranges them, and writes into them. It is a good model and it has a ceiling. The
game has to know the shape of the display in order to use it, so a game written
for a two-window layout is a game that assumes a two-window layout. Anything the
interpreter wants to do differently, it has to do by guessing at the meaning of
text the game already committed to a window.

The status line is the clearest case. In a classic build, the score is a number
the game formats into a string and prints at a fixed screen position. A client
that wants to draw a progress ring instead has to parse the string back into a
number, and a screen reader that wants to announce "score: 12 of 616" has to
reconstruct semantics the game threw away on the way out.

Channel I/O moves the boundary. The engine publishes *what happened*, typed and
named, and never decides where it lands:

```
score channel  →  { "current": 12, "max": 616 }
```

That is a number to a status bar, a ring to a graphical client, a sentence to a
screen reader, and an assertion to a test harness. None of those clients had to
agree in advance, and the engine did not have to know which one it was talking
to.

---

## 2. The mental model

Three parties, and they are only loosely coupled.

A **channel** is a named output. It has an id (`score`, `room-description`,
`music`), a content type, an update mode, and a closure that computes its value
for the current turn. Channels are registered in a registry. The platform ships
about three dozen; a story adds its own.

The **channel service** runs once per session. At the end of every turn it walks
the registry, calls each channel's closure, applies the channel's emission rules,
and hands back one packet.

A **renderer** lives on the client side. It subscribes to channel ids and turns
values into whatever the client does: DOM in a browser, ANSI in a terminal, rows
in a test report, native views in the macOS IDE.

The engine never imports a renderer and the renderer never imports the engine.
They share one thing: a package of wire types
(`packages/if-domain/src/channels/`) that both sides import directly, so a change
to the protocol breaks the compile on both sides in the same commit rather than
breaking the display at runtime.

---

## 3. Three packets

The whole protocol is four packet kinds, three of which matter here.

**Hello** goes client to server, once, at session start. It is the client
declaring what it can do: `images`, `sound`, `splitPane`, `statusBar`,
`clickableText`, and so on. A terminal says false to almost everything. A browser
client says true to most of it.

**CMGT** (channel management) goes server to client, once, in reply. It is the
manifest: every channel this particular client will ever see, with its
configuration, and nothing else. No values. The manifest is *per client*, because
channels can be gated on a capability. A client that did not declare `sound` is
not told the `sound` channel exists.

**Turn** goes server to client, once per turn. A record keyed by channel id. Only
the channels that emitted this turn appear.

Here is what that filtering actually costs, measured against the shipped registry
on 2026-09-22:

| Client profile | Channels in its manifest |
| --- | --- |
| Everything declared true | 37 |
| The CLI / test profile (text only) | 23 |

The fourteen that vanish are the media and author-introspection channels. The
story's code did not change and does not know.

---

## 4. Anatomy of a channel

```ts
interface IOChannel<T> {
  id: string;
  contentType: 'text' | 'number' | 'json';
  mode: 'replace' | 'append' | 'event';
  emit: 'always' | 'sparse';
  gatedBy?: CapabilityFlag;
  produce(ctx): T | T[] | undefined | null;
}
```

**Mode** is the thing to get right, and it is where a channel's whole personality
lives.

`replace` means the newest value supersedes the last one. Score, location, turn
count, the current music track. A client joining mid-session can be caught up by
replaying the latest value of every replace channel.

`append` means the value is a chronological list and each turn contributes new
entries. All the prose channels are append. Important: the payload carries **only
this turn's new entries**, never the accumulated list. Accumulation is the
renderer's job, which is what makes a transcript scroll without the engine
holding the transcript.

`event` means a transient signal, rendered once and discarded. A sound cue, a
screen clear, a death notification. Not persisted, so a mid-session join does not
see prior firings.

**Emit policy** is the noise control. `always` channels appear in every packet
whether or not they changed, so a status bar never has to remember anything.
`sparse` channels appear only when they have something to say, which is the
default for author-defined channels.

**`produce`** is a pure function of the turn. It receives the world model, the
turn's semantic events, the turn's rendered text blocks, the turn number, and the
value this channel emitted last turn. It projects; it does not mutate. Returning
`undefined` means "nothing this turn." Returning `null` means something stronger:
"hide / stop / clear," which is how a music channel says silence rather than
saying nothing.

---

## 5. A real turn packet

This is not an illustration. It is `open mailbox`, the first command of Dungeo
(Sharpee's Mainframe Zork port), captured off the engine's `channel:packet`
event:

```json
{
  "banner": {
    "title": "DUNGEON",
    "storyVersion": "Story v5.4.1 (built 2026-09-15)",
    "subtitle": "A port of Mainframe Zork (1981)",
    "credits": ["By Tim Anderson, Marc Blank, Bruce Daniels, and Dave Lebling",
                "Ported by David Cornelson"],
    "tail": ["Type HELP for instructions, ABOUT for credits."]
  },
  "action-result": [
    { "content": ["You open the small mailbox."],
      "presence": "present", "location": "r01" },
    { "content": ["In the small mailbox you see a leaflet."] }
  ],
  "preferred-layout": ["action-result", "action-result"],
  "prompt": "> ",
  "location": "West of House",
  "score": { "current": 0, "max": 616 },
  "turn": 1,
  "info": { "title": "DUNGEON", "authors": [...], "version": "5.4.1", ... },
  "ifid": "4AEC2636-8CF1-4BC7-A6C4-BFB956B8EC1F"
}
```

Several things are worth staring at.

The banner is structured. Title, subtitle, credits, and tail are separate fields,
not a centred block of text with line breaks in it. A client can render that as
an overlay, a title card, or three lines of plain text, and a test can assert on
`banner.title` without pattern-matching a paragraph.

The score is `{ current, max }`, and `max` would be `null` for an unbounded score
rather than `0`. A progress fraction is computable; it did not have to be parsed
out of "Score: 0".

The prose is two entries on one channel, each a list of content nodes rather than
a string. The first carries `presence: "present"` and `location: "r01"`, which is
how the platform marks whether the player was in the room where the narrated
thing happened. A default client hides entries tagged `absent`; an omniscient
debugging client shows them labelled by location. That is one flag on the wire
instead of a separate "off-stage" text path.

Now the very next turn, `north`:

```json
{
  "room-name": [ { "content": [ { "className": "sharpee-room",
                                  "content": ["North of House"] } ], ... } ],
  "room-description": [ { "content": ["You are facing the north side..."],
                          "tight": true, ... } ],
  "preferred-layout": ["room-name", "room-description"],
  "prompt": "> ",
  "location": "North of House",
  "score": { "current": 0, "max": 616 },
  "turn": 2,
  "info": { ... },
  "ifid": "..."
}
```

`banner` and `action-result` are simply gone. They are sparse, and they had
nothing to say. `score` is unchanged and still present, because it is `always`
and a status bar should not have to track history. `location` changed on its own,
with no prose involved, because it reads the world model rather than scraping the
room name out of the text.

Note also what the renderer gets for free: `className: "sharpee-room"` travels
with the room name, and `tight: true` on the description tells the renderer to
collapse the margin above it. Styling hints ride as data. There is no HTML on the
wire and no inline styles.

---

## 6. Why the prose is seven channels

This is the design decision most likely to look strange from the outside, so it
gets its own section.

There used to be one channel called `main` that carried everything a turn
printed, in order, as one append stream. That is the familiar model and it has a
familiar failure: the only thing a consumer can address is "the output." A test
that wants to check the room description has to find it inside a blob that also
contains the action result and possibly a parser error.

So `main` was dissolved. Each prose element now has its own channel:

`room-name`, `room-description`, `room-contents`, `action-result`,
`action-blocked`, `error`, `game-message`

No channel means "the prose window" any more. Which raises the obvious question:
if the prose arrives on seven channels, what puts it back in order?

An eighth channel, `preferred-layout`. It carries one entry per prose entry
emitted this turn, naming the channel that produced it, in the order the engine
thinks it reads:

```json
"preferred-layout": ["game-message", "room-name", "game-message"]
```

A repeated id means that channel produced more than one entry, and each
occurrence advances that channel's cursor, so an interleaving reconstructs
exactly. It emits `always`, including the empty array, so a client can tell "the
turn said nothing" from "the turn is still going."

The name is load-bearing. It is a *preference*, not an instruction. A client may
honour it, reorder it, or ignore it. A client that wants room names pinned to a
header and action results in a scrollback just does that. The engine's ordering
knowledge did not disappear when `main` did; it stopped being smuggled inside an
append stream and became a signal you are allowed to disagree with.

Putting the sequence back together is a shared function, `composeProse`, because
several consumers do it and they have to agree character for character. They did
not always: two copies of the join rule once diverged on paragraph boundaries
(one joined with `\n`, the other with `\n\n`), which meant a response blessed
through the browser bridge failed on its first headless run. One definition now,
in one package.

---

## 7. The channel inventory

The shipped registry, as of 2026-09-22, verified by building the manifest:

**Prose** (all `append` / `sparse`, all `json` carrying `ProseEntry[]`)
`room-name`, `room-description`, `room-contents`, `action-result`,
`action-blocked`, `error`, `game-message`

**Structure and status**
`preferred-layout` (reading order), `prompt`, `location`, `score`, `turn`,
`info` (story metadata), `ifid`, `banner`, `prologue`

**Endings and notifications**
`death`, `endgame`, `story-ending`, `score_notify`, `lifecycle`

**Media** (each gated on the matching capability)
`image:preload`, `image:background`, `image:main`, `image:overlay`, `sound`,
`music`, `animation`, `animate`, `transition`, `layout`, `clear`, `audibility`

**Author-facing** (gated on `authorChannels`, false on every player surface)
`character`, `scene`, `exchange-affordances`, `thread-affordances`

That last group is worth a note. Author introspection — what an NPC's internal
model currently believes, what a conversation is currently offering — is not a
debug flag or a separate build. It is a set of channels that a testing surface
enables and a player surface does not. The isolation is enforced at the channel
layer, which is the only place it can be enforced once rather than everywhere.

---

## 8. Consuming channels

A client registers a renderer per channel id:

```ts
renderer.registerRenderer('clock', {
  onValue(value, channel) { /* paint it */ },
  onCmgt?(channel, manifest) { /* one-time setup */ },
  onClear?(target) { /* append channels only */ },
  onDestroy?() { /* release what onCmgt allocated */ },
});
```

Only `onValue` is required. It is called once per emission of that channel in a
turn packet, and the shape of `value` follows the channel's mode: the latest
scalar for `replace`, this turn's new entries for `append`, the payload for
`event`.

The interface is deliberately small, and cross-channel logic lives outside it. A
status bar that reads both `location` and `score` is a host module holding two
renderers, not one renderer that reaches across channels.

A channel with no registered renderer does not crash and does not vanish. The
browser default renders it into a generic labelled panel, so a story can register
a channel, see its values on screen immediately, and write the real renderer
later or never.

---

## 9. Declaring your own

Two ways in, depending on which language you are writing the story in.

In **Chord**, Sharpee's story language, a channel is a declaration. This is from
Fernhill, a real story in the repository:

```
define channel clock
  mode replace
  gated by sidebar
  return "The clock: (hour)" from estate-clock
end channel
```

That reads: when the story emits an `estate-clock` event, project it onto a
channel called `clock`, as the text `The clock: <hour>`, replacing whatever was
there, and only for clients that declared a sidebar.

The `return` construct can be a raw field (`return hour from estate-clock`), a
text template as above, a named phrase (locale-aware, so the formatting is
translatable), or a record with several members. Two one-liners cover the media
families: `define ambient <word>` for an audio bed, `define layer <word>` for an
image layer.

There is no rendering syntax in Chord and that is on purpose. The value lands in
a DOM element named for the channel, which the author's own HTML template can
place wherever it likes.

In **TypeScript**, a story implements the `registerChannels` hook and adds an
`IOChannel` to the registry:

```ts
registerChannels(registry) {
  registry.add({
    id: 'lantern-fuel',
    contentType: 'number',
    mode: 'replace',
    emit: 'sparse',
    produce: (ctx) => {
      // ctx.world is typed `unknown` so if-domain stays dependency-clean;
      // every closure narrows it once, at the top.
      const world = ctx.world as IWorldModel;
      const lamp = world.getEntity('lamp');
      return lamp?.get(TraitType.LIGHT_SOURCE)?.fuelRemaining;
    },
  });
}
```

Registration is last-write-wins on the id, which is also how a story **overrides**
a platform channel. Re-register `score` with your own closure and your version is
the one that runs. There is no subclassing and no patching.

---

## 10. What this buys, concretely

**Testing that addresses what it means.** A transcript can declare which channels
it wants captured and then assert on them individually. "The banner said this"
and "the room description said this" are separate claims about separate values
rather than two substring searches over one blob. An assertion can also address
*into* a record (`banner.title`), because the structured value is captured
alongside the flattened text.

**Several clients, one engine.** A terminal, a browser client, a headless test
harness, and the macOS IDE's play pane all consume the same packets. Adding a
client is writing renderers, not forking output code.

**Accessibility as data, not as a mode.** A screen reader client is one that
declares no `images` and renders `score` as a sentence. The story does not have
an accessible variant because the story never produced presentation in the first
place.

**Story text stays in the language layer.** Actions emit domain events carrying a
message id and parameters; the engine's prose pipeline resolves those against a
language package and produces text blocks; channels carry the blocks. An action
that wanted to write `"Taken."` has three layers to get through, and each one of
them is a place translation or restyling can happen.

---

## 11. What it deliberately does not do

It does not lay out your screen. `preferred-layout` is a preference and there is
no channel that means "put this here."

It does not accumulate. Append channels ship this turn's entries and the renderer
owns the transcript. A consumer that wants scrollback keeps scrollback.

It does not carry markup. Decorations cross as a span plus a class name, never as
HTML and never as inline styles. What `sharpee-room` looks like is the client's
business.

It does not bidirectionally route UI. Input comes back as one packet kind,
`command`, carrying text. A hotspot click, a drag, and a typed line are all
indistinguishable by the time the engine sees them. The rule is simple: if the
gesture changes what the engine sees next turn it becomes a command packet;
otherwise it is renderer-local and never crosses the wire.

---

## Where the code is

| What | Where |
| --- | --- |
| Wire types, shared by both sides | `packages/if-domain/src/channels/` |
| The service that builds packets | `packages/channel-service/src/channel-service.ts` |
| Prose composition and flattening | `packages/channel-service/src/utils/prose.ts` |
| Renderer contracts | `packages/channel-service/src/renderer/` |
| The standard channel definitions | `packages/stdlib/src/channels/` |
| Engine wiring (`channel:manifest`, `channel:packet`) | `packages/engine/src/game-engine.ts`, `packages/engine/src/turn/channel-packet.ts` |
| Browser renderers | `packages/platform-browser/src/channels/` |
| Chord's `define channel` | `packages/chord/src/parser.ts`, `packages/chord/src/ir.ts` |

The decisions behind it: ADR-163 (the platform), ADR-165 (renderers), ADR-241 and
ADR-253 (Chord's surface), ADR-300 (addressable channels, the dissolution of
`main`, and `preferred-layout`). Read them for the reasoning, not as a
description of current code; the source is the description of current code.
