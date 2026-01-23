#!/usr/bin/env node
/**
 * Sharpee CLI
 *
 * Command-line tools for creating and building Sharpee interactive fiction.
 */

import { runIfidCommand } from './ifid';
import { runInitCommand } from './init';
import { runInitBrowserCommand } from './init-browser';
import { runBuildBrowserCommand } from './build-browser';

const VERSION = '0.9.52-beta';

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const command = args[0];

  try {
    switch (command) {
      case 'init':
        await runInitCommand(args.slice(1));
        break;
      case 'init-browser':
        await runInitBrowserCommand(args.slice(1));
        break;
      case 'build-browser':
        await runBuildBrowserCommand(args.slice(1));
        break;
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
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function showHelp(): void {
  console.log(`
sharpee - Interactive Fiction Engine CLI

Usage: sharpee <command> [options]

Commands:
  init              Create a new Sharpee story project
  init-browser      Add browser client to an existing project
  build-browser     Build a web browser bundle
  ifid              IFID utilities (generate, validate)
  version           Show version
  help              Show this help

Examples:
  sharpee init my-adventure       Create new project in ./my-adventure/
  sharpee init-browser            Add browser support to current project
  sharpee build-browser           Build web bundle in dist/web/

Run 'sharpee <command> --help' for command-specific help.
`);
}

main();
