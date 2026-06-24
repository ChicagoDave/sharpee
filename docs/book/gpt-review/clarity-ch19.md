# Clarity review — Chapter 19: The Formatter Chain

Flag count: 1

### 1. "Lists" section, final sentence — filler (vague qualifier) — ⚠ PROPOSAL REJECTED (inaccurate)
WHY: "the same declarative way" gestures at a parallel without naming what the `count` formatter actually does or how it is written; every other formatter in the chapter gets a concrete syntax example, so this one trails off.
OLD: A `count` formatter handles quantities the same declarative way.
NEW (REJECTED — verified against packages/lang-en-us/src/formatters/list.ts): A `count` formatter does the same for quantities: `{count:items}` emits "three goats" instead of you tracking the number and pluralizing the noun by hand.

VERIFIED FACTS: `count` is registered (`registry.ts`). Syntax order `{count:items}` is correct (placeholder is the last segment). BUT the output is NOT "three goats". `countFormatter` returns "nothing" for 0, `"1 sword"` for 1, and `` `${count} items` `` for >1 — i.e. three goats renders as "3 items" (numeral, hardcoded noun "items"). The >1 branch looks like a bug/stub. DECISION NEEDED: keep the original vague sentence, or wait on a platform fix to the formatter before writing a concrete example. Do not ship the NEW above.

SEPARATE BUG (pre-existing, not from this edit): this chapter's `{items:list}` / `{a:items:list}` examples appear to have the segments backwards. The working order is `{list:items}` (formatter first, placeholder last), which is what the real action messages use (`looking.ts`, `going.ts`). Verify across the chapter.

---

Note: This was the only genuinely empty sentence. The rest of the chapter is
concrete — every formatter (`a`/`an`, `the`, `some`, `cap`, `is`/`was`/`has`,
`list`) is shown with template input and rendered output, and the "why pass the
entity" section states the real mechanism rather than asserting it. The proposed
NEW above is illustrative; if the exact `{count:...}` syntax or output differs in
the platform, adjust to match before adopting.
