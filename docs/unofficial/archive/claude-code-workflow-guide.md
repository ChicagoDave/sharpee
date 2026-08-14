# Claude Code Workflow Guide

A guide to productive collaboration with Claude Code, based on real project experience. This guide is tool/framework agnostic and can be adapted to any software project.

## Philosophy

This workflow optimizes for:
- **Context continuity** across sessions (Claude Code forgets between compacts)
- **Traceability** of decisions and work completed
- **Efficient handoffs** between sessions
- **Autonomous work** when the user is away

## Key Commands to Know

| Command | Purpose |
|---------|---------|
| `write work summary` | Triggers the work-summary-writer agent to document completed work |
| `/context` | Shows remaining context - **check this often!** |
| `/compact` | Compresses context when running low |
| `/help` | Get help with Claude Code features |

---

## Context Management (READ THIS FIRST)

Claude Code has a finite context window. When it fills up, you lose the conversation history. **This is the #1 cause of lost work.**

### The Golden Rule

**Check `/context` regularly. At 10% remaining, stop everything and save your work.**

### The Safe Restart Workflow

When context is running low (~10-15% remaining):

1. **STOP** all current work immediately
2. **SAVE** - Tell Claude `write work summary`
3. **COMMIT** - `git add . && git commit -m "WIP: saving before context reset"`
4. **PUSH** - `git push`
5. **CLOSE** Claude Code completely
6. **RESTART** Claude Code fresh
7. **READ** - Ask Claude to read your last work summary
8. **CONTINUE** with full context available

### Why Not Just /compact?

`/compact` compresses context but Claude loses nuance and details. A full restart with a good work summary gives Claude:
- Fresh, full context window
- Your detailed notes on what was done
- Clear next steps to continue

### Warning Signs

- Claude starts forgetting earlier decisions
- Responses become slower
- You're doing complex multi-file work
- Session has been running for hours

**When in doubt, check `/context`.**

---

## Folder Structure

Organize your project with these directories:

```
project/
├── .claude/
│   ├── settings.json       # Hooks configuration
│   └── hooks/              # Shell scripts for automation
├── docs/
│   ├── context/            # Session summaries (progressive)
│   │   ├── .session-template.md
│   │   ├── session-YYYYMMDD-HHMM-{branch}.md
│   │   └── archived/       # Old sessions
│   ├── architecture/
│   │   └── adrs/           # Architecture Decision Records
│   ├── work/
│   │   └── {branch}/       # Work area matching git branch name
│   │       ├── README.md
│   │       ├── implementation-plan.md
│   │       ├── *.md        # Plans, research, specs, evidence
│   │       └── context/    # Detailed work summaries
│   └── reference/          # Stable reference docs
├── CLAUDE.md               # Project instructions for Claude
└── ...
```

### Purpose of Each Area

| Directory | Purpose | Updated |
|-----------|---------|---------|
| `docs/context/` | Session-level progress summaries | Every session |
| `docs/work/{branch}/` | **All artifacts for a branch**: plans, specs, research, evidence | Throughout feature work |
| `docs/work/{branch}/context/` | Detailed work summaries | After significant work |
| `docs/architecture/adrs/` | Architecture decisions | When making design choices |
| `CLAUDE.md` | Project instructions Claude reads automatically | As patterns emerge |

### The Branch = Work Folder Pattern

**Your git branch name should match your work folder.** If you're on branch `feature-auth`, your work lives in `docs/work/feature-auth/`.

This folder contains everything related to that work:
- `README.md` - Overview of the feature/project
- `implementation-plan.md` - Tracking progress
- Research notes, specs, design docs
- `context/` subfolder for work summaries

When the branch merges to main, the work folder stays as historical documentation.

---

## Project-Specific Layouts

The `docs/` and `.claude/` folders integrate with any project structure. Here are common examples:

### TypeScript + Node.js

