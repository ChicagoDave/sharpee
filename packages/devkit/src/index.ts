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
