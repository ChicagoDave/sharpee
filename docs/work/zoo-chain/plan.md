# Zoo Chained Walkthrough + Enabling Platform Fixes

**Origin**: David, 2026-07-12 — "Chained walkthrough testing is required."
Investigation found cloak/zoo gates were always atomic (no chained
conversion ever landed); David scoped the work: **zoo only**, existing
wt files renumbered into ONE sequential chain (frozen excluded files
relocated, byte-identical). Building the full playthrough surfaced three
latent platform defects that cap the zoo score at 75/85; David chose
**fix platform first, then chain** (AskUserQuestion, 2026-07-12 — this
answer IS the phase sequencing; no separate re-plan).

## Phase F1 — platform fixes (stdlib + story-loader; David-approved)

1. **taking.ts half-wired interceptors**: pre/postValidate called,
   postExecute/postReport never — `after taking it` bodies silently
   skipped (zoo map's `award collected` dead). Fix: invoke both in the
   execute/report phases, mirroring reading's full ADR-118 contract.
   Follow-up (not this phase): audit other standard actions for the
   same gap.
2. ~~Dispatch actions without `otherwise refuse` never parse~~ —
   **RE-DIAGNOSED, no grammar bug**: the verbs always parsed
   (bootstrap:99 calls extendParser). The failure was the dispatch-miss
   path: no behavior host + no `otherwise` → error id `cant`, which
   renders as the parser-confusion text "I don't understand that."
   (proof: pE.story — adding an `on photographing it` trait host makes
   `photo gnome` work verbatim). Folds into fix 3; the misleading
   `cant` rendering is noted, not fixed here.
3. **Dispatch-action bodies + action-level musts unwired**
   (buildDispatchAction runs refusals + the matched behavior only;
   def.body and def.musts are dead). Fix: musts evaluated in validate
   (slots ctx); body executes mutations/reports phases w/ decisions
   snapshot; behavior becomes OPTIONAL when the action carries its own
   body/musts (photographing has no behavior host by design).

Each fix lands with unit tests asserting on state (Behavior Statements
first), then the zoo full-playthrough score reaches 85/85.

### F1 implementation (2026-07-12)

- **Fix 1 SHIPPED**: taking.ts invokes postExecute (after the transfer,
  single + per-item multi) and postReport (applyInterceptorReportResult:
  override rewrites if.event.taken, emits append). Multi-object now
  captures interceptor + phase data PER TakingItemResult (the shared
  fields were last-item-wins). 3 new tests in taking-golden
  (state-asserting: interceptor world mutation persists, override/emit
  land, no-interceptor unchanged) — stdlib 1317/1317 + 27 skip.
- **Fix 3 SHIPPED**: buildDispatchAction evaluates def.musts in validate
  (slots ctx, first failure = its phrase key), runs the body's
  findRefusal + decision snapshot, executes def.body in
  mutations/reports phases via actionBodyCtx (slots bound, no `it`),
  and a behavior host is optional when a body exists (dispatch miss
  only when NEITHER). New action-body.test.ts (4 tests): must gate w/
  zero mutation, body award in execute + dedup, phrase report, and an
  `each` block in an action body over the pre-mutation snapshot
  (swept-note ×3 with the live set empty) — story-loader 103/103.
- Follow-ups noted, NOT done here: audit other stdlib actions for
  validate-only interceptor wiring; the `cant` dispatch-miss fallback
  renders as parser-confusion text; phrase params from grammar slots
  (`{the target}` in took-photo) not yet plumbed into rendering.

## Phase F2 — the chained walkthrough

- walkthroughs/wt-01…wt-05 as ONE sequential chain (arrival → aviary/
  gift shop → petting zoo → staff area/nocturnal → after-hours finale,
  `score` 85/85 as the last assertion), absorbing old wt-01-smoke /
  wt-04-optional / wt-05-choice-cycle coverage (incl. the parrot
  save/restore cycle proof).
- Frozen excluded files (wt-02-slot-occupants, wt-03-slot-detail) move
  byte-identical to walkthroughs/excluded/ + dated note in
  docs/work/chord-phase-b/zoo-gate-audit.md.
- New zoo gate definition: 5 atomic tests/transcripts files + the
  chained wt run (`--chain walkthroughs/wt-*.transcript`); recorded
  here, in the session file, and in the friendly-zoo memory note.
- Timeline pins observed empirically (PA at turns 5/10/15/20, feedings
  11/19/27/35, after-hours at 20, same-turn closing confessions,
  witnessed-only keeper farewell): assertions are contains-based so
  broadcast lines and random parrot chatter never need absence checks.

## Status

- F1: COMPLETE (2026-07-12) — see "F1 implementation" above. Also
  shipped: phraseEvent binds grammar-slot entity names as params, so
  `{the target}` templates render ("Click! You snap a photo of the
  pygmy goats."). Full regression green: stdlib 1317+27skip,
  story-loader 103, chord 176, ide-protocol 11, devkit 26+1skip;
  Cloak 81/81; zoo atomic files green; Dungeo units 1691/9xf/4skip +
  chain 874 (counts flex with combat RNG; one-good-run rule).
  Verified e2e: zoo full playthrough scores **85/85** (first time the
  max score has ever been reachable).
- F2: COMPLETE (2026-07-12) — walkthroughs/wt-01…wt-05 are one chained
  full playthrough (37 assertions, `--test --chain
  walkthroughs/wt-*.transcript`, green), absorbing the old
  smoke/optional/choice-cycle coverage incl. the parrot save/restore
  cycle proof. Frozen excluded pair moved byte-identical to
  walkthroughs/excluded/ (outside the chain glob). Old wt variants
  retired (git rm, David-approved renumbering). Gate-audit addendum
  appended with the new gate definition and the save/restore
  turn-arithmetic pin (engine turns don't rewind; world pointers do —
  post-restore broadcasts land one command earlier).
