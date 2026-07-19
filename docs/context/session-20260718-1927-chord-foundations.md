# Session Summary: 2026-07-18 19:27 — chord-foundations (session 1e7652)

## Goals
- ADR-240 AC confirmation recorded (David, start of session).
- Tutorial plan Phase 8 (G4/G5 browser presentation): media assets, `client has` gating, payloaded emit + clock channel, transcript degradation gate + real-browser playwright proof.

## Key decisions
- Phase 8 browser proof built via the in-repo devkit harness (chord-build.test.ts precedent) rather than G2's tarball staging — the plan asks for the g2 *playwright* pattern; tarball staging was already proven generically.
- Ambient platform seam RAISED, not bridged (per policy): browser assertion for `play ambient` deferred to David's ruling.
- **RULED (David): "chord has to support dynamic channels"** — the default-bed shortcut rejected; and **dynamic channels are NOT media-specific: the author can throw anything into one** (second ruling, same session — ADR reframed from media families to the general surface). Drafted [ADR-241](../architecture/adrs/adr-241-chord-dynamic-channels.md): `define channel` general-by-contract, namespaced family ids, media sugar riding the general mechanism (channel-carrying lowering + auto-registered implied channels), IR dynamic-channel manifest, loader registration, client family binding from the manifest. All 5 open questions ruled via interview (main default bed; bare stop = default only; declared-beyond-implied channel words; `define ambient`/`define layer` one-liners; platform generic panel for unrendered channels). adr-review 14/14 post-fixes (impl section, IRChannelDef.family, panel contract, standard-layers implied, D5 ACs). **Scope note recorded (David): dynamic channels will eventually carry custom UI implementations (Sharpee already supports custom templates); deliberately NOT in this gate — future ADR rides this mechanism.** **ADR-241 ACCEPTED (David, same session).**

## Work log
- ADR-240 amendment: ACs CONFIRMED by David — implementation gate closed.
- **Phase 8 (G4/G5) DONE**: four assets declared + real WAV/PNG files generated (`stories/fernhill/assets/`); `client has`-gated beats (ambient on Grounds crossings, boiler-thump on machine light, folly photograph on examine, dawn-theme on win); `estate.clock` payloaded emits (story-state-gated hour) + `define channel clock` + story renderer in `stories/fernhill/src/browser-entry.ts` (`#estate-clock` status-bar panel).
- Gates: `media-degrade.transcript` (no-leak degradation) — fernhill 472/472 atomics + wt-01 76/76; cloak 81/81; zoo 71/71 + chained. Browser proof `scripts/g3-fernhill-browser-proof.mjs` PASS (log committed): boot, image mount+fetch, clock panel ("past midnight" — witnesses the turn-14 flip), boiler-thump fetch.
- **PLATFORM FINDINGS raised to David (not fixed)**: (1) chord `play ambient` → channel-less `media.ambient.play {src}`; no pre-registered channel consumes it (stdlib ambient channels filter on a `channel` field chord never emits; loader registers none) — ambient can't reach the browser; (2) repokit `--browser` has no chord branch — in-repo chord stories have no repokit page build, devkit path only.
- Plan: Phase 8 → DONE, Phase 9 (tutorial docs + nav) → CURRENT.

## ADR-241 implementation — COMPLETE this session (all 4 phases)
- David: "plan 241" → session-planner wrote `docs/work/chord-dynamic-channels/plan.md` (4 phases, 1,000 budget; plan-review clean) → "start phase 1" go-ahead → all four phases executed same session.
- **Phase 1** (chord compiler): ambient `in <word>` tails, `define ambient|layer` one-liners, `analysis.unknown-channel` + suggestions, implied `main` bed + implied standard image layers, `channel` payload stamp, `IRChannelDef` union with `family` discriminator, ide-protocol re-export, ebnf + 2 ratchet rows + grammar doc. 13 new tests; chord 370/370; golden snapshot unchanged.
- **Phase 2** (story-loader): `registerChannels` family branch via stdlib builders; 5 REAL-PATH tests incl. bare-stop bed isolation; 287/287. TS gotcha: negative narrowing can't eliminate a two-literal-discriminant union member — branch on the single-literal side.
- **Phase 3** (client): channel-service `registerRendererFactory(prefix, factory)` (exact → longest-prefix factory → JSON fallback); platform-browser family binding (`ambient:`/`image:`) + NEW generic panel (`src/channels/panel.ts`, match-all factory, D4 contract exact); 8 tests; pb 81, cs 94. Pre-existing AC-16 grep-gate failure surfaced (ADR-216 files never allow-listed; suite unrun since) — allow-listed per the gate's own instruction.
- **Phase 4** (closure): proof extended + PASS — AC-1 ambient real-Chromium fetch with fernhill.story byte-identical; AC-4 generic panel with zero story TS (untouched scaffold entry); AC-5 no double-render. Full regression green (all suites + repokit build + cloak/zoo/fernhill + wt). **ROOT-CAUSE PLATFORM FIND (pre-existing, fixed): platform-browser `build` was CJS-only — dist-esm stale since Jul 10; browser bundles (import condition) silently shipped Jul-10 platform-browser code. Script fixed to the house dual-build.** `.current-plan` → chord-tutorial-story (Phase 9 CURRENT).

## Parked (David, mid-session — future ADR candidate, not implemented)
- **Phrase sections**: `start phrase section` / `end phrase section` grouping, with rows as `phrase-name` NL indented text — lets an author see all phrases as one section; possibly allow such sections in an IMPORTED chord file. Raised 2026-07-18 during ADR-241 Phase 4; needs its own ADR (grammar ratchet + a first import surface).

## Status: Tutorial Phase 8 COMPLETE + ADR-241 SHIPPED (ambient seam closed, David-confirmed); committed+pushed this session; tutorial Phase 9 (docs + site nav) CURRENT
