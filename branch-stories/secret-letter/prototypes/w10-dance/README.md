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
| **The hand-off itself** | a partner's `opens when` while the player is still in the last partner's scene | **does not open** — see below |

## The finding

The story cannot pass the player's conversation from one partner to the next.
A thread opens only when neither party is in another scene
(`packages/character/src/tick-phases.ts`, `ensureScene`), and nothing in Chord
closes or hands off a scene: the previous partner's scene ends only by the
player's own address or by about three silent turns. Under a two-turn hand
the next partner is reached a round late. ADR-320 D10's interruption rule (an
`opens when` partner taking the floor from a passive scene) is designed and
unbuilt — the same family as GH #347. Recorded on the watch list; a platform
discussion, not a story-side workaround.

## Running it

```bash
./sharpee test branch-stories/secret-letter/prototypes/w10-dance --verbose
./sharpee play branch-stories/secret-letter/prototypes/w10-dance
```

`w10-dance.tests.json` was transcribed from a real `./sharpee play` run (the
story draws no randomness), not recorded in the IDE. The bundle's
`dist/cli/sharpee.js --exec` cannot run this story: it has no import resolver.
