Yes — and they'd say different things, which is the useful part.

## Evans: the language is real, but the class speaks two of them

The ubiquitous language here is genuinely strong, and that's rarer than it should be. `Story`, `WorldModel`, `Actor`, `Turn`, `Room`, `prologue`, `narrativeSettings`, `openExchange`, `spliceHeldCommand`, `offerToOpenExchange`. An IF author could read those method names and know what they do. Evans would notice that immediately and say the model has a real domain behind it.

What he'd flag is that `GameEngine` speaks two dialects at once. One is IF: story, player, turn, exchange, prologue. The other is plumbing: `emitChannelPacket`, `systemEventSource`, `platformOperationHost`, `IEventProcessorWiring`, `soundBuffer`, `pendingPlatformOps`. When one class fluently speaks two languages, that's usually two classes and the seam between the dialects is a seam in the model.

He'd also flag names that lie. `setStory` doesn't set a story — it loads, validates, builds a world, resolves a protagonist, seeds capabilities, and fires lifecycle events. If you and Paul said "loading a story" out loud, the code should say `loadStory`, or better, the operation should be a thing rather than a method. `start()` has the same problem in miniature.

**Behavior displacement.** `switchPlayer` reaches into `oldPlayer.get('actor').isPlayer = false`, sets the new flag, moves vocabulary, calls `world.setPlayer`, then syncs. "Who is the player" is a world invariant, and the engine is enforcing it from outside. Likewise `validateRoomSnippets(world)` and `validateCombatantHealth(world)` — those are world invariants audited by free functions after the fact, rather than protected by the thing that owns them. Contrast `HealthBehavior.isAlive(health)`, which is the right shape.

**The missing value objects.** `initialStoryInfo: Record<string, unknown>` assembled field-by-field with a precedence rule; `session` built twice inline in `stop()`; `parsedCommand: any`; three ad-hoc id schemes. Evans's tell for a missing value object is exactly this: a bag of primitives assembled repeatedly under rules that live nowhere. And note that the storyInfo bug I flagged last time is precisely what he'd predict — an invariant ("config wins, trait fills gaps") expressed twice, differently, in two methods. A `StoryInfo` value object with a merge factory can't contradict itself.

**Supple design.** `TURN_STAGES` / `META_STAGES` is declarative pipeline design and it's the healthiest thing in the file — that's the direction Evans's "Declarative Style of Design" points to. Against that: the code uses prose where it wants assertions. `"IMPORTANT: Save and clear pending ops at START to prevent infinite recursion"` is an invariant guarded by comment and line order.

## Vernon: this is a context-integration problem, not a class-size problem

Vernon starts with the context map, and the import block *is* one: `world-model`, `stdlib`, `if-domain`, `event-processor`, `channel-service`, `text-blocks`, `plugins`, `core`. Those are real bounded contexts, properly packaged. Good.

His diagnosis would be that `GameEngine` isn't 2100 lines because it does too much domain work — it's 2100 lines because it is simultaneously the **anticorruption layer**, the **open host service**, and the composition root for every one of those edges.

The ACL is the clearest case. You have `hasWorldContext`, `hasPronounContext`, `hasPlatformEventEmitter`, `hasNarrativeSettings`, plus the raw cast in `registerBlockedReferent` — five structural probes because the `Parser` port was never defined. And `updateCommandHistory`'s V1/V2 `ParsedCommand` branching with `as unknown as` is an anticorruption layer inlined into a domain method. Vernon's move: one adapter that normalizes the parser at construction, and the engine talks to one shape forever.

**Aggregate rules.** He'd probably *defend* `WorldModel` as a large aggregate, which is worth saying — single-player, turn-based, no concurrency, and the turn genuinely is the transaction. That's one of the few domains where the big aggregate is honest.

But he'd be hard on player identity. Your own doc comment enumerates the problem: "Synchronizes all three player identity layers: `ActorTrait.isPlayer`, `WorldModel.playerId`, `GameContext.player`." Three representations of one identity kept aligned by a procedure. Reference by identity — one canonical id, everything else derives — and `syncPlayerState` stops needing to exist. `drainPlayerSwitch`'s "two requests in one turn is a story bug, first wins" is a second-order symptom of the same thing (though the conflict policy itself is well judged, and reporting the contradiction rather than silently taking the last is right).

**Application service vs. domain.** This is his sharpest cut here. An application service should be thin: acquire input, coordinate, return. `executeTurn` already *is* that — eleven lines, builds a context, delegates to stages. That's the target shape. Then look at `setStory` (175 lines of domain sequencing) and `introspect()` (125 lines) sitting in the same class. `introspect()` in particular is a **read model** — CQRS query side, a pure projection over world + registry + language for tooling. Vernon gives that its own chapter and would not let it share a class with the write model.

**Ports.** `platformOperationHost()` is a properly designed port: eight members, role-named, getter for the volatile bit. `turnEngine()` is thirty members handing out live mutable `world`, `context`, `turnEvents`, `soundBuffer`, `pendingPlatformOps`. Same file, same author, same week — one is hexagonal, the other is a key to the house. Worth asking what was different about the thinking on those two.

**Event publishing.** The event naming is better than most — `game.pc_switched` past tense for facts, `if.event.player.switch_requested` for commands. Vernon would like that distinction. What he'd object to is five emission paths (`emit`, `eventSource.emit`, `systemEventSource.emit`, `platformEvents.addEvent`, `emitGameEvent`) and three near-duplicate enrich → store → emit dances in `emitGameEvent`, `processPluginEvents`, and `processPlatformOperations`. You've already half-built the publisher — `enrichTurnEvents` is the shared funnel and the comment calls it "the one enrichment funnel." Finish it.

## The breakthrough they'd both push you toward

Look at what these fields have in common: `sessionStartTime`, `sessionTurns`, `sessionMoves`, `masterSeed`, `randomService`, `clientCapabilities`, `channelService`, `running`, `heldCommand`, `turnEvents`, `soundBuffer`, `context.currentTurn`, `context.history`.

That's one concept — a **Session**: one playthrough of one story on one client. And `start()` / `stop()` / `resume()` are its lifecycle, not the engine's.

The tell Evans would jump on: the word is *already in your ubiquitous language*. It's in three field names. It just isn't a class. That's his classic signature for a concept that's been discovered but not yet modeled — the language runs ahead of the model, and the code strains until you let it catch up.

Make `GameEngine` (or `Runtime`) the thing that can run stories, and have it produce a `Session` from a `Story` + `ClientCapabilities`. Watch what falls out:

- `resume()` stops being strange — a Session is running or it isn't; no inferring "was started" from whether `channelService` happens to exist
- The five `start()` guards vanish; a Session can't be constructed half-built
- Two stories in one process stop fighting over the module-global `channelRegistry`
- Save/restore becomes "serialize a Session," which is what it has always actually been
- `setStory`-twice and `start`-twice stop being questions

Two smaller concepts want to be born alongside it: **StoryInfo** as a value object (which kills the precedence bug outright), and **PlayerRole** as a single-representation concept (which dissolves `syncPlayerState`).

One last thing Evans would say gently. The file is annotated with the history of its own refactoring — "Phase 4 remediation," "Phase 5," "extracted services." That's evidence of real discipline, and the extractions were the right ones. But when code documents its refactoring phases rather than its model, it usually means the breakthrough hasn't landed yet — you've been relieving pressure rather than finding the concept that removes it. `Session` looks like that concept.