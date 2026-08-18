# Vocabulary Freeze Review — Phase 4 slice (exchange, initiative, agency, multi-party)

**Status**: FROZEN — David, 2026-08-17: "all section 6 decisions are
confirmed as stated". All six decisions in §6 stand as recommended:
named `define exchange` block (responses only), `answer`/`on`/`on silence`
row heads, BOTH `then asks` and `then invites` (word carried as data),
`deflect to`/`leave`, header comma-modifier strength
(`passive`/`assertive`/`blocking`), and `define initiative` with
`hold their tongue`. Every word list here is
author-facing compatibility surface the moment the first story ships on it
(the ADR-310/318 discipline). Phase 3's slice (`define greetings`, time
words, threading words) is FROZEN separately in
`vocabulary-freeze-phase3.md`.
**Written**: 2026-08-17 (session a53a28), after surveying the landed Phase 3
grammar in `chord.ebnf` (topics/manner/greetings blocks, the `on`/`after`
clause forms, comma-modifier idiom on define headers), the stranded
lifecycle machinery's shipped word lists (`ConversationStrength`,
`ConversationIntent` in `lifecycle.ts`), and the Phase 1 contracts
(`SceneOccasion` kinds in `scene-scoring.ts`).

---

## 1. The exchange block (D4) — proposed: a named top-level block, responses only

```
define exchange loyalty-question for Will Kemp
  answer "yes", "aye":
    phrase kemp-pleased
  answer "no":
    phrase kemp-scowls
    deflect to the tour
  on leaving:
    phrase kemp-calls-after
  on silence:
    phrase kemp-shrugs
end exchange
```

Opened from a topic row, a greetings row, or an initiative row (§5):

```
about the tour:
  phrase kemp-complains-tour
  then asks loyalty-question
```

- **Named, not inline.** D4 calls the exchange point "a named moment," and a
  top-level `define exchange <key> for <name>` mirrors every other character
  block (topics/manner/greetings). The alternative — an inline nested body
  under `then asks:` — was considered and rejected: it buries a second
  indentation regime inside topic rows, and a named block lets the same
  exchange open from a topic row, a boundary row, and an initiative row
  without duplication. Exchange keys are single kebab words, like phrase keys.
- **The block holds responses only.** The line that opens the exchange is
  whatever the calling row emitted (`phrase kemp-asks-loyalty` before
  `then asks`) — so one exchange can be opened with different openings, and
  initiative-opened exchanges carry their opener in the initiative row.
- Analyzer gates mirror topics: person-kind owners, duplicate-key detection,
  at least one row; `then asks` must name an exchange belonging to the same
  owner (diagnostic: cross-owner open).
- **No `otherwise` row.** Input matching no exchange row falls through to the
  topic table and the existing default path (D16 innermost-wins; AC2's
  rejection leg). The platform owns the fallthrough; there is nothing to
  author.

## 2. Response-row heads — the two kinds plus silence

| Head | Matches | Grammar |
|---|---|---|
| `answer <key>:` | what the responder says | the topic-key grammar reused whole — quoted free-text tier with comma aliases, or the entity tier |
| `on <act/event>:` | what the responder does, or a world event | the existing event-verb register (the `on`/`after` clause forms), not a new act vocabulary |
| `on silence:` | the responder says nothing | fixed spelling |

- `answer` was chosen over `reply` (stiffer) and `say` (already the player
  verb). Silence rides the `on` head because it is something that happens,
  not something said — and D8 renders it like any response.

## 3. Row outcomes (D8) — the agency statements

New statements, legal in topic-row, greetings-row, exchange-row, and
initiative-row bodies, alongside the shipped `refuse when`:

| Statement | Meaning |
|---|---|
| `then asks <exchange-key>` | open the named exchange (chains from an exchange row) |
| `then invites <exchange-key>` | same mechanism; the word is carried as data — a chat client may render an invitation differently from a question |
| `deflect to <topic-key>` | the owner redirects to a row in their own topic table (diagnostic: target must exist there) |
| `leave` | the owner exits the scene — a movement move, world-legality consulted at dispatch (Phase 6), never conversation-only physics |

