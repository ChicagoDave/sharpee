# 07 — Open questions

**Created**: 2026-09-11
**Status**: EXPLORATORY

Ordered roughly by how early each one bites.

## 1. Play on a nearly empty story

Under D2 and D4, Play must never be unavailable. A story that is one room and
nothing else should run, and should be funny about its edges — walking into a
hole you left is the best bug report a nine-year-old will ever get, and it is
free motivation.

The mocked problem sheet currently greys the Play button out when the story
has no player, which is backwards. What the client says when the player walks
at a direction with no exit *yet* — as opposed to no exit *ever* — is
undesigned, and it may want to be different prose.

## 2. Deleting things

Exits belong to the from-room, so one drawn edge is one line in one block.
Dragging a room is harmless — positions are only comment data (D7). But
deleting one has to reach into *other* blocks to clean up lines that name it,
and into the comment run. The rule for what a delete is allowed to touch needs
writing down before it is implemented.

Related: an edge carrying a `through <door>` tail — is it drawn from the room
or from the door? Both read as wrong in different cases.

## 3. Range drift across sessions

The Start Card writes three ranges in three places as one undo step (`02`).
That is fine while the app owns the file. It stops being fine once a hand edit
in Chord Writer, or a merge, has moved them underneath. The reconciliation
rule — reparse and re-derive, presumably — needs stating, and the undo stack
has to survive or be discarded honestly.

## 4. Where the suggestions come from, and how they stop

The checklist's second life (`05`) is only sketched. A list that keeps
generating chores is worse than no list. Needs: a source (what the story has ×
what Chord could do next), a cap, a dismissal that sticks, and a resting state
that is not an empty list reading as "you are finished".

## 5. The per-entity phrase override

Editing a phrase from a thing's inspector writes an override on that thing,
not on the trait (`04`). Nothing in the UI currently shows that distinction. A
child who edits one door and expects every door to change — or vice versa —
will be surprised, and it is not obvious which surprise is worse.

## 6. Cover and byline

Not on the canvas at all. Under Option A (`06`) the payoff for a child is
showing someone, and a file with no face is a weak thing to show. Minimum is
probably a title screen the client already knows how to render.

## 7. Comment-run format

`## chord-canvas:` key format, behaviour on stale entries, repair policy, and
what happens when two runs disagree. Also: should the run carry anything else
(zoom, last selection) or stay strictly positional? Strictly positional is the
safer answer.

## 8. Where the CST work lives

`packages/chord` (shared with Chord Writer, and the right answer) versus the
app. Raised in `02`; recorded here because it is the one item that would
change existing code rather than add new code, and therefore the one that
needs an ADR if the concept proceeds.

## 9. The bar

Recorded in `01` and unmitigated: entertainment has to beat everything else
already on the iPad. Nothing in this folder addresses it, and no amount of
design craft substitutes for finding out whether a child who is not related to
the author will open it twice.
