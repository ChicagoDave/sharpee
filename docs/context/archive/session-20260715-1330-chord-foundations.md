# Session Summary: 2026-07-15 13:30 — chord-foundations (session 5c4f8a)

## Goals
- The definitive MDL-vs-port gap analysis (redo of the reverted cd869e audit, methodology fixed):
  every gap claim requires a **paired read** — MDL citation + port-absence evidence from
  `stories/dungeo/src/`.
- Deliverable: three-section report — (1) MDL missing-features audit, (2) IF-Native (Chord)
  vs non-IF (hatch) reconciliation, (3) architecture impact on Sharpee under the one-way ratchet.

## Ground rules (from the failure)
- Port is presumed faithful; a false "missing" is worse than a miss (memory: `verify-gaps-against-real-code`).
- Gnome = intentional drop, excluded. Six known fidelity findings (completeness matrix) are
  confirm-only, not new findings.
- Builds on: `dungeo-completeness-matrix.md` (P23–P33), ADR-222 seam catalog (DZ-1…11),
  `ratchet-candidates.md` (RC-1…8), ADR-223 (DRAFT).

## Progress
- [13:30] Scouted corpus: game canon = dung.mud (6562), act1–4.mud, melee.mud; rooms.mud/parser.mud/syntax.mud for verb vocabulary; b/sr/impl/etc = MDL runtime, out of scope.
- [13:35] Launched 10 paired-read audit agents.
- [~14:00] 6 completed (act4, vocabulary, dung-slice3, act2+melee, daemons, act3). 4 killed by Fable token limit (dung-slice1, dung-slice2, act1, NPC) — relaunched on Opus 4.8.

## Completed auditor findings (raw — for synthesis)

