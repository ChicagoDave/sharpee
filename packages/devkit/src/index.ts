/**
 * @sharpee/devkit — Sharpee build/test/verify orchestration (ADR-180).
 *
 * Owner context: published authoring devtool. devkit orchestrates; tsf compiles.
 * Public interface: the `devkit` CLI bin (see cli.ts) plus the programmatic
 * surfaces below for embedding/testing.
 */
export { runTestNpm } from './commands/test-npm';
export type { TestNpmOptions, TestNpmResult } from './commands/test-npm';
export { DEFAULT_STAGING } from './commands/test-npm';
export { runBuild, stampVersions, buildPlatform, generateGenaiApi, buildStory } from './commands/build';
export type { BuildOptions } from './commands/build';
export { runBundle } from './commands/bundle';
export type { BundleOptions } from './commands/bundle';
export { buildBrowserClient } from './commands/browser';
export type { BrowserBuildOptions } from './commands/browser';
export { buildZifmiaServer } from './commands/zifmia';
export type { ZifmiaBuildOptions } from './commands/zifmia';
export { runClean } from './commands/clean';
export type { CleanOptions } from './commands/clean';
export { runVerify } from './commands/verify';
export type { VerifyOptions } from './commands/verify';
export {
  findRepoRoot,
  resolveStoryDir,
  resolveStory,
  PLATFORM_PACKAGES,
  BUNDLE_ALIASES,
  BUNDLE_DTS,
} from './repo';
export {
  generateConsumer,
  scanStaging,
  readSharpeeSeed,
  computeClosure,
  stagingDepsOf,
} from './consumer-gen';
export type {
  StagingMap,
  GenerateConsumerOptions,
  GenerateConsumerResult,
} from './consumer-gen';
