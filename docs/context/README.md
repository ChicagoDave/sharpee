# `docs/context/`

Progressive session summaries and the project profile — the durable, committed
record of what each working session did. Per `CLAUDE.md`, a session file is
created here at session start (`session-YYYYMMDD-HHMM-{branch}.md`, from the
template at `.claude/.session-template.md`) and updated as the work proceeds.

Committed content:

| Path                       | What it is                                              |
| -------------------------- | ------------------------------------------------------- |
| `session-*.md`             | Per-session summaries, chronologically sortable          |
| `project-profile.md`       | Stack/domain profile, regenerated when stale (>7 days)   |

## DevArch runtime state, and its retention rule

DevArch's hooks also write four families of **gitignored** per-session runtime
files into this directory (`.gitignore` lines 164-167):

| Pattern                        | Written by                        |
| ------------------------------ | --------------------------------- |
| `.devarch-events-{id}.jsonl`   | `emit-event.sh` — the event log    |
| `.session-state-{id}.json`     | `session-state.sh` — tool counts   |
| `.devarch-gate-{id}`           | `gate.sh` — the session-start gate |
| `.devarch-gate-blocks-{id}`    | `gate.sh` — consecutive-block count |

Plus two singletons that do not accumulate: `.active-session` (the live session
id) and `.current-plan` (the pointer to the active plan).

**Nothing in DevArch removes any of them**, so the four families grow with every
session until the summaries above are buried in them. They also cannot be moved
elsewhere: `~/.devarch/hooks/{emit-event,gate,session-state,session-start}.sh`
hardcode `docs/context/` and state it as an invariant ("One name, one
directory"), and those files are overwritten on `devarch update` — so a
relocation would be undone by the next upgrade.

The retention rule is therefore applied here, by hand:

```bash
./scripts/prune-devarch-runtime.sh            # dry run — prints what it would remove
./scripts/prune-devarch-runtime.sh --apply    # retain the 20 most recent session ids
./scripts/prune-devarch-runtime.sh --apply --keep 40
```

Run it when this directory gets noisy; there is no CI gate and nothing runs it
automatically. It only ever selects the four patterns above, never a
`session-*.md` or either singleton pointer, and it never removes the files of
the session named by `.active-session` — a session mid-flight depends on them
existing where its hooks expect.

It also refuses to delete anything **git tracks**, reporting it as `SKIPPED`
instead. The `.gitignore` patterns do not make that redundant: a handful of
event logs were committed before the ignore rule was written (`55c5bc06`), and
gitignore has no effect on files already tracked. Removing one of those is a
deletion from the repository, so it is left to a human.

Keeping 20 is safe because no DevArch consumer reads a *historical* runtime
file: `standup` and `finalize`, like the hooks themselves, resolve `{id}` from
`.active-session` and read only the current session's state. The window exists
so a recent session summary can still be corroborated against its own event log.

## Related

- `docs/work/{target}/context/` — detailed, target-specific work summaries
- `docs/README.md` — the map of `docs/` as a whole
