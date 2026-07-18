# Session Summary: 2026-07-16 21:13 — chord-foundations (session 4685f3)

## Goals
- Resume the stdlib author reference (`docs/work/stdlib-reference/plan.md`), paused under the Sharpee↔Chord parity push.
- David chose: **refresh Phase 1 first** — re-true `coverage-checklist.md` and the `stdlib-reference.md` skeleton against today's surface (post ADR-218/224/226/227/228/229), then start Phase 2 (Manipulation chapter).

## Key decisions
- Resume mode: Phase 1 refresh before Phase 2 content drafting (David, this session).

## Work log
- Pre-session audit: all clear; ADR-229 landed at 238f6fdd, tree clean.
- Established the delta since the plan was written (2026-07-14): 50 action dirs (new: `deadly-room-death`), 40 trait dirs (new: `health`, `deadly-room`), interceptor lifecycle (ADR-228), key slots / talk grammar / dispatch fall-through (ADR-229), death constructs (ADR-224/227).
- 3 Explore agents grounded the refresh: (1) `deadly-room-death` = internal redirect target, no grammar; ADR-227 author constructs = `kill the player <phrase-key>`, `<direction> is deadly:`, room `deadly:`; **chord-language.md has none of them** (only win/lose §4.6). (2) Trait diff = exactly {health, deadly-room}; health engine-only (no Chord surface); deadly-room authorable via `deadly:` clause, not a catalog adjective. (3) D5 registry: 33 actions / 34 ids (entering_room); slot map captured (locking/unlocking target→key, removing item consults removing-then-taking, going source/destination/door, etc.); dispatch verbs' Chord Way = `define action` + trait `on <verb>ing it` (zoo exemplar), entity-level dispatch clause is a pointed load error; turn/wave/wind still unbound; grammar deltas = core talk family (R3), climb family (ADR-218); `hello :target` is dungeo-only story grammar.
- Refresh applied: `coverage-checklist.md` rewritten (counts, §9 Death rows incl. the 3 ADR-227 constructs, death traits group, interceptor/dispatch cross-cutting notes, talking/climbing/lowering/raising/locking rows re-grounded); `stdlib-reference.md` skeleton gained §1.5 (intercepting) + §9 Death, Meta/Traits/Plugins renumbered §10–§12; plan.md Phase 1 refresh addendum, Phase 2 dispatch framing updated, Phase 5 now owns §9 Death + the 2 new traits, counts corrected.
- `.current-plan` → `docs/work/stdlib-reference/plan.md`.

## Open items / flags for David
- **pulling action ↔ lang-en-us drift (verified two-sided)**: `pulling.ts` requiredMessages = no_target/not_visible/not_reachable/cant_pull_that/worn/pulled/nothing_happens/already_pulled. Of these, `cant_pull_that` + `nothing_happens` resolve only via the ActionFailureReason fallback table (`lang-en-us/src/data/messages.ts:176,201`); **`pulled` (the success message), `worn`, `already_pulled` have no English anywhere in lang-en-us**. Meanwhile `lang-en-us/src/actions/pulling.ts` defines a rich legacy vocabulary (lever_*/cord_*/comes_loose/pulled_direction/…) the current action never emits. Platform fix needs discussion — not touched. The stdlib-reference chapter documents the action's actual IDs.
- Reserved-but-unreachable message IDs (minor, same family): touching declares `feels_cold`/`feels_rough`, pushing declares `too_heavy`, but no code path selects them today.
- **Loader: container-kind + `lockable with key X` drops the key config** — buildEntity's container branch calls `builder.lockable()` (no key), then applyTraitAdjectives skips LockableTrait because it already exists (loader.ts:746), so `with key` never lands on container-kind entities. Verified working on plain things (zoo.story:143). Suspected story-loader defect — needs discussion, not touched.
- **Dormant traits: `moveable-scenery` and `attached`** — no behavior class, no stdlib action consults either (repo-wide grep: only world-model barrels), no story uses them, not Chord-composable. Documented as dormant/Sharpee-Way-only in the reference rather than given invented behavior.
- **chord-language.md death-construct gap**: ADR-227's `kill the player` / `is deadly:` / `deadly:` are undocumented in the language reference (outside this plan's write surface). §9 of the stdlib reference will teach the syntax for now; chord-language.md needs its own death section as separate work.
- `is deadly while <cond>:` parses but is not wired (post-scope load error) — documented as a limitation, not a bug.

