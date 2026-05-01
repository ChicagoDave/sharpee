# Renderer Spike — Findings

**Spike target**: ADR-163 (Channel-Service Platform) and ADR-164 (Stateless Multi-User Server) tested against the Alderman case — custom story channels, story-overridden `main` rendering, synthesized commands from clicks / right-clicks / drag-drop, and the re-emission identity guarantee.

**Method**: hand-built a single-file browser renderer (`spikes/channel-io/index.html`) that implements a minimal channel-service producer, a hand-scripted 5-turn Alderman story, and a story-owned renderer. Captures every packet; "Save & Replay" re-feeds them through a fresh renderer to verify identity.

**Outcome**: the platform contract holds for the Alderman case. Re-emission identity verified. **Eight gaps** in the ADR specifications surfaced — none design-breaking, all addressable via ADR additions or a forthcoming renderer-architecture ADR.

---

## What the spike validated

- **Wire shapes are sufficient.** Hello / CMGT / Turn / Command, with the trimmed `produceTurnPacket` signature (no `consumerContext`, no `command` parameter), expressed every interaction in the Alderman case without protocol additions.
- **Merge-after pattern works.** The spike includes `command_echo` populated by the consumer (the spike treats it as multi-user-shaped) by merging into the payload after `produceTurnPacket` returns. Clean.
- **Per-channel emit policy works.** `emit: 'always'` populates standard channels every turn; `emit: 'sparse'` skips unchanged values. The Alderman opts `notebook` into `emit: 'always'` (working-pad state) and the spike confirms it survives reconnect-equivalent state.
- **Story-overridden `main` works.** The platform default would render `main` as scrolling prose; the Alderman renderer overrides it as Playfair Display italic in a notebook frame. No platform extension required.
- **Story-defined channels work.** `evidence`, `assertions`, `notebook`, `case_board` register cleanly alongside platform standards. CMGT carries them. Custom renderers handle them.
- **Synthesized commands work.** Right-click on a suspect emits `suspect <name>`; drag evidence onto a suspect emits `contradict <suspect> with <evidenceId>`; both produce CommandPackets indistinguishable from typed commands. ADR-163 §10's guarantee held.
- **Re-emission identity holds.** "Save & Replay" captures all CMGT + TurnPackets, resets the renderer, replays from the array, compares state-store JSON before/after. Identical. No `replay: true` flag needed; renderer is unaware it's replaying.
- **Bootstrap ordering enforced.** The spike's channel-service throws if `registerChannel` is called after `produceCmgtManifest` (AC-11(c)) and throws if `produceCmgtManifest` is called before `registerHello` (AC-4).

---

## Gaps surfaced — content the ADRs don't specify

These came up because I had to write *something* concrete to make the spike run. Each is a real decision point that the platform ADR (or a renderer-architecture ADR) needs to settle.

### Gap 1. Story init API

**The hole.** ADR-163 says "story init runs unconditionally; channels register" (decision 11) but doesn't specify what story init *is* from the platform's perspective. Where does the platform call into the story? An exported `init()` function? A default export? A class constructor? A manifest entry?

**What I invented.** A free function `initAldermanStory()` called manually from spike wiring. Not portable across deployments.

**Why it matters.** The multi-user server (ADR-164) runs story init at every turn on stateless workers. The platform-browser runs it on each page load. CLI on each cold start. These three calls need a uniform entry point that the platform knows how to invoke.

**Recommended.** Specify a story-bundle manifest that names the init entry point. Likely belongs in the asset-pipeline ADR (deferred from ADR-163 §13).

### Gap 2. Channel renderer registration API

**The hole.** Stories (and platform defaults) need to associate channel ids with rendering logic. ADR-163 §13 says "the client looks up the matching renderer (story-supplied or platform-supplied)" but doesn't define the registration surface.

**What I invented.** `registry.set(channelId, { onValue: (value, def) => ... })` — a plain Map of channel-id to a single-method object.

**Why it matters.** Without an API, every consumer reinvents this. The Alderman renderer and the platform-browser default renderer must use the same shape so that override-by-re-registration works.

**Recommended.** Specify in a renderer-architecture ADR (forthcoming):

```ts
interface ChannelRenderer {
  onValue: (value: unknown, channel: ChannelDefinition) => void;
  onClear?: (target: string) => void;   // for append-mode channels receiving clear events
  onCmgt?: (manifest: CmgtPacket) => void;  // optional one-time setup hook
}

function registerRenderer(channelId: string, renderer: ChannelRenderer): void;
```

### Gap 3. Renderer's contract with the platform

**The hole.** What methods does "the renderer" expose for the platform / consumer to drive? ADR-163 talks about packets but not the consumer-side dispatcher's contract.

**What I invented.** A `renderer` object with `applyCmgt(cmgt)`, `applyTurnPacket(packet)`, `onCommand(cb)`, `emitCommand(text)`, `getStateSnapshot()`.