```
project/
├── .claude/
│   ├── settings.json
│   └── hooks/
├── docs/
│   ├── context/
│   ├── architecture/adrs/
│   └── work/{branch}/
├── src/
│   ├── index.ts
│   ├── services/
│   ├── utils/
│   └── types/
├── tests/
│   ├── unit/
│   └── integration/
├── dist/                    # Build output
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

### React Web App

```
project/
├── .claude/
│   ├── settings.json
│   └── hooks/
├── docs/
│   ├── context/
│   ├── architecture/adrs/
│   └── work/{branch}/
├── public/
├── src/
│   ├── components/
│   │   ├── ui/              # Reusable UI components
│   │   └── features/        # Feature-specific components
│   ├── hooks/
│   ├── pages/               # Or routes/
│   ├── services/            # API calls
│   ├── store/               # State management
│   ├── types/
│   ├── utils/
│   ├── App.tsx
│   └── index.tsx
├── tests/
│   ├── __mocks__/
│   └── components/
├── package.json
├── tsconfig.json
├── vite.config.ts           # Or webpack/CRA config
├── CLAUDE.md
└── README.md
```

### AWS Backend (CDK/SAM)

```
project/
├── .claude/
│   ├── settings.json
│   └── hooks/
├── docs/
│   ├── context/
│   ├── architecture/adrs/
│   └── work/{branch}/
├── infra/                   # CDK or SAM templates
│   ├── lib/
│   │   ├── stacks/
│   │   └── constructs/
│   ├── bin/
│   └── cdk.json
├── src/
│   ├── lambdas/
│   │   ├── api-handler/
│   │   ├── event-processor/
│   │   └── shared/          # Shared lambda code
│   ├── layers/              # Lambda layers
│   └── types/
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
├── scripts/                 # Deploy, test scripts
├── package.json
├── tsconfig.json
├── CLAUDE.md
└── README.md
```

### Monorepo (pnpm/npm workspaces)

```
project/
├── .claude/
│   ├── settings.json
│   └── hooks/
├── docs/
│   ├── context/
│   ├── architecture/adrs/
│   └── work/{branch}/
├── packages/
│   ├── core/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   ├── api/
│   │   ├── src/
│   │   ├── tests/
│   │   └── package.json
│   └── web/
│       ├── src/
│       ├── tests/
│       └── package.json
├── scripts/
├── package.json             # Workspace root
├── pnpm-workspace.yaml      # Or lerna.json
├── tsconfig.base.json
├── CLAUDE.md
└── README.md
```

### Key Points

- **`docs/` at root level** - Always at the project root, not inside `src/`
- **`.claude/` at root level** - Hooks and settings at project root
- **`CLAUDE.md` at root level** - Claude reads this automatically
- **Same pattern everywhere** - The workflow folders work with any tech stack

---

## Session Summaries

Session summaries provide context continuity. Create one at the start of each session.

### Template (`docs/context/.session-template.md`)

```markdown
# Session Summary: {{DATE}} - {{BRANCH}}

## Status: In Progress

## Goals
- (To be filled as work progresses)

## Completed
- (None yet)

## Key Decisions
- (None yet)

## Open Items
- (None yet)

## Files Modified
- (None yet)

## Notes
- Session started: {{TIMESTAMP}}
```

### Naming Convention

`session-YYYYMMDD-HHMM-{branch}.md`

Examples:
- `session-20260114-0945-feature-auth.md`
- `session-20260113-1010-api-refactor.md`

This ensures chronological sort order and groups sessions by branch/feature.

### When to Update

Update the session file:
- After completing significant chunks of work
- After key decisions or discoveries
- After test runs or builds
- Before context runs low (Claude will remind you)

---

## Work Summaries (Detailed Context)

For detailed work that spans multiple sessions, use the `docs/work/{branch}/context/` folder.

Since branch = work folder, if you're on branch `api-refactor`, your work summaries go in `docs/work/api-refactor/context/`.

### Naming Convention

`YYYY-MM-DD-HHMM-{topic}.md`

Examples:
- `2025-12-27-1737-project-kickoff.md`
- `2026-01-02-1500-auth-middleware-implementation.md`
- `2026-01-03-0930-database-migration-fixes.md`

### Structure

```markdown
# Work Summary: {Topic}

**Date**: YYYY-MM-DD
**Duration**: ~X hours
**Feature/Area**: {Description}
**Branch**: `{branch-name}`

## Objective
{What we set out to accomplish}

## What Was Accomplished
{Detailed description of work done}

## Key Decisions
{Important choices made and rationale}

## Challenges & Solutions
{Problems encountered and how they were solved}

## Code Quality
{Notes on testing, review, etc.}

## Next Steps
{What remains to be done}

## References
{Links to related files, ADRs, etc.}
```

### When to Create

Create a work summary:
- After completing a significant feature
- After a logical chunk of work (multi-hour sessions)
- When you want to preserve detailed context for future reference

**How to trigger:** Simply tell Claude Code `write work summary` and it will use the work-summary-writer agent to document what was accomplished. Do this proactively after completing features or before switching to different work.

---

## Hooks System

Automate session management with Claude Code hooks.

### Configuration (`.claude/settings.json`)

```json
{
  "hooks": {
    "SessionStart": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-start.sh"
          }
        ]
      }
    ],
    "PreCompact": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-finalize.sh"
          }
        ]
      }
    ],
    "Stop": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "bash .claude/hooks/session-update.sh"
          }
        ]
      }
    ]
  }
}
```

### Session Start Hook (`.claude/hooks/session-start.sh`)

```bash
#!/bin/bash
# SessionStart hook - create session summary for each new session

