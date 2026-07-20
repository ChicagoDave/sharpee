## 2. Manipulation

Moving things by hand: picking them up, putting them down, putting them in
and on other things, handing them over, and shoving them around. Everything
in this chapter works out of the box — the point of each entry is to tell
you what the platform already does, which trait (if any) makes an entity
eligible, and which message keys to override when you want it said
differently.

Each entry lists the action's **message keys** — the IDs stdlib emits
instead of English (the `lang` layer supplies the words). Override one per
entity with an `on`/`after` clause carrying your own phrase
(chord-language.md §3), or story-wide with a `define phrase` under the
dotted ID itself (dotted keys register whole since ADR-230 D5 —
chord-language.md §5.2; a TypeScript story overrides the ID through the
language provider). In transcripts and event payloads, the ID is how you
recognize which moment fired. The worked example in §2.1, directly below,
shows the per-entity guard and the story-wide override side by side — the
same two seams recur all through this chapter.
