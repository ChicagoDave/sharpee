# 005 — Multi-user website *(name TBD)*

**Status**: ACCEPTED — the ADR line is settled; the product name is not
**Built?**: archived — a working server existed and was moved out of the workspace to `tools/_archive/zifmia` on 2026-08-13, along with `tools/_archive/shite` (the same server under a second name). `repokit`'s `--zifmia` flag and `zifmia` command were removed with it.
**Created**: 2026-05-10 (ADR-175, the product ADR; the server ADRs begin earlier)
**Target date**: TBD
**Target Sharpee version**: TBD
**Target Chord version**: n/a — a server and client concern, not a language one
**Traces to**: ADR-152, ADR-153, ADR-153a, ADR-156, ADR-164, ADR-175, ADR-176, ADR-177 · ADR-125 and ADR-130 (panels, packaging) · ADR-179 (published image)

---

## What it is

Playing a Sharpee story on the web with more than one person in it — a stateless multi-user
server, a browser client per user, and a component vocabulary for what each user sees.

The architecture falls out of channels (ADR-163): channels carry every story→UI signal, and
multi-user is a per-user Renderer over the same packet stream. That is why this is a product
built on the platform rather than a fork of it.

## The name is retired, the direction is not

**"Zifmia" is retired as a name** — it was misused, and the tool it named was never in
active development. The code is archived. **The ADR line remains a roadmap item and needs a
new name, which is TBD and is David's to choose.**

Two related notes that a reader will otherwise trip over:

- **"Multi-user," not "multi-player."** These are deliberately different concepts in this
  project. Multi-user is this item: several people in one story session. Multi-player /
  MPIF is a different IF concept, reserved for a possible future product, and is not what
  the ADR line above describes.
- **Archived is not deleted.** `tools/_archive/zifmia` is outside the pnpm workspace but
  still in the repository. Its two real-path test suites were pinned to the `.sharpee`
  bundle format, which is itself deprecated.

## Where it stands

Not in active development. The ADRs are accepted and the substrate they depend on —
channels, renderers, the stateless-server design — has held up and is used by other work.
What this item needs before anything resumes is a name and a decision about whether the
archived server is the starting point or a reference.
