
# 6 · Endings & text: scores, three ways out, living prose

*(Grammar reference: "define" (phrases + strategies), "Ownership lines"
(`score`). Previous: [state & verbs](./state.md) ·
Next: [the browser](./browser.md))*

## Scores live on their owners

There is no score table. Each of Fernhill's eight scores (perfect: 50) is
declared on the thing that earns it, and awarded from that owner's own
clauses:

```chord
create the tarnished key
  score found worth 5

  after taking it, once
    award found
  end after
```

Awards ride whatever rule marks the achievement — a topic row (`award
truth, once` when Tobias finally talks about the fire), a give-gate
(`award softened, once when it is softened`), or the boiler's own
switch-on clause. The `, once` modifier keeps repeats honest.

## Three endings, all real

**Win** — walk out the gates carrying the deed:

```chord
create the Iron Gates
  after entering it while the player has the deed
    play music dawn-theme when client has music
    win fernhill-saved
  end after
```

**Lose** — the timeline's `at turn 130 → lose dawn-comes` (chapter 4).

**Die** — the fuse's `kill the player fuse-blast when the fuse is lit`.

`win` / `lose` / `kill the player` each name their ending phrase. Write
all your endings for real and test all of them — Fernhill's transcript
suite drives each branch, including the death.

## Phrase strategies

Prose that repeats verbatim goes dead. A strategy adverb on a phrase
declaration gives it variants and a selection rule:

```chord
define phrase night-wind, randomly
  The wind comes off the downs and worries at the bare limes.
or
  A gust rattles every pane in the greenhouse at once.
or
  The wind drops for a moment, and the night is very quiet.
end phrase

define phrase cold-returns, first-time
  The cold finds you the moment you step out, and means it.
or
  The cold again, familiar now.
end phrase

define phrase cellar-drip, cycling
  Somewhere back in the vaults, a drop falls.
or
  Drip. The dark keeps its own time.
end phrase
```

`randomly` shuffles, `cycling` rotates in order, `first-time` speaks its
first variant once and settles on the rest (there are also `stopping` and
`sticky`). When you transcript-test strategy lines, assert structurally
("one of these appeared"), never on an exact variant.

## Detail that unlocks: markers and gates

The hall's description carries a marker — `a wide mantel{mantel-hint}` —
whose snippet only exists once the diary has been read:

```chord
define phrase mantel-hint while the diary page is read
   — and over it Verity's photograph, which you cannot stop looking
  at now
end phrase
```

Before the diary: the sentence reads clean, no seam. After: the same room
points you at the photograph. The photograph itself gains a `phrase
detail while the diary page is read:` paragraph the same way — the world
literally reads differently as the player learns. Name states for what a
thing IS (`folded`/`read`), and gates like these stay legible.

Next: [the browser — sound, images, and channels](./browser.md).
