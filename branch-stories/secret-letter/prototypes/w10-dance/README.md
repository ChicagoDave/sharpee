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
| Each partner's talk | `define conversation … opens when <partner> is dancing`, bare `beat:` rows | opens itself; the platform parks it when the hand passes (no per-beat gate since GH #354, 2026-09-03) |
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

**The hold gates are gone (2026-09-03).** As first re-transcribed, every
beat carried `when <partner> is dancing:` because without it the partner
losing the hand still served one more beat on the hand-off turn before the
challenge parked him — step 4a walked candidates in entity-id order and
served a seated owner's floor turn before a later candidate's challenge
(GH #354). David ruled that the platform resolves the order: step 4a now runs
every challenge before any floor turn, so the beats are bare `beat:` rows and
the same tree passes unchanged (15 cards, 46 assertions before the pins
below were added). A story that wants a seated partner to finish first still
has `define conversation …, blocking`.

**State pins.** The hand-off cards pin each partner's own `waiting`/`dancing`
and the dance's hand, spelled the way Chord spells the condition — `the
first partner is waiting`, `the dance is second`, `the story is ended`
(GH #355, 2026-09-03). `story.state = dancing` stays beside them on the
cards that had it.

## Running it

```bash
./sharpee test branch-stories/secret-letter/prototypes/w10-dance --verbose
./sharpee play branch-stories/secret-letter/prototypes/w10-dance
```

`w10-dance.tests.json` was transcribed from a real `./sharpee play` run (the
story draws no randomness), not recorded in the IDE — fed one command per
~350 ms through a driver script, since piping stdin all at once drops
commands. Re-transcribed 2026-09-02 against the interruption: fourteen turns
to the music's end, where the lagged engine needed twenty-eight. Re-run
2026-09-03 with the gates dropped and the state pins added: 15 cards, 69
assertions. The bundle's
`dist/cli/sharpee.js --exec` cannot run this story: it has no import resolver.
