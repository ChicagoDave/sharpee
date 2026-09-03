# `w10-dance/` — the Chapter 11 dance engine, prototyped (watch-list W-10)

A throwaway check, not a chapter. Before the Secret Letter ball is built as a
dance (change document, Chapter 11 — David, 2026-09-02: *"a dance where
everyone moves in concentric circles and Jacqueline is passed from guest to
guest and has one or two turns to converse"*), watch-list W-10 asks whether
Chord carries the engine: a rotation that hands the player from one live
conversation to the next on a turn budget, and memory across rounds.

**Nothing here is story content.** Three placeholder partners, every line a
bracketed marker. The port imports nothing from this directory.

## What it exercises

| Piece | Spelling used | Result (2026-09-02) |
| --- | --- | --- |
| The turn budget | `define timer hand for the dance` with one named turn, `restart hand` on expiry | two-turn hands, exact |
| The rotation | one `when hand expires` clause, `select on the dance's state`, partners flip `waiting`/`dancing` | works |
| Each partner's talk | `define conversation … opens when <partner> is dancing`, beats held on `dancing` | opens itself, goes quiet when the hand passes |
| Continuation | `go on` mid-thread | serves the next beat |
| Rounds | story counter `rounds`, raised at the wrap; topic rows keyed `at most 1` / `at least 2` | memory across rounds works |
| The music's end | conclusion rows `raise spoken by 1`; `on every turn while spoken is 3, once` | works |
| **The hand-off itself** | a partner's `opens when` while the player is still in the last partner's scene | **works** since ADR-320 D10a (2026-09-02): the new hand interrupts, the old parks with `on parting`, on the hand-off turn |

## The finding (2026-09-02, morning) — and its resolution (same day)

As first prototyped, the story could not pass the player's conversation from
one partner to the next: a thread opened only when neither party was in
another scene (`packages/character/src/tick-phases.ts`, `ensureScene`), and
nothing in Chord closed or handed off a scene, so under a two-turn hand the
next partner was reached a round late (GH #348). ADR-320 D10a built the
interruption the same day: an `opens when` partner challenges the scene the
player is seated in through the same intrusion call world acts and the
player's own address make; a `passive` scene yields, its thread parks at its
cursor and its `on parting` renders, and the new hand speaks — all on the
hand-off turn. The tree below was re-transcribed against that engine.

**The hold gates stay.** `beat, when <partner> is dancing:` looked redundant
once the interruption existed, but without them the partner losing the hand
still serves one more beat on the hand-off turn before the challenge parks
him — step 4a walks candidates in entity-id order and serves a seated owner's
floor turn before a later candidate's challenge (GH #354). The gates are what
say "only the current hand speaks"; that is story logic and it stays.

**State pins.** Only `story.state` can be pinned on a card; a partner's own
`waiting`/`dancing` is a `chord.state.*` value the tree grammar cannot read
(GH #355), so the hand-off cards pin the story's phase and prove the hand
passed through the parting and first-beat lines instead.

## Running it

```bash
./sharpee test branch-stories/secret-letter/prototypes/w10-dance --verbose
./sharpee play branch-stories/secret-letter/prototypes/w10-dance
```

`w10-dance.tests.json` was transcribed from a real `./sharpee play` run (the
story draws no randomness), not recorded in the IDE — fed one command per
~350 ms through a driver script, since piping stdin all at once drops
commands. Re-transcribed 2026-09-02 against the interruption: fourteen turns
to the music's end, where the lagged engine needed twenty-eight. The bundle's
`dist/cli/sharpee.js --exec` cannot run this story: it has no import resolver.
