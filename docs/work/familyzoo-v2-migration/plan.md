# Plan — Split Family Zoo tutorial into v1.5.0 / v2.0.0 editions

**Status:** Phase 1 COMPLETE (the split). Phases 2–4 pending.
**Target:** `tutorials/familyzoo/`
**Approach:** Mirror the **book split** from session 20260701-0128 — freeze the current
1.x tutorial as a `v1.5.0` edition and fork a `v2.0.0` edition that later receives the
Phrase Algebra migration. This supersedes the earlier "in-place migration" framing.

---

## 1. Why split instead of migrate in place

The release strategy ([[release-strategy-v1-5-v2-0]]) runs **two side-by-side lines**:
`v1.5.0` (uniform republish of the compatible 1.x code, book/tutorial pin `^1.5`) and
`v2.0.0` (the breaking Phrase Algebra line, book/tutorial pin `^2.0`). Last session the
**book** was split exactly this way (`docs/book/v1.5.0/`, `docs/book/v2.0.0/`). The
tutorial is the book's code companion, so it splits the same way: existing readers on the
1.x book keep a working tutorial; the v2.0.0 edition is developed against phrase algebra
without disturbing it.

> **Supersedes:** the book-split session summary (`20260701-0128`) §Next Phase item 3
> recorded the follow-on as "Repoint tutorials/familyzoo to `^2.0` and rebuild via
> devkit" — a single-edition repoint. This plan replaces that with a **two-edition
> split** (v1.5.0 frozen + v2.0.0 migrated), consistent with the two-line release
> strategy. That next-step note should be treated as out of date.

### Precedent — how the book split was done (the template we follow)
1. `git mv` flat `docs/book/**` → `docs/book/v1.5.0/` (history-preserving renames).
2. `cp -r v1.5.0` → `docs/book/v2.0.0/` (self-contained copy).
3. Edit each edition's metadata (subtitle) to identify the line.
4. Rewrite the build script to take a `<version>` argument resolving per-edition.

---

## 2. Current state of the tutorial (what we're splitting)

`tutorials/familyzoo/` is a **standalone, non-workspace** project (confirmed in
`pnpm-workspace.yaml`) that consumes **published** `@sharpee/*` packages via devkit —
already self-contained like the book. Contents:

- `package.json` (pins `@sharpee/* ^1.x`, `@sharpee/devkit ^1.1.4`), `tsconfig.json`
- `src/` — chNN cumulative snapshots + two multi-file finals
  (`ch24-27-presentation/` = default entry; `ch28-multi-file/` = the variant ported to
  `stories/friendly-zoo`), `browser-entry.ts`, `version.ts` (auto-stamped)
- `docs/` — `tutorial.md` + `v01…v16*.md`
- `tests/transcripts/` — 16 `vNN-*.transcript` (substring assertions)
- `browser/familyzoo.css`
- `src/README.md` — the chapter↔file map (source of truth for the curriculum)

### External references to the `tutorials/familyzoo` path (must be re-pointed after split)
Nearly all are informational, not build-critical:
- `README.md:243` — package table row → **update** to the two editions.
- `website/src/pages/docs/tutorials/family-zoo.mdx` — **already stale** (references a
  `src/v17/` layout that no longer exists); update as part of this.
- `website/src/pages/docs/developer-guide/project-structure.mdx:66` — dir tree diagram.
- `tools/repokit/src/{repo.ts,commands/test-npm.ts,consumer-gen.ts}` — **comments only**;
  no hard path dependency. Low priority.
- `tools/zifmia/tests/story-scanner.test.ts` — uses a synthetic `familyzoo.sharpee`
  filename in a temp dir; **not** coupled to the path. No change.

---

## 3. Target layout

```
tutorials/familyzoo/
  v1.5.0/     # frozen 1.x edition — current chNN snapshots verbatim, pins ^1.5
    package.json  src/  docs/  tests/  browser/  tsconfig.json  ...
  v2.0.0/     # fork — receives the Phrase Algebra migration, pins ^2.0
    package.json  src/  docs/  tests/  browser/  tsconfig.json  ...
```