## Phase 2 — Manipulation chapter (proceeded per David's chosen resume mode)
- 4 fact agents grounded all 13 actions + 6 traits (verbs from grammar.ts, validate() precondition order, exact message IDs, interceptor slots, trait fields, Chord composability).
- §2 written in `docs/reference/stdlib-reference.md`: taking/dropping, putting/inserting (delegation + both-gerund interceptor caveat), removing (documented + grammar-gap callout), giving/showing (preference/reaction data hooks), throwing (probabilistic outcome ranges, no-seeding policy respected), pushing/pulling/touching (pushType semantics; "narrates but does not relocate" honesty), lowering/raising (full dispatch pattern with compose-verified windlass example), trait sections incl. dormant moveable-scenery/attached documented as dormant.
- Example verification (ad-hoc, per dropped-harness ruling): scratch story with both §2 examples passes `sharpee compose` full load (4 entities, 1 trait, 1 action).
- Checklist: 19 rows checked; plan Phase 2 marked COMPLETE.

## Additional flags for David (Phase 2 discoveries, verified two-sided)
- **`if.action.removing` has no core grammar**: nothing in grammar.ts or verbs.ts maps to it (bare `remove X` → taking_off; `take X from Y with Z` → taking_with). The action works but is unreachable without story grammar. Documented in §2.3 as a platform note.
- **Dotted phrase keys don't work in Chord**: `define phrases` block rejects them (`parse.phrase-entry`); `define phrase if.action.taking.fixed_in_place` parses gate-clean but **silently registers key `if`** (truncates at first dot — bug candidate). Consequence: no Chord story-wide override of platform message text; per-entity on/after clauses are the Chord Way (documented in §2 intro). The EBNF (`phrase-key = WORD { "." WORD }`) disagrees with the parser — one of them is wrong.

