/**
 * @sharpee/devkit — the Sharpee author CLI (ADR-180, ADR-187).
 *
 * Owner context: published authoring tool. devkit scaffolds/builds/inspects an
 * author's own story project; the in-repo platform build is a separate tool,
 * repokit (tools/repokit). Public interface: the `sharpee` CLI bin (cli.ts) plus
 * the programmatic surfaces below.
 */
export { runRegister, runList } from './commands/register.js';
export { registryPath, readRegistry, registerStory, listStories, lookupStory } from './registry.js';
export type { Registry, RegistryEntry } from './registry.js';
export {
  findRepoRoot,
  resolveStoryDir,
  resolveStory,
  findMonorepoRoot,
  detectMode,
} from './repo.js';
export type { ResolvedStory } from './repo.js';
