# Session Summary: 2026-07-18 02:30 — chord-foundations (session d02586)

## Goals
- Plan and start the doors (ADR-234) workstream — the last remaining pre-G4 chord-go-live line.

## Key decisions
- **ADR-237 written and ACCEPTED** (`docs/architecture/adrs/adr-237-loader-helpers-boundary.md`): David rejected the proposed `DoorBehavior.wireDoor` extraction as a hack and ruled `@sharpee/helpers` strictly author-facing. Six decisions: D1 boundary (no platform package depends on helpers), D2 unravel story-loader's dependency, D3 direct trait composition as the loader's construction path, D4 `connectRooms(room1Id, room2Id, direction, doorId?)` as the ONE exit-wiring implementation (door-side contract: throws on unknown id / non-door entity / mismatched pre-set room pair; owns the trait-vs-exits invariant; room1 placement included), D5 the unravel runs as the door plan's revised Phase 1, D6 one-time A/B world-state diff (throwaway) + standing suites as the parity proof. Interview resolved all four open questions (a/a/b/b); adr-review 12/15 pre-fix, D4 door-side contract folded in pre-flip.
- Door plan (`docs/work/chord-door-loading/plan.md`) revised accordingly; Phase 4's breaking-migration confirmation is the only remaining embedded stop-and-ask.
- **ADR-238 written and ACCEPTED** (`docs/architecture/adrs/adr-238-two-sided-door-presence.md`): a door is located in BOTH of its rooms — command scope (`default_door_visibility` core rule) and perception (`VisibilityBehavior` door case) — and ONLY the door: the far room and its contents never leak into scope through it. Records the Phase 3 gap discovery and David's ruling.

## Work log
- Recap + pre-session audit clean (tree clean, tsc clean, branch even with origin).
- session-planner wrote the ADR-234 implementation plan to `docs/work/chord-door-loading/plan.md` (5 phases; slug avoids collision with the pre-existing ADR-220 `docs/work/chord-doors/plan.md` — **naming-collision disposition still open with David**: rename vs archive the stale ADR-220 plan whose `between`-form foundation ADR-234 struck). plan-review: 2 advisory tensions only. `.current-plan` → chord-door-loading.
- **Phase 1 COMPLETE (ADR-237 implementation)**:
  - A/B parity harness (temporary `ab-world-parity.test.ts`): baseline captured twice (deterministic), 18 loadable chord fixtures serialized + 3 structural skips recorded.
  - world-model: `connectRooms` grew `doorId?` with the full D4 contract; `createDoor` delegates its wiring tail; `AuthorModel` pass-through updated. 8 new tests (`connect-rooms-door.test.ts`) incl. no-partial-wiring rejection assertions.
  - helpers: `DoorBuilder.build()` delegates wiring to `connectRooms`; new 2-test parity suite (`door-builder-parity.test.ts`) proves createDoor ≡ DoorBuilder state.
  - story-loader: `buildEntity` rebuilt on direct trait composition for all five kind branches; `createHelpers` import + `@sharpee/helpers` dependency removed (verified the only cross-package import repo-wide).
  - **A/B diff caught real drift**: the actor builder clobbered `IdentityTrait.article` ('a' default) to `undefined` (`properName ? '' : undefined` through `Object.assign`); person branch pins `article: undefined` to preserve loaded-world state exactly. **FLAG for David (pre-existing quirk, not resolved)**: should actors carry `article: undefined`, or is the builder's clobber a latent bug? Fixing it would change rendered text for every Chord person entity.
  - Final A/B: byte-identical across all fixtures. Harness + captures deleted per D6.
  - Gates: world-model 1378, helpers 6, story-loader 246 all green; `./repokit build`; cloak 81/81; zoo atomic 71/71 (gate is now all 7 transcript files) + chained 56/56 (gate is now wt-01…wt-07 — the memory saying wt-01…05 is stale).

