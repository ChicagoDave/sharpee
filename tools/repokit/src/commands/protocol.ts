/**
 * protocol.ts — `repokit protocol`: ADR-341 D5's protocol-type generator and
 * its freshness gate.
 *
 * The native shells cannot import `@sharpee/ide-protocol`; a language boundary
 * sits between them and the wire. Until this command existed they hand-wrote
 * the types instead, which is why a field renamed in `@sharpee/chord` could
 * break the decoder with nothing failing to compile. This command emits those
 * types from the TypeScript source, and `--check` regenerates and diffs, so a
 * rename is a red build in the same commit rather than a runtime decode error
 * in an author's hands.
 *
 * Public interface: ProtocolCommand, runProtocolStep, checkProtocolTypes,
 * generateProtocolSources, SWIFT_OUTPUT_PATH.
 * Owner context: tools/repokit — the in-repo platform build tool (unpublished).
 *
 * References:
 * - ADR-341 D5 — generated, not hand-mirrored; Swift is target one, C# target two.
 * - DEVARCH 8b — one definition of a wire type; generated across a language boundary.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { findRepoRoot } from '../repo';
import { Command } from './command';
import { buildProtocolModel } from './protocol-model';
import { PROTOCOL_SPEC } from './protocol-spec';
import { emitCSharp } from './protocol-csharp';
import { emitSwift } from './protocol-swift';

/** Where the Swift target's generated types land, repo-root-relative. */
export const SWIFT_OUTPUT_PATH = 'tools/ide/SharpeeIDE/Generated/SharpeeProtocol.swift';

/** Where the C# target's generated types land, repo-root-relative. */
export const CSHARP_OUTPUT_PATH = 'tools/ide/PaneHost/Generated/SharpeeProtocol.cs';

/** Namespace the C# target's types live in. */
const CSHARP_NAMESPACE = 'PaneHost.Protocol';

/** The command a regeneration note tells the reader to run. */
const GENERATOR_COMMAND = 'repokit protocol';

/** One emitted target: where it goes and what it should contain. */
export interface GeneratedSource {
  /** Repo-root-relative path. */
  path: string;
  /** Complete file text, newline-terminated. */
  source: string;
}

/**
 * Render every native target from the current TypeScript wire contract.
 *
 * @param root absolute path of the repository root
 * @returns one entry per target, in emission order
 * @throws if the protocol sources do not type-check, or use a construct the
 *   wire model does not cover — never a partial emission
 */
export function generateProtocolSources(root: string): GeneratedSource[] {
  const model = buildProtocolModel(root, PROTOCOL_SPEC);
  return [
    { path: SWIFT_OUTPUT_PATH, source: emitSwift(model, GENERATOR_COMMAND) },
    { path: CSHARP_OUTPUT_PATH, source: emitCSharp(model, GENERATOR_COMMAND, CSHARP_NAMESPACE) },
  ];
}

/**
 * Regenerate every target and write it to disk.
 *
 * @param root absolute path of the repository root
 * @param quiet suppress the per-target summary line
 */
export function runProtocolStep(root: string, quiet = false): void {
  for (const { path, source } of generateProtocolSources(root)) {
    const absolute = join(root, path);
    mkdirSync(dirname(absolute), { recursive: true });
    writeFileSync(absolute, source);
    if (!quiet) {
      console.log(`protocol: ${path} regenerated — ${source.split('\n').length - 1} lines`);
    }
  }
}

/**
 * The freshness gate: every target on disk must match what the current wire
 * contract renders, byte for byte.
 *
 * @param root absolute path of the repository root
 * @returns the paths that are missing or stale; empty when everything is fresh
 */
export function checkProtocolTypes(root: string): string[] {
  const stale: string[] = [];
  for (const { path, source } of generateProtocolSources(root)) {
    const absolute = join(root, path);
    if (!existsSync(absolute) || readFileSync(absolute, 'utf8') !== source) stale.push(path);
  }
  return stale;
}

export class ProtocolCommand implements Command {
  readonly name = 'protocol';
  readonly summary =
    "Regenerate the native shells' protocol types from @sharpee/ide-protocol (--check: freshness gate)";

  run(args: string[]): number {
    const root = findRepoRoot();
    if (args.includes('--check')) {
      const stale = checkProtocolTypes(root);
      if (stale.length === 0) {
        console.log('protocol --check: generated protocol types match the TypeScript wire contract');
        return 0;
      }
      console.error(
        `protocol --check: STALE — ${stale.join(', ')} ` +
          'does not match @sharpee/ide-protocol. Run `repokit protocol` and commit the result.',
      );
      return 1;
    }
    runProtocolStep(root);
    return 0;
  }
}
