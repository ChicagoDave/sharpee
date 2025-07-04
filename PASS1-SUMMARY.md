# Pass 1: Clean Build Configuration Summary

## What Pass 1 Does

1. **Cleans all build artifacts**
   - Removes all `dist/` and `lib/` folders from packages
   - Ensures a clean slate for builds

2. **Standardizes tsconfig.json files**
   - All packages use the same simple configuration
   - Output goes to `./dist/`
   - Source files from `./src/`
   - No composite mode or project references (keeping it simple)
   - Declaration files are generated

3. **Updates package.json files**
   - Ensures `main` points to `dist/index.js`
   - Ensures `types` points to `dist/index.d.ts`
   - Identifies workspace:* dependencies (to be fixed in Pass 2)

## Files Created

- `/scripts/clean-all.sh` - Removes all dist/lib folders
- `/scripts/create-standard-tsconfigs.sh` - Creates simple, standard tsconfig.json files
- `/scripts/update-package-json.sh` - Updates package.json main/types fields
- `/scripts/build-all.sh` - Builds packages in dependency order
- `/pass1-cleanup.sh` - Master script that runs all of Pass 1

## To Run Pass 1

```bash
chmod +x pass1-cleanup.sh
./pass1-cleanup.sh
```

## After Pass 1

You'll have:
- Clean package directories (no dist/lib folders)
- Standardized tsconfig.json files in all packages
- Package.json files pointing to the right output locations
- Ready for Pass 2 to handle dependencies and imports
