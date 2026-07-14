# Phrase Algebra — full-system image prompt (Nano Banana 2)

Successor to `phrase-1-prompt-md`. The v1 image predates most of the system:
its tree showed 5 node kinds and a 4-pass evaluator. The full algebra is 15
typed members (ADRs 192–201) with one Assembler owning six grammar
authorities, so this version draws the complete system: pipeline across the
top, the expression tree as centerpiece, the full member catalog as a bottom
strip, and two rendered outputs (narration + dialogue).

```text
The image should be max 640px wide for a Ghost header image. A clean technical
diagram titled "The Phrase Algebra — Post-Turn Text Emission", subtitle "15 typed
phrases · one Assembler". Developer-documentation aesthetic: flat vector
illustration, soft off-white background with a faint grid, crisp legible labels,
generous whitespace, no skeuomorphism. 3:2 aspect. Restrained palette of teal,
indigo, amber on near-white with charcoal text; sans-serif for titles, monospace
for all node, template, and code labels.

TOP BAND — a compact horizontal pipeline of four small stages with thin arrows:

STAGE 1 "Action executes" — small rounded card with a turn/command glyph.

STAGE 2 "Domain events" — a short stack of 3 event chips: "ItemTaken",
"DoorUnlocked", "ActorSpoke".

STAGE 3 "Templates parse" — one monospace template card:
   {You} {take} {the item} from {the container}.
with a tiny gray note beneath: "syntax errors throw at parse time".

STAGE 4 "Typed phrase tree" — an arrow pointing down into the centerpiece.

CENTERPIECE (largest element, center of the image) — a node-link expression tree
drawn top-down in a panel, presented as an algebraic expression tree, not a
flowchart. Every node is a small rounded pill with a monospace label, color-coded
by role. Root node "Sequence" (OPERATOR, indigo). Its children, left to right:
   - "NounPhrase" leaf (OPERAND, teal) with a tiny metadata tag under it:
     "number · person · articleType · referableId"
   - "Verb" leaf (OPERAND, teal) with tiny tag "agrees with subject"
   - "PhraseList" node (OPERATOR, indigo) with three small "NounPhrase" leaves
     (teal), tiny tag "serial comma · per-item article"
   - "Slot: here" node (OPERATOR, indigo), tiny tag "many producers, one joiner",
     with two children: "Optional" (UNARY OPERATOR, amber) wrapping a "Literal"
     leaf (teal), and "Choice" (UNARY OPERATOR, amber) with tiny tag
     "cycling · save-safe"
   - "Sentence" node (OPERATOR, indigo) with two children: a "Quote" node
     (OPERATOR, indigo) wrapping a "Literal" leaf (teal), and a "Pronoun" leaf
     (OPERAND, teal) with tiny tag "last-mentioned"
Off to the side of the tree, unconnected, a small gray "Empty" pill with the tag
"identity — absorbed by every combinator".

RIGHT PANEL — "ONE ASSEMBLER" as a single glowing indigo prism/lens the tree
flows into, with a checklist of six authorities, each with a small checkmark:
   "article — a / an / the / some"
   "agreement — number · person · case · gender"
   "punctuation & quote glyphs"
   "whitespace & joining"
   "reference — pronouns from last mention"
   "case & capitalization"
Below the prism, two dark terminal-style output cards in monospace green text:
   "You take the brass key, an apple, and three gold coins."
   "The triplet acrobats say, 'Pretty bird!'"
In the second line, subtly highlight "say" (agreement) in indigo.

BOTTOM STRIP — the full member catalog as 15 small monospace chips in one row,
grouped by role with the same colors and three tiny group headers:
   OPERANDS (teal): Literal · NounPhrase · Verb · Pronoun · Numeral · Verbatim ·
   Empty
   OPERATORS (indigo): Sequence · PhraseList · Contents · Slot · Sentence · Quote
   MODIFIERS (amber): Optional · Choice

Compact legend box bottom-left mapping the three role colors to OPERAND (atom),
OPERATOR (combinator), UNARY OPERATOR (modifier). Footer tag bottom-right, light
gray: "Sharpee 2.x · ADRs 192–206 · one new member, one Assembler case, never a
rewrite".

Sharp, high-contrast, presentation-quality, no clutter: the top pipeline stays
small, the tree and the Assembler prism dominate, the catalog strip reads as a
quiet index.
```

Notes:
- Member list, roles, and metadata tags match the primer
  (`docs/reference/phrase-algebra-primer.md` §2): 15-member union, `Empty` as
  the absorbed identity, NounPhrase carrying the agreement surface.
- The six authorities are the Assembler's actual concerns (article, agreement,
  punctuation, whitespace, reference, case).
- Output lines are real system behavior: per-item articles + serial comma
  (ADR-190/194), plural speaker attribution "the triplet acrobats say"
  (ADR-203), quote glyph + punctuation-inside-quotes (ADR-201).
- If the render crowds at 640px, drop the per-node tiny tags first, then the
  Empty aside — keep the 15-chip strip and the six-line checklist.
