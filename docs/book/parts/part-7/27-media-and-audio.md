# Media & Audio

> **Status:** to be written. Adapts the media channels (genai-api `presentation.md`)
> and the Web Audio fade model (ADR-169); folds in the `audio-enablement` guide.

This chapter will cover the media channels — `image:background` / `image:main` /
`image:overlay`, `sound`, `music`, and `ambient:*` — how a story emits them, how the
browser's `AudioManager` plays sound and music with fades, and how these channels
are capability-gated so a text-only client simply never receives them.
