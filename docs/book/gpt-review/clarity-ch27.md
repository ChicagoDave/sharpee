# Clarity review — Chapter 27: Media & Audio

### 1. "The audio model" — "so the events read like intent, not like a sound driver" — vague
WHY: The clause asserts a "why" it never grounds. Milliseconds and a 0.0–1.0 range are simply the units the events use; calling that "intent, not a sound driver" is a feel-good restatement that names no mechanism. Cut the editorializing clause and keep the concrete fact.
OLD: Every duration is in milliseconds and every volume runs 0.0–1.0, so the events read
like intent, not like a sound driver.
NEW: Every duration is in milliseconds and every volume runs 0.0–1.0.

### 2. "Capability gating" — "You never write 'if the client supports images' — the manifest already did." — borderline; leave or tighten
WHY: This restates "the gate decides who receives them" from the sentence before it. It is vivid and arguably earns its place as a reader-facing takeaway, so this is a LEAVE recommendation — flagged only for the author's call. If trimming, the earlier sentence already carries the mechanism.
OLD: The story emits the same signals
regardless; the gate decides who receives them. You never write "if the client
supports images" — the manifest already did.
NEW: (no change recommended; included only as a borderline call)

One actionable flag (#1); #2 is a borderline note, recommended LEAVE.
