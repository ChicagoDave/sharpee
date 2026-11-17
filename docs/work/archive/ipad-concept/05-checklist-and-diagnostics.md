# 05 — The checklist, and diagnostics

**Created**: 2026-09-11
**Status**: EXPLORATORY

## One mechanism, two faces

The checklist and the problem sheet are the same data. A title, a start block
that names a player, somewhere to stand — those are analyzer requirements
either way. Stated *before* you have done them it is a checklist; stated after
you haven't it is a problem. Same source, opposite emotional framing, and the
checklist is the one a child meets first.

## The floor (D4)

Beside the blank canvas, in the no-selection inspector:

**Or it will not run** — Chord's own requirements

1. `title:` — name your story *(`parse.story-title`)*
2. `create` a `room` to stand in
3. `create` a `person`, mark them `playable`
4. `before the game starts`, say who `the player` is
   *(`analysis.start-block-no-role`)*

**Or it is not a story** — labelled *our opinion, not Chord's*

5. `create` a `thing` worth finding
6. an `exit` — join two rooms

Then **Play it**, which is the point. Play is never disabled; a story that is
one room and nothing else should run, and should be funny about its edges.
(See `07` — the mock currently greys Play out, which is wrong under D2.)

Items are written in Chord's words, not softened (D5, `08`). A child ticking
these off has met `title`, `room`, `person`, `playable`, `before the game
starts`, `the player`, `thing` and `exit` before anyone has explained that
there is a language.

## Then it keeps going

Once the six are met the same rail becomes **What next**, labelled *none of it
required*: `create` another `room`, give a room a `description`, make
something `lockable`, add a `first time` description, `create` a `person` to
talk to, make something happen `on` entering, give points with `score` and
`award`.

Suggestions are drawn from what the story already has and what Chord could do
to it next, so the list keeps pace instead of running out. It must never
become a to-do list a child can fail — see `07` for the unsolved half of this.

## Diagnostics in plain English

Every `parse.*` and `analysis.*` code maps to one plain sentence, one badge
location (via the range, per `02`) and — where the analyzer already ships a
fix-it — one button. The code itself stays visible in small type. That is
deliberate: it is the thread a child follows into the real toolchain, and it
costs nothing to leave.

Examples:

| Code | Sentence | Fix |
|---|---|---|
| `analysis.start-block-no-role` | Nobody is playing yet. | Make `<the only playable person>` the player |
| `parse.story-title` | Your story needs a name. | — |
| `analysis.missing-ifid` | This story has no ID yet. | Make one |
| `analysis.undeclared-state` | The boiler has no `running` state. | Add it / pick another |
| `analysis.missing-phrase` | This says something that does not exist yet. | Write it |

## Two honesty rules

1. **Say which checks are yours.** Reachability, "no description yet", and the
   two floor items above are the *app's* opinions, not the compiler's, and are
   labelled so. Otherwise a child hunts for a Chord rule that does not exist.
2. **"On purpose" is a real answer.** An app-level warning a child can dismiss
   with intent teaches more than one they can only obey — a one-way drop into
   a room with no way out is a fine thing to build deliberately. Dismissals are
   remembered per-thing, not globally.