Each edition is a complete, independently-buildable devkit project (self-contained,
mirroring the book's per-edition isolation — no shared files across editions).

---

## 4. Phase 1 — The split (mechanical; mirrors the book)

1. **`git mv`** every current top-level item under `tutorials/familyzoo/` into
   `tutorials/familyzoo/v1.5.0/` (history-preserving): `src/`, `docs/`, `tests/`,
   `browser/`, `package.json`, `tsconfig.json`, and any dotfiles.
2. **`cp -r`** `tutorials/familyzoo/v1.5.0/` → `tutorials/familyzoo/v2.0.0/`.
3. **`v1.5.0/package.json`**: set `version` → `1.5.0`; normalize the `@sharpee/*` pins to
   `^1.5` (uniform 1.5 line per release strategy); `@sharpee/devkit` → `^1.5`. Name
   stays `familyzoo` (standalone, never published — path + version disambiguate).
4. **`v2.0.0/package.json`**: set `version` → `2.0.0`; `@sharpee/*` → `^2.0`;
   `@sharpee/devkit` → `^2.0`.
5. Leave `src/version.ts` alone in both — it is auto-stamped by `sharpee build`.

**This phase does no code migration.** v2.0.0 at the end of Phase 1 is a byte-identical
copy of v1.5.0 except for its dependency pins — it will not build correctly against
phrase-algebra packages yet. That is Phase 4.

*Gate:* `git status` shows the v1.5.0 moves as renames; the two trees differ only in the
`package.json` edits from steps 3–4.

> **Done (session 3c69ac):** 69 files `git mv`'d into `v1.5.0/` (tracked renames);
> `v2.0.0/` is a staged 69-file copy. `v1.5.0/package.json` → `1.5.0` + uniform `^1.5.0`;
> `v2.0.0/package.json` → `2.0.0` + uniform `^2.0.0`.
> **Known caveat:** both editions' `pnpm-lock.yaml` are now stale relative to their new
> pins (they still lock the drifted 1.x versions). Neither the 1.5.0 nor 2.0.0
> `@sharpee/*` line is published, so the lockfiles can only be regenerated at first
> install once the respective line ships. Left in place (not deleted) pending that.

---

## 5. Phase 2 — Re-point external references

- `README.md` package table → describe both editions and their pins.
- `website/.../family-zoo.mdx` — rewrite the stale `src/v17/` section to the current
  chNN layout **and** the new `v1.5.0/` `v2.0.0/` edition split.
- `website/.../project-structure.mdx` — update the dir-tree node.
- (Optional) refresh the repokit comments if we touch those files for other reasons.

*Gate:* no remaining references to a bare `tutorials/familyzoo/{src,docs,…}` path that
now lives under an edition subdir.

---

## 6. Phase 3 — Freeze & verify v1.5.0

v1.5.0 is the **current, working** 1.x tutorial moved verbatim. No code changes.

- Verify it still builds/tests against `^1.5` published packages — **gated on the
  v1.5.0 `@sharpee/*` packages being published from the `sharpee_v1` clone** (the user
  drives that publish; [[release-strategy-v1-5-v2-0]]).
- Until then, v1.5.0 is "frozen as-is"; validation is deferred to post-publish.

---

## 7. Phase 4 — Migrate the `v2.0.0/` edition to Phrase Algebra (the real work; follow-on)

This is the previously-analysed migration, now scoped to `tutorials/familyzoo/v2.0.0/`
only. Three tiers (full per-file detail from the surveys retained below):

### Tier H — HARD BREAKS (won't compile / render blank)
- `npcName` → `speaker: nounPhraseFor(npc)` (ADR-203) in `ch20-npcs.ts`,
  `ch22-timed-events.ts`, `ch23-scoring.ts`, `ch24-27-presentation/characters.ts`.
  Platform `npc.*` templates now read `{capitalize the speaker} {verb:… speaker}`; a
  missed emitter → **blank attribution** (primer §8).
- `world.helpers()` monkeypatch → `createHelpers(world)` (ADR-140) in the three
  `ch24-27-presentation/` files. Adopt `createHelpers` **unconditionally** — it is the
  recorded v2 direction ([[friendly-zoo-testing-target]]: the monkeypatch "does NOT
  survive the bundle"; friendly-zoo uses the explicit form, "the cleaner v2 direction").
  Whether the prototype patch happens to survive a standalone single-instance install
  only changes whether this counts as a correctness fix or a consistency cleanup — not
  whether to make the change.

### Tier I — IDIOMATIC (renders as a `Literal`, loses article/agreement/reference)
- String params → `nounPhraseFor(entity, ctx)` (ADR-158) in `ch14`, `ch15`, `ch20`
  (`params: { target: name }` / `entity.name`).
- Doc snippet fixes: `v11-npcs.md` (`npcName`→`speaker`), `v14-capability-dispatch.md`
  (`entity.name`→`nounPhraseFor`).

### Tier N — NEW FEATURE / TEACHING CONTENT (already implemented in `stories/friendly-zoo`)
Port from the proven friendly-zoo reference into the v2.0.0 snapshots:
- `.initialDescription()` first-visit room text (ADR-196) — builder method now exists.
- `detailWhenLit` / `detailWhenOn` → examine `{slot:detail}` (ADR-195 S2).
- `{slot:here}` room-occupant presence contributor + `PresenceMessages` (ADR-195 S1).
- `Optional`/`Choice` dynamic text — new `dynamic-text.ts` (ADR-196).
- A new phrase-authoring chapter (`{the x}`, `{verb:…}`, `{verbatim:…}`, `{contents:…}`,
  params nesting ADR-206, speaker agreement) aligned with the book's `docs/book/v2.0.0/`.

### Phase 4 sub-decisions
- **Scope** — Tier H only (mechanical parity) vs +I (idiomatic) vs +N (full showcase).
  Recommend the full showcase, sequenced H→I→N so the correctness floor validates first.
- **Two finals** — reconcile `ch24-27-presentation` (default entry) vs `ch28-multi-file`
  (the friendly-zoo-ported variant).
- **friendly-zoo relationship** — it stays the in-workspace v2 reference; the v2.0.0
  edition is the standalone/devkit companion. Keep in sync, don't merge.

---

## 8. The publish-sequencing constraint (unchanged, now per-edition)

`sharpee build` resolves `@sharpee/*` from the project's `node_modules` (published
packages). Therefore:
- **v1.5.0** can't be validated until the **v1.5.0** `@sharpee/*` line is published.
- **v2.0.0** can't be validated until the **v2.0.0** line is published.
- **Editing** (the split + the migration) needs nothing published.
- Optional pre-publish validation: npm-pack tarballs / verdaccio / `pnpm link` into the
  edition's `node_modules`. `stories/friendly-zoo` already proves the ch28 code path
  in-workspace, de-risking most of Tier N.

---

## 9. Open questions / decisions

1. **Edition naming** — subdir `v1.5.0/` `v2.0.0/` (mirror the book) vs package-name
   suffixes. Recommend subdirs, for exact parity with the book split.
2. **v1.5.0 pins** — normalize the drifted `^1.x` to a uniform `^1.5` now, or leave until
   the v1.5.0 packages publish? Recommend normalize now (matches the release strategy).
3. **Phase 4 scope** — H / H+I / H+I+N (see §7).
4. **Sequencing** — split now (Phases 1–2) and defer Phase 4 migration, or do both in one
   pass? The split is safe and independent; recommend landing it first.

---

## 10. References consulted

- Session `20260701-0128` book-split summary (the split template)
- `pnpm-workspace.yaml` (familyzoo is standalone, not a workspace member)
- `tutorials/familyzoo/src/README.md` (chapter↔file map)
- `packages/devkit/src/standalone/build.ts` (devkit build/resolve/test mechanism)
- `docs/reference/phrase-algebra-primer.md` (§§3, 6, 8, 11, 12, 15) — Phase 4 basis
- Memory: [[release-strategy-v1-5-v2-0]], [[phrase-algebra-primer]], [[friendly-zoo-testing-target]]
- Three background surveys (ch28↔friendly-zoo diff; progressive-chapter break scan; docs
  scan) — full per-file findings drive §7
- ADRs: 140, 158, 190, 192–201, 203, 206
