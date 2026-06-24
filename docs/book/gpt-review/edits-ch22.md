# Ch 22 — Turns, Timed Events & Daemons: edit proposals

Em-dash removal in prose and code comments. The chapter is clear; left the working
prose alone. Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: A living world doesn't only react to the player — it has a clock of its own.
NEW: A living world doesn't only react to the player. It has a clock of its own.

### 2. "How the scheduler ticks" — emdash (two in one sentence)
OLD: A **daemon** is a function
that runs each turn — a background process, a ticking clock. A **fuse** is a
countdown timer that fires once when it reaches zero, optionally re-arming to fire
again.
NEW: A **daemon** is a function
that runs each turn: a background process, a ticking clock. A **fuse** is a
countdown timer that fires once when it reaches zero, optionally re-arming to fire
again.

### 3. "Registration follows the same pattern" — emdash (two in two sentences)
OLD: Registration follows the same `onEngineReady()` pattern as the NPC plugin — and in
fact lives in the *same* `onEngineReady`, alongside the NPC registration from
Chapter 20. The daemon `run` functions return `ISemanticEvent[]`, and one reads an
`IdentityTrait`, so the imports grow a little:
NEW: Registration follows the same `onEngineReady()` pattern as the NPC plugin, and in
fact lives in the *same* `onEngineReady`, alongside the NPC registration from
Chapter 20. The daemon `run` functions return `ISemanticEvent[]`, and one reads an
`IdentityTrait`, so the imports grow a little:

### 4. "Both daemons and fuses receive" — emdash
OLD: Both daemons and fuses receive a `SchedulerContext` — `{ world, turn, random,
playerLocation, playerId }` — giving them the turn number, the world, and where
the player is.
NEW: Both daemons and fuses receive a `SchedulerContext` (`{ world, turn, random,
playerLocation, playerId }`), giving them the turn number, the world, and where
the player is.

### 5. "Daemons — run every turn" section heading — emdash
OLD: ## Daemons — run every turn
NEW: ## Daemons: run every turn

### 6. Code comment "low — runs after" — emdash
OLD: `    priority: 5,                    // low — runs after more important daemons`
NEW: `    priority: 5,                    // low; runs after more important daemons`

### 7. Prose "Daemon events here use" — emdash (two in one paragraph)
OLD: Daemon events here use `type: 'game.message'` with a
`messageId` and `narrate: true` — that's the right form for scheduler output,
which the engine narrates as ambient text. (Contrast this with the chain handlers
in *Event Handlers*, which must avoid `game.message` because there it would
override the action's own text. Different context, different rule.)
NEW: Daemon events here use `type: 'game.message'` with a
`messageId` and `narrate: true`, which is the right form for scheduler output,
which the engine narrates as ambient text. (Contrast this with the chain handlers
in *Event Handlers*, which must avoid `game.message` because there it would
override the action's own text. Different context, different rule.)

### 8. "The mistake everyone makes once" (daemon) — emdash
OLD: Use a `condition` to control timing — a turn
modulus, a world-state flag, whatever fits.
NEW: Use a `condition` to control timing: a turn
modulus, a world-state flag, whatever fits.

### 9. "Conditional daemons — react to state" section heading — emdash
OLD: ## Conditional daemons — react to state
NEW: ## Conditional daemons: react to state

### 10. Code comment "Ambient sound — only heard" — emdash
OLD: `      // Ambient sound — only heard if the player is in the petting zoo`
NEW: `      // Ambient sound, only heard if the player is in the petting zoo`

### 11. "Returning an empty array" — emdash
OLD: Returning an empty array is how a daemon stays silent on a given turn while still
having run — here, the goats only bleat *aloud* if the player is around to hear
them.
NEW: Returning an empty array is how a daemon stays silent on a given turn while still
having run. Here, the goats only bleat *aloud* if the player is around to hear
them.

### 12. "Fuses — count down and fire" section heading — emdash
OLD: ## Fuses — count down and fire
NEW: ## Fuses: count down and fire

### 13. "The mistake everyone makes once" (fuse) — emdash
OLD: A newly set fuse skips its first tick, so it
fires about *eleven* ticks after registration. If precise timing matters, count
from the skip — or test it and adjust `turns`.
NEW: A newly set fuse skips its first tick, so it
fires about *eleven* ticks after registration. If precise timing matters, count
from the skip, or test it and adjust `turns`.

### 14. "If your story already has an extendLanguage" — emdash
OLD: (If your story already has an `extendLanguage` from earlier chapters, add these
lines to it — a story has just one.)
NEW: (If your story already has an `extendLanguage` from earlier chapters, add these
lines to it; a story has just one.)

### 15. "Try it" block comments — emdash (two lines)
OLD: `> wait                      (repeat ~5 times — the first PA announcement crackles)`
`> feed goats                Feed them — but the bleating runs on its own timer`
NEW: `> wait                      (repeat ~5 times; the first PA announcement crackles)`
`> feed goats                Feed them, but the bleating runs on its own timer`

### 16. "The bleating ends" paragraph — emdash (three in one paragraph)
OLD: The bleating ends when the daemon's three-turn countdown reaches zero — *not*
because you fed the goats. The feeding action (Chapter 14) records that the goats
were fed; it never touches `zoo.feeding_time_active`, which is the only state the
daemon watches. If you *wanted* feeding to silence them early, you'd add an event
handler on the feed action that clears that flag — a nice exercise, but the
scheduler's own countdown is doing the stopping here, exactly as the conditional
daemon above ("counting itself down and stopping") was built to do.
NEW: The bleating ends when the daemon's three-turn countdown reaches zero, *not*
because you fed the goats. The feeding action (Chapter 14) records that the goats
were fed; it never touches `zoo.feeding_time_active`, which is the only state the
daemon watches. If you *wanted* feeding to silence them early, you'd add an event
handler on the feed action that clears that flag. That's a nice exercise, but the
scheduler's own countdown is doing the stopping here, exactly as the conditional
daemon above ("counting itself down and stopping") was built to do.
