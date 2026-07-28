# ADR-288: The compass rose — an exits channel, a default renderer, and the first input-originating surface

## Status: SUPERSEDED IN PLACE (2026-07-28, session aaa5bb) — do not implement.

> **This ADR was overtaken while being written.** Its two core decisions — a
> platform-shipped `exits` channel (D1) and a platform-shipped default rose
> (D5) — are the opposite of what was ruled later the same session: **the
> author creates the channel and supplies the assets that consume its data.**
> The general capability underneath is **Web Extensions**, captured at
> `docs/work/web-extensions/concept.md`. Whatever replaces this should be an
> ADR about Web Extensions, with the compass as the worked example.
>
> Kept rather than deleted for two reasons: the Context section's verified
> groundwork (no `exits` channel exists; twelve directions, not eight;
> `InputManager.onCommand` has exactly one caller) is still accurate and cost
> real investigation, and D3's ruling that a click submits an **ordinary
> command string** — keeping multi-user and transcript recording unchanged —
> is the one decision here likely to survive intact.

## Date: 2026-07-28

## Parent: ADR-163 (channels — the signal kind this adds to, and the one-directional assumption it breaks), ADR-286 (the Web Template — where a compass gets *placed*), ADR-170/platform-browser (the framework-free client that renders it). Related: ADR-253 D2 (render-by-name mount convention), ADR-282 (play-to-test — unaffected by design, see D3).

## Context — verified, not assumed

- **Nothing about exits reaches the UI today.** `exits` appears nowhere in
  `packages/platform-browser`, `packages/engine`, or `packages/stdlib`'s
  channel set. There is no channel, no payload, no renderer.
- **The data exists in the world model.** `RoomBehavior`
  (`packages/world-model/src/traits/room/roomBehavior.ts`) reads
  `roomTrait.exits` (a `Partial<Record<DirectionType, IExitInfo>>`) and
  `roomTrait.blockedExits` (direction → message), and the same file owns room
  lighting and visit tracking.
- **There are twelve directions, not eight**
  (`packages/world-model/src/constants/directions.ts`): the eight compass
  points plus `UP`, `DOWN`, `IN`, `OUT`. They are deliberately
  language-agnostic constants — "spatial relationships, not English words" —
  and the parser owns the English mapping. A rose can render eight of them.
- **Standard channels have an established shape and home.**
  `packages/stdlib/src/channels/standard.ts` defines `location`, `score`,
  `turn`, `prompt` as `IOChannel` values with `id`, `contentType`, `mode`,
  `emit`, and a `produce(ctx)` closure that reads the world. `locationChannel`
  already resolves the player's room — an exits channel is its neighbour.
- **The input path exists but has exactly one caller.**
  `InputManager` (`packages/platform-browser/src/managers/InputManager.ts`)
  takes `onCommand: (command: string) => Promise<void>` and wires it solely to
  the command input's Enter key. Nothing else in the client submits a command.
- **Every existing channel is one-directional.** ADR-163 defines channels as
  carrying story→UI signals. A clickable compass is output (which exits are
  open) *and* input (click to move). This ADR is the first surface to
  originate input, which is why it is an ADR rather than a feature ticket.
- **Standing ruling**: the platform ships UI defaults for every channel and
  surface; authors override per story; the wire stays data-only.

## Decision

### D1 — `exits` is a standard channel

A standard `exits` channel joins `location`/`score`/`turn` in
`packages/stdlib/src/channels/standard.ts`, `mode: 'replace'`,
`emit: 'always'`, its `produce(ctx)` reading the player's room through
`RoomBehavior` exactly as `locationChannel` does.

It is a **standard** channel, not a story-declared one. A writer can plausibly
emit exit data from a turn hook; a writer should not be hand-writing a
clickable vector rose. Both halves belong to the platform under the standing
ruling, and the author override remains available for a story that wants a
different compass.

### D2 — The payload is an object with one property per direction, slotted into the markup

The channel emits a **single object keyed by direction**, each property
carrying that direction's state and the text it needs. Every direction is
present, including the ones this room does not offer — an explicit `absent` is
what lets a fixed piece of markup bind uniformly instead of adding and
removing nodes:

```
{
  north:     { state: 'open',    label: 'N',  command: 'north' },
  northeast: { state: 'blocked', label: 'NE', command: 'northeast' },
  up:        { state: 'absent',  label: 'U',  command: 'up' },
  …
}
```

