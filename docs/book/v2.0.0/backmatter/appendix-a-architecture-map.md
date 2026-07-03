# Appendix A — Architecture Map {.unnumbered}

This appendix is a one-page map of where things live in Sharpee. Every concept the
book taught belongs to one of these layers; when you're unsure where a new feature
goes, the rule of thumb is the question that opens this appendix: *what layer owns
this?*

## The layers

Sharpee is built in layers, each with a single responsibility. Dependencies flow
*inward* — a story depends on the platform, never the reverse; the engine knows
nothing about any particular game.

| Layer | Package(s) | Owns | In this book |
|---|---|---|---|
| **Engine** | `@sharpee/engine` | The turn cycle, command execution, event dispatch, scheduler, save/restore, the channel manifest + per-turn packets | Vol. I (the play loop), VI (turns & daemons), VIII (saving) |
| **World model** | `@sharpee/world-model` | Entities, traits, and behaviors — all game *state* and the rules that mutate it — plus the per-world capability-behavior and action-interceptor registries (ADR-207/208) | Vol. II (building a world), IV (custom traits & behaviors) |
| **Standard library** | `@sharpee/stdlib` | The standard actions (validate/execute/report/blocked), scope & visibility, capability dispatch (consulting the world's registries), the standard channels | Vol. III (actions, scope), IV (capability dispatch) |
| **Parser** | `@sharpee/parser-en-us` | Grammar patterns — turning typed text into a resolved command | Vol. V (extending the grammar) |
| **Language** | `@sharpee/lang-en-us` | All player-facing text: message IDs, templates, the phrase algebra's template grammar and Assembler | Vol. V (the language layer, the phrase algebra) |
| **Story** | your project | Game-specific content and overrides — rooms, items, NPCs, custom actions, puzzles | the whole Family Zoo running example |
| **Client** | `@sharpee/platform-browser` (and others) | UI: rendering channel packets to a screen, reading input | Vol. VII (the web client, decoration, media) |

## The two flows

Two directions of flow connect the layers, and together they *are* a turn:

**Input — text becomes a mutation.** The **client** reads a command and hands it to
the **engine**, which asks the **parser** to resolve it against the grammar (plus any
the **story** added). The engine runs the matching **stdlib** action, which validates,
then mutates the **world model** through behaviors, then reports what happened as
events.

**Output — state becomes presentation.** The engine renders the turn's prose through
the **language** layer's templates and Assembler into text blocks, then asks
every **channel** "what do you have this turn?" and assembles a **packet**. The
**client** hands each channel's value to a renderer that updates the screen.

## The universal surface

The single idea that ties Volume VII back to everything before it: **every story-to-UI
signal travels as a channel** — prose, score, location, prompt, images, sound. There
is no special path for any of them. That data-only packet stream is what lets one
unchanged story run in a terminal or a browser.

## Where does this belong?

When adding a feature, ask in this order:

1. Is it game state or a rule that changes it? → **world model** (a trait/behavior).
2. Is it a common interaction pattern? → **stdlib** (an action, or capability dispatch).
3. Is it new vocabulary? → **parser** (grammar) and **language** (messages).
4. Is it specific to *this* game? → **story**.
5. Is it about how something *looks or sounds*? → **client** (a channel + renderer).

If a feature seems to need a change to the **engine** itself, stop — the architecture
usually already supports what you want through a trait, a capability, an event
handler, or a channel. Reach for a platform change only when all of those genuinely
don't fit.
