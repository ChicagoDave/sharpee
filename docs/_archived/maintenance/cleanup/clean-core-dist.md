# Clean Core Package Build Artifacts

This script removes old build artifacts from the core package dist directory.

## PowerShell Commands:
```powershell
# From repository root
Remove-Item -Recurse -Force packages/core/dist/command
Remove-Item -Recurse -Force packages/core/dist/command.deleted
Remove-Item -Recurse -Force packages/core/dist/if-types.bak.deleted
Remove-Item -Recurse -Force packages/core/dist
```

## WSL Bash Commands:
```bash
# From repository root
rm -rf packages/core/dist/command
rm -rf packages/core/dist/command.deleted
rm -rf packages/core/dist/if-types.bak.deleted
rm -rf packages/core/dist
```

After running these commands, rebuild the core package:
```bash
cd packages/core
npm run build
```
