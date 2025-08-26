# Project Instructions for Claude

## Testing Commands

- **DO NOT** use `2>&1` with pnpm commands - they don't work together properly
- Use pnpm commands without output redirection
- Preferred test command format: `pnpm --filter '@sharpee/stdlib' test <test-name>`

## Project-Specific Notes

This is the Sharpee interactive fiction engine project. Key points:
- Uses pnpm workspace with multiple packages
- Main packages: engine, stdlib, world-model, parser-en-us
- Actions follow validate/execute pattern (ADR-051)
- Event handlers for custom logic (ADR-052)
- never use scripts. modify one file/problem at a time
- we never care about backward compatibility, but if there are code smells or design flaws, we discuss options first

Sharpee logic:
- Traits are in packages/world-model/src/traits - read the list
- Actions are in packages/stdlib/src/actions/standard where each action is in a subdirectory with three files: action.ts, action-events.ts, and action-data.ts
