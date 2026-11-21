# Part II: change list

Prose pass, session 2985ee, 2026-11-20. Baseline for fences: `7b1651c16`.
Files read in full: chapters 5 to 12.

## Chapter 5, Rooms and exits

Edits: sentence 2, paragraph 1.

1. - OLD: You may write it if it makes the file easier to read, as long as it agrees. The Gate Court does so, and uses the second way of writing exits while it is about it:
   - NEW: You may write it if it makes the file easier to read, as long as it agrees with the first. The Gate Court does so, and it also uses the second way of writing exits:
2. - OLD: On an `exits:` line the words go before the colon and apply to every exit on the line, as in `exits, one-way: up to the Attic`.
   - NEW: On an `exits:` line, `one-way` goes before the colon and applies to every exit on the line, as in `exits, one-way: up to the Attic`.
   - Why: "the words" had to be found two paragraphs up. Inline code: one `one-way` span added.
3. Paragraph, "Build and try it": split in two before "To make the changes by hand instead". No words changed.

## Chapter 6, Things

Edits: sentence 1, grammar 1.

1. - OLD: The line `carries`, in the person's own block, names one.
   - NEW: A `carries` line, in the person's own block, names one.
2. - OLD: A thing with no placement at all, and that nobody carries, is not an error.
   - NEW: A thing that has no placement at all, and that nobody carries, is not an error.
   - Why: the two halves were not parallel.

## Chapter 7, Containers and supporters

Edits: sentence 2, grammar 1.

1. - OLD: A thing may equally be `in the` a container or `on the` a supporter.
   - NEW: A thing may equally be placed with `in the` followed by a container, or with `on the` followed by a supporter.
2. - OLD: The line `holds`, followed by a number, limits how many things a container or a supporter can have in it or on it at once.
   - NEW: A `holds` line gives a number, which limits how many things a container or a supporter can have in it or on it at once.
3. Fragment before a block.
   - OLD: In a new game, before the lens has been taken out:
   - NEW: Here is a new game, before the lens has been taken out.

## Chapter 8, Doors, locks and keys

Edits: sentence 1.

1. - OLD: You cannot give two keys names that share no word, since both are keys, so plan instead for them never to be carried at once, or accept that the player will sometimes be asked.
   - NEW: Two keys are both keys, so you cannot give them names that share no word. Plan instead for them never to be carried at once, or accept that the player will sometimes be asked.

## Chapter 9, What things can do: the trait words

Edits: sentence 2.

1. - OLD: This is one of the places chapter 1 promised, where quotation marks are needed.
   - NEW: This is one of the places where quotation marks are needed, as chapter 1 promised.
2. - OLD: The line `servings`, with a number, says how many times the thing can be eaten before it is finished.
   - NEW: A `servings` line, with a number, says ...

## Chapter 10, Light, dark and the other senses

Edits: sentence 2, paragraph 1.

1. Paragraph: the three things it counts are now three sentences.
   - OLD: Notice three things. The player was allowed to walk into the dark, and was allowed to walk out of it again. The exits of a dark room still work, so a player who blunders in is never trapped. And the first line the player read came from another story entirely.
   - NEW: Notice three things. The player was allowed to walk into the dark. The player was also allowed to walk out of it again, because the exits of a dark room still work, so a player who blunders in is never trapped. And the first line the player read came from another story entirely.
2. - OLD: This is a way of telling the player that a closed thing is worth opening without saying so.
   - NEW: This is a way of telling the player, without saying so, that a closed thing is worth opening.
   - Why: "without saying so" attached to "opening".
3. - OLD: The surprise for both kinds of author is further on, in that lighting a light source is an ordinary standard action that you restrict, not a rule you write from nothing.
   - NEW: The surprise for both kinds of author comes later: lighting a light source is an ordinary standard action that you restrict, not a rule you write from nothing.

## Chapter 11, Regions

Edits: grammar 1.

1. - OLD: Two `in` lines on one room is an error:
   - NEW: Two `in` lines on one room are an error:

## Chapter 12, Ways that are closed, hidden or strange

Edits: sentence 3.

1. - OLD: A blocked line may carry a condition, written `up is blocked while` and then the condition before the colon, and then the way is blocked only while the condition holds. Lifting the grille is the business of chapter 24. Conditions are chapter 16.
   - NEW: A blocked line may carry a condition. It is written `up is blocked while`, then the condition, then the colon, and the way is blocked only while the condition holds. Conditions are the business of chapter 16, and lifting the grille is the business of chapter 24.
2. - OLD: A deadly way that the prose did not signal is a trap, and players forgive very little less.
   - NEW: A deadly way that the prose did not signal is a trap, and there is very little that players forgive less.
3. - OLD: To see it work, wait until this chapter's story is in your folder, which is the copy in "Build and try it" below.
   - NEW: To see it work, wait until you have copied this chapter's story into your folder, in "Build and try it" below.

## Noticed, not changed

Nothing to file. No accuracy problem was noticed in Part II.

## Patterns for the Phase 9 sweep

- "The line `x`," naming a line by its first word, where "A `x` line" reads more easily (chapters 6, 7 and 9 fixed; `wears` in chapter 9 left because it reads well as written).
- A sentence fragment ending in a colon before a fenced block.
- A modifier at the end of a sentence that attaches to the wrong verb.