**Why it matters.** The consumer (CLI runtime, platform-browser entry point, multi-user web client) needs a stable handle to drive rendering and listen for commands. Without a contract, every consumer rebuilds this differently.

**Recommended.** Specify the renderer surface in the renderer-architecture ADR. Suggested:

```ts
interface Renderer {
  applyCmgt(packet: CmgtPacket): void;
  applyTurnPacket(packet: TurnPacket): void;
  onCommand(handler: (cmd: CommandPacket) => void): void;
  // (and optionally: getStateSnapshot for testing / debugging)
}
```

### Gap 4. Append-mode value shape on emission

**The hole.** When channel-service emits an append-mode channel in a TurnPacket, is the value (a) only the **new entries** added this turn, or (b) the **accumulated list** so far?

**What I invented.** The spike emits new entries only; the renderer maintains the accumulated list locally. This matches the ADR-163 §5 wording ("emit any new entries") but isn't crisp.

**Why it matters.** A new client joining mid-session would see, on the *first* turn packet of its lifetime, only the entries from that turn — not the accumulated history. The history comes only via repaint of *all* historical packets. That's correct behavior, but a renderer implementer needs to know it.

**Recommended.** Make this explicit in ADR-163 §5: "for append-mode channels, the payload value is an array of *new* entries produced this turn; the renderer is responsible for accumulation." Add a note that mid-session joiners observe history only via repaint of historical packets.

### Gap 5. State-store ownership and lifecycle

**The hole.** Where does per-channel state (latest replace value, accumulated append list) live? Inside the renderer? In a separate cache the renderer reads? ADR-163 §14 mentions "renderer state stores rebuild from packet stream" but is vague about ownership.

**What I invented.** A plain object `stateStore` inside the renderer module.

**Why it matters.** For local repaint with rendered-output persistence (Secret Letter pattern), the state store may need to survive a render-skip. For multi-user reconnect, the renderer rebuilds from scratch. Two different lifecycles.

**Recommended.** Renderer-architecture ADR specifies: state store is part of the renderer; it is rebuilt from packets on every `applyCmgt`. Consumers that want render-skip caching layer it on top by intercepting at the persistence layer, not by sharing a state store.

### Gap 6. Re-init protocol on repaint

**The hole.** What does "story init re-runs" actually look like as a protocol? ADR-163 §14 mentions it; the spike's "Save & Replay" handler had to manually reset channel-service, re-run story init, re-register hello, and re-call `produceCmgtManifest` (only to satisfy the bootstrap-ordering invariant — the result wasn't used since the captured CMGT was replayed instead).

**What I invented.** A multi-step `bootSpike()` / `captureAndReplay()` pair that does the re-init manually.

**Why it matters.** Consumers will repeatedly write subtly-different versions of this re-init dance. A clean API call like `channelService.resetForReplay()` would help.

**Recommended.** Add a `reset()` (or `resetForReplay()`) function to the platform API that handles the bootstrap-ordering invariant correctly when packets are about to be replayed. Document the standard repaint sequence.

### Gap 7. Default platform renderers

**The hole.** ADR-163 §13 says "the web client ships standard defaults for every channel" but doesn't specify how they're packaged or how stories override them.

**What I invented.** The spike skips this entirely — the Alderman renderer covers every channel. There's no "platform default" code path.

**Why it matters.** Most stories don't override `location` / `score` / `turn`. They want the platform to ship a default status-bar renderer that just works. The override mechanism is the load-bearing question.

**Recommended.** Renderer-architecture ADR specifies an override pattern. Suggested: platform ships `defaultRenderers` map of channel-id → ChannelRenderer; story init can call `registerRenderer(channelId, customRenderer)` to override; if no story renderer is registered, platform default is used. First-registered-wins is wrong here — *story* should win — so it's last-write-wins after platform defaults are loaded.

### Gap 8. Layout / slot system

**The hole.** Panel 4 of `renderer-architecture.html` shows "slots" but doesn't define them. ADR-163 §13 leaves layout entirely to the renderer.

**What I invented.** The Alderman renderer hardcodes element IDs (`notebook`, `evidence-list`, `case-board`, etc.) in the HTML and the channel renderers write to those by ID. Story owns the whole DOM.

**Why it matters.** This works for a story that ships its own complete layout, but doesn't help the platform-browser default deployment that wants to compose multiple channel renderers (status bar + main + sidebar) into one screen automatically.

**Recommended.** Renderer-architecture ADR distinguishes two patterns:

1. **Default-layout pattern** (platform-browser default, CLI): platform ships a layout with named slots (`status`, `main`, `sidebar`, `input`, `media-layers`); each platform-default renderer is bound to a slot; stories that don't override get this for free.
2. **Story-layout pattern** (the Alderman): story bundle ships its own complete HTML/template; story renderers write to story-defined elements. Platform layout is bypassed.

A story can mix: keep platform layout but override individual channel renderers (the simpler customisation case).