- **Phase 2 COMPLETE (`through` exit-line sugar, D1–D3, R2)**: parser `through` tail (reserved word on exit destinations) → `ExitDecl.via`/`IRExit.via` (goldens additive-only, 12 × `"via": null`) → analyzer `checkDoors` + `door-placement` gate. Six diagnostics with rejection tests (`parse.exit-through`, `door-through-kind` — an implementation ADDITION beyond the ADR's four, noted in the ratchet row —, `door-multi-pair`, `door-pair-mismatch`, `door-unconnected`, `door-placement`). Loader: door composes Identity+Scenery+Openable(closed); DoorTrait attached at wiring (room1 = declaring room); `connectRooms(…, doorId)` once per door, mirror lines verified+skipped; rogue-IR backstops. Fixtures door-basic/door-redundant; 11 chord + 5 loader REAL-PATH tests incl. AC-1 identical-world comparison. R2 ratchet row appended. Suites: chord 332, story-loader 251; cloak 81/81 + zoo 71/71 & 56/56 re-run green.

- **Phase 3 COMPLETE (door defaults + action integration + save/restore)**: kind-scoped locked-by-default lockable on doors (override + non-door pins); `parse.exit-one-way-reserved` legible stub. **Platform gap found by AC-3's verified-live clause: no far-side door scope existed** (engine vocabulary-manager runs on `world.getInScope`; default rules were room-contents + inventory only). **David's ruling: a door is located in BOTH of its rooms — and only the door; the far room and its contents must never become referenceable through it** (the classic IF-platform gotcha). Landed as `default_door_visibility` core scope rule + `VisibilityBehavior` two-sided door case, with no-leak world-model pins. REAL-PATH AC-2/3/4 green (real going/examine/open/close/lock/unlock, save/restore) + full-parser transcript proof (close from the far room, 6/6 via bundle). Suites: world-model 1381, chord 333, story-loader 260, stdlib 1534; cloak + zoo gates green.

- Phases 1–3 committed 41f51170 (28 files) after ADR-238 was written (ACCEPTED — two-sided door presence, David's ruling).
- **Phase 4 COMPLETE (ratchet R3, breaking migration David-confirmed)**: keyless single-entity `with` config (`lockable with the iron key`); `with key/tool the …` → `parse.removed-config-keyword` + fix-it; carve-outs pinned (word-valued keyed configs, authored-trait named fields like `feedable with food …`); loader `entityConfigValue`; full fixture/story migration sweep to zero keyed usages (zoo.story included, cloak clean); zoo golden churn exactly key→''; R3 ratchet row appended. chord 338, story-loader 260, cloak + zoo gates green.

- **Phase 5 COMPLETE (closure) — ALL 5 DOOR PHASES DONE, workstream COMPLETE**: chord-grammar.md "Doors" section + R3 productions, chord.ebnf updated, zero stale keyed examples; R2/R3 rows verified; availability audit door/going rows closed and Part-1 count reconciled with the scoreboard (52 ✅ / 2 ⚠️ / 0 ❌ — the parity table's last ❌ construct is gone); elegance fixture `door-vignette.story` + REAL-PATH take→unlock→open→walk-through demo; full regression (chord 338, story-loader 261, world-model 1381, helpers 6, stdlib 1534, engine 513, repokit build, cloak 81/81, zoo 71/71+56/56). `.current-plan` back on chord-go-live; umbrella records the G1 door line closed — **no pre-G4 child workstreams remain**.

## Status: COMPLETE (all 5 door phases done; Phases 1–3 committed 41f51170, Phases 4–5 uncommitted)

## Next session
- Commit Phases 4–5.
- ADR-233 G1 door line CONFIRMED SATISFIED (David, this session) — amendment note recorded in the ADR itself. No open flags remain from the door workstream.
- ADR-220 plan disposition RULED (David, this session): **archived** to `docs/work/archive/chord-doors/plan.md` with an archival header (ADR-220 stays ACCEPTED; future pickup = fresh plan on the `through` surface). Archive move uncommitted.
- With all G1 child workstreams closed, the umbrella's next queued phases (Phase 6+, toward G4 release) are the natural continuation.
- Open items for David: (1) actor `article: undefined` quirk above; (2) ADR-220 plan file disposition (rename vs archive).
- Still parked (unchanged): chain RNG-death flake investigation; troll-GDT ruling remains CLOSED — do not re-flag.
