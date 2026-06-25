# Em-dash review — Chapter 19: The Formatter Chain

### 1. Article formatters paragraph (line 35) — prose paragraph
OLD:
`{a:item}` even chooses *a* versus *an* by the word that follows — "a flashlight,"
"an owl." The full set of article formatters is `a` / `an`, `the`, `some` (for mass
nouns), and `your`.

NEW:
`{a:item}` even chooses *a* versus *an* by the word that follows: "a flashlight,"
"an owl." The full set of article formatters is `a` / `an`, `the`, `some` (for mass
nouns), and `your`.

### 2. Verb agreement paragraph (line 70) — prose paragraph
OLD:
A verb has to agree with its subject — "the toucan **is** fixed in place," but "the
pygmy goats **are** fixed in place." Rather than hardcode `is`, a template keys a
**verb formatter** to the same entity:

NEW:
A verb has to agree with its subject: "the toucan **is** fixed in place," but "the
pygmy goats **are** fixed in place." Rather than hardcode `is`, a template keys a
**verb formatter** to the same entity:
