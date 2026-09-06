# Session Summary: 2026-09-04 - feat/secret-letter-port

## Status: COMPLETE — Chapters 4 (The Night Journey to Lord's Keep) and 5 (Jail and the Sewers) built and pinned; 886 cards / 1506 assertions passing

## Goals
- Continue the Secret Letter port, Phase 10: build Chapter 4 (Book 5B) as the change document authorizes it (David: "proceed").

## Completed
- Session start: recap, `pre-session-audit` relayed, core concepts read, gate cleared. Profile fresh (regenerated 16:47 the same day).
- Research: change document Chapter 4 (five rulings, three gaps), source `story.ni:6550-7596` read whole, the night-state remap (`5938-5943`), the day/night text variants (`4204`, `4237-4260`, `4923`, `4956-4966`, `5008`), the Southern Gate block (`10982`), Bobby's night quips `BO23-31` (in the source, not the xlsx).
- Eight probe rounds in a scratch story (`./sharpee play`) before writing: gated description markers, markers in entity descriptions and presence lines, `move the player` narration, statement ordering, region daemons, trait definition order, `select stopping`, `extend action` grammar, story-action refusal order. Findings below.
- `branch-stories/secret-letter/night-journey.chord` (new, ~1,900 lines): the night market, Lord's Road, the Pasture, the Stream Crossing, the Woods and the seeded split sapling, the Clearing and fountain, Underneath the Fountain, Tunnel End and the wall, the Chapel, both baileys, the Guardhouse and the arrow slit's two rows, the return, the capture verbatim, a placeholder Jail Cell; the dawdle timer, the `following`/`swimming`/`praying` story actions, `listen at` and `breathe` grammar, three regions. Gentry's text throughout; Bobby's BO23-26 and BO27-31 as stubs taking the source's path.
- Night layer on Chapters 2 and 3's files: Commerce Street and Lord's Market descriptions as gated day/night phrases; shop exits and storefronts refuse at night; the park; the lanterns; Commerce Street's west now goes to the Market Square (day-blocked); the Eastern Junction's east one-way; the street-push placeholder on Commerce Street's first night entry; the curfew moves Bobby to the market; Bobby's states extended (`leading`, `returning`, `gone`), his talk clause merged with when-tails, his presence line replaced by room markers (`{bobby-leans}` in the alley), the dawdle expiry on his block, his idle silenced in the keep; the bare smell/listen actions gain the journey's answers.
- `secret-letter.story`: `import "night-journey"`; Chapter V's row.
- Tree: a 114-card branch from the Entrance to Maiden House at night, derived at the pinned seed via skip cards + `--json --capture-output`. `./sharpee test branch-stories/secret-letter` → **815 cards passing, 1374 assertions passing** (from 701/1164); baseline re-verified at 701/1164 with the night layer before the branch was added.
- Plan: Phase 10 progress entry for Chapter 4 (measured dawdle clock, findings, flagged decisions, gaps).
- GitHub: #364 (entity-description markers print literally; presence lines cannot vary), #365 (region daemon fires outside its region), #366 (a state named `seen` is silently shadowed).
- **Chapter 5 (David: "continue")** — `branch-stories/secret-letter/jail.chord` (new, ~1,500 lines): the cell and the waking, the confiscation, Bobby's voice on timers, Jacobs's six states and his clocks, the three wire-keyed cell doors, the jailhouse, Olmer and Darrens (scope through the door's aliases), the drain room and the `lifting` story action, the sewer puzzle as geometry (four tunnels, four bends) over a drawn magic colour and four glyph layouts, the deaths, the Access Tunnel, the Empty Alleyway carrying the daylight text, Chapter VI's row. The guards' clock (forty turns from JA2) with a placeholder capture. `Toresal` reversible; the bare smell/listen actions extended; `following` extended for the drunks and the sewer. Tree: 45 main cards + a wrong-turn death + a 25-wait guards' death — **886 cards passing, 1506 assertions passing**. GitHub #367 (authored `move the player` narrates entering clauses before the arrival).

## Key Decisions
- Presence lines: Bobby carries no `phrase present:`; each journey room splices `{bobby-waiting}`, the alley and the market their own lines — the only spelling Chord has for a location-dependent presence line (#364).
- Commerce Street's west exit is the night market; the day market is never re-entered from Commerce Street in the source (verified `4281`, `8758`), so nothing is lost.
- The dawdle clock (gap 2, reported not decided): four free turns per stage, re-armed on each first stage arrival, once per journey.
- The street push (gap 1): one placeholder, on Commerce Street's first night entry.
- Bobby waits in the Clearing rather than going offstage from the Woods, so `follow` and `Bobby's location` always resolve.
- Probing a seeded imported story: unseeded `./sharpee play` diverged in Chapter 1's chase in two of three full runs; the deterministic route is skip cards under `./sharpee test --json --capture-output`.

## Open Items
- Chapter 6 (The Rooftops and Black Gate Estate) is next: it opens on Commerce Street by day (Book 8, `story.ni:8743`), with the rooftops Bobby named. The day-side west refusal on Commerce Street is Chapter 2's lay-low line; Chapter 6's ruling ("fear without teeth") decides what replaces it.
- The guards' clock length (forty turns), the warning slot, and the sewer-without-Olmer accident are reported in the plan for David's rulings.
- GH #356 (stallkeeper patience) still waits on David's ruling.
- David's lines: the street-push beats, the dawdle-chase hide beat, the two Bobby night trees, Rudup's tell at the fountain (kept as written).
- Uncommitted: all of the above is in the working tree, not committed (no commit was requested).

## Files Modified
- `branch-stories/secret-letter/night-journey.chord` (new), `branch-stories/secret-letter/jail.chord` (new)
- `branch-stories/secret-letter/{secret-letter.story, maiden-house.chord, commerce-street.chord, lords-market.chord, grubbers-market.chord, backdrops.chord, secret-letter.tests.json}`
- `docs/work/secret-letter-port/plan.md`

## Notes
- Session started: 2026-09-04 ~19:40 CDT (session 3222f9); session file written 21:40 CDT, updated after Chapter 5.
- Chord findings not filed (recorded in the plan): clause-body statements run sequentially and see their own changes; an action's `refuse` lines gate before its body regardless of order; `when … expires` cannot live in a trait; entity `on the player kicking` is refused (dispatch action → trait); `if.action.tasting` has no action; `move the player` narrates the destination now; "You can see Bobby here." lists at report time while markers render at final state.