### act4 (endgame) — agent done
- MISSING: **Guardians of Zork entirely** (the lethal hazard the mirror-box exists to bypass; port = prose + unconditional S exit). act4.mud:272-615.
- DIVERGENT: **mirror-box collapsed** from transport-between-hallway-segment-rooms to a position int in one room → box is optional.
- DIVERGENT: **prison-cell rotation** (8 cells, contents-swap, DM-must-operate-while-you're-in-cell-4 co-op puzzle) → visibility toggle, solvable solo.
- PARTIAL: beam+stone-button **cosmetic** (stoneButtonPressed has NO consumer); MDL gates 7-turn window, any object breaks beam (port: elvish sword only).
- Smaller: DM flavor (death-on-attack, catch-up-follow, cell-refusal), mirror/panel breakage, crypt divergences (FORTRAN-based, documented), "take five", lamp lit-vs-unlit.
- Cross-flag: possible FDOOR/BDOOR scoring-label shift between two scoring systems (both sum 100).

### vocabulary (syntax+parser+rooms verb tables) — empirically tested vs --play
- MISSING (platform-parser): OOPS, FIND/WHERE IS, TIME, VERBOSE/BRIEF/SUPERBRIEF (meta-registry reserves IDs, no grammar), SCRIPT/UNSCRIPT, TAKE VALUABLES/POSSESSIONS, ?→help, postposed particles (`pick mat up`/`put mat down` both fail).
- PARTIAL: `take everything` (lang-en-us declares allWords incl. everything/every but entity-slot-consumer hardcodes 'all'); `ROBOT, GO EAST` comma-address (grammar can't start with slot; tell/order works); missing-object orphaning ("Take what?"→answer).
- PRESENT: AGAIN/g, THEN-chain, all/except/and, pronouns (richer than MDL), implicit take, ROOM/RNAME/OBJECTS/DIAGNOSE, BOARD/DISEMBARK, quoted SAY.

### dung-slice3 (objects 4400-6562)
- MISSING mechanics: **maintenance flood one-way** (no tube-of-gunk→putty→seal leak); **skeleton desecration curse** (banish valuables to Land of Dead; port has skeleton + trivia-about-it but not curse); **death-scatter** (possessions rotate over rooms on death; port = -10/2-deaths only); **flask of poison** (Pool Room drink/open death); **library decoy books** (3 GREEK-TO-ME decoys → stamp search puzzle; port hands right book).
- MISSING objects: tomb furnishings (poled heads + desecration, Coke bottles, listings), sooty-room stove (LIT the room — lighting divergence), pile of bodies (Hades), burned-out lantern (maze.ts comment lists BLANT then omits), newspaper, tool chests, parapet number objects.
- DIVERGENT: matchbook no 5-limit; lantern 330(FORTRAN) vs 350(MDL); crypt collapsed into Tomb w/ port comment factually wrong re MDL; black-book/matchbook canon text replaced.
- PRESENT: trivia pool, combat strength/best-weapon tables, mirror-box internals, treasure point values.

### act2+melee — most thorough
- Melee engine **near-perfectly faithful** (tables/strengths/wound/cure/diagnose match). DIVERGENT: hero unconscious defanged ("mechanically a no-op"); villain revival fixed-4-turn vs MDL growing-prob.
- Puzzle-integrity MISSING: **pot of gold visible + reachable overland** (rainbow bypass); rainbow walkable ungated one side; wave-on-rainbow dissolve-death; **machine puzzle lost 3/4 rules** (no screwdriver, no lid-closed, no gunk-transform; became one-shot); **boat puncture consequence-free** (no putty/PLUG); white-cliffs deflate-gate; 5th-dig death; **barrel+GERONIMO** entirely; SHAKE + SWIM verbs.
- Explosion chain: intended path works; fuse-in-brick check absent ("always explode"), mung hides scenery not takeables (inverted), no trophy-case-empty, ledge-tether unmodeled.
- 3 incidental PORT BUGS: (1) gas-room-handler.ts:144-159 console.error on every command; (2) troll-daemon wake leaves meleeVillainUnconscious=true+neg strength → auto-kill awake troll & he can't fight; (3) bat drop pool includes endgame Narrow Corridor → mid-game teleport into endgame geography.

### daemons/clock (full CEVENT registry traced)
- MISSING: **score-gated endgame entry** (EGHER 15 herald/wraith + crypt needs endgame flag; port = darkness+wait, setMaxScore(616) unwatched); **bank vault alarm death** (SCLIN 6); **slide rope-grip timer** (weight-scaled; port slide freely walkable); **match lifecycle** (5-count, 2-turn burn, not a lightsource; light-action doesn't check tool is lit); **cyclops wrath clock** (attack→eaten ~5 turns); **exorcism hot bell** (untakeable/burns/water-cooled 20-turn + candle-drop).
- DIVERGENT: light budgets (lantern 464 real vs 330; candles 85 vs 50; cave-wind blowout absent); rank tables (Beginner→Wizard + endgame Cheater ladder → generic stdlib ranks); mirror-door 7-turn & pine-door 5-turn & quiz-reask-2-turn windows.
- PRESENT: explosion constants, cure/diagnose, flooding, brochure, cage poison, balloon timing, sword glow, thief/fight demons, **LOAD/weight system** (platform-enforced incl nested).
- PATTERN: port systematically dropped MDL **timed-window pressure**; port timers are mostly fuses, not deadline windows.

### act3 — large haul
- MISSING: **dead spirit mode** (walking-dead player state + pray-to-resurrect at altar; port = FORTRAN -10/2-death); **Machine Room square/round buttons + carousel zoom + spin-death + player-push electrocution** (port: only triangular, polite block); **bank entry-direction mechanic** (4-way dest by entry dir + wall-chain retarget → 2-state toggle) + **vault-alarm death**; **royal-puzzle steel-door/card-slot alternate exit + entrance-blocking**; **palantir** (look in sphere → view next sphere's room; links 3 sphere puzzles); **wishing well** (make-a-wish + throw-into-well); **COUNT** verb (69,105 leaves gag); **PLAY violin** (worthless-trap + play-villain death); alice-cake **flask** object + magnified-icing-reading; round-room steel-box reveal gate; up-a-tree drop-physics + broken egg/canary; joke verbs (CHOMP/FROBOZZ/WIN/YELL/climb).
- DIVERGENT: royal-puzzle CPWHERE ASCII map → prose (grid math itself PRESENT); tiny-room lids/dual-keyholes/paper-under-door collapsed (core mat/key PRESENT).
- PRESENT (surprising): cage/sphere+robot-crush death, brochure mail-order, alice-cake core, bank-teller-exit-alarm (minor: also blocks S, doesn't recurse into containers).

## Key Decisions
- (pending synthesis)

### dung-slice1 (above-ground/maze/exits) — done
- MISSING: **coffin-transport gate** (6 exits blocked while carrying coffin; volcano.ts:232 has `// TODO: implement coffin check`); **thief sacred-room avoidance (RSACREDBIT)** (surface rooms sacred → thief confined underground; port has no sacred concept, thief wanders unfiltered); **West-of-House→W and South-of-House→S forest exits**.
- DIVERGENT: forest self-loops gone (5-room getting-lost → 4 linear paths; poss. intentional redesign); **Gallery dark but MDL self-lit (RLIGHTBIT)**; kitchen-window prose static; custom blocked-exit one-liners ("Santa Claus climbs down chimneys", "evidently no key") absent.
- PRESENT: RVAL scoring, full maze graph edge-for-edge, chimney gate, reservoir low-tide, gas-room death, treasure values.

### NPC-machinery — done
- **ARCHITECTURE: no unified VILLAINS/ACTORS layer** — MDL drives all NPCs via 1 VILLAINS table + ACTORBIT/OACTOR (generic HELLO/TELL/melee over any actor); port = bespoke per-NPC behaviors → generic behaviors fell through.
- DIVERGENT: **cyclops mis-modeled** — MDL invulnerable-to-combat (attack→"ignores injury with a shrug") + poke/take/tie flavor; port gives CombatantTrait({health:30}), killable villain. → ADR-223 creature-state evidence.
- MISSING: generic HELLO (villain-bow, hello-sailor egg, schizophrenic line → single `hello troll`); give-to-robot; destroy-robot (strands carousel); robot eat/drink/read flavor; spirits attack-response; cyclops give-garlic/junk.
- DIVERGENT: bat drop set (MDL coal-mine-9-rooms; port whole underground) — confirms act2.
- thief: NO new gaps (thief-mdl-validation.md holds).

### dung-slice2 (temple/dam/coal-mine/bank decls) — done
- Confirms: tube-of-gel/leak-plug MISSING; bank SCOL rotating-cube→toggle DIVERGENT; coal-mine empty-handed gate (KNOWN).
- NEW: **TEMPLE/TREASURE teleport verbs** — RESOLVED as real (act1.mud:1422-1432: Temple↔Treasure Room shortcut), MISSING in port.
- PRESENT: 9 endgame RVAL values exact, bat carry, machine coal→diamond, treasure values.

### act1 (death-traps/object-actions) — done
- MISSING death traps: **rusty-knife** (take-w/-sword pulse + attack→death); **black-book burn** ("Wrong, cretin!"→dust); **brush-teeth-with-putty**; **bodies desecration**→HPOLE spawn+head-on-pole; **leaf-pile burn-while-carrying**; **painting mung**→worthless canvas (treasure-ruin); **exorcism hot bell** (HBELL untakeable/burns/water-cool 20-turn) + **candle-drop side-effect**; **skeleton curse**→banish valuables to LLD2.
- MISSING light: **cave2 windy candle-blowout** (PROB 50-80 on entry).
- DIVERGENT: **mirror-break luck penalty** (MUNG mirror → LUCKY-flag false, worse combat; melee.ts:230 hardcodes LUCKY always T) — distinct from KNOWN teleport collapse; torch turn-off burn-hand message lost.
- PARTIAL: leaf-pile grate-reveal gating.
- PRESENT: trapdoor slam, chimney load, echo→platinum bar, glacier melt-death, Sinbad/Odysseus flee.

## Canon ruling (David, 2026-07-15)
- **The MDL in `docs/internal/dungeon-81/` IS the canon** — confirmed it's the 1981-07-22 Mainframe Zork (patched_confusion = Russotto's run-under-Confusion patch of that MDL; original_source/ = pristine versioned originals). The corpus the auditors read is correct.
- Therefore FORTRAN-lineage port behaviors (lamp 330, -10/2-death, 8-Q trivia, ENCRYP INCANT, crypt trigger) are **divergences from canon**, NOT a competing canon. They live in Section 1 fidelity backlog as a sub-class "port chose FORTRAN; confirm keep-or-restore" — no separate "which canon" bucket. The earlier open question is CLOSED.

## Open Items
- Carried: RC-1–RC-8 await sign-off; ADR-223 DRAFT (open questions unresolved).

## Deliverable
- **`docs/work/schism/mdl-port-gap-analysis.md`** — the three-section report (all 10 auditors synthesized). Section 1 = missing-features by mechanic family (1A death-traps … 1K faithful); Section 2 = IF-native/hatch reconciliation (no new primitive family; 1 candidate = timed window); Section 3 = 5 platform seams S-1..S-5 (S-1 ADR-223 over-determined by cyclops mis-model; S-2 timed-window DZ-12; S-3 parser ergonomics; S-4 meta-verbs; S-5 lang allWords dead config) + 5 incidental port bugs.
- 4 owner decisions requested: §1I FORTRAN keep/restore; S-2 new-primitive-or-composition; forest self-loops; S-1..S-5 priority.

## Secondary pass — missing artifacts, not style (David, 2026-07-15)
- **`docs/work/schism/mdl-port-missing-artifacts.md`** — filter over the primary report. Test: REAL GAP = player-observable absence; SHARPEE WAY (drop) = same outcome, different internals.
- KEY: port CHARTER is MDL fidelity (dungeo/CLAUDE.md "adhering to all timers, counters, randomization unless not feasible") → incomplete = gap, not style. Map spec (map-connections.md) matches MDL incl. forest self-loops + house→forest exits; impl omits them (verified forest.ts:120-140, white-house.ts:98-120) → those are GAPS not redesign.
- Filter removes only **5 representation-only items** (basket 2-ends→1; actor table→bespoke; SCOL cube→toggle; mirror-box topology; prison 8-cells) — and in each, the dropped *behavior* stays a gap; only representation removed. Everything else survives.
- Survivors re-ranked Tier 1 (puzzle-integrity bypasses: killable cyclops, pot-of-gold overland, guardians absent, prison solo, bank entry-dir, machine 3/4 rules, coffin gate…) → Tier 4 (scoring). FORTRAN-lineage §1I held separate as keep/restore decision.

## Third pass — Sharpee/Chord capability audit (David reframe: goal is capability, not port-completion)
- **`docs/work/schism/sharpee-chord-capability-matrix.md`** — 7 capability verifiers (real platform AND Chord code, both sides). Verdict per family: CAN / CHORD-GAP / SHARPEE-GAP / HATCH.
- HEADLINE: platform broadly capable; recurring deficit is the **Chord surface**, not Sharpee. Only 2 true platform holes + 2 wiring fixes + parser layer.
- **CAN today (7):** transform (move+remove SWAP), teleport (move you to), conceal (via move; RC-8=sugar), darkness+entity-lit-room, custom verbs (define action), other-entity-state veto (axe), named-object exit gate (**coffin gate expressible in Chord NOW**).
- **CHORD-GAP (8):** timed-window (DZ-12; fuse exists), runtime-exit-mutation (RoomBehavior does it; P25), weight/count exit predicates, vehicle egress (P33), actor-identity-veto (+~1-line Sharpee fix), liquids/capability-verbs/scoring (roadmapped, not re-verified).
- **SHARPEE-GAP (the platform work):**
  - PLATFORM-1 **death/hazard model** (NEW ADR) — no killPlayer/died primitive; every death hand-rolled; event-name split (if.event.player.died vs combat.player_died). Absorbs grue/gas/falls/vault. → Chord `kill the player when` / `deadly` room.
  - PLATFORM-2 **ADR-223** (creature-state + NPC autonomy) — cyclops killable when must be invulnerable = clean proof; NpcTrait/CombatantTrait isAlive sync bug; DRAFT, resolve Q1-Q5. Largest blast radius (~13 mod/85 files) but scoped.
  - PLATFORM-3 **wire light fuel** (small) — consumeFuel() exists, never called into turn cycle.
  - PLATFORM-4 **thread actorId** into standard-verb interceptor ctx (~1 line, runtime.ts:331/466).
  - PLATFORM-5 **parser/meta layer** (1 ADR): take-everything BUG (allWords unread), postposed particles, FIND, OOPS, missing-object orphaning, VERBOSE/BRIEF, comma-address.
- **HATCH:** royal puzzle, INCANT.
- Grounding caveat: rows #13-15 (liquids/cap-verbs/scoring) carried from roadmap, NOT re-verified this pass. No live .story compile run (source-read).

## ADR reset (executed 2026-07-15, David authorized)
Grounded in 2-cluster ADR reconciliation (210-218, 213-223) vs the capability matrix. David's 3 calls: (1) parser/meta = own ADR, (2) adopt matrix→scoreboard taxonomy, (3) draft new ADRs now, interview after.
- **AMENDED ADR-214** — new §1a: bidirectional two-Ways parity (Sharpee Way / Chord Way, neither crude-ified) + CAN/CHORD-GAP/SHARPEE-GAP/HATCH taxonomy (HATCH = new bucket). Status line updated.
- **AMENDED ADR-222** — DZ-1…11 table marked SUPERSEDED by capability matrix; §Decision 1-4 (elegance principle + graduation rule) preserved authoritative. Status line updated.
- **NEW ADR-224** (DRAFT) — Conditional/Hazard Death model (PLATFORM-1). 5 OQs (HEALTH-layer boundary, terminal-vs-reincarnate, event-name reconciliation, DeadlyRoom-vs-Hazard, probabilistic composition).
- **NEW ADR-225** (DRAFT) — Parser/Meta-Verb layer (PLATFORM-5). 3 OQs (comma-address ownership vs 223, v1 scope/order, VERBOSE semantics).
- **KEPT DRAFT: ADR-223** (creature-state HEALTH + NPC-autonomy DAEMON) — 5 OQs unchanged.
- **KEPT ACCEPTED (own their rows, implement-only):** 210 (ratchet+endings), 213 (removed-from-play+governance), 215 (combat reachability), 217 (imperative timers), 219 (liquids), 220 (conditional exits), 221 (dispatch wiring), 218 (foundations, plan in flight).
- **RETIRED framing:** dungeo-completeness-matrix.md (primitive backlog → superseded banner, fidelity findings kept); ratchet-candidates.md RC-1..8 (re-homed as CHORD-GAP ratchet entries, not superseded).
- **RECONCILED:** chord-availability-audit.md scoreboard adopts the 4-class taxonomy; matrix + scoreboard = two feeds of one instrument.
- **Ratchet entries (not ADRs), when built:** DZ-12 declarative timer cancel/re-arm (ext 217), runtime-exit-mutation reveal/remove (ext 220), vehicle egress adjective.
- **Small fixes (not ADRs):** actorId threading (runtime.ts:331), light-fuel driver (wire consumeFuel), take-everything bug (allWords).
- PENDING: OQ interviews for 224 (5), 225 (3), 223 (5) — draft-now/interview-after per David. No code authorized (platform gate).

## ADR-224 interview + acceptance (2026-07-15)
- adr-review across 214/222/224/225 → READY WITH CLARIFICATIONS; top seam = 224↔223 HEALTH boundary (resolve jointly).
- 224 interview (joint seam first): Q-1 **hybrid** (HealthTrait=223 owns state; 224 owns trigger+`if.event.player.died`+game-over routing; player.dead derived; pointer→223 needs terminal "dead-by-cause" state). Q-2 **terminal only** (reincarnation=story policy, first-crack veto before game.lost; ordering contract). Q-3 **`if.event.player.died` canonical** (re-point channel; ADR-215 combat emits it cause=combat). Q-4/Q-5 **deferred as impl-granularity** (David: "is this really necessary?" — trait/helper factoring is impl-plan; only seeded-RNG determinism pinned).
- adr-review of 224 → 3 minor FAILs (stale status text, no E2E scenario, no own ACs) → fixed (AC-1 gas-room E2E, AC-2 deadly-room parity, AC-3 reincarnation veto, AC-4 seeded determinism; backward-compat note on channel rename).
- **ADR-224 flipped DRAFT→ACCEPTED** (14/14 clean re-review). Impl still sequences after 223's HealthTrait.
- STILL OPEN: ADR-225 (3 OQs), ADR-223 (5 OQs + the 224→223 terminal-state pointer).

## ADR-223 interview + acceptance (2026-07-15)
- Interviewed Q-5 first (foundational + 224 seam): Q-5 **HealthTrait = life-state trait** (health + terminal dead-by-cause [closes 224 seam both sides] + derived consciousness KO≤20% + `asleep` flag). Q-1 **remove dead plumbing** (hooks/getState-setState/witness), rebuild in new layers. Q-2 **observation = distinct tiers** (AGENT sight→DAEMON accumulation→PERSONHOOD interpretation, composable). Q-3 **generic-parameterized typed daemon state slot** (typed at use, generic serializable). Q-4 **A first** (critical path for 223+224), B∥C, D last.
- adr-review of 223 → NEEDS WORK (6 consistency defects, not design): Q-id collision (Terminology Q-1/Q-2 vs roadmap folds), stale title (Automation/Creature-State→Daemon/Health), stale status, dangling "open question below", "just health"→life-state, 223↔224 HealthTrait-presence seam. All 6 fixed.
- **ADR-223 flipped DRAFT→ACCEPTED** (14/14 clean re-review). Children A–D graduate individually; sequencing A→(B∥C)→D.
- **224↔223 seam fully closed.** Both ACCEPTED.
- STILL OPEN: **ADR-225** (parser/meta-verb, 3 OQs) — only remaining DRAFT.
- Nothing committed yet (session did: 3 audit passes + ADR reset + 224/223 interviews & acceptance). No code (platform gate).

## ADR-225 interview + acceptance (2026-07-15) — reset COMPLETE
- Q-1 **comma-address split** (grammar=225, routing=223; 225↔223 seam closed). Q-2 **record priority order, defer v1 cut to impl-plan** (comma-address last, gated on 223). Q-3 **verbosity = modern deterministic** (BRIEF long-first/short-revisit; VERBOSE always; SUPERBRIEF never; MDL 20%-random = story override, not platform default).
- Proactively cleaned stale header/status + added concrete AC-1..5 during folds → adr-review **14/14 clean** first pass (vs 223/224 which needed post-review fixes).
- **ADR-225 flipped DRAFT→ACCEPTED.**
- **RESET COMPLETE:** 214 + 222 amended; 223, 224, 225 ACCEPTED. No DRAFTs left in the parity set. All 3 cross-ADR seams closed (224↔223 HealthTrait; 225↔223 comma-address).
- Implementation critical path: **223 child A (`HealthTrait`) first** (unblocks 223 refactor + 224 death). Each child/ADR needs its own separate platform go-ahead.
- Nothing committed. No code authorized.

## Metadata
- **Status**: COMPLETE — 3 passes + ADR reset executed (10-agent MDL gap audit → Sharpee-Way filter → 7-agent capability matrix). Deliverables: mdl-port-gap-analysis.md, mdl-port-missing-artifacts.md, sharpee-chord-capability-matrix.md. Platform work = 5 ADR candidates (PLATFORM-1..5); no code authorized (platform-change gate).
