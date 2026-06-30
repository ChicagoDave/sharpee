# Win 4 / 5 — numbers as words or ordinals, from one value

The dynamic case: a runtime number renders as digits, spelled-out words, or an ordinal
from one atom — so prose reads naturally without the author formatting it by hand.

```text
Create a clean, minimal editorial-infographic image, single idea. Flat vector style,
light background (#F7F8FA), accent indigo (#4B47B8), neutral grays. Whitespace-heavy.
Sans-serif prose, monospace for the template lines. Aspect ratio 16:9. Badge
top-right: "Win 4 / 5 · Numbers".

Two stacked rows, each: one monospace template card (the {number:…} token highlighted
indigo) → thin arrow → one finished sentence with the rendered number highlighted:

Row A:
   You count {number:coins words} gold coins.
   →  "You count forty-two gold coins."

Row B:
   You reach the {number:floor ordinal} floor.
   →  "You reach the third floor."

Small monospace footnote under the rows, gray: "same value, format chosen by the atom:
digits · words · ordinal".

Title across the top: "Numbers that read like prose."
One gray caption bottom-center: "One numeric value, formatted at render time — words for
flavor, ordinals for sequence — no manual conversion."

Keep it to: two template → output rows and the footnote. Nothing else.
```

Notes: ADR-198. The win is reading naturally ("forty-two", "third") instead of bare
digits, from a value computed at runtime.
