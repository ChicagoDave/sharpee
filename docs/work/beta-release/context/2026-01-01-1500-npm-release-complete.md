# Work Summary: npm Beta Release Complete

**Date:** 2026-01-01 15:00
**Branch:** `main`
**Status:** Complete - packages published to npm

## Result

All 11 Sharpee packages published to npm at version 0.9.1-beta.13:

```bash
npm install @sharpee/sharpee@beta
```

## Journey Summary

Multiple attempts to get CI/CD publishing working:

1. **OIDC Trusted Publishing** (beta.7 - beta.11): Failed despite correct configuration
   - Provenance signed successfully but npm returned 404
   - Tried with/without GitHub environment
   - Root cause never determined - likely npm OIDC quirk

2. **Token Auth** (beta.12): Worked but `workspace:*` not converted
   - `npm publish` doesn't understand pnpm's workspace protocol
   - Packages published with `workspace:*` dependencies - unusable

3. **pnpm publish** (beta.13): Success
   - `pnpm publish` converts `workspace:*` to real versions
   - All 11 packages published correctly

## Final Workflow Configuration

```yaml
- name: Publish to npm
  run: |
    for pkg in core if-domain world-model if-services text-services lang-en-us parser-en-us event-processor stdlib engine sharpee; do
      cd "packages/$pkg"
      pnpm publish --tag beta --access public --no-git-checks
      cd ../..
    done
  env:
    NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}
```

Key points:
- Use `pnpm publish` (not `npm publish`) to convert workspace deps
- Use classic npm Automation token stored as `NPM_TOKEN` secret
- `--no-git-checks` needed because we're publishing from tag checkout

## Packages Published

| Package | Version |
|---------|---------|
| @sharpee/core | 0.9.1-beta.13 |
| @sharpee/if-domain | 0.9.1-beta.13 |
| @sharpee/world-model | 0.9.1-beta.13 |
| @sharpee/if-services | 0.9.1-beta.13 |
| @sharpee/text-services | 0.9.1-beta.13 |
| @sharpee/lang-en-us | 0.9.1-beta.13 |
| @sharpee/parser-en-us | 0.9.1-beta.13 |
| @sharpee/event-processor | 0.9.1-beta.13 |
| @sharpee/stdlib | 0.9.1-beta.13 |
| @sharpee/engine | 0.9.1-beta.13 |
| @sharpee/sharpee | 0.9.1-beta.13 |

## README Updated

Cleaned up README.md from 271 lines of aspirational content to 61 lines of accurate info:
- Installation instructions
- Package list
- Feature summary
- Coming soon: docs, examples, Dungeon

## Files Changed

- `.github/workflows/beta-release.yml` - Final working configuration
- `packages/*/package.json` - Version 0.9.1-beta.13
- `README.md` - Updated for beta release

## Next Steps

- Documentation and examples
- Continue Dungeon implementation
- First stable release when ready
