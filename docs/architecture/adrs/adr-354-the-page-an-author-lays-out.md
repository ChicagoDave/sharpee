# ADR-354: The page an author lays out

**Status**: **ACCEPTED** (David, 2026-09-22, session 32d678 — "accepted").
The interview that session resolved six questions and `adr-review` returned
clean at 19/19; **D6 was then struck**, because its ruling had been given
against a misread of the term "Web Extension" (a UI component, not a browser
extension), and the question was re-asked against the right referent and
answered as **D8**. No Open Questions section remains. The pointer updates this
ADR owed — ADR-252, ADR-253, ADR-280, ADR-284, ADR-330 and ADR-347 — landed with
this flip, in the same change. **Acceptance authorizes no implementation by
itself**: every decision here touches `packages/`, which needs David's platform
discussion under CLAUDE.md first.
Ruled: **ADR-286 is closed and rewritten against the current platform**
(D1), **the answer is a layout DSL whose vocabulary comes from publishing**
(D2, resolving Q-1 — the premise question), and **a placeable name resolves from
chrome, channels and the template itself** (D3, resolving Q-2), and **the output
target rides the existing `template:` header field** (D4, resolving Q-3), and
**a channel carries its own label** (D5, resolving Q-4), and **Web Extensions is
**template switching is declarative in v1** (D7, resolving Q-6), and
**author-supplied components are out of scope with the seam named** (D8,
resolving the reopened Q-5). **D6 is struck**; its number is kept so D7, D8 and
the acceptance criteria do not move. Acceptance authorizes no
implementation by itself.