- `then` already sits in the noun-phrase stop list (Phase 3), so both `then`
  forms parse cleanly after prose-adjacent statements.
- **Closing is implicit**: a fired response row closes the exchange unless it
  opens another via `then asks`/`then invites`. No `close` word — decay and
  scene exit also close it, runtime-owned.

## 4. Strength markers (D10) — the lifecycle's words, on the header

```
define exchange the-accusation for Will Kemp, blocking
```

- **`passive` / `assertive` / `blocking`** — frozen as spelled, matching the
  shipped `ConversationStrength` TS union exactly (`lifecycle.ts`), so the
  Chord surface and the runtime skeleton never need a mapping table.
- Placement: a comma-modifier on the block header, the existing
  `define phrase <key>, <strategy>` idiom. Unset = the runtime derives it
  from intent (D10: "authors may set strength on an exchange; otherwise
  intent derives it").

## 5. Initiative rows (D7) — proposed: `define initiative`, occasions as row heads

```
define initiative for Will Kemp
  on an open floor, when morale is low:
    phrase kemp-grumbles
  on silence:
    phrase kemp-fills-the-silence
  when the subject changes:
    phrase kemp-pounces
    then asks why-the-change
  on an open floor, when fear is high:
    hold their tongue
end initiative
```

- Row heads are the occasion kinds already fixed in the Phase 1 contracts
  (`SceneOccasion`): **`on an open floor`** (open-floor), **`on silence`**
  (silence), **`when the subject changes`** (subject-change — the
  already-frozen Phase 3 condition reused as a head), and **`on <act/event>`**
  (witnessed-event, same register as §2). The goal-step occasion is NOT
  surfaced here — goal steps force moments through the goal machinery itself.
- A condition composes after a comma (`on an open floor, when …`), mirroring
  the greetings-row `on return, after days` shape.
- A row firing **forces** the seizure (most-specific-wins over disposition,
  D7). **`hold their tongue`** as a row body **suppresses** it — David's own
  D7 phrasing, chosen over `stay silent` (confusable with D8's rendered
  silence, which is a response, not a suppression) and `hold back` (vague).
- Same analyzer gates: person-kind owners, one block per entity, at least
  one row.

## 6. Decisions for David

1. **Exchange shape** (§1): named top-level `define exchange <key> for
   <name>`, block holds responses only, opener lives in the calling row?
2. **Row heads** (§2): `answer` for verbal rows (topic-key grammar reused),
   `on` for act/event rows, `on silence` fixed?
3. **Outcome words** (§3): ship BOTH `then asks` and `then invites` (one
   mechanism, word carried as data — recommended, they read differently in
   story text and the ADR names both) — or `then asks` alone?
4. **`deflect to` / `leave`** as spelled (§3)?
5. **Strength** (§4): `passive`/`assertive`/`blocking` as a comma-modifier
   on the exchange header, unset derived from intent?
6. **Initiative** (§5): `define initiative for <name>`; heads `on an open
   floor` / `on silence` / `when the subject changes` / `on <act/event>`;
   `hold their tongue` as the suppression statement?

## 7. Non-freeze notes (implementation-side, recorded for Phase 4 work)

- The `ConversationIntent` words (`eager`/`reluctant`/`hostile`/
  `confessing`/`neutral`) stay runtime-internal in this slice — nothing in
  Phase 4 authors intent directly; disposition derives it (D7). Surfacing
  them later would be its own freeze.
- Exchange rows are declarative and therefore enumerable — the IR shape
  feeds D12's response-affordance wire data directly (verbal rows, act/event
  rows, silence), which is why no row kind may hide behind a computed form.
- Diagnostics follow the existing `parse.*` / `analysis.*` naming idiom; ADR
  references stay in code comments, never in diagnostic text (standing
  rule). Named in the plan: unauthorized deflect target, malformed strength
  marker, exchange row shadowing a table row incorrectly.
- Exchange/initiative rows join the condition-disjointness machinery exactly
  as topic/manner/greetings rows did in Phase 3.
- Surface pin moves as one unit at implementation (ADR-257 D5): `chord.ebnf`,
  `CHORD_LANGUAGE_VERSION` 3.1.0 → 3.2.0, pin hash re-recorded.