BRANCH=$(git branch --show-current 2>/dev/null || echo "unknown")
TODAY=$(date +%Y%m%d)
TIME=$(date +%H%M)
TIMESTAMP=$(date "+%Y-%m-%d %H:%M")
SESSION_DIR="docs/context"
SESSION_FILE="${SESSION_DIR}/session-${TODAY}-${TIME}-${BRANCH}.md"
TEMPLATE="${SESSION_DIR}/.session-template.md"

# Determine trigger type from stdin
TRIGGER=$(cat | jq -r '.source // "startup"' 2>/dev/null || echo "startup")

case "$TRIGGER" in
  resume|continue)
    LATEST=$(ls -t ${SESSION_DIR}/session-${TODAY}-*-${BRANCH}.md 2>/dev/null | head -1)
    if [ -n "$LATEST" ]; then
      echo "[Resuming session. Continue updating: $LATEST]"
    fi
    ;;
  startup|clear|*)
    # Find previous session for context
    PREV_SESSION=$(ls -t ${SESSION_DIR}/session-*-${BRANCH}.md 2>/dev/null | head -1)

    # Create new session file from template
    if [ -f "$TEMPLATE" ]; then
      sed -e "s/{{DATE}}/${TODAY}/g" \
          -e "s/{{BRANCH}}/${BRANCH}/g" \
          -e "s/{{TIMESTAMP}}/${TIMESTAMP}/g" \
          "$TEMPLATE" > "$SESSION_FILE"
      echo "[Created session summary: $SESSION_FILE]"

      # Show previous session for context
      if [ -n "$PREV_SESSION" ] && [ -f "$PREV_SESSION" ]; then
        echo ""
        echo "[Previous session: $PREV_SESSION]"
        echo "--- Previous Session Summary ---"
        cat "$PREV_SESSION"
        echo "--- End Previous Session ---"
      fi
    fi
    ;;
esac

exit 0
```

---

## Architecture Decision Records (ADRs)

Document significant design decisions.

### When to Write an ADR

- Before implementing complex features
- When choosing between multiple approaches
- When making decisions that affect the codebase long-term
- When you need to explain "why" to your future self

### Template

```markdown
# ADR-XXX: {Title}

## Status
Proposed | Accepted | Deprecated | Superseded by ADR-YYY

## Context
What issue motivated this decision?

## Decision
What change are we making?

## Consequences
What becomes easier or harder?

## Alternatives Considered
What other options were evaluated?
```

### Numbering

Use sequential numbers: ADR-001, ADR-002, etc.

### Index

Maintain a `README.md` in the ADRs folder that categorizes all decisions.

---

## Branch Workflow

Create branches for logical sets of work.

### Pattern

```
main                    # Stable, always works
├── feature-name        # Feature development
├── bugfix-name         # Bug fixes
└── project-name        # Larger project work
```

### Guidelines

- One branch per logical unit of work
- Merge to main when work is complete and tested
- Keep branches focused (not too broad)
- Use descriptive names: `feature-auth`, `api-refactor`, `bugfix-login`

---

## CLAUDE.md Structure

The project instructions file Claude reads automatically.

### Key Sections

```markdown
# Project Instructions for Claude

## Overview
Brief project description

## MAJOR DIRECTIONS
Critical rules (e.g., "never delete files without confirmation")

## Architecture Principles
Key patterns to follow (language separation, logic location, etc.)

## Current Work
What we're working on now, with links to planning docs

## Previous Work (Complete)
Recently completed work for context

## Core Concepts Reference
Links to reference docs Claude should read

## Project Structure
Package organization

## Testing Commands
How to run tests

## Work Patterns
Where to put planning docs, summaries, logs

## Key Locations
Important file paths
```

### Generic Patterns Worth Including

```markdown
## Work Patterns

- **Branch = Work Folder**: Branch `feature-x` → `docs/work/feature-x/`
- Plans, specs, research: `docs/work/{branch}/`
- Work summaries: `docs/work/{branch}/context/`
- Session summaries: `docs/context/`
- ADRs: `docs/architecture/adrs/`

## Autonomous Work Flow

