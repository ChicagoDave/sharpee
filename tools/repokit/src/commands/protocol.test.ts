/**
 * protocol.test.ts — the protocol generator's contracts.
 *
 * Covers: the emission is deterministic and is read from the live TypeScript
 * source rather than a snapshot; the write actually restores a corrupted
 * target; the freshness gate reports a corrupted target and is clean against
 * the committed one; and the reader refuses — rather than silently drops — a
 * type the spec does not account for.
 *
 * The write and gate tests operate on the real committed target, so each
 * restores it in a `finally`: a test that left the repository holding garbage
 * would hand the next session a red gate with no explanation.
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { findRepoRoot } from '../repo';
import { buildProtocolModel } from './protocol-model';
import { PROTOCOL_SPEC } from './protocol-spec';
import {
  CSHARP_OUTPUT_PATH,
  SWIFT_OUTPUT_PATH,
  checkProtocolTypes,
  generateProtocolSources,
  runProtocolStep,
} from './protocol';

const root = findRepoRoot();
const target = join(root, SWIFT_OUTPUT_PATH);

/** Run `body` with the committed target corrupted, restoring it afterwards. */
function withCorruptedTarget(body: () => void): void {
  const original = readFileSync(target, 'utf8');
  try {
    writeFileSync(target, '// clobbered\n');
    body();
  } finally {
    writeFileSync(target, original);
  }
}

describe('the emission', () => {
  it('renders the same bytes twice, so the gate compares content and not run order', () => {
    const first = generateProtocolSources(root);
    const second = generateProtocolSources(root);
    expect(second.map((s) => s.source)).toEqual(first.map((s) => s.source));
  });

  it('emits both native targets from the one model', () => {
    expect(generateProtocolSources(root).map((s) => s.path)).toEqual([
      SWIFT_OUTPUT_PATH,
      CSHARP_OUTPUT_PATH,
    ]);
  });

  it('gives both shells the same wire field set, which is the point of one generator', () => {
    const [swift, csharp] = generateProtocolSources(root);
    for (const wireName of ['hatchContextVersion', 'isPlayable', 'endColumn', 'modulePath']) {
      expect(swift.source).toContain(`let ${wireName}:`);
      expect(csharp.source).toContain(`[JsonPropertyName("${wireName}")]`);
    }
  });

  it('flattens nesting for C# only, where a nested type would collide with its property', () => {
    const [swift, csharp] = generateProtocolSources(root);
    expect(swift.source).toContain('    struct Meta: Codable, Equatable, Sendable {');
    expect(csharp.source).toContain('public sealed record ComposeStoryIRMeta');
    expect(csharp.source).not.toContain('public sealed record Meta');
  });

  it('carries wire fields that exist only in the TypeScript, proving it reads the source', () => {
    const [swift] = generateProtocolSources(root);
    // Both were absent from the hand-written Swift this generator replaced:
    // `hatchContextVersion` was added to the manifest after the mirror was
    // written, and `Span.file` has never been mirrored at all.
    expect(swift.source).toContain('let hatchContextVersion: Int?');
    expect(swift.source).toContain('let file: String?');
  });

  it('renames the two types the shells already call by another name', () => {
    const [swift] = generateProtocolSources(root);
    expect(swift.source).toContain('struct DiagnosticSpan: Codable, Equatable, Sendable {');
    expect(swift.source).toContain('enum ComposeSeverity: String, Codable, Equatable, Sendable {');
    expect(swift.source).not.toContain('struct Span:');
  });

  it('nests the IR projection under the type the shells refer to it through', () => {
    const [swift] = generateProtocolSources(root);
    expect(swift.source).toContain('struct ComposeStoryIR: Codable, Equatable, Sendable {');
    expect(swift.source).toContain('    struct Entity: Codable, Equatable, Sendable {');
    expect(swift.source).toContain('let kinds: [ComposeStoryIR.Kind]');
  });

  it('emits no decode gate or convenience — those stay hand-written beside it', () => {
    const [swift] = generateProtocolSources(root);
    expect(swift.source).not.toContain('currentSchemaVersion');
    expect(swift.source).not.toContain('func decode(');
    expect(swift.source).not.toContain('allEntities');
  });
});

describe('runProtocolStep', () => {
  it('writes the rendering to disk, replacing whatever was there', () => {
    withCorruptedTarget(() => {
      expect(readFileSync(target, 'utf8')).toBe('// clobbered\n');

      runProtocolStep(root, true);

      expect(readFileSync(target, 'utf8')).toBe(generateProtocolSources(root)[0].source);
      expect(readFileSync(target, 'utf8')).toContain('struct ComposeJsonPayload');
    });
  });
});

describe('checkProtocolTypes', () => {
  it('is clean against the committed targets', () => {
    expect(checkProtocolTypes(root)).toEqual([]);
  });

  it('names the target when its bytes no longer match the wire contract', () => {
    withCorruptedTarget(() => {
      expect(checkProtocolTypes(root)).toEqual([SWIFT_OUTPUT_PATH]);
    });
  });
});

describe('the reader refuses what it cannot translate', () => {
  it('rejects a spec that omits a type an emitted type references', () => {
    const spec = {
      ...PROTOCOL_SPEC,
      roots: PROTOCOL_SPEC.roots.filter((r) => r.ts !== 'SourceRef'),
    };
    expect(() => buildProtocolModel(root, spec)).toThrow(/'SourceRef' is reachable/);
  });

  it('rejects a spec naming a type nothing exports or references', () => {
    const spec = {
      ...PROTOCOL_SPEC,
      roots: [...PROTOCOL_SPEC.roots, { ts: 'NoSuchWireType' }],
    };
    expect(() => buildProtocolModel(root, spec)).toThrow(/'NoSuchWireType'/);
  });

  it('rejects an index signature the spec has not accounted for', () => {
    const spec = { ...PROTOCOL_SPEC, indexSignatureIgnoredOn: [] };
    expect(() => buildProtocolModel(root, spec)).toThrow(/index signature/);
  });
});
