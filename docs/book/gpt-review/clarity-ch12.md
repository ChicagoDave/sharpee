# Clarity review — Chapter 12: Readable Objects & Switchable Devices

Flag count: 1

### 1. "ReadableTrait — what an object says" — restates-next
WHY: "The key idea is that reading and examining are different verbs that pull from different places" is a generic lead-in; the table immediately below states exactly which verb pulls from which trait. The vague framing ("different places") is made concrete by the table, so the lead can name the two traits it's contrasting instead of gesturing at them.
OLD: The key idea is that *reading* and *examining* are different verbs that pull
from different places:
NEW: `read` and `examine` are different verbs that pull from different traits,
`ReadableTrait.text` versus `IdentityTrait.description`:
