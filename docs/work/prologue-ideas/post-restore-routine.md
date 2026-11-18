# A routine that runs after a restore: an idea, not a decision

**Status**: an idea set aside for later (David, 2026-11-18, session 0e7432: "another idea for later").

Nothing here is decided, planned or scheduled.

## The idea

David, while ADR-404's question about restored sessions was being answered: "we _could_ enable a post-restore routine that allows the author to provide a summary of where the story is".

ADR-404 gives a story an opening routine, `when the game starts … end when`, that the engine runs when a new game begins. Its decision 11 says the routine does not run on a restored session: a restored session shows what was saved and prints nothing new. This idea is the counterpart for that case: a second routine, run after a restore, in which the author says where the story stands.

## What it might be for

A player who comes back to a story after a week sees the end of an old transcript. A line or two written by the author ("You are in the Library. The bell is ringing and Hobb is waiting for his spectacles.") would tell them where they are and what they were doing.

## Questions it would need answered

1. **What is the block called?** `when the game starts` is the opening. A restore needs a name of its own.
2. **What may it contain?** A summary wants conditions and phrases, which is more than the opening routine's three special routines.
3. **Does it run on every restore, or only when the player has been away?** The browser client restores on every page reload, including an accidental one a second later.
4. **Is it a turn?** By ADR-404's reasoning it should not be: no mechanics should run because a page was reloaded.
5. **Where does its output go?** After the restored transcript and the "[Session restored]" line, or in place of that line.
6. **Does it apply to the Restore menu and the RESTORE command, or only to a reload?**

## Related

- ADR-404, `docs/architecture/adrs/adr-404-the-opening-is-a-routine-not-a-turn.md`, decision 11.
- GH #798, fixed in Sharpee 5.6.3: a restore now puts back the room name and the channel panels, which is the mechanical half of "show the player where they are". This idea is the authored half.
- `prologue-story-ideas.md` in this folder, the other idea set aside from the same conversation.
