/**
 * build-target.ts — which project a `sharpee build <target>` names.
 *
 * Owner context: `@sharpee/devkit`, the author CLI. `build` accepts a
 * project directory or a registered story name; this module settles which
 * one a target is, so the rule sits in one tested place rather than inline
 * in the command switch.
 *
 * Public interface: `projectDirectoryFor`.
 */
import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';
import { lookupStory } from './registry.js';

/**
 * Resolve a `build` target to a project directory.
 *
 * A directory is a project wherever it is: `test` and `play` take one, and
 * the usage line promises `build [<file>.story | dir]` (GH #718). A
 * registered name is tried only for a target that is not a directory.
 *
 * @param target the positional argument given to `sharpee build`
 * @returns the absolute project directory
 * @throws when the target is neither a directory nor a registered story,
 *   or is registered but its location is stale
 */
export function projectDirectoryFor(target: string): string {
  if (existsSync(target) && statSync(target).isDirectory()) return resolve(target);
  const registered = lookupStory(target); // throws if registered-but-stale
  if (registered) return registered;
  throw new Error(
    `'${target}' is not a directory or a registered story — run \`sharpee register <location>\`, or run \`sharpee build\` from the project directory`,
  );
}
