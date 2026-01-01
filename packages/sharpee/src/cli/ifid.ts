// packages/sharpee/src/cli/ifid.ts
// IFID CLI commands

import { generateIfid, validateIfid, normalizeIfid } from '@sharpee/core';

export function runIfidCommand(args: string[]): void {
  const subcommand = args[0];

  switch (subcommand) {
    case 'generate':
      handleGenerate();
      break;
    case 'validate':
      handleValidate(args.slice(1));
      break;
    case undefined:
    case 'help':
      showHelp();
      break;
    default:
      console.error(`Unknown ifid subcommand: ${subcommand}`);
      showHelp();
      process.exit(1);
  }
}

function handleGenerate(): void {
  const ifid = generateIfid();
  console.log(ifid);
}

function handleValidate(args: string[]): void {
  const ifid = args[0];

  if (!ifid) {
    console.error('Usage: sharpee ifid validate <ifid>');
    process.exit(1);
  }

  const isValid = validateIfid(ifid);

  if (isValid) {
    console.log(`Valid IFID: ${ifid}`);
  } else {
    // Try normalizing (uppercase conversion)
    const normalized = normalizeIfid(ifid);
    if (normalized) {
      console.log(`Valid after normalization:`);
      console.log(`  Original:   ${ifid}`);
      console.log(`  Normalized: ${normalized}`);
    } else {
      console.error(`Invalid IFID: ${ifid}`);
      console.error('IFID requirements:');
      console.error('  - Length: 8-63 characters');
      console.error('  - Characters: A-Z, 0-9, and hyphens only');
      console.error('  - Recommended: UUID format (uppercase)');
      process.exit(1);
    }
  }
}

function showHelp(): void {
  console.log(`
sharpee ifid - IFID utilities

Commands:
  generate           Generate a new IFID (UUID format)
  validate <ifid>    Validate an IFID string

Examples:
  sharpee ifid generate
  sharpee ifid validate A1B2C3D4-E5F6-7890-ABCD-EF1234567890
`);
}