## Phase 3 — Movement + Containers & openables (David: "continue to Phase 3, we'll fix the platform gaps after")
- 3 fact agents (movement actions; openable/lockable actions — CLI-verified against the bundle; Chord movement surface) + my own ExitTrait check.
- §3 written: going (12 direction words, blocked-exit mechanism, door checks, darkness-affects-seeing-not-moving, vehicle GO semantics, 3 interceptor parties incl. entering_room), entering/exiting (enterable gate, preposition, no occupancy check), climbing (object vs unreachable directional path; destination field unconsumed), traits room/enterable/climbable/exit(dormant plumbing)/vehicle(TS-only), region/scene pointer to §11.
- §4 written: opening/closing (locked gates opening; opened-revealed chain replaceable by key; prevents_closing; synonyms-don't-parse note), locking/unlocking (key rules, keyless locked_with quirk, target→key interceptor order, explicit-keys-only), traits openable/lockable/door (door = room1/room2/bidirectional + openable + lockable; `a door` still throws at load — TS-only).
- Checklist: +16 rows checked (§3 9, §4 7 incl. annotated gap rows). Plan Phases 3 marked COMPLETE (plan file's Phase 3 covers both chapters).

## More platform flags (Phase 3 discoveries; David has said gaps get fixed after the docs)
- **`lock` has no core grammar at all** (CLI-verified: "I don't understand that.") — locking action is player-unreachable without story grammar.
- **Keyless `unlock X` does not parse** — only `unlock X with|using Y` exists in core grammar.
- **`open X with Y` → `if.action.opening_with` is an orphan** — grammar exists (priority 110) but no action implements the id; runtime fails as not-understood.
- **verbs.ts synonyms don't parse** (shut, cover, secure, unwrap, uncover…) — parsing is grammar-rule-driven; the lang verb lists are help/docs only. Systemic: worth one decision (add grammar or trim the lists).
- **Inert lockable fields**: `autoLock` (handleClose implemented, zero callers), `acceptsMasterKey` (never read). Undeclared ad-hoc `autoOpenOnUnlock` only flags willAutoOpen, never opens.
- Minor reserved/dormant: entering `too_full` never fires (no occupancy check); climbing's ClimbableTrait.destination/direction/messages unconsumed; ExitTrait unread by standard actions (via-entity open/locked checks + pathfinding only); `a door` load error re-confirmed; vehicle/region/scene have zero Chord surface.

## Grammar-reachability assessment (David raised: "alignment work should have included parser fixes")
- ADR-229's stated consequence "every wired action is reachable (R3)" is NOT satisfied: R3 fixed only the named instance (talking); no registry-vs-grammar sweep was run. Verified wired-but-unreachable TODAY: **locking, removing, listening, smelling** (4). Partial: keyless `unlock X` doesn't parse. Orphan grammar (reachable id, no action): **if.action.opening_with, if.action.examining_carefully** (2). CORRECTED: hiding IS reachable (grammar.ts 878-905 — hide/duck/crouch + reveal patterns; Phase 1 checklist claim was wrong; told David it was unreachable before the correction landed — corrected in-session).
- Proposed shape (awaiting David's go): ADR-229 amendment or small successor ADR — mechanical grammar adds + a reachability pinning gate (derive grammar-reachable ids, assert D5-registry ⊆ reachable ∪ documented-exceptions {entering_room, deadly-room-death}), modeled on the D5 fs-scan gate. Separate one-decision item: verbs.ts synonyms that don't parse (shut/secure/unwrap/check/view/observe/find/locate/tug/…) — add grammar or trim the help lists.

## Phase 4 — Wearing + Senses & examination (continued per David)
- 3 fact agents; §5 + §6 written; 18 checklist rows checked/annotated (§5: 2 actions + 4 traits; §6: 6 actions + 5 traits + hiding row corrected); plan Phase 4 COMPLETE.
- Doc highlights: wearing grammar complete; layer-default quirk (conflicts always report hands_full); undeclared `cursed` probe; clothing-trait gotcha (can't be worn alone); examining cascade + ADR-195 detail channel; two concealment mechanisms disambiguated (IdentityTrait.concealed for items via search vs ConcealmentTrait for actor-hiding); acoustic/listener documented as engine sound-propagation substrate.
- New dead/inert list (for the fix-after pass): cant_see_in_dark, look_around, found_items, listened_to unreachable; 6 looking requiredMessages lack lang templates; brief mode unimplemented; ReadableTrait.requiresAbility inert; smelling metadata says requiresDirectObject:true but code supports bare form.

## Phase 5 — Devices + NPCs/conversation/combat + §9 Death
- 4 fact agents (devices; talking/attacking + NPC traits; eat/drink/hide + traits; death surface). §7, §8, §9 written; 25 checklist rows checked; plan Phase 5 COMPLETE.
- §9 Death teaches the ADR-227 syntax itself (chord-language.md gap stands): kill-the-player statement + veto window (engine re-checks HealthTrait; dungeo death-penalty pattern), deadly exits (bypass going entirely — death text only), deadly rooms (safeVerbs, TS-only `chance` on seeded RNG, silent survival), wire-shape nuance (messageId on died event vs separate phrase event), no .story uses the constructs yet (dungeo falls = same seam in TS, transcript-pinned).
- New flags this phase (recorded in plan Phase 5 status line): if.action.cutting = 3rd orphan grammar id; revealing action has no lifecycle descriptor; eaten items never leave play; emptied containers stay drinkable; swallow/activate/start/deactivate/stop/break/smash/destroy don't parse; auto-off timer + fuel consumption dormant; pushing's button toggle doesn't call light/extinguish; drink-taste type-union mismatch; attack-ineffective legacy string leak; ConcealmentTrait.capacity dormant.

## Phases 6–8 + 10 (continued autonomously; all facts agent-grounded)
- Phase 6 (§10 Meta/system): metas have no interceptor surface; save/restore/quit/restart = platform-event signals (quit auto-confirms hookless); Chord header→about/version and score/award→ledger zero-setup; AGAIN re-parses raw text; undo = 10-deep snapshots covering all Chord state; **sleeping has NO grammar** (5th no-grammar action); help-topic/named-save dormant; restarting has no lang file.
- Phase 7 (§11 Traits catalog): 40-row index table + full structural entries; one-entry-per-trait design (catalog indexes, never duplicates). SceneTrait is LIVE (scene-evaluation-plugin, priority 60, always-on — corrected); region ambient fields dormant.
- Phase 8 (§12 Plugins & daemons + appendix): priorities NPC 100 / SM 75 / scenes 60 / scheduler 50; only scenes always-on, rest opt-in (Chord auto-registers scheduler iff daemons); Chord sequence = ONE daemon (world-state pointer → free undo coverage); Chord states ≠ SM plugin; combat = worked extension example, Chord-unreachable.
- §1 intro written; banner → CONTENT-FINAL.
- Phase 10 (site render): committed render-site.mjs (blockquotes→callouts adaptation) → site/stdlib-reference.html (98 KB); chord.html + components.js linked; tag-balance + node --check + landmark spot-checks all OK.

## Status: PLAN COMPLETE
- All phases of docs/work/stdlib-reference/plan.md done (Phase 9 was owner-DROPPED). stdlib-reference.md content-final, checklist 100% checked, site page live and linked. NOT committed — awaiting David.
- **Fix-after backlog for David** (full detail in plan per-phase status lines + flags sections above): (1) grammar-reachability ADR-229 amendment — 5 no-grammar actions (locking, removing, listening, smelling, sleeping), keyless unlock, 3 orphan ids (opening_with, examining_carefully, cutting), + reachability pinning gate; (2) verbs.ts-synonyms-don't-parse one-decision cleanup; (3) chord-language.md death section; (4) loader container+`with key` drop; (5) dotted-phrase-key silent truncation (EBNF disagrees with parser); (6) pulling lang drift; (7) restarting lang file missing; (8) assorted dormant fields/dead IDs catalog.
