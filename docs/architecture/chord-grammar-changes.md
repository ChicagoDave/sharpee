# Chord Grammar Changes — Owner-Approved Log

Governance log for the Chord story language grammar (ADR-210, Open Question 4).
The grammar is a closed set with one canonical form per concept (Given 7).
Any addition or change to the grammar beyond what `docs/work/story-language/design.md`
records as normative requires David's explicit approval, logged here as a dated
entry — a one-way ratchet: entries are never removed, only superseded by later
entries.

**What counts as a grammar change:** a new keyword, statement, selector form,
strategy adverb, kind noun, trait adjective, or any second way to express an
existing concept. Renames and removals count too.

**What does not:** new phrase keys, story content, loader internals, IR schema
changes that don't alter surface syntax, and diagnostics wording.

## Entries

| Date | Form (syntax) | Rationale | Example | Decision |
|------|---------------|-----------|---------|----------|
| 2026-07-10 | **Prose block is the only phrase-text form** — the same-line value in `define phrase` / `phrases <locale>` entries (both the quoted and the bare-text variants) is removed (parse error `parse.phrase-text-form` with a fix-it pointing at the block form). Quoted strings remain for non-prose atoms only: story header strings, hatch module paths. | Given 7 (one canonical form per concept): the quoted one-liner duplicated the prose block and the choice between them tracked line length, not meaning. Raised by David against cloak.story §3.1. | `stumble:` ⏎ `  Blundering around in the dark isn't a good idea!` | Approved (David, 2026-07-10). Supersedes design.md §3.1's quoted examples; §3.1 amended. |
| 2026-07-10 | **Blank line inside a prose block = paragraph break.** A blank line no longer terminates the block while the following line is still indented to the block's level; each paragraph maps to its own text block downstream. In `create` blocks, all consecutive bare paragraphs form the description. | Prose-first: authors type paragraphs the way prose works; the platform's text-block unit *is* the paragraph. | Two indented paragraphs under a room → two-paragraph description | Approved (David, 2026-07-10). |
| 2026-07-10 | **`{br}` built-in marker = hard line break** (flush stacking, no paragraph gap) inside phrase/description prose. `br` is reserved: the unbound-marker gate whitelists it; a story cannot declare a phrase or hatch named `br`. | Verse/signs/addresses need tight line stacking; markers are Chord's one inline-escape form, so this adds a concept, not a second form. | `Here lies the grue.{br}It could not see in daylight.` | Approved (David, 2026-07-10). |
| 2026-07-10 | **`verbatim` phrase modifier** — rides the `define phrase <name>, <modifier>` comma slot beside the strategy adverbs (mutually exclusive with them); the phrase's text is exempt from whitespace collapse (maps to phrase-algebra `whitespace: 'verbatim'`). | Preformatted text (ASCII maps, letters) cannot survive prose collapse; the modifier slot already exists. | `define phrase treasure-map, verbatim` | Approved (David, 2026-07-10). |
