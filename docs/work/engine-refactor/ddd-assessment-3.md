Read it. It's a better plan than my review deserved — the Phase 4 design constraint is stated more checkably than I stated it, and catching the `@sharpee/story-loader` name collision is a save I'd have walked straight into. Six things, in value order.

**1. Phase 2's unified rule is probably wrong for `buildDate`.** The plan sets the rule as "config wins; trait fills gaps; `engineVersion`/`clientVersion` always from the trait." But `refreshStoryInfoCapability`'s own header says it exists to pull in "build-pipeline metadata (engineVersion / clientVersion / buildDate) that may have been patched onto the trait between `setStory()` and here." `buildDate` is named there as build-pipeline metadata, and today refresh does make the trait win for it. Putting it on the config-wins side contradicts the documented reason refresh exists.

The rule that falls out of the code's own comments is three-way, not two:

- authored fields (`description`, `title`, `authors`, `version`, `ifid`, `testers`) — config wins, trait fills gaps
- build-pipeline fields (`engineVersion`, `clientVersion`, `buildDate`) — trait wins, because the trait is where late patches land
- `prologue` — resolved, neither

Worth settling before writing the module, since the whole point of Phase 2 is that the rule gets one home.

**2. Phase 2's gate check reads Dungeo only.** The caveat cites `dungeo/src/index.ts:217` masking the defect, but the gate is Dungeo plus three Chord trees. If any of those three sets a trait description that differs from its config, unifying flips output there and the caveat fires. Check all four before assuming byte-identical — it's a grep, and it decides whether Phase 2 lands or becomes a conversation.

**3. Phase 2 holds the plan's only stop-and-escalate branch, and it's scheduled behind the largest phase.** I take the argument for Phase 1 first — it shrinks the file everything else edits and kills the line drift you're already annotating around. But Phase 2 is the one place where the honest outcome might be "stop, this is a content decision." Discovering that on day one costs 250; discovering it after Phase 1 means 400 units of unrelated work are sitting in front of a stalled plan. Phases 2 and 3 don't touch anything in the seventeen bodies, so they're independent either way. I'd run Phase 2 first for risk discovery, then Phase 1, then 3 → 4 → 5.

**4. Phase 5(g) isn't small stuff, and it may be a false DRY.** The three sequences aren't the same operation:

- `emitGameEvent` — no enrichment, emit → store
- `processPluginEvents` — enrich → store → eventSource + platform-request collection → `config.onEvent` → emit
- `processPlatformOperations` — eventSource → store → emit, inside a dispatcher callback

They differ in enrichment, in platform-request collection, and in whether `config.onEvent` fires. A single `publish(event, turn)` either takes flags for all three — at which point it isn't one operation — or it changes ordering and side effects for at least two callers, under a byte-identical gate. What's actually shared may be only the last two lines. I'd pull (g) out of the batch, verify how much genuinely overlaps, and gate it on its own; the other seven items in Phase 5 really are additive.

**5. Phase 5(a) has a public-surface question hiding in it.** `getParser()`, `getLanguageProvider()`, and `getTextService()` return `T | undefined`. If the backing fields go non-optional, do the getters tighten? If yes, that's a signature change on public members and it needs the same AC-5 treatment you're giving the `setStory` rename. If they keep `| undefined`, say so in the deliverable so it doesn't get "cleaned up" mid-phase.

**6. Phase 6's discussion doesn't have to wait for Phase 5.** It's the only phase gated on someone agreeing rather than on code, and it's last. Opening that conversation now, in parallel, costs nothing and keeps the plan from stalling at the finish line on a scheduling problem rather than a technical one.

One small addition: the plan is motivated by "still 2120 lines" but never says what number counts as done. An expected end state — even a rough one — makes the whole thing falsifiable at close rather than a judgment call.