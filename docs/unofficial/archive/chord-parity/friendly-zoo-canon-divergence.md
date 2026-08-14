# Friendly-Zoo — Canon (TS) vs Chord Divergence Inventory

**Date:** 2026-07-14
**Status:** DRAFT for review — read-only analysis, no code changed.

**Premise (David, 2026-07-14):** the original Sharpee **TypeScript** friendly-zoo
(`stories/friendly-zoo/src/*.ts`) is **canon**. The Chord port
(`stories/friendly-zoo/zoo.story`) must reproduce it feature-for-feature. Where
Chord *can't*, that is a Chord platform gap to raise (ADR-214), never a reason to
reduce the canon. Long-term target: a Chord implementation of Mainframe Zork, so
no canon feature is optional.

## Classification legend

- **MATCH** — Chord reproduces the canon feature (parity holds).
- **PORT-GAP** — Chord *can* express it; `zoo.story` just didn't. Fix the port.
- **PLATFORM-GAP** — Chord *cannot* currently express it → ADR-214 platform work.
  (Marked **⟨verify⟩** where I still need to confirm Chord truly can't.)
- **DECISION** — a genuine behavioral divergence where "match canon" would change
  observable behavior; needs David's call on what canon actually is.
- **CHORD-EXCEEDS** — Chord is *richer* than canon; needs a direction call
  (canon gains it, or Chord drops it).

---

## The three headline PLATFORM-GAP candidates

### G1. Automated NPC movement / patrol — PLATFORM-GAP ⟨verify⟩
- **Canon:** the zookeeper is an NPC that **patrols** `[Main Path → Petting Zoo →
  Aviary]` on a loop, `waitTurns: 1`, `canMove: true`, movement announced —
  `createPatrolBehavior` from the NPC plugin (`index.ts:357-363`,
  `characters.ts:140-145`). A deliberate NPC-automation teaching demo.
- **Chord:** the keeper is **stationary**; its only movement is a single
  after-hours relocation to the Staff Parking Lot (`zoo.story:572-581`). No
  patrol / roaming construct anywhere in `zoo.story`.
- **Why platform, not port:** per the "access not implementation" parity rule,
  Chord should *expose* the NPC plugin's patrol behavior (ADR-070/071), not force
  authors to hand-roll a route state machine out of `on every turn` + `move`.
  There is no Chord surface for "attach a patrol/automation behavior to an NPC."
- **Verify:** confirm there is no `use`-extension or vocabulary path to the NPC
  plugin's movement behaviors before declaring the gap.

### G2. Penny-press machine — runtime entity transform — PLATFORM-GAP ⟨verify⟩
- **Canon:** `put penny in press` → **creates a new `pressed penny` entity**,
  moves it to the player, awards 10, narrates "CLUNK! CRUNCH! WHIRRR!"
  (`index.ts:452-462`, `if.event.put_in` chain).
- **Chord:** the souvenir press is inert `scenery` container; no action, no
  transform, no score (`zoo.story:416-423`).
- **Why platform:** needs (a) a reaction to *putting an item into a container*
  and (b) **runtime entity creation/transform**. Chord can `move` and `remove`
  (Z6) entities but I have found no runtime *create/transform*. A partial port may
  be possible (pre-declare an off-stage `pressed penny`, `move` it in + `remove`
  the raw penny) **if** Chord can react to `put_in`.
- **Verify:** (a) can a Chord clause fire on "item put into a container"? (b) is
  there any runtime entity-creation, or only pre-declared move/remove?

### G3. Score-threshold win trigger — PLATFORM-GAP ⟨verify⟩
- **Canon:** a victory daemon fires when `score >= MAX_SCORE` (100), setting
  `game.victory`/`game.ended` and emitting the win (`events.ts:140-159`).
- **Chord:** the `victory` message body exists (`zoo.story:780-787`) but the
  extraction found **no numeric win-trigger clause** wiring it to the score.
- **Verify:** does Chord support `win when score is <max>` (or equivalent)? If
  not, that's the gap; if yes, it's a PORT-GAP (add the clause).

---

## Category-by-category divergences

### Scoring (canon MAX = 100; Chord sum = 85)
Canon 100 = Chord's 85 **+ two scores Chord lacks**:
- **Pet scoring (5)** — canon awards `PET_ANIMAL` 5 once for petting *any* animal
  (`scoring.ts:59`, `index.ts:158`). Chord scores no petting. **PORT-GAP** —
  expressible, though Chord's owner-scoped scores make "5 once for anything"
  mildly awkward (needs a single shared pet score).
- **Pressed-penny (10)** — part of **G2** above. **PLATFORM-GAP ⟨verify⟩**.
- Everything else matches: visits 5×5, feed goats/rabbits 10 each, map 5, read 5,
  photo/snapshot 5, after-hours confessions 4×5, keeper farewell 5. **MATCH.**

### Characters & NPCs
- Zookeeper patrol → **G1 (PLATFORM-GAP)**.
- Parrot day/after-hours split: canon swaps NPC behavior at runtime (chance 0.5 /
  0.6); Chord uses `chatty while not after-hours` / `candid while after-hours`
  (1-in-2). **MATCH** (declarative equivalent; minor probability nuance).
- Pettable goats/rabbits/parrot, "CHOMP! NO TOUCHING!" parrot bite, presence/
  "here" lines. **MATCH.**

### Scheduler / timeline
- PA announcements (turns 5/10/15/20) and feeding-time bells (first at 11, every
  8 → 19/27…). **MATCH** (Chord caps bells at 4: 11/19/27/35 vs canon's infinite
  repeat — negligible).
- **Goat hunger / bleating model — DECISION.** Canon = a **3-turn bleat window**
  after each bell (`feeding_time_active` + `bleat_turns_remaining`, `events.ts:107-133`);
  goats have no persistent hunger. Chord = a **persistent `hungry`/`content`
  state** (goats start hungry, bleat every turn until fed, each bell re-hungers)
  via the `restless`/`feedable` traits (`zoo.story:476-519`). These produce
  *different* observable behavior. Chord's is arguably the richer model — but
  canon-first says match canon. **Needs your call on which is canonical.** (Note:
  the frozen `timeline.transcript` encodes Chord's version, not canon's.)

### After-hours phase
- Trigger (turn 20 → after-hours), zoo-closes, animal candid confessions, parrot
  behavior change. **MATCH.**
- **Keeper departure — DECISION.** Canon removes the keeper **unconditionally**
  once after-hours begins (turn ~20); only the 5-pt bonus is co-location-gated
  (`events.ts:179-214`). Chord's `on every turn while after-hours, once`
  (`zoo.story:572`) is **presence-gated by D11** (fires only when the player is in
  the keeper's room; `,once` not consumed off-stage) → departs *witnessed*, later.
  Match-canon would mean re-authoring as a story-owned **sequence** (which
  broadcasts regardless of location — expressible, so **PORT-GAP** *if* you want
  canon's unconditional behavior). **Needs your call** (the transcript encodes
  Chord's witnessed version).

### Items / world / map
- Rooms, exits, `connectRooms`, staff gate (door + `openable` + `lockable with
  key`), darkness (nocturnal only), flashlight/radio detail slots, brochure/map/
  feed/keycard/backpack/bench/lunchbox/juice, scenery + readables. **MATCH.**
- **Goats-eat-feed drop reaction** — canon: dropping feed in the Petting Zoo
  triggers a goats-react flavor line (`index.ts:444-450`, no score). Chord has no
  equivalent drop reaction. **PORT-GAP** (minor; verify Chord has an
  `after dropping`-style room/item reaction).

### Dynamic text / hatches
- Gift-shop `{pins}` cycling snippet, parrot `{flavor}{aside}` (via
  `chord-extras.ts` hatch), gate open/closed examine text, first-visit entrance
  description (already added to `zoo.story`). **MATCH.**

### CHORD-EXCEEDS canon (reconcile direction)
- **Snake** — Chord has a **real snake entity** in the Nocturnal exhibit with a
  `confession worth 5` and after-hours confession (`zoo.story:249-266`). Canon has
  **no snake entity** — only a room-name-matched after-hours line, and an unused
  `PET_SNAKE` id (`events.ts:258`, `language.ts:38`). Under canon-first the source
  of truth lacks the entity — **decision:** canon gains a real snake, or Chord
  drops it? (Chord's is the nicer design.)
- **Blocked-passage message** — Chord's explicit `staff-gate-blocked` line vs
  canon's default door-closed handling. Chord nicer; negligible.

---

## Summary for re-planning

| # | Item | Class | Needs |
|---|------|-------|-------|
| G1 | NPC patrol / automated movement | PLATFORM-GAP ⟨verify⟩ | ADR-214 (expose NPC-plugin movement to Chord) |
| G2 | Penny-press runtime entity transform | PLATFORM-GAP ⟨verify⟩ | verify put-in reaction + entity create/transform |
| G3 | Score-threshold win trigger | PLATFORM-GAP ⟨verify⟩ | verify `win when score …` |
| S1 | Pet scoring (+5) | PORT-GAP | add shared pet score to `zoo.story` |
| S2 | Goats-eat-feed drop reaction | PORT-GAP | verify drop-reaction clause |
| D1 | Goat hunger model (3-turn window vs persistent) | DECISION | which is canon? |
| D2 | Keeper departure (unconditional vs witnessed) | DECISION | which is canon? |
| X1 | Snake entity (Chord-only) | CHORD-EXCEEDS | canon gains it, or Chord drops it? |

**Also:** the frozen transcripts (`scoring` at 85, `timeline`'s witnessed keeper +
persistent-hunger) encode the *Chord* build, not canon. Once canon-vs-Chord is
settled, the transcripts likely need re-baselining to canon — that reverses a
prior David sign-off, so it's a your-call item, not a silent edit.
