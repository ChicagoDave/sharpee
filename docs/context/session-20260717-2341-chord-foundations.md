# Session Summary: 2026-07-17 23:41 — chord-foundations (session 501cac)

## Goals
- Close out the recurring "troll-GDT combat-RNG flake ruling" open item (flagged 3+ sessions running).

## Key decisions
- **Troll-GDT flake ruling CLOSED (David confirmed)**: the ruling was already made 2026-07-16 (session 0402) — option (b): canon troll melee RNG stays; troll-family transcripts (`troll-combat`, `troll-blocking`, `troll-recovery`, `troll-visibility`, `troll-interactions`, `debug-combat`) fall under the one-good-run rule with the accepted flake signature (villain_attack kill → game.ended → "Engine is not running" cascade). The `one-good-run-rule` memory already records this. The "still awaits ruling" lines in sessions 1befbd/615882/d2863f were stale carry-forwards, not a live question.
- **Attribution question DROPPED as moot** (David): the pending pre-existing-vs-ADR-231-worsened flake-rate baseline comparison (session 1befbd, left running and never recorded) is not needed — failures are verified canon behavior and the ruling stands regardless of rate.

## Work log
- Recap + pre-session audit: all clear (tsc clean, tree clean, branch even with origin); audit flagged troll-GDT ruling + parked chain RNG-death investigation as recurrences.
- Verified current reality with two runs of all 7 troll-family transcripts against the current bundle (built 21:37, post-eea9109d): run 1 flaked troll-recovery + debug-combat; run 2 flaked troll-recovery (9) + troll-interactions (4). Every failure matched the accepted signature (kill → "Engine is not running" cascade); every transcript achieved a clean run across the two attempts except troll-recovery (one-good-run applies). Nothing failed outside the signature — no new regression class.

## Regions workstream (same session, continuing into 2026-07-18)
- session-planner wrote docs/work/chord-regions/plan.md (5 phases; .current-plan repointed from the chord-go-live umbrella); plan-review clean (1 advisory: ADR-149 still DRAFT though shipped — Phase 5 corrects it with David's confirmation).
- **Phase 1 (D1–D3) COMPLETE, David's go**: `region` kind noun (KIND_NOUNS, ratchet R1) + `containing <name list>` body line (R2, additive, Oxford `and`) through parser (`parseNameRefList`) → AST → IR (`IREntity.containing: IRContainedMember[]`, additive field) → analyzer (`checkRegions` global pass). Loader: pass-0 regions in parent-first topo order, `world.createRegion('rg-<slug>', {name, parentRegionId})` + pass-2 `world.assignRoom` (RoomTrait.regionId never touched directly — D1 invariant); IdentityTrait carries aka/description (composability).
- Gates (all with named diagnostics + rejection tests): unknown-entity, region-member-kind, region-double-membership (incl. ancestor+descendant and same-list-twice), region-two-parents, region-memberless (hard, no warning tier), region-cycle (incl. self-containment), region-placement (in/on/starts-in), region-containing-host (containing on non-region).
- Tests: chord 17 new (fixture region-nesting.story), story-loader 8 new REAL-PATH (world-state assertions: regionId, parentRegionId, isInRegion transitivity, player-through-room resolution, declaration-order independence, rogue-IR cycle LoadError). Suites green: chord 274, story-loader 195. 10 IR golden snapshots refreshed (verified additive `containing: []` churn only, 91 insertions).
- Ratchet rows R1/R2 appended to chord-grammar-changes.md (approval = ADR-236 acceptance, D9).

- **Phase 2 (D4) COMPLETE**: one runtime change — `playerPresentAt` region branch (`isInRegion`, transitive); entity every-turn lowering reused unchanged. 4 REAL-PATH tests (real goingAction movement; per-tick narrated-event assertions incl. off-stage `, once` non-consumption).
- **Phase 3 (D6, R3) COMPLETE**: `leaving` joined EVENT_VERBS; `REGION_EVENT_TRIGGERS` (entering→region_entered, leaving→region_exited) + `crossingRegionId` guard; runtime routes event clauses by owner kind, region clause fires only for its own boundary (emitter crossing-accuracy), `leaving` on non-region = LoadError. 7 REAL-PATH tests (all four AC-5 scenarios). R3 row appended; chord.ebnf + chord-grammar.md updated (containing production, region clause homes, event-verb reading).
- **Phase 4 (D7, R4) COMPLETE**: story header hosts `on every turn` (`parse.story-clause` gates other forms); `StoryIR.story.onClauses` (broadcast); STORY_SCOPE makes `it`/`its` → `analysis.story-clause-it`; runtime story-turn daemon, NO presence gate. 6 chord + 4 loader REAL-PATH tests. R4 row appended; header production documented in both references.
- **Phase 5 (AC-7) COMPLETE**: R1–R4 rows verified (4/4); elegance-parity fixture `region-forest.story` + REAL-PATH demo test green (forest weather = region + containing + chance-gated daemon + both crossings — no room-ID set, no name heuristic); **ADR-149 flipped DRAFT → ACCEPTED (David confirmed)**; full regression green: chord 280, story-loader 211, stdlib 1534, `./repokit build`, cloak 81/81, zoo atomic 71/71 + chained 56/56 (chord stories run via `--story <file>.story`).
- Snapshot churn across Phases 1+4: chord IR/AST goldens refreshed twice, verified additive-only (`containing: []`, `onClauses: []`).
- **ALL 5 REGIONS PHASES DONE** — chord-regions workstream complete; `.current-plan` returned to chord-go-live umbrella; umbrella Phase 5 note records the G1 regions line closed.

## Extension-surface workstream opened (same session)
- David chose ONE combined plan for ADR-215+216; session-planner wrote docs/work/chord-extension-surface/plan.md (7 phases on the ADR-235 D3 S1→S3 backbone; plan-review clean, 8 references). Grounding: NpcPlugin/StateMachinePlugin/CombatantTrait/WeaponTrait/media+channel system all fully built platform-side — the work is chord grammar + loader wiring. Two embedded stop-and-ask points: Phase 3 state-machine-depth spellings, Phase 6 custom-channel spelling (both need David's ratchet sign-off before parser code). Pinned: manifests live in packages/chord as pure data (names half), mappings + conformance test in story-loader; `client has` binds to REAL ClientCapabilities flags (ADR's `layers` flag doesn't exist).
- Platform-alignment assessment (David asked): no platform redesign needed; four named touch-points — trait field-enumeration consts for conformance, story-loader deps on plugin-npc/plugin-state-machine/basic-combat, a possible capability-read seam for `client has` (raise if missing, don't bridge), the extension renderer leg only if a novel renderer is actually needed.
- `.current-plan` → docs/work/chord-extension-surface/plan.md (Phase 1 CURRENT).

## Status: COMPLETE (regions shipped + extension-surface plan ready; committing, then Phase 1)

## Next session
- **Do NOT re-flag the troll-GDT ruling as open** — it is closed (see Key decisions above).
- Regions plan Phase 2 CURRENT: region-owned daemons (`buildSchedulerDaemons` region-presence branch, `isInRegion` transitive). Phases 3 (crossing reactions, R3) and 4 (story-level daemon, R4) queued; Phase 4 is order-independent.
- Still parked (unchanged): chain RNG-death flake investigation (~1-in-3 to ~50% clean chain rate, pre-existing per 0aaf30fe baseline).
- Other queued pre-G4 workstreams: ADR-215/216 (S3) implementation plan, doors (ADR-234) implementation plan.
- Nothing committed yet this session.
