# Chord 4.0 — alignment ledger

The running record behind the merge gate (plan Phase 17, David 2026-10-15): every change on `chord-4-0` must be shown elegant and aligned for Sharpee and Chord before the branch merges. Entries are written as the work lands, so the final audit is a reading of this file plus the diff, not a reconstruction.

Each entry names the change, the platform concept it reuses, the Chord word and the enforcement behind it, and its status: **ALIGNED** (with evidence), **OPEN** (a question still to settle), or **FIXED** (a shortcut found and removed, with what replaced it).

## Open

- **Tool requirements are a per-trait trio (existing pattern).** Cuttable, diggable, flammable, openable and now light-source each carry `requiresTool`/`requiredTools`/`canXWith` and a `toolId`/`toolIds` pair. Followed rather than forked for ADR-374 D9; one shared tool-requirement shape would be cleaner. A refactor across five traits, not started mid-phase — for David to place.
- **Heard events skip the enrichment funnel (existing).** The sound stage stores `sound.audibility.heard` events without passing them through `enrichTurnEvents`, which the turn-event-processor header calls "the one funnel every event produced during a turn passes through". Predates ADR-374; noted, not changed.
- **`play sound … when client has sound` now gates the world sound too (ADR-374 D6).** A consequence of one sound with two sides; documented in the guide and the ADR. Whether the world side should ignore a client-capability condition is a design question for David.

## Fixed

- **A direction forced into a compass-only type (Phases 13–14; found by the Phase 18 audit's cast hunt).** `SemanticProperties.direction` in `@sharpee/if-domain` was the ten compass words plus `in`/`out`, written before a way could be answered by a custom command (ADR-378 D1's passage keys) or a ship word (ADR-375's `port`/`starboard`/`ahead`). The loader carried two `as unknown as Partial<SemanticProperties>` casts marked "deliberate" (`story-loader/src/loader.ts`, the `define action` defaults and the passage rule) and the grammar engine one `as SemanticProperties['direction']`. Fixed 2026-10-21: the contract's `direction` is a `string` with its doc naming the three vocabularies and the rule that the consumer resolves it against the ways it knows; all three casts are gone. No story in the corpus writes a `means` line, so no author vocabulary was ever squeezed by the literal unions beside it.
- **Flammable was missing from the setting schema (Phase 6); `attached to` had a bespoke anchor check (Phase 8).** The schema's keyless entity-ref rows are what make the compiler check `<adjective> with the <thing>` names. Flammable was never added (only the loader caught a bad name), and I wrote `attached to`'s check by hand beside the mechanism. Fixed 2026-10-15: `flammable`, `attached`, `light-source` and `powered` are schema rows; the hand-written check is gone.
- **Two tailed clauses on one owner refused as duplicates (Phase 7).** The duplicate gate keyed clauses without their tail while the runtime gated each on its own. The tail is now part of the key.
- **"Gives light" read three ways.** `VisibilityBehavior.isLightActive` copied `LightSourceBehavior.isLit`, and `canSee`'s and `getVisible`'s dark branches read `isLit` raw. All now call `LightSourceBehavior.givesLight`, which also honours power.
- **Delegation plumbing in one action only.** Inserting carried the D6-B seam inline; lighting and extinguishing needed it too. Extracted to `delegation-shared.ts`; the call-site guard now checks delegating actions call it and nothing else.
- **The sound event type was a duplicated literal.** The engine and stdlib each spelled `'sound.audibility.heard'`. Both now import `SOUND_EVENT_TYPES` from if-domain.
- **Power as a stored flag nobody set.** `SwitchableTrait.hasPower` was written only by an uncalled `setPower`; ADR-374 D10 derives it from containment instead of adding a second power model on the light.
- **A derived-runner claim on a superseded write.** A body that moves one thing twice was claimed for both moves; only the last write is now a claim.
- **Which actions cause a break was written twice and declared nowhere (Phase 8).** The derived runner kept a `CONSEQUENCE_CAUSES` table and the stdlib call-site test a `BREAKING_CAUSES` list; the descriptor said only `firedAsConsequence: true`. Fixed 2026-10-15: the breaking descriptor declares `contracts.firedAsConsequence.causes` (`stdlib/src/actions/standard/breaking/breaking.ts`); the call-site test holds the callers to it and the runner types its first cause through `lifecycleDescriptorFor`. Both copies are gone.
- **Five more lamps modelled as `states: dark, lit` (test fixtures).** After the first two, three more fixtures (`branch-tester` derived `skip.story` and `state-pins.story`, `devkit` `derived-skip.story`) and the tests and cards asserting on them used the same shape. I first reported the first two as "the whole cost in the corpus" after searching only chord and story-loader — a claim made from a partial search. All reworked to a bell (`still, ringing`), 2026-10-15.
- **Placement list "one name with `and`" guess (Phase 9, chord `analyzer/entity/placement.ts`).** The first cut tried the joined name as one entity before splitting. Removed 2026-10-15: `and` separates places as it separates names in every Chord name list, and a thing with `and` in its name is reached by its alias.
- **A lamp modelled as `states: dark, lit` (two test fixtures).** Found by ADR-374 D8; the fixtures were storage tests, reworked to a bell (`still, ringing`). The real lamp — lit and put out, powered by a battery — is ADR-374 D9/D10.
- **A second sound model (ADR-374 D6 first draft).** A new `ListenerTrait` and a same-room hearing rule beside ADR-172's. Withdrawn before code; the revision rides on ADR-172.

## Aligned

- **Sound (ADR-374 D6).** Rides ADR-172: the existing `ListenerTrait`, propagation and dispatcher; one gathering rule for `sound.emitted`; heard events applied by the same `withWorldReactions` the executor uses. `play-sound` is its own IR statement because it now has world semantics.
- **Lamps (ADR-374 D9, D10).** Lighting calls `LightSourceBehavior.light`/`.extinguish` (existing, previously uncalled); power lives on the switchable device; the tool rule is tool-shared.ts's.
- **One presence predicate (ADR-374 D1).** `PresenceBehavior` answers for doors and backdrops; the door's three hand-copied checks (`WorldModel` scope rule, `VisibilityBehavior.canSee`, `.getVisible`) now read it. Reachability needed no change: it delegates to `canSee`.
- **`can see` / `can reach` (ADR-374 D4).** The evaluator calls `world.canSee` / `world.canReach`, retiring a co-location stand-in.
- **Night vision for the observer's own view (ADR-374 D5).** One function, `VisibilityBehavior.isDarkFor`, read by looking, arrival and perception; `isDark(room)` unchanged.
- **Phase 8 (ADR-373).** Attachment and breakage live on traits and behaviors; breaking is one lifecycle id fired by its causes; tying uses the ADR-372 counterpart tail. To be re-read in full at the audit.