**Scope**: `packages/devkit` (the browser build, where the transform lands),
`packages/platform-browser` (granular mounts and the status-row composite),
`packages/if-domain` and `packages/stdlib` (D3's placeable bit on the channel
contract and on each channel definition, and D5's widened
`ChannelProduceContext`), `packages/engine` (which constructs the
`ChannelService` and so supplies D5's language provider), `packages/lang-en-us`
(D5's labels), `packages/chord` (D7's per-chapter `template` line and its IR),
and `packages/extensions/chapters` (D7's driver — named because an earlier
draft of this line omitted it and `adr-review` caught the gap). Every one of those is a platform change under
CLAUDE.md and none may be implemented before the remaining questions are ruled.

## Date: 2026-09-22

## Supersedes

**ADR-286 (Web Template and visual editing)**, accepted 2026-07-28 and never
implemented. It in turn had superseded, for layout, ADR-252's `template:` header
field and ADR-253's written D3 — both also retired unimplemented. This ADR
inherits that lineage and owes those two ADRs a pointer update when it is
accepted, along with ADR-280 (which describes the Web Template artifact) and
ADR-284 (whose Amendment A1 already routes around the missing DSL).

**Related, unchanged**: ADR-163 (channels), ADR-165 (renderers), ADR-188
(themes), ADR-253 D1/D2/D4 (the channel `return` construct, the
channel-id ↔ DOM-name convention, the generic-panel fallback — all shipped and
all load-bearing here), ADR-300 D8/D9 (the seven prose channels and
`preferred-layout`), GH #197 (Web Extensions, captured but undesigned).

## Context — verified, not assumed

Every claim in this section was checked against the source on 2026-09-22.
ADR-286 was accepted on 2026-07-28 and six things have changed underneath it
since. They are listed in the order they bear on the rewrite, not chronologically.

**1. The slot ADR-286 was built around no longer exists.** Its sketch centres on
`main-text`, a single box for the turn's prose. ADR-300 D8 dissolved `main` on
2026-08-05. Prose now arrives on **seven addressable channels** — `room-name`,
`room-description`, `room-contents`, `action-result`, `action-blocked`, `error`,
`game-message` — with an eighth, `preferred-layout`, carrying the reading order
as a *preference* the client may disagree with.

This is the change that most reframes the problem. A layout written today could
pin the room name to a header and leave action results in scrollback, which the
old ADR could not express because the parts did not exist separately. But the
default page does not take that offer: `packages/platform-browser/src/channels/prose.ts`
buffers all seven and flushes them, composed, into the single `#text-content`
div (`packages/devkit/templates/browser/index.html:74`). **The granularity is on
the wire and is discarded at the mount.** Whatever replaces ADR-286, that
discard is the concrete thing it has to stop doing.

**2. The primitive a DSL would compile to already shipped.** ADR-253 D2's
channel-id ↔ DOM-name convention is live and is documented to authors in the
default page's own header comment
(`packages/devkit/templates/browser/index.html:6`):

> Add `<span id="channel-name">` where you want a channel's value to render

So an author can already place any channel by hand, and a story-local
`browser/index.html` already overrides the whole page. A transform would be
**generating a working primitive, not inventing plumbing** — a materially
smaller and lower-risk job than the one ADR-286 scoped, and one whose absence is
less acute than it was in July.

**3. The channel population grew by more than half, and some of it is not for
players.** The shipped registry builds a **37**-channel manifest for a fully
capable client and a **23**-channel one for the CLI/test profile (measured
2026-09-22 by constructing a `ChannelService` over `channelRegistry` and reading
`buildManifest()`). On 2026-07-29 — the commit after ADR-286 was accepted,
`086acd751` — the registry held **23**: twenty statically declared ids across
`standard.ts`, `media.ts` and `sound-events.ts`, plus the three
`createImageChannel` layers. So the population went 23 → 37, a growth of
fourteen, and `main` is among the ones that left.

*(An earlier draft of this line said "roughly doubled". It was not measured, and
checking it during `adr-review` showed it was wrong — the growth is about sixty
per cent, not a hundred. Recorded rather than silently corrected, because the
claim was doing argumentative work.)*

Added since: `scene`, `exchange-affordances`, `thread-affordances` (ADR-320),
`character` (ADR-310/318), `story-ending` (ADR-347), `banner` and the seven
prose channels (ADR-300). Four are gated on `authorChannels` and must never
reach a player surface. **A slot vocabulary frozen in July would already be
wrong**, which is an argument about how the vocabulary is derived, not about
which words were missed.

**4. ADR-286's output-target declaration would now collide.** D3 proposed
`use html` / `use templates` in Chord. Since then `use` has settled into exactly
two meanings — `use <extension>` and `use phrasebook <name>`
(`packages/chord/src/parser.ts:662`) — and neither ADR-286 form was ever built.
A third meaning is a language decision, not a build detail.

**5. The IDE is no longer macOS-only.** ADR-286 was written against the macOS
Chord Writer. The IDE is now an Avalonia pane host with generated protocol types
(ADR-351, ADR-352), so any claim about previewing or editing a layout in the IDE
has a different and larger host story than it did.

**6. What has *not* changed is the pair that stopped it.**

- **ADR-286's Q-5 was misfiled.** It is listed under "Deferred questions
  (non-blocking, ruled at implementation)", but the grammar freeze draft found
  it blocks D2's status-row emission and half of D1. The evidence is still
  exactly as it was: `packages/platform-browser/src/channels/status.ts:45-58`
  hardcodes `Score: N` and `Turns: N`, the default page fuses them into one
  `#score-turns` span (`index.html:70`), and `BrowserClient.ts:393` carries a
  composite override to compensate. Channel payloads are data-only and nothing
  carries language-layer text to a client-side renderer.
- **The `compass` slot was not a layout concern.** Chasing it during the freeze
  found it meant a clickable compass rose, which surfaced **Web Extensions** —
  an author-supplied channel-with-contract plus assets plus a command path.
  ADR-288 was drafted for the compass and superseded in place the same session.
  Web Extensions is captured at `docs/work/web-extensions/concept.md` and
  GH #197 and is explicitly *"captured, not designed… not to be implemented from
  this document."* It couples back: installing one is three operations, and one
  of them is placing it in the layout.

**And one piece of residue.** `packages/devkit/src/standalone/browser-core.ts:652`
still warns that a declared `template:` package is "not yet supported (ADR-253)
— ignored". That warning cites a decision that ADR-286 retired, so it is stale
whichever way this ADR goes.

## Decision

### D1 — ADR-286 is closed and rewritten, not amended

ADR-286 is retired **unimplemented**. It is not amended in place, because the
corrections owed to it are not editorial: its central slot no longer exists
(Context 1), one of its deferred questions is load-bearing (Context 6), one of
its slots belongs to an undesigned subsystem (Context 6), and the freeze draft
already owed it four factual corrections about the shipped client. An ADR needing
that much repair is a worse artifact than its replacement.

`docs/design/template-dsl/design.md` (David's sketch) and
`docs/design/template-dsl/grammar-freeze-draft.md` are **retained, not retired**.
The sketch is the design intent and the draft's §1 grounding and §12 corrections
survive the rewrite intact; only the parts that assume `main-text` and the July
slot vocabulary are overtaken.

### D2 — Yes, a layout DSL — and its vocabulary comes from publishing, not from CSS or from channel plumbing

*(David, 2026-09-22, session 32d678, resolving Q-1.)*

The answer is a layout language. The customisation surface that exists today —
placing a `<span id="room-name">` by hand — is HTML, and HTML is the **end
state**, not the thing an author should be writing. Layout is a visual craft
with a long vocabulary of its own, and that vocabulary is what the DSL speaks:
**left-adjust, center, right-adjust, wrap, keep-top, keep-bottom**, and their
relatives — float, column behaviour, proportional width.

This settles what the language *is*, which two plausible readings of ADR-286 got
wrong:

- **It is not a CSS wrapper.** CSS is a styling language that acquired layout
  later, and its model (box, flow, flex, grid) is the browser's, not the
  compositor's. An author laying out a page thinks in adjustment and flow and
  what stays pinned to an edge, and those are the words the DSL uses.
- **It is not channel plumbing made declarative.** The channel ↔ DOM-name
  convention (ADR-253 D2) already binds a value to a place. What the DSL adds
  is the *page*: how the places relate to each other, in the terms a person
  designing a page has always used.

David's sketch (`docs/design/template-dsl/design.md`) already speaks this
language and is the design intent for the vocabulary: `<` and `>` for
adjustment, `|` to split a row, `::` to separate columns, `scrolling` / `fixed`
for a container's behaviour, `floating right wrap 30%` / `nowrap` for images.
`keep-top` and `keep-bottom` join that set. **None of this syntax is shipped**;
the sketch and the grammar freeze draft remain the working surface, and the
freeze draft's `[PROVISIONAL]` rulings are still provisional.

**Consequence for the three gaps in Context.** Granular prose mounts, a
labelling mechanism, and a default page that offers its parts separately are
**not an alternative to the DSL** — they are what the DSL needs underneath it,
so they become work its implementation carries rather than a competing option.
The order they land in is a plan's concern, not this ADR's.

### D3 — A placeable name resolves from three sources: chrome, channels, and the template itself

*(David, 2026-09-22, session 32d678, resolving Q-2 — option (c).)*

The grammar freeze draft's three-source model (§7) holds, and *usage is the
declaration* — there is no separate slot manifest an author maintains. What
changes is **source 1**: it shrinks from "every standard slot" to the short,
fixed list of things that have no channel behind them. A placed name resolves
against, in order:

1. **Chrome** — a small fixed list of surfaces the platform owns and no channel
   carries. `command-line` and `game-title` are the known members; the list is
   deliberately short and each addition is a decision.
2. **Channels** — derived from the capability-filtered manifest, restricted to
   the channels that have a visual surface. Not authored, not duplicated.
3. **Names the template introduces** — containers by their indented block,
   image slots by their `floating` clause.

A name matching none of the three is a compile error listing the known names. A
channel the story uses but the template never places still gets a mount and the
generic-panel fallback (ADR-253 D4) — **visible, never hidden** — plus a warning.

**Why derive source 2 rather than author it.** A hand-maintained table is a
second list that drifts against the channel registry, and it demonstrably does:
the freeze draft's §8 table went stale twice in eight weeks. `room-name` in that
table means the *status-bar* room name, mounted at `#location-name` and backed
by the **`location`** channel — but ADR-300 D8 then created a prose channel
literally named `room-name`, so one word now names two surfaces. And `main-text`
maps to `#text-content` while no `main` channel exists at all. Deriving makes
both impossible: one name, one channel, by construction.

**Three things this decision obliges.**

- **Channels gain a "has a visual surface" bit.** Not every channel names
  something a page can place: an ordering signal (`preferred-layout`), a control
  (`clear`), metadata (`ifid`), a preload hint (`image:preload`) and the
  non-visual media channels have no box. Deriving the vocabulary from the
  manifest therefore requires the manifest to say which channels a page can
  place. This is a change to the channel contract (`@sharpee/if-domain`) and to
  every channel definition that carries the flag (`@sharpee/stdlib`), and it is
  therefore a platform change under CLAUDE.md.

  **The partition itself is an output of implementation, not an input to this
  decision.** A draft of this bullet asserted "roughly twelve of the
  thirty-seven" and listed them; that was a classification made while writing,
  presented in the same register as the measured manifest counts beside it. The
  real count is whatever falls out when each channel is examined, and AC-2 pins
  that every channel carries the flag rather than pinning a number.
- **`main-text` is defined once, as the composed-prose box.** It is not a
  channel and must not pretend to be one: it is the box into which the seven
  prose channels are composed in `preferred-layout` order. Placing an individual
  prose channel by name instead is the finer-grained option the same page offers,
  and the two must not both claim the same entries — what happens when a
  template places both is left to implementation, which must make it an error or
  a defined precedence rather than a silent duplicate.
- **The collided names are settled.** `room-name` means the prose channel. The
  status-bar surface is `location`, which is what its channel has always been
  called.

**Author-only channels are excluded by construction**, not by a rule someone has
to remember: the manifest is already capability-filtered, and the four
`authorChannels`-gated channels (`character`, `scene`, `exchange-affordances`,
`thread-affordances`) are absent from a player client's manifest, so they are
absent from a player layout's vocabulary.

### D4 — The output target rides the `template:` header field that already exists

*(David, 2026-09-22, session 32d678, resolving Q-3 — option (b).)*

No new syntax. The story header's **`template:` field** — already lexed, already
parsed (`packages/chord/src/parser.ts:834`), already listed among the known
header fields in the unknown-field diagnostic (`parser.ts:978`), and today
warned-and-ignored at build time
(`packages/devkit/src/standalone/browser-core.ts:652`) — becomes the declaration.
It reads as a sibling of `theme:`, which is the same kind of statement about how
the story is presented.

Resolution:

- **`template: <name>` present** — render through the story's `.templates` file,
  using the named block.
- **absent, with a story-local `browser/index.html`** — render through that page
  (ADR-253 D3's escape, unchanged; its existing validation warnings stay).
- **absent, with neither** — render the platform default template.
- **`template:` present *and* `browser/index.html` present** — the declaration
  wins and the unused page is warned about, which is ADR-286's "a
  present-but-unused page is almost always a missing declaration" rule kept
  intact, now with a declaration that can actually be missing.

**Precedence when D7's third source is in play.** D7 lets a structure name a
template, which makes three sources, not two. The full table:

| `template:` | structure template | `browser/index.html` | Result |
| --- | --- | --- | --- |
| — | — | — | platform default template |
| — | — | yes | the custom page |
| yes | — | — | the named block |
| yes | — | yes | the named block; unused page warned |
| yes | yes | — | the structure's block while it is current, the header's otherwise |
| — | yes | — | platform default, and the structure's block while current |
| any | yes | yes | **build error** |

**A custom page and a structure template are a declared conflict, not a
precedence.** `browser/index.html` *is* the layout — the author owns the whole
document — so there is nothing for a chapter's template to swap to, and
silently ignoring the chapter template would be the quiet failure ADR-286
specialised in. The build refuses with a diagnostic naming both the page and the
structure that declared a template. *(This pairing was undefined in a first
draft; `adr-review` flagged it as the same species of unstated coupling that
stalled ADR-286. Refusing is the conservative resolution — it invents no
behaviour and can be relaxed later if a use case appears.)*

**ADR-286 D3's `use html` / `use templates` forms are dropped.** In Chord today
`use` means *bring in an extension or a phrasebook* — something that adds
behaviour to the story (`parser.ts:662`). An output target is not that, and
overloading one keyword to teach two unrelated ideas is a cost the language pays
forever to save a header field that already exists.

**This retires a stale warning rather than adding one.** `browser-core.ts:652`
currently tells an author that a declared `template:` is "not yet supported
(ADR-253)" — a message citing a decision ADR-286 had already retired. Wiring the
field replaces it with behaviour; the alternative, leaving the field parsed and
inert, is the one outcome worse than either wiring it or removing it.

**Migration is nil for the one real case.** Fernhill declares no `template:` and
carries `branch-stories/fernhill/browser/index.html`, so it resolves to its
custom page exactly as it does now, with no edit to the story.

**Left to implementation**: whether a `.templates` file holding exactly one block
may be selected by a bare `template:` or still needs the block named. That is a
convenience question, not a contract one.

### D5 — A channel carries its own label, the way prose already does

*(David, 2026-09-22, session 32d678, resolving Q-4 — option (c). This is
ADR-286's Q-5, which that ADR filed as non-blocking and which was not.)*

A placeable channel emits its own rendered label alongside its value. The DSL
gains **no label concept at all**: a box shows what its channel sends.

**The label is additive, never a replacement.** `score` keeps emitting
`{current, max}` and gains the rendered text beside it. ADR-163 made the score a
record precisely so a client could draw a progress ring instead of printing a
sentence, and that has to stay true — a channel that shipped only
`"Score: 42 / 100"` would trade one hardcoded presentation for another.

**This ends an asymmetry rather than adding a mechanism.** The wire is already
not data-only: the prose pipeline holds the language provider
(`packages/engine/src/prose-pipeline/pipeline.ts:109`) and resolves templates to
finished text engine-side, so `action-result` arrives rendered; ADR-253 D1 lets a
Chord channel `return` a text template and do the same. The status channels were
the exception, shipping data and letting a browser package format it in
hardcoded English at `packages/platform-browser/src/channels/status.ts:45-58`.
After this decision every piece of user-facing text on the wire has one origin.

**What it obliges.**

- **`ChannelProduceContext` widens to carry the language provider.** It carries
  `world`, `events`, `blocks`, `turn` and `prevValue` today and no way to reach
  language. This is a change to the ADR-163 channel contract in
  `@sharpee/if-domain` — and a clean one, because `LanguageProvider` already
  lives there (`packages/if-domain/src/language-provider.ts:46`), so the
  widening introduces no new dependency and no cycle.
- **The engine supplies it, at the `ChannelService` constructor.** The engine
  already builds the service — `new ChannelService(channelRegistry,
  this.clientCapabilities)` at `packages/engine/src/game-engine.ts:698` — and
  already holds the provider, which the prose pipeline takes in its own
  constructor (`prose-pipeline/pipeline.ts:109`). The provider is session-scoped
  and does not vary per turn, so it belongs beside the registry and the
  capabilities rather than in `build()`'s per-turn input. *(An earlier draft
  left this unstated and `adr-review` flagged it: a widened context with no
  named supplier is a contract with a hole at its boundary.)*
- **The hardcoded literals delete — and there are two sites, not one.**
  `packages/platform-browser/src/channels/status.ts:45-58` is the per-channel
  renderer, and `BrowserClient.ts:561-569` builds a second copy of the same
  strings (`` `Score: ${this.currentScore} | Turns: ${this.currentTurn}` ``) for
  the fused span. Two copies of one sentence, which is the ordinary consequence
  of a composite override existing at all. Both go. *(A draft of this bullet
  named only `status.ts`; the second site surfaced when `adr-review` ran AC-7's
  grep for real.)*
- **The status row splits.** `#score-turns` is one fused span
  (`packages/devkit/templates/browser/index.html:70`) with a compensating
  composite override in `packages/platform-browser/src/BrowserClient.ts:393`.
  Two channels each carrying their own label have nothing to fuse, so the span
  separates and the override is deleted. Context named this as one of the three
  gaps the DSL needs underneath it; it is discharged here rather than separately.
- **Localization stops being a rebuild.** Because the label is produced per turn
  by the engine's own language provider rather than baked into a page, a story
  running under a different `lang-{locale}` gets labelled output with no change
  to the client or the template.

**Left to implementation**: the shape of the labelled payload — a sibling field
on the existing record, or a parallel channel — and whether a channel opts in or
labels are expected of every placeable channel. Both are contract details that
belong with the code, not rulings that change what this decision means.

### D6 — WITHDRAWN (was: Web Extensions is out of scope)

**Struck 2026-09-22, session 32d678, before acceptance.** A decision was folded
here from David's "we're never asking a user to install a web extension," read
as withdrawing the install-and-distribute premise of GH #197 generally. He then
identified the misread: **"Web Extensions" in that concept means a *component* —
a UI component an author places — not a browser extension** in the
Chrome/Firefox sense, which is the sense his objection was filtering on. The
ruling was given against the wrong referent, so it does not stand and is not
reworded into something narrower. The question returns to the Open Questions
section as Q-5.

**The number is kept struck rather than reused**, so D7 and the acceptance
criteria that cite it do not move.

**This is evidence, not just an error.** `docs/work/web-extensions/concept.md`
lists as its own sixth open question: *"**Naming.** 'Web Extension' collides
twice: with Sharpee's own platform extensions, and with the browser-vendor term
for Chrome/Firefox add-ons. Cheaper to change now than after it reaches the
book."* The collision was predicted in the document, and the person who ruled
the concept is the one it caught — which is about as strong a case for renaming
before the term spreads as a naming question is ever going to get. Recorded here
because the evidence arose here; the rename itself belongs to #197, not to this
ADR.

### D7 — Switching is declarative in v1; story-commanded switching is deferred

*(David, 2026-09-22, session 32d678, resolving Q-6 — option (b).)*

**A structure that already exists may name a template, and the active template
is derived from it.** Chapters (ADR-330) and the Ending (ADR-347) are the v1
drivers. A `.templates` file holds several named blocks from the first release;
`template:` (D4) selects the story's default, and a structure's own template
takes effect while that structure is current.

```
define chapters
  market - Chapter I - Grubber's Market
    begins when the game starts
    template market-day
  commerce - Chapter II - Commerce Street
    begins when the player visits Commerce Street for the first time
    template commerce-street
end chapters
```

*(Syntax illustrative and UNSHIPPED; the chapters block above is otherwise
Secret Letter's real declaration.)*

**When a structure ends, the page reverts to the story's default** — the block
named by `template:`, or the platform default if none. This is not a separate
rule but what *derived* means: the active template is a function of current
state, so when no structure with a template is current, the function returns the
default. Chapters as ADR-330 defines them end only by the next beginning, so in
practice a chaptered story moves template to template; the revert is what makes
the Ending's template well-defined, since an ending is current and then the
story is over. *(Undefined in a first draft; named here because "derived" is
only a complete contract once the empty case is stated.)*

**Story-commanded switching is deferred to a later ADR.** The imperative form
ADR-286 D4 specified — a statement that swaps the template mid-turn for a dream,
a hallucination, a fever — is the genuinely arbitrary case and the weakest of
the three. It can be added to a file format already shaped for it, and judged
then on its own merits rather than carried by this decision.

**Why this inverts ADR-286 D4, and why it is cheaper rather than dearer.** That
ADR treated switching as one thing: a statement the story executes. There are
three owners — the story commanding it, a structure implying it, and the player
choosing it — and the strong cases all sit with the second. The platform already
ships three structural concepts that **announce themselves on a channel and have
no visual consequence whatsoever**: `story.chapter` (ADR-330, declared for real
in Secret Letter), `story-ending` (ADR-347, whose entire client effect today is
disabling the input box), and `scene` (ADR-320). Switching is not an effect
bolted onto layout; it is the missing output half of story structure that
already exists.

**The save cost is zero, which was one of three reasons to defer.** The chapters
plugin records that "the current chapter and announced ordinal are world state,
so save/restore and undo carry them and a restore never re-fires"
(`packages/extensions/chapters/src/chapters-plugin.ts:17-18`). A template
*derived* from that state is restored with it. No save-format field, and no risk
of the template and the story disagreeing after a restore — the two cannot
diverge when one is computed from the other.

**The remaining real cost is live re-parenting**: a switch must preserve the
prose scrollback and any mounted media, which is a client concern in
`@sharpee/platform-browser` and the one part of switching that is genuinely new
work.

**The scenarios this serves**, recorded because they are the justification and
should not have to be rediscovered: the ending page (universal — score, rank,
AMUSING, credits, where today there is a dead input box); chapter identity; the
document interlude (Secret Letter is *about* reading a letter, and the page
becoming the letter is its premise rendered); darkness collapsing the page to
bare prose; and progressive disclosure, where finding the map makes a map pane
appear and the layout becomes an inventory of what the player has unlocked.

### D8 — Author-supplied components are out of scope, and the seam is named

*(David, 2026-09-22, session 32d678, resolving the reopened Q-5 — option (a).
This replaces the struck D6, which answered a differently-understood question.)*

This ADR specifies **no** component install surface, bundle format, contract
schema, or command path, and adds **no** component-aware grammar to the layout
language. The layout language never learns the word "component".

**The interaction that does exist is already handled.** D3 derives placeable
names from the capability-filtered manifest, so a channel registered by an
author-supplied component is placeable by name the moment it registers — a
`compass` channel is a box called `compass`, with no slot-table edit and no
grammar change. A component is, from the layout's point of view, a channel like
any other.

**What would reopen this, named rather than left silent.** GH #197's own open
question 4 asks whether components are literally custom elements, and records
that the answer "decides a large part of the architecture." It decides something
here too: **who creates the element.** Under this ADR the transform creates every
mount, including a component's. If #197 rules that components are
self-registering custom elements, they create their own, and the transform's job
at that box changes from *emit an element* to *emit a place for one*. That is an
amendment to this ADR, and this paragraph is the notice that it is foreseen
rather than a surprise.

**Why this is not the ADR-286 failure repeated.** ADR-286 carried an unnamed
coupling to an undesigned subsystem and stalled on it for eight weeks. The
coupling here is the same shape and the difference is that it is written down,
bounded to one sentence of consequence, and paired with the condition that
triggers it. An ADR may depend on an undesigned thing; it may not do so quietly.

## Acceptance Criteria

Each criterion is graded **SELF-VERIFYING** (its own mechanism would detect the
failure of its premises) or **PREMISE-DEPENDENT** (a premise needs separate
establishment, and the check that establishes it is named).

**AC-1 (D2, D3, D4) — the end-to-end scenario.** A story declaring
`template: standard`, with a `.templates` block placing `room-name`,
`room-description`, `score`, `turn` and `command-line`, builds without error.
The emitted page carries one element per placed name. Playing `north` puts the
room title in the `room-name` element and the body prose in the
`room-description` element — **not both concatenated into one prose div**, which
is what the default page does today. *SELF-VERIFYING*: the assertion is a DOM
query per element, and a transform that emitted one fused sink fails it.

**AC-2 (D3) — every channel declares whether it is placeable.** A test
enumerates `channelRegistry` and fails on any channel missing the flag. This
replaces counting: the partition is whatever the enumeration reports, and the
criterion is totality, not a number. *SELF-VERIFYING*.

**AC-3 (D3) — rejection: unknown and ineligible names.** A layout naming a
name in none of the three sources fails the build with a diagnostic listing the
known names. A layout naming a channel whose placeable flag is false fails the
same way. A layout naming an `authorChannels`-gated channel, built under a
player capability profile, fails the same way — the name is absent from that
profile's manifest, so this falls out of D3 rather than needing its own rule.
*SELF-VERIFYING*.

**AC-4 (D3) — an unplaced channel is visible, never hidden.** A story
registering a channel the template never places still gets a mount, rendered
through the generic-panel fallback (ADR-253 D4), plus a build warning naming it.
*SELF-VERIFYING*.

**AC-5 (D4) — every row of the precedence table is pinned.** Seven build
fixtures, one per row, asserting the resolved target. The conflict row asserts
the build **fails** and that the diagnostic names both the custom page and the
structure that declared a template. *SELF-VERIFYING*: a fixture that silently
resolved instead of failing does not pass.

**AC-6 (D4) — migration is nil for the existing story.** Fernhill, unedited,
builds to the same page it builds today. *PREMISE-DEPENDENT* — premise: capture
fernhill's current built `index.html` before any change lands, as the
comparison baseline. Without that capture first, "the same page" is unfalsifiable.

**AC-7 (D5) — the label travels, and the fused span splits.** Three checks, in
order: a channel test asserting `score` emits **both** `{current, max}` and its
rendered label (additive, per D5); a browser test asserting `score` and `turn`
render into separate elements and that `BrowserClient`'s composite override is
deleted; and a grep over `packages/platform-browser/src` returning **no**
`Score:` or `Turns:` literal — which today matches **two** sites,
`channels/status.ts:45-58` and `BrowserClient.ts:561-569`, so a fix that
cleaned only the renderer would still fail this. *SELF-VERIFYING*: the grep is the one that makes
the other two mean something, since a label mechanism that shipped beside the
hardcoded strings would pass the first two alone.

**AC-8 (D5) — localization is not a rebuild.** The same turn, run under a
language provider whose label text differs, produces different rendered labels
with no change to the client bundle and no change to the template.
*SELF-VERIFYING*.

**AC-9 (D7) — declarative switching, and the save that costs nothing.** A
two-chapter story with a template per chapter: entering chapter two switches the
page, **the prose scrollback from chapter one is still in the document after the
switch**, and a save taken in chapter two restores into chapter two's template
with **no new field in the save format**. *PREMISE-DEPENDENT* — premise: chapter
state is world state and already persists, recorded at
`packages/extensions/chapters/src/chapters-plugin.ts:17-18` and verified
2026-09-22. If that stopped being true the criterion would pass while the
decision's central claim failed.

**AC-10 (D7) — the ending page, and the empty case.** A story whose Ending names
a template renders it on the ending turn, and the input box is disabled by the
existing `story-ending` path with no change to it
(`packages/platform-browser/src/channels/story-ending.ts`). A story whose
structures name no template renders the `template:` block, or the platform
default if there is none. *SELF-VERIFYING*.

**AC-11 — the regression baseline holds.** `node dist/cli/sharpee.js --test
--chain stories/dungeo/walkthroughs/wt-*.transcript` passes unchanged. One run;
the chain is deterministic at the pinned seed. *PREMISE-DEPENDENT* — premise: Dungeo is a
**TypeScript** story (`stories/dungeo/src/`, with its own `browser-entry.ts`),
not a Chord one, so it has no story header to carry `template:` and cannot
resolve to anything but the existing path. That makes it a control rather than a
subject — which is what a regression baseline should be, but it also means
**AC-11 proves nothing about the new path** and must not be read as if it did.
A Chord story's chain is the check that covers the new path; AC-1 and AC-5 are
where that lives.

### Test requirements

**Behavior Statements are owed for two units** before their tests are written
(CLAUDE.md rule 12): the **transform** (layout source → emitted page, whose
DOES includes writing the page and REJECTS WHEN covers AC-3 and AC-5's conflict)
and the **template resolver** (current state → active template, whose DOES is
the selection and whose REJECTS WHEN is the conflict row). Both are derivable
from the decisions above; if either turns out not to be, this ADR is
underspecified and should be amended rather than worked around.

**Boundary tests**: the switch (AC-9's scrollback survival) and the restore
seam (AC-9's save) are the two boundaries where this decision can fail silently
rather than loudly.

## Consequences

- Until this ADR is accepted, **ADR-286 has no successor in force**, and the
  customisation surface is what exists today: the channel ↔ DOM-name
  convention, a story-local `browser/index.html`, and themes.
- The stale `browser-core.ts:652` warning is replaced by D4's behaviour: the
  `template:` field it currently calls unsupported becomes the output-target
  declaration.
- **Supersession ownership.** ADR-286's own Status was flipped to RETIRED
  UNIMPLEMENTED in session 32d678, 2026-09-22, by the session that wrote this
  ADR, with a banner pointing here — so that flip is done, not owed. What
  remains owed: ADR-252, ADR-253, ADR-280 and ADR-284 carry pointer notes naming
  ADR-286 as the live answer for layout, and ADR-330 and ADR-347 gain a
  presentation consequence under D7. **Owner: the session that accepts this ADR.
  Trigger: the DRAFT → ACCEPTED flip, in the same commit.** Not before —
  churning six ADRs to point at a DRAFT would be worse than the stale pointers
  they carry. *(An earlier draft named the deadline but no owner; `adr-review`
  flags an unowned flip as the root cause of unreliable Status lines, which is
  a failure mode this corpus already has.)*
- **The player-preference owner is deliberately not settled here.** A reader
  choosing large print, high contrast or reduced motion is a third owner of a
  presentation change, and it is closer to themes (ADR-188) than to templates —
  a player's preference is not a property of the fiction. Recorded as owed, and
  belonging to its own decision rather than to this one. Leaving it unstated
  would repeat ADR-286's mistake of carrying an unnamed coupling.
- **GH #197 and `docs/work/web-extensions/concept.md` are owed a rename
  decision**, on the evidence recorded at the struck D6, and are not this ADR's
  to edit. Their verified groundwork — the absent `exits` channel, the twelve
  directions, `InputManager.onCommand`'s single caller — survives any naming.
- Chapters and the Ending become visual concepts as well as structural ones
  (D7). Neither ADR-330 nor ADR-347 anticipated a presentation consequence.

## Session

Session 32d678, 2026-09-22, branch `main`. Written after a survey of why ADR-286
stalled, at David's direction to close and rewrite it against the current
platform. No code changed.
