# Issue Tracking

Internal issue tracking for Sharpee development.

## Structure

- `issues-list-NN.md` - Sequential issue lists, numbered as they fill up
- Each list contains a summary table and detailed issue sections

## Issue Format

Issues use the format `ISSUE-NNN` with sequential numbering across all lists.

| Field | Description |
|-------|-------------|
| Issue | Unique identifier (ISSUE-001, ISSUE-002, etc.) |
| Description | Brief summary of the problem |
| Severity | Critical, High, Medium, Low |
| Component | Affected area (Engine, Parser, Story, etc.) |
| Identified | Date discovered |
| Deferred | Date deferred (if applicable) |
| Fixed | Date resolved |

## Severity Guidelines

- **Critical**: Blocks gameplay or causes crashes
- **High**: Major feature broken or significant UX issue
- **Medium**: Feature works but incorrectly, or minor UX issue
- **Low**: Cosmetic, edge case, or nice-to-have fix

## Workflow

1. Add new issues to the current `issues-list-NN.md`
2. Update status as work progresses
3. Move to "Fixed" section with date when resolved
4. Start new list file when current one gets unwieldy

## GitHub Issues

GitHub Issues is reserved for user-reported bugs once sharpee.net launches. Internal development uses these markdown files for faster iteration.