The HTML asset (D5) marks its per-direction elements — working form
`data-direction="north"` — and the client sets each one from the matching
property. **Binding is by direction key, so the markup and the payload share
one vocabulary and neither has to know the other's shape.** An asset that
omits a direction simply never binds it; an asset that marks a direction the
payload lacks is a mismatch worth a warning, not a crash.

The client must not map directions to English — `Direction` is deliberately
language-agnostic and the parser owns the English mapping, so a client-side
map would be a second, drifting copy of it. The lang layer produces `label`
and `command`; the payload stays data-only (ADR-163), and localization needs
no client change.

This is the same shape ADR-286's Q-5 needs for slot labels. **The two should
be solved together** — whatever mechanism carries lang-layer text to
client-side renderers serves both.

### D3 — A click submits an ordinary command; no new input wire type

Clicking a direction calls the existing `InputManager.onCommand` with the
payload's `command` string. It is indistinguishable from typing the word.

Consequences of this being a *ruling* rather than an accident:

- **Multi-user needs nothing new.** A click travels the same path typed input
  already does; zifmia sees a command, not a new message kind.
- **Transcripts and play-to-test are unaffected.** ADR-282's bless flow
  records commands; a clicked "north" records as `north`. No new grammar, no
  new recorder case.
- **The parser stays the single entry point.** No UI surface may mutate world
  state directly; it may only submit commands.

This constraint binds every future input-originating surface, not just the
compass.

### D4 — Placement belongs to the template, not to this ADR

`compass` is standard slot vocabulary (ADR-286 §7 name resolution) that **the
default template does not place**. A story that wants one places it in its
`.templates` file. That is precisely the "here is how you change the standard
template" demonstration the design sketch was making (David's ruling,
2026-07-28).

The mount follows ADR-253 D2's render-by-name convention like any other
channel. This ADR does not touch the layout grammar.

### D5 — The rose ships as an HTML asset, and that is a new asset kind

The rose is markup, not drawing code: a vector fragment with hit regions.
Rather than hardcode it in `platform-browser`, the platform ships it as a
**declared HTML asset** the story can replace with its own file — the same
override story assets already have, applied to a UI surface.

This introduces an asset kind Chord does not have. ADR-216 declares
`sound | image | music`; all three are opaque binary files the client plays or
shows. An HTML asset is different in kind: it is **markup that the client
mounts and that channel data binds into**. Working form:

```
define html compass from "assets/compass-rose.html"
```

Consequences that follow, and that make this the largest part of this ADR:

- **ADR-216's asset vocabulary grows**, so its compile-time typo-checking,
  the analyzer's asset-name resolution, and the devkit build's asset copy all
  extend to a kind with different semantics from the existing three.
- **The Chord Writer sidebar gains `Assets → Web Components`** (David's
  ruling, 2026-07-28): these assets get their own named subgroup under Assets
  rather than sitting loose among images and audio. ADR-280 D1's group model
  is currently flat — `ProjectArtifacts.groups(for:)` classifies to one level
  — so this is a small, real change to the classifier and the tree, and the
  first case of a group with typed children. ADR-285's asset manager then
  needs a presentation for a kind it can neither thumbnail nor audition.
- **The escape-hatch ladder gains a rung.** Today it is: layout syntax →
  `browser/<storyId>.css` → raw `browser/index.html` (whole page). An HTML
  asset sits between the last two: replace *one surface's* markup without
  taking ownership of the entire page. That is a better-shaped escape than
  the all-or-nothing page override, and it likely outlives the compass.

D1 and D3 are unchanged by this: the data still arrives on a standard channel,
and a click still submits an ordinary command. What changes is that the
*rendering* is author-replaceable content rather than platform code.

### D6 — Non-compass directions are adjacent affordances, not rose points

`UP`, `DOWN`, `IN`, `OUT` have no bearing on a compass rose and must not be
forced onto one. They render as a small adjacent control group within the same
box, present only when the room offers them.

## Acceptance

1. A room with exits north, east, and up emits an `exits` object whose
   `north`/`east`/`up` properties are `open` and whose remaining nine are
   `absent`; a room with no exits emits all twelve `absent` rather than
   omitting the channel.
2. A story placing `compass` in its `.templates` file gets a rendered rose
   showing exactly the available directions; a story not placing it is
   unaffected, and no compass appears in the default layout.
3. Clicking an available direction advances the turn identically to typing the
   command — pinned by a test asserting the same events from both paths.
