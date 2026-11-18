# A prologue story before the main story: ideas, not decisions

**Status**: ideas set aside for later (David, 2026-11-18, session 0e7432: "I'm cool with this being a rathole for later ... write the other ideas to docs/work/prologue-ideas/").

Nothing here is decided, planned or scheduled. It is the record of a conversation, kept so that the thinking does not have to be done twice. The work that was decided out of the same conversation is ADR-404 (`docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md`): the engine runs a story's opening as a routine of prologue, banner and look, outside the turn cycle.

## Where the idea came from

ADR-404 began as a fix for GH #793, the opening `look` counting as turn 1. While its open questions were being answered, the question "what may the opening block contain?" led David from a fixed list of steps to something much larger: a playable story before the story.

He recalled that Infocom did this at least once. The session suggested *Bureaucracy* (a form filled in before play) and *Beyond Zork* (a character built before play), from memory. Neither was checked.

## How David's thinking moved, in his words

The order matters, because each answer withdrew part of the one before.

1. On letting the block run any action the player could type: "I like the concept of C, but also aware this could be a rathole. But the idea that the author has a place to put a 'mini-game' is interesting".
2. A first mechanism: "we'd turn off undo/save/restore and the interaction would still have turns, but the turn count would get reset when the actual story starts". He confirmed this was new: "we never discussed this - this is a new idea".
3. A narrow version: "no mechanics - only basic movement, no inventory/get/take, we leave the door open for an interactive prologue, that's all".
4. Then wider: "the more I think about this, the more I like the idea of having a mostly complete prologue-game before the regular game".
5. Then the shape: "we still keep save/restore out, but everything else is in play, but once the story is done, the world is setup with its default _plus_ anything the PC accomplished in the prologue...the author could have varying setups based on the prologue...so we allow for an authored prologue story, then a post-prologue setup, then the main story".
6. And the boundary between the two: "we'd need to bracket the prologue story from the main story and each sets up its own world...anything carried forward has to happen in the passing setup routine that can read the prologue state and set things in the main story state".

## The idea as it stood when it was set aside

- A story may have **an authored prologue story** before the main story.
- The order is: **the prologue story, then a passing setup routine, then the main story**.
- The story file **brackets** the prologue story from the main story. **Each declares and builds its own world.**
- In the prologue story **everything is in play except save and restore**. (Answers 2 and 3 above, which turned mechanics off and allowed only movement, were withdrawn by answer 5.)
- **Nothing the prologue did reaches the main story by itself.** The passing setup routine reads the prologue's state and sets the main story's, and an author may write different setups for different outcomes.
- **The turn count is reset when the main story starts**, so its first command is turn 1. This came from answer 2 and was never withdrawn.
- A story with no prologue story goes straight to the main story. That case is what ADR-404 builds.

The session's own reading, not David's words: because the main story's world is built fresh, its turn 1 has no mechanic already running, which is the guarantee GH #793 asks for.

## Questions left open

1. **How is the prologue story bracketed in the story file?** Which rooms, things, clauses, phrases and definitions belong to it, and may the two stories share any (a phrase, a trait, a kind)?
2. **Which block is the passing setup routine?** `before the game starts … end before` (ADR-327 D10) already is a setup step that takes effect statements, may carry conditions and assigns the player. If "the game" means the main story, it could be the passing routine. Today it runs while the one world is built, and each of the two stories would need a player of its own.
3. **How does the passing routine read the prologue's state?** A world that has been replaced is gone. Something has to keep the prologue's results where the routine can ask about them.
4. **What ends the prologue story?** Something the author writes has to say "the main story starts now".
5. **Is undo available in the prologue?** Answer 2 turned it off with save and restore. Answer 5 names only save and restore.
6. **What does a reload do in the middle of a prologue**, when there is no save to restore from?
7. **What does the status line show** before the main story starts: a score, a turn count, nothing?
8. **How does a test tree record a prologue story**, and how do claims and derived tests treat its clauses?
9. **Does the prologue story have a banner or a title of its own?**
10. **The Story IR.** One story file holding two worlds is a change to what a compiled story is.

## Sketches from the conversation

Both are invented syntax, written to have something to react to. Neither was checked against the grammar.

A playable opening ended by a statement, from before the two-worlds answer:

```chord
when the game starts
  phrase on-the-causeway        ## no banner yet: the prologue-game opens
  look
end when

create the Causeway, a room
  north to the Gate Court

  A mile of stone across the mere, and the Hall at the end of it.

after the player entering the Gate Court, once
  begin the story               ## banner, turn 1, the clock starts
end after
```

A passing setup routine that carries chosen results into a rebuilt world:

```chord
before the game starts
  change the player to Ansel
  move the library key to Ansel when the prologue's key was found
  change the lens to sound when the prologue's lens was saved
end before
```

## Existing things that looked relevant, not read closely

- **`define chapters`** already names stretches of a story and says when each begins (`begins when the game starts`). A prologue story resembles a chapter before the first.
- **Story states.** A Chord story may have states of its own (`change the story to waking`). "Not yet started" might be a state the platform owns.
- **The turn's stage lists** (`packages/engine/src/turn/stages.ts`) include an input-mode stage and an exchange stage, which may bear on an opening that takes input.
- **Restart** rebuilds a world already, which is the nearest existing thing to "the main story builds its own world".

## Options the session offered and how they fared

- **An opening that takes scripted player actions** (`inventory` as a step of the opening block): liked as a concept, then set aside with everything else here. ADR-404's block takes `prologue`, `banner` and `look` only.
- **The opening as a phase whose clock is stopped**, with input not counting as turns: offered by the session, replaced by David's simpler "ordinary turns, and the count resets".
- **One world carried on** from the prologue into the main story, against **a default world rebuilt** with results carried over: David chose neither as offered and went further, to two worlds with a passing routine.
