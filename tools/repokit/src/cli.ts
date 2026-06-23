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

/**
 * Registered commands. Empty in Phase 0; each is added here as its own class
 * file when ported from devkit (Phase 2).
 */
const COMMANDS: Command[] = [];

/**
 * The intended repokit surface, shown in usage until each command is ported.
 * repokit owns: build (platform), bundle, verify, test:npm, clean; plus its own
 * test/play/introspect/ifid (story-neutral, duplicated rather than shared).
 */
const PLANNED: ReadonlyArray<{ name: string; summary: string }> = [
  { name: 'build', summary: 'Build the platform packages (tsf + pnpm --filter)' },
  { name: 'bundle', summary: 'Build the CLI bundle (dist/cli/sharpee.js)' },
  { name: 'verify', summary: 'tsf build --npm + publish dry-run' },
  { name: 'test:npm', summary: 'npm consumer test over a location' },
  { name: 'clean', summary: 'Remove platform build artifacts' },
  { name: 'test', summary: 'Run transcript test(s) for a story' },
  { name: 'play', summary: 'Interactive play (REPL) for a story' },
  { name: 'introspect', summary: 'Emit a story manifest' },
  { name: 'ifid', summary: 'Generate / print a story IFID' },
];

function usage(): void {
  const rows = COMMANDS.length
    ? COMMANDS.map((c) => `  ${c.name.padEnd(12)}${c.summary}`)
    : PLANNED.map((p) => `  ${p.name.padEnd(12)}${p.summary}  [Phase 2]`);
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

  if (PLANNED.some((p) => p.name === name)) {
    console.error(`repokit: '${name}' is planned but not yet ported (Phase 2).`);
    return 2;
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
