# ADR-310/318 Wiring Audit — every seam, producer to consumer

**Date**: 2026-08-15 (session 2aea28, David: "Proceed with audit"). Prompted by the
defect pattern of the closure pass: every find was a producer/consumer seam never
exercised together — unit suites synthesized their own inputs, so a piece could pass
while its consumer listened to a different name or didn't exist. This audit enumerates
the seams of the ADR-310/318 surface and records, per seam: producer, consumer, render
path, composed proof. Evidence is file:line or a dated bundle probe.

**Classification**:
- **LIVE** — producer and consumer verified, composed proof exists (test or probe).
- **LIVE-UNPROVEN** — wiring verified by reading, no composed test/probe yet.
- **INERT** — producer runs, effect never applied/consumed. A defect.
- **UNREACHABLE** — consumer exists, no reachable producer path.
- **ORPHAN** — exported/serialized surface with no caller/producer at all.
- **BUILDER-ONLY** — live for the TS builder path; chord has no authoring surface
  (known authoring gaps, flagged in the thealderman story header).

## 1. The turn plumbing (the spine — verified live)

`NpcPlugin.onAfterAction` (plugin-npc/src/npc-plugin.ts:46) → `npcService.tick`
(stdlib/src/npc/npc-service.ts:205) → registered tick phases incl.
`createCharacterModelPhase` (registered at story-loader/src/loader.ts:977) → returned
events join the turn's events → prose pipeline renders ANY event whose
`data.messageId` resolves (ADR-097 domain-message path,
engine/src/prose-pipeline/handlers/domain-message.ts:47-53), and chord phrase keys ARE
registered with the language provider (`addMessage`, story-loader/src/loader.ts:899).

**Live probe** (2026-08-15, bundle, thealderman): entering the Bar renders John's
`john-menace-noticed` via `character.influence.applied` + messageId — the whole chain
works. (It also exposed D8 below: the phrase re-fires every turn.)

## 2. Event seams

| Event type | Producer | Consumer / render | Status |
|---|---|---|---|
| `character.author.arbitration`, `.ledger_mint`, `.pin_held`, `.pressure_deposit`, `.paralysis_warning` | arbiter/reveal.ts, conversation/claims.ts | `character` channel selector (`AUTHOR_PREFIXES`, stdlib/src/channels/character-author.ts:34), gated `authorChannels` | **LIVE** (channel tests + assemble-channels, G3 evidence) |
| `npc.character.mood_changed`, `.threat_changed`, `.disposition_changed`, `.fact_learned`, `.lucidity_shift`, `.lucidity_baseline_restored`, `.hallucination_onset` | character-observer.ts, lucidity-decay.ts, tick-phases.ts:297, runtime.ts:2482/2488 | same channel selector (`npc.character.` prefix) — author-channel-only by design (Phase 2) | **LIVE** |
| `character.author.act_witnessed` | tick-phases observe sub-step; runtime.ts:1146 | channel selector | **LIVE** (observe tests, b1 fixture) |
| `character.propagation.witnessed` | tick-phases recordTransfer:485 | data.messageId `…witnessed.<coloring>` → lang-en-us/src/npc/propagation.ts | **LIVE-UNPROVEN** as rendered text (no transcript asserts the line; unit tests assert the event) |
| `character.propagation.eavesdropped` | **nobody** — recordTransfer hardcodes `'present'` (tick-phases.ts:483), so the `'concealed'` visibility arm never runs | lang mapping exists (propagation.ts:31) | **UNREACHABLE** (whole `PlayerPresence` concealed/absent surface of visibility.ts is dead at the call site) |
| `character.influence.applied` / `.resisted` | tick-phases.ts:731/741, carry authored phrase key as messageId | ADR-097 render | **LIVE** (probe above) — but see D8: re-fires every turn |
| `character.influence.expired` | tick-phases.ts:670 — no messageId | no lang mapping, no messageId → falls to generic handlers | **INERT as text** (silent; possibly intended — needs a ruling) |
| `character.goal.step` | tick-phases.ts:589 (act/say witnessed) | ADR-097 render would work (phrase keys registered) | **blocked by D6** — movement inertness means seek-led goals never reach their act step; never observed in any story |

## 3. The goal execution layer — the big finding (D6, expanded)

**No goal step type mutates the world.** The layer is a trait-state machine emitting
messages; its world half was never built:

