# Channel-I/O Renderer Spike — The Alderman

**Throwaway** spike validating ADR-163 / ADR-164 against the hardest renderer case: a Clue-style deduction game with custom story channels, story-overridden `main` rendering, and synthesized commands from clicks / right-clicks / drag-drop.

## Purpose

Surface gaps in the channel-I/O design that the ADRs don't specify. Confirm that the wire contract is sufficient for a non-trivial story and that re-emission identity holds.

The deliverable is **`findings.md`** — eight gaps surfaced, recommended ADR additions.

## How to run

```
open spikes/channel-io/index.html
```

(Or drag the file into a browser window. No build step — TypeScript is compiled in the browser via Babel-standalone.)

## What you'll see

A static rendering of the Alderman's case-file UI: masthead, three-column case board (suspects / weapons / locations), notebook (`main` channel restyled as Playfair Display italic), evidence pile, assertions list, dark terminal block with input.

**Three controls in the top bar:**

- **Next scripted turn** — advances the spike's hand-scripted 5-turn investigation. Auto-supplies player commands for turns 3–5.
- **Save & Replay** — captures every CMGT + TurnPacket emitted so far, resets the renderer, replays them, asserts that state-store JSON is identical (the **re-emission identity** test from ADR-163 §14).
- **Reset spike** — returns to turn 0.

**Interactive elements** (try them between scripted turns):

- **Right-click a candidate** (suspect, weapon, location) → context menu → emits `suspect <name>` or `clear <name>` as a synthesized CommandPacket.
- **Drag an evidence card onto a suspect** → emits `contradict <suspect> with <evidenceId>`.
- **Type into the prompt** → emits the typed command.

All three demonstrate ADR-163 §10's "UI gestures are synthesized commands" guarantee: the parser sees an indistinguishable command string regardless of how the user produced it.

**Show packet log** (bottom-right tab) — opens a console showing every CMGT, TurnPacket, and CommandPacket as they flow through the system. Useful for confirming the wire shape.

## Scope

**In:**
- The four packet kinds (Hello / CMGT / Turn / Command)
- Channel registration (standard, multi-user, story-defined)
- Replace, append, and event modes
- `emit: 'always'` and `emit: 'sparse'` policies, including the `notebook` opt-in to `'always'`
- Story-overridden `main` rendering
- Synthesized commands from three UI gesture types
- Capture-and-replay test for re-emission identity
- Bootstrap-ordering checks (registerChannel after CMGT throws; produceCmgtManifest before hello throws)

**Out:**
- Real engine integration (turns are hand-scripted)
- Multi-user transport (single-bundle deployment only; `command_echo` is treated as if multi-user but produced locally)
- Image / sound / animation channels (the Alderman is text-only)
- Save / restore of world state (only packet capture/replay)
- Real grammar parser (player commands matched by `startsWith`)
- Tests (this is throwaway)

## File layout

```
spikes/channel-io/
├── README.md       — this file
├── index.html      — the spike (open in browser)
└── findings.md     — gaps surfaced + recommended ADR additions
```

## Status

Spike complete. Eight gaps surfaced (see `findings.md`). Re-emission identity verified. The platform contract holds; the renderer-side architecture needs its own ADR.