### Progressive Session Summaries
At session start, create/update session file.
During session, update progressively.
Before compact, finalize summary.

### Context Management
When context usage is high:
1. Finalize session summary
2. Commit and push
3. Wait for /compact
4. After compact, read summary and continue
```

---

## Implementation Plans

For larger features, create an implementation plan.

### Structure

```markdown
# {Feature} Implementation Plan

**Target**: {What we're building}
**Current Progress**: {X/Y complete}

---

## Phase Breakdown

### Phase 1: {Name}
| Item | Status | Notes |
|------|--------|-------|
| Item 1 | Done | ... |
| Item 2 | In Progress | ... |

### Phase 2: {Name}
...

---

## Summary

| Category | Done | Total | % |
|----------|------|-------|---|
| API Endpoints | 5 | 10 | 50% |
| Tests | 20 | 20 | 100% |
| Components | 3 | 8 | 38% |

---

## Recently Completed
- Item 1 (date) - description
- Item 2 (date) - description

## Priority Next Steps
1. Next thing
2. Thing after that
```

### Tracking Progress

Update the implementation plan as work progresses:
- Mark items as done
- Add to "Recently Completed" section
- Keep "Priority Next Steps" current

---

## Unit Testing Practices

### Key Principles

1. **Test actual state changes, not just side effects**
   - Verify the actual state changed, not just that functions were called
   - Don't just check that events were emitted or logs written

2. **Use dedicated test commands**
   ```bash
   # Run specific test file
   npm test -- --grep "test name"
   pnpm test path/to/test.ts
   jest path/to/test.ts
   ```

3. **Transcript testing for integration**
   - Use transcript files for end-to-end testing
   - `.transcript` files define input/expected output

### Test File Organization

```
src/
├── __tests__/             # Test files alongside source
│   ├── unit/              # Unit tests
│   └── integration/       # Integration tests
└── test-utils/            # Shared test utilities

# Or for monorepos:
packages/{package}/
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## Quick Reference

### Session Start
1. Hook creates session file automatically
2. Claude sees previous session for context
3. Update session file as you work

### Completing Work
1. Update session summary
2. Create work summary if significant
3. Update implementation plan
4. Commit changes

### Making Decisions
1. Write ADR before implementation
2. Get approval if needed
3. Reference ADR in implementation

### Low Context Warning (CRITICAL)
1. Check `/context` regularly during work sessions
2. At ~10% remaining, STOP all work immediately
3. Tell Claude `write work summary`
4. Commit and push all changes
5. Close Claude Code completely
6. Restart Claude Code
7. Read the last work summary
8. Continue working with fresh context

### Starting New Feature
1. Create branch (e.g., `git checkout -b feature-auth`)
2. Create matching work directory (`docs/work/feature-auth/`)
3. Write `README.md` describing the feature
4. Write `implementation-plan.md` to track progress
5. Write ADRs for design decisions
6. Begin implementation

---

## The "Write Work Summary" Workflow

One of the most powerful patterns is using `write work summary` to document completed work.

### When to Use It

Tell Claude Code `write work summary` when:
- You've completed a feature or significant piece of functionality
- You're about to switch to a different task or feature
- You've finished a debugging session that solved a tricky problem
- Before ending a long work session
- After making important architectural decisions

### What It Does

The work-summary-writer agent:
1. Reviews the conversation context
2. Identifies what was accomplished
3. Documents key decisions and rationale
4. Notes any challenges and solutions
5. Lists files modified
6. Captures next steps

### Example Triggers

```
"write work summary"
"let's document what we just did"
"summarize the auth implementation we completed"
"write a summary of this session's work"
```

### Why This Matters

Work summaries serve as **detailed memory** that persists across context compacts. When you return to a feature later, you can:
1. Read the work summary to quickly understand what was done
2. See the decisions made and why
3. Pick up exactly where you left off

---

## Tips for Claude Code Users

1. **Check `/context` often** - This is the most important habit. Do it every 15-30 minutes.
2. **Stop at 10%** - Don't push your luck. Save work and restart fresh.
3. **`write work summary` liberally** - After every significant chunk of work
4. **Be explicit about file structure** - Claude Code reads CLAUDE.md automatically
5. **Use hooks for automation** - Session management, reminders, etc.
6. **Progressive updates** - Don't wait until end to update docs
7. **Branch per logical unit** - Keep work organized
8. **ADRs before code** - Document decisions upfront
9. **Session files = memory** - Your lifeline across restarts
10. **Work summaries = detailed memory** - The key to continuity across sessions
