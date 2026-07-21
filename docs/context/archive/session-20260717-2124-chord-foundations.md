# Session Summary: 2026-07-17 21:24 — chord-foundations (session 615882)

## Goals
- Execute chord-go-live plan Phase 3: G1 mechanical shortlist — per-item sign-off or rule-out with David, then close signed-off items via the ADR-210 ratchet.

## Key decisions
- **David signed off CLOSE on all 7 shortlist items** (two AskUserQuestion batches, per-item per G1's no-silent-deferral rule): D1 pushable/pullable, drinkable, concealed, hiding-spot, bare cut/dig grammar, D3 openable tool, turning lifecycle row.
- Design calls within the sign-off latitude, recorded in ratchet entries G1–G4: `drinkable` merges order-independently with `edible`; `concealed` is a marker (plural-style); `hiding-spot` bare = all four positions + quality `good`, `with position <word>` narrows to one (multi-position/quality config deferred, not guessed); openable tool uses the cuttable pending-ref precedent; turning rewrote cutting-style (dual surface, no eligibility trait) rather than staying a factory action.

## Work log
- Recap + pre-session audit: all clear.
- Implemented all 7 closures: catalog (3 new adjectives), loader (6 new/changed cases), parser-en-us (bare cut/slice/chop + dig via forAction), stdlib turning rewrite (turning.ts cutting-style + turning-messages.ts + turningLifecycle registry row, registry test 37→38).
- Tests: new story-loader quickwin-adjectives.test.ts (12 tests, incl. REAL-PATH `on turning it` driving stdlib turningAction with a world-state assertion). Suites green: stdlib 1530, story-loader 187, parser-en-us 271, chord 257.
- E2E: `./repokit build` green; cloak gate green (bar-darkness transcript lint warnings pre-existing); zoo atomic + chained walkthrough legs green; dungeo unit suite at known baseline — the 16 varying failures are the documented troll-GDT combat-RNG flake class (surfaced 2026-07-16, decision still open with David), dam-puzzle (turn bolt) green.
- Ratchet log: entries G1–G4 + a recorded-closures entry (D1, bare grammar, turning) dated 2026-07-17.
- Audit updated in place: Part 1 now **50 ✅ / 4 ⚠️ / 0 ❌**; D1/D3 marked FIXED (D3's broader analyzer config-key validation gap noted as still open); D2 note updated (turning re-routed; hatch still dead → Phase 5).
- Mutation-verification: 1 warning — turning's capability-behavior branch untested (only the interceptor surface had coverage). Fixed per rule 14: new stdlib tests/unit/actions/turning.test.ts (4 tests, cutting.test.ts template — capability mutation, behavior veto, interceptor surface, no-implementation refusal; all state-asserting). stdlib suite now 1534.
- Plan Phase 3 → COMPLETE.

## Phase 4 (same session, post-commit eea9109d)
- **ADR-234 drafted** (docs/architecture/adrs/adr-234-chord-door-loading.md, DRAFT, 3 open questions) — door loading per Q-1: Form A `between the Kitchen and the Hall` on the door + Form B `north to the Hall through the oak door` exit sugar; direction never guessed (D2: between requires a connecting exit line); consistency gates D3; defaults mirror createDoor with the lockable-default divergence flagged (trait default unlocked wins); D5 one-wiring-path seam (`wireDoor` extraction); ratchet entries R1-R3 carried (R3 = `lockable with the iron key`, keyed form becomes parse error); AC-1..6 for the follow-on plan.
- Code grounding: DoorTrait/DoorBehavior/createDoor (wires via both sides, places door room1, but defaults isLocked??true — diverges from LockableTrait.startsLocked=false), connectRooms already bidirectional (reverse-inference precedent), helpers DoorBuilder already speaks `.between(room1, room2, dir)` (elegance parity), going.ts via-branches dead from Chord today.
- ADR-233 G1 door line now links ADR-234.
- **Interview complete (all 4 questions ruled by David)**: (pre-interview ruling) `between` placement form STRUCK — "leaves too much inferred (directions)"; ONE form ships: exit-line sugar, reverse = opposite direction; ADR-233 Q-1 text amended with the supersession. Lockable doors assumed LOCKED (kind-scoped default vs trait default unlocked; createDoor parity now intentional). Q-4: override = existing `starts unlocked` (no bare-state-word form). Q-1: auto-openable (scenery + openable starts closed; open passage = plain exit). Q-2: keyless `with` is UNIFORM — every single-entity config drops its keyword in R3 (`cuttable with the knife`); keyed forms retire with fix-its; word-valued configs keep keywords. Q-3: `, one-way` exit-line modifier RESERVED (doors + plain exits; parse error until its own entry lands).
- adr-review: 15/16, verdict READY after fixes — Open Questions section deleted per the shared contract (folds live in D-sections), "opposite cardinal" → "opposite direction" (all axes), AC-4's "AC-6 class" disambiguated.
- **ADR-234 ACCEPTED** (David: "accepted"). ADR-233 G1 link updated; plan Phase 4 → COMPLETE. Door implementation is a follow-on plan, not part of chord-go-live.

## Phase 5 (same session)
- **Key discovery**: the extension-surface design already exists — ADR-215 (use surface, manifests, combat spelling, NPC auto-wire, trusted registry/pure-IR, channel-renderer leg) and ADR-216 (emit payload/media) are both ACCEPTED 2026-07-14 with zero implementation. Re-drafting would re-litigate six resolved questions.
- **ADR-235 drafted** (adr-235-extension-surface-golive-disposition.md, DRAFT, 3 open questions): adopts ADR-215/216 unchanged (D1); D2 recommends REMOVING the dead behavior hatch (audit D2 — declaration carries no trait/action binding key, structurally could never fire; fix-it points at in-language define trait / define action hatch); D3 defines implementation slices S0 (none — ADRs + follow-on plan) → S1 (`use` + combat) → S2 (+NPC auto-wire) → S3 (+ADR-216 emit/channels) for David's gate ruling; D4 records adjacent non-goals (story-global daemons, topic surface, scheduler imperative gaps, third-party extensions).
- ADR-233 G1 extension line now links ADR-235.
- **Interview complete (all 3 ruled by David)**: Q-1 behavior hatch REMOVED (parse error + fix-its; boundBehaviors deleted; ratchet entry). Q-2 gate slice = **S3 — the FULL ADR-215/216 design implemented before launch** (use+combat, NPC auto-wire, state-machine depth, emit/media/channels). Q-3 evolved: David corrected my over-fold ("there is no story-level daemon" was descriptive, not a ban — memory saved: descriptive-not-prohibitive); direction = **AREAS** (Chord surface for the shipped ADR-149 region system — named room lists, nesting, ambient data — plus daemon attachment; story-level daemons stay open); ruled **in-gate, design AND implementation** via its own child ADR + plan.
- ADR-233 G1 amended with the three rulings; plan Phase 5 updated. Two new launch workstreams: ADR-215/216 implementation plan + areas child ADR (+ implementation plan), both before G4.
- **ADR-235 ACCEPTED** (David: "accept"; adr-review 14/14 pre-flip). Plan Phase 5 → COMPLETE. G1's design-heavy remainder fully dispositioned: mechanical shortlist closed (Phase 3), doors ADR-234 ACCEPTED (Phase 4), extension surface ADR-235 ACCEPTED (Phase 5).

## Status: COMPLETE

## Next session
- Remaining ⚠️ rows are all design-heavy, already phased: going/doors (Phase 4 child ADR), asking/telling topic surface + attacking systemic combat (Phase 5 extension-surface child ADR), Phase 6 U2, Phase 7 tutorial catalog.
- Troll-GDT unit-transcript RNG flake decision (2026-07-16 session) still awaits David's ruling.
- Nothing committed yet this session.
