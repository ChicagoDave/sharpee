#!/usr/bin/env node
/**
 * cli.ts — the `repokit` command (ADR-187): the in-repo platform/maintenance
 * build tool, separate from `devkit` (the author tool). repokit owns the
 * platform build (packages, CLI bundle, verify, test:npm, clean) and the
 * example-story builds; it is the proving ground from which hardened features
 * are explicitly ported into devkit.
 *
 * Phase 0 scaffold: a thin dispatcher over per-command classes. `COMMANDS` is
 * empty for now; each command is added as its own class file when ported from
 * devkit in Phase 2 (see docs/work/repokit-devkit-split/).
 *
 * Public interface: process argv -> subcommand dispatch -> process exit code.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 */

import { Command } from './commands/command';
import { BuildCommand } from './commands/build';
import { BundleCommand } from './commands/bundle';
import { VerifyCommand } from './commands/verify';
import { TestNpmCommand } from './commands/test-npm';
import { CleanCommand } from './commands/clean';
import { IntrospectCommand } from './commands/introspect';
import { IfidCommand } from './commands/ifid';
import { TestCommand } from './commands/test';
import { PlayCommand } from './commands/play';

/**
 * Registered commands — each is its own class file (ADR-187 R1), ported from
 * devkit in Phase 2. repokit owns build/bundle/verify/test:npm/clean; test/play/
 * introspect/ifid are story-neutral (its own copies, not shared with devkit).
 */
const COMMANDS: Command[] = [
  new BuildCommand(),
  new BundleCommand(),
  new VerifyCommand(),
  new TestNpmCommand(),
  new CleanCommand(),
  new TestCommand(),
  new PlayCommand(),
  new IntrospectCommand(),
  new IfidCommand(),
];

function usage(): void {
  const rows = COMMANDS.map((c) => `  ${c.name.padEnd(12)}${c.summary}`);
  console.log(
    'repokit — Sharpee in-repo platform build tool (ADR-187)\n\n' +
      'Usage: repokit <command> [options]\n\n' +
      'Commands:\n' +
      rows.join('\n') +
      '\n',
  );
}

async function main(argv: string[]): Promise<number> {
  const [name, ...rest] = argv;

  if (!name || name === '--help' || name === '-h' || name === 'help') {
    usage();
    return name && name !== 'help' ? 1 : 0;
  }

  const cmd = COMMANDS.find((c) => c.name === name);
  if (cmd) {
    return cmd.run(rest);
  }

  console.error(`repokit: unknown command '${name}'\n`);
  usage();
  return 2;
}

main(process.argv.slice(2))
  .then((code) => process.exit(code))
  .catch((err) => {
    console.error('repokit: ' + (err instanceof Error ? err.message : String(err)));
    process.exit(2);
  });
