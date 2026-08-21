# `secret-letter/` — the Chord port of *Jack Toresal and The Secret Letter*

**Scaffold. No chapter content.** Structure, metadata, and a working boot test
only. Chapter 1 lands at plan Phase 5.

## The gate

The port's content authority is **David's change document** (P-4 in
`docs/proposals/secret-letter-port.md`). Plan Phase 4 confirms it exists and is
reachable by path, and it is CURRENT and **blocked on that document** — it is not
produced by this plan. **A chapter the change document does not cover is not
ported**, and Phases 5, 7 and 8 each cite the section that authorizes the chapter
they build.

Nothing from the 2009 game is copied into this directory until that gate opens.
The placeholder room in `secret-letter.story` is not the game's opening — Book 1
opens in The Alley, off Grubber's Market — and Phase 5 replaces it wholesale.

## This is a retarget

The original's non-IF middle-school audience constraint is gone. The 2009 game is
the **reference**, not the specification; divergence from it is expected and is
not a defect.

## What it is checked against

| | |
| --- | --- |
| `docs/references/textfyre/secretletter/` | The 2009 Inform 7 source and design archive. Deliberately modified — read its `README.md` first |
| `…/secretletter/INVENTORY.md` | The world measured from that source: 84 rooms by book, 47 NPCs, 23 quip trees / 380 quips, 56 scenes, the chapter spine, and the puzzle path from the source's own built-in walkthrough. **This is the build checklist for Phase 8** |
| `…/secretletter/testing/README.md` | The five playtest transcripts, labelled. Reference material — explicitly **not** this port's acceptance gate |
| `docs/work/secret-letter-port/plan.md` | The eight-phase plan |
| `docs/proposals/secret-letter-port.md` | P-1..P-10, six DONE |

## Files

Layout follows `branch-stories/fernhill/`, the pilot Chord story.

| File | What it is | State |
| --- | --- | --- |
| `secret-letter.story` | The story. One `story` block, one placeholder room, the player | Scaffold |
| `secret-letter.config.json` | IFID + format version | Final — the IFID is permanent |
| `secret-letter.recipe.json` | Input to `scripts/make-story-artifacts.mjs`: the winning path (`spine`) and its branches | Empty spine — filled as chapters land |
| `secret-letter.tests.json` | The recorded test tree (ADR-302 shape), **generated from a real run**, never hand-written | 2 cards (opening + boot) |
| `secret-letter.world-ignore.json` | Chord Writer's world-view exclusions | Empty |

Not present yet, and each has a trigger:

- **`assets/`** — Phase 5 or later, when the port has its first image or sound.
- **`browser/index.html`** — only if the port needs a custom page layout (ADR-253
  D3 escape hatch, which is why fernhill has one). The default client needs no
  such file.
- **`WALKTHROUGH.txt`** — generated alongside `tests.json` once the recipe has a
  real spine; meaningless while the spine is empty.

## Regenerating the test tree

```bash
node scripts/make-story-artifacts.mjs branch-stories/secret-letter/secret-letter.recipe.json \
  --tests-out branch-stories/secret-letter/secret-letter.tests.json \
  --walkthrough-out branch-stories/secret-letter/WALKTHROUGH.txt
```

Both output flags are required — with neither, the script runs, writes nothing,
and **exits 0**. Everything it emits is captured from a real `dist/cli/sharpee.js
--exec` run, so an assertion that is not in the actual transcript cannot appear.

Two things to know before regenerating:

- **It drives the built bundle.** Rebuild with `./repokit build secret-letter`
  first whenever platform packages have moved, or the tree records the old
  engine's prose.
- **Regeneration overwrites hand-added assertions.** The script always emits the
  `opening` card with empty assertions; fernhill's `info.title` / `info.description`
  channel claims on that card were added by hand and would be dropped by a
  regenerate. This scaffold deliberately carries none, so there is nothing to lose
  yet — but once any are added, treat regeneration as destructive.

## Running it

```bash
node dist/cli/sharpee.js --play --story branch-stories/secret-letter/secret-letter.story
node dist/cli/sharpee.js --exec "look" --story branch-stories/secret-letter/secret-letter.story
```

Pass the `.story` **file**, not the directory — Chord stories in `branch-stories/`
require it. `./repokit build secret-letter` resolves the name by directory and
needs no registration anywhere.

## Ship target

P-10 is decided: **a public release** (David, 2026-08-21) — every covered chapter
playable with transcript tests passing, a `--browser` build, hosted at a public
URL, a landing page, an IFID, and announced. The current plan reaches only the
first of those five. **Reaching plan Phase 8 does not mean the port is done**; a
re-plan pass covering presentation, hosting and release is required as Phase 8
nears completion.

The existing OpenSilver re-host at `secretletter.plover.net` serves the *2009*
game. This port needs its own address rather than silently replacing it.
