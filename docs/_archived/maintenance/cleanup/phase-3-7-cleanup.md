# Files and Directories to Delete

The following files and directories were moved during the Phase 3.7 cleanup and should be deleted:

## In packages/core/src/
- `command.deleted/` - Contains old command processing types (moved to world-model)
- `if-types.bak.deleted/` - Old IF-specific types backup
- `events/debug-events.ts.old.deleted` - Old debug events implementation

## How to delete
Run these commands from the repository root:

```bash
# Windows PowerShell
Remove-Item -Recurse -Force packages/core/src/command.deleted
Remove-Item -Recurse -Force packages/core/src/if-types.bak.deleted
Remove-Item -Force packages/core/src/events/debug-events.ts.old.deleted

# WSL Bash
rm -rf packages/core/src/command.deleted
rm -rf packages/core/src/if-types.bak.deleted
rm -f packages/core/src/events/debug-events.ts.old.deleted
```

## Verification
After deletion, run:
```bash
npm run build
```

To ensure everything still compiles correctly.
