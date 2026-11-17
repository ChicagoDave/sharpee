/**
 * runtime-packages.ts — where the browser build finds the `@sharpee/*` runtime
 * packages it bundles when the author's project does not install them.
 *
 * Owner context: @sharpee/devkit — standalone (author build paths).
 *
 * Why this exists: a TypeScript project lists the runtime packages in its own
 * package.json, so the build finds them in the project's node_modules. A Chord
 * project is one `.story` file with no package.json and no node_modules, so
 * the only copies on the machine are the ones installed as devkit's own
 * dependencies. Both lookups the build makes (the engine stylesheets, and
 * esbuild's resolution of the generated entry's imports) therefore try the
 * project first and devkit's install second. Project first keeps a project's
 * pinned versions winning, as they always have.
 *
 * Public interface: devkitModuleRoots(), runtimeResolveBases(), esbuildEnv().
 */
import { existsSync } from 'node:fs';
import { delimiter } from 'node:path';

/**
 * The node_modules directories devkit's own dependencies resolve from, nearest
 * first: the lookup path Node walks from this file, kept to the directories
 * that exist. It covers a global npm install (dependencies under devkit's own
 * node_modules), a hoisted install (a node_modules further up) and the
 * workspace alike, without naming any of those layouts.
 *
 * @returns absolute node_modules directories, possibly empty
 */
export function devkitModuleRoots(): string[] {
  const lookup = require.resolve.paths('@sharpee/platform-browser') ?? [];
  return lookup.filter((dir) => existsSync(dir));
}

/**
 * The directories a runtime package is resolved from, in order: the author's
 * project, then devkit's own install.
 *
 * @param projectDir the author's project directory
 * @returns the `paths` list for `require.resolve`
 */
export function runtimeResolveBases(projectDir: string): string[] {
  return [projectDir, __dirname];
}

/**
 * The environment to spawn esbuild with: the caller's environment, with
 * devkit's module roots appended to NODE_PATH. esbuild consults NODE_PATH only
 * after the node_modules walk from the importing file fails, so a package the
 * project installs still wins, and a NODE_PATH the caller set (Chord Writer's
 * sealed toolchain sets one) stays ahead of devkit's roots.
 *
 * @param base the environment to extend (default: this process's)
 * @returns a new environment object; `base` is not modified
 */
export function esbuildEnv(base: NodeJS.ProcessEnv = process.env): NodeJS.ProcessEnv {
  const existing = (base.NODE_PATH ?? '').split(delimiter).filter((dir) => dir.length > 0);
  const roots = devkitModuleRoots().filter((dir) => !existing.includes(dir));
  return { ...base, NODE_PATH: [...existing, ...roots].join(delimiter) };
}
