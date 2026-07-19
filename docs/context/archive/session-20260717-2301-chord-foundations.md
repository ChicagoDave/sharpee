# Session Summary: 2026-07-17 23:01 — chord-foundations (session d2863f)

## Goals
- Draft the areas child ADR (ADR-235 D4 ruling) — David picked it over the ADR-215/216 impl plan, doors impl plan, and troll-GDT ruling.

## Key decisions
- **Naming**: David clarified the surface reuses the platform name `region` (not "area" — that was the working name in ADR-235 D4/ADR-233 G1).
- **Interview complete (all 4 ruled by David)**: Q-1 memberless region = hard load error (no warning tier); Q-2 ambient properties stay unsurfaced (deferral confirmed — consumption is its own future conversation); Q-3 crossing reactions in-gate BOTH sides (`after entering it` + new `leaving` event verb, ratchet R3); Q-4 story-level daemon designed in — `on every turn` in the story header block's indented body (alongside states/scores), story-owned, no presence gate, `it` unbound → compile error (ratchet R4).
- **adr-review**: 14/14 (1 N/A), verdict READY after 3 small wording fixes applied pre-flip (D7 diagnostic new-but-in-class not existing; clause home pinned to story header body; Consequences four-homes arithmetic).

## Work log
- Recap presented; pre-session audit all clear (branch even with origin, type check clean); project profile fresh (2026-07-16).
- Three parallel scouts grounded the ADR: ADR-149 region machinery fully shipped (RegionTrait nesting, createRegion/assignRoom/isInRegion/getRegionCrossings, going.ts crossing events, scheduler daemons); two honest gaps (ambient props stored but zero consumers; dungeo forest daemon still hardcodes room-ID sets despite reg-forest); Chord has zero region surface; daemon substrate = owner-attached `on every turn` clauses lowered in buildSchedulerDaemons (D11 presence rule); EVENT_VERBS = {entering} only.
- **ADR-236 drafted** (adr-236-chord-regions.md, DRAFT, 4 open questions; David clarified naming — reuse the platform name `region`, "areas" was only the working name; file renamed from -areas): D1 `region` kind noun (entity-backed, createRegion/assignRoom seam, no placement lines); D2 `containing <list>` region-side membership, only form, never-guess gates (unresolved/non-room member, double membership, memberless region); D3 nesting via regions-in-containing (parentRegionId, cycle gate, zero new grammar); D4 daemon leg = existing `on every turn` clause region-owned, presence = isInRegion(player, region) transitive; D5 ambient props NOT surfaced (no consumer — behavior-hatch precedent); D6 crossing reactions grounded (`entering` exists, `leaving` would be catalog growth) but open; D7 story-level daemon open by ruling; D9 ratchet R1-R4; D10 AC-1..6.
- ADR-233 G1 areas line now links ADR-236.
- **ADR-236 ACCEPTED** (David: "accept"). ADR-233 G1 link updated to ACCEPTED; chord-go-live plan.md Phase 5 status notes the regions ADR landed and its implementation plan is the remaining regions workstream.

## Status: COMPLETE

## Next session
- Regions implementation plan (from ADR-236) — new launch workstream before G4.
- ADR-215/216 (S3) implementation plan — the other pre-G4 workstream. Doors (ADR-234) implementation plan also queued.
- Troll-GDT combat-RNG flake ruling still open (3 of last 4 sessions).
