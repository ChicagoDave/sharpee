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

## Status: COMPLETE

## Next session
- Remaining ⚠️ rows are all design-heavy, already phased: going/doors (Phase 4 child ADR), asking/telling topic surface + attacking systemic combat (Phase 5 extension-surface child ADR), Phase 6 U2, Phase 7 tutorial catalog.
- Troll-GDT unit-transcript RNG flake decision (2026-07-16 session) still awaits David's ruling.
- Nothing committed yet this session.
