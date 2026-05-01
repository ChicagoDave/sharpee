# Combined Review — ADR-163 / ADR-164 / ADR-165

**Date**: 2026-05-01
**Method**: ad-hoc cross-ADR review of the channel-I/O trio (platform / multi-user server / renderer architecture). Walks through cross-reference resolution, vocabulary consistency, "stable across" claim verification, seam coverage, and open-question reconciliation. Output is a findings list plus process observations for a future `/adr-review` multi-ADR mode.

**Scope**:
- `docs/architecture/adrs/adr-163-channel-service-platform.md`
- `docs/architecture/adrs/adr-164-stateless-multiuser-server.md`
- `docs/architecture/adrs/adr-165-renderer-architecture.md`
- Spike validation in `spikes/channel-io/`

**Verdict**: the trio is **mutually consistent and ready for implementation**. Three small clarifications worth landing; one architectural detail (story init overloading) worth surfacing before the asset-pipeline ADR.

---

## 1. Cross-reference resolution — PASS

Sampled and verified the following references resolve correctly to existing sections / ACs / files:

| From | To | Resolves? |
| --- | --- | --- |
| ADR-164 §3 | ADR-163 §12 (merge-after API) | ✓ |
| ADR-164 §5 | ADR-163 §14 (network repaint pattern) | ✓ |
| ADR-164 §5 | ADR-163 §2 (hello packet) | ✓ |
| ADR-164 §5 | ADR-163 §4 (event channels not persisted) | ✓ |
| ADR-164 AC-10 | ADR-163 §11 (per-client CMGT filtering) | ✓ |
| ADR-165 §1 | ADR-163 §5 (append-mode payload value) | ✓ |
| ADR-165 §6 | ADR-163 §9 (renderer-local boundary rule) | ✓ |
| ADR-165 §8 | ADR-163 §4 + §7 (standard + media channels) | ✓ |
| ADR-165 §8 | ADR-164 §3 (multi-user server channels) | ✓ |
| ADR-165 AC-7 | ADR-163 AC-12 (counterpart re-emission test) | ✓ |
| ADR-163 (replaces section) | ADR-164's Replaces section | ✓ |
| ADR-163 (open questions, resolved) | ADR-165 (renderer architecture) | ✓ |

No dangling references found. The trio resolves cleanly.

## 2. Vocabulary consistency — PASS WITH ONE NOTE

Concept usage across the three ADRs:

- **"consumer"** — same definition everywhere: the party receiving channel-I/O packets. ✓
- **"single-bundle" / "multi-user"** — used uniformly to mean the two deployment classes (single artifact vs split-across-transport). ✓
- **"downstream"** — used uniformly: ADR-X depends on Y. ✓
- **"renderer-local"** — defined in ADR-163 §9, re-used identically in ADR-165 §6. ✓
- **"platform default"** — uniform: ships with the platform package(s). ✓
- **"platform contract"** — uniform: the producer-side API surface in ADR-163. ✓
- **"re-emission identity"** — uniform: same captured packet → same renderer output. ✓

**Minor note**: `Renderer` (capital R, the interface in ADR-165 §2) and "renderer" (lowercase, generic noun for the consumer-side entity) both appear, sometimes near each other. Reading flows correctly because context disambiguates, but a sufficiently strict typographic-style check would flag it. **Not worth fixing.**

## 3. "Stable across" claim verification — PASS

ADR-163 makes two "stable across" claims:

1. *"The platform contract in this ADR is stable across ADR-165's decisions."*
   - Verification: ADR-165 introduces no producer-side requirements. Its only API additions are consumer-side: `Renderer`, `ChannelRenderer`, `registerRenderer`, `getSlot`, `getStateSnapshot`. None modify `produceCmgtManifest` or `produceTurnPacket`. The platform contract is unchanged. ✓
2. *"The channel wire contract in this ADR is stable across whichever asset-pipeline mechanism lands."*
   - Verification: the asset-pipeline ADR is forthcoming, so trivially uncontradicted. The renderer-architecture ADR (ADR-165) does flag asset-pipeline coupling as an open question (decision 7 footnote on slot system; decision 3 on registration API). When the asset-pipeline ADR lands, this claim should be re-verified.

