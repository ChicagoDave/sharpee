#!/usr/bin/env node
// packages/sharpee/src/cli/index.ts
// Sharpee CLI entry point

import { runIfidCommand } from './ifid';

const VERSION = '0.9.0-beta.1';

function main(): void {
  const args = process.argv.slice(2);
  const command = args[0];

  switch (command) {
    case 'ifid':
      runIfidCommand(args.slice(1));
      break;
    case 'version':
    case '-v':
    case '--version':
      console.log(`sharpee ${VERSION}`);
      break;
    case 'help':
    case '-h':
    case '--help':
    case undefined:
      showHelp();
      break;
    default:
      console.error(`Unknown command: ${command}`);
      showHelp();
      process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
sharpee - Interactive Fiction Engine CLI

Usage: sharpee <command> [options]

Commands:
  ifid              IFID utilities (generate, validate)
  version           Show version
  help              Show this help

Run 'sharpee <command> help' for command-specific help.
`);
}

main();
