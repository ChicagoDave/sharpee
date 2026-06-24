# Clarity review — Chapter 22: Turns, Timed Events & Daemons

Flags: 1

### 1. "Daemons — run every turn" / closure-state note — vague transition
WHY: "A few things to notice." is an empty lead-in that announces a list without naming what matters; the substantive point (closure state survives save via getRunnerState/restoreRunnerState) follows and can carry the sentence.
OLD: A few things to notice. The daemon keeps its own state (`announcementCount`) in
the closure, and exposes `getRunnerState`/`restoreRunnerState` so that state
survives a save and reload.
NEW: The daemon keeps its own state (`announcementCount`) in the closure, and exposes `getRunnerState`/`restoreRunnerState` so that state survives a save and reload.
