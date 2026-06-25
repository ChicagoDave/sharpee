# Em-dash review — Chapter 30: Saving and Restoring

### 1. State lives in the world paragraph (line 18) — prose paragraph

OLD:
Because your game state is *in* the world rather than in loose variables scattered
through your code, restoring is just rebuilding the world from that snapshot. Score,
entity positions, container contents, state flags, relationships, the ID counters —
all of it comes back, because all of it was in the world to begin with. The author
who kept state in the world (as every earlier chapter taught) gets save/restore for
free.

NEW:
Because your game state is *in* the world rather than in loose variables scattered
through your code, restoring is just rebuilding the world from that snapshot. Score,
entity positions, container contents, state flags, relationships, the ID counters:
all of it comes back, because all of it was in the world to begin with. The author
who kept state in the world (as every earlier chapter taught) gets save/restore for
free.

### 2. Closure variable not in the world paragraph (line 44) — prose paragraph

OLD:
That `behaviorSwapped` variable lives in a closure, **not** in the world — so the
world snapshot doesn't capture it. Save after the swap, restore, and a naïve daemon
would think the swap hadn't happened and try to run again. The daemon avoids that by
implementing two hooks:

NEW:
That `behaviorSwapped` variable lives in a closure, **not** in the world, so the
world snapshot doesn't capture it. Save after the swap, restore, and a naïve daemon
would think the swap hadn't happened and try to run again. The daemon avoids that by
implementing two hooks:
