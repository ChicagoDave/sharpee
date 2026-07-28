# Web Extensions — concept capture

**Status: captured, not designed.** These are David's rulings from a design
conversation on 2026-07-28 (session aaa5bb), recorded so they survive. No ADR
yet — the concept moved several times during the conversation and is written
down here rather than frozen prematurely.

Not to be implemented from this document.

## Origin

Emerged sideways out of the ADR-286 template-DSL grammar freeze. The sketch's
`compass` slot turned out to mean a **Compass Rose with clickable directions
highlighting open directions**, which is not a layout concern at all. Chasing
what a compass actually needs surfaced a general capability, and the compass
became its first consumer rather than the subject.

## What a Web Extension is

A governed bundle, specific to the **web browser client** — explicitly *not*
the existing platform-extension system (ADR-022 / ADR-111 / ADR-215 / ADR-120,
`packages/extensions/`, `packages/plugins/`), which is engine-side. Same word,
different thing; see Open Questions on the naming collision.

Three parts:

1. **A channel definition with a contract** — the channel plus the declared
   data elements it carries, so the component consuming it knows what it gets.
2. **Assets** — image, audio, and the html component.
3. **A defined path for the html component to send commands to the engine.**

The author creates the channel and supplies the assets that consume its data.
The platform does **not** ship the channel or a default component for any
given extension — it ships the mechanism.

## Settled

- **Shareable.** Whether an author shares is their choice, but extensions
  absolutely can be shared between authors.
- **They live in the workspace, not in a story.** Under the project home:

  ```
  ~/Documents/Chord/
      web-extensions/     ← shared; every story sees all of them
      the-lost-key/
      fernhill/
  ```

  This lands on ADR-280 D2's project home, which `StoryHome`
  (`tools/ide/SharpeeIDE/Workspace/StoryHome.swift`, ADR-280 Phase 1) already
  owns — the natural place to resolve `<root>/web-extensions/`.
- **Discovery is by location; inclusion stays explicit.** Every story *sees*
  every installed extension; a story only *gets* one by declaring it. No
  implicit coupling, and the contract check has something to fire on.
- **Chord Writer gets a new thing for Web Extensions** — its own surface, not
  a subgroup of Assets. (An earlier ruling put them under
  `Assets → Web Components`; that was before they moved outside the story, and
  a library shared across stories is not a per-project group.)
- **Chord Writer gets Add Web Extension.** Note this is *three* operations,
  not one: copy/register the extension, register the channel contract so the
  story compiles against it, and place it in the `.templates` layout. A copy
  alone means the author installs a compass and nothing appears.
- **Chord Writer gets Export / Import for stories.** Export packages a story
  with all required files (including referenced extensions); Import pulls that
  package back in. This is what keeps stories shareable now that a story
  folder is no longer self-contained on disk.
- **Packaging: a file, not npm.** Folder as the working form, a single
  distributable file for sharing. Explicitly *not* an npm package — ADR-279
  just spent a phase sealing a Node toolchain inside the app so writers never
  meet one, and the standing ruling is that built-ins ship with the platform
  rather than as a package per feature.
- **A hosted Web Extension repository is a plausible future**, with **strict
  security review for "blessed" extensions**. HTML assets are not meaningfully
  sandboxable inside a published story, so curation is the available lever,
  not isolation.

## Consequences already identified

- **A story folder stops being self-contained on disk** — it may declare an
  extension the recipient does not have. Export/Import is the answer for
  source sharing; `sharpee publish` (ADR-284) gathers referenced extensions
  into the built artifact.
- **A shared extension is third-party code an author redistributes to their
  readers.** That is the surface the repository blessing exists to address.
- **The manifest is the interesting file**, not bookkeeping: it declares the
  channel, the contract's data elements, and which asset is the component.
  It gives the IDE something to validate at install and the build something to
  fail on — a contract mismatch should be a compile error, not a blank box at
  play time.
- **Sharing implies versioning.** Two authors on different vintages of the
  same extension makes the channel contract an interface. The manifest should
  carry a version from day one even if nothing consumes it yet.

## Open questions

1. **"Outside the Story" — outside the story *source*, or outside the story
   *folder*?** The workspace ruling implies the folder, but this was never
   said outright and it changes what Export has to gather.
2. **Stories outside the project home see no extensions.** ADR-280 Phase 1
   deliberately kept "Choose Location…", and David's own story landed in
   `~/repos/ifstories/` before any of this. Either discovery needs a fallback
   or the home stops being optional in practice.
3. **Unblessed extensions.** A repository with blessed entries implies an
   unblessed path. What happens when an author installs an unreviewed
   extension — allowed with a warning, blocked, allowed but marked in the
   published artifact?
4. **Are html components literally custom elements?** If yes they carry script
   by definition, they register themselves rather than being bound by the
   client, and there is no binding contract to design. If they are markup
   fragments the client binds into, there is. This decides a large part of the
   architecture. (Also: ADR-170 commits the client to framework-free, and
   "Web Components" is the W3C term.)
5. **The command path's contract.** Working assumption from the conversation:
   the component submits an ordinary command string through the existing
   `InputManager.onCommand` — indistinguishable from typing, which is what
   keeps multi-user needing nothing new and keeps ADR-282's transcript
   recording working (a clicked "north" records as `north`). Never confirmed.
6. **Naming.** "Web Extension" collides twice: with Sharpee's own platform
   extensions, and with the browser-vendor term for Chrome/Firefox add-ons.
   Cheaper to change now than after it reaches the book.

## Verified groundwork (from the compass investigation)

Still accurate regardless of how the concept settles:

- No `exits` channel exists anywhere in platform-browser, engine, or stdlib.
- The data exists: `RoomBehavior` reads `roomTrait.exits` and
  `roomTrait.blockedExits` (direction → message), and owns room lighting.
- There are **twelve** directions
  (`packages/world-model/src/constants/directions.ts`): eight compass points
  plus `UP`/`DOWN`/`IN`/`OUT`, deliberately language-agnostic constants with
  the parser owning the English mapping. A rose renders eight of them.
- Standard channels live in `packages/stdlib/src/channels/standard.ts` as
  `IOChannel` values with a `produce(ctx)` closure reading the world.
- `InputManager.onCommand` exists and is wired **only** to the command input's
  Enter key — nothing else in the client submits a command.

## Relationship to ADR-288

ADR-288 (compass rose) was drafted mid-conversation and its core decisions —
a platform-shipped `exits` channel and a platform-shipped default rose — were
overtaken by the ruling that the author creates the channel and supplies the
assets. It is marked superseded in place. Whatever replaces it should be an
ADR about Web Extensions, with the compass as the worked example.
