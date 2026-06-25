# Em-dash review — Chapter 24: Channels

Source: `docs/book/parts/part-7/24-channels.md`

### 1. Code comment, `AMBIENCE_BY_ROOM` declaration (line 92) — comment
OLD:
```typescript
// A mood line per room — rooms not listed clear the line.
const AMBIENCE_BY_ROOM: Record<string, string> = {
```

NEW:
```typescript
// A mood line per room; rooms not listed clear the line.
const AMBIENCE_BY_ROOM: Record<string, string> = {
```

### 2. "produce receives a context" paragraph (line 118) — prose
OLD:
`produce` receives a context with the turn's `world`, `events`, `blocks`, `turn`
number, and the channel's `prevValue`. Return a value to emit it, or `undefined` to
stay silent. The `emit` policy decides idle turns: `sparse` emits only when the
value changes; `always` emits every turn. To *override* a standard channel, register
one with the same `id` — last write wins.

NEW:
`produce` receives a context with the turn's `world`, `events`, `blocks`, `turn`
number, and the channel's `prevValue`. Return a value to emit it, or `undefined` to
stay silent. The `emit` policy decides idle turns: `sparse` emits only when the
value changes; `always` emits every turn. To *override* a standard channel, register
one with the same `id`. Last write wins.
