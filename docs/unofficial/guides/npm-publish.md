# Publishing Sharpee to npm

How to publish all `@sharpee/*` packages to the npm registry.

## Prerequisites

### tsf (TypeScript Forge)

tsf is the build orchestration tool for the Sharpee monorepo. It handles versioning, building, and validation across all packages.

```bash
# Clone tsf alongside the sharpee repo
cd ..
git clone https://github.com/ChicagoDave/tsf.git
cd tsf
npm install
npm run build
```

After building, tsf is available at `../tsf/dist/cli/index.js`. You can alias it for convenience:

```bash
alias tsf="node $(pwd)/../tsf/dist/cli/index.js"
```

### npm account

You need publish access to the `@sharpee` scope on npm.

## Steps

### 1. Set the version

```bash
tsf version {new-version}
```

This updates `version` in every publishable `package.json` across the monorepo. Version format is `X.Y.Z` (e.g., `0.9.96`).

### 2. Build for npm

```bash
tsf build --npm
```

Compiles all packages with npm-specific output settings.

### 3. Log in to npm

```bash
npm login
```

Follow the interactive prompts (username, password, OTP if 2FA is enabled). Verify with:

```bash
npm whoami
```

### 4. Publish

```bash
tsf publish
```

Follow the validation prompts. tsf will:
- Validate each package has the correct version, entry points, and `publishConfig`
- Publish each package with `--access public` to the `@sharpee` scope
- Report success/failure for each package

### 5. Verify

```bash
npm view @sharpee/sharpee version
```

## Running the Regression Test

After publishing, run the npm consumer test to verify the packages work in isolation
(ADR-180 `devkit test:npm`, which replaced the old `npm-test*/` harnesses):

```bash
# Post-publish: install the published packages from the registry
./sharpee test:npm packages/devkit/fixtures/basic-story --registry

# Pre-publish: test the local `tsf build --npm` staging before you publish
./sharpee test:npm packages/devkit/fixtures/basic-story --local
```

This creates a temp directory, installs the requested `@sharpee/*` closure (registry
versions or local-staging tarballs), compiles the fixture story, and runs its transcript
suite covering all platform features. Point `test:npm` at any story location to verify a
real story — e.g. `test:npm tutorials/familyzoo --local`.