| Step | Evaluator (goals/step-evaluator.ts) | What's missing |
|---|---|---|
| `seek` / `moveTo` | :139-173 computes `findNextRoom(...)` then returns `{status:'in-progress'}` **discarding it**; `StepResult` (goal-types.ts:212) has no movement field; `executeNpcGoals` (tick-phases.ts:542-601) never calls `world.moveEntity` | NPC never moves; step never completes; later steps unreachable |
| `acquire` | :199-205 completes when the item is co-located | never takes the item |
| `give` | :228-235 completes when target co-located; `_item` explicitly unused | never transfers the item |
| `drop` | :237-246 completes unconditionally | never drops anything |
| `act` / `say` | :124-129 emit witnessed messageId | render chain live (§1) but unreached behind seek-led sequences |

**Bundle proof** (2026-08-15, b3-conscience fixture): Steward at `breaking`, goal
active, D16 window elapsed, six quiet turns — never arrives (`look` shows empty Hall).
**Consequence**: thealderman's `destroy-evidence` (John) and `seek-truth` (Chelsea)
goals have never executed observably; no transcript asserts them. 310-AC3's "Goals
live" was discharged on `goalState` assertions — the observable half was untested.

## 4. IR → runtime constructs (chord side)

| Construct | Consumed at | Status |
|---|---|---|
| `IREntity.character` descriptive + normative blocks (personality, mood, knows, thinks, profile, spreads, temperament, principles, honor, burdened, goals, influences, resists) | apply-compiled.ts via applyCharacterBlocks (loader.ts:842 area) | **LIVE** (13+8 round-trip tests; fixtures) |
| `StoryIR.customMoods` / `customPersonalities` | loader.ts:827-828 | **LIVE** |
| `StoryIR.temperaments` | loader.ts:849-850 → registry | **LIVE** (arbiter tests, b1) |
| `StoryIR.witnessedTopics` | loader.ts:852-855 → registry; runtime.ts:903 | **LIVE** (b1/AC4) |
| `StoryIR.facts` (closed value sets) | compile-time claims checking (chord) | **LIVE** (compile diagnostics) |
| `IRPhrase.claims` | runtime.ts claimsFor → pin/mint (:1101, :1125) | **LIVE** (transcripts) |
| `IRPhrase.specificity` | **nowhere** — phrasebook arbitration is declaration order (runtime.ts:325-359); the tie diagnostic fires at compile | **ORPHAN wire field** (behavior still matches D16 because the compiler rejects same-specificity ties; the marker itself is unread) |
| `change mood` / `change feeling` transitions | execCharacterTransition (fixed 2026-08-15, was the D3 find) | **LIVE** |
| propagation pace/coloring/withholds/excludes/overrides/schedule/playerCanLeverage; goal modes opportunistic/prepared; interruptedBy; per-step witnessed phrases; influence schedules/lingering/disposition/propagation effects; non-`from` resist-excepts | builder path only — no chord grammar | **BUILDER-ONLY** (known, flagged in thealderman header since Phase 3/4) |

## 5. Registry fields (CharacterPhaseRegistry)

propagationProfile (tick-phases.ts:385,423) ✓ · movementProfile (:568) ✓ · goalDefs
(goal managers) ✓ · influenceDefs (influence sub-step) ✓ · resistanceDefs (:629) ✓ ·
baselineMood (decay) ✓ · witnessedAliases (observe + runtime.ts:903) ✓ ·
temperamentDefs (arbitration gate) ✓ · oracle (goal conditions, :526-528) ✓ — **all
LIVE**.

## 6. Orphans and dormant surfaces

| Surface | Evidence | Status |
|---|---|---|
| `drainPressure` | exported (character/src/index.ts:209), zero callers; doc says it releases pins on the breaking crack | **ORPHAN** — the crack currently neither drains pressure nor releases pins; thealderman's confession works only because it claims a *different* fact than the pinned one |
| Ledger `kind: 'promise'` | serialized on the trait (characterModelTrait.ts:122); `break a promise` in the act vocabulary; **no minting producer anywhere** | **ORPHAN** (dormant D9 surface) |
| Dialogue-selector socket (D15) | registerCharacterDialogue — production registrants: none (chord path uses topic dispatch; thealderman-ts archived) | **authoring surface, by design** — for TS-builder stories |
| `PlayerPresence` 'absent'/'concealed' arms | see eavesdropped row, §2 | **UNREACHABLE** |

## 7. Known defects — consolidated list (D-numbered across the closure pass)

Fixed earlier this pass: D1 ungated character channel (G3) · D2 dead observer rule
keys · D3 `change mood/feeling` compiled-but-dropped · D4 story-config splicer ·
D5 belief values not transferring (G5a).