ADR-164 makes one similar claim:

3. *"None affect the multi-user server's invariants or save-blob shape"* (about the spike findings).
   - Verification: ADR-165's eight decisions all live consumer-side. None reach into the save blob, the transcript-as-world-capability, the per-turn write ordering, or the stateless-worker model. ✓

All three claims hold.

## 4. Seam coverage — THREE FINDINGS

These are gaps that appear only when reading the trio together.

### Finding 4a — Repaint flow: capture-CMGT vs re-produce-CMGT

**The seam.** ADR-163 §14 step 4 specifies that on repaint, the consumer should call `produceCmgtManifest(capabilities)` *fresh* and pass the result to `applyCmgt`. Only the captured turn packets get replayed. The implication is that story init is deterministic and a fresh CMGT will match the original.

The spike (`spikes/channel-io/index.html`) does the opposite: it captures the original CMGT alongside turn packets and replays the captured CMGT. Both work because story init is deterministic — but the two patterns differ in which side bears the determinism burden.

**Implications:**
- Single-bundle deployments can use either pattern; either works.
- Multi-user deployments **must** use re-produce (per ADR-164 §5: each new connection gets a freshly-produced CMGT filtered by that client's capabilities). The captured CMGT from another client would have the wrong capability filtering.
- A story whose init is *not* deterministic (uses random seeds, reads wall-clock time, etc.) breaks the re-produce model. The capture model would still work for that story but only in single-bundle.

**Recommendation.** Add a one-sentence note to ADR-163 §14 that step 4's "produceCmgtManifest" is the correct pattern for multi-user (because per-client filtering happens on the re-produce); single-bundle consumers may either re-produce or replay captured CMGT (equivalent under deterministic story init). Plus: state determinism as a documented expectation of story init.

### Finding 4b — "Story init" is overloaded between server and client in multi-user

**The seam.** "Story init" is referenced across all three ADRs. In a single-bundle deployment, story init is one block of code that runs once at boot. In multi-user, story init effectively has *two halves*:

- **Producer-side init** (server): registers channels, registers rules, defines engine handlers. ADR-163 §11 calls this "story init runs unconditionally; CMGT filtering happens at emission time." ADR-164 §1 has the server running this on every stateless worker per turn.
- **Consumer-side init** (client): registers `ChannelRenderer` implementations, registers slots, mounts layout. ADR-165 §3 calls this "stories register during story init."

Same name, different scopes, different processes. The trio doesn't explicitly call this out. A naive reader might assume "story init" means the same thing on both sides.

**Implications:**
- The asset-pipeline ADR (forthcoming) needs to ship *both halves* of a story bundle. Renderer code must reach the client; channel-registration code must reach the server. They may be the same module exporting different functions, or two modules.
- For a single-bundle deployment, both halves run in the same process — no distinction needed.
- For multi-user, the `.sharpee` bundle must declare which symbols are server-side and which are client-side, or ship both to both sides and have each side call only the part it needs.

**Recommendation.** Add a small note to ADR-165 §3 that "story init" in the multi-user context refers to the *client-side* half (renderer registration); ADR-163 §11 retains the producer-side meaning. The asset-pipeline ADR will resolve the bundle layout that makes both halves accessible.

### Finding 4c — `onCmgt` resource lifecycle has no documented teardown

**The seam.** ADR-165 §1 defines an optional `onCmgt` hook on `ChannelRenderer`, used for one-time setup (DOM scaffolding, audio-context initialization, asset preload). ADR-165 §5 specifies that `applyCmgt` resets the channel state store. ADR-165 §4 specifies the dispatch order: reset state, then invoke `onCmgt` hooks.

But the *second* `applyCmgt` (e.g., on repaint) re-invokes `onCmgt` without first cleaning up resources from the first invocation. The contract assumes renderers are idempotent in `onCmgt`, but doesn't say so explicitly, and provides no `onDestroy` / teardown hook.

**Risk.** A renderer that creates a long-lived resource in `onCmgt` (Web Audio context, IntersectionObserver, MutationObserver, registered global event listener) leaks on every repaint. The ADR-165 Consequences section flags this as "easy to misuse" but doesn't resolve it.

**Options:**
- (a) Add an `onDestroy` hook to `ChannelRenderer` that the dispatcher invokes before resetting state on `applyCmgt`. Symmetric with `onCmgt`.
- (b) Document an idempotency contract: "`onCmgt` must be idempotent across repeat invocations." Push the burden onto renderers.
- (c) Specify that `applyCmgt` constructs a fresh `Renderer` instance, bypassing the lifecycle issue at the cost of more allocation. Maybe also more aligned with the "fresh story init each turn on stateless workers" model.

**Recommendation.** Pick one — likely (a) or (b) — and update ADR-165 §1 + §4. Not a blocker for implementation; will surface during the first long-session repaint test if not addressed.

## 5. Sequencing dependencies — PASS

Reading "Builds on" + cross-references:

- ADR-163 builds on nothing in the trio (replaces ADR-101).
- ADR-164 builds on ADR-163 only. References ADR-165 for one factual claim ("uses the same renderer contract") that ADR-165 settles. Implementation can proceed once ADR-163 is shipped, even before ADR-165 is implemented (since ADR-164 itself doesn't depend on the renderer architecture details — it only ships server-side concerns).
- ADR-165 builds on ADR-163 only. References ADR-164 for examples (multi-user channels, network repaint) but doesn't require ADR-164 to be implemented first.

**No circular dependencies. No back-references.** A reader can read ADR-163 alone and understand the platform; can read ADR-163 + ADR-164 to understand the multi-user server; can read ADR-163 + ADR-165 to understand the consumer side. Reading order is flexible.

## 6. Open-question reconciliation — PASS WITH ONE NOTE

Open questions across the trio:

| ADR-163 open questions | Status |
| --- | --- |
| ~~Replay packet shape on connect~~ | Resolved 2026-05-01 (spike validated; no flag needed) |
| `prevValues` storage strategy | ADR-164 routes via transcript; single-bundle holds in-process. Both documented. ✓ |
| CMGT versioning | Open. Recommendation in place. |
| text-service's continued surface | Open. Audit task. |
| Author-override asset pipeline | Open. Forthcoming ADR. |
| ~~Renderer architecture~~ | Resolved 2026-05-01 by ADR-165 |

| ADR-164 open questions | Status |
| --- | --- |
| Saves UX | Open. UX decision. |
| Long-session transcript truncation | Open. Future policy. |
| Lease implementation | Open. Implementation choice. |
| Worker pool sizing | Open. Tuning. |

| ADR-165 open questions | Status |
| --- | --- |
| Where do platform-default renderers ship | Open. Implementation choice. |
| State-store key pre-allocation | Open. Performance tuning. |
| Asset-pipeline coupling | Open. Forthcoming ADR. |
| Renderer-side replay performance | Open. Implementation concern. |

**Note**: ADR-165's "asset-pipeline coupling" overlaps with ADR-163's "Author-override asset pipeline". Both correctly point at the same forthcoming ADR. Not a duplication problem — they're the same question asked by different consumers.

## 7. ADR-165 closes the renderer architecture except for Gap 1

The spike's findings list eight gaps. Status under the trio:

| Gap | Resolved by | Status |
| --- | --- | --- |
| 1. Story init API | Asset-pipeline ADR (forthcoming) | **Open** — flagged in ADR-163 + ADR-165 |
| 2. Channel renderer registration API | ADR-165 §3 | ✓ |
| 3. Renderer's contract surface | ADR-165 §2 | ✓ |
| 4. Append-mode value shape | ADR-163 §5 | ✓ |
| 5. State-store ownership | ADR-165 §5 | ✓ |
| 6. Re-init protocol | ADR-163 §14 | ✓ |
| 7. Default platform renderers | ADR-165 §8 | ✓ |
| 8. Layout / slot system | ADR-165 §7 | ✓ |

**Gap 1 is correctly punted to the asset-pipeline ADR**, but Finding 4b above shows the renderer architecture isn't fully closed without it — story bundles need a delivery mechanism for renderer code (and the server-side / client-side split needs explicit handling). Implementation of ADR-165 in a single-bundle context can proceed without it; multi-user implementation will hit the wall at story-bundle-loading time.

---

## 8. Verdict

**READY FOR IMPLEMENTATION** with three small clarifications:

1. **ADR-163 §14**: add a sentence on the produce-vs-capture CMGT distinction (Finding 4a).
2. **ADR-165 §3**: clarify that "story init" in a multi-user context is the client-side half (Finding 4b).
3. **ADR-165 §1 / §4**: pick a stance on `onCmgt` lifecycle — add `onDestroy`, document an idempotency contract, or move to fresh-instance-per-applyCmgt (Finding 4c).

None are blockers. All three could land as small follow-up edits without disturbing the trio's structure.

The cross-ADR review **adds load-bearing value beyond per-ADR review** — Findings 4a, 4b, 4c are visible only when reading the three together. None would have been caught by running `/adr-review 163`, `/adr-review 164`, `/adr-review 165` separately.

---

## Process observations — for a future multi-ADR review skill

What this review actually did, and what an automated skill could replicate:

### Easy to mechanize (pattern-matching)
- **Cross-reference resolution.** Find every `§N`, `AC-N`, `ADR-NNN` reference; verify each resolves to a real section / AC / file. Mostly grep + structural parse.
- **Vocabulary census.** Build a glossary by extracting bolded phrases and definition-shaped sentences across all input ADRs; flag terms used differently or with conflicting meanings.
- **"Stable across" claim collection.** Grep for the phrase "stable across" and surface each claim for human verification. The verification itself is non-mechanical, but surfacing the claims is mechanical.
- **Open-question matrix.** Extract the "Open Questions" sections from each ADR; cluster by topic; surface duplicates and any that another ADR has resolved.
- **Sequencing dependency graph.** Build a graph from "Builds on" / "Replaces" / "References" sections; check for cycles; check that referenced sections exist.

### Hard to mechanize (judgment-shaped)
- **Seam coverage.** "What happens at the boundary between ADR-A's responsibility and ADR-B's responsibility?" requires understanding what each ADR claims to handle and what it punts. Findings 4a and 4b emerged from this — neither was obvious from a checklist. Probably needs an LLM walk-through.
- **Contradiction detection.** "ADR-A says X, ADR-B implies !X" — pattern-matching catches direct contradictions in declarative statements but misses implications. Most useful as an LLM check.
- **Lifecycle / resource correctness.** Finding 4c (`onCmgt` teardown) emerged from imagining the second `applyCmgt` invocation. This is the kind of thing a human reviewer thinks about; mechanizing it would need a state-machine model of the ADR's specified lifecycle.
- **"Done enough?" judgment.** Whether a gap is a blocker or a punt-acceptable detail. Subjective; should always be human-confirmed.

### Recommended skill shape

A `/adr-review` multi-ADR mode (option 1 from the earlier discussion) would:

1. Run the existing per-ADR checklist on each input ADR.
2. Run the **mechanizable cross-checks** (cross-reference resolution, vocabulary census, "stable across" surfacing, open-question matrix, sequencing graph).
3. Run an **LLM-driven seam walkthrough** that takes each "Relationship to" / "Builds on" link and asks: "Are there gaps at this boundary?" — produces a candidate findings list.
4. Output a combined report with sections matching this document's structure: cross-reference, vocabulary, stable-across, seams (LLM-driven), sequencing, open-question matrix, verdict.

The mechanizable parts catch most of the routine drift; the LLM-driven seam walkthrough catches the load-bearing structural findings (4a, 4b, 4c). Both are needed.

**Cost shape**: per-ADR runtime is unchanged from the existing skill; cross-checks scale roughly linearly with N-pairs (so quadratic-ish in number of ADRs reviewed together). For a trio (3 ADRs), 3 pairs = 3 seam walkthroughs. For a quartet, 6 pairs. Probably caps practical usage at ≤4 ADRs per invocation.

---

## Files

- This review: `docs/work/channel-io-unification/triple-review-20260501.md`
- ADRs reviewed:
  - `docs/architecture/adrs/adr-163-channel-service-platform.md`
  - `docs/architecture/adrs/adr-164-stateless-multiuser-server.md`
  - `docs/architecture/adrs/adr-165-renderer-architecture.md`
- Spike: `spikes/channel-io/index.html` + `spikes/channel-io/findings.md`
