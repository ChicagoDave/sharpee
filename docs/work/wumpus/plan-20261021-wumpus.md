# Session Plan: Wumpus Caves, a third `use expanses` exerciser

**Created**: 2026-10-21
**Plan Status**: DONE
**Overall scope**: Hunt the Wumpus written in Chord at branch-stories/wumpus/ (wumpus.story, wumpus.config.json with a fresh ifid, wumpus.claims.chord, wumpus.tests/ with manifest seed 42), a dedicated test story like branch-stories/upps. Story-level only; any `packages/` change is discussed with David first.
**Bounded contexts touched**: Chord story language (expanse, open vehicle, define action, kill/win/lose), branch-tester tree documents. No platform code.
**Key domain language**: expanse, landmark, drift, sight bands (close by / in the distance / on the horizon), open vehicle, `seen from afar`, `floats`

## References consulted
- `docs/architecture/adrs/adr-376-expanses-extend-the-vehicle.md` (technical) — the whole expanse vocabulary (D2 block, D3 open vehicle and arrival on a landmark cell, D6 sight bands and sight-as-scope, D7 sight conditions, D8 edges, D9 leaving the vehicle, D10 floating things drift); the story may use only this surface.
- `docs/context/project-profile.md` — stack and conventions; Chord stories are tested by tree documents under branch-tester, run with `./sharpee test`.
- `docs/context/session-20261020-2310-chord-4-0.md` — newest session; Chord 4.0 plan DONE, archive blocked by GH #611; nothing blocks a story.
- `docs/work/chord-4-0/alignment-audit-20261021.md` — line 155 lists this story as the not-ready item to update when done.
- Product ADRs not consulted (no Scope intersection): none of `product` kind apply to `branch-stories/wumpus` or `docs/work/`.

## Phases

### Phase 1: Wumpus Caves story compiles
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Chord authoring: expanse with landmarks, coracle (open vehicle), Wumpus (floating thing), `shooting` action, pit/eaten/bat rules, win/lose endings
- **Entry state**: Chord 4.0 plan DONE; stories/expanses and branch-stories/upps readable as idiom references; no branch-stories/wumpus
- **Deliverable**: branch-stories/wumpus/wumpus.story and wumpus.config.json (fresh `uuidgen` ifid); plain comments only, no ADR references in the story
- **Exit state**: `./sharpee build` of the story reports no diagnostics
- **Demonstration**: run `./sharpee build` on branch-stories/wumpus/wumpus.story; it must exit clean with zero diagnostics
- **Demonstrated**: 2026-10-21 — `./sharpee compose branch-stories/wumpus/wumpus.story` printed "loaded — 11 entities, 0 trait(s), 1 action(s)" with no diagnostics (one earlier `parse.comment-inside-block` error fixed by moving the header comment below the story block); `./sharpee build branch-stories/wumpus/wumpus.story` printed "Build complete! (game.js 1633.4 KB)" to dist/web/wumpus/. [verified: both commands run this session]
- **Status**: DONE

### Phase 2: Probe the uncertain mechanics
- **Tier**: Medium
- **Budget**: ~250 tool calls
- **Domain focus**: Runtime behavior of three unknowns: pit death on arrival at a landmark (`is at` rule versus `deadly:` versus an entering clause), bat relocation (`move` of an open vehicle to a landmark room), Wumpus drift and eaten timing
- **Entry state**: Phase 1 DONE; story builds
- **Deliverable**: story adjusted to whichever form works; a findings note in docs/work/wumpus/ recording each probe and its result; any platform gap filed as a GH issue (devarch label when DevArch's, plain otherwise) and reported to David, never fixed in `packages/`
- **Exit state**: each of the three mechanics behaves as designed or has a filed finding and a story-level workaround David has seen
- **Demonstration**: `./sharpee play` sessions (not the bundle `--exec`, GH #352) reaching a pit, a bat roost and an eaten death; each must show the designed outcome or the recorded finding
- **Demonstrated**: 2026-10-21 — piped `./sharpee play branch-stories/wumpus` runs and seed-42 probe cards through `./sharpee test branch-stories/wumpus --json --capture-output` (docs/work/wumpus/probes-20261021.md, P1–P8): the pit kills one turn after "The coracle arrives at the Bottomless Pit."; the bat roost's `select randomly` arm moved the coracle (Dripping Gallery / Echo Chamber unseeded, Bone Hollow at seed 42) and it steers on from there; the Wumpus's step into close-by printed `eaten` the same turn; after the story change to `sight: 6` and the in-the-distance hit band, the seed-42 hunt wins on one arrow. Two platform gaps filed, not fixed: GH #612 (a landmark room's `sight:` outlook is lost aboard the vehicle — `lookoutOf` returns undefined) and GH #613 (`the player's <counter>` compiles but fails at runtime; story uses `the Hunter's arrows`). [verified: every run quoted in the probes note was executed this session]
- **Status**: DONE

### Phase 3: Pin the tests and close the audit line
- **Tier**: Small
- **Budget**: ~100 tool calls
- **Domain focus**: branch-tester tree document at seed 42; claims fragment
- **Entry state**: Phase 2 DONE; story behavior settled
- **Deliverable**: wumpus.tests/ tree with manifest (seed 42) and at least a winning hunt, a pit death and an edge refusal, all derived by probing; wumpus.claims.chord locking the start state, the out-of-sight shot refusal, the win and the pit death; the audit's not-ready line updated
- **Exit state**: `./sharpee test` on the story is green; claims hold; audit line reflects the story
- **Demonstration**: run `./sharpee test` on branch-stories/wumpus; it must report all runs passing and all claims held
- **Demonstrated**: 2026-10-21 — `./sharpee test branch-stories/wumpus` (seed 42, 6 lines: shore/arrows, hunt, win, eaten, pit, edge, bats): "37 cards passing, 70 assertions passing", "Endings reached: 4 / 4", "claims: 4 of 4 held (seed 42)", every lock "held there" (the Wumpus can be slain at wumpeast turn 9; the coracle reaches the Bottomless Pit at wumppitt turn 4; the hunt can be lost at wumppitt turn 5; the bats carry the coracle to the Bone Hollow at wumpbats turn 11). The audit's line 155 in docs/work/chord-4-0/alignment-audit-20261021.md is struck through and replaced with the story's record. [verified: run this session after the last tree and claims edit]
- **Status**: DONE
