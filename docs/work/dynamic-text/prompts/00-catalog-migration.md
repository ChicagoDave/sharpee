# Opener — the standard catalog was rewritten

The headline, and the part the rest of the story depends on: every shipped standard
message was migrated from the old colon-chain formatter to the phrase-algebra grammar,
and the legacy formatter engine was deleted underneath. The "wins" that follow aren't
author hypotheticals — they're how the stdlib messages already behave.

Real before/after (from `taking.ts`):

```
BEFORE (formatter chain)                      AFTER (phrase algebra)
{the:cap:item} {is:item} fixed in place.   →  {capitalize the item} {verb:is item} fixed in place.
{You} {take} {the:item} from {the:container}. →  {You} {take} {the item} from {the container}.
```

```text
Create a clean, confident editorial-infographic image, single idea. Flat vector style,
light background (#F7F8FA), one accent indigo (#4B47B8), neutral grays. Lots of
whitespace. Monospace for the message templates, sans-serif for labels. Aspect ratio
16:9. Small badge top-right: "Opener · The catalog".

Two columns, side by side, each a stack of two monospace message-template lines on
small cards:
LEFT column header "BEFORE — formatter chain" (gray, de-emphasized):
   {the:cap:item} {is:item} fixed in place.
   {You} {take} {the:item} from {the:container}.
RIGHT column header "AFTER — phrase grammar" (indigo, emphasized):
   {capitalize the item} {verb:is item} fixed in place.
   {You} {take} {the item} from {the container}.
A bold arrow between the columns labeled "migrated".

Below, centered, ONE rendered output card showing the payoff (plural agreement) in a
larger font, the agreeing verb highlighted indigo:
   "The keys are fixed in place."

Bottom strip, two short gray lines:
   "Every shipped standard message — 53 action files — moved to this grammar."
   "The old left-to-right formatter chain was deleted; one Assembler renders them all."

Keep it to: the two-column before/after, the one rendered output, the two-line footer.
No tree, no pipeline boxes.
```

Notes: this is the real scope. `{the:cap:item}` → `{capitalize the item}`, `{is:item}` →
`{verb:is item}`. The deeper change is the engine swap (formatter chain deleted,
ADR-192 W7–W9) — surfaced in the footer, not drawn as plumbing.
