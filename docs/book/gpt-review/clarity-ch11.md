# Clarity review — Chapter 11: Scope & Visibility

Flag count: 3

### 1. "Degrees of access" — filler
WHY: "But the distinction is there when you need it" restates the prior clause ("you rarely think about it") in the negative and adds nothing concrete; the real content is that you reach for the distinction in custom actions, which the chapter covers later.
OLD: Most
of the time the standard actions pick the right degree for you — `examine` wants
visibility, `take` wants reach — so you rarely think about it. But the distinction
is there when you need it.
NEW: Most
of the time the standard actions pick the right degree for you (`examine` wants
visibility, `take` wants reach), so you rarely think about it. You reach for the
distinction yourself only when you write a custom action whose verb needs a
different degree.

### 2. "Sight and darkness" — filler
WHY: "Scope respects the senses, and sight is the one most stories lean on" is a vague summary qualifier; the operative point ("it removes the player's perception, not the objects") is already made in the same sentence, and the tail adds no mechanism.
OLD: This is why darkness works as a gate: it doesn't remove objects, it removes the
player's *perception* of them. Scope respects the senses, and sight is the one most
stories lean on.
NEW: This is why darkness works as a gate: it doesn't remove objects, it removes the
player's *perception* of them. Sight is the sense most puzzles gate on, but the same
rule covers the others: a sound the player can't hear is out of scope too.

### 3. "Permissive parser, strict action" — restates-next
WHY: The lead sentence only announces that a design choice exists; the sentence after it states the actual choice (the parser is permissive). Cut the announcement and promote the concrete sentence.
OLD: There's one design choice worth understanding even though you rarely configure it.
The parser is deliberately **permissive**: when it resolves a noun, it accepts
anything the player could plausibly be touching, and leaves the harder judgment to
the action.
NEW: The parser is deliberately **permissive**, and this is worth understanding even
though you rarely configure it: when it resolves a noun, it accepts anything the
player could plausibly be touching, and leaves the harder judgment to the action.
