# Work Summary: npm Beta Release Complete

**Date:** 2026-01-01 13:45 - 15:15
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

## Version History (This Session)

| Version | Change | Result |
|---------|--------|--------|
| beta.7 | Had OIDC configured | 404 error |
| beta.8 | Added `--provenance` flag | 404 error (provenance signed!) |
| beta.9 | Added `environment: prod` | 404 error |
| beta.10 | Removed environment from npm config | 404 error |
| beta.11 | Removed environment from workflow | 404 error |
| beta.12 | Switched to NPM_TOKEN auth | Published but `workspace:*` not converted |
| beta.13 | Changed to `pnpm publish` | Success! |

## Lessons Learned

1. **npm OIDC Trusted Publishing is unreliable** - Provenance signed successfully but npm returned 404. No clear root cause despite correct configuration.

2. **Use `pnpm publish` not `npm publish`** - Only pnpm converts `workspace:*` protocol to real version numbers during publish.

3. **Token auth just works** - Classic npm Automation token is simple and reliable.

4. **Shields.io badge needs dist-tag** - Use `/beta` in URL to show beta version instead of latest.

## Next Steps

- Documentation and examples
- Continue Dungeon implementation
- First stable release when ready
