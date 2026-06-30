# Win 5 / 5 — variation that survives a save

The dynamic case: a repeated line varies each time and **resumes where it left off
after save/restore** — deterministic, not random. (This atom is built in code and bound
by name; there is no inline syntax — by design, ADR-196.)

```text
Create a clean, minimal editorial-infographic image, single idea. Flat vector style,
light background (#F7F8FA), accent indigo (#4B47B8), neutral grays. Whitespace-heavy.
Sans-serif prose, monospace for the param token and counter. Aspect ratio 16:9. Badge
top-right: "Win 5 / 5 · Variation".

Top, centered, small: ONE monospace template card, {flavor} highlighted indigo, with a
tiny gray note beside it "(bound in code to a Choice — no inline syntax)":
   The parrot {flavor}

Below it, a horizontal filmstrip of three small output cards on successive turns, each
tagged with its counter value:
   turn 1 (n=0): "The parrot whistles a jaunty tune."
   turn 2 (n=1): "The parrot rasps, 'Pretty bird!'"
   turn 3 (n=2): "The parrot preens with theatrical disdain."

Between turn 2 and turn 3, draw a small save icon then a restore arrow, labeled
"save · restore → resumes at n=2 (not reset to 0)". Turn 3 emerges AFTER the restore.

Title across the top: "Variation that remembers — across a save."
One gray caption bottom-center: "A tiny per-entity counter lives in the world. Seeded and
deterministic: same state, same words. Save and reload, and the cycle continues exactly."

Keep it to: the small template card, the three-card strip, the save/restore marker.
```

Notes: ADR-196. Honest framing baked in: this is the one win that's authored in code,
not inline — and the payoff is determinism + save/restore safety.
