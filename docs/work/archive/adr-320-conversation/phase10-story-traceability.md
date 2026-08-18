# Phase 10 — The Ides of March: construct-to-beat traceability

**Story**: `stories/ides-of-march/` (Chord, `chord/ides-of-march.story`) —
the ADR-320 theatre-company demonstration vehicle specified in
`theatre-story-task.md` (Phase 2, CONFIRMED).
**Authored**: 2026-08-17, session 13a3e0. Content authority: David,
"you have content control since this is test material" (2026-08-17).
**Run**: everything through the bundle —
`node dist/cli/sharpee.js --test --story stories/ides-of-march/chord/ides-of-march.story <transcripts>`.
The plan's `./repokit build <slug>` phrasing assumed a TS-story shape;
the vehicle is Chord-only like `thealderman`/`character-acceptance`
(no `package.json`, nothing to build — the bundle compiles the story
at load). Recorded as a deliberate deviation, not a gap.

## Evidence (2026-08-17)

- Unit suite: **132 passing** across 11 transcripts
  (`tests/transcripts/`): smoke, first-day, boundaries, wire,
  interruption, cornered, unmasked, claims-return, earshot-effects,
  mid-exchange-save + mid-exchange-restore (chained pair).
- Walkthrough: **34 passing** — `walkthroughs/wt-01-the-errand.transcript`,
  the whole three-day arc played to the win through the bundle.
- All at pinned seed 42; story files carry plain story language, no ADR
  references (David's standing rule).

## Beat table → transcript map

| Phase 2 beat (construct) | Where it lives in the story | Exercised by |
|---|---|---|
| First meetings / re-approach across days (AC1, AC4) | `define greetings` for all three principals: first-time, return, `again so soon`, `after days`, leaving rows | first-day (first-time ×3), boundaries (again-so-soon, after-days), wt-01 |
| Pointed identity question demands an answer (AC2) | `define exchange who-are-you for Richard Burbage, blocking`, opened from his first-time greeting; same-key topic row proves overlay-wins; close proves fall-through | first-day (grip wins over table row, then table serves after close), wire |
| Declared delivery styles; same answers sound different (AC3) | `define manner` ×3 (beat rotation + `voice` words: flat/iron/low); mood shift cheerful→stung on the blow-up | wire (beats on scene-channel utterances); blow-up mood flip in wt-01 |
| Time words through the one clock seam (AC4) | Absence: greeting rows (`again so soon` / `after days`). Recency: `refuse when the-blow-up is fresh/recent` on Kemp's rose topic — pressing too soon vs after cooling | boundaries; wt-01 ("Not NOW, friend" then the served offer) |
| Initiative by disposition; authored rows force moments; humiliation silences even Kemp (AC5) | Kemp `on an open floor` interject row; Burbage `on harm` forcing row; Kemp stung → `hold their tongue`; Shakespeare `on an open floor: hold their tongue` | interruption ("NOT on these boards"); suppression is the stung tavern scenes in wt-01 |
| Run-through holds the stage until something talk cannot ignore (AC6) | Burbage's `run-the-lines` goal (say-steps to the hired man); who-are-you `blocking`; witnessed harm breaks any grip | interruption (blocking grip broken by the attack, table serves after) |
| Cornered; silence always an answer; who cannot storm out doesn't (AC7) | The plain-question exchange; `leave` on the jest answer — legal through the open door, refused whole behind the locked tiring-house door (default evasion stands) | cornered (both legs) |
| NPC↔NPC scenes, observable-only, effects land (AC8) | Burbage seeks Kemp (day-2 blow-up as propagation transfer + authored beat); Shakespeare's `confer-on-kemp` goal-say; earshot grades by acoustic path | earshot-effects (blow-up witnessed same-room; the unheard confer read afterward in Burbage's `when it knows no-clown-part` answer), wt-01; fragments-tier lines observed from the Tavern during probes |
| Player claims travel; contradiction comes back (AC9) | `tell burbage about norwich` (statement site) → Burbage `spreads … norwich to trusted` → Kemp's `when it knows norwich` rows (comeback + sees-through offer variant) | claims-return (the full chain, contradiction in Kemp's voice), first-day (idle variant before travel) |
| Threading — was discussed, subject-change noticing (AC10) | Offer gated `when the grievance was discussed`; Shakespeare's steered book row `when the subject changes` | wt-01 (grievance → offer), first-day ("You steer") |
| Wire affordances consumed (AC11) | Any open exchange; `scene` + `exchange-affordances` channels | wire ([CHANNEL:] asserts: opened, rowIds, answers, the inalienable silence, clear-on-close) |
| Mid-scene save/restore (AC12) | `$save`/`$restore` mid-plain-question | mid-exchange-save + mid-exchange-restore |
| Whole arc to a win via the bundle (AC13) | Three days, both objectives at the reckoning, `win`/`lose` resolution in the lodging | wt-01-the-errand |

## Authoring findings that shaped the story (platform issues filed)

- **#273** — initiative-row `then asks` hard-errors and wedges the engine
  when the occasion fires on the tick-side seize path. Story workaround:
  exchanges open from topic rows, never from initiative bodies.
- **#274** — `win`/`lose` ending phrase renders twice in CLI output
  (pre-existing; thealderman reproduces it). Transcript asserts use
  `contains`, insensitive to it.
- **#275** — subject-change initiative occasions never fire for
  player-dialogue scenes (clock-mirror off-by-one). Story workaround:
  the condition form (`phrase … when the subject changes` on a topic
  row), which evaluates action-side and works.

## Authoring lessons (for the Phase 11 audit and future stories)

- **One live scene per participant, and scenes outlive the room.** A
  player scene decays ~4 turns after its last move; addressing a new
  principal before the old scene closes silently serves greetings with
  no scene (no exchange can open, no thread conditions hold). Every
  transcript inserts decay gaps between principals.
- **An authored `on silence` initiative row is a scene-immortalizer**:
  the seizure is a move, so the row re-arms every decay window and the
  scene never closes (which then blocks every later scene — see above).
  Kemp's silence row was removed for exactly this.
- **Act occasions match categories, not action names**: `on steal:` /
  `on harm:` (detectable acts), never `on taking:`. Taking from the
  floor is not a detectable act; NPC-carried items are out of player
  scope, so `steal` is not exercisable by a story today — `harm` is.
- **Claims tags on exchange-row phrases pin the NPC owner**, not the
  player; the player's claims ride TELL (the statement site). The cover
  story is a TELL, and its travel is ordinary propagation.
- **`leave` closes the scene (exit-legality-gated) but never moves the
  NPC**; the refused leg withholds the whole row and the action default
  stands. A lockable door on a one-exit room is the authorable way to
  produce the refusal.
- **Room-entry day machinery must declare later days first** —
  `after entering` handlers run in declaration order and each reads the
  state its predecessor just wrote (the one-visit-three-nights cascade).
- **Story-state (`states:` on the story header) + `select on its state`**
  is the clean mutually-exclusive endgame idiom (`win`/`lose` arms).
