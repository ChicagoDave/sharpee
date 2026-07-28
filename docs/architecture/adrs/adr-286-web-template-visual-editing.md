# ADR-286: The Web Template — a plain-files contract that visual editors can round-trip

## Status: DRAFT (2026-07-27, session fda0f0) — Open Questions unresolved

## Date: 2026-07-27

## Parent: ADR-280 (project model — names the Web Template artifact), ADR-170/platform-browser (the framework-free client being templated), ADR-284 (publishing — delivers what the template promises). Standing ruling: the web client is author-customizable; platform ships defaults, authors override per story.

## Context — verified, not assumed

- **The Web Template artifact** (ADR-280 D1) is the per-story override of
  the browser client's `index.html`/css/assets. The platform client is
  deliberately framework-free (ADR-170) — the template is plain HTML/CSS,
  no build step, no JSX.
- **The client needs its mount points**: the browser client expects its
  slots/hooks in the document (e.g. the `sharpee-media` slot,
  `packages/platform-browser/src/BrowserClient.ts`). A template edit that
  removes them breaks the story's UI at publish time.
- **Third-party visual editors were assessed 2026-07-27** (maintenance
  verified, per standing dependency-health rule):
  - **Pinegrow** (desktop, macOS; 9.3 shipped June 2026, active) edits
    real HTML/CSS files in place — round-trips a file-based template with
    no import/export.
  - **GrapesJS** (BSD-3 framework, 0.22.16, active and commercially
    sustained) is embeddable — a candidate for an in-app visual editor
    pane, not a tool writers are sent to.
  - Webflow/Framer-class SaaS exporters are one-way — no round-trip, poor
    fit.

## Decision

### D1 — The Web Template is a contract: plain standard files with protected regions

The template stays **clean, standard HTML/CSS on disk** — that property is
what makes every external editor viable, so it is the contract, not an
accident. The contract names the **protected regions**: the client's mount
points/hooks that must survive editing. Protection is by explicit marking
in the template (mechanism in Q-1) plus **validation at build/publish**:
a template missing required mount points fails the ADR-284 publish with a
named, writer-readable error — never a silently broken story.

### D2 — External editing is supported by construction, and acknowledged in the UI

Because D1 holds, Pinegrow-class editors round-trip the template with zero
integration work. The IDE acknowledges this with an "Edit Web Template in
External Editor" affordance (opens the template folder/file with the
user's chosen app) rather than pretending the app is the only editor. No
partnership, no bundling, no dependency — the contract does the work.

## Acceptance

1. A template edited in an external editor (mount points intact) publishes
   (ADR-284) and the story runs with the customization.
2. A template with a required mount point removed fails Publish with an
   error naming the missing region — a test pins this validation.
3. The seeded template (ADR-280 D3) carries the protected-region markings
   and passes validation untouched.

## Consequences

- The mount-point set becomes a versioned, documented contract between
  platform-browser and story projects; changing it is a platform decision
  with template-migration consequences, not a refactor.
- Publish (ADR-284) gains the validation step; the seeded template
  (ADR-280) is the contract's reference implementation.

## Open Questions

### Q-1: How are protected regions marked?
- **Why it matters**: candidates: HTML comment fences
  (`<!-- sharpee:begin/end -->`), `data-sharpee-*` attributes on the mount
  elements, or id-based convention only. Must survive visual editors'
  rewriting behavior — the marking IS the interop surface.
- **Blocks**: D1 validation; the seeded template.

### Q-2: Embed GrapesJS as an in-app visual editor?
- **Why it matters**: a WKWebView-embedded GrapesJS pane would make the
  Web Template visually editable inside Chord Writer — no third-party
  purchase in the writer's path. Verified healthy (BSD-3, active,
  commercially sustained). Real scope: embedding, protected-region
  enforcement inside the editor, and keeping its output within the D1
  contract. Now, later, or never is David's call.
- **Blocks**: nothing — D1/D2 stand alone; this is the additive in-app
  path.

## Session

Drafted 2026-07-27, session fda0f0, from the basic-features conversation
and the editor-health check (`docs/context/session-20260727-2100-main.md`).
