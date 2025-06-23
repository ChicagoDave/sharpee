# Quick Fix Plan - Get Build Working

## The Core Issue
TypeScript can't resolve `@sharpee/world-model` imports because:
1. Packages aren't linked properly by lerna
2. Build order matters - dependencies must be built first

## Immediate Fix Steps

### 1. Bootstrap Packages
```bash
# Link all packages together
lerna bootstrap
```

### 2. Build in Dependency Order
```bash
# Build core packages first
lerna run build --scope=@sharpee/core
lerna run build --scope=@sharpee/world-model
lerna run build --scope=@sharpee/client-core

# Then build extensions
lerna run build --scope=@sharpee/ext-daemon
lerna run build --scope=@sharpee/extension-conversation

# Skip stdlib for now (too many errors)
# lerna run build --scope=@sharpee/stdlib
```

### 3. Test Specific Package
```bash
# Test just ext-daemon
cd packages/ext-daemon
npm run build
```

## If That Doesn't Work

### Check node_modules
The @sharpee packages should be symlinked in node_modules:
```
node_modules/
  @sharpee/
    core -> ../../packages/core
    world-model -> ../../packages/world-model
```

### Manual Link
```bash
cd packages/ext-daemon
npm link ../world-model
npm link ../core
```

## Long Term Fix
1. Set up proper TypeScript project references
2. Configure lerna to respect build order
3. Fix stdlib incrementally