Open, found by this audit and the b3 fixture:

| # | Defect | Evidence | Proposed fix (all need sign-off; platform) |
|---|---|---|---|
| **D6** | Goal steps never mutate the world (movement, take, give, drop) | §3 | **FIXED 2026-08-15 (session 2aea28, David: "Just do D6")**: `StepResult.mutation` intent (goal-types.ts) applied by `applyStepMutation` in `executeNpcGoals` (evaluator stays pure); give/drop of an unheld item blocks loudly; failed application neither advances nor announces. 7 tests on `world.getLocation` through the real tick; mutation-verification GREEN. Bundle proof: b3 Steward at breaking seeks the player into the Hall and confesses via the existing ADR-097 render path. Regression: character 421, b1 fixtures 15, thealderman 53, Dungeo chain 952 — all passing. Residual note: `holdsItem` is permissive when a caller omits `getEntityRoom` (deliberate shim for pure-evaluator tests); thealderman's John/Chelsea goals now genuinely execute, so thealderman is intentionally NOT byte-identical to its pre-D6 output (its transcript assertions all still pass) |
| **D7** | Topic arm delivers surplus phrases — first `chord.phrase` becomes the override, later ones are emitted as extra text (runtime.ts:1106-1118, contradicting its own D5 comment) | b3 probe: crack + deflect both printed; thealderman's confession double-delivers the same way | **FIXED 2026-08-16 (David's ruling: only-match, compiler-enforced — not first-match)**: (1) `analysis.phrase-overlap` pass — within a topic arm, conditional lines must be PROVABLY pairwise exclusive (witness table in `chord/src/condition-disjoint.ts`: single-valued axes mood/band/threat/owner-states, `feels` words, story phases, negation flips, disjoint numeric ranges, and/or composition; conservative — no witness = error demanding disambiguation); at most one unconditional default, required last (it would shadow a matched conditional in the first-in-order runtime); deliberate variety = `or`-variants inside one phrase (already shipped). (2) Runtime drops surplus `chord.phrase` events after the override (rogue-IR backstop). 12 new chord tests (per-axis clean + ambiguity errors); chord 848, story-loader 497, tsc clean; crack transcripts pinned with not-contains on the fallback lines. Also fixed en route: the raw NUL in `analyzer.ts:3492` (now the \u0000 escape) — grep was binary-classifying the file, the exact ADR-289 hazard |
| **D8** | Passive `while present` influence re-applies and re-fires its witnessed phrase every turn, 2× per turn | probe §1 ("The room gets quieter…" ×2 per wait) | Influence application should be idempotent while in force (trait already tracks `influencesInForce`); witnessed phrase on first application only; the 2×/turn needs a tick-path trace |
| **D9** | Interceptor effect envelope re-mints events as `context.event(type, payload)` — actor attribution lost, `npcId: undefined` in chord-path author rows | engine/src/capability-dispatch-helper.ts:187-192 | Carry the source entity through `CapabilityEffect` (optional `actor` field) or preserve the original event entities |
| **D10** | Observer's generic witness rule mints RAW EVENT TYPES as knowledge topics (`if.event.attacked`) — platform vocabulary leaks into the knowledge map and can propagate NPC-to-NPC | stdlib/src/npc/character-observer.ts (`const factTopic = event.type`) | Mint only detected-act derived topics/aliases (the D12a path); drop the raw-type fallback or map through a topic derivation |
| **D11** | The breaking crack has no pressure/pin consequence — `drainPressure` uncalled (§6), so a confessed NPC stays at `breaking` with pins held forever | §6 | Needs a semantics ruling: does the crack (breaking-gated row delivery? the confession goal act?) drain and release pins, and what triggers it |

## 8. What is genuinely proven working (for scope fairness)

Arbitration (B1/B2 + orderings), voices (mood- and band-gated phrasebooks, exact-turn
flips), claims/pin/mint/deposits (unit + transcripts), band gates and the crack row,
conversation-marker suppression (unit), author channel + isolation, save/restore
through the real service, propagation of topics AND values (post-G5a), act detection
with aliases, the observe path, custom vocabulary, temperaments, the full compile
surface with its diagnostics.

## 9. Recommended fix order

D6 (goals act on the world — unblocks 318-AC3's seek-out leg and makes ADR-145 real) →
D7 (one-line-class filter, needs the first-match ruling) → D8 (influence idempotency)
→ D10 (topic vocabulary) → D9 (attribution) → D11 (crack semantics — needs David's
design ruling, possibly an ADR amendment alongside the AC3 forcing clause).
