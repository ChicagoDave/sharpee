# Part VI: change list

Prose pass, session 2985ee, 2026-11-20. Baseline for fences: `7b1651c16`.
Files read in full: chapters 32 to 35. HTML comments in chapters 33, 34 and 35 left as they are. No hunger count, turn count or distance moved.

## Chapter 32, Machines

Read, no change.

## Chapter 33, Vehicles

Edits: grammar 1 (fragment).

1. Fragment before a block.
   - OLD: With the grille lifted and the lens in hand:
   - NEW: With the grille lifted and the lens in hand, the second phrase answers.

## Chapter 34, Open water and open ground

Read, no change.

## Chapter 35, The opt-in systems

Edits: paragraph 1.

1. "Build and try it": the `yard` folder was mentioned in the middle of the `cellar` instructions, so "inside it" could mean either folder. It now comes where the reader makes it.
   - OLD: Make a folder called `cellar` beside your project, and later one called `yard` in the same place. Type the first example into a file called `cellar.story` inside it, and run these two commands there. ... Then make a folder called `yard`, type the second example into `yard.story` inside it, and do the same.
   - NEW: Make a folder called `cellar` beside your project. Type the first example into a file called `cellar.story` inside it, and run these two commands there. ... Then make a folder called `yard` in the same place, type the second example into `yard.story` inside it, and do the same.
   - Inline code: one repeated `yard` span dropped.

## Noticed, not changed

- Issue 825 (filed): chapter 33 says Ansel has carried the lens "since chapter 9". The lens is created in chapter 7 and chapter 9 does not mention it.
- Chapters 33, 34 and 35 say what they leave out only in HTML comments (issue 789, already open).

## Patterns for the Phase 9 sweep

- Chapter cross-references by number ("since chapter N", "chapter N showed"): this pass did not verify them one by one. Issue 825 is one that is wrong. A mechanical check of every "chapter N" against the chapter it names would be a separate job.