4. An unavailable direction is not clickable and submits nothing.
5. `UP`/`DOWN`/`IN`/`OUT` render as adjacent controls, present only when the
   room offers them.
6. A story declaring its own `html` compass asset gets its markup rendered and
   bound, with the platform default untouched for every other story — pinned
   by a test that binds a deliberately minimal asset marking only two
   directions.
7. The payload contains no English produced by the client — pinned by a test
   asserting the client never maps `Direction` constants to words.
8. The new `html` asset kind is typo-checked at compile like the existing
   three (ADR-216), and lands in the built artifact via the same asset copy.

## Consequences

- Platform change spanning `stdlib` (the channel), `platform-browser` (the
  renderer plus its input wiring), and `lang-en-us` (labels and command
  strings). No engine change: the channel reads the world like its neighbours.
- **ADR-163 gains a bidirectional surface.** Channels remain story→UI; the
  compass's input half is an ordinary command submission, so the channel
  contract itself is unchanged — but the "channels are one-directional"
  reading of ADR-163 should be annotated, since a reader will otherwise
  conclude a clickable channel-fed surface is illegal.
- Blocked with, and blocking, ADR-286's Q-5: D2's label/command delivery is
  the same unsolved mechanism.
- The rose is a vector drawing with hit regions in a framework-free client
  (ADR-170) — no component library, consistent with the standing ruling.
- Accessibility is not optional for a control surface: the rose needs keyboard
  reachability and labelled targets, not just clickable geometry.

## Open Questions

### Q-1: What does the compass reveal in a dark room?
Exits are map knowledge. `RoomBehavior` owns lighting, so the channel *can*
know. Showing exits in the dark leaks the map and undercuts darkness as a
puzzle; hiding them silently may read as a bug. Candidates: emit nothing, emit
an explicit "unknown" state the renderer draws as unlit, or make it an author
setting. **Blocks D1's `produce` contract.**

### Q-2: How are blocked exits represented?
`blockedExits` carries a per-direction message, so a blocked exit is a known
direction with a reason. Shown greyed (revealing the room's shape), or omitted
entirely (indistinguishable from a wall)? These differ in what the player
learns. **Blocks the `state` vocabulary in D2's payload.**

### Q-3: Does a closed door count as an available exit?
An exit through a shut-but-unlocked door is traversable in one turn (open,
then go) but not *currently* passable. Which state applies?

### Q-4: Is `html` the right asset kind, and is the compass its only user?
D5 introduces an asset kind whose reach plainly exceeds this ADR — a mountable
markup fragment is a general capability, and the compass is its first
customer. Naming it `html` commits Chord to a web-shaped word in a language
that is otherwise client-agnostic (`sound`, `image`, `music` all describe the
*medium*, not the *format*). Candidates: `html`, `markup`, `fragment`,
`widget`. The choice should be made against what a non-browser client does
with one, not against the compass alone.

### Q-5: "Web Components" — the sidebar label, or literally custom elements?
The sidebar subgroup is named Web Components (D5 consequences). That name is
also the W3C standard — custom elements, shadow DOM. If these assets *are*
custom elements, then they carry script by definition, they register
themselves rather than being bound by the client, and Q-7's "almost certainly
no script" answer inverts. If it is a friendly folder label for markup
fragments, the collision is worth avoiding, since ADR-170 commits the client
to framework-free and a reader will reasonably assume the standard is meant.
**This is the highest-leverage open question here** — it decides whether D2's
binding contract exists at all, and Q-6 below is downstream of it.

### Q-6: How much does the binding contract constrain author markup?
D2 binds by `data-direction`. Open: what an asset may contain beyond marked
elements (arbitrary markup? inline styles? script — almost certainly not),
whether the platform validates the fragment at build time or fails at mount,
and whether `state` binds as a class, an attribute, or both. Authors will
style against whatever this produces, so it becomes a compatibility surface
the moment it ships.

### Q-7: Is exit visibility author-configurable, and at what granularity?
Some authors consider a compass a spoiler — it reveals map structure a prose
game deliberately withholds. Story-level setting, per-room, or not
configurable at all? Interacts with Q-1 and Q-2, and should be answered with
them rather than separately.

## Session

Drafted 2026-07-28, session aaa5bb, during the ADR-286 grammar-freeze work,
after David noted that a compass is "probably a Compass Rose with clickable
directions highlighting open directions" — which took it out of the layout
language's scope and into its own architectural question.