---

## Renderer-local UI state vs channel-driven UI state

**Surfaced from Alderman gameplay context.** The Alderman is parser-IF
with a visual deduction overlay, not a deduction-first UI game. The
detective dossier (case board + evidence pile + assertions) is hidden
by default; the player surfaces it with a `REVIEW NOTES` parser
command. `REVIEW NOTES` is **turn-passing** — mechanically equivalent
to `WAIT` — so NPCs and daemons advance during the action.

This forces a clean distinction the ADRs don't currently make explicit:

| Action class | Goes through wire? | Examples |
|---|---|---|
| **Game-state-affecting / turn-passing** | Yes — `CommandPacket` to engine | `north`, `take rug`, `suspect Doyle`, `review notes` (= wait) |
| **Pure-visual / non-turn** | No — renderer-local only | close the dossier modal, scroll within it, hover-highlight an evidence card, expand/collapse a section |

ADR-163 §10 ("UI gestures synthesize commands") is correctly scoped to
the *first* row only — gestures that affect game state. The second
row never appears on the wire and doesn't need to. The renderer
maintains its own private state for pure-visual interactions that
don't tick the world clock.

The Alderman's `REVIEW NOTES` flow under this model:

1. Player types or clicks `REVIEW NOTES` → renderer emits `CommandPacket`.
2. Engine processes it as a `WAIT`-equivalent: world clock advances,
   NPCs/daemons act, possibly emits prose to `main` ("You consult your
   case file…").
3. Engine **also** emits to a story-defined channel — e.g.,
   `view_state` (replace, json) carrying `{ panel: 'dossier', open: true }`,
   or a `dossier_focus` event channel — to signal the UI to surface the
   panel.
4. Renderer reads the channel and shows the dossier panel.
5. Player closes the panel with a close button → **renderer-local**.
   No `CommandPacket`, no turn passes, the world clock doesn't advance.
6. Player typing any other parser command from inside the dossier view
   is a normal command — the renderer can choose to auto-close the
   panel on next turn, or keep it open. UX choice.

**Recommended addition to the renderer-architecture ADR (Gap 3 in
this document).** The renderer surface should explicitly include
purely-local UI state that doesn't round-trip through channels. The
boundary rule:

> If the action would change what the engine sees on the next turn,
> it is a `CommandPacket`. Otherwise it is renderer-local and never
> reaches the wire.

Story authors implicitly rely on this boundary — without it,
common UX patterns like "scroll to read prose history" or "close a
modal" would either burn turns or require special-casing in the
parser.

---

## Performance observations (not gaps but worth noting)

- **Long-session replay scaling.** A 1000-turn session would replay 1000 packets sequentially through the renderer. The spike's `applyTurnPacket` is straight-line synchronous. For real renderers with DOM operations, this could flash or jank. Mitigation: the renderer can buffer all replay packets, apply them in one batch, then commit one DOM update. Worth a note in the renderer-architecture ADR.
- **`emit: 'always'` cost.** Standard channels re-emit every turn. With 10 standard channels × 1000 turns, that's 10K idempotent updates. Fine for in-process; modest wire weight for multi-user. The spike confirms this is negligible for a few-turn case.

---

## What's NOT broken (resists the urge to refactor)

- **Trimmed `produceTurnPacket` signature** (no `consumerContext`, no `command`) is correct. The spike validates the merge-after pattern works for `command_echo` without these parameters.
- **No `replay: true` flag** is correct. The spike's "Save & Replay" never sets such a flag and re-emission identity holds.
- **Capability gating only on media channels** is correct. The Alderman's `evidence` / `assertions` / `notebook` / `case_board` are all `json` story channels, none gated, and they all show up in the CMGT manifest regardless of the (false) `images` capability declaration.
- **The four packet kinds are sufficient.** No need for separate `replay`, `bootstrap`, `error`, or `callback` packet kinds.

---

## Recommended next steps

1. **Address Gaps 4 (append value shape) and 6 (re-init protocol) in ADR-163 directly.** Both are small clarifications to existing decisions / ACs. Should land before any platform code is written.
2. **Open a renderer-architecture ADR (proposed: ADR-165).** Covers Gaps 1, 2, 3, 5, 7, 8 — the consumer-side architecture. Builds on ADR-163.
3. **The asset-pipeline ADR (already deferred) inherits a slice of Gap 1 and Gap 7** — specifically, *how* a story bundle ships its init entry point and renderer code. The renderer-architecture ADR specifies the *shape*; the asset-pipeline ADR specifies the *delivery*.
4. **Carry the spike forward as documentation.** It's the only place where the API surface is concrete. When the renderer-architecture ADR drafts, this spike informs the API design directly.

---

## Files

- `spikes/channel-io/index.html` — runnable spike (open in any modern browser)
- `spikes/channel-io/findings.md` — this document
- `spikes/channel-io/README.md` — purpose + how to run
