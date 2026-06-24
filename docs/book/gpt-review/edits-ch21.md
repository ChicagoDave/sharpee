# Ch 21 — Scenes: edit proposals

Em-dash removal throughout, plus one spot where a colon reads more naturally than
a dash. The prose is otherwise plain and well-paced; left it alone.
Each entry: location, reason, OLD → NEW.

---

### 1. Opening paragraph — emdash
OLD: Stories have *phases* — a
storm that rolls in and passes, a market that's busy by day, a tense stretch while
an alarm blares.
NEW: Stories have *phases*: a
storm that rolls in and passes, a market that's busy by day, a tense stretch while
an alarm blares.

### 2. "What a scene is" — emdash (two in one paragraph)
OLD: You give it two
conditions — when it should *begin* and when it should *end* — and the engine
checks them every turn, flipping the scene between three states:
NEW: You give it two
conditions, when it should *begin* and when it should *end*, and the engine
checks them every turn, flipping the scene between three states:

### 3. "While a scene is active" — emdash
OLD: You don't poll or schedule anything yourself — you describe the
window, and the engine manages the lifecycle.
NEW: You don't poll or schedule anything yourself. You describe the
window, and the engine manages the lifecycle.

### 4. "Creating a scene" — emdash (list of methods)
OLD: The scene
methods — `createScene`, `isSceneActive`, `hasSceneHappened`, `hasSceneEnded` — are
all on the `WorldModel` you already have in scope; the one symbol you import is
`SceneTrait` (used later to read a scene's `activeTurns`), from `@sharpee/world-model`.
NEW: The scene
methods (`createScene`, `isSceneActive`, `hasSceneHappened`, `hasSceneEnded`) are
all on the `WorldModel` you already have in scope; the one symbol you import is
`SceneTrait` (used later to read a scene's `activeTurns`), from `@sharpee/world-model`.

### 5. "The begin and end options" — emdash
OLD: The `begin` and `end` options are predicates over the world — each returns `true`
when its moment has come.
NEW: The `begin` and `end` options are predicates over the world; each returns `true`
when its moment has come.

### 6. "recurring: true lets the scene reactivate" — emdash
OLD: `recurring: true` lets the scene reactivate — leave the petting zoo and come back,
and it begins again.
NEW: `recurring: true` lets the scene reactivate: leave the petting zoo and come back,
and it begins again.

### 7. "Reacting to transitions" — emdash
OLD: The real power is reacting to the *edges* — the moment a scene begins or ends.
NEW: The real power is reacting to the *edges*: the moment a scene begins or ends.

### 8. "Each callback returns the text" — emdash
OLD: Each callback returns the text the player
should see at that edge — either prose directly (`{ text }`) or a message id resolved
through your language file (`{ messageId }`):
NEW: Each callback returns the text the player
should see at that edge, either prose directly (`{ text }`) or a message id resolved
through your language file (`{ messageId }`):

### 9. "The callback receives a typed context" — emdash (two in one sentence)
OLD: The callback receives a typed context — `sceneId`, `sceneName`, `turn`, the `world`,
and (on `onEnd`) `totalTurns`, how long the scene ran — so you can vary the line:
NEW: The callback receives a typed context (`sceneId`, `sceneName`, `turn`, the `world`,
and, on `onEnd`, `totalTurns`, how long the scene ran), so you can vary the line:

### 10. "Return nothing for a state-only beat" — emdash
OLD: open a sequence when a scene begins, close it down
when the scene ends — and because the reaction is part of the scene definition, the
condition and its payoff sit together.
NEW: open a sequence when a scene begins, close it down
when the scene ends; and because the reaction is part of the scene definition, the
condition and its payoff sit together.

### 11. "Common shapes" list — emdash (three bullets)
OLD: - **Location-based** — active while the player is somewhere, as above; `begin` and
  `end` test the player's room. Usually `recurring`.
- **One-shot trigger** — `begin` watches a flag (`w.getStateValue('alarmTripped')`)
  and `end` fires after a turn or two, so the beat plays once and never returns.
- **Timed** — `end` checks how long the scene has run.
NEW: - **Location-based**: active while the player is somewhere, as above; `begin` and
  `end` test the player's room. Usually `recurring`.
- **One-shot trigger**: `begin` watches a flag (`w.getStateValue('alarmTripped')`)
  and `end` fires after a turn or two, so the beat plays once and never returns.
- **Timed**: `end` checks how long the scene has run.

### 12. "Scenes versus timed events" — emdash (two in one paragraph)
OLD: The next chapter covers **daemons** and **fuses** — per-turn machinery for things
that *do* something each turn or fire after a countdown.
NEW: The next chapter covers **daemons** and **fuses**: per-turn machinery for things
that *do* something each turn or fire after a countdown.

### 13. "A common division of labor" — emdash
OLD: a scene that defines the window and a daemon
that does the per-turn work *while* that window is open — the daemon simply checks
`world.isSceneActive(...)` in its condition.
NEW: a scene that defines the window and a daemon
that does the per-turn work *while* that window is open; the daemon simply checks
`world.isSceneActive(...)` in its condition.

### 14. Key takeaway — emdash
OLD: Scenes are how you
think in story beats rather than individual turns — the staging layer over the
moment-to-moment world.
NEW: Scenes are how you
think in story beats rather than individual turns: the staging layer over the
moment-to-moment world.
