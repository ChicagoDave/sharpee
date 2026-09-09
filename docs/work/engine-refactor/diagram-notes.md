Built the module graph while thinking about it, and it already paid: **three import cycles**, all type-only in one direction (so no runtime cycle), and each one points at a type filed in the wrong place.

- **`turn ↔ game-engine`** — `turn/context.ts` imports `type { GameEngineEvents }` from the facade. That event map isn't facade state; move it to `events/` or `types.ts` and the cycle's gone.
- **`install ↔ ports`** — `ports/language-provider-interface.ts` imports `type { NarrativeSettings }` from `install/narrative/`. This is the real layering inversion: a port for a collaborator contract depending on the installation module. `NarrativeSettings` isn't an install concern — it's used at install time *and* at prose-render time. It wants to be a shared type, not an install-owned one.
- **`install ↔ game-engine`** — `install/story.ts` imports `type { GameEngine }`, because `Story.onEngineReady(engine: GameEngine)` names the concrete class. That's the substantive one. It's a third seam alongside `TurnEngine` and `PlatformOperationHost`, and it's the only one that never got a role interface — the story contract currently gets the whole engine, ~40 public members, when it needs maybe six. Same question you already answered well twice.

First two are file moves. The third is a small ADR.

On diagrams, I'd rank them by whether drawing one can *fail* — a diagram that can only confirm what you know is documentation, and you have ADRs for that:

1. **Module dependency graph, cycles highlighted.** The one above. Worth having as a picture *and* as a test — you already have order tests for `TURN_STAGES` and `STORY_INSTALL_STEPS`; a layering test in the same idiom ("`ports` may not import `install`", "nothing may import `game-engine`") fails by name and keeps the reorg from eroding. That's the highest value right now because the boundaries are one week old.
2. **Install-step DAG.** 25 steps in a line, but only some of those edges are real constraints — the rest is incidental sequence. Drawing the actual dependencies from the rule-9 headers shows how much reordering freedom exists, and where the order test is load-bearing versus arbitrary. This is the one most likely to surprise you.
3. **The lifecycle seam.** Assembly (constructor → `installStory`) above the line, playthrough (`start` → turns → `stop`/`resume`) below, and what state crosses. That's the deferred Session ADR as a picture, and it would make the decision concrete rather than theoretical.
4. **Event sinks × producers.** Five destinations — listeners, `eventSource`, `systemEventSource`, `platformEvents`, the `turnEvents` map — against who writes to each. Tests whether that taxonomy is a model or an accident, which is the question under the publisher item you left open.

The turn pipeline itself I'd skip — `stages.ts` plus the order test already says it, and a diagram would just restate them.

Want me to build 1–4 as a single page you can keep and re-run the graph against later? The module graph is generated from the code, so it can be regenerated rather than hand-maintained.