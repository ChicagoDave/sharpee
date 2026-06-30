# Phrase-Algebra Workflow — Image Prompts (Nano Banana Pro)

A storyboard that sells the phrase algebra on its **real** value: the grammar an author
*cannot* reliably hand-write, made automatic. The pitch is **write once → correct
everywhere**, and it's mostly invisible by design (the author never thinks about it).

**The headline isn't the authoring syntax — it's the migration.** Every shipped
standard message (53 action files in lang-en-us) moved from the old colon-chain
formatter (`{the:cap:item}`, `{is:item}`) to this grammar (`{capitalize the item}`,
`{verb:is item}`), and the legacy left-to-right formatter chain was *deleted*
(ADR-192 W7–W9) in favor of parse → tree → one Assembler. The wins below are how those
shipped messages already behave — not hypothetical author examples. Start with
`00-catalog-migration.md`.

**Each file is fully self-contained** — visual style, badge, and example are baked into
the prompt's code block. Paste one and go; nothing to merge.

All syntax shown is the **real** authoring grammar (ADR-192 §5):
- `{a item}` / `{the item}` / `{capitalize the item}` — NounPhrase + article
- `{slot:here}` — open-ended contribution channel; producer hands a list
- `{pronoun:subject|object|possessive|…}` — agrees with the last-mentioned entity
- `{number:coins words}` / `{number:floor ordinal}` — Numeral formatting
- `{flavor}` — a param bound to a code-built **Choice** phrase (variation/Choice has
  **no inline syntax** — it's produced in code, by deliberate design, ADR-196 §5)

| # | File | The point |
|---|------|-----------|
| 0 | `00-catalog-migration.md` | **The real scope:** the whole standard catalog moved to this grammar (real before/after) |
| 1 | `01-article-a-an.md` | One line, every item: `a`/`an` chosen automatically |
| 2 | `02-grammatical-list.md` | Auto serial comma + "and" + per-item article |
| 3 | `03-pronoun-agreement.md` | One line agrees with any actor's gender/number |
| 4 | `04-number-formatting.md` | Digits → words / ordinal from one atom |
| 5 | `05-persistent-variation.md` | A line that varies each turn and survives save/restore |
| 6 | `06-why-it-works.md` | Capstone: one Assembler keeps all of it correct |

0 sets the scope (this shipped, catalog-wide). 1–5 each show a single template line and
the several correct outputs it produces — the things you'd otherwise get wrong by hand.
6 ties them to the single Assembler.
