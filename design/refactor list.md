# Refactoring Checklist for Sharpee Package Architecture

To properly prepare Sharpee for potential publishing as modular npm packages while maintaining good development workflow, here's a structured list of changes needed:

## 1. Project Structure Changes

- [X] **Update workspace definitions in root package.json**
  - Ensure all packages are properly listed in the workspaces array
  - Check package references in lerna.json

- [X] **Add path aliases to tsconfig.base.json**
  ```json
  "baseUrl": ".",
  "paths": {
    "@core/*": ["packages/core/src/*"],
    "@stdlib/*": ["packages/standard-library/src/*"],
    "@extensions/*": ["packages/extensions/*/src/*"],
    /* Add other necessary path mappings */
  }
  ```

## 2. Package Configuration

- [X] **Update package.json in core package**
  ```json
  {
    "name": "sharpee-core",
    "version": "0.1.0",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "files": ["dist"],
    "publishConfig": {
      "access": "public"
    }
  }
  ```

- [X] **Update package.json in standard library package**
  ```json
  {
    "name": "sharpee-stdlib",
    "version": "0.1.0",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "peerDependencies": {
      "sharpee-core": "^0.1.0"
    },
    "files": ["dist"],
    "publishConfig": {
      "access": "public"
    }
  }
  ```

- [ ] **Update package.json and tsconfig.json in each extension package**
  - [X] packages/core
  - [X] packages/client-core
  - [X] packages/clients/react
  - [X] packages/clients/electron
  - [X] packages/extensions/portals
  - [X] packages/extensions/conversation
  - [X] packages/forge
  - [X] packages/stdlib
  - [ ] Set proper peerDependencies on core
  - [X] Add publishConfig settings

## 3. Code Architecture Changes

- [X] **Create proper extension registry in core**
  - [X] File: `packages/core/src/extensions/registry.ts`
  - Define interfaces for all extension points

- [X] **Establish clear extension interfaces**
  ```typescript
  // packages/core/src/extensions/types.ts
  export interface CommandExtension {
    verbs: string[];
    canHandle: (command: ParsedCommand, context: GameContext) => boolean;
    execute: (command: ParsedCommand, context: GameContext) => CommandResult;
  }
  
  export interface AbilityExtension {
    id: string;
    name: string;
    initialize: (context: GameContext) => void;
    canUse: (context: GameContext, target?: EntityId) => boolean;
    execute: (context: GameContext, target?: EntityId) => CommandResult;
  }
  ```

- [X] **Move mirror-specific code to extensions package**
  - Identify all mirror-related code in core
  - Move to packages/extensions/mirrors
  - Update imports to use path aliases

- [X] **Update imports to use path aliases**
  - Replace relative paths with alias paths
  - Example: `import { Entity } from '@core/world-model/types';`

## 4. Public API Design

- [ ] **Create clean index.ts exports for each package**
  - Only export what should be public
  - Use re-exports to organize public API

- [ ] **Create umbrella package**
  ```json
  {
    "name": "sharpee",
    "version": "0.1.0",
    "dependencies": {
      "sharpee-core": "^0.1.0",
      "sharpee-stdlib": "^0.1.0"
    }
  }
  ```

- [ ] **Document public API for each package**
  - Add README.md to each package
  - Document main exports and usage patterns

## 5. Build and Test Configuration

- [ ] **Update tsconfig.json in each package**
  - Ensure proper extension of base config
  - Set correct outDir and include/exclude patterns

- [ ] **Set up proper build scripts in package.json**
  ```json
  "scripts": {
    "build": "tsc",
    "clean": "rimraf dist",
    "test": "jest",
    "prepublishOnly": "npm run clean && npm run build"
  }
  ```

- [ ] **Update jest.config.js for path aliases**
  - Add moduleNameMapper to support path aliases in tests

## 6. Publishing Preparation

- [ ] **Create .npmignore files for each package**
  - Exclude source files, tests, etc.
  - Include only dist and necessary documentation

- [ ] **Set up CI/CD for publishing**
  - Add GitHub Actions or similar workflow
  - Configure version bumping and release process

## First Steps to Take

1. Start by adding path aliases to tsconfig.base.json
2. Create the extension registry and interfaces in core
3. Update imports in one module to use path aliases (as a test)
4. Update one extension package's package.json to proper format
5. Test building and linking packages locally

This checklist should cover the key changes needed to refactor Sharpee toward a more modular, publishable architecture while maintaining the monorepo development workflow.