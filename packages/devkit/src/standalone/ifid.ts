// ifid.ts — `sharpee ifid`: generate and validate Treaty of Babel identifiers.
//
// KEPT through ADR-309's cleanup by David's ruling (2026-08-10): "sharpee ifid
// stays if anyone wants to use it." It is a raw utility over the identifier
// FORMAT — no story-file coupling, which is what separates it from the
// Problems-panel quick-fix that did retire.
//
// It is deliberately NOT the remedy for a story without an IFID: the toolchain
// owns that now (minted at creation into `<story-name>.config.json`, rendered
// into the header on save and build), so nothing here writes to a story.
// Public interface: runIfidCommand(args).
// Owner context: @sharpee/devkit (author tool).

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
